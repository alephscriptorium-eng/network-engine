# SPDX-License-Identifier: GPL-3.0-or-later
"""Contexto Jinja para plantillas prensa."""

from __future__ import annotations

from typing import Any

from network_engine.catalog.sync import cargar_catalog, github_blob
from network_engine.paths import ENGINES_DIR, PROJECT_ROOT


def engine_detail(engine_id: str) -> dict[str, Any] | None:
    catalog = cargar_catalog()
    for eng in catalog.get("engines", []):
        if eng["id"] == engine_id:
            engine_json = ENGINES_DIR / engine_id / "engine.json"
            detail = dict(eng)
            if engine_json.exists():
                import json

                with open(engine_json, encoding="utf-8") as f:
                    detail["engine_json"] = json.load(f)
                detail["anchor_github"] = github_blob(
                    f"engines/{engine_id}/{detail['engine_json'].get('anchor_scene', '')}/output.md"
                ) if detail.get("engine_json", {}).get("anchor_scene") else None
            return detail
    return None


def corpus_detail(corpus_id: str) -> dict[str, Any] | None:
    catalog = cargar_catalog()
    for c in catalog.get("corpus", []):
        if c["id"] == corpus_id:
            detail = dict(c)
            manifest_path = PROJECT_ROOT / corpus_id / "manifest.json"
            if manifest_path.exists():
                import json

                with open(manifest_path, encoding="utf-8") as f:
                    manifest = json.load(f)
                if isinstance(manifest, list):
                    detail["scenes"] = manifest[:50]
                    detail["scenes_truncated"] = len(manifest) > 50
                else:
                    registros = manifest.get("registros") or manifest.get("scenes") or []
                    if corpus_id == "linea-aleph":
                        detail["milestones"] = [
                            r for r in registros if r.get("milestone")
                        ][:20]
                    else:
                        detail["scenes"] = registros[:50]
                        detail["scenes_truncated"] = len(registros) > 50
            return detail
    return None


def prensa_context() -> dict[str, Any]:
    catalog = cargar_catalog()
    return {
        "catalog": catalog,
        "github_blob": github_blob,
        "engines": catalog.get("engines", []),
        "corpus": catalog.get("corpus", []),
    }
