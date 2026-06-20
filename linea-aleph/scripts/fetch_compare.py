#!/usr/bin/env python3
"""Fetch revision diff via MediaWiki action=compare → cache/diffs/."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from mw_client import fetch_compare, human_source_url

ROOT = Path(__file__).resolve().parents[1]
DIFFS = ROOT / "cache" / "diffs"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch diff between two revisions (action=compare)."
    )
    parser.add_argument("--fromrev", type=int, required=True)
    parser.add_argument("--torev", type=int, required=True)
    parser.add_argument(
        "--title",
        default="",
        help="Article title for source_url citation (optional)",
    )
    parser.add_argument(
        "--write-diff",
        action="store_true",
        help="Also write raw diff body to .diff file",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.dry_run:
        print(
            json.dumps(
                {
                    "dry_run": True,
                    "fromrev": args.fromrev,
                    "torev": args.torev,
                    "would_write": str(DIFFS / f"{args.fromrev}-{args.torev}.json"),
                },
                indent=2,
            )
        )
        return

    result = fetch_compare(args.fromrev, args.torev)
    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    diff_body = result.pop("diff", "")

    payload = {
        **result,
        "fetched_at": fetched_at,
        "fetch_method": "api",
        "source_url_from": human_source_url(args.title or "?", args.fromrev)
        if args.title
        else f"oldid:{args.fromrev}",
        "source_url_to": human_source_url(args.title or "?", args.torev)
        if args.title
        else f"oldid:{args.torev}",
    }
    if diff_body:
        payload["diff_chars"] = len(diff_body)

    DIFFS.mkdir(parents=True, exist_ok=True)
    out_json = DIFFS / f"{args.fromrev}-{args.torev}.json"
    out_json.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    out_diff = None
    if args.write_diff and diff_body:
        out_diff = DIFFS / f"{args.fromrev}-{args.torev}.diff"
        out_diff.write_text(diff_body, encoding="utf-8")

    summary = {"ok": True, "json": str(out_json)}
    if out_diff:
        summary["diff"] = str(out_diff)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
