# SPDX-License-Identifier: GPL-3.0-or-later
"""Copy in-universe para plantillas prensa — títulos y leads operativos."""

from __future__ import annotations

from typing import Any

SECTIONS: dict[str, dict[str, str]] = {
    "catalog": {
        "title": "Centro de datos — estado del tablero",
        "lead": (
            "Punto de lectura del turno Aleph: equipar el traje rude-bot, calibrar fuerzas Cohen, "
            "consultar líneas de registro y repasar el flujo asentamiento → cotas → AutoRevisor."
        ),
        "dateline": "Prensa · Centro de datos",
    },
    "engines": {
        "title": "Fuerzas Cohen",
        "lead": (
            "Panel de fuerzas disponibles para el turno: main-engine siempre activo; "
            "hasta dos fuerzas Cohen con escena ancla cada una."
        ),
        "dateline": "Prensa · Fuerzas",
    },
    "corpus": {
        "title": "Líneas de registro del tablero",
        "lead": (
            "Dimensiones del tablero en lectura: sima y cima como cotas, línea como demarcación "
            "histórica, y registros de sesión y operación del skill."
        ),
        "dateline": "Prensa · Líneas de registro",
    },
    "equipamiento": {
        "title": "Equipamiento — traje rude-bot",
        "lead": (
            "Showcase: bot crudo → loadout instantáneo → ASENTAMIENTO. "
            "Sin metáfora superhéroe; equipamiento operativo crudo."
        ),
        "dateline": "Prensa · Equipamiento",
    },
    "tablero": {
        "title": "Tablero Aleph — reglas del juego",
        "lead": (
            "Superposición de miradas sin colapsar. Un turno: equipar loadout → ASENTAMIENTO → "
            "cotas → fuerzas → AutoRevisor → constelación."
        ),
        "dateline": "Prensa · Tablero",
    },
    "sesiones": {
        "title": "Sesiones publicadas",
        "lead": (
            "Turnos del tablero depositados en data/sessions/: semilla, posición en línea, "
            "forces Cohen y artefactos enlazados al repo."
        ),
        "dateline": "Prensa · Sesiones",
    },
    "downloads": {
        "title": "Descargas — packs tablero",
        "lead": (
            "Paquetes ZIP con loadout, ASENTAMIENTO, engines-active y session.json "
            "para lectura offline del turno."
        ),
        "dateline": "Prensa · Descargas",
    },
}

ENGINE_ROLE_LABELS: dict[str, str] = {
    "boot": "Arranque del turno — siempre activo",
    "force": "Fuerza Cohen — máx. 2 por sesión",
}

CORPUS_DIMENSIONS: dict[str, dict[str, str]] = {
    "sima-aleph": {
        "label": "Cota sima",
        "summary": "Ancla inferior del eje vertical — sedimentación y peso del tablero.",
    },
    "cima-aleph": {
        "label": "Cota cima",
        "summary": "Ancla superior del eje vertical — altura y tensión del turno.",
    },
    "linea-aleph": {
        "label": "Línea histórica",
        "summary": "Demarcación temporal del tablero; hitos seleccionados, no el archivo completo.",
    },
    "logs-aleph": {
        "label": "Registro de sesiones",
        "summary": "Cronología de partidas Aleph — escenas indexadas del juego en curso.",
    },
    "logs-skill": {
        "label": "Registro operativo",
        "summary": "Trazas del skill modo-aleph: asentamiento, AutoRevisor y calibración.",
    },
}

CATALOG_ACTIONS: list[dict[str, str]] = [
    {
        "href": "equipamiento/index.html",
        "label": "Equipar",
        "detail": "Traje rude-bot: antes, loadout y ASENTAMIENTO",
    },
    {
        "href": "engines/index.html",
        "label": "Calibrar fuerzas",
        "detail": "main-engine + fuerzas Cohen del turno",
    },
    {
        "href": "corpus/index.html",
        "label": "Leer líneas",
        "detail": "Sima, cima, línea y registros de sesión",
    },
    {
        "href": "tablero/index.html",
        "label": "Reglas del turno",
        "detail": "Flujo completo y piezas del tablero",
    },
    {
        "href": "sesiones/index.html",
        "label": "Sesiones",
        "detail": "Turnos publicados del tablero",
    },
    {
        "href": "downloads/index.html",
        "label": "Descargas",
        "detail": "Packs ZIP loadout y sesión",
    },
]


def section_copy(slug: str) -> dict[str, str]:
    return SECTIONS.get(slug, SECTIONS["catalog"])


def engine_role_label(role: str) -> str:
    return ENGINE_ROLE_LABELS.get(role, role)


def corpus_dimension(corpus_id: str) -> dict[str, str]:
    return CORPUS_DIMENSIONS.get(
        corpus_id,
        {"label": corpus_id, "summary": "Línea de registro del tablero."},
    )


def prensa_copy() -> dict[str, Any]:
    return {
        "sections": SECTIONS,
        "catalog_actions": CATALOG_ACTIONS,
        "engine_role_labels": ENGINE_ROLE_LABELS,
        "corpus_dimensions": CORPUS_DIMENSIONS,
        "section_copy": section_copy,
        "engine_role_label": engine_role_label,
        "corpus_dimension": corpus_dimension,
    }
