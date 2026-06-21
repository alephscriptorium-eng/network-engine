#!/usr/bin/env python3
"""Fetch article revision history from es.wikipedia → {corpus-dir}/raw/linea.md + linea.json."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from history_common import fetch_all_revisions, format_history_line
from mw_client import fetch_revision_meta

ROOT = Path(__file__).resolve().parents[1]

DEFAULT_FIRST_SC = 11951464
DEFAULT_LAST_SC = 12910974


def filter_window(
    revisions: list[dict],
    previo_revid: int,
    last_sc_revid: int,
) -> list[dict]:
    """All revisions after previo through last SC edit (inclusive)."""
    by_id = {r["revid"]: r for r in revisions}
    if last_sc_revid not in by_id:
        raise ValueError(f"Last SC revision {last_sc_revid} not in article history")
    last_ts = by_id[last_sc_revid]["timestamp"]
    previo_ts = by_id.get(previo_revid, {}).get("timestamp")
    if not previo_ts:
        meta = fetch_revision_meta(previo_revid)
        previo_ts = meta["timestamp"]

    window = [
        r
        for r in revisions
        if r["timestamp"] > previo_ts and r["timestamp"] <= last_ts
    ]
    window.sort(key=lambda r: r["timestamp"])
    return window


def build_linea_md(
    title: str,
    window: list[dict],
    previo_revid: int,
    first_sc: int,
    last_sc: int,
    generated_at: str,
) -> str:
    sizes: dict[int, int] = {previo_revid: 0}
    for r in window:
        sizes[r["revid"]] = r["size"]

    lines = [
        f"# {title} — historial artículo (es.wikipedia)",
        f"# generado: {generated_at} · registros en ventana: {len(window)}",
        "",
        f"Artículo: [{title}](https://es.wikipedia.org/wiki/{title.replace(' ', '_')})",
        "",
        f"Ventana SolveCoagula: previo oldid **{previo_revid}** → última edit SC "
        f"**{last_sc}** (primera SC: **{first_sc}**).",
        f"Anclas desde [`raw/linea2.json`](../raw/linea2.json) (contribuciones usuario).",
        f"Incluye **todos** los editores en la ventana (paridad con export `linea.md`).",
        "",
    ]

    ordered = list(reversed(window))
    for i, rev in enumerate(ordered):
        parent = rev["parentid"]
        prev_size = sizes.get(parent) if parent else None
        next_rev = ordered[i - 1]["revid"] if i > 0 else None
        lines.append(format_history_line(rev, prev_size, title, next_rev))

    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--title", default="Pseudociencia")
    parser.add_argument("--corpus-dir", default="pseudociencia")
    parser.add_argument("--first-sc", type=int, default=DEFAULT_FIRST_SC)
    parser.add_argument("--last-sc", type=int, default=DEFAULT_LAST_SC)
    args = parser.parse_args()

    corpus = ROOT / args.corpus_dir
    raw_dir = corpus / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    first_meta = fetch_revision_meta(args.first_sc)
    previo_revid = first_meta["parentid"]
    if not previo_revid:
        raise ValueError(f"No parent for first SC revision {args.first_sc}")

    previo_meta = fetch_revision_meta(previo_revid)
    all_revs = fetch_all_revisions(args.title)
    window = filter_window(all_revs, previo_revid, args.last_sc)

    enriched = []
    by_id = {r["revid"]: r for r in all_revs}
    by_id[previo_revid] = previo_meta
    for r in window:
        parent = r["parentid"]
        parent_size = by_id.get(parent, {}).get("size", 0) if parent else 0
        enriched.append({**r, "byte_delta": r["size"] - parent_size})

    payload = {
        "meta": {
            "title": args.title,
            "wiki": "es",
            "generated_at": generated_at,
            "corpus_dir": args.corpus_dir,
            "window": {
                "previo_oldid": previo_revid,
                "first_sc_oldid": args.first_sc,
                "last_sc_oldid": args.last_sc,
                "previo_timestamp": previo_meta["timestamp"],
                "first_sc_timestamp": first_meta["timestamp"],
            },
            "revision_count": len(window),
            "ordering": "newest_first_in_linea_md",
        },
        "previo": previo_meta,
        "revisiones": enriched,
    }

    md_path = raw_dir / "linea.md"
    json_path = raw_dir / "linea.json"
    md_path.write_text(
        build_linea_md(
            args.title,
            window,
            previo_revid,
            args.first_sc,
            args.last_sc,
            generated_at,
        ),
        encoding="utf-8",
    )
    json_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(
        json.dumps(
            {
                "ok": True,
                "revision_count": len(window),
                "previo_oldid": previo_revid,
                "first_sc": args.first_sc,
                "last_sc": args.last_sc,
                "md": str(md_path),
                "json": str(json_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
