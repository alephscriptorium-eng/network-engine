#!/usr/bin/env python3
"""Segment engine-model-C raw logs into Cohen Force corpus (political_economy ES)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
SESSION = "sesion-01-piramide-riqueza-espana"
ENGINE_ID = "engine-model-C"

FORCE_TAGS = ["force:C", "cohen:political_economy", "Espana", "economia_politica"]

# Each scene: source file under raw/, line range, layer hints
SCENES: list[dict] = [
    {
        "id": "c01-01",
        "slug": "01-piramide-riqueza-espana",
        "title": "Pirámide patrimonial España — percentiles, Gini y renta 2019-2023",
        "source": "raw/logs-agent-1.md",
        "lines": (1, 65),
        "prompt_lines": [2],
        "trace_lines": [6, 8, 10, 12, 14, 16, 18, 20, 22],
        "think_start": 4,
        "think_end": 23,
        "output_start": 25,
        "tags": [*FORCE_TAGS, "piramide", "riqueza", "Gini", "ancla"],
        "rol": "ancla",
        "anchor": True,
        "anomalies": ["cursor_export_con_busqueda_web"],
    },
    {
        "id": "c01-02",
        "slug": "02-moderador-objetividad-borrego",
        "title": "Moderador objetividad sistémica — Borrego vs respondiente (decrecimiento)",
        "source": "raw/logs-agent-1.md",
        "lines": (66, 253),
        "prompt_lines": [66, 70],
        "trace_lines": [252],
        "think_start": 72,
        "think_end": 202,
        "output_start": 204,
        "tags": [*FORCE_TAGS, "objetividad", "Borrego", "Taibo", "decrecimiento"],
        "rol": "moderacion",
        "anomalies": ["SIGUIENTE_TEMA_como_delimitador"],
    },
    {
        "id": "c01-03",
        "slug": "03-ayuda-respondiente-referencias",
        "title": "Ayuda al respondiente — URSS, Ponzi, fiscalidad, greenwashing",
        "source": "raw/logs-agent-1.md",
        "lines": (254, 414),
        "prompt_lines": [254],
        "trace_lines": [256],
        "think_start": 258,
        "think_end": 272,
        "output_start": 274,
        "tags": [*FORCE_TAGS, "respondiente", "referencias", "Graeber", "Marx"],
        "rol": "asistencia",
        "anomalies": ["expert_mode_search_unavailable"],
    },
    {
        "id": "c01-04",
        "slug": "04-greenwashing-ipcc-montreal",
        "title": "Greenwashing — Volkswagen, IPCC y Protocolo de Montreal",
        "source": "raw/logs-agent-1.md",
        "lines": (415, 514),
        "prompt_lines": [415],
        "trace_lines": [417],
        "think_start": 419,
        "think_end": 438,
        "output_start": 441,
        "tags": [*FORCE_TAGS, "greenwashing", "clima", "IPCC", "Montreal"],
        "rol": "asistencia",
        "anomalies": [],
    },
    {
        "id": "c01-05",
        "slug": "05-borrego-replica-vivienda-10-anos",
        "title": "Réplica Borrego — competitividad, fiscalidad y hipotecas a 10 años",
        "source": "raw/logs-agent-1.md",
        "lines": (515, 628),
        "prompt_lines": [515],
        "think_start": 517,
        "think_end": 527,
        "output_start": 529,
        "tags": [*FORCE_TAGS, "Borrego", "vivienda", "hipoteca", "corralito"],
        "rol": "debate",
        "anomalies": ["prompt_incluye_cita_whatsapp_Borrego"],
    },
    {
        "id": "c01-06",
        "slug": "06-conclusion-capital-mea-llueve",
        "title": "Conclusión «el capital nos mea y dice que llueve» — cuatro frases",
        "source": "raw/logs-agent-1.md",
        "lines": (629, 680),
        "prompt_lines": [629],
        "think_start": 631,
        "think_end": 653,
        "output_start": 655,
        "tags": [*FORCE_TAGS, "conclusion", "mea-llueve", "lobbies", "rescate-2008"],
        "rol": "sintesis",
        "anomalies": [],
    },
    {
        "id": "c01-07",
        "slug": "07-vivienda-shock-antagonistas-jesus",
        "title": "Shock crediticio vivienda — mapa antagonistas y parábola del templo",
        "source": "raw/logs-agent-1.md",
        "lines": (681, 959),
        "prompt_lines": [681, 785, 894],
        "trace_lines": [683, 959],
        "think_ranges": [(685, 705), (787, 808), (896, 916)],
        "output_ranges": [(707, 783), (810, 892), (918, 957)],
        "tags": [*FORCE_TAGS, "vivienda", "Minsky", "usura", "antagonistas"],
        "rol": "analisis",
        "anomalies": ["tres_turnos_en_una_escena", "mezcla_analisis_y_reflexion_moral"],
    },
    {
        "id": "c01-08",
        "slug": "08-ilustracion-2-ciudadano-protocolo",
        "title": "Ilustración 2.0 — ciudadano-protocolo vs NRx (Robespierre / Ethereum arquetipo)",
        "source": "raw/logs-agent-2.md",
        "lines": (1, 73),
        "prompt_lines": [1, 3],
        "think_start": 5,
        "think_end": 17,
        "output_start": 19,
        "tags": [*FORCE_TAGS, "Ilustracion", "derechos", "NRx", "ciudadano-protocolo"],
        "rol": "marco",
        "anomalies": [],
    },
]

FOOTER = "This response is AI-generated, for reference only."
TRACE_READ = re.compile(r"^Read \d+ (web pages|pages)", re.I)
TRACE_FOUND = re.compile(r"^Found \d+ web pages", re.I)
SEARCH_UNAVAILABLE = re.compile(r"Search is unavailable", re.I)
THINK_EN = re.compile(
    r"^(The user |We need to|I'll |I need to|I should |I must |Now, |Key points|"
    r"Structure:|Important:|Let's |I'll craft|I'll structure|I'll write|I'll produce|"
    r"OK, el usuario|Voy a |Primero,|Segundo,|Tercero,|Cuarto,|Excelente\.|"
    r"Perfecto\.|Entendido\.|Mira |Tu reflexión)"
)
THINK_ES = re.compile(
    r"^(El usuario |Necesito |Para |Voy a |Puedo |Mi respuesta |Interpretation:)"
)


def read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines(keepends=True)


def yaml_frontmatter(meta: dict) -> str:
    lines = ["---"]
    for k, v in meta.items():
        if isinstance(v, list):
            if v and isinstance(v[0], str):
                lines.append(f"{k}: [{', '.join(v)}]")
            else:
                lines.append(f"{k}: {json.dumps(v, ensure_ascii=False)}")
        elif isinstance(v, bool):
            lines.append(f"{k}: {'true' if v else 'false'}")
        else:
            lines.append(f"{k}: {v}")
    lines.append("---\n")
    return "\n".join(lines)


def is_trace_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if s == FOOTER:
        return True
    if TRACE_READ.match(s) or TRACE_FOUND.match(s):
        return True
    if SEARCH_UNAVAILABLE.search(s):
        return True
    if s.startswith("[") and "](http" in s:
        return True
    if s == "View All":
        return True
    return False


def is_think_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if THINK_EN.match(s) or THINK_ES.match(s):
        return True
    if re.match(r"^\d+\.\s+\*\*", s):
        return True
    if s.startswith("-   ") and ("User " in s or "Borrego" in s or "Respond" in s):
        return True
    return False


def join_range(lines: list[str], start: int, end: int) -> str:
    return "".join(lines[start - 1 : end]).rstrip("\n")


def extract_layers(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    ls, le = scene["lines"]
    prompt_line_nums = set(scene.get("prompt_lines", []))
    trace_line_nums = set(scene.get("trace_lines", []))

    think_line_nums: set[int] = set()
    for ts, te in scene.get("think_ranges", []):
        think_line_nums.update(range(ts, te + 1))
    if "think_start" in scene:
        think_line_nums.update(range(scene["think_start"], scene["think_end"] + 1))

    output_line_nums: set[int] = set()
    for os_, oe in scene.get("output_ranges", []):
        output_line_nums.update(range(os_, oe + 1))
    if "output_start" in scene:
        output_end = scene.get("output_end", le)
        output_line_nums.update(range(scene["output_start"], output_end + 1))

    prompt_parts: list[str] = []
    think_parts: list[str] = []
    trace_parts: list[str] = []
    output_parts: list[str] = []

    for i in range(ls, le + 1):
        line = lines[i - 1]
        stripped = line.rstrip("\n")
        if not stripped.strip():
            continue

        if i in trace_line_nums or is_trace_line(stripped):
            trace_parts.append(stripped)
            continue

        if i in prompt_line_nums:
            prompt_parts.append(stripped)
            continue

        if i in think_line_nums or (think_line_nums and is_think_line(stripped)):
            if stripped.strip() != FOOTER:
                think_parts.append(stripped)
            continue

        if output_line_nums:
            if i in output_line_nums:
                if stripped.strip() == FOOTER:
                    trace_parts.append(stripped)
                    continue
                output_parts.append(stripped)
        elif i not in think_line_nums and not is_think_line(stripped):
            if stripped.strip() == FOOTER:
                trace_parts.append(stripped)
                continue
            output_parts.append(stripped)

    return (
        "\n\n".join(prompt_parts).strip(),
        "\n\n".join(think_parts).strip(),
        "\n".join(output_parts).strip(),
        "\n\n".join(trace_parts).strip(),
    )


def write_layer(
    folder: Path,
    name: str,
    body: str,
    scene_id: str,
    source: str,
    line_range: list[int],
    layer: str,
    tags: list[str],
    extra: dict | None = None,
) -> Path | None:
    if not body.strip():
        return None
    meta = {
        "scene_id": scene_id,
        "session": SESSION,
        "engine": ENGINE_ID,
        "source_file": source,
        "source_lines": line_range,
        "layer": layer,
        "tags": tags,
    }
    if extra:
        meta.update(extra)
    path = folder / name
    path.write_text(yaml_frontmatter(meta) + body.strip() + "\n", encoding="utf-8")
    return path


def build_scene(all_lines: dict[str, list[str]], scene: dict) -> dict:
    source = scene["source"]
    lines = all_lines[source]
    ls, le = scene["lines"]
    folder = ROOT / SESSION / scene["slug"]
    folder.mkdir(parents=True, exist_ok=True)

    prompt, think, output, trace = extract_layers(lines, scene)
    tags = scene["tags"]
    files: dict[str, str] = {}

    for layer_name, body, placeholder in (
        ("prompt", prompt, None),
        ("think", think, "_(sin think explícito)_"),
        ("output", output, None),
        ("trace", trace, "_(sin traces en este turno)_"),
    ):
        content = body or (placeholder or "")
        if layer_name in ("trace", "think") and not body:
            if layer_name == "think" and output:
                continue
            if layer_name == "trace":
                p = write_layer(
                    folder,
                    f"{layer_name}.md",
                    content,
                    scene["id"],
                    source,
                    [ls, le],
                    layer_name,
                    tags,
                )
                if p:
                    files[layer_name] = str(p.relative_to(ROOT))
                continue
        p = write_layer(
            folder,
            f"{layer_name}.md",
            content,
            scene["id"],
            source,
            [ls, le],
            layer_name,
            tags,
            extra={"rol": scene["rol"]} if layer_name == "prompt" else None,
        )
        if p:
            files[layer_name] = str(p.relative_to(ROOT))

    entry: dict = {
        "id": scene["id"],
        "session": SESSION,
        "slug": scene["slug"],
        "source": {"file": source, "line_start": ls, "line_end": le},
        "title": scene["title"],
        "engine": ENGINE_ID,
        "rol": scene["rol"],
        "tags": scene["tags"],
        "files": files,
        "anomalies": scene.get("anomalies", []),
    }
    if scene.get("anchor"):
        entry["anchor"] = True
    return entry


def verify_line_coverage(sources: dict[str, int]) -> dict:
    issues: list[str] = []
    for src, total in sources.items():
        ranges = sorted(sc["lines"] for sc in SCENES if sc["source"] == src)
        if not ranges:
            issues.append(f"{src}: no scenes")
            continue
        if ranges[0][0] != 1:
            issues.append(f"{src}: first scene starts at {ranges[0][0]}, expected 1")
        if ranges[-1][1] != total:
            issues.append(f"{src}: last scene ends at {ranges[-1][1]}, expected {total}")
        covered: set[int] = set()
        for ls, le in ranges:
            for i in range(ls, le + 1):
                if i in covered:
                    issues.append(f"{src}: duplicate line {i}")
                covered.add(i)
        for i in range(1, total + 1):
            if i not in covered:
                issues.append(f"{src}: gap at line {i}")

    return {
        "sources": sources,
        "scenes": len(SCENES),
        "issues": issues,
        "ok": len(issues) == 0,
    }


def verify_files(manifest: list[dict]) -> dict:
    issues: list[str] = []
    file_count = 0
    for sc in manifest:
        for layer in ("prompt", "think", "output", "trace"):
            rel = sc["files"].get(layer)
            if not rel:
                if layer in ("trace", "think") and sc["files"].get("output"):
                    continue
                issues.append(f"{sc['id']}: missing {layer}")
                continue
            file_count += 1
            p = ROOT / rel
            if not p.exists():
                issues.append(f"Missing: {p}")
            elif p.stat().st_size == 0:
                issues.append(f"Empty: {p}")
    return {"files": file_count, "issues": issues, "ok": len(issues) == 0}


def build_indice(manifest: list[dict], coverage: dict) -> str:
    src1 = coverage["sources"].get("raw/logs-agent-1.md", "?")
    src2 = coverage["sources"].get("raw/logs-agent-2.md", "?")
    lines = [
        "# INDICE — engine-model-C (Cohen Force economía política ES)",
        "",
        "## Rol en Modo Aleph",
        "",
        "**Force C:** economía política española — pirámide patrimonial, debate Borrego/decrecimiento,",
        "ciudadano-protocolo frente a NRx. Ancla: concentración de riqueza y percentiles.",
        "",
        "Escena ancla: [`01-piramide-riqueza-espana`](sesion-01-piramide-riqueza-espana/01-piramide-riqueza-espana/).",
        "",
        "Registry: [`manifest.json`](manifest.json) · Ficha: [`engine.json`](engine.json).",
        "Contraste sugerido: [`engine-model-E`](../engine-model-E/) (NRx), [`linea-aleph`](../../linea-aleph/INDICE.md).",
        "",
        "## Visión del hilo",
        "",
        f"El corpus [`raw/logs-agent-1.md`](raw/logs-agent-1.md) ({src1} líneas) abre con la pirámide",
        "de riqueza y renta en España (2019-2023), modera un debate decrecentista entre Borrego y el",
        "respondiente, arma referencias críticas (greenwashing, fiscalidad, vivienda) y cierra con el",
        "shock crediticio de hipotecas a 10 años y la parábola templo/usura.",
        f"[`raw/logs-agent-2.md`](raw/logs-agent-2.md) ({src2} líneas) enlaza Ilustración 2.0:",
        "ciudadano como avatar jurídico frente a la cancelación NRx del filósofo.",
        "",
        "## Tabla de escenas",
        "",
        "| ID | Escena | Rol | Resumen | Tags |",
        "|----|--------|-----|---------|------|",
    ]
    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        anchor = " ⚓" if sc.get("anchor") else ""
        tags = ", ".join(f"`{t}`" for t in sc["tags"][:4])
        lines.append(
            f"| [{sc['id']}]({rel}/) | [{sc['slug']}]({rel}/){anchor} | `{sc['rol']}` | {sc['title']} | {tags} |"
        )

    lines.extend(
        [
            "",
            "## Mapa conceptual",
            "",
            "```mermaid",
            "flowchart TB",
            "  subgraph c01 [Sesion 01 piramide riqueza espana]",
            "    A1[01 Piramide riqueza ES]",
            "    A2[02 Moderador objetividad]",
            "    A3[03-06 Debate capitalismo]",
            "    A4[07 Vivienda shock usura]",
            "    A5[08 Ilustracion 2.0]",
            "    A1 --> A2 --> A3 --> A4 --> A5",
            "  end",
            "  Piramide[concentracion patrimonial] --> A1",
            "  A5 --> Protocolo[ciudadano protocolo vs NRx]",
            "```",
            "",
            "## Guía de consulta",
            "",
            "| Pregunta | Escena |",
            "|----------|--------|",
            "| ¿Pirámide riqueza España / percentiles? | `01-piramide-riqueza-espana/output.md` |",
            "| ¿Tabla objetividad Borrego/decrecimiento? | `02-moderador-objetividad-borrego/output.md` |",
            "| ¿Referencias respondiente (URSS, Ponzi)? | `03-ayuda-respondiente-referencias/output.md` |",
            "| ¿Greenwashing vs ciencia climática? | `04-greenwashing-ipcc-montreal/output.md` |",
            "| ¿Hipotecas 10 años / corralito? | `05-borrego-replica-vivienda-10-anos/output.md` |",
            "| ¿«El capital nos mea y dice que llueve»? | `06-conclusion-capital-mea-llueve/output.md` |",
            "| ¿Mapa antagonistas crédito vivienda? | `07-vivienda-shock-antagonistas-jesus/output.md` |",
            "| ¿Ilustración 2.0 ciudadano-protocolo? | `08-ilustracion-2-ciudadano-protocolo/output.md` |",
            "",
            "## Cobertura",
            "",
            f"- `logs-agent-1.md`: {src1} líneas",
            f"- `logs-agent-2.md`: {src2} líneas",
            f"- Escenas: {coverage.get('scenes', '?')}",
            f"- Verificación: {'OK' if coverage.get('ok') else 'ISSUES — ver manifest'}",
            "",
            "Regenerar: `python3 segment_engine_model_c_log.py`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    sources = {
        "raw/logs-agent-1.md": ROOT / "raw" / "logs-agent-1.md",
        "raw/logs-agent-2.md": ROOT / "raw" / "logs-agent-2.md",
    }
    all_lines: dict[str, list[str]] = {}
    line_counts: dict[str, int] = {}
    for src, path in sources.items():
        if not path.exists():
            raise SystemExit(f"Source log missing: {path}")
        all_lines[src] = read_lines(path)
        line_counts[src] = len(all_lines[src])

    manifest = [build_scene(all_lines, sc) for sc in SCENES]
    coverage = verify_line_coverage(line_counts)
    file_check = verify_files(manifest)

    (ROOT / "manifest.json").write_text(
        json.dumps(
            {
                "engine": ENGINE_ID,
                "cohen_type": "political_economy",
                "description": "Force economía política ES — pirámide riqueza, debate capitalismo, Ilustración 2.0",
                "anchor_scene": f"{SESSION}/01-piramide-riqueza-espana",
                "sources": [
                    {"file": "raw/logs-agent-1.md", "lines": line_counts["raw/logs-agent-1.md"]},
                    {"file": "raw/logs-agent-2.md", "lines": line_counts["raw/logs-agent-2.md"]},
                ],
                "scenes": manifest,
                "coverage": coverage,
                "verification": file_check,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    (ROOT / "INDICE.md").write_text(build_indice(manifest, coverage), encoding="utf-8")

    result = {
        "scenes": len(manifest),
        "files": file_check["files"],
        "coverage": coverage,
        "file_check": file_check,
        "anchor": f"{SESSION}/01-piramide-riqueza-espana",
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
