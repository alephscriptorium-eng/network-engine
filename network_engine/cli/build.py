# SPDX-License-Identifier: GPL-3.0-or-later
"""CLI: nengine build — genera public/prensa, public/foss y public/index.html."""

from __future__ import annotations

import re
import shutil
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from network_engine import __version__
from network_engine.catalog.sync import cargar_catalog, github_blob, sincronizar_catalog
from network_engine.paths import (
    LICENSE,
    PROJECT_ROOT,
    PUBLIC_DIR,
    PUBLIC_FOSS,
    PUBLIC_PRENSA,
    SITE_DIR,
    SITE_URL,
)
from network_engine.site.assets_optimize import optimizar_logos
from network_engine.site.brand import brand_context
from network_engine.site.foss_context import foss_context
from network_engine.site.prensa_context import corpus_detail, engine_detail, engines_index, prensa_context
from network_engine.site.prensa_copy import prensa_copy

FOSS_PAGES: dict[str, str] = {
    "index.html": "index",
    "tecnico.html": "tecnico",
    "funcional.html": "funcional",
    "datos-publicados.html": "datos-publicados",
    "devops.html": "devops",
    "LICENSE.html": "license",
}


def _jinja_env(subdir: str) -> Environment:
    return Environment(
        loader=FileSystemLoader([
            str(SITE_DIR / "templates" / subdir),
            str(SITE_DIR / "templates" / "_partials"),
        ]),
        autoescape=select_autoescape(["html", "xml"]),
    )


def _href_context(base_href: str, section: str) -> dict[str, str | bool]:
    if section == "root":
        return {
            "base_href": "",
            "portal_href": "index.html",
            "prensa_href": "prensa/index.html",
            "foss_href": "foss/index.html",
            "show_inicio": False,
        }
    if base_href == "":
        return {
            "base_href": "",
            "portal_href": "../index.html",
            "prensa_href": "index.html",
            "foss_href": "../foss/index.html",
            "show_inicio": True,
        }
    return {
        "base_href": base_href,
        "portal_href": "../../index.html",
        "prensa_href": "../index.html",
        "foss_href": "../../foss/index.html",
        "show_inicio": True,
    }


def _copiar_assets(portal: str, dest: Path) -> None:
    src = SITE_DIR / "assets" / portal
    if not src.exists():
        return
    assets_dest = dest / "assets"
    assets_dest.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        if item.name in ("theme.js",) or item.name.endswith(".png"):
            continue
        if item.is_file():
            shutil.copy2(item, assets_dest / item.name)


def _copiar_shared(dest: Path) -> None:
    """Copia theme.js y components.css; logos vía optimizar_logos."""
    shared = SITE_DIR / "assets" / "shared"
    if not shared.exists():
        return
    assets_dir = dest / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    for name in ("theme.js", "components.css"):
        src = shared / name
        if src.is_file():
            shutil.copy2(src, assets_dir / name)
    optimizar_logos(assets_dir)


def _desplegar_assets_portal(portal: str, dest: Path) -> None:
    _copiar_assets(portal, dest)
    _copiar_shared(dest)


def _site_meta(canonical_path: str, page_title: str, description: str) -> dict[str, str]:
    path = canonical_path if canonical_path.startswith("/") else f"/{canonical_path}"
    return {
        "site_url": SITE_URL,
        "canonical_path": path.lstrip("/"),
        "canonical_url": f"{SITE_URL}{path}",
        "page_title": page_title,
        "meta_description": description,
    }


def _cuerpo_asentamiento() -> str:
    path = (
        PROJECT_ROOT
        / "logs-skill/sesion-04-skill-modo-aleph/01-autorevisor-tablero-skill/asentamiento.md"
    )
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8")
    if text.startswith("---"):
        end = text.find("---", 3)
        if end != -1:
            return text[end + 3 :].strip()
    return text.strip()


