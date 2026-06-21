#!/usr/bin/env python3
"""Build fetch-priority manifest from milestones, Wave A anchors, ontology seeds."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from cache_paths import ROOT, cached, talk_manifest_roots
from history_common import parse_iso_ts

SCRIPTS_DIR = SCRIPTS
VIAJES = ROOT / "cache" / "viajes"
TALK_VIAJES = ROOT / "cache" / "talk" / "viajes"
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
PRE_2008 = datetime(2008, 1, 1)


def load_wave_a(path: Path | None) -> dict[int, str]:
    if path is None:
        return dict(DEFAULT_WAVE_A_OLDIDS)
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "wave_a" in data:
        out: dict[int, str] = {}
        for item in data["wave_a"].get("oldids", []):
            oid = int(item["oldid"])
            note = item.get("note", "") or item.get("subwave", "")
            out[oid] = note
        return out
    if isinstance(data, dict):
        return {int(k): str(v) for k, v in data.items()}
    if isinstance(data, list):
        out = {}
        for item in data:
            oid = int(item["oldid"])
            out[oid] = item.get("note", "")
        return out
    raise ValueError(f"Unsupported wave-a JSON shape in {path}")


def load_talk_anchor_files(anchors_file: Path | None, *, probe_only: bool = False) -> list[dict]:
    anchors_dir = ROOT / "cache" / "talk" / "anchors"
    paths: list[Path] = []
    if probe_only:
        if anchors_dir.exists():
            paths = sorted(anchors_dir.glob("*.probe.json"))
    elif anchors_file:
        p = anchors_file if anchors_file.is_absolute() else ROOT / anchors_file
        if p.exists():
            paths.append(p)
        if anchors_dir.exists():
            for p in sorted(anchors_dir.glob("*.json")):
                if p.suffix == ".json" and p.name.endswith(".probe.json"):
                    continue
                if p not in paths:
                    paths.append(p)
    elif anchors_dir.exists():
        for p in sorted(anchors_dir.glob("*.json")):
            if p.name.endswith(".probe.json"):
                continue
            paths.append(p)
    return [json.loads(p.read_text(encoding="utf-8")) for p in paths]


def registro_lookup(manifest_path: Path) -> dict[int, dict]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    return {r["oldid"]: r for r in manifest.get("registros", []) if r.get("oldid")}


def collect_milestones(
    manifest_path: Path,
    tier: str,
    title: str,
    by_oldid: dict[int, dict],
    wave_a_oldids: dict[int, str],
    *,
    corpus: str = "article",
    linked_article: str | None = None,
) -> None:
    dem_regs = registro_lookup(manifest_path)
    for oldid, reg in dem_regs.items():
        if not reg.get("milestone") or cached(corpus, oldid):
            continue
        rid = reg.get("id", "")
        section = reg.get("section", "")
        note = f"{rid} {section}".strip()
        wave = "A" if oldid in wave_a_oldids else "B"
        entry = {
            "oldid": oldid,
            "title": title,
            "tier": tier,
            "wave": wave,
            "note": note,
            "fetch_method": "api",
            "corpus": corpus,
        }
        if linked_article:
            entry["linked_article"] = linked_article
        if oldid in by_oldid:
            existing = by_oldid[oldid]
            if wave == "A" or existing["wave"] != "A":
                existing["wave"] = wave
            continue
        by_oldid[oldid] = entry


def collect_wave_a(
    by_oldid: dict[int, dict],
    dem_regs: dict[int, dict],
    wave_a_oldids: dict[int, str],
    *,
    corpus: str = "article",
    default_title: str = DEM_TITLE,
    default_tier: str = "demarcacion",
    linked_article: str | None = None,
) -> None:
    for oldid, note in wave_a_oldids.items():
        if cached(corpus, oldid):
            continue
        reg = dem_regs.get(oldid, {})
        section = reg.get("section", "")
        full_note = note
        if section and section not in note:
            full_note = f"{note} · {section}"
        title = reg.get("title") or default_title
        tier = reg.get("tier") or default_tier
        entry = {
            "oldid": oldid,
            "title": title if corpus == "talk" else default_title,
            "tier": tier,
            "wave": "A",
            "note": full_note,
            "fetch_method": "api",
            "corpus": corpus,
        }
        if linked_article:
            entry["linked_article"] = linked_article
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
            if cached("article", oldid):
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
                "corpus": "article",
            }


def sort_key(entry: dict) -> tuple:
    wave_order = {"A": 0, "B": 1, "C": 2}
    tier_order = {
        "demarcacion": 0,
        "pseudociencia": 1,
        "discusion-pseudociencia": 0,
        "usuario-discusion-analiza": 1,
        "usuario-discusion-ignacio-icke": 2,
        "usuario-discusion-solvecoagula": 3,
    }
    return (
        wave_order.get(entry["wave"], 9),
        tier_order.get(entry["tier"], 9),
        -entry["oldid"],
    )


def build_article_manifest(wave_a_oldids: dict[int, str]) -> list[dict]:
    by_oldid: dict[int, dict] = {}
    dem_regs = registro_lookup(ROOT / "manifest.json")

    collect_wave_a(by_oldid, dem_regs, wave_a_oldids)
    collect_milestones(ROOT / "manifest.json", "demarcacion", DEM_TITLE, by_oldid, wave_a_oldids)
    collect_milestones(
        ROOT / "pseudociencia" / "manifest.json",
        "pseudociencia",
        PSEUDO_TITLE,
        by_oldid,
        wave_a_oldids,
    )
    collect_ontology_seeds(by_oldid)

    return sorted(by_oldid.values(), key=sort_key)


def build_talk_manifest(anchors_file: Path | None) -> list[dict]:
    by_oldid: dict[int, dict] = {}
    wave_a_notes: dict[int, str] = {}
    wave_a_titles: dict[int, str] = {}
    wave_a_tiers: dict[int, str] = {}
    wave_a_linked: dict[int, str | None] = {}

    for anchor in load_talk_anchor_files(anchors_file):
        vista = anchor.get("vista", "talk")
        title = anchor["title"]
        linked = anchor.get("linked_article")
        wave_a_items = (
            anchor.get("wave_a", {}).get("oldids", [])
            or anchor.get("wave_a_oldids", [])
        )
        for item in wave_a_items:
            oid = int(item["oldid"])
            subwave = item.get("subwave", item.get("wave", "A"))
            note = item.get("note", "") or subwave
            wave_a_notes[oid] = f"{subwave}: {note}".strip(": ")
            wave_a_titles[oid] = title
            wave_a_tiers[oid] = vista
            wave_a_linked[oid] = linked
        for item in anchor.get("wave_b", {}).get("oldids", []):
            oid = int(item["oldid"])
            if cached("talk", oid):
                continue
            if oid in by_oldid and by_oldid[oid]["wave"] == "A":
                continue
            by_oldid[oid] = {
                "oldid": oid,
                "title": title,
                "tier": vista,
                "wave": "B",
                "note": item.get("note", "wave B talk"),
                "fetch_method": "api",
                "corpus": "talk",
                **({"linked_article": linked} if linked else {}),
            }

    talk_regs: dict[int, dict] = {}
    for manifest_root in talk_manifest_roots():
        slug = manifest_root.name
        manifest = json.loads((manifest_root / "manifest.json").read_text(encoding="utf-8"))
        title = manifest.get("meta", {}).get("title", "")
        linked = manifest.get("meta", {}).get("linked_article")
        for reg in manifest.get("registros", []):
            oid = reg.get("oldid")
            if not oid:
                continue
            talk_regs[oid] = {
                **reg,
                "tier": slug,
                "title": title,
                "linked_article": linked,
            }

    collect_wave_a(
        by_oldid,
        talk_regs,
        wave_a_notes,
        corpus="talk",
        default_title="",
        default_tier="talk",
    )
    for oid, entry in list(by_oldid.items()):
        if oid in wave_a_titles:
            entry["title"] = wave_a_titles[oid]
            entry["tier"] = wave_a_tiers.get(oid, entry["tier"])
            if wave_a_linked.get(oid):
                entry["linked_article"] = wave_a_linked[oid]

    for manifest_root in talk_manifest_roots():
        slug = manifest_root.name
        manifest = json.loads((manifest_root / "manifest.json").read_text(encoding="utf-8"))
        title = manifest.get("meta", {}).get("title", "")
        linked = manifest.get("meta", {}).get("linked_article")
        collect_milestones(
            manifest_root / "manifest.json",
            slug,
            title,
            by_oldid,
            wave_a_notes,
            corpus="talk",
            linked_article=linked,
        )

    for manifest_root in talk_manifest_roots():
        slug = manifest_root.name
        manifest = json.loads((manifest_root / "manifest.json").read_text(encoding="utf-8"))
        title = manifest.get("meta", {}).get("title", "")
        linked = manifest.get("meta", {}).get("linked_article")
        for reg in manifest.get("registros", []):
            oid = reg.get("oldid")
            if not oid or cached("talk", oid) or oid in by_oldid:
                continue
            ts_raw = reg.get("timestamp_iso", "")
            if not ts_raw:
                continue
            try:
                ts = parse_iso_ts(ts_raw)
            except ValueError:
                continue
            if ts < PRE_2008:
                by_oldid[oid] = {
                    "oldid": oid,
                    "title": title,
                    "tier": slug,
                    "wave": "C",
                    "note": f"pre-2008 talk · {reg.get('id', '')}",
                    "fetch_method": "api",
                    "corpus": "talk",
                    **({"linked_article": linked} if linked else {}),
                }

    return sorted(by_oldid.values(), key=sort_key)


def talk_probe_manifest_roots(slugs: list[str] | None = None) -> list[tuple[str, Path]]:
    """Return (slug, manifest_path) for probe manifests."""
    talk_root = ROOT / "talk"
    if not talk_root.exists():
        return []
    found: list[tuple[str, Path]] = []
    for vista_dir in sorted(talk_root.iterdir()):
        if not vista_dir.is_dir():
            continue
        slug = vista_dir.name
        if slugs and slug not in slugs:
            continue
        for candidate in (
            vista_dir / "manifest.probe.json",
            vista_dir / "probe" / "manifest.probe.json",
            vista_dir / "probe" / "manifest.json",
        ):
            if candidate.exists():
                found.append((slug, candidate))
                break
    return found


PROBE_CONFLICT_YEAR_END = "2007-12-31T23:59:59Z"
PROBE_CONFLICT_YEAR_START = "2007-01-01T00:00:00Z"


def registro_in_probe_conflict(reg: dict, manifest: dict) -> bool:
    """talk-sala-probe: only 2007 conflict window (sala + Ignacio UT silence)."""
    ts_raw = reg.get("timestamp_iso") or reg.get("timestamp", "")
    if not ts_raw:
        return False
    try:
        ts = parse_iso_ts(ts_raw if "T" in ts_raw else f"{ts_raw}T00:00:00Z")
    except ValueError:
        return False
    start = parse_iso_ts(PROBE_CONFLICT_YEAR_START)
    end = parse_iso_ts(PROBE_CONFLICT_YEAR_END)
    return start <= ts <= end


def build_talk_probe_manifest(
    slugs: list[str] | None = None,
    *,
    conflict_year_only: bool = False,
) -> list[dict]:
    """Wave A from probe manifests (talk/{slug}/manifest.probe.json or probe/)."""
    by_oldid: dict[int, dict] = {}
    for slug, manifest_path in talk_probe_manifest_roots(slugs):
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        title = manifest.get("meta", {}).get("title", "")
        linked = manifest.get("meta", {}).get("linked_article")
        window = manifest.get("meta", {}).get("window", {})
        window_note = f"{window.get('start', '?')}–{window.get('end', '?')}"
        for reg in manifest.get("registros", []):
            oid = reg.get("oldid")
            if not oid or cached("talk", oid) or oid in by_oldid:
                continue
            if conflict_year_only and not registro_in_probe_conflict(reg, manifest):
                continue
            by_oldid[oid] = {
                "oldid": oid,
                "title": title,
                "tier": slug,
                "wave": "A",
                "note": f"probe {window_note} · {reg.get('id', '')}",
                "fetch_method": "api",
                "corpus": "talk",
                **({"linked_article": linked} if linked else {}),
            }
    return sorted(by_oldid.values(), key=sort_key)


def write_viaje_template(
    viaje_id: str,
    manifest_path: Path,
    wave_counts: dict[str, int],
    *,
    corpus: str = "article",
) -> Path:
    viajes_dir = TALK_VIAJES if corpus == "talk" else VIAJES
    viajes_dir.mkdir(parents=True, exist_ok=True)
    date_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out = viajes_dir / f"{date_prefix}-{viaje_id}.json"
    audit_prefix = "cache/talk" if corpus == "talk" else "cache"
    template = {
        "viaje_id": f"{date_prefix}-{viaje_id}",
        "corpus": corpus,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "anchors": [],
        "waves": [w for w in ("A", "B", "C") if wave_counts.get(w, 0) > 0],
        "wave_results": {w: {"fetched": 0, "skipped": 0, "failed": 0} for w in ("A", "B", "C")},
        "fetched": [],
        "skipped": [],
        "failed": [],
        "offline_ready": False,
        "audit_snapshot": f"{audit_prefix}/audit-{viaje_id.replace('talk-', 'talk') if corpus == 'talk' else viaje_id}.json"
        if corpus == "talk"
        else f"cache/audit-{viaje_id}.json",
        "priority_manifest": str(manifest_path.relative_to(ROOT)),
        "notes": "Template — fill after fetch_batch waves + audit_cache.py",
    }
    if corpus == "talk":
        template["audit_snapshot"] = "cache/audit-talk.json"
    out.write_text(json.dumps(template, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", choices=("article", "talk"), default="article")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--viaje-id", default="")
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--wave-a-file", type=Path, default=None)
    parser.add_argument(
        "--anchors-file",
        type=Path,
        default=None,
        help="Talk anchor JSON (cache/talk/anchors/*.json); merges all anchors when --corpus talk",
    )
    parser.add_argument("--write-viaje-template", action="store_true")
    parser.add_argument(
        "--probe-mode",
        action="store_true",
        help="Build manifest from talk/{slug}/probe/manifest.probe.json (viaje talk-sala-probe)",
    )
    parser.add_argument(
        "--probe-slugs",
        nargs="*",
        default=None,
        help="Limit probe manifest scan to these vista slugs",
    )
    args = parser.parse_args()

    if args.corpus == "talk":
        probe_mode = args.probe_mode or args.viaje_id == "talk-sala-probe"
        if probe_mode:
            entries = build_talk_probe_manifest(
                args.probe_slugs,
                conflict_year_only=args.viaje_id == "talk-sala-probe",
            )
            wave_a_source = "talk/*/manifest.probe.json"
        else:
            entries = build_talk_manifest(args.anchors_file)
            wave_a_source = str(args.anchors_file) if args.anchors_file else "cache/talk/anchors/*.json"
    else:
        wave_a = load_wave_a(args.wave_a_file)
        entries = build_article_manifest(wave_a)
        wave_a_source = str(args.wave_a_file) if args.wave_a_file else "defaults"

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
        "corpus": args.corpus,
        "output": str(output),
        "viaje_id": args.viaje_id or None,
        "wave_a_source": wave_a_source,
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
        viaje_path = write_viaje_template(args.viaje_id, output, counts, corpus=args.corpus)
        summary["viaje_template"] = str(viaje_path)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
