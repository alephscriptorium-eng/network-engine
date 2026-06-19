# SPDX-License-Identifier: GPL-3.0-or-later
"""Tests pack ZIP."""

from __future__ import annotations

import json
import zipfile
from datetime import date
from pathlib import Path

import pytest

from network_engine.tablero.pack import pack_loadout, pack_session
from network_engine.tablero.session import commit_session, init_session, publish_session


@pytest.fixture
def pack_env(tmp_path: Path, monkeypatch):
    ctx = tmp_path / "aleph-context"
    ctx.mkdir()
    sessions = tmp_path / "data" / "sessions"
    sessions.mkdir(parents=True)
    loadouts = tmp_path / "data" / "loadouts"
    loadouts.mkdir(parents=True)
    root = Path(__file__).resolve().parent.parent
    (loadouts / "default-tablero.json").write_text(
        (root / "data" / "loadouts" / "default-tablero.json").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    downloads = tmp_path / "public" / "prensa" / "downloads"
    downloads.mkdir(parents=True)

    monkeypatch.setattr("network_engine.paths.ALEPH_CONTEXT_DIR", ctx)
    monkeypatch.setattr("network_engine.paths.SESSIONS_DIR", sessions)
    monkeypatch.setattr("network_engine.paths.DATA_DIR", tmp_path / "data")
    monkeypatch.setattr("network_engine.paths.LOADOUTS_DIR", loadouts)
    monkeypatch.setattr("network_engine.paths.PUBLIC_PRENSA_DOWNLOADS", downloads)
    monkeypatch.setattr("network_engine.paths.SCHEMA_DIR", root / "data" / "schema")
    monkeypatch.setattr("network_engine.paths.PROJECT_ROOT", root)
    monkeypatch.setattr("network_engine.tablero.loadout.PROJECT_ROOT", root)
    monkeypatch.setattr("network_engine.tablero.loadout.ENGINES_DIR", root / "engines")
    monkeypatch.setattr("network_engine.tablero.session.SESSIONS_DIR", sessions)
    monkeypatch.setattr("network_engine.tablero.session.PROJECT_ROOT", root)

    hot = ctx / "hot.md"
    hot.write_text("**Perfil:** _x_\n**Semilla actual:** _x_\n**forces_active:** `[]`\n", encoding="utf-8")
    monkeypatch.setattr("network_engine.tablero.loadout.hot_md_path", lambda: hot)
    monkeypatch.setattr("network_engine.tablero.loadout.engines_active_path", lambda: ctx / "engines-active.json")
    monkeypatch.setattr("network_engine.tablero.loadout.posicion_linea_path", lambda: ctx / "posicion-linea.json")
    monkeypatch.setattr("network_engine.tablero.session.engines_active_path", lambda: ctx / "engines-active.json")
    monkeypatch.setattr("network_engine.tablero.session.posicion_linea_path", lambda: ctx / "posicion-linea.json")

    return tmp_path


def test_pack_session_zip_contents(pack_env, monkeypatch) -> None:
    monkeypatch.setattr(
        "network_engine.tablero.session.session_id_from_semilla",
        lambda semilla, fecha=None: "2026-06-19-pack-test",
    )
    init_session("default-tablero", "pack test")
    sid = "2026-06-19-pack-test"
    commit_session(sid, posicion=0.42, forces=["A"])
    publish_session(sid)

    dest = pack_session(sid)
    assert dest.is_file()
    with zipfile.ZipFile(dest) as zf:
        names = set(zf.namelist())
    for expected in ("loadout.json", "asentamiento.md", "respuesta.md", "session.json"):
        assert expected in names


def test_pack_loadout_zip(pack_env) -> None:
    dest = pack_loadout("default-tablero")
    assert dest.is_file()
    with zipfile.ZipFile(dest) as zf:
        assert "loadout.json" in zf.namelist()
