# SPDX-License-Identifier: GPL-3.0-or-later
"""Gestión de sesiones tablero: init, commit, publish."""

from __future__ import annotations

import json
import re
import shutil
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import jsonschema

from network_engine.paths import (
    PROJECT_ROOT,
    SCHEMA_DIR,
    SESSIONS_DIR,
    engines_active_path,
    posicion_linea_path,
    session_dir,
    session_json_path,
)
from network_engine.tablero.loadout import aplicar_loadout, cargar_loadout
from network_engine.tablero.posicion import guardar_posicion

FORCE_SHORT_MAP = {letter: f"engine-model-{letter}" for letter in "ABCDEF"}


def _schema(name: str) -> dict[str, Any]:
    with open(SCHEMA_DIR / name, encoding="utf-8") as f:
        return json.load(f)


def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _slug_semilla(semilla: str) -> str:
    s = semilla.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    if not s or not s[0].isalnum():
        s = f"tema-{s}" if s else "tema"
    return s[:48].rstrip("-")


def session_id_from_semilla(semilla: str, fecha: date | None = None) -> str:
    d = fecha or date.today()
    return f"{d.isoformat()}-{_slug_semilla(semilla)}"


def parse_forces(forces_arg: str | None) -> list[str]:
    if not forces_arg:
        return []
    return [f.strip() for f in forces_arg.split(",") if f.strip()]


def _map_forces(short_forces: list[str]) -> list[str]:
    mapped: list[str] = []
    for raw in short_forces:
        token = raw.strip().upper()
        if token in FORCE_SHORT_MAP:
            mapped.append(FORCE_SHORT_MAP[token])
        elif raw.strip().startswith("engine-model-"):
            mapped.append(raw.strip())
        else:
            raise ValueError(f"Force desconocido: {raw}")
    if len(mapped) > 2:
        raise ValueError("Máx. 2 forces por sesión")
    return mapped


def _validar_session(data: dict[str, Any]) -> None:
    jsonschema.validate(data, _schema("session.schema.json"))


def _stub_asentamiento(semilla: str, loadout_id: str) -> str:
    return f"""<!-- ASENTAMIENTO_ALEPH -->
## Eigenstate del modelo (esta sesión)

- **Semilla del usuario:** {semilla}
- **Loadout:** `{loadout_id}`

## Tablero

- **AutoRevisor:** pendiente

<!-- /ASENTAMIENTO_ALEPH -->
"""


def _stub_respuesta() -> str:
    return "<!-- RESPUESTA_TABLERO -->\n\n_Constelación del turno — pendiente._\n\n<!-- /RESPUESTA_TABLERO -->\n"


def _guardar_session(session_id: str, data: dict[str, Any]) -> None:
    _validar_session(data)
    path = session_json_path(session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def cargar_session(session_id: str) -> dict[str, Any]:
    path = session_json_path(session_id)
    if not path.exists():
        raise FileNotFoundError(f"Sesión no encontrada: {session_id}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def init_session(loadout_id: str, semilla: str, session_id: str | None = None) -> dict[str, Any]:
    loadout = aplicar_loadout(loadout_id, semilla=semilla)
    sid = session_id or session_id_from_semilla(semilla)
    sdir = session_dir(sid)
    if sdir.exists() and (sdir / "session.json").exists():
        raise ValueError(f"Sesión ya existe: {sid}")
    sdir.mkdir(parents=True, exist_ok=True)

    profile_ref = loadout.get("profile_ref")
    profile_slug = Path(profile_ref).stem if profile_ref else None
    now = _iso_now()
    session_data: dict[str, Any] = {
        "session_id": sid,
        "title": semilla[:80],
        "semilla": semilla,
        "loadout_id": loadout_id,
        "profile_slug": profile_slug,
        "profile_ref": profile_ref,
        "posicion_linea": None,
        "status": "draft",
        "created_at": now,
        "committed_at": None,
        "asentamiento_path": "asentamiento.md",
        "respuesta_path": "respuesta.md",
    }
    _guardar_session(sid, session_data)

    (sdir / "asentamiento.md").write_text(_stub_asentamiento(semilla, loadout_id), encoding="utf-8")
    (sdir / "respuesta.md").write_text(_stub_respuesta(), encoding="utf-8")
    return session_data


def commit_session(
    session_id: str,
    posicion: float,
    forces: list[str],
) -> dict[str, Any]:
    session = cargar_session(session_id)
    if session.get("status") not in ("draft", "committed"):
        raise ValueError(f"Estado no commiteable: {session.get('status')}")

    force_ids = _map_forces(forces)
    engines_active = {
        "main_engine": "on",
        "forces": force_ids,
    }
    now = _iso_now()
    session["posicion_linea"] = posicion
    session["engines_active"] = engines_active
    session["status"] = "committed"
    session["committed_at"] = now
    _guardar_session(session_id, session)

    guardar_posicion(
        {
            "descripcion": "Posición de la semilla actual en el arco sima (0) ↔ cima (1) sobre la espina linea-aleph",
            "valor": posicion,
            "ancla_sima": session.get("ancla_sima"),
            "ancla_cima": session.get("ancla_cima"),
            "registro_linea": session.get("registro_linea"),
            "semilla_actual": session.get("semilla"),
            "updated_at": now,
            "notas": f"Commit sesión {session_id}",
        }
    )

    loadout = cargar_loadout(session["loadout_id"])
    from network_engine.tablero.loadout import build_engines_active

    payload = build_engines_active({**loadout, "engines_active": engines_active})
    payload["updated_at"] = now
    with open(engines_active_path(), "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")

    sdir = session_dir(session_id)
    shutil.copy2(engines_active_path(), sdir / "engines-active.json")
    shutil.copy2(posicion_linea_path(), sdir / "posicion-linea.json")
    return session


def publish_session(session_id: str) -> dict[str, Any]:
    session = cargar_session(session_id)
    if session.get("status") not in ("committed", "published"):
        raise ValueError("Solo sesiones committed pueden publicarse")

    sdir = session_dir(session_id)
    for name in ("asentamiento.md", "respuesta.md", "engines-active.json", "posicion-linea.json"):
        src_ctx = PROJECT_ROOT / "aleph-context" / name
        dst = sdir / name
        if not dst.exists() and src_ctx.exists():
            shutil.copy2(src_ctx, dst)
        elif name.endswith(".md") and not dst.exists():
            dst.write_text(_stub_asentamiento(session["semilla"], session["loadout_id"]), encoding="utf-8")

    loadout_src = PROJECT_ROOT / "data" / "loadouts" / f"{session['loadout_id']}.json"
    if loadout_src.exists():
        shutil.copy2(loadout_src, sdir / "loadout.json")

    session["status"] = "published"
    session["url_prensa"] = f"prensa/sesiones/{session_id}.html"
    _guardar_session(session_id, session)
    return session
