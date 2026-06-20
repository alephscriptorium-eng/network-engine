#!/usr/bin/env python3
"""
Ingest Wikipedia dump XML into linea-aleph cache (phase 2 — registros >80%).

PHASE 2 USAGE (not run in phase 1):
  When API batch is insufficient (>200 oldids per article or >80% registros goal),
  download once from dumps.wikimedia.org and stream-parse into cache/snapshots/.

Dump URL pattern (eswiki):
  https://dumps.wikimedia.org/eswiki/{YYYYMMDD}/
  eswiki-{YYYYMMDD}-history-{n}.xml.bz2
  eswiki-{YYYYMMDD}-pages-meta-history.xml.bz2  (full article histories)

Workflow (future):
  1. Pick dump date closest to target era (e.g. 2007 for SolveCoagula window)
  2. Download to cache/dumps/ (large .bz2 — gitignored)
  3. Filter by title + manifest oldid list
  4. Write {oldid}.wikitext + {oldid}.meta.json with fetch_method=dump
  5. audit_cache.py treats dump and API bodies identically

This stub does NOT download dumps unless explicitly requested with --download-test.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "cache" / "snapshots"
DUMPS = ROOT / "cache" / "dumps"

DUMP_INDEX_URL = "https://dumps.wikimedia.org/eswiki/"
DUMP_FILE_PATTERN = "eswiki-{date}-pages-meta-history.xml.bz2"


def manifest_oldids(manifest_path: Path) -> list[int]:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    return [r["oldid"] for r in data.get("registros", []) if r.get("oldid")]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Phase 2: ingest eswiki dump XML into cache/snapshots (stub)."
    )
    parser.add_argument(
        "--dump-date",
        default="",
        help="Dump date YYYYMMDD (see dumps.wikimedia.org/eswiki/)",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=ROOT / "manifest.json",
        help="Manifest to filter oldids",
    )
    parser.add_argument(
        "--title",
        default="Problema de la demarcación",
        help="Article title filter in dump XML",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show planned URLs and oldid count only",
    )
    parser.add_argument(
        "--download-test",
        action="store_true",
        help="Reserved: trivial connectivity test only (not implemented)",
    )
    args = parser.parse_args()

    DUMPS.mkdir(parents=True, exist_ok=True)
    oldids = manifest_oldids(args.manifest)
    dump_file = DUMP_FILE_PATTERN.format(date=args.dump_date or "YYYYMMDD")
    dump_url = f"{DUMP_INDEX_URL}{args.dump_date}/" if args.dump_date else DUMP_INDEX_URL

    plan = {
        "phase": 2,
        "status": "stub",
        "dump_index": DUMP_INDEX_URL,
        "dump_url": dump_url,
        "dump_file": dump_file,
        "dump_local": str(DUMPS / dump_file),
        "manifest": str(args.manifest),
        "title_filter": args.title,
        "oldid_count": len(oldids),
        "output": str(CACHE),
        "fetch_method": "dump",
    }

    if args.download_test:
        plan["download_test"] = "skipped — implement in phase 2 day; dumps are multi-GB"

    if args.dry_run or not args.dump_date:
        print(json.dumps(plan, indent=2, ensure_ascii=False))
        if not args.dump_date:
            print("\nProvide --dump-date YYYYMMDD to plan a concrete dump file.", file=sys.stderr)
        return

    print(json.dumps({**plan, "message": "XML stream ingest not yet implemented"}, indent=2))


if __name__ == "__main__":
    main()
