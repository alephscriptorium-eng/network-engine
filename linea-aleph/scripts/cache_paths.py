"""Path helpers for linea-aleph cache layout."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def snapshot_dir(corpus: str = "article") -> Path:
    if corpus == "talk":
        return ROOT / "cache" / "talk" / "snapshots"
    return ROOT / "cache" / "snapshots"


def wikitext_path(corpus: str, oldid: int) -> Path:
    return snapshot_dir(corpus) / f"{oldid}.wikitext"


def meta_path(corpus: str, oldid: int) -> Path:
    return snapshot_dir(corpus) / f"{oldid}.meta.json"


def cached(corpus: str, oldid: int | None) -> bool:
    if not oldid:
        return False
    return wikitext_path(corpus, oldid).exists()


def audit_output_path(corpus: str) -> Path:
    name = "audit-talk.json" if corpus == "talk" else "audit-block10.json"
    return ROOT / "cache" / name
