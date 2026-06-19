# SPDX-License-Identifier: GPL-3.0-or-later
"""Smoke tests for catalog, loadout and build."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from network_engine.catalog.sync import cargar_catalog, sincronizar_catalog
from network_engine.cli.build import run_build
from network_engine.paths import CATALOG_PATH, PROJECT_ROOT, PUBLIC_DIR, PUBLIC_FOSS, PUBLIC_PRENSA
from network_engine.tablero.loadout import cargar_loadout, validar_loadout


def test_catalog_sync_produces_valid_json(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "network_engine.catalog.sync.CATALOG_PATH",
        tmp_path / "catalog.json",
    )
    cat = sincronizar_catalog()
    assert "engines" in cat
    assert "corpus" in cat
    assert len(cat["engines"]) == 7
    assert len(cat["corpus"]) == 5
    data = json.loads((tmp_path / "catalog.json").read_text(encoding="utf-8"))
    assert data["version"]


def test_loadout_validate_default_tablero():
    loadout = cargar_loadout("default-tablero")
    errors = validar_loadout(loadout)
    assert errors == [], errors


def test_build_all_smoke():
    run_build(target="all")
    assert (PUBLIC_DIR / "index.html").exists()
    assert (PUBLIC_FOSS / "index.html").exists()
    assert (PUBLIC_PRENSA / "index.html").exists()
    assert (PUBLIC_PRENSA / "engines" / "index.html").exists()
    assert (PUBLIC_PRENSA / "tablero" / "index.html").exists()


def test_cargar_catalog_uses_file():
    if not CATALOG_PATH.exists():
        sincronizar_catalog()
    cat = cargar_catalog()
    assert isinstance(cat["engines"], list)
