"""Offline contract tests: no network access or real dataset required."""

import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tools"))
from inspect_malecns import RangeFile, Budget, BUDGET, BASE, FILES


class Response(io.BytesIO):
    def __init__(self, data=b"", status=200, length=100, start=0):
        super().__init__(data)
        self.status = status
        self.headers = {
            "Content-Length": str(length),
            "ETag": '"fixed-object-version"',
            "Content-Range": f"bytes {start}-{start + length - 1}/100",
        }


class RangeTests(unittest.TestCase):
    def setUp(self):
        Budget.used = 0
        Budget.requests = []
        Budget.payloads = {}

    def test_requires_partial_response_before_reading(self):
        with patch(
            "inspect_malecns.urlopen",
            side_effect=[Response(), Response(b"abc", status=200, length=3)],
        ):
            reader = RangeFile(BASE + FILES["edges"])
            with self.assertRaisesRegex(ValueError, "honor"):
                reader.read(3)

    def test_budget_checked_before_request(self):
        with patch(
            "inspect_malecns.urlopen", return_value=Response(length=BUDGET + 1)
        ) as request:
            reader = RangeFile(BASE + FILES["edges"])
            with self.assertRaisesRegex(ValueError, "budget"):
                reader.read(BUDGET + 1)
            self.assertEqual(request.call_count, 1)

    def test_exact_range_hash_and_version_header(self):
        with patch(
            "inspect_malecns.urlopen",
            side_effect=[Response(), Response(b"abc", status=206, length=3, start=10)],
        ) as request:
            reader = RangeFile(BASE + FILES["edges"])
            reader.seek(10)
            self.assertEqual(reader.read(3), b"abc")
            self.assertEqual(Budget.used, 3)
            self.assertEqual(reader.tell(), 13)
            self.assertEqual(Budget.requests[0]["start"], 10)
            self.assertEqual(
                request.call_args.args[0].get_header("If-match"),
                '"fixed-object-version"',
            )
            self.assertEqual(
                Budget.requests[0]["sha256"],
                "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            )

    def test_wrong_range_or_version_rejected(self):
        for field, value in [("Content-Range", "bytes 4-6/100"), ("ETag", "changed")]:
            response = Response(b"abc", status=206, length=3)
            response.headers[field] = value
            with patch("inspect_malecns.urlopen", side_effect=[Response(), response]):
                with self.assertRaises(ValueError):
                    RangeFile(BASE + FILES["edges"]).read(3)
            self.assertEqual(Budget.used, 0)

    def test_unlisted_url_rejected_before_network(self):
        with patch("inspect_malecns.urlopen") as request:
            with self.assertRaisesRegex(ValueError, "allowlisted"):
                RangeFile("https://example.org/table")
            request.assert_not_called()

    def test_truncated_range_rejected(self):
        with patch(
            "inspect_malecns.urlopen",
            side_effect=[Response(), Response(b"a", status=206, length=3)],
        ):
            with self.assertRaisesRegex(ValueError, "Truncated"):
                RangeFile(BASE + FILES["edges"]).read(3)


if __name__ == "__main__":
    unittest.main()
