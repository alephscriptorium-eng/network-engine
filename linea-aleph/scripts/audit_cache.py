#!/usr/bin/env python3
"""Audit linea-aleph cache coverage (article or talk corpus)."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = Path(__file__).resolve().parent
PRIORITY = SCRIPTS / "fetch-priority-block7.json"

from cache_paths import audit_output_path, cached, snapshot_dir, wikitext_path  # noqa: E402

TALK_VISTAS = [
    "discusion-pseudociencia",
    "usuario-discusion-analiza",
    "usuario-discusion-ignacio-icke",
    "usuario-discusion-solvecoagula",
    "discusion-problema-demarcacion",
    "discusion-criterio-demarcacion",
    "usuario-discusion-pabloallo",
    "usuario-discusion-fernando-estel",
    "usuario-discusion-ctrl-z",
]

ARTICLE_ALIGNMENT_OLDIDS = {12719652, 12909144}
DEMARCATION_ALIGNMENT_OLDIDS = {11663303, 11951034, 11951164, 11957942}
WINDOW_OCT_NOV_START = "2007-10-01"
WINDOW_OCT_NOV_END = "2007-11-30"
WINDOW_OCT_START = "2007-10-01"
WINDOW_OCT_END = "2007-10-31"
WINDOW_NOV_START = "2007-11-01"
WINDOW_NOV_END = "2007-11-30"

CROSS_VISTA_SIGNATURES: dict[str, tuple[str, list[str]]] = {
    "Pabloallo": ("usuario-discusion-solvecoagula", ["Pabloallo", "Usuario:Pabloallo"]),
    "Fernando Estel": ("usuario-discusion-solvecoagula", ["Fernando Estel", "User_talk:Fernando Estel"]),
    "Retama": ("usuario-discusion-solvecoagula", ["Retama", "Usuario:Retama"]),
}

PARTICIPANT_REGISTER_PATH = ROOT / "cache" / "talk" / "participant-register.json"

PARTICIPANT_SEEDS: dict[str, dict] = {
    "SolveCoagula": {
        "rol_arquetipico": "constructor / litigioso",
        "eje_principal": "arquitectura pluralista",
        "vistas": ["usuario-discusion-solvecoagula"],
        "ventana": "oct–nov 2007",
    },
    "Pabloallo": {
        "rol_arquetipico": "aliado técnico",
        "eje_principal": "mejoras sin revertir proyecto",
        "vistas": ["usuario-discusion-pabloallo"],
        "ventana": "oct 2007",
    },
    "Ctrl_Z": {
        "rol_arquetipico": "onboarding / fusión",
        "eje_principal": "procedimiento fusión artículos",
        "vistas": ["usuario-discusion-ctrl-z"],
        "ventana": "oct 2007",
    },
    "Fernando Estel": {
        "rol_arquetipico": "crítico epistemológico",
        "eje_principal": "coherencia del artículo pseudociencia",
        "vistas": ["usuario-discusion-fernando-estel"],
        "ventana": "oct–nov 2007",
    },
    "Analiza": {
        "rol_arquetipico": "custodio PVN",
        "eje_principal": "revert + consensuar",
        "vistas": ["usuario-discusion-analiza"],
        "ventana": "nov 2007",
    },
    "Retama": {
        "rol_arquetipico": "bibliotecaria mediadora",
        "eje_principal": "guerra de ediciones",
        "vistas": ["usuario-discusion-analiza", "usuario-discusion-solvecoagula"],
        "ventana": "nov 2007",
    },
    "Ignacio_Icke": {
        "rol_arquetipico": "ausente en UT 2007",
        "eje_principal": "apelación a sala inexistente",
        "vistas": ["usuario-discusion-ignacio-icke"],
        "ventana": "—",
    },
    "Dhidalgo": {
        "rol_arquetipico": "autor stub",
        "eje_principal": "POPPER-ONLY previo (solo artículo)",
        "vistas": [],
        "ventana": "sep 2007",
    },
}


def audit_corpus(manifest_path: Path, snap_root: Path, corpus: str = "article") -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    regs = manifest.get("registros", [])
    milestones = [r for r in regs if r.get("milestone")]
    ms_cached = sum(1 for r in milestones if cached(corpus, r["oldid"]))
    reg_cached = sum(1 for r in regs if r.get("oldid") and cached(corpus, r["oldid"]))

    extremos = {}
    for role in ("previo", "inicial", "final", "sc_cierre", "actual"):
        meta_path = snap_root / role / "meta.json"
        if not meta_path.exists():
            continue
        sm = json.loads(meta_path.read_text(encoding="utf-8"))
        oid = sm.get("oldid")
        cache = snapshot_dir(corpus)
        extremos[role] = {
            "oldid": oid,
            "fetched_meta": sm.get("fetched", False),
            "body_cached": cached(corpus, oid) if oid else sm.get("role") == "actual" and bool(
                list(cache.glob("*.wikitext"))
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


def audit_priority(corpus: str = "article") -> dict:
    entries = json.loads(PRIORITY.read_text(encoding="utf-8"))
    cached_list = [e for e in entries if cached(corpus, e["oldid"])]
    return {
        "total": len(entries),
        "cached": len(cached_list),
        "pct": round(100 * len(cached_list) / len(entries), 1) if entries else 0,
        "missing": [e["oldid"] for e in entries if not cached(corpus, e["oldid"])],
    }


def audit_ontology(corpus: str = "article") -> dict:
    seeds_path = ROOT / "ontology-seeds.json"
    if not seeds_path.exists():
        return {"sections": 0, "cached": 0, "pct": 0}
    seeds = json.loads(seeds_path.read_text(encoding="utf-8"))
    top = seeds.get("sections", [])[:8]
    hits = []
    for s in top:
        oid = s["sample_oldids"][0]
        hits.append({"section": s["section"], "oldid": oid, "cached": cached(corpus, oid)})
    cached_n = sum(1 for h in hits if h["cached"])
    return {
        "sections": len(hits),
        "cached": cached_n,
        "pct": round(100 * cached_n / len(hits), 1) if hits else 0,
        "items": hits,
    }


def unique_extremos_count(corpus: str = "article") -> dict:
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
                if cached(corpus, oid):
                    cached_n += 1
    return {"unique": total, "cached": cached_n, "pct": round(100 * cached_n / total, 1) if total else 0}


def _iso_day(ts: str) -> str:
    if not ts:
        return ""
    if "T" in ts:
        return ts[:10]
    # display format from manifest e.g. "19:55 18 nov 2007"
    parts = ts.split()
    if len(parts) >= 4:
        months = {
            "ene": "01", "feb": "02", "mar": "03", "abr": "04", "may": "05", "jun": "06",
            "jul": "07", "ago": "08", "sep": "09", "oct": "10", "nov": "11", "dic": "12",
        }
        mon = months.get(parts[2].lower(), "00")
        return f"{parts[3]}-{mon}-{parts[1].zfill(2)}"
    return ""


def _in_window(day: str, start: str, end: str) -> bool:
    return bool(day) and start <= day <= end


def _wikitext_snippet(oldid: int, max_len: int = 120) -> str:
    path = wikitext_path("talk", oldid)
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8", errors="replace").strip()
    text = " ".join(text.split())
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


def build_participant_register() -> dict:
    participantes: dict[str, dict] = {}
    for name, seed in PARTICIPANT_SEEDS.items():
        participantes[name] = {
            "rol_arquetipico": seed["rol_arquetipico"],
            "eje_principal": seed["eje_principal"],
            "vistas": list(seed["vistas"]),
            "ventana": seed["ventana"],
            "tono": "",
            "registro_linguistico": [],
            "oldids_clave": [],
        }

    user_aliases = {
        "SolveCoagula": "SolveCoagula",
        "Pabloallo": "Pabloallo",
        "Ctrl_Z": "Ctrl_Z",
        "Fernando Estel": "Fernando Estel",
        "Analiza": "Analiza",
        "Retama": "Retama",
        "Ignacio_Icke": "Ignacio_Icke",
        "Dhidalgo": "Dhidalgo",
    }

    for slug in TALK_VISTAS:
        manifest_path = ROOT / "talk" / slug / "manifest.json"
        if not manifest_path.exists():
            continue
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for reg in manifest.get("registros", []):
            user = reg.get("user", "")
            if user not in user_aliases.values():
                continue
            display = next((k for k, v in user_aliases.items() if v == user), user)
            if display not in participantes:
                continue
            oid = reg.get("oldid")
            if not oid or not cached("talk", oid):
                continue
            entry = participantes[display]
            if oid not in entry["oldids_clave"]:
                entry["oldids_clave"].append(oid)
            snippet = _wikitext_snippet(oid)
            if snippet:
                entry["registro_linguistico"].append(
                    {"oldid": oid, "vista": slug, "cita": snippet}
                )

    for name, entry in participantes.items():
        citas = entry["registro_linguistico"]
        if citas:
            entry["tono"] = citas[0]["cita"][:100]
        entry["oldids_clave"] = sorted(set(entry["oldids_clave"]))

    for name, (slug, needles) in CROSS_VISTA_SIGNATURES.items():
        if name not in participantes:
            continue
        manifest_path = ROOT / "talk" / slug / "manifest.json"
        if not manifest_path.exists():
            continue
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        entry = participantes[name]
        if slug not in entry["vistas"]:
            entry["vistas"].append(slug)
        for reg in manifest.get("registros", []):
            oid = reg.get("oldid")
            if not oid or not cached("talk", oid):
                continue
            text = wikitext_path("talk", oid).read_text(encoding="utf-8", errors="replace")
            if not any(n in text for n in needles):
                continue
            if oid not in entry["oldids_clave"]:
                entry["oldids_clave"].append(oid)
            snippet = _wikitext_snippet(oid, max_len=160)
            if snippet and not any(c["oldid"] == oid for c in entry["registro_linguistico"]):
                entry["registro_linguistico"].append(
                    {"oldid": oid, "vista": slug, "cita": snippet}
                )
        citas = entry["registro_linguistico"]
        if citas and not entry["tono"]:
            for c in citas:
                if "messagebox" not in c["cita"] and "Bienvenid" not in c["cita"]:
                    entry["tono"] = c["cita"][:100]
                    break
            if not entry["tono"]:
                entry["tono"] = citas[0]["cita"][:100]
        entry["oldids_clave"] = sorted(set(entry["oldids_clave"]))

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "participantes": participantes,
    }


def write_participant_register() -> Path:
    payload = build_participant_register()
    PARTICIPANT_REGISTER_PATH.parent.mkdir(parents=True, exist_ok=True)
    PARTICIPANT_REGISTER_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return PARTICIPANT_REGISTER_PATH


def audit_talk() -> dict:
    per_vista: dict[str, dict] = {}
    all_nov_regs: list[dict] = []
    all_oct_regs: list[dict] = []
    vacio_explicito: list[str] = []
    alignment_hits: list[dict] = []
    demarcation_alignment_hits: list[dict] = []
    activity_2007: dict[str, int] = {}

    for slug in TALK_VISTAS:
        manifest_path = ROOT / "talk" / slug / "manifest.json"
        snap_root = ROOT / "talk" / slug / "snapshots"
        if not manifest_path.exists():
            per_vista[slug] = {
                "registros": 0,
                "registros_cached": 0,
                "registros_pct": 0,
                "missing_manifest": True,
            }
            vacio_explicito.append(slug)
            continue

        vista_audit = audit_corpus(manifest_path, snap_root, "talk")
        per_vista[slug] = vista_audit

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        regs = manifest.get("registros", [])
        count_2007 = 0
        for reg in regs:
            day = _iso_day(reg.get("timestamp", ""))
            if day.startswith("2007"):
                count_2007 += 1
            if _in_window(day, WINDOW_NOV_START, WINDOW_NOV_END):
                nov_entry = {**reg, "vista": slug}
                all_nov_regs.append(nov_entry)
                if cached("talk", reg["oldid"]):
                    nov_entry["body_cached"] = True
            if _in_window(day, WINDOW_OCT_START, WINDOW_OCT_END):
                oct_entry = {**reg, "vista": slug}
                all_oct_regs.append(oct_entry)
                if cached("talk", reg["oldid"]):
                    oct_entry["body_cached"] = True
            for ref in reg.get("article_refs", []):
                if ref.get("oldid") in ARTICLE_ALIGNMENT_OLDIDS:
                    alignment_hits.append(
                        {
                            "vista": slug,
                            "talk_oldid": reg["oldid"],
                            "article_oldid": ref["oldid"],
                            "delta_hours": ref.get("delta_hours"),
                        }
                    )
                if ref.get("oldid") in DEMARCATION_ALIGNMENT_OLDIDS:
                    demarcation_alignment_hits.append(
                        {
                            "vista": slug,
                            "talk_oldid": reg["oldid"],
                            "article_oldid": ref["oldid"],
                            "delta_hours": ref.get("delta_hours"),
                        }
                    )
        activity_2007[slug] = count_2007
        if count_2007 == 0:
            vacio_explicito.append(slug)

    nov_with_body = sum(1 for r in all_nov_regs if cached("talk", r["oldid"]))
    oct_with_body = sum(1 for r in all_oct_regs if cached("talk", r["oldid"]))
    total_cached = sum(v.get("registros_cached", 0) for v in per_vista.values())
    total_regs = sum(v.get("registros", 0) for v in per_vista.values())

    register_path = write_participant_register()
    register_data = build_participant_register()
    register_summary = {
        "path": str(register_path.relative_to(ROOT)).replace("\\", "/"),
        "participantes": len(register_data["participantes"]),
        "con_citas": sum(
            1 for p in register_data["participantes"].values() if p.get("registro_linguistico")
        ),
    }

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "corpus": "talk",
        "vistas": per_vista,
        "totals": {
            "registros": total_regs,
            "registros_cached": total_cached,
            "registros_pct": round(100 * total_cached / total_regs, 1) if total_regs else 0,
        },
        "ventana_nov_2007": {
            "revisiones": len(all_nov_regs),
            "con_cuerpo": nov_with_body,
            "pct_cuerpo": round(100 * nov_with_body / len(all_nov_regs), 1) if all_nov_regs else 0,
        },
        "ventana_oct_2007": {
            "revisiones": len(all_oct_regs),
            "con_cuerpo": oct_with_body,
            "pct_cuerpo": round(100 * oct_with_body / len(all_oct_regs), 1) if all_oct_regs else 0,
        },
        "article_alignment": {
            "anchors": sorted(ARTICLE_ALIGNMENT_OLDIDS),
            "hits": len(alignment_hits),
            "detalle": alignment_hits,
        },
        "article_alignment_demarcacion": {
            "anchors": sorted(DEMARCATION_ALIGNMENT_OLDIDS),
            "hits": len(demarcation_alignment_hits),
            "detalle": demarcation_alignment_hits,
        },
        "participant_register": register_summary,
        "vacío_explícito": vacio_explicito,
        "actividad_2007_por_vista": activity_2007,
        "cache_files": len(list(snapshot_dir("talk").glob("*.wikitext"))),
    }


def audit_article() -> dict:
    cache = snapshot_dir("article")
    report = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "demarcacion": audit_corpus(ROOT / "manifest.json", ROOT / "snapshots"),
        "pseudociencia": audit_corpus(
            ROOT / "pseudociencia" / "manifest.json", ROOT / "pseudociencia" / "snapshots"
        ),
        "priority_block7": audit_priority(),
        "ontology_seeds_top8": audit_ontology(),
        "extremos_unicos": unique_extremos_count(),
        "cache_files": len(list(cache.glob("*.wikitext"))),
    }
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--corpus",
        choices=("article", "talk"),
        default="article",
        help="Audit article cache (default) or talk corpus",
    )
    args = parser.parse_args()

    if args.corpus == "talk":
        report = audit_talk()
    else:
        report = audit_article()

    out = audit_output_path(args.corpus)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
