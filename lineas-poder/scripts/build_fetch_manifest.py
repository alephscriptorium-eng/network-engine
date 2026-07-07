#!/usr/bin/env python3
"""Build fetch-priority manifest for lineas-poder with wave A/B/C prioritization."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
ESPANA_ROOT = ROOT / "espana"
WP_HISTORIA_ROOT = ESPANA_ROOT / "wp" / "historia"
MANIFEST_PATH = WP_HISTORIA_ROOT / "manifest.json"
NODOS_DIR = ESPANA_ROOT / "nodos"
CACHE_DIR = WP_HISTORIA_ROOT / "cache"
SNAPSHOTS_DIR = CACHE_DIR / "snapshots"


def cached(oldid: int | None) -> bool:
    """Check if oldid has wikitext cached."""
    if not oldid:
        return False
    return (SNAPSHOTS_DIR / f"{oldid}.wikitext").exists()


def load_nodos() -> list[dict]:
    """Load all nodo meta.json files."""
    nodos = []
    for nodo_dir in sorted(NODOS_DIR.glob("P*")):
        if not nodo_dir.is_dir():
            continue
        meta_path = nodo_dir / "meta.json"
        if meta_path.exists():
            nodo = json.loads(meta_path.read_text(encoding="utf-8"))
            nodos.append(nodo)
    return nodos


def parse_timestamp(ts: str) -> datetime | None:
    """Parse timestamp from manifest (format: '20:30 24 jun 2026')."""
    months = {
        "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
        "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12
    }
    try:
        parts = ts.split()
        if len(parts) != 4:
            return None
        time_part, day, month_str, year = parts
        day = int(day)
        month = months.get(month_str.lower())
        year = int(year)
        if not month:
            return None
        return datetime(year, month, day)
    except (ValueError, AttributeError):
        return None


def build_wave_a(registros: list[dict]) -> list[dict]:
    """Build Wave A: distributed sample across Wikipedia timeline (one per nodo).
    
    Since nodo años are historical periods (450-1978), not Wikipedia edit years,
    we take a distributed sample of non-milestone registros across the entire
    Wikipedia timeline to ensure coverage of different editing phases.
    """
    nodos = load_nodos()
    
    # Get non-milestone registros with valid timestamps, sorted chronologically
    candidates = []
    for reg in registros:
        if reg.get("milestone"):
            continue  # Skip milestones (covered in Wave B)
        ts = parse_timestamp(reg.get("timestamp", ""))
        if ts and not cached(reg.get("oldid")):
            candidates.append((ts, reg))
    
    if not candidates:
        return []
    
    candidates.sort(key=lambda x: x[0])  # Sort by timestamp
    
    # Take distributed sample: one per nodo (24 total)
    wave_a = []
    n_nodos = len(nodos)
    
    if len(candidates) >= n_nodos:
        step = len(candidates) // n_nodos
        for i in range(n_nodos):
            idx = i * step
            if idx < len(candidates):
                ts, reg = candidates[idx]
                nodo = nodos[i]
                wave_a.append({
                    "oldid": reg["oldid"],
                    "wave": "A",
                    "tier": "nodo-anchor",
                    "note": f"ancla {nodo['id']} (WP {ts.year})",
                    "nodo_id": nodo["id"],
                })
    else:
        # Fewer candidates than nodos, take all
        for i, (ts, reg) in enumerate(candidates):
            if i < n_nodos:
                nodo = nodos[i]
                wave_a.append({
                    "oldid": reg["oldid"],
                    "wave": "A",
                    "tier": "nodo-anchor",
                    "note": f"ancla {nodo['id']} (WP {ts.year})",
                    "nodo_id": nodo["id"],
                })
    
    return wave_a


def build_wave_b(registros: list[dict]) -> list[dict]:
    """Build Wave B: milestones sin wikitext cacheado."""
    wave_b = []
    
    for reg in registros:
        if not reg.get("milestone"):
            continue
        oldid = reg.get("oldid")
        if cached(oldid):
            continue
        
        wave_b.append({
            "oldid": oldid,
            "wave": "B",
            "tier": "milestone",
            "note": f"{reg.get('id', '')} milestone",
            "summary": reg.get("summary", "")[:80],
        })
    
    return wave_b


def build_wave_c(registros: list[dict], sample_per_parte: int = 5) -> list[dict]:
    """Build Wave C: muestreo por parte I-IV."""
    # Load partes from espana/manifest.json
    espana_manifest_path = ESPANA_ROOT / "manifest.json"
    if not espana_manifest_path.exists():
        return []
    
    espana_manifest = json.loads(espana_manifest_path.read_text(encoding="utf-8"))
    partes = espana_manifest.get("meta", {}).get("partes", [])
    
    wave_c = []
    
    for parte in partes:
        parte_id = parte["id"]
        año_ini = parte["año_ini"]
        año_fin = parte["año_fin"]
        
        # Find registros in this parte's time range
        parte_regs = []
        for reg in registros:
            if reg.get("milestone"):
                continue  # Skip milestones (already in wave B)
            ts = parse_timestamp(reg.get("timestamp", ""))
            if not ts:
                continue
            if año_fin and año_ini <= ts.year <= año_fin:
                parte_regs.append(reg)
            elif año_fin is None and ts.year >= año_ini:
                parte_regs.append(reg)
        
        # Sample evenly
        if len(parte_regs) > sample_per_parte:
            step = len(parte_regs) // sample_per_parte
            sampled = [parte_regs[i * step] for i in range(sample_per_parte)]
        else:
            sampled = parte_regs
        
        for reg in sampled:
            oldid = reg.get("oldid")
            if cached(oldid):
                continue
            
            wave_c.append({
                "oldid": oldid,
                "wave": "C",
                "tier": f"parte-{parte_id}",
                "note": f"sample parte {parte_id} · {reg.get('id', '')}",
            })
    
    return wave_c


def build_manifest(viaje_id: str) -> tuple[list[dict], dict]:
    """Build complete fetch manifest with waves A/B/C."""
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Manifest not found: {MANIFEST_PATH}")
    
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    registros = manifest.get("registros", [])
    
    wave_a = build_wave_a(registros)
    wave_b = build_wave_b(registros)
    wave_c = build_wave_c(registros, sample_per_parte=5)
    
    entries = wave_a + wave_b + wave_c
    
    counts = {
        "total": len(entries),
        "A": len(wave_a),
        "B": len(wave_b),
        "C": len(wave_c),
    }
    
    return entries, counts


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build fetch-priority manifest for lineas-poder"
    )
    parser.add_argument(
        "--viaje-id",
        default="poder-viaje1",
        help="Viaje ID for manifest filename",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print summary without writing files",
    )
    args = parser.parse_args()
    
    entries, counts = build_manifest(args.viaje_id)
    
    summary = {
        "viaje_id": args.viaje_id,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total": counts["total"],
        "wave_A": counts["A"],
        "wave_B": counts["B"],
        "wave_C": counts["C"],
    }
    
    if args.dry_run:
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        return
    
    # Write manifest
    output_path = SCRIPTS / f"fetch-priority-{args.viaje_id}.json"
    output_path.write_text(
        json.dumps(entries, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )
    
    summary["output"] = str(output_path.relative_to(ROOT))
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
