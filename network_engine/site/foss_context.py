# SPDX-License-Identifier: GPL-3.0-or-later
"""Contexto Jinja para plantillas FOSS."""

from __future__ import annotations

from network_engine.catalog.sync import GITHUB_BRANCH, GITHUB_REPO, github_blob

PROMPTS_OPERATIVOS: list[dict[str, str]] = [
    {
        "id": "equipar_loadout",
        "titulo": "Equipar loadout",
        "archivo": "docs/prompts/equipar_loadout.prompt.md",
        "descripcion": "Aplicar un loadout serializado (skill + perfil + engines + anclas).",
    },
    {
        "id": "iniciar_turno",
        "titulo": "Iniciar turno",
        "archivo": "docs/prompts/iniciar_turno.prompt.md",
        "descripcion": "ASENTAMIENTO + semilla del turno en el tablero.",
    },
    {
        "id": "activar_forces",
        "titulo": "Activar forces",
        "archivo": "docs/prompts/activar_forces.prompt.md",
        "descripcion": "Seleccionar ≤2 forces Cohen y leer escenas ancla.",
    },
    {
        "id": "calibrar_cotas",
        "titulo": "Calibrar cotas",
        "archivo": "docs/prompts/calibrar_cotas.prompt.md",
        "descripcion": "Oscilar sima ↔ cima y escribir posicion-linea.json.",
    },
]

PROMPTS_CIUDADANO: list[dict[str, str]] = [
    {
        "id": "publicar_sesion_prensa",
        "titulo": "Publicar sesión prensa",
        "archivo": "docs/prompts/publicar_sesion_prensa.prompt.md",
        "descripcion": "Depositar sesión calibrada en data/sessions/ para build prensa.",
    },
    {
        "id": "lectura_pack_tablero",
        "titulo": "Lectura pack tablero",
        "archivo": "docs/prompts/lectura_pack_tablero.prompt.md",
        "descripcion": "Interpretar un loadout + sesión exportada sin colapsar el tablero.",
    },
]


def _prompts_con_github(items: list[dict[str, str]]) -> list[dict[str, str]]:
    return [{**p, "github": github_blob(p["archivo"])} for p in items]


def foss_context() -> dict[str, object]:
    llms_path = "llms.md"
    return {
        "github_repo": GITHUB_REPO,
        "github_branch": GITHUB_BRANCH,
        "github_blob": github_blob,
        "prompts_operativos": _prompts_con_github(PROMPTS_OPERATIVOS),
        "prompts_ciudadano": _prompts_con_github(PROMPTS_CIUDADANO),
        "llms_github": github_blob(llms_path),
        "llms_raw": f"{GITHUB_REPO}/raw/{GITHUB_BRANCH}/{llms_path}",
        "llms_local": "llms.md",
    }
