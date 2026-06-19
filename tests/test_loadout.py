# SPDX-License-Identifier: GPL-3.0-or-later
"""Tests loadout."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from network_engine.paths import engines_active_path, hot_md_path
from network_engine.tablero.loadout import aplicar_loadout, cargar_loadout, validar_loadout


def test_default_tablero_valid() -> None:
    loadout = cargar_loadout("default-tablero")
    errors = validar_loadout(loadout)
    assert errors == [], errors


def test_default_tablero_fields() -> None:
    loadout = cargar_loadout("default-tablero")
    assert loadout["loadout_id"] == "default-tablero"
    assert loadout["engines_active"]["main_engine"] == "on"
    assert "engine-model-A" in loadout["engines_active"]["forces"]


def test_aplicar_loadout_writes_engines_active(tmp_path: Path, monkeypatch) -> None:
    ctx = tmp_path / "aleph-context"
    ctx.mkdir()
    hot = ctx / "hot.md"
    hot.write_text(
        "**Perfil:** _pendiente_\n**Semilla actual:** _pendiente_\n"
        "**forces_active:** `[]`\n**Último AutoRevisor:** _pendiente_\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("network_engine.tablero.loadout.engines_active_path", lambda: ctx / "engines-active.json")
    monkeypatch.setattr("network_engine.tablero.loadout.hot_md_path", lambda: hot)
    monkeypatch.setattr("network_engine.tablero.loadout.posicion_linea_path", lambda: ctx / "posicion-linea.json")

    aplicar_loadout("default-tablero", semilla="tema-test")
    data = json.loads((ctx / "engines-active.json").read_text(encoding="utf-8"))
    assert data["main_engine"]["status"] == "on"
    assert data["main_engine"]["id"] == "main-engine"
    assert "tema-test" in hot.read_text(encoding="utf-8")