def _leer_asentamiento_filas() -> list[tuple[str, str]]:
    """Parsea bloque ASENTAMIENTO (markdown **clave:** valor) en filas etiqueta/valor."""
    text = _cuerpo_asentamiento()
    if not text:
        return []
    rows: list[tuple[str, str]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        for segment in line.split("|"):
            segment = segment.strip()
            match = re.match(r"\*\*(.+?):\*\*\s*(.+)", segment)
            if match:
                rows.append((match.group(1).strip(), match.group(2).strip()))
            elif segment:
                rows.append(("", segment))
    return rows


def build_prensa() -> None:
    catalog = cargar_catalog()
    env = _jinja_env("prensa")
    PUBLIC_PRENSA.mkdir(parents=True, exist_ok=True)
    _desplegar_assets_portal("prensa", PUBLIC_PRENSA)

    brand = brand_context()
    ctx_root = {
        "version": __version__,
        "catalog": catalog,
        "github_blob": github_blob,
        "nav_active": "catalog",
        **_site_meta(
            "prensa/index.html",
            f"{brand['brand_name']} — Centro de datos",
            f"{brand['brand']['producto']['etiqueta']}. Catálogo corpus, engines y tablero Aleph.",
        ),
        **prensa_context(),
        **prensa_copy(),
        **brand,
        **_href_context("", "prensa"),
    }

    (PUBLIC_PRENSA / "index.html").write_text(
        env.get_template("index.html").render(**ctx_root),
        encoding="utf-8",
    )

    equipamiento_dir = PUBLIC_PRENSA / "equipamiento"
    equipamiento_dir.mkdir(exist_ok=True)
    ctx_eq = {
        **ctx_root,
        **_href_context("../", "prensa"),
        "nav_active": "equipamiento",
        **_site_meta(
            "prensa/equipamiento/index.html",
            f"Equipamiento — {brand['brand_name']}",
            "Showcase equipamiento rude-bot — bot crudo, loadout instantáneo y ASENTAMIENTO.",
        ),
        "loadout_id": "default-tablero",
        "asentamiento_filas": _leer_asentamiento_filas(),
    }
    (equipamiento_dir / "index.html").write_text(
        env.get_template("equipamiento/index.html").render(**ctx_eq),
        encoding="utf-8",
    )

    engines_dir = PUBLIC_PRENSA / "engines"
    engines_dir.mkdir(exist_ok=True)
    ctx_eng_idx = {
        **ctx_root,
        **_href_context("../", "prensa"),
        "nav_active": "engines",
        "engines_index": engines_index(),
        **_site_meta(
            "prensa/engines/index.html",
            f"Fuerzas Cohen — {brand['brand_name']}",
            "Panel de fuerzas Cohen y main-engine del tablero Aleph.",
        ),
    }
    (engines_dir / "index.html").write_text(
        env.get_template("engines/index.html").render(**ctx_eng_idx),
        encoding="utf-8",
    )
    for eng in catalog.get("engines", []):
        engine = engine_detail(eng["id"])
        if not engine:
            continue
        ctx_ficha = {
            **ctx_eng_idx,
            "engine": engine,
            **_site_meta(
                f"prensa/engines/{eng['id']}.html",
                f"{eng['id']} — {brand['brand_name']}",
                engine.get("nombre", brand["brand"]["producto"]["etiqueta"]),
            ),
        }
        (engines_dir / f"{eng['id']}.html").write_text(
            env.get_template("engines/ficha.html").render(**ctx_ficha),
            encoding="utf-8",
        )

    corpus_dir = PUBLIC_PRENSA / "corpus"
    corpus_dir.mkdir(exist_ok=True)
    ctx_corpus_idx = {
        **ctx_root,
        **_href_context("../", "prensa"),
        "nav_active": "corpus",
        **_site_meta(
            "prensa/corpus/index.html",
            f"Corpus — {brand['brand_name']}",
            "Corpus in situ: logs-aleph, sima, cima, línea y logs-skill.",
        ),
    }
    (corpus_dir / "index.html").write_text(
        env.get_template("corpus/index.html").render(**ctx_corpus_idx),
        encoding="utf-8",
    )
    for c in catalog.get("corpus", []):
        corpus = corpus_detail(c["id"])
        if not corpus:
            continue
        ctx_corpus = {
            **ctx_corpus_idx,
            "corpus": corpus,
            **_site_meta(
                f"prensa/corpus/{c['id']}.html",
                f"{c['id']} — {brand['brand_name']}",
                corpus.get("nombre", brand["brand"]["producto"]["etiqueta"]),
            ),
        }
        (corpus_dir / f"{c['id']}.html").write_text(
            env.get_template("corpus/ficha.html").render(**ctx_corpus),
            encoding="utf-8",
        )

    tablero_dir = PUBLIC_PRENSA / "tablero"
    tablero_dir.mkdir(exist_ok=True)
    ctx_tablero = {
        **ctx_root,
        **_href_context("../", "prensa"),
        "nav_active": "tablero",
        **_site_meta(
            "prensa/tablero/index.html",
            f"Tablero — {brand['brand_name']}",
            "Reglas del tablero Aleph: flujo del turno, cotas y AutoRevisor.",
        ),
    }
    (tablero_dir / "index.html").write_text(
        env.get_template("tablero/index.html").render(**ctx_tablero),
        encoding="utf-8",
    )


def build_foss() -> None:
    catalog = cargar_catalog()
    env = _jinja_env("foss")
    PUBLIC_FOSS.mkdir(parents=True, exist_ok=True)
    _desplegar_assets_portal("foss", PUBLIC_FOSS)

    brand = brand_context()
    ctx_common = {
        "version": __version__,
        "catalog": catalog,
        "license_text": LICENSE.read_text(encoding="utf-8") if LICENSE.exists() else "",
        "github_blob": github_blob,
        "base_href": "",
        **brand,
        **foss_context(),
    }

    llms_src = PROJECT_ROOT / "llms.md"
    if llms_src.exists():
        shutil.copy(llms_src, PUBLIC_FOSS / "llms.md")

    foss_meta_defaults = _site_meta(
        "foss/index.html",
        f"{brand['brand_name']} — Artefacto",
        f"Documentación FOSS (GPL-3.0) del artefacto {brand['brand_name']}: CLI, schemas y publicación.",
    )

    page_meta: dict[str, dict[str, str]] = {
        "index.html": foss_meta_defaults,
        "tecnico.html": _site_meta(
            "foss/tecnico.html",
            f"Técnico — {brand['brand_name']}",
            "Módulos Python, corpus in situ y esquemas JSON del Network Engine.",
        ),
        "funcional.html": _site_meta(
            "foss/funcional.html",
            f"Funcional — {brand['brand_name']}",
            "Flujo loadout, turno tablero, persistencia y operación funcional.",
        ),
        "datos-publicados.html": _site_meta(
            "foss/datos-publicados.html",
            f"Datos publicados — {brand['brand_name']}",
            "Catálogo, corpus in situ y sesiones publicadas en prensa.",
        ),
        "devops.html": _site_meta(
            "foss/devops.html",
            f"DevOps — {brand['brand_name']}",
            "Instalación, prompts operativos, llms.md y publicación GitHub Pages.",
        ),
        "LICENSE.html": _site_meta(
            "foss/LICENSE.html",
            f"Licencia — {brand['brand_name']}",
            "Texto completo de la licencia GPL-3.0 del artefacto Network Engine.",
        ),
    }

    for page, foss_page in FOSS_PAGES.items():
        ctx = {
            **ctx_common,
            **page_meta.get(page, foss_meta_defaults),
            "foss_page": foss_page,
        }
        (PUBLIC_FOSS / page).write_text(
            env.get_template(page).render(**ctx),
            encoding="utf-8",
        )


def build_root() -> None:
    env = _jinja_env("root")
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    _desplegar_assets_portal("root", PUBLIC_DIR)
    brand = brand_context()
    ctx = {
        "version": __version__,
        **brand,
        **_site_meta(
            "index.html",
            f"{brand['brand']['serie']['nombre']} — {brand['brand_name']}",
            (
                f"{brand['brand']['producto']['etiqueta']}. "
                f"Material transmedia para agentes del juego {brand['brand']['arg']['siglas']}."
            ),
        ),
        **_href_context("", "root"),
    }
    (PUBLIC_DIR / "index.html").write_text(
        env.get_template("index.html").render(**ctx),
        encoding="utf-8",
    )


def run_build(target: str = "all") -> None:
    sincronizar_catalog()
    if target in ("all", "prensa", "foss"):
        build_root()
        print(f"Índice raíz generado en {PUBLIC_DIR / 'index.html'}")
    if target in ("all", "prensa"):
        build_prensa()
        print(f"Prensa generada en {PUBLIC_PRENSA}")
    if target in ("all", "foss"):
        build_foss()
        print(f"FOSS generado en {PUBLIC_FOSS}")
