# SPDX-License-Identifier: GPL-3.0-or-later
"""Validación stub de perfil §1–6."""

from __future__ import annotations

import json
from typing import Any

import jsonschema

from network_engine.paths import SCHEMA_DIR


SECTIONS = ["slug", "polo_tentado", "sesgos_estructurales", "sesgo_del_entrenamiento", "eigenstate"]


def _schema() -> dict[str, Any]:
    with open(SCHEMA_DIR / "profile.schema.json", encoding="utf-8") as f:
        return json.load(f)


def validar_perfil(profile: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    try:
        jsonschema.validate(profile, _schema())
    except jsonschema.ValidationError as e:
        errors.append(str(e.message))
    for field in SECTIONS:
        if field not in profile or not profile[field]:
            errors.append(f"Campo requerido ausente o vacío: {field}")
    return errors


def cargar_y_validar(path: str) -> tuple[dict[str, Any], list[str]]:
    with open(path, encoding="utf-8") as f:
        profile = json.load(f)
    return profile, validar_perfil(profile)
