#!/usr/bin/env python3
"""Segment engine-model-A raw logs into Cohen Force corpus (dialectic poles A/B)."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Reuse template utilities
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT.parent))
from segment_engine_template import (  # noqa: E402
    ENGINE_TAGS,
    build_indice,
    build_scene,
    read_lines,
    verify_files,
    write_layer,
)

ENGINE_ID = "engine-model-A"
OUT = ROOT

TAGS = [*ENGINE_TAGS, "dialectic", "polo_ab", "marxismo_internacional"]

SESSION_1 = "sesion-01-lenin-guerra-fria-dialectica"
SESSION_2 = "sesion-02-internacionales-cafe-muertos"

LOG1 = "raw/logs-agent-1.md"
LOG2 = "raw/log-agents-2.md"

# ── logs-agent-1.md (Cursor export, 709 lines) ───────────────────────────────

SCENES_LOG1: list[dict] = [
    {
        "id": "s01-01",
        "slug": "01-lenin-testamento",
        "title": "Lenin: muerte, testamento, improvisación y contrafactual 50 años",
        "lines": (1, 59),
        "tags": [*TAGS, "lenin", "testamento", "NEP", "autoritarismo"],
        "turns": [{"prompt": (1, 1), "body": 2, "output": 23, "end": 59}],
        "anomalies": ["titulo_linea_1_como_prompt_implicito", "sin_user_explicito"],
    },
    {
        "id": "s01-02",
        "slug": "02-aproximacion-indirecta-guerra-fria",
        "title": "Aproximación indirecta en Guerra Fría — Marx contra la revolución",
        "lines": (60, 119),
        "tags": [*TAGS, "guerra_fria", "Liddell_Hart", "marx", "ideologia"],
        "turns": [{"prompt": (61, 61), "body": 63, "output": 81, "end": 119}],
        "anomalies": ["slippage_Liddell_Hart_vs_guerra_posicion"],
    },
    {
        "id": "s01-03",
        "slug": "03-marcuse-marxismo-sovietico",
        "title": "Marcuse — crítica inmanente del marxismo soviético",
        "lines": (120, 169),
        "tags": [*TAGS, "marcuse", "critica_inmanente", "URSS"],
        "turns": [{"prompt": (121, 121), "body": 123, "output": 145, "end": 169}],
        "anomalies": [],
    },
    {
        "id": "s01-04",
        "slug": "04-adorno-vietnam-pseudoactividad",
        "title": "Adorno, Vietnam, estalinismo y pseudoactividad",
        "lines": (170, 207),
        "tags": [*TAGS, "adorno", "vietnam", "totalitarismo", "Aktionismus"],
        "turns": [{"prompt": (171, 171), "body": 173, "output": 183, "end": 207}],
        "anomalies": [],
    },
    {
        "id": "s01-05",
        "slug": "05-veredicto-2026-liddell-marcuse-adorno",
        "title": "Veredicto 2026: Liddell Hart, Marcuse y Adorno",
        "lines": (208, 280),
        "tags": [*TAGS, "veredicto_2026", "objetividad", "legado"],
        "turns": [{"prompt": (209, 209), "body": 211, "output": 233, "end": 280}],
        "anomalies": ["veredicto_mixto_sin_criterios_explicitos"],
    },
    {
        "id": "s01-06",
        "slug": "06-critica-test2-hilo-dialectico",
        "title": "Meta-crítica test2.md — tejer el hilo Lenin→Marcuse→Adorno",
        "lines": (281, 393),
        "tags": [*TAGS, "meta_critica", "hilo_argumental", "test2"],
        "turns": [{"prompt": (281, 281), "body": 283, "output": 303, "end": 393}],
        "anomalies": [
            "prompt_linea_281_critica_usuario_y_respuesta_agente_fusionados",
            "escena_correccion_metodologica",
        ],
    },
    {
        "id": "s01-07",
        "slug": "07-objetividad-sistemica-psoe-rpdc",
        "title": "Objetividad sistémica — PSOE siglas y RPDC «Popular»",
        "lines": (394, 552),
        "tags": [*TAGS, "objetividad_sistemica", "PSOE", "Corea_del_Norte", "Songbun"],
        "turns": [{"prompt": (394, 394), "body": 396, "output": 464, "end": 551}],
        "anomalies": [
            "prompt_embebe_texto_completo_otro_agente",
            "footer_ai_linea_552",
        ],
    },
    {
        "id": "s01-08",
        "slug": "08-wilber-mapa-geoglobal-2026",
        "title": "Wilber, mapa geoglobal 2026 y conflictos verticales",
        "lines": (553, 710),
        "tags": [*TAGS, "wilber", "geopolitica", "conflictos_verticales", "2026"],
        "turns": [{"prompt": (554, 554), "body": 556, "output": 634, "end": 710}],
        "anomalies": [
            "prompt_embebe_respuesta_otro_agente_completa",
            "linea_553_footer_ai_turno_anterior",
        ],
    },
]

# ── log-agents-2.md (Expert Mode, 262 lines) ─────────────────────────────────

SCENES_LOG2: list[dict] = [
    {
        "id": "s02-01",
        "slug": "09-internacionales-polo-ab",
        "title": "Cronología Internacionales I–IV — polos A/B y café muertos",
        "lines": (1, 81),
        "tags": [*TAGS, "internacionales", "polo_A", "polo_B", "cafe_muertos", "ancla"],
        "prompt_line": 1,
        "prompt_end": 1,
        "trace_lines": [3],
        "think_start": 5,
        "think_end": 34,
        "output_start": 35,
        "anomalies": [
            "expert_mode_search_unavailable",
            "titulo_linea_1_sin_prompt_usuario_explicito",
        ],
        "anchor": True,
    },
    {
        "id": "s02-02",
        "slug": "10-internacional-situacionista",
        "title": "Internacional Situacionista — delta antipolítico y café Debord",
        "lines": (82, 147),
        "tags": [*TAGS, "situacionismo", "Debord", "espectaculo", "Mayo_68"],
        "prompt_line": 83,
        "trace_lines": [],
        "think_start": 85,
        "think_end": 86,
        "output_start": 87,
        "anomalies": [],
    },
    {
        "id": "s02-03",
        "slug": "11-internacionales-contemporaneas-cafe",
        "title": "Internacionales actuales — Foro São Paulo, V Chávez, Progresista",
        "lines": (148, 263),
        "tags": [*TAGS, "Foro_Sao_Paulo", "Varoufakis", "Chavez", "internacional_progresista"],
        "prompt_line": 149,
        "trace_lines": [],
        "think_start": 151,
        "think_end": 191,
        "output_start": 193,
        "anomalies": ["cafe_siglo_XXI_personajes_ficticios"],
    },
]

SOURCES = [
    {
        "file": LOG1,
        "format": "cursor_export",
        "session": SESSION_1,
        "scenes": SCENES_LOG1,
    },
    {
        "file": LOG2,
        "format": "expert_mode",
        "session": SESSION_2,
        "scenes": SCENES_LOG2,
    },
]


def verify_source_coverage(scenes: list[dict], total_lines: int, label: str) -> dict:
    issues: list[str] = []
    if not scenes:
        return {"total_lines": total_lines, "issues": [f"{label}: SCENES empty"], "ok": False}

    ranges = sorted(sc["lines"] for sc in scenes)
    if ranges[0][0] != 1:
        issues.append(f"{label}: first scene starts at {ranges[0][0]}, expected 1")
    if ranges[-1][1] != total_lines:
        issues.append(f"{label}: last scene ends at {ranges[-1][1]}, expected {total_lines}")

    covered: set[int] = set()
    for ls, le in ranges:
        for i in range(ls, le + 1):
            if i in covered:
                issues.append(f"{label}: duplicate line {i}")
            covered.add(i)

    for i in range(1, total_lines + 1):
        if i not in covered:
            issues.append(f"{label}: gap at line {i}")

    return {
        "source": label,
        "total_lines": total_lines,
        "covered_lines": len(covered),
        "scenes": len(scenes),
        "issues": issues,
        "ok": len(issues) == 0,
    }


def build_scenes_for_source(src: dict) -> list[dict]:
    log_path = ROOT / src["file"]
    lines = read_lines(log_path)
    manifest: list[dict] = []

    # Patch module-level format for extract_range_scene
    import segment_engine_template as tpl

    tpl.LOG_FORMAT = src["format"]
    tpl.SESSION = src["session"]
    tpl.SRC = src["file"]
    tpl.ENGINE_ID = ENGINE_ID
    tpl.OUT = OUT

    for sc in src["scenes"]:
        scene = dict(sc)
        scene.setdefault("tags", TAGS)
        entry = build_scene(lines, scene)
        entry["source"]["file"] = src["file"]
        entry["log_format"] = src["format"]
        manifest.append(entry)

    return manifest


def build_indice_a(manifest: list[dict], coverage: dict) -> str:
    lines = [
        f"# INDICE — corpus {ENGINE_ID}",
        "",
        "Engine Cohen Force · **dialectic_poles_ab** · Lenin/Marx/Guerra Fría + Internacionales polo A/B + café muertos.",
        f"Plan: [`../PLAN-multitask-engines.md`](../PLAN-multitask-engines.md)",
        "",
        "## Fuentes",
        "",
        f"- [`{LOG1}`]({LOG1}) — sesión `{SESSION_1}` (cursor export, 8 escenas)",
        f"- [`{LOG2}`]({LOG2}) — sesión `{SESSION_2}` (expert mode, 3 escenas)",
        "",
        f"**Ancla force:** [`{SESSION_2}/09-internacionales-polo-ab/`]({SESSION_2}/09-internacionales-polo-ab/)",
        f"**Ancla alternativa:** [`{SESSION_1}/01-lenin-testamento/`]({SESSION_1}/01-lenin-testamento/)",
        "",
        "## Tabla de escenas",
        "",
        "| ID | Escena | Resumen | Tags |",
        "|----|--------|---------|------|",
    ]
    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        anchor = " ⚓" if sc.get("anchor") else ""
        tags = ", ".join(f"`{t}`" for t in sc["tags"][:4])
        src = sc["source"]["file"].replace("raw/", "")
        lines.append(
            f"| [{sc['id']}]({rel}/) | [{sc['slug']}]({rel}/){anchor} | {sc['title']} | {tags} · `{src}` |"
        )

    lines.extend(
        [
            "",
            "## Cobertura",
            "",
        ]
    )
    for cov in coverage["per_source"]:
        status = "OK" if cov["ok"] else "ISSUES"
        lines.append(
            f"- `{cov['source']}`: {cov['covered_lines']}/{cov['total_lines']} líneas · "
            f"{cov['scenes']} escenas · {status}"
        )
    lines.extend(
        [
            "",
            f"Global: {'OK' if coverage['ok'] else 'ISSUES'} · {coverage['total_scenes']} escenas",
            "",
            "Regenerar: `python3 segment_engine_model_a_log.py`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    all_manifest: list[dict] = []
    per_source_cov: list[dict] = []

    for src in SOURCES:
        path = ROOT / src["file"]
        if not path.exists():
            raise SystemExit(f"Source log missing: {path}")
        lines = read_lines(path)
        per_source_cov.append(verify_source_coverage(src["scenes"], len(lines), src["file"]))
        all_manifest.extend(build_scenes_for_source(src))

    coverage = {
        "per_source": per_source_cov,
        "total_scenes": len(all_manifest),
        "ok": all(s["ok"] for s in per_source_cov),
    }
    file_check = verify_files(all_manifest)

    manifest_doc = {
        "engine_id": ENGINE_ID,
        "cohen_type": "dialectic_poles_ab",
        "sources": [
            {
                "file": s["file"],
                "format": s["format"],
                "session": s["session"],
                "line_count": per_source_cov[i]["total_lines"],
                "scene_count": len(s["scenes"]),
            }
            for i, s in enumerate(SOURCES)
        ],
        "anchor_scene": f"{SESSION_2}/09-internacionales-polo-ab",
        "anchor_alt": f"{SESSION_1}/01-lenin-testamento",
        "scenes": all_manifest,
        "coverage": coverage,
        "verification": file_check,
    }

    (OUT / "manifest.json").write_text(
        json.dumps(manifest_doc, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (OUT / "INDICE.md").write_text(build_indice_a(all_manifest, coverage), encoding="utf-8")

    result = {
        "engine_id": ENGINE_ID,
        "scenes": len(all_manifest),
        "files": file_check["files"],
        "coverage": coverage,
        "file_check": file_check,
        "anchor_scene": manifest_doc["anchor_scene"],
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
