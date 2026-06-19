# SPDX-License-Identifier: GPL-3.0-or-later
"""Validación y carga de loadouts."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import jsonschema

from network_engine.paths import (
    ALEPH_CONTEXT_DIR,
    ENGINES_DIR,
    LOADOUTS_DIR,
    PROJECT_ROOT,
    SCHEMA_DIR,
    engines_active_path,
    hot_md_path,
    loadout_path,
    posicion_linea_path,
)
from network_engine.tablero.engines import cargar_engine


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


def _iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _main_engine_anchor(loadout: dict[str, Any]) -> str:
    anchors = loadout.get("anchor_scenes") or []
    for anchor in anchors:
        if "main-engine" in anchor:
            return anchor
    if anchors:
        return anchors[0]
    return "engines/main-engine/sesion-01-boot-estetico-operativo/01-aspirate-a-esteta"


def _force_entry(force_id: str) -> dict[str, Any]:
    engine = cargar_engine(force_id)
    anchor = engine.get("anchor_scene", "")
    if anchor and not anchor.startswith("engines/"):
        anchor = f"engines/{force_id}/{anchor}"
    return {
        "id": force_id,
        "role": engine.get("role", "force"),
        "anchor": anchor,
        "status": "on",
    }


def build_engines_active(loadout: dict[str, Any]) -> dict[str, Any]:
    engines_cfg = loadout.get("engines_active", {})
    forces_ids = engines_cfg.get("forces", [])
    return {
        "main_engine": {
            "id": "main-engine",
            "role": "boot",
            "anchor": _main_engine_anchor(loadout),
            "status": "on",
        },
        "forces": [_force_entry(fid) for fid in forces_ids],
        "budget_max_forces": 2,
        "selection_rationale": None,
        "updated_at": _iso_now(),
    }


def _actualizar_hot_md(loadout: dict[str, Any], semilla: str) -> None:
    path = hot_md_path()
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    now = _iso_now()
    profile_ref = loadout.get("profile_ref", "")
    profile_name = Path(profile_ref).stem if profile_ref else "—"
    forces = loadout.get("engines_active", {}).get("forces", [])
    forces_label = ", ".join(f"`{f}`" for f in forces) if forces else "`[]`"

    replacements = [
        (r"\*\*Perfil:\*\*.*", f"**Perfil:** `{profile_name}` (`{profile_ref}`)"),
        (r"\*\*Semilla actual:\*\*.*", f"**Semilla actual:** {semilla} _(aplicado {now})_"),
        (
            r"\*\*forces_active:\*\*.*",
            f"**forces_active:** {forces_label} — máx. 2 — ver [`engines-active.json`](engines-active.json)",
        ),
        (r"\*\*Último AutoRevisor:\*\*.*", f"**Último AutoRevisor:** loadout aplicado {now}"),
    ]
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text, count=1)
    path.write_text(text, encoding="utf-8")


def aplicar_loadout(loadout_id: str, semilla: str | None = None) -> dict[str, Any]:
    """Valida loadout y persiste estado en aleph-context/."""
    loadout = cargar_loadout(loadout_id)
    errors = validar_loadout(loadout)
    if errors:
        raise ValueError("; ".join(errors))

    semilla_val = semilla or "(sin semilla)"
    ALEPH_CONTEXT_DIR.mkdir(parents=True, exist_ok=True)

    with open(engines_active_path(), "w", encoding="utf-8") as f:
        json.dump(build_engines_active(loadout), f, indent=2, ensure_ascii=False)
        f.write("\n")

    if loadout.get("posicion_linea") is not None:
        posicion = {
            "descripcion": "Posición de la semilla actual en el arco sima (0) ↔ cima (1) sobre la espina linea-aleph",
            "valor": loadout["posicion_linea"],
            "ancla_sima": None,
            "ancla_cima": None,
            "registro_linea": None,
            "semilla_actual": semilla_val,
            "updated_at": _iso_now(),
            "notas": f"Aplicado desde loadout {loadout_id}",
        }
        with open(posicion_linea_path(), "w", encoding="utf-8") as f:
            json.dump(posicion, f, indent=2, ensure_ascii=False)
            f.write("\n")

    _actualizar_hot_md(loadout, semilla_val)
    return loadout
