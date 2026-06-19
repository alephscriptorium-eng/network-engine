# SPDX-License-Identifier: GPL-3.0-or-later
"""Tests sesión tablero."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pytest

from network_engine.catalog.sync import sincronizar_catalog
from network_engine.tablero.session import (
    commit_session,
    init_session,
    publish_session,
    session_id_from_semilla,
)

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture
def session_env(tmp_path: Path, monkeypatch):
    ctx = tmp_path / "aleph-context"
    ctx.mkdir()
    sessions = tmp_path / "data" / "sessions"
    sessions.mkdir(parents=True)
    loadouts = tmp_path / "data" / "loadouts"
    loadouts.mkdir(parents=True)
    (loadouts / "default-tablero.json").write_text(
        (ROOT / "data" / "loadouts" / "default-tablero.json").read_text(encoding="utf-8"),
        encoding="utf-8",
    )

    monkeypatch.setattr("network_engine.paths.ALEPH_CONTEXT_DIR", ctx)
    monkeypatch.setattr("network_engine.paths.SESSIONS_DIR", sessions)
    monkeypatch.setattr("network_engine.paths.DATA_DIR", tmp_path / "data")
    monkeypatch.setattr("network_engine.paths.LOADOUTS_DIR", loadouts)
    monkeypatch.setattr("network_engine.paths.SCHEMA_DIR", ROOT / "data" / "schema")
    monkeypatch.setattr("network_engine.paths.CATALOG_PATH", tmp_path / "data" / "catalog.json")
    monkeypatch.setattr("network_engine.paths.PROJECT_ROOT", ROOT)
    monkeypatch.setattr("network_engine.tablero.loadout.PROJECT_ROOT", ROOT)
    monkeypatch.setattr("network_engine.tablero.loadout.ENGINES_DIR", ROOT / "engines")
    monkeypatch.setattr("network_engine.tablero.session.SESSIONS_DIR", sessions)
    monkeypatch.setattr("network_engine.tablero.session.PROJECT_ROOT", ROOT)
    monkeypatch.setattr("network_engine.catalog.sync.SESSIONS_DIR", sessions)
    monkeypatch.setattr("network_engine.catalog.sync.CATALOG_PATH", tmp_path / "data" / "catalog.json")

    hot = ctx / "hot.md"
    hot.write_text(
        "**Perfil:** _pendiente_\n**Semilla actual:** _pendiente_\n"
        "**forces_active:** `[]`\n**Último AutoRevisor:** _pendiente_\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("network_engine.tablero.loadout.hot_md_path", lambda: hot)
    monkeypatch.setattr("network_engine.tablero.loadout.engines_active_path", lambda: ctx / "engines-active.json")
    monkeypatch.setattr("network_engine.tablero.loadout.posicion_linea_path", lambda: ctx / "posicion-linea.json")
    monkeypatch.setattr("network_engine.tablero.session.engines_active_path", lambda: ctx / "engines-active.json")
    monkeypatch.setattr("network_engine.tablero.session.posicion_linea_path", lambda: ctx / "posicion-linea.json")

    return tmp_path


def test_session_id_slug() -> None:
    sid = session_id_from_semilla("diamat en 1924", fecha=date(2026, 6, 19))
    assert sid == "2026-06-19-diamat-en-1924"


def test_session_init_commit_publish(session_env, monkeypatch) -> None:
    monkeypatch.setattr(
        "network_engine.tablero.session.session_id_from_semilla",
        lambda semilla, fecha=None: "2026-06-19-tema-demo",
    )
    init_session("default-tablero", "tema demo")
    sid = "2026-06-19-tema-demo"
    assert (session_env / "data" / "sessions" / sid / "session.json").is_file()

    commit_session(sid, posicion=0.42, forces=["A", "E"])
    session = json.loads((session_env / "data" / "sessions" / sid / "session.json").read_text(encoding="utf-8"))
    assert session["status"] == "committed"
    assert session["posicion_linea"] == 0.42
    assert session["engines_active"]["forces"] == ["engine-model-A", "engine-model-E"]

    publish_session(sid)
    session = json.loads((session_env / "data" / "sessions" / sid / "session.json").read_text(encoding="utf-8"))
    assert session["status"] == "published"
    assert session.get("url_prensa")


def test_catalog_sync_counts_session(session_env, monkeypatch) -> None:
    monkeypatch.setattr(
        "network_engine.tablero.session.session_id_from_semilla",
        lambda semilla, fecha=None: "2026-06-19-catalog-test",
    )
    init_session("default-tablero", "catalog test")
    commit_session("2026-06-19-catalog-test", posicion=0.5, forces=["A"])
    publish_session("2026-06-19-catalog-test")
    cat = sincronizar_catalog()
    assert len(cat["sessions"]) == 1
    assert cat["sessions"][0]["id"] == "2026-06-19-catalog-test"
