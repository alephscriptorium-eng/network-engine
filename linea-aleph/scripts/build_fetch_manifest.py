#!/usr/bin/env python3
"""Build fetch-priority manifest from milestones, Wave A anchors, ontology seeds."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "cache" / "snapshots"
SCRIPTS = Path(__file__).resolve().parent
VIAJES = ROOT / "cache" / "viajes"
DEFAULT_OUTPUT = SCRIPTS / "fetch-priority-block10-offline.json"

DEFAULT_WAVE_A_OLDIDS: dict[int, str] = {
    12192384: "parent r0192 pre-sección paranormal",
    12193056: "r0191 nacimiento ¿Ciencia paranormal…?",
    12192374: "ontology seed cadena paranormal",
    12193126: "ontology seed evolución título sección",
    12193072: "ontology seed evolución título sección",
    12295751: "parent r0129 pre-Matrix (+2874 B diff)",
    12322903: "r0114 edición sección paranormal",
    12321880: "r0126 edición sección paranormal",
    12323708: "r0108 edición sección paranormal",
    12348878: "r0062 edición sección paranormal",
    12349141: "r0059 edición sección paranormal",
    12352611: "r0047 edición sección paranormal",
    12355642: "r0038 Feyerabend puente oct→nov",
}

DEM_TITLE = "Problema de la demarcación"
PSEUDO_TITLE = "Pseudociencia"


def cached(oldid: int) -> bool:
    return (CACHE / f"{oldid}.wikitext").exists()


def load_wave_a(path: Path | None) -> dict[int, str]:
    if path is None:
        return dict(DEFAULT_WAVE_A_OLDIDS)
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        return {int(k): str(v) for k, v in data.items()}
    if isinstance(data, list):
        out: dict[int, str] = {}
        for item in data:
            oid = int(item["oldid"])
            out[oid] = item.get("note", "")
        return out
    raise ValueError(f"Unsupported wave-a JSON shape in {path}")


def registro_lookup(manifest_path: Path) -> dict[int, dict]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    return {r["oldid"]: r for r in manifest.get("registros", []) if r.get("oldid")}


def collect_milestones(
    manifest_path: Path,
    tier: str,
    title: str,
    by_oldid: dict[int, dict],
    wave_a_oldids: dict[int, str],
) -> None:
    dem_regs = registro_lookup(manifest_path)
    for oldid, reg in dem_regs.items():
        if not reg.get("milestone") or cached(oldid):
            continue
        rid = reg.get("id", "")
        section = reg.get("section", "")
        note = f"{rid} {section}".strip()
        wave = "A" if oldid in wave_a_oldids else "B"
        if oldid in by_oldid:
            existing = by_oldid[oldid]
            if wave == "A" or existing["wave"] != "A":
                existing["wave"] = wave
            continue
        by_oldid[oldid] = {
            "oldid": oldid,
            "title": title,
            "tier": tier,
            "wave": wave,
            "note": note,
            "fetch_method": "api",
        }


def collect_wave_a(
    by_oldid: dict[int, dict],
    dem_regs: dict[int, dict],
    wave_a_oldids: dict[int, str],
) -> None:
    for oldid, note in wave_a_oldids.items():
        if cached(oldid):
            continue
        reg = dem_regs.get(oldid, {})
        section = reg.get("section", "")
        full_note = note
        if section and section not in note:
            full_note = f"{note} · {section}"
        entry = {
            "oldid": oldid,
            "title": DEM_TITLE,
            "tier": "demarcacion",
            "wave": "A",
            "note": full_note,
            "fetch_method": "api",
        }
        if oldid in by_oldid:
            by_oldid[oldid].update(entry)
        else:
            by_oldid[oldid] = entry


def collect_ontology_seeds(by_oldid: dict[int, dict]) -> None:
    seeds_path = ROOT / "ontology-seeds.json"
    if not seeds_path.exists():
        return
    seeds = json.loads(seeds_path.read_text(encoding="utf-8"))
    for section in seeds.get("sections", []):
        section_name = section.get("section", "")
        for oldid in section.get("sample_oldids", []):
            if cached(oldid):
                continue
            if oldid in by_oldid:
                if by_oldid[oldid]["wave"] in ("A", "B"):
                    continue
                by_oldid[oldid]["wave"] = "C"
                continue
            by_oldid[oldid] = {
                "oldid": oldid,
                "title": DEM_TITLE,
                "tier": "demarcacion",
                "wave": "C",
                "note": f"ontology seed · {section_name}",
                "fetch_method": "api",
            }


def sort_key(entry: dict) -> tuple:
    wave_order = {"A": 0, "B": 1, "C": 2}
    tier_order = {"demarcacion": 0, "pseudociencia": 1}
    return (
        wave_order.get(entry["wave"], 9),
        tier_order.get(entry["tier"], 9),
        -entry["oldid"],
    )


def build_manifest(wave_a_oldids: dict[int, str]) -> list[dict]:
    by_oldid: dict[int, dict] = {}
    dem_regs = registro_lookup(ROOT / "manifest.json")

    collect_wave_a(by_oldid, dem_regs, wave_a_oldids)
    collect_milestones(ROOT / "manifest.json", "demarcacion", DEM_TITLE, by_oldid, wave_a_oldids)
    collect_milestones(
        ROOT / "pseudociencia" / "manifest.json", "pseudociencia", PSEUDO_TITLE, by_oldid, wave_a_oldids
    )
    collect_ontology_seeds(by_oldid)

    return sorted(by_oldid.values(), key=sort_key)


def write_viaje_template(viaje_id: str, manifest_path: Path, wave_counts: dict[str, int]) -> Path:
    """Write a post-audit viaje JSON skeleton under cache/viajes/."""
    VIAJES.mkdir(parents=True, exist_ok=True)
    date_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out = VIAJES / f"{date_prefix}-{viaje_id}.json"
    template = {
        "viaje_id": f"{date_prefix}-{viaje_id}",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "anchors": [],
        "waves": [w for w in ("A", "B", "C") if wave_counts.get(w, 0) > 0],
        "wave_results": {w: {"fetched": 0, "skipped": 0, "failed": 0} for w in ("A", "B", "C")},
        "fetched": [],
        "skipped": [],
        "failed": [],
        "offline_ready": False,
        "audit_snapshot": f"cache/audit-{viaje_id}.json",
        "priority_manifest": str(manifest_path.relative_to(ROOT)),
        "notes": "Template — fill after fetch_batch waves + audit_cache.py",
    }
    out.write_text(json.dumps(template, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print counts without writing output file",
    )
    parser.add_argument(
        "--viaje-id",
        default="",
        help="Viaje id for output filename fetch-priority-{viaje-id}.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Override output path (default: fetch-priority-{viaje-id}.json or block10 default)",
    )
    parser.add_argument(
        "--wave-a-file",
        type=Path,
        default=None,
        help="External JSON for Wave A oldids (dict oldid→note or list of {oldid, note})",
    )
    parser.add_argument(
        "--write-viaje-template",
        action="store_true",
        help="Also write cache/viajes/{fecha}-{viaje-id}.json template",
    )
    args = parser.parse_args()

    wave_a = load_wave_a(args.wave_a_file)
    entries = build_manifest(wave_a)
    counts = {"total": len(entries), "A": 0, "B": 0, "C": 0}
    for e in entries:
        counts[e["wave"]] = counts.get(e["wave"], 0) + 1

    if args.output:
        output = args.output
        if not output.is_absolute():
            output = SCRIPTS / output
    elif args.viaje_id:
        output = SCRIPTS / f"fetch-priority-{args.viaje_id}.json"
    else:
        output = DEFAULT_OUTPUT

    summary = {
        "output": str(output),
        "viaje_id": args.viaje_id or None,
        "wave_a_source": str(args.wave_a_file) if args.wave_a_file else "defaults",
        "total": counts["total"],
        "wave_A": counts["A"],
        "wave_B": counts["B"],
        "wave_C": counts["C"],
        "cached_skipped": "entries only include uncached oldids",
    }

    if args.dry_run:
        print(json.dumps(summary, indent=2))
        return

    output.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if args.write_viaje_template and args.viaje_id:
        viaje_path = write_viaje_template(args.viaje_id, output, counts)
        summary["viaje_template"] = str(viaje_path)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
