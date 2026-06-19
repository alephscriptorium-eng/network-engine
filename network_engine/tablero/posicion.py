# SPDX-License-Identifier: GPL-3.0-or-later
"""Posición en arco sima (0) ↔ cima (1)."""

from __future__ import annotations

import json
from typing import Any

from network_engine.paths import posicion_linea_path


def cargar_posicion() -> dict[str, Any]:
    path = posicion_linea_path()
    if not path.exists():
        return {"valor": None, "ancla_sima": None, "ancla_cima": None, "justificacion": None}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def validar_posicion(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    valor = data.get("valor")
    if valor is not None:
        if not isinstance(valor, (int, float)):
            errors.append("valor debe ser numérico o null")
        elif not 0.0 <= float(valor) <= 1.0:
            errors.append("valor debe estar entre 0.0 y 1.0")
    return errors


def guardar_posicion(data: dict[str, Any]) -> None:
    errs = validar_posicion(data)
    if errs:
        raise ValueError("; ".join(errs))
    path = posicion_linea_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
