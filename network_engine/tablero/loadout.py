# SPDX-License-Identifier: GPL-3.0-or-later
"""Validación y carga de loadouts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import jsonschema

from network_engine.paths import (
    ENGINES_DIR,
    LOADOUTS_DIR,
    PROFILES_DIR,
    PROJECT_ROOT,
    SCHEMA_DIR,
    loadout_path,
)


def _schema(name: str) -> dict[str, Any]:
    with open(SCHEMA_DIR / name, encoding="utf-8") as f:
        return json.load(f)


def cargar_loadout(loadout_id: str) -> dict[str, Any]:
    path = loadout_path(loadout_id)
    if not path.exists():
        raise FileNotFoundError(f"Loadout no encontrado: {path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _resolve_ref(ref: str) -> Path:
    p = Path(ref)
    if p.is_absolute():
        return p
    return PROJECT_ROOT / ref


def validar_loadout(loadout: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    try:
        jsonschema.validate(loadout, _schema("loadout.schema.json"))
    except jsonschema.ValidationError as e:
        errors.append(str(e.message))

    profile_ref = loadout.get("profile_ref")
    if profile_ref:
        profile_path = _resolve_ref(profile_ref)
        if not profile_path.exists():
            errors.append(f"Perfil no encontrado: {profile_ref}")
        else:
            with open(profile_path, encoding="utf-8") as f:
                profile = json.load(f)
            try:
                jsonschema.validate(profile, _schema("profile.schema.json"))
            except jsonschema.ValidationError as e:
                errors.append(f"Perfil inválido: {e.message}")

    skill = loadout.get("skill")
    if skill:
        skill_path = PROJECT_ROOT / skill / "SKILL.md"
        if not skill_path.exists():
            errors.append(f"Skill no encontrado: {skill}")

    engines_active = loadout.get("engines_active", {})
    forces = engines_active.get("forces", [])
    if len(forces) > 2:
        errors.append(f"Máx. 2 forces; encontrados {len(forces)}")
    for force_id in forces:
        engine_json = ENGINES_DIR / force_id / "engine.json"
        if not engine_json.exists():
            errors.append(f"Engine force no encontrado: {force_id}")

    main = engines_active.get("main_engine")
    if main != "on":
        errors.append("main_engine debe estar 'on'")

    for anchor in loadout.get("anchor_scenes", []):
        anchor_path = PROJECT_ROOT / anchor
        output_md = anchor_path / "output.md" if anchor_path.suffix != ".md" else anchor_path
        if not output_md.exists() and not anchor_path.exists():
            errors.append(f"Escena ancla no encontrada: {anchor}")

    return errors


def listar_loadouts() -> list[str]:
    if not LOADOUTS_DIR.exists():
        return []
    return sorted(p.stem for p in LOADOUTS_DIR.glob("*.json"))
