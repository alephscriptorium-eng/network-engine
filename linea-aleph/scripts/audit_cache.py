#!/usr/bin/env python3
"""Audit linea-aleph cache coverage for block-7."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "cache" / "snapshots"
PRIORITY = Path(__file__).resolve().parent / "fetch-priority-block7.json"


def cached(oldid: int) -> bool:
    return (CACHE / f"{oldid}.wikitext").exists()


def audit_corpus(manifest_path: Path, snap_root: Path) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    regs = manifest.get("registros", [])
    milestones = [r for r in regs if r.get("milestone")]
    ms_cached = sum(1 for r in milestones if cached(r["oldid"]))
    reg_cached = sum(1 for r in regs if r.get("oldid") and cached(r["oldid"]))

    extremos = {}
    for role in ("previo", "inicial", "final", "sc_cierre", "actual"):
        meta_path = snap_root / role / "meta.json"
        if not meta_path.exists():
            continue
        sm = json.loads(meta_path.read_text(encoding="utf-8"))
        oid = sm.get("oldid")
        extremos[role] = {
            "oldid": oid,
            "fetched_meta": sm.get("fetched", False),
            "body_cached": cached(oid) if oid else sm.get("role") == "actual" and bool(
                list(CACHE.glob("*.wikitext"))
            ),
        }

    return {
        "registros": len(regs),
        "registros_cached": reg_cached,
        "registros_pct": round(100 * reg_cached / len(regs), 1) if regs else 0,
        "milestones": len(milestones),
        "milestones_cached": ms_cached,
        "milestones_pct": round(100 * ms_cached / len(milestones), 1) if milestones else 0,
        "extremos": extremos,
    }


def audit_priority() -> dict:
    entries = json.loads(PRIORITY.read_text(encoding="utf-8"))
    cached_list = [e for e in entries if cached(e["oldid"])]
    return {
        "total": len(entries),
        "cached": len(cached_list),
        "pct": round(100 * len(cached_list) / len(entries), 1) if entries else 0,
        "missing": [e["oldid"] for e in entries if not cached(e["oldid"])],
    }


def audit_ontology() -> dict:
    seeds_path = ROOT / "ontology-seeds.json"
    if not seeds_path.exists():
        return {"sections": 0, "cached": 0, "pct": 0}
    seeds = json.loads(seeds_path.read_text(encoding="utf-8"))
    top = seeds.get("sections", [])[:8]
    hits = []
    for s in top:
        oid = s["sample_oldids"][0]
        hits.append({"section": s["section"], "oldid": oid, "cached": cached(oid)})
    cached_n = sum(1 for h in hits if h["cached"])
    return {
        "sections": len(hits),
        "cached": cached_n,
        "pct": round(100 * cached_n / len(hits), 1) if hits else 0,
        "items": hits,
    }


def unique_extremos_count() -> dict:
    seen: set[int] = set()
    total = 0
    cached_n = 0
    for snap_root in (ROOT / "snapshots", ROOT / "pseudociencia" / "snapshots"):
        if not snap_root.exists():
            continue
        for role in ("previo", "inicial", "final", "sc_cierre"):
            meta_path = snap_root / role / "meta.json"
            if not meta_path.exists():
                continue
            oid = json.loads(meta_path.read_text(encoding="utf-8")).get("oldid")
            if oid and oid not in seen:
                seen.add(oid)
                total += 1
                if cached(oid):
                    cached_n += 1
    return {"unique": total, "cached": cached_n, "pct": round(100 * cached_n / total, 1) if total else 0}


def main() -> None:
    report = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "demarcacion": audit_corpus(ROOT / "manifest.json", ROOT / "snapshots"),
        "pseudociencia": audit_corpus(
            ROOT / "pseudociencia" / "manifest.json", ROOT / "pseudociencia" / "snapshots"
        ),
        "priority_block7": audit_priority(),
        "ontology_seeds_top8": audit_ontology(),
        "extremos_unicos": unique_extremos_count(),
        "cache_files": len(list(CACHE.glob("*.wikitext"))),
    }
    out = ROOT / "cache" / "audit-block7.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
