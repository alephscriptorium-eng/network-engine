# SPDX-License-Identifier: GPL-3.0-or-later
"""Empaquetado ZIP de sesiones y loadouts."""

from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path
from typing import Any

from network_engine.paths import (
    PROJECT_ROOT,
    engines_active_path,
    loadout_pack_path,
    loadout_path,
    posicion_linea_path,
    session_dir,
    session_pack_path,
)
from network_engine.tablero.loadout import cargar_loadout
from network_engine.tablero.session import cargar_session


PACK_FILES = (
    "loadout.json",
    "asentamiento.md",
    "respuesta.md",
    "engines-active.json",
    "posicion-linea.json",
    "session.json",
)


def _write_zip(entries: dict[str, Path | str], dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as zf:
        for arcname, source in entries.items():
            if isinstance(source, Path):
                if source.is_file():
                    zf.write(source, arcname=arcname)
            else:
                zf.writestr(arcname, source)
    return dest


def _session_entries(session_id: str) -> dict[str, Path | str]:
    sdir = session_dir(session_id)
    session = cargar_session(session_id)
    loadout_id = session["loadout_id"]
    entries: dict[str, Path | str] = {}

    session_json = sdir / "session.json"
    if session_json.is_file():
        entries["session.json"] = session_json

    loadout_file = sdir / "loadout.json"
    if not loadout_file.is_file():
        loadout_file = loadout_path(loadout_id)
    if loadout_file.is_file():
        entries["loadout.json"] = loadout_file

    for name in ("asentamiento.md", "respuesta.md", "engines-active.json", "posicion-linea.json"):
        path = sdir / name
        if not path.is_file():
            ctx = PROJECT_ROOT / "aleph-context" / name
            if ctx.is_file():
                path = ctx
        if path.is_file():
            entries[name] = path

    return entries


def pack_session(session_id: str) -> Path:
    entries = _session_entries(session_id)
    missing = [f for f in PACK_FILES if f not in entries]
    if missing:
        raise FileNotFoundError(f"Faltan archivos para pack de sesión: {', '.join(missing)}")
    return _write_zip(entries, session_pack_path(session_id))


def pack_loadout(loadout_id: str) -> Path:
    loadout = cargar_loadout(loadout_id)
    entries: dict[str, Path | str] = {
        "loadout.json": json.dumps(loadout, indent=2, ensure_ascii=False) + "\n",
    }
    template = PROJECT_ROOT / "agents" / "skills" / "modo-aleph" / "asentamiento-plantilla.md"
    if template.is_file():
        entries["asentamiento.md"] = template.read_text(encoding="utf-8")
    else:
        entries["asentamiento.md"] = f"# Loadout {loadout_id}\n"

    entries["respuesta.md"] = "_Sin sesión asociada — pack de loadout._\n"

    for name, resolver in (
        ("engines-active.json", engines_active_path),
        ("posicion-linea.json", posicion_linea_path),
    ):
        path = resolver()
        if path.is_file():
            entries[name] = path

    return _write_zip(entries, loadout_pack_path(loadout_id))
