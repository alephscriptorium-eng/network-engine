# SPDX-License-Identifier: GPL-3.0-or-later
"""Lectura del registry engines y validación de budget forces."""

from __future__ import annotations

import json
from typing import Any

from network_engine.paths import ENGINES_DIR


def cargar_registry() -> dict[str, Any]:
    manifest_path = ENGINES_DIR / "manifest.json"
    with open(manifest_path, encoding="utf-8") as f:
        return json.load(f)


def cargar_engine(engine_id: str) -> dict[str, Any]:
    engine_json = ENGINES_DIR / engine_id / "engine.json"
    with open(engine_json, encoding="utf-8") as f:
        return json.load(f)


def validar_engines_active(engines_active: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    registry = cargar_registry()
    budget = registry.get("session_budget", {})
    max_forces = budget.get("max_force_engines", 2)
    main_always = budget.get("main_engine_always_on", True)

    forces = engines_active.get("forces", [])
    if len(forces) > max_forces:
        errors.append(f"Máx. {max_forces} forces; encontrados {len(forces)}")

    if main_always and engines_active.get("main_engine") != "on":
        errors.append("main_engine debe estar activo (on)")

    valid_ids = {e["id"] for e in registry.get("engines", [])}
    for force_id in forces:
        if force_id not in valid_ids:
            errors.append(f"Force desconocido: {force_id}")
        else:
            eng = next(e for e in registry["engines"] if e["id"] == force_id)
            if eng.get("role") != "force":
                errors.append(f"{force_id} no es un force engine")

    return errors


def listar_engines() -> list[dict[str, Any]]:
    return cargar_registry().get("engines", [])
