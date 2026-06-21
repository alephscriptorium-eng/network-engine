#!/usr/bin/env python3
"""Fetch one Wikipedia revision into linea-aleph cache snapshots."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from cache_paths import ROOT, meta_path, snapshot_dir, wikitext_path
from mw_client import fetch_latest_revision_content, fetch_revision_content


def infer_namespace(title: str) -> int:
    if title.startswith("Usuario discusión:"):
        return 3
    if title.startswith("Discusión:"):
        return 1
    return 0


def infer_linked_article(title: str, corpus: str) -> str | None:
    if corpus != "talk":
        return None
    if title == "Discusión:Pseudociencia":
        return "Pseudociencia"
    return None


def fetch_revision(oldid: int, title: str = "Problema de la demarcación") -> dict:
    payload = fetch_revision_content(oldid, title)
    payload["fetched_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return payload


def fetch_latest_revision(title: str = "Problema de la demarcación") -> dict:
    payload = fetch_latest_revision_content(title)
    payload["fetched_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return payload


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
    """Update fetched flag in root and sub-corpus snapshot endpoints (article corpus only)."""
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


def save_snapshot_payload(payload: dict, corpus: str = "article") -> tuple[Path, Path]:
    """Write wikitext + meta.json with fetch_method=api."""
    cache = snapshot_dir(corpus)
    cache.mkdir(parents=True, exist_ok=True)
    oldid = payload["oldid"]
    title = payload.get("title", "")
    wt_path = wikitext_path(corpus, oldid)
    meta_out = meta_path(corpus, oldid)
    wt_path.write_text(payload["wikitext"], encoding="utf-8")
    meta = {k: v for k, v in payload.items() if k != "wikitext"}
    meta["wikitext_path"] = str(wt_path.relative_to(ROOT))
    meta["fetch_method"] = "api"
    meta["corpus"] = corpus
    if corpus == "talk":
        meta["namespace"] = infer_namespace(title)
        linked = infer_linked_article(title, corpus)
        if linked:
            meta["linked_article"] = linked
    meta_out.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return wt_path, meta_out


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
        help="Wikipedia page title for source_url",
    )
    parser.add_argument(
        "--corpus",
        choices=("article", "talk"),
        default="article",
        help="Cache corpus: article (NS0) or talk (NS1/NS3)",
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

    wt_path, meta_out = save_snapshot_payload(payload, args.corpus)

    if args.corpus == "article":
        update_snapshot_endpoints(
            oldid,
            payload["fetched_at"],
            len(payload["wikitext"]),
            is_latest=args.latest,
            title=payload["title"],
            user=payload.get("user", ""),
            timestamp=payload.get("timestamp", ""),
        )

    print(json.dumps({"ok": True, "wikitext": str(wt_path), "meta": str(meta_out)}, indent=2))


if __name__ == "__main__":
    main()
