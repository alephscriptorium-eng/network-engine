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

from cache_paths import meta_path, wikitext_path  # noqa: E402
from mw_client import fetch_latest_revision, fetch_revision_content  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TITLE = "Problema de la demarcación"


def write_snapshot(
    corpus: str,
    oldid: int,
    title: str,
    content: str,
    meta_extra: dict,
    force: bool = False,
) -> Path:
    wt = wikitext_path(corpus, oldid)
    mp = meta_path(corpus, oldid)
    if wt.exists() and not force:
        print(f"skip {oldid} (exists)")
        return wt
    wt.parent.mkdir(parents=True, exist_ok=True)
    wt.write_text(content, encoding="utf-8")
    meta = {
        "oldid": oldid,
        "title": title,
        "corpus": corpus,
        "source_api": "https://es.wikipedia.org/w/api.php",
        "source_url": f"https://es.wikipedia.org/w/index.php?title={title.replace(' ', '_')}&oldid={oldid}",
        "fetch_method": "api",
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        **meta_extra,
    }
    mp.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"cached {oldid} -> {wt}")
    return wt


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch Wikipedia revision wikitext")
    parser.add_argument("--oldid", type=int, help="Revision oldid")
    parser.add_argument("--latest", action="store_true", help="Fetch latest revision of --title")
    parser.add_argument("--title", default=DEFAULT_TITLE, help="Page title (required with --latest)")
    parser.add_argument("--corpus", choices=("article", "talk"), default="article")
    parser.add_argument("--sleep", type=float, default=1.0)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    if args.latest:
        content, meta = fetch_latest_revision(args.title, sleep=args.sleep)
        write_snapshot(
            args.corpus,
            meta["oldid"],
            meta["title"],
            content,
            meta,
            force=args.force,
        )
    elif args.oldid:
        content, meta = fetch_revision_content(args.oldid, sleep=args.sleep)
        write_snapshot(
            args.corpus,
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
