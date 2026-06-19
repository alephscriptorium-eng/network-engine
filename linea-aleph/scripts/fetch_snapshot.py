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
    title_underscore = title.replace(" ", "_")
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
    t = urllib.parse.quote(title_underscore, safe="/:")
    return {
        "oldid": oldid,
        "title": page.get("title", title),
        "timestamp": rev.get("timestamp"),
        "user": rev.get("user"),
        "comment": rev.get("comment", ""),
        "wikitext": slot.get("*", ""),
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_url": f"https://es.wikipedia.org/w/index.php?title={t}&oldid={oldid}",
    }


def fetch_latest_revision(title: str = "Problema de la demarcación") -> dict:
    """Resolve the current (latest) revision oldid for an article title."""
    params = {
        "action": "query",
        "format": "json",
        "prop": "revisions",
        "titles": title,
        "rvlimit": 1,
        "rvprop": "content|timestamp|user|ids|comment",
        "rvslots": "main",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    page = next(iter(data.get("query", {}).get("pages", {}).values()))
    rev = page["revisions"][0]
    oldid = rev["revid"]
    slot = rev["slots"]["main"]
    title_underscore = page.get("title", title).replace(" ", "_")
    t = urllib.parse.quote(title_underscore, safe="/:")
    return {
        "oldid": oldid,
        "title": page.get("title", title),
        "timestamp": rev.get("timestamp"),
        "user": rev.get("user"),
        "comment": rev.get("comment", ""),
        "wikitext": slot.get("*", ""),
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_url": f"https://es.wikipedia.org/w/index.php?title={t}&oldid={oldid}",
    }


def update_snapshot_endpoints(
    oldid: int,
    fetched_at: str,
    bytes_size: int | None = None,
    *,
    is_latest: bool = False,
    title: str = "",
    user: str = "",
    timestamp: str = "",
) -> None:
    """Update fetched flag in root and sub-corpus snapshot endpoints."""
    title_norm = title.replace("_", " ")
    corpus_by_title = {
        "Problema de la demarcación": [ROOT / "snapshots"],
        "Pseudociencia": [ROOT / "pseudociencia" / "snapshots"],
    }
    if is_latest and title_norm in corpus_by_title:
        snap_roots = corpus_by_title[title_norm]
    else:
        snap_roots = [ROOT / "snapshots"]
        pseudo = ROOT / "pseudociencia" / "snapshots"
        if pseudo.parent.exists():
            snap_roots.append(pseudo)
    for snap_root in snap_roots:
        for role in ("previo", "inicial", "final", "sc_cierre", "actual"):
            snap_meta = snap_root / role / "meta.json"
            if not snap_meta.exists():
                continue
            sm = json.loads(snap_meta.read_text(encoding="utf-8"))
            if role == "actual":
                if not is_latest:
                    continue
                sm["oldid"] = oldid
                sm["timestamp"] = sm.get("timestamp") or ""
            elif sm.get("oldid") != oldid:
                continue
            sm["fetched"] = True
            sm["fetched_at"] = fetched_at
            if bytes_size is not None:
                sm["bytes"] = bytes_size
            if is_latest and role == "actual":
                cache_rel = f"cache/snapshots/{oldid}.wikitext"
                sm["cache_wikitext"] = cache_rel
                sm["cache_meta"] = f"cache/snapshots/{oldid}.meta.json"
                if user:
                    sm["user"] = user
                if timestamp:
                    sm["timestamp"] = timestamp
            snap_meta.write_text(
                json.dumps(sm, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--oldid", type=int, default=None)
    parser.add_argument(
        "--latest",
        action="store_true",
        help="Fetch the current revision for --title",
    )
    parser.add_argument(
        "--title",
        default="Problema de la demarcación",
        help="Wikipedia article title for source_url",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.latest:
        payload = fetch_latest_revision(args.title)
    elif args.oldid is not None:
        payload = fetch_revision(args.oldid, args.title)
    else:
        parser.error("Provide --oldid or --latest")

    oldid = payload["oldid"]

    if args.dry_run:
        print(json.dumps({k: v for k, v in payload.items() if k != "wikitext"}, indent=2))
        print(f"wikitext_chars: {len(payload['wikitext'])}")
        return

    CACHE.mkdir(parents=True, exist_ok=True)

    wt_path = CACHE / f"{oldid}.wikitext"
    meta_path = CACHE / f"{oldid}.meta.json"
    wt_path.write_text(payload["wikitext"], encoding="utf-8")
    meta = {k: v for k, v in payload.items() if k != "wikitext"}
    meta["wikitext_path"] = str(wt_path.relative_to(ROOT))
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    update_snapshot_endpoints(
        oldid,
        meta["fetched_at"],
        len(payload["wikitext"]),
        is_latest=args.latest,
        title=payload["title"],
        user=payload.get("user", ""),
        timestamp=payload.get("timestamp", ""),
    )

    print(json.dumps({"ok": True, "wikitext": str(wt_path), "meta": str(meta_path)}, indent=2))


if __name__ == "__main__":
    main()
