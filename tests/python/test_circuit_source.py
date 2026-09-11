"""Independent source totals, selection and bounded API safety contracts."""

import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools"))
from query_malecns import retrieve, MAX_BYTES
from select_gf import select

ROOT = Path(__file__).resolve().parents[2] / "data/circuits/gf-v1"


class Response(io.BytesIO):
    status = 200


class CircuitSourceTests(unittest.TestCase):
    def test_source_checksums_and_integer_totals(self):
        for folder in (ROOT / "evidence").iterdir():
            e = json.loads((folder / "evidence.json").read_text())
            for name in ("request", "response"):
                self.assertEqual(
                    hashlib.sha256(
                        (folder / (name + ".json")).read_bytes()
                    ).hexdigest(),
                    e[name + "Sha256"],
                )
        edges = json.loads((ROOT / "evidence/edges/response.json").read_text())["data"]
        self.assertEqual(sum(int(e[2]) for e in edges), 28373)
        self.assertEqual(len({(e[0], e[1]) for e in edges}), 1240)
        ids, excluded = select(
            json.loads((ROOT / "evidence/inputs/response.json").read_text())["data"]
        )
        self.assertEqual(len(ids), 51)
        self.assertEqual(len(excluded), 6)
        self.assertTrue(all(e[0] in ids and e[1] in ids for e in edges))

    def test_truncation_is_not_a_circuit(self):
        with self.assertRaisesRegex(ValueError, "truncated"):
            select([None] * 257)

    def test_read_query_guard_before_network(self):
        for query in (
            "MATCH (n) DELETE n RETURN n LIMIT 1",
            "MATCH (n) RETURN n",
            "CALL anything()",
        ):
            with patch("query_malecns.urlopen") as request:
                with self.assertRaises(ValueError):
                    retrieve(query, ROOT / "not-created")
                request.assert_not_called()

    def test_oversized_response_rejected_without_writing(self):
        with tempfile.TemporaryDirectory(dir=ROOT.parents[2] / ".cache") as temp:
            out = Path(temp) / "out"
            with patch(
                "query_malecns.urlopen", return_value=Response(b"x" * (MAX_BYTES + 1))
            ):
                with self.assertRaisesRegex(ValueError, "cap"):
                    retrieve("MATCH (n) RETURN n LIMIT 1", out)
            self.assertFalse(out.exists())

    def test_exact_bytes_retained_and_no_overwrite(self):
        with tempfile.TemporaryDirectory(dir=ROOT.parents[2] / ".cache") as temp:
            out = Path(temp) / "out"
            raw = b'{"columns":["id"],"data":[["10001"]]}'
            with patch("query_malecns.urlopen", return_value=Response(raw)):
                retrieve("MATCH (n) RETURN n LIMIT 2", out)
            self.assertEqual((out / "response.json").read_bytes(), raw)
            with patch("query_malecns.urlopen") as request:
                with self.assertRaisesRegex(ValueError, "Preserve"):
                    retrieve("MATCH (n) RETURN n LIMIT 2", out)
                request.assert_not_called()


if __name__ == "__main__":
    unittest.main()
