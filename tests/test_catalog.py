# SPDX-License-Identifier: GPL-3.0-or-later
"""Tests catálogo."""

from __future__ import annotations

import json
from pathlib import Path

import jsonschema
import pytest

from network_engine.catalog.sync import cargar_catalog, sincronizar_catalog
from network_engine.paths import CATALOG_PATH, SCHEMA_DIR

ROOT = Path(__file__).resolve().parent.parent


def test_catalog_sync_produces_valid_json() -> None:
    cat = sincronizar_catalog()
    assert CATALOG_PATH.exists()
    with open(CATALOG_PATH, encoding="utf-8") as f:
        loaded = json.load(f)
    assert loaded["engines"]
    assert len(loaded["engines"]) == 7
    assert len(loaded["corpus"]) == 5


def test_catalog_schema() -> None:
    sincronizar_catalog()
    with open(SCHEMA_DIR / "catalog.schema.json", encoding="utf-8") as f:
        schema = json.load(f)
    cat = cargar_catalog()
    jsonschema.validate(cat, schema)


def test_github_blob_format() -> None:
    cat = cargar_catalog()
    eng = cat["engines"][0]
    assert "github.com/alephscriptorium-eng/network-engine/blob/main/" in eng["github"]
