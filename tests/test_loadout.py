# SPDX-License-Identifier: GPL-3.0-or-later
"""Tests loadout."""

from __future__ import annotations

from network_engine.tablero.loadout import cargar_loadout, validar_loadout


def test_default_tablero_valid() -> None:
    loadout = cargar_loadout("default-tablero")
    errors = validar_loadout(loadout)
    assert errors == [], errors


def test_default_tablero_fields() -> None:
    loadout = cargar_loadout("default-tablero")
    assert loadout["loadout_id"] == "default-tablero"
    assert loadout["engines_active"]["main_engine"] == "on"
    assert "engine-model-A" in loadout["engines_active"]["forces"]
