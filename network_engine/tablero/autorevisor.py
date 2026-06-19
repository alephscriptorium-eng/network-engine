# SPDX-License-Identifier: GPL-3.0-or-later
"""Checklist AutoRevisor A–H (hardcoded inicial)."""

from __future__ import annotations

CHECKLIST: list[dict[str, str]] = [
    {"id": "A", "titulo": "¿Moví un polo?", "categoria": "simetria"},
    {"id": "B", "titulo": "¿Usé demarcación como neutro?", "categoria": "demarcacion"},
    {"id": "C", "titulo": "Geopolítica simétrica", "categoria": "simetria"},
    {"id": "D", "titulo": "¿Caí en bot-agente?", "categoria": "estilo"},
    {"id": "E", "titulo": "Agente espejo", "categoria": "simetria"},
    {"id": "F", "titulo": "¿Colapsé a una sola cota?", "categoria": "cotas"},
    {"id": "G", "titulo": "¿Fallé en forces Cohen?", "categoria": "engines"},
    {"id": "H", "titulo": "¿Colapsé el tablero?", "categoria": "tablero"},
]


def checklist() -> list[dict[str, str]]:
    return list(CHECKLIST)


def ids_checklist() -> list[str]:
    return [c["id"] for c in CHECKLIST]
