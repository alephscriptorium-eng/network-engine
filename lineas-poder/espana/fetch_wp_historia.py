#!/usr/bin/env python3
"""Fetch Historia de España revision history → wp/historia/raw/ (MediaWiki API).

Uses linea-aleph/mw_client helpers. Writes linea.md + linea.json compatible
with segment_linea.py. Caps revision window for v0 bootstrap.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LINEA_ALEPH = ROOT.parent.parent / "linea-aleph"
SCRIPTS = LINEA_ALEPH / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from history_common import fetch_all_revisions, format_history_line  # noqa: E402

TITLE = "Historia de España"
DEFAULT_CORPUS = ROOT / "wp" / "historia"


def build_linea_md(title: str, revisions: list[dict], generated_at: str) -> str:
    """Newest-first list compatible with segment_linea.parse_registro_line."""
    sizes: dict[int, int] = {}
    for r in revisions:
        sizes[r["revid"]] = r["size"]

    lines = [
        f"# {title} — historial artículo (es.wikipedia)",
        f"# generado: {generated_at} · registros: {len(revisions)}",
        "",
        f"Artículo: [{title}](https://es.wikipedia.org/wiki/{title.replace(' ', '_')})",
        "",
        "Ventana: historial completo vía API (v0 bootstrap lineas-poder/espana).",
        "",
    ]

    ordered = list(reversed(revisions))
    for i, rev in enumerate(ordered):
        parent = rev.get("parentid")
        prev_size = sizes.get(parent) if parent else None
        next_rev = ordered[i - 1]["revid"] if i > 0 else None
        lines.append(format_history_line(rev, prev_size, title, next_rev))

    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--title", default=TITLE)
    parser.add_argument("--corpus-dir", type=Path, default=DEFAULT_CORPUS)
    parser.add_argument(
        "--max-revisions",
        type=int,
        default=0,
        help="Cap revisions (0 = all; v0 default uses all from API)",
    )
    args = parser.parse_args()

    corpus = args.corpus_dir
    raw_dir = corpus / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    print(f"Fetching revisions for «{args.title}»…", file=sys.stderr)
    all_revs = fetch_all_revisions(args.title)
    all_revs.sort(key=lambda r: r["timestamp"])

    if args.max_revisions and len(all_revs) > args.max_revisions:
        all_revs = all_revs[-args.max_revisions :]

    if not all_revs:
        raise SystemExit("No revisions returned")

    previo = all_revs[0]
    previo_revid = previo.get("parentid")
    if previo_revid:
        from mw_client import fetch_revision_meta  # noqa: WPS433

        previo_meta = fetch_revision_meta(previo_revid)
    else:
        previo_meta = {"revid": None, "timestamp": "", "user": "", "size": 0}

    enriched = []
    by_id = {r["revid"]: r for r in all_revs}
    for r in all_revs:
        parent = r.get("parentid")
        parent_size = by_id.get(parent, {}).get("size", 0) if parent else 0
        enriched.append({**r, "byte_delta": r["size"] - parent_size})

    payload = {
        "meta": {
            "title": args.title,
            "wiki": "es",
            "generated_at": generated_at,
            "corpus_dir": str(corpus.relative_to(ROOT.parent.parent))
            if corpus.is_relative_to(ROOT.parent.parent)
            else str(corpus),
            "revision_count": len(all_revs),
            "ordering": "newest_first_in_linea_md",
            "fetch_method": "w/api.php prop=revisions",
        },
        "previo": previo_meta,
        "revisiones": enriched,
    }

    md_path = raw_dir / "linea.md"
    json_path = raw_dir / "linea.json"
    md_path.write_text(build_linea_md(args.title, all_revs, generated_at), encoding="utf-8")
    json_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    print(
        json.dumps(
            {
                "ok": True,
                "revision_count": len(all_revs),
                "md": str(md_path),
                "json": str(json_path),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
