# SPDX-License-Identifier: GPL-3.0-or-later
"""Smoke tests build."""

from __future__ import annotations

from pathlib import Path

from network_engine.cli.build import run_build
from network_engine.paths import PUBLIC_DIR, PUBLIC_FOSS, PUBLIC_PRENSA


def test_build_all(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("network_engine.cli.build.PUBLIC_DIR", tmp_path)
    monkeypatch.setattr("network_engine.cli.build.PUBLIC_PRENSA", tmp_path / "prensa")
    monkeypatch.setattr("network_engine.cli.build.PUBLIC_FOSS", tmp_path / "foss")
    run_build(target="all")
    assert (tmp_path / "index.html").exists()
    assert (tmp_path / "prensa" / "index.html").exists()
    assert (tmp_path / "foss" / "index.html").exists()


def test_public_after_build() -> None:
    run_build(target="all")
    assert (PUBLIC_DIR / "index.html").is_file()
    assert (PUBLIC_PRENSA / "engines" / "index.html").is_file()
    assert (PUBLIC_FOSS / "devops.html").is_file()
