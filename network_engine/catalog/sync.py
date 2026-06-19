# SPDX-License-Identifier: GPL-3.0-or-later
"""Sincronización de data/catalog.json desde manifests in situ."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from network_engine.paths import (
    CATALOG_PATH,
    CORPUS_DIRS,
    ENGINES_DIR,
    GITHUB_REPO,
    PROJECT_ROOT,
    PUBLIC_PRENSA_DOWNLOADS,
    SESSIONS_DIR,
)

GITHUB_BRANCH = "main"


def github_blob(path: str) -> str:
    return f"{GITHUB_REPO}/blob/{GITHUB_BRANCH}/{path}"


def _read_json(path: Path) -> Any:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _scene_count(manifest: list | dict) -> int:
    if isinstance(manifest, list):
        return len(manifest)
    if isinstance(manifest, dict):
        scenes = manifest.get("scenes") or manifest.get("registros") or []
        return len(scenes)
    return 0


def _milestone_count(manifest: list | dict) -> int:
    if isinstance(manifest, list):
        return sum(1 for s in manifest if s.get("milestone"))
    if isinstance(manifest, dict):
        registros = manifest.get("registros") or manifest.get("scenes") or []
        return sum(1 for r in registros if r.get("milestone"))
    return 0


def _sync_engines() -> list[dict[str, Any]]:
    registry_path = ENGINES_DIR / "manifest.json"
    if not registry_path.exists():
        return []
    registry = _read_json(registry_path)
    engines: list[dict[str, Any]] = []
    for eng in registry.get("engines", []):
        eng_id = eng["id"]
        rel_path = f"engines/{eng.get('path', eng_id + '/').rstrip('/')}"
        engine_json_rel = f"{rel_path}/engine.json"
        engines.append(
            {
                "id": eng_id,
                "path": rel_path,
                "role": eng.get("role"),
                "cohen_type": eng.get("cohen_type"),
                "anchor_scene": eng.get("anchor_scene"),
                "scene_count": eng.get("scene_count"),
                "status": eng.get("status"),
                "github": github_blob(engine_json_rel),
                "manifest_github": github_blob(f"{rel_path}/manifest.json"),
                "indice_github": github_blob(f"{rel_path}/INDICE.md"),
            }
        )
    return engines


def _sync_corpus() -> list[dict[str, Any]]:
    corpus: list[dict[str, Any]] = []
    for corpus_id, corpus_dir in CORPUS_DIRS.items():
        manifest_path = corpus_dir / "manifest.json"
        if not manifest_path.exists():
            continue
        manifest = _read_json(manifest_path)
        rel_path = corpus_id
        entry: dict[str, Any] = {
            "id": corpus_id,
            "path": rel_path,
            "scene_count": _scene_count(manifest),
            "github": github_blob(f"{rel_path}/manifest.json"),
            "indice_github": github_blob(f"{rel_path}/INDICE.md"),
        }
        if corpus_id == "linea-aleph":
            entry["record_count"] = entry["scene_count"]
            entry["milestone_count"] = _milestone_count(manifest)
            entry["note"] = "Índice por milestones; no renderizar todos los registros en prensa"
        corpus.append(entry)
    return corpus


def _sync_sessions() -> list[dict[str, Any]]:
    if not SESSIONS_DIR.exists():
        return []
    sessions: list[dict[str, Any]] = []
    for child in sorted(SESSIONS_DIR.iterdir()):
        session_path = child / "session.json"
        if not child.is_dir() or not session_path.exists():
            continue
        meta = _read_json(session_path)
        entry: dict[str, Any] = {
            "id": child.name,
            "path": f"data/sessions/{child.name}",
            "title": meta.get("title", child.name),
            "semilla": meta.get("semilla"),
            "loadout_id": meta.get("loadout_id"),
            "status": meta.get("status"),
            "posicion_linea": meta.get("posicion_linea"),
            "github": github_blob(f"data/sessions/{child.name}/session.json"),
        }
        if meta.get("engines_active"):
            entry["forces"] = meta["engines_active"].get("forces", [])
        if meta.get("url_prensa"):
            entry["url_prensa"] = meta["url_prensa"]
        sessions.append(entry)
    return sessions


def sincronizar_catalog() -> dict[str, Any]:
    catalog = {
        "version": "0.1.0",
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "engines": _sync_engines(),
        "corpus": _sync_corpus(),
        "sessions": _sync_sessions(),
    }
    CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return catalog


def cargar_catalog() -> dict[str, Any]:
    if not CATALOG_PATH.exists():
        return sincronizar_catalog()
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)
