#!/usr/bin/env python3
"""Shared cache path helpers for article and talk corpora."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CORPORA = {
    "article": ROOT / "cache" / "snapshots",
    "talk": ROOT / "cache" / "talk" / "snapshots",
}

VALID_CORPORA = frozenset(CORPORA)


def crosswiki_snapshot_dir(lang: str) -> Path:
    return ROOT / "cache" / "crosswiki" / lang / "snapshots"


def snapshot_dir(corpus: str = "article", *, lang: str = "es") -> Path:
    if corpus == "crosswiki":
        return crosswiki_snapshot_dir(lang)
    if corpus not in CORPORA:
        raise ValueError(f"Unknown corpus {corpus!r}; expected article|talk|crosswiki")
    return CORPORA[corpus]


def meta_path(corpus: str, oldid: int, *, lang: str = "es") -> Path:
    return snapshot_dir(corpus, lang=lang) / f"{oldid}.meta.json"


def wikitext_path(corpus: str, oldid: int, *, lang: str = "es") -> Path:
    return snapshot_dir(corpus, lang=lang) / f"{oldid}.wikitext"


def cached(corpus: str, oldid: int) -> bool:
    return wikitext_path(corpus, oldid).exists()


def audit_output_path(corpus: str) -> Path:
    if corpus == "talk":
        return ROOT / "cache" / "audit-talk.json"
    return ROOT / "cache" / "audit-block7.json"


def talk_manifest_roots() -> list[Path]:
    talk_root = ROOT / "talk"
    if not talk_root.exists():
        return []
    return sorted(p for p in talk_root.iterdir() if p.is_dir() and (p / "manifest.json").exists())
