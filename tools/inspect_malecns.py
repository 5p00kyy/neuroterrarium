"""Opt-in official MaleCNS Arrow range inspection. Never downloads a full table.
Requires pyarrow==21.0.0; all source bytes share a hard 12 MiB budget.
"""

import io
import json
import hashlib
from pathlib import Path
from urllib.request import Request, urlopen
import pyarrow.ipc as ipc

BASE = "https://storage.googleapis.com/flyem-male-cns/v1.0/connectome-data/flat-connectome/"
FILES = {
    "annotations": "body-annotations-male-cns-v1.0-minconf-0.5.feather",
    "neurotransmitters": "body-neurotransmitters-male-cns-v1.0.feather",
    "edges": "connectome-weights-male-cns-v1.0-minconf-0.5.feather",
}
BUDGET = 12 * 1024 * 1024


class Budget:
    used = 0
    requests = []
    payloads = {}


class RangeFile(io.RawIOBase):
    def __init__(self, url):
        super().__init__()
        if url not in {BASE + name for name in FILES.values()}:
            raise ValueError("Only allowlisted official table URLs are supported")
        self.url, self.pos = url, 0
        with urlopen(Request(url, method="HEAD"), timeout=20) as response:
            self.size = int(response.headers["Content-Length"])
            self.etag = response.headers["ETag"]

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=0):
        if whence not in (0, 1, 2):
            raise ValueError("Invalid seek origin")
        self.pos = (
            offset
            if whence == 0
            else self.pos + offset
            if whence == 1
            else self.size + offset
        )
        if self.pos < 0 or self.pos > self.size:
            raise ValueError("Invalid seek")
        return self.pos

    def read(self, size=-1):
        size = self.size - self.pos if size < 0 else min(size, self.size - self.pos)
        if size == 0:
            return b""
        if Budget.used + size > BUDGET:
            raise ValueError("12 MiB aggregate download budget exceeded")
        start, end = self.pos, self.pos + size - 1
        with urlopen(
            Request(
                self.url,
                headers={"Range": f"bytes={start}-{end}", "If-Match": self.etag},
            ),
            timeout=30,
        ) as response:
            if response.status != 206:
                raise ValueError("Server did not honor bounded Range request")
            if int(response.headers["Content-Length"]) != size:
                raise ValueError("Unexpected range size")
            if (
                response.headers.get("Content-Range")
                != f"bytes {start}-{end}/{self.size}"
            ):
                raise ValueError("Unexpected Content-Range")
            if response.headers.get("ETag") != self.etag:
                raise ValueError("Object version changed")
            data = response.read(size + 1)
        if len(data) != size:
            raise ValueError("Truncated/oversized range")
        Budget.used += size
        Budget.payloads[hashlib.sha256(data).hexdigest()] = data
        Budget.requests.append(
            {
                "url": self.url,
                "start": start,
                "end": end,
                "bytes": size,
                "sha256": hashlib.sha256(data).hexdigest(),
                "etag": self.etag,
            }
        )
        self.pos += size
        return data


def main():
    import sys

    if "--allow-network" not in sys.argv:
        raise SystemExit(
            "Explicit --allow-network required; 12 MiB aggregate range cap"
        )
    results = {}
    for key, name in FILES.items():
        source = RangeFile(BASE + name)
        reader = ipc.open_file(source)
        results[key] = {
            "url": source.url,
            "objectBytes": source.size,
            "batches": reader.num_record_batches,
            "schema": str(reader.schema),
        }
    out = Path("artifacts/phase2")
    out.mkdir(parents=True, exist_ok=True)
    result = {
        "source": "Official MaleCNS v1.0",
        "license": "https://creativecommons.org/licenses/by/4.0/",
        "metadataOnly": True,
        "tables": results,
        "downloadedBytes": Budget.used,
        "ranges": Budget.requests,
    }
    (out / "official-schemas.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
