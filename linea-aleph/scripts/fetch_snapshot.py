#!/usr/bin/env python3
"""Fetch one Wikipedia revision into linea-aleph/cache/snapshots/."""

from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "cache" / "snapshots"
API = "https://es.wikipedia.org/w/api.php"
USER_AGENT = "linea-aleph/1.0 (BOT_ALEPH corpus; educational)"


def fetch_revision(oldid: int, title: str = "Problema de la demarcación") -> dict:
    params = {
        "action": "query",
        "format": "json",
        "prop": "revisions",
        "revids": oldid,
        "rvprop": "content|timestamp|user|ids|comment",
        "rvslots": "main",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    page = next(iter(data.get("query", {}).get("pages", {}).values()))
    rev = page["revisions"][0]
    slot = rev["slots"]["main"]
    return {
        "oldid": oldid,
        "title": page.get("title", title),
        "timestamp": rev.get("timestamp"),
        "user": rev.get("user"),
        "comment": rev.get("comment", ""),
        "wikitext": slot.get("*", ""),
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_url": f"https://es.wikipedia.org/w/index.php?title=Problema_de_la_demarcación&oldid={oldid}",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--oldid", type=int, required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    CACHE.mkdir(parents=True, exist_ok=True)
    payload = fetch_revision(args.oldid)

    if args.dry_run:
        print(json.dumps({k: v for k, v in payload.items() if k != "wikitext"}, indent=2))
        print(f"wikitext_chars: {len(payload['wikitext'])}")
        return

    wt_path = CACHE / f"{args.oldid}.wikitext"
    meta_path = CACHE / f"{args.oldid}.meta.json"
    wt_path.write_text(payload["wikitext"], encoding="utf-8")
    meta = {k: v for k, v in payload.items() if k != "wikitext"}
    meta["wikitext_path"] = str(wt_path.relative_to(ROOT))
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # update snapshot endpoint if exists
    for role in ("inicial", "final"):
        snap_meta = ROOT / "snapshots" / role / "meta.json"
        if snap_meta.exists():
            sm = json.loads(snap_meta.read_text(encoding="utf-8"))
            if sm.get("oldid") == args.oldid:
                sm["fetched"] = True
                sm["fetched_at"] = meta["fetched_at"]
                snap_meta.write_text(
                    json.dumps(sm, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
                )

    print(json.dumps({"ok": True, "wikitext": str(wt_path), "meta": str(meta_path)}, indent=2))


if __name__ == "__main__":
    main()
