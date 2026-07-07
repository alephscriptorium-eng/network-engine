#!/usr/bin/env python3
"""Audit lineas-poder cache coverage for espana/wp/historia."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ESPANA_ROOT = ROOT / "espana"
WP_HISTORIA_ROOT = ESPANA_ROOT / "wp" / "historia"
MANIFEST_PATH = WP_HISTORIA_ROOT / "manifest.json"
CACHE_DIR = WP_HISTORIA_ROOT / "cache"
SNAPSHOTS_DIR = CACHE_DIR / "snapshots"


def cached(oldid: int | None) -> bool:
    """Check if oldid has wikitext cached."""
    if not oldid:
        return False
    return (SNAPSHOTS_DIR / f"{oldid}.wikitext").exists()


def audit_coverage(viaje_id: str | None = None) -> dict:
    """Audit cache coverage against manifest.json."""
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Manifest not found: {MANIFEST_PATH}")
    
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    registros = manifest.get("registros", [])
    
    # Conteo básico
    registro_count = len(registros)
    curated_registros = len([r for r in registros if r.get("files", {}).get("registro")])
    
    # Registros con milestone
    milestones = [r for r in registros if r.get("milestone")]
    milestone_count = len(milestones)
    
    # Cached wikitexts
    cached_oldids = [r["oldid"] for r in registros if cached(r.get("oldid"))]
    cached_count = len(cached_oldids)
    
    # Milestones sin cuerpo
    milestones_sin_cuerpo = [
        r["oldid"] for r in milestones 
        if not cached(r.get("oldid"))
    ]
    
    # Coverage
    coverage_pct = round(100 * cached_count / registro_count, 1) if registro_count else 0
    
    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "viaje_id": viaje_id,
        "corpus": "lineas-poder/espana/wp/historia",
        "registro_count": registro_count,
        "curated_registros": curated_registros,
        "milestone_count": milestone_count,
        "cached_wikitexts": cached_count,
        "cached_oldids": cached_oldids,
        "milestones_sin_cuerpo": milestones_sin_cuerpo,
        "milestones_sin_cuerpo_count": len(milestones_sin_cuerpo),
        "coverage_pct": coverage_pct,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audit cache coverage for lineas-poder espana/wp/historia"
    )
    parser.add_argument(
        "--viaje-id",
        help="Optional viaje ID for output filename",
    )
    args = parser.parse_args()
    
    report = audit_coverage(args.viaje_id)
    
    # Write output
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if args.viaje_id:
        out_path = CACHE_DIR / f"audit-{args.viaje_id}.json"
    else:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        out_path = CACHE_DIR / f"audit-{timestamp}.json"
    
    out_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )
    
    # Print to stdout
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
