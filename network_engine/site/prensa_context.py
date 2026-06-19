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
                        milestones: list[dict[str, Any]] = []
                        for r in registros:
                            if not r.get("milestone"):
                                continue
                            m = dict(r)
                            reg_path = (r.get("files") or {}).get("registro")
                            if reg_path:
                                m["github"] = github_blob(f"linea-aleph/{reg_path}")
                            elif r.get("slug"):
                                m["github"] = github_blob(
                                    f"linea-aleph/registros/{r['slug']}/registro.md"
                                )
                            milestones.append(m)
                            if len(milestones) >= 20:
                                break
                        detail["milestones"] = milestones
                    else:
                        detail["scenes"] = registros[:50]
                        detail["scenes_truncated"] = len(registros) > 50
            return detail
    return None


def _lore_hook(engine_id: str) -> str | None:
    engine_json = ENGINES_DIR / engine_id / "engine.json"
    if not engine_json.exists():
        return None
    import json

    with open(engine_json, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("lore_hook")


def engines_index() -> list[dict[str, Any]]:
    catalog = cargar_catalog()
    result: list[dict[str, Any]] = []
    for eng in catalog.get("engines", []):
        detail = engine_detail(eng["id"])
        if detail:
            result.append(detail)
    return result


def prensa_context() -> dict[str, Any]:
    catalog = cargar_catalog()
    engines = []
    for eng in catalog.get("engines", []):
        enriched = dict(eng)
        if not enriched.get("lore_hook"):
            hook = _lore_hook(eng["id"])
            if hook:
                enriched["lore_hook"] = hook
        engines.append(enriched)
    return {
        "catalog": catalog,
        "github_blob": github_blob,
        "engines": engines,
        "corpus": catalog.get("corpus", []),
    }
