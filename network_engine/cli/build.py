# SPDX-License-Identifier: GPL-3.0-or-later
"""CLI: nengine build — genera public/prensa, public/foss y public/index.html."""

from __future__ import annotations

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
)
from network_engine.site.brand import brand_context
from network_engine.site.foss_context import foss_context
from network_engine.site.prensa_context import corpus_detail, engine_detail, prensa_context


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


def _copiar_assets(subdir: str, dest: Path) -> None:
    src = SITE_DIR / "assets" / subdir
    if src.exists():
        shutil.copytree(src, dest / "assets", dirs_exist_ok=True)


def _leer_asentamiento() -> str:
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


def build_prensa() -> None:
    catalog = cargar_catalog()
    env = _jinja_env("prensa")
    PUBLIC_PRENSA.mkdir(parents=True, exist_ok=True)
    _copiar_assets("prensa", PUBLIC_PRENSA)
    _copiar_assets("shared", PUBLIC_PRENSA)

    ctx_root = {
        "version": __version__,
        "catalog": catalog,
        "github_blob": github_blob,
        **prensa_context(),
        **brand_context(),
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
        "loadout_id": "default-tablero",
        "asentamiento": _leer_asentamiento(),
    }
    (equipamiento_dir / "index.html").write_text(
        env.get_template("equipamiento/index.html").render(**ctx_eq),
        encoding="utf-8",
    )

    engines_dir = PUBLIC_PRENSA / "engines"
    engines_dir.mkdir(exist_ok=True)
    ctx_eng_idx = {**ctx_root, **_href_context("../", "prensa")}
    (engines_dir / "index.html").write_text(
        env.get_template("engines/index.html").render(**ctx_eng_idx),
        encoding="utf-8",
    )
    for eng in catalog.get("engines", []):
        engine = engine_detail(eng["id"])
        if not engine:
            continue
        ctx_ficha = {**ctx_eng_idx, "engine": engine}
        (engines_dir / f"{eng['id']}.html").write_text(
            env.get_template("engines/ficha.html").render(**ctx_ficha),
            encoding="utf-8",
        )

    corpus_dir = PUBLIC_PRENSA / "corpus"
    corpus_dir.mkdir(exist_ok=True)
    ctx_corpus_idx = {**ctx_root, **_href_context("../", "prensa")}
    (corpus_dir / "index.html").write_text(
        env.get_template("corpus/index.html").render(**ctx_corpus_idx),
        encoding="utf-8",
    )
    for c in catalog.get("corpus", []):
        corpus = corpus_detail(c["id"])
        if not corpus:
            continue
        ctx_corpus = {**ctx_corpus_idx, "corpus": corpus}
        (corpus_dir / f"{c['id']}.html").write_text(
            env.get_template("corpus/ficha.html").render(**ctx_corpus),
            encoding="utf-8",
        )

    tablero_dir = PUBLIC_PRENSA / "tablero"
    tablero_dir.mkdir(exist_ok=True)
    ctx_tablero = {**ctx_root, **_href_context("../", "prensa")}
    (tablero_dir / "index.html").write_text(
        env.get_template("tablero/index.html").render(**ctx_tablero),
        encoding="utf-8",
    )


def build_foss() -> None:
    catalog = cargar_catalog()
    env = _jinja_env("foss")
    PUBLIC_FOSS.mkdir(parents=True, exist_ok=True)
    _copiar_assets("foss", PUBLIC_FOSS)

    ctx_base = {
        "version": __version__,
        "catalog": catalog,
        "brand": brand_context().get("brand_name", "Network Engine"),
        "license_text": LICENSE.read_text(encoding="utf-8") if LICENSE.exists() else "",
        "github_blob": github_blob,
        **foss_context(),
    }

    llms_src = PROJECT_ROOT / "llms.md"
    if llms_src.exists():
        shutil.copy(llms_src, PUBLIC_FOSS / "llms.md")

    for page in (
        "index.html",
        "tecnico.html",
        "funcional.html",
        "datos-publicados.html",
        "devops.html",
        "LICENSE.html",
    ):
        (PUBLIC_FOSS / page).write_text(
            env.get_template(page).render(**ctx_base),
            encoding="utf-8",
        )


def build_root() -> None:
    env = _jinja_env("root")
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    _copiar_assets("root", PUBLIC_DIR)
    _copiar_assets("shared", PUBLIC_DIR)
    ctx = {
        "version": __version__,
        **brand_context(),
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
