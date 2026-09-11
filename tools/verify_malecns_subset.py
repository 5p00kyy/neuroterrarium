"""Reconstruct selected Arrow rows from checksummed retained ranges, offline."""

import csv
import hashlib
import io
import json
import sys
from pathlib import Path
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.ipc as ipc


class CachedFile(io.RawIOBase):
    def __init__(self, entries, root):
        super().__init__()
        self.pos = 0
        self.size = max(e["end"] for e in entries) + 1
        self.chunks = []
        for entry in entries:
            data = (root / "ranges" / (entry["sha256"] + ".bin")).read_bytes()
            if hashlib.sha256(data).hexdigest() != entry["sha256"]:
                raise ValueError("Source range SHA-256 mismatch")
            if (
                len(data) != entry["bytes"]
                or len(data) != entry["end"] - entry["start"] + 1
            ):
                raise ValueError("Source range length mismatch")
            self.chunks.append((entry["start"], data))

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=0):
        self.pos = (
            offset
            if whence == 0
            else self.pos + offset
            if whence == 1
            else self.size + offset
        )
        return self.pos

    def read(self, size=-1):
        size = self.size - self.pos if size < 0 else size
        parts = []
        while size > 0:
            for start, data in self.chunks:
                if start <= self.pos < start + len(data):
                    take = min(size, start + len(data) - self.pos)
                    parts.append(data[self.pos - start : self.pos - start + take])
                    self.pos += take
                    size -= take
                    break
            else:
                raise ValueError("Requested bytes were not retained")
        return b"".join(parts)


def main():
    root = Path(sys.argv[1])
    source = json.loads((root / "source.json").read_text())
    evidence = source["sourceEvidence"]
    tables = {}
    for key, suffix in (
        ("edges", "connectome-weights"),
        ("nt", "body-neurotransmitters"),
    ):
        ranges = [
            r for r in evidence["ranges"] if r["url"].split("/")[-1].startswith(suffix)
        ]
        tables[key] = ipc.open_file(CachedFile(ranges, root)).get_batch(0)
    selected = tables["edges"].take(pa.array(evidence["selectedSourceRowIndices"]))
    original_rows = sorted(
        selected.to_pylist(), key=lambda r: (r["body_pre"], r["body_post"])
    )
    for item in source["files"].values():
        if (
            hashlib.sha256((root / item["path"]).read_bytes()).hexdigest()
            != item["sha256"]
        ):
            raise ValueError("Normalized file SHA-256 mismatch")
    with (root / "edges.csv").open() as f:
        csv_rows = list(csv.DictReader(f))
    expected_rows = [
        {key: str(value) for key, value in row.items()} for row in original_rows
    ]
    if csv_rows != expected_rows:
        raise ValueError("Normalized edges do not match original Arrow rows")
    originals = {str(r["body"]): r for r in tables["nt"].to_pylist()}
    with (root / "neurons.csv").open() as f:
        neurons = list(csv.DictReader(f))
    for neuron in neurons:
        original = originals[neuron["body"]]
        if (
            neuron["predicted_nt"] != original["predicted_nt"]
            or float(neuron["predicted_nt_confidence"])
            != original["predicted_nt_confidence"]
            or neuron["cell_type"] != (original["cell_type"] or "")
        ):
            raise ValueError("Normalized neuron differs from official NT row")
    total = pc.sum(selected.column("weight")).as_py()
    ids = {str(r[k]) for r in original_rows for k in ("body_pre", "body_post")}
    if ids != {r["body"] for r in neurons}:
        raise ValueError("Endpoint membership mismatch")
    totals = {
        "neurons": len(neurons),
        "rows": len(csv_rows),
        "uniqueEdges": len({(r["body_pre"], r["body_post"]) for r in csv_rows}),
        "rawSynapses": str(total),
    }
    if totals != source["expected"]:
        raise ValueError("Independent totals mismatch")
    report = {
        "verifiedOffline": True,
        "networkRequests": 0,
        "sourceManifestSha256": hashlib.sha256(
            (root / "source.json").read_bytes()
        ).hexdigest(),
        "totals": totals,
        "checks": [
            "retained range SHA-256",
            "normalized file SHA-256",
            "exact Arrow-to-CSV edges",
            "exact transmitter prediction fields",
            "endpoint membership",
            "Arrow raw weight total",
        ],
        "notEstablished": "Source authority is grounded in recorded official HTTPS URLs and release licence, not in a checksum alone. No biological simulation validation.",
    }
    Path("artifacts/phase2/source-verification.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
