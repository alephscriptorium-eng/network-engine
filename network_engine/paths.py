# SPDX-License-Identifier: GPL-3.0-or-later
"""Rutas del proyecto network-engine (raíz = BOT_ALEPH)."""

from __future__ import annotations

from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_ROOT.parent

# Corpus in situ (no mover)
ENGINES_DIR = PROJECT_ROOT / "engines"
LOGS_ALEPH_DIR = PROJECT_ROOT / "logs-aleph"
SIMA_ALEPH_DIR = PROJECT_ROOT / "sima-aleph"
CIMA_ALEPH_DIR = PROJECT_ROOT / "cima-aleph"
LINEA_ALEPH_DIR = PROJECT_ROOT / "linea-aleph"
LOGS_SKILL_DIR = PROJECT_ROOT / "logs-skill"

CORPUS_DIRS: dict[str, Path] = {
    "logs-aleph": LOGS_ALEPH_DIR,
    "sima-aleph": SIMA_ALEPH_DIR,
    "cima-aleph": CIMA_ALEPH_DIR,
    "linea-aleph": LINEA_ALEPH_DIR,
    "logs-skill": LOGS_SKILL_DIR,
}

# Contexto operativo y agentes
ALEPH_CONTEXT_DIR = PROJECT_ROOT / "aleph-context"
AGENTS_DIR = PROJECT_ROOT / "agents"
SKILLS_DIR = AGENTS_DIR / "skills"

# Datos generados (índices, loadouts, perfiles, sesiones)
DATA_DIR = PROJECT_ROOT / "data"
SCHEMA_DIR = DATA_DIR / "schema"
LOADOUTS_DIR = DATA_DIR / "loadouts"
PROFILES_DIR = DATA_DIR / "profiles"
SESSIONS_DIR = DATA_DIR / "sessions"
CATALOG_PATH = DATA_DIR / "catalog.json"

# Sitio estático
SITE_DIR = PROJECT_ROOT / "site"
PUBLIC_DIR = PROJECT_ROOT / "public"
PUBLIC_PRENSA = PUBLIC_DIR / "prensa"
PUBLIC_FOSS = PUBLIC_DIR / "foss"
PUBLIC_PRENSA_DOWNLOADS = PUBLIC_PRENSA / "downloads"

# Documentación
DOCS_DIR = PROJECT_ROOT / "docs"
PROMPTS_DIR = DOCS_DIR / "prompts"
METODOLOGIA_DIR = DOCS_DIR / "metodologia"

LICENSE = PROJECT_ROOT / "LICENSE"
LLMS_MD = PROJECT_ROOT / "llms.md"

GITHUB_REPO = "https://github.com/alephscriptorium-eng/network-engine"
GITHUB_BLOB_BASE = f"{GITHUB_REPO}/blob/main"
SITE_URL = "https://alephscriptorium-eng.github.io/network-engine"


def github_blob(path: str | Path) -> str:
    """URL blob/main para enlazar contenido largo sin duplicar en public/."""
    rel = Path(path).as_posix().lstrip("/")
    return f"{GITHUB_BLOB_BASE}/{rel}"


def loadout_path(loadout_id: str) -> Path:
    return LOADOUTS_DIR / f"{loadout_id}.json"


def posicion_linea_path() -> Path:
    return ALEPH_CONTEXT_DIR / "posicion-linea.json"


def engines_active_path() -> Path:
    return ALEPH_CONTEXT_DIR / "engines-active.json"


def hot_md_path() -> Path:
    return ALEPH_CONTEXT_DIR / "hot.md"


def session_dir(session_id: str) -> Path:
    return SESSIONS_DIR / session_id


def session_json_path(session_id: str) -> Path:
    return session_dir(session_id) / "session.json"


def session_pack_path(session_id: str) -> Path:
    return session_dir(session_id) / "pack.zip"


def loadout_pack_path(loadout_id: str) -> Path:
    return PUBLIC_PRENSA_DOWNLOADS / f"{loadout_id}.zip"
