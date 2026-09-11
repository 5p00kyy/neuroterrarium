"""Opt-in bounded official subset, not a representative circuit or simulation validation."""

import csv
import json
import hashlib
import sys
from pathlib import Path
import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.ipc as ipc
from inspect_malecns import RangeFile, Budget, BASE, FILES


def main():
    if "--allow-network" not in sys.argv:
        raise SystemExit(
            "Explicit --allow-network required; 12 MiB aggregate range cap"
        )
    out = Path("data/raw/malecns-bounded-v1")
    if out.exists():
        raise SystemExit(
            "Output exists; preserve it rather than silently replacing source evidence"
        )
    nt = ipc.open_file(RangeFile(BASE + FILES["neurotransmitters"])).get_batch(0)
    batch = ipc.open_file(RangeFile(BASE + FILES["edges"])).get_batch(0)
    eligible = {
        int(row["body"]): row
        for row in nt.to_pylist()
        if row["predicted_nt"] in ("acetylcholine", "gaba")
        and row["predicted_nt_confidence"] is not None
        and row["predicted_nt_confidence"] >= 0.8
    }
    selected_indices = []
    for i, row in enumerate(batch.to_pylist()):
        if (
            row["body_pre"] in eligible
            and row["body_post"] in eligible
            and row["body_pre"] != row["body_post"]
        ):
            selected_indices.append(i)
        if len(selected_indices) == 128:
            break
    if len(selected_indices) != 128:
        raise ValueError(
            "Bounded batches lack 128 eligible pairs; no expanded download"
        )
    selected = batch.take(pa.array(selected_indices))
    independent_total = pc.sum(selected.column("weight")).as_py()
    rows = sorted(
        selected.to_pylist(), key=lambda row: (row["body_pre"], row["body_post"])
    )
    ids = sorted({row[key] for row in rows for key in ("body_pre", "body_post")})
    assert independent_total == sum(row["weight"] for row in rows)
    out.mkdir(parents=True)
    with (out / "neurons.csv").open("w", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(
            ["body", "cell_type", "predicted_nt", "predicted_nt_confidence"]
        )
        for body in ids:
            row = eligible[body]
            writer.writerow(
                [
                    str(body),
                    row["cell_type"] or "",
                    row["predicted_nt"],
                    repr(row["predicted_nt_confidence"]),
                ]
            )
    with (out / "edges.csv").open("w", newline="") as f:
        writer = csv.writer(f, lineterminator="\n")
        writer.writerow(["body_pre", "body_post", "weight"])
        for row in rows:
            writer.writerow(
                [str(row["body_pre"]), str(row["body_post"]), str(row["weight"])]
            )

    def sha(name):
        return hashlib.sha256((out / name).read_bytes()).hexdigest()

    manifest = {
        "schema": "neuroterrarium-import/1",
        "anatomy": "measured",
        "dataset": {"id": "male-cns", "version": "1.0"},
        "license": "CC-BY-4.0",
        "attribution": "Male CNS connectome collaboration: FlyEM (HHMI Janelia), University of Cambridge Department of Zoology, MRC Laboratory of Molecular Biology, and Google Research. MaleCNS v1.0 (June 8, 2026).",
        "sourceUrls": [
            BASE + FILES["edges"],
            BASE + FILES["neurotransmitters"],
            "https://male-cns.janelia.org/release/",
        ],
        "selection": "First 128 non-self pairs in first official edge batch with endpoints in first NT batch and predicted_nt acetylcholine/gaba, confidence >=0.8. Sorted by numeric IDs. Not an induced, complete or representative circuit.",
        "signPolicy": "ach-gaba-prediction-v1",
        "minimumConfidence": 0.8,
        "gain": 0.01,
        "files": {
            "neurons": {"path": "neurons.csv", "sha256": sha("neurons.csv")},
            "edges": {"path": "edges.csv", "sha256": sha("edges.csv")},
        },
        "expected": {
            "neurons": len(ids),
            "rows": len(rows),
            "uniqueEdges": len({(row["body_pre"], row["body_post"]) for row in rows}),
            "rawSynapses": str(independent_total),
        },
        "sourceEvidence": {
            "licenseUrl": "https://male-cns.janelia.org/release/",
            "columns": {"edges": str(batch.schema), "nt": str(nt.schema)},
            "batchesRead": {"edges": 0, "nt": 0},
            "selectedSourceRowIndices": selected_indices,
            "downloadedBytes": Budget.used,
            "ranges": Budget.requests,
            "independentTotalsMethod": "PyArrow compute.sum on selected original int64 weight column; separately checked against normalized Python integer rows.",
        },
        "limitations": [
            "Anatomical edge counts are measured; transmitter-to-sign mapping is inferred, and model gain is invented.",
            "No MaleCNS data are loaded into the web simulation. Import validation only.",
            "No full-file SHA-256 claim: checksums cover exact HTTP ranges and normalized selected CSVs.",
        ],
    }
    (out / "source.json").write_text(json.dumps(manifest, indent=2) + "\n")
    ranges = out / "ranges"
    ranges.mkdir()
    for digest, payload in Budget.payloads.items():
        (ranges / (digest + ".bin")).write_bytes(payload)
    print(
        json.dumps(
            {
                "output": str(out),
                "expected": manifest["expected"],
                "downloadedBytes": Budget.used,
                "csvSha256": manifest["files"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
