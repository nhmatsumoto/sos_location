#!/usr/bin/env python3
"""Build a machine-readable source index for SOS LOCATION geo portals."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import request, error

TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)


def fetch_url(url: str, timeout: int) -> dict[str, Any]:
    req = request.Request(url, headers={"User-Agent": "sos-location-source-indexer/1.0"})
    result: dict[str, Any] = {
        "url": url,
        "fetch_status": "error",
        "status_code": None,
        "title": None,
        "language": None,
        "last_modified": None,
        "content_hash": None,
        "extracted_tables_count": 0,
        "screenshots": [],
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            body = resp.read(1024 * 512)  # cap 512KB for index stage
            text = body.decode("utf-8", errors="ignore")
            result["status_code"] = getattr(resp, "status", 200)
            result["fetch_status"] = "ok"
            result["last_modified"] = resp.headers.get("Last-Modified")
            result["language"] = resp.headers.get("Content-Language")
            result["content_hash"] = hashlib.sha256(body).hexdigest()
            title_match = TITLE_RE.search(text)
            if title_match:
                result["title"] = " ".join(title_match.group(1).split())[:300]
            result["extracted_tables_count"] = text.lower().count("<table")
    except error.HTTPError as exc:
        result["fetch_status"] = "http_error"
        result["status_code"] = exc.code
    except Exception as exc:  # noqa: BLE001
        result["error"] = str(exc)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", default="scripts/source_seed_urls.txt")
    parser.add_argument("--out", default="artifacts/source-index/sources.json")
    parser.add_argument("--timeout", type=int, default=20)
    args = parser.parse_args()

    seed_path = Path(args.seed)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    urls = [line.strip() for line in seed_path.read_text().splitlines() if line.strip() and not line.startswith("#")]
    records = [fetch_url(url, timeout=args.timeout) for url in urls]

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total": len(records),
        "ok": sum(1 for r in records if r.get("fetch_status") == "ok"),
        "items": records,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"source index written: {out_path} ({payload['ok']}/{payload['total']} ok)")


if __name__ == "__main__":
    main()
