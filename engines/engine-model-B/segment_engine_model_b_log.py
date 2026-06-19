#!/usr/bin/env python3
"""Segment engine-model-B raw logs into Cohen Force corpus (disobedience / omega-manhattan)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
OUT = ROOT
SESSION = "sesion-01-omega-manhattan"
ENGINE_ID = "engine-model-B"

FOOTER = "This response is AI-generated, for reference only."
SEARCH_UNAVAILABLE = re.compile(r"Search is unavailable", re.I)
WE_NEED = re.compile(r"^We need to\b")
INTERPRETATION = re.compile(r"^Interpretation:")
TRACE_FOUND = re.compile(r"^Found \d+ web pages", re.I)
TRACE_READ = re.compile(r"^Read \d+ (web pages|pages)", re.I)
TRACE_LINK = re.compile(r"^\[.+\]\(https?://")

FORCE_TAGS = ["force:B", "cohen:disobedience", "satyagraha", "omega-manhattan"]

SCENES: list[dict] = [
    {
        "id": "b01-01",
        "slug": "01-pieza-1-desierto-satyagraha",
        "title": "Pieza 1 rediseñada — desierto, rueca y flor de azafrán",
        "source": "raw/logs-agent-1.md",
        "lines": (1, 70),
        "prompt_lines": [1],
        "think_start": 3,
        "think_end": 13,
        "output_start": 15,
        "tags": [*FORCE_TAGS, "Duran", "videoclip", "politicas"],
        "rol": "apertura",
        "anomalies": ["prompt_embebido_en_think_linea_3"],
    },
    {
        "id": "b01-02",
        "slug": "02-manhattan-berlin-satyagraha",
        "title": "Manhattan y Berlín — eje financiero y contracultura",
        "source": "raw/logs-agent-1.md",
        "lines": (71, 128),
        "prompt_lines": [72],
        "trace_lines": [74],
        "think_start": 76,
        "think_end": 90,
        "output_start": 92,
        "tags": [*FORCE_TAGS, "Cohen", "Lucio-Urtubia", "Faircoin"],
        "rol": "simbolismo",
        "anomalies": ["expert_mode_search_unavailable"],
    },
    {
        "id": "b01-03",
        "slug": "03-heliogabalo-triptico-mujeres",
        "title": "Heliogábalo-Gandhi — Catalina de Erauso y Baronesa Elsa",
        "source": "raw/logs-agent-1.md",
        "lines": (129, 318),
        "prompt_lines": [129],
        "trace_lines": [131],
        "think_start": 133,
        "think_end": 276,
        "output_start": 278,
        "tags": [*FORCE_TAGS, "Heliogabalo", "genero", "desobediencia-barroca"],
        "rol": "reescritura",
        "anomalies": ["think_largo_144_lineas"],
    },
    {
        "id": "b01-04",
        "slug": "04-omega-manhattan",
        "title": "Omega «primero Manhattan y después Berlín» — ancla Morente/Cohen",
        "source": "raw/logs-agent-2.md",
        "lines": (1, 38),
        "prompt_lines": [1, 3],
        "trace_lines": [7, 11],
        "think_ranges": [(5, 5), (9, 9), (21, 21)],
        "output_start": 23,
        "tags": [*FORCE_TAGS, "Morente", "Lagartija-Nick", "ancla"],
        "rol": "ancla",
        "anchor": True,
        "anomalies": ["titulo_como_prompt_linea_1"],
    },
    {
        "id": "b01-05",
        "slug": "05-omega-lore-terrorista-poetico",
        "title": "Lore real Omega — canción terrorista, Lorca y documental",
        "source": "raw/logs-agent-2.md",
        "lines": (39, 97),
        "prompt_lines": [39],
        "trace_lines": [45, 49, 61, 65],
        "think_ranges": [(41, 41), (43, 43), (47, 47), (67, 67)],
        "output_start": 69,
        "tags": [*FORCE_TAGS, "Lorca", "terrorismo-poetico", "documental"],
        "rol": "profundizacion",
        "anomalies": ["enumeracion_descafeinada_rechazada"],
    },
    {
        "id": "b01-06",
        "slug": "06-tangentes-cypherpunk-sputnik",
        "title": "Tangentes — cypherpunk vs cyberpunk y Sputnik 1",
        "source": "raw/logs-agent-2.md",
        "lines": (98, 144),
        "prompt_lines": [100, 120],
        "trace_lines": [124, 128, 134],
        "think_ranges": [(102, 102), (122, 122)],
        "output_ranges": [(104, 116), (140, 144)],
        "tags": [*FORCE_TAGS, "cypherpunk", "Sputnik", "tangente"],
        "rol": "tangente",
        "anomalies": ["dos_turnos_en_una_escena"],
    },
]


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
    if SEARCH_UNAVAILABLE.search(s):
        return True
    if TRACE_FOUND.match(s) or TRACE_READ.match(s):
        return True
    if TRACE_LINK.match(s):
        return True
    if s == "View All":
        return True
    return False


def is_think_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if WE_NEED.match(s) or INTERPRETATION.match(s):
        return True
    if s.startswith("The user is asking") or s.startswith("The search results"):
        return True
    if s.startswith("To provide") or s.startswith("I'll ") or s.startswith("Now I have"):
        return True
    if s.startswith("My answer") or s.startswith("The Wikipedia"):
        return True
    return False


def join_range(lines: list[str], start: int, end: int) -> str:
    return "".join(lines[start - 1 : end]).rstrip("\n")


def extract_layers(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    ls, le = scene["lines"]
    prompt_line_nums = set(scene.get("prompt_lines", []))
    trace_line_nums = set(scene.get("trace_lines", []))

    think_ranges = scene.get("think_ranges")
    if think_ranges is None and "think_start" in scene:
        think_ranges = [(scene["think_start"], scene["think_end"])]
    think_line_nums: set[int] = set()
    for ts, te in think_ranges or []:
        think_line_nums.update(range(ts, te + 1))

    output_ranges = scene.get("output_ranges")
    if output_ranges is None:
        output_start = scene.get("output_start", le)
        output_ranges = [(output_start, le)]

    output_line_nums: set[int] = set()
    for os_, oe in output_ranges:
        output_line_nums.update(range(os_, oe + 1))

    prompt_parts: list[str] = []
    trace_parts: list[str] = []
    think_parts: list[str] = []
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
            if not is_think_line(stripped):
                prompt_parts.append(stripped)
            continue

        if i in think_line_nums or (
            not prompt_line_nums
            and is_think_line(stripped)
            and i not in output_line_nums
        ):
            if stripped.strip() != FOOTER:
                think_parts.append(stripped)
            continue

        if i in output_line_nums:
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


def build_scene(lines: list[str], scene: dict) -> dict:
    ls, le = scene["lines"]
    source = scene["source"]
    folder = OUT / SESSION / scene["slug"]
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
        p = write_layer(
            folder,
            f"{layer_name}.md",
            content,
            scene["id"],
            source,
            [ls, le],
            layer_name,
            tags,
            extra={"engine": ENGINE_ID, "rol": scene["rol"]} if layer_name == "prompt" else None,
        )
        if p:
            files[layer_name] = str(p.relative_to(OUT))

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


def verify_line_coverage(sources: dict[str, list[str]]) -> dict:
    issues: list[str] = []
    per_file: dict[str, dict] = {}

    for src, scenes in sources.items():
        total = len(read_lines(RAW / Path(src).name))
        ranges = sorted(sc["lines"] for sc in scenes)
        file_issues: list[str] = []

        if ranges[0][0] != 1:
            file_issues.append(f"first scene starts at {ranges[0][0]}, expected 1")
        if ranges[-1][1] != total:
            file_issues.append(f"last scene ends at {ranges[-1][1]}, expected {total}")

        covered: set[int] = set()
        for ls, le in ranges:
            for i in range(ls, le + 1):
                if i in covered:
                    file_issues.append(f"duplicate line {i}")
                covered.add(i)

        for i in range(1, total + 1):
            if i not in covered:
                file_issues.append(f"gap at line {i}")

        per_file[src] = {
            "total_lines": total,
            "covered_lines": len(covered),
            "scenes": len(scenes),
            "issues": file_issues,
            "ok": len(file_issues) == 0,
        }
        issues.extend(f"{src}: {x}" for x in file_issues)

    return {
        "files": per_file,
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
            p = OUT / rel
            if not p.exists():
                issues.append(f"Missing: {p}")
            elif p.stat().st_size == 0:
                issues.append(f"Empty: {p}")
    return {"files": file_count, "issues": issues, "ok": len(issues) == 0}


def build_indice(manifest: list[dict], coverage: dict) -> str:
    lines = [
        "# INDICE — engine-model-B (Cohen Force desobediencia)",
        "",
        "## Rol en Modo Aleph",
        "",
        "**Force B:** satyagraha económica — Duran, Lucio Urtubia, Omega Morente/Cohen",
        "como forcing de desobediencia civil frente al sistema financiero.",
        "",
        "Escena ancla: [`04-omega-manhattan`](sesion-01-omega-manhattan/04-omega-manhattan/).",
        "",
        "Registry: [`../manifest.json`](../manifest.json) · Ficha: [`engine.json`](engine.json).",
        "Contraste sugerido: [`engine-model-E`](../engine-model-E/) (NRx), [`sima-aleph`](../../sima-aleph/INDICE.md).",
        "",
        "## Visión del hilo",
        "",
        "El corpus parte de un videoclip mental satyagraha (Duran, Gandhi, Lucio, Lorca-Cohen-Morente),",
        "profundiza el eje Manhattan/Berlín como desobediencia económica, reescribe la tríada con",
        "Heliogábalo y dos mujeres históricas, y en el segundo log despliega el lore de *Omega*",
        "(Morente, Cohen, Lagartija Nick, Lorca) hasta tangentes cypherpunk y Sputnik.",
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
            "  subgraph b01 [Sesion 01 omega manhattan]",
            "    A1[01 Pieza 1 desierto]",
            "    A2[02 Manhattan Berlin]",
            "    A3[03 Heliogabalo triptico]",
            "    A4[04 Omega Manhattan ancla]",
            "    A5[05 Lore terrorista poetico]",
            "    A6[06 Tangentes]",
            "    A1 --> A2 --> A3",
            "    A3 -.-> A4",
            "    A4 --> A5 --> A6",
            "  end",
            "  Duran[Duran satyagraha] --> A1",
            "  A4 --> Morente[Morente Omega Cohen]",
            "```",
            "",
            "## Fuentes",
            "",
            "| Archivo | Líneas | Escenas |",
            "|---------|--------|---------|",
        ]
    )
    for src, info in coverage.get("files", {}).items():
        lines.append(
            f"| [`{src}`]({src}) | {info.get('total_lines', '?')} | "
            f"{info.get('scenes', '?')} · {'OK' if info.get('ok') else 'ISSUES'} |"
        )

    lines.extend(
        [
            "",
            "## Anomalías documentadas",
            "",
        ]
    )
    for sc in manifest:
        if sc.get("anomalies"):
            lines.append(f"- **{sc['id']}** ({sc['slug']}): {', '.join(sc['anomalies'])}")

    lines.extend(
        [
            "",
            "## Guía de consulta",
            "",
            "| Pregunta | Escena |",
            "|----------|--------|",
            "| ¿Rediseño Pieza 1 sin políticas explícitas? | `01-pieza-1-desierto-satyagraha/output.md` |",
            "| ¿Por qué Manhattan y Berlín en Cohen/Duran? | `02-manhattan-berlin-satyagraha/output.md` |",
            "| ¿Heliogábalo, Erauso, Elsa von Freytag-Loringhoven? | `03-heliogabalo-triptico-mujeres/output.md` |",
            "| ¿«Primero Manhattan y después Berlín» en Omega? | `04-omega-manhattan/output.md` |",
            "| ¿Lore terrorista poético / documental Omega? | `05-omega-lore-terrorista-poetico/output.md` |",
            "",
            "## Cobertura",
            "",
            f"- Escenas: {coverage.get('scenes', '?')}",
            f"- Verificación global: {'OK' if coverage.get('ok') else 'ISSUES — ver manifest'}",
            "",
            "Regenerar: `python3 segment_engine_model_b_log.py`",
            "",
            "## Estructura",
            "",
            "```",
            "engine-model-B/",
            "├── raw/logs-agent-1.md",
            "├── raw/logs-agent-2.md",
            "├── segment_engine_model_b_log.py",
            "├── manifest.json",
            "├── INDICE.md",
            "├── engine.json",
            "└── sesion-01-omega-manhattan/",
            "```",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    by_source: dict[str, list[dict]] = {}
    for sc in SCENES:
        by_source.setdefault(sc["source"], []).append(sc)

    manifest: list[dict] = []
    for src, scenes in by_source.items():
        path = ROOT / src
        if not path.exists():
            raise SystemExit(f"Source log missing: {path}")
        lines = read_lines(path)
        for sc in scenes:
            manifest.append(build_scene(lines, sc))

    manifest.sort(key=lambda x: x["id"])
    coverage = verify_line_coverage(by_source)
    file_check = verify_files(manifest)

    (OUT / "manifest.json").write_text(
        json.dumps(
            {
                "engine": ENGINE_ID,
                "cohen_type": "disobedience",
                "description": "Force desobediencia — satyagraha Duran, Omega Morente/Cohen, Manhattan-Berlín",
                "anchor_scene": f"{SESSION}/04-omega-manhattan",
                "sources": [
                    {"file": "raw/logs-agent-1.md", "lines": 318},
                    {"file": "raw/logs-agent-2.md", "lines": 144},
                ],
                "session": SESSION,
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
    (OUT / "INDICE.md").write_text(build_indice(manifest, coverage), encoding="utf-8")

    result = {
        "scenes": len(manifest),
        "files": file_check["files"],
        "coverage": coverage,
        "file_check": file_check,
        "anchor": f"{SESSION}/04-omega-manhattan",
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
