#!/usr/bin/env python3
"""Batch-fetch priority revisions for lineas-poder cache."""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent

if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from mw_client import fetch_revision_content  # noqa: E402

ESPANA_ROOT = ROOT / "espana"
WP_HISTORIA_ROOT = ESPANA_ROOT / "wp" / "historia"
CACHE_DIR = WP_HISTORIA_ROOT / "cache"
SNAPSHOTS_DIR = CACHE_DIR / "snapshots"
DEFAULT_PRIORITY = SCRIPTS / "fetch-priority-viaje1.json"


def cached(oldid: int | None) -> bool:
    """Check if oldid has wikitext cached."""
    if not oldid:
        return False
    return (SNAPSHOTS_DIR / f"{oldid}.wikitext").exists()


def write_snapshot(oldid: int, title: str, content: str, meta_extra: dict) -> Path:
    """Write wikitext and meta.json to cache."""
    wt_path = SNAPSHOTS_DIR / f"{oldid}.wikitext"
    meta_path = SNAPSHOTS_DIR / f"{oldid}.meta.json"
    
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
    
    return wt_path


def filter_by_wave(entries: list[dict], wave: str) -> list[dict]:
    """Filter entries by wave (A, B, C, or all)."""
    if wave == "all":
        return entries
    return [e for e in entries if e.get("wave", "all") in (wave, "all")]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Batch-fetch revisions from priority manifest"
    )
    parser.add_argument(
        "--priority-file",
        type=Path,
        default=DEFAULT_PRIORITY,
        help="JSON priority list (default: fetch-priority-poder-viaje1.json)",
    )
    parser.add_argument(
        "--wave",
        choices=("A", "B", "C", "all"),
        default="all",
        help="Fetch only specific wave (default: all)",
    )
    parser.add_argument(
        "--max",
        type=int,
        default=None,
        help="Maximum number of revisions to fetch (budget limit)",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=1.0,
        help="Sleep between fetches (seconds, default: 1.0)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List what would be fetched without fetching",
    )
    args = parser.parse_args()
    
    # Load priority manifest
    priority_path = args.priority_file
    if not priority_path.is_absolute():
        candidate = SCRIPTS / priority_path
        priority_path = candidate if candidate.exists() else ROOT / priority_path
    
    if not priority_path.exists():
        print(f"ERROR: Priority file not found: {priority_path}")
        return
    
    entries = json.loads(priority_path.read_text(encoding="utf-8"))
    entries = filter_by_wave(entries, args.wave)
    
    # Filter out already cached
    to_fetch = [e for e in entries if not cached(e.get("oldid"))]
    
    # Apply max budget
    if args.max:
        to_fetch = to_fetch[:args.max]
    
    if args.dry_run:
        print(json.dumps({
            "dry_run": True,
            "priority_file": str(priority_path),
            "wave": args.wave,
            "total_in_manifest": len(entries),
            "already_cached": len(entries) - len(to_fetch),
            "to_fetch": len(to_fetch),
            "max_budget": args.max,
            "candidates": [
                {
                    "oldid": e["oldid"],
                    "wave": e.get("wave", "?"),
                    "tier": e.get("tier", "?"),
                    "note": e.get("note", "")[:60],
                }
                for e in to_fetch[:10]  # Show first 10
            ]
        }, indent=2, ensure_ascii=False))
        return
    
    # Fetch
    results = {
        "fetched": [],
        "skipped": [],
        "failed": [],
    }
    
    for i, entry in enumerate(to_fetch, 1):
        oldid = entry["oldid"]
        title = entry.get("title", "Historia_de_España")
        
        if cached(oldid):
            results["skipped"].append({"oldid": oldid, "reason": "exists"})
            continue
        
        print(f"[{i}/{len(to_fetch)}] Fetching {oldid} (wave {entry.get('wave', '?')})...")
        
        last_err = None
        for attempt in range(4):
            try:
                content, meta = fetch_revision_content(oldid, sleep=0)
                path = write_snapshot(oldid, title, content, meta)
                results["fetched"].append({
                    "oldid": oldid,
                    "title": title,
                    "bytes": len(content),
                    "path": str(path.relative_to(ROOT)),
                    "wave": entry.get("wave", "?"),
                })
                time.sleep(args.sleep)
                last_err = None
                break
            except Exception as exc:  # noqa: BLE001
                last_err = str(exc)
                if "429" in last_err and attempt < 3:
                    # Backoff on rate limit
                    backoff = args.sleep * (2 ** (attempt + 2))
                    print(f"  429 rate limit, backing off {backoff:.1f}s...")
                    time.sleep(backoff)
                    continue
                break
        
        if last_err:
            results["failed"].append({"oldid": oldid, "error": last_err})
            time.sleep(args.sleep)
    
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
