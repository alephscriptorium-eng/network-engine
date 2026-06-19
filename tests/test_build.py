# SPDX-License-Identifier: GPL-3.0-or-later
"""Smoke tests build."""

from __future__ import annotations

import re
from pathlib import Path

from network_engine.cli.build import run_build
from network_engine.paths import PUBLIC_DIR, PUBLIC_FOSS, PUBLIC_PRENSA

FOSS_JARGON_IN_LEADS = ("blob/main", "manifest.json", "registry")
LEAD_RE = re.compile(r'<p class="lead">(.*?)</p>', re.DOTALL)


def _lead_text(html: str) -> str:
    match = LEAD_RE.search(html)
    return match.group(1) if match else ""


def test_build_all(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("network_engine.cli.build.PUBLIC_DIR", tmp_path)
    monkeypatch.setattr("network_engine.cli.build.PUBLIC_PRENSA", tmp_path / "prensa")
    monkeypatch.setattr("network_engine.cli.build.PUBLIC_FOSS", tmp_path / "foss")
    run_build(target="all")
    assert (tmp_path / "index.html").exists()
    assert (tmp_path / "prensa" / "index.html").exists()
    assert (tmp_path / "foss" / "index.html").exists()
    theme = (tmp_path / "assets" / "theme.js").read_text(encoding="utf-8")
    assert '"ne-theme"' in theme
    logo = tmp_path / "assets" / "logo.png"
    assert logo.is_file()
    assert logo.stat().st_size < 80_000


def test_public_after_build() -> None:
    run_build(target="all")
    assert (PUBLIC_DIR / "index.html").is_file()
    assert (PUBLIC_PRENSA / "engines" / "index.html").is_file()
    assert (PUBLIC_FOSS / "devops.html").is_file()
    foss_index = (PUBLIC_FOSS / "index.html").read_text(encoding="utf-8")
    assert '<meta name="description"' in foss_index
    assert 'rel="canonical"' in foss_index
    assert 'rel="icon"' in foss_index
    assert "ne-theme" in (PUBLIC_DIR / "assets" / "theme.js").read_text(encoding="utf-8")
    assert (PUBLIC_DIR / "assets" / "favicon.png").is_file()
    assert (PUBLIC_DIR / "assets" / "logo.png").stat().st_size < 80_000


def test_prensa_leads_no_foss_jargon() -> None:
    run_build(target="prensa")
    for rel in ("engines/index.html", "corpus/index.html"):
        html = (PUBLIC_PRENSA / rel).read_text(encoding="utf-8")
        lead = _lead_text(html).lower()
        assert lead, f"missing lead in {rel}"
        for term in FOSS_JARGON_IN_LEADS:
            assert term not in lead, f"{rel} lead contains {term!r}: {lead!r}"


def test_prensa_footer_no_provenance_logos() -> None:
    run_build(target="prensa")
    for rel in ("index.html", "engines/index.html", "corpus/index.html", "tablero/index.html"):
        html = (PUBLIC_PRENSA / rel).read_text(encoding="utf-8")
        footer_start = html.rfind("<footer")
        assert footer_start != -1, f"missing footer in {rel}"
        footer = html[footer_start:]
        assert "provenance-logos" not in footer, f"{rel} footer must not repeat logos"
        assert "provenance-footer" in footer
