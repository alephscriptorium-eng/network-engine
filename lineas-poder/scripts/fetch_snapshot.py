#!/usr/bin/env python3
"""Fetch a single Wikipedia revision into cache/snapshots/."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from mw_client import fetch_latest_revision, fetch_revision_content  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
ESPANA_ROOT = ROOT / "espana"
WP_HISTORIA_ROOT = ESPANA_ROOT / "wp" / "historia"
CACHE_DIR = WP_HISTORIA_ROOT / "cache"
SNAPSHOTS_DIR = CACHE_DIR / "snapshots"
DEFAULT_TITLE = "Historia_de_España"


def write_snapshot(
    oldid: int,
    title: str,
    content: str,
    meta_extra: dict,
    force: bool = False,
) -> Path:
    """Write wikitext and meta.json to cache."""
    wt_path = SNAPSHOTS_DIR / f"{oldid}.wikitext"
    meta_path = SNAPSHOTS_DIR / f"{oldid}.meta.json"
    
    if wt_path.exists() and not force:
        print(f"skip {oldid} (exists)")
        return wt_path
    
    SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Write wikitext
    wt_path.write_text(content, encoding="utf-8")
    
    # Write meta
    meta = {
        "oldid": oldid,
        "title": title,
        "corpus": "lineas-poder/espana/wp/historia",
        "source_api": "https://es.wikipedia.org/w/api.php",
        "source_url": f"https://es.wikipedia.org/w/index.php?title={title.replace(' ', '_')}&oldid={oldid}",
        "fetch_method": "api",
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        **meta_extra,
    }
    meta_path.write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )
    
    print(f"cached {oldid} -> {wt_path}")
    return wt_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch Wikipedia revision wikitext for lineas-poder"
    )
    parser.add_argument("--oldid", type=int, help="Revision oldid")
    parser.add_argument(
        "--latest",
        action="store_true",
        help="Fetch latest revision of --title"
    )
    parser.add_argument(
        "--title",
        default=DEFAULT_TITLE,
        help="Page title (required with --latest)"
    )
    parser.add_argument("--sleep", type=float, default=1.0)
    parser.add_argument("--force", action="store_true")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be fetched without actually fetching"
    )
    args = parser.parse_args()
    
    if args.dry_run:
        if args.latest:
            print(f"Would fetch latest revision of: {args.title}")
        elif args.oldid:
            print(f"Would fetch oldid: {args.oldid}")
        else:
            parser.error("Provide --oldid or --latest")
        return
    
    if args.latest:
        content, meta = fetch_latest_revision(args.title, sleep=args.sleep)
        write_snapshot(
            meta["oldid"],
            meta["title"],
            content,
            meta,
            force=args.force,
        )
    elif args.oldid:
        content, meta = fetch_revision_content(args.oldid, sleep=args.sleep)
        write_snapshot(
            args.oldid,
            meta.get("title") or args.title,
            content,
            meta,
            force=args.force,
        )
    else:
        parser.error("Provide --oldid or --latest")


if __name__ == "__main__":
    main()
