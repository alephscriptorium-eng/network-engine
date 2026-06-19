#!/usr/bin/env python3
"""Segment engine-model-D raw logs into Cohen Force corpus (credos + paradigmas IA)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ENGINE_ID = "engine-model-D"
ROOT = Path(__file__).parent
OUT = ROOT

FOOTER = "This response is AI-generated, for reference only."
WE_NEED = re.compile(r"^We need to\b")
SEARCH_UNAVAILABLE = re.compile(r"Search is unavailable", re.I)

RAW_SOURCES = [
    {"file": "raw/logs-agent-1.md", "path": ROOT / "raw" / "logs-agent-1.md"},
    {"file": "raw/logs-agent-2.md", "path": ROOT / "raw" / "logs-agent-2.md"},
]

FORCE_TAGS = ["force:D", "credos", "conversion", "apostasia"]
PARADIGM_TAGS = ["force:D", "credos", "paradigmas", "chardin", "ia"]

SCENES = [
    {
        "id": "d01-01",
        "session": "sesion-01-conversion-apostasia",
        "slug": "01-conversion-apostasia-tablas",
        "title": "Tabla 1 — monoteísmos abrahámicos (entrada / salida)",
        "source_file": "raw/logs-agent-1.md",
        "lines": (1, 31),
        "prompt_lines": [1, 3],
        "trace_lines": [5],
        "output_start": 7,
        "output_end": 31,
        "tags": [*FORCE_TAGS, "monoteismos", "judaismo", "cristianismo", "islam", "ancla"],
        "rol": "ancla",
        "anomalies": ["titulo_contexto_linea_1_mezclado_con_prompt"],
    },
    {
        "id": "d01-02",
        "session": "sesion-01-conversion-apostasia",
        "slug": "02-otras-religiones-mayoritarias",
        "title": "Tabla 2 — hinduismo, budismo, sijismo",
        "source_file": "raw/logs-agent-1.md",
        "lines": (32, 52),
        "output_start": 33,
        "output_end": 52,
        "tags": [*FORCE_TAGS, "hinduismo", "budismo", "sijismo", "continuacion"],
        "rol": "continuacion",
        "anomalies": ["sin_nuevo_prompt_usuario"],
    },
    {
        "id": "d02-01",
        "session": "sesion-02-paradigmas-ia-chardin",
        "slug": "01-paradigma-api-p2p-chardin",
        "title": "Tabla comparativa API centralizada vs P2P/SLM — lente Teilhard de Chardin",
        "source_file": "raw/logs-agent-2.md",
        "lines": (1, 54),
        "prompt_lines": [1],
        "trace_lines": [3],
        "think_start": 5,
        "think_end": 39,
        "output_start": 41,
        "output_end": 53,
        "tags": [*PARADIGM_TAGS, "api", "p2p", "petals", "slm", "2001", "solaris", "ancla_sesion"],
        "rol": "ancla_sesion",
        "anomalies": ["titulo_linea_1_como_contexto", "prompt_usuario_no_explicito"],
    },
    {
        "id": "d02-02",
        "session": "sesion-02-paradigmas-ia-chardin",
        "slug": "02-freepi-magnific-solaris",
        "title": "FreePI y Magnific — proyectos FOSS españoles en clave Solaris/P2P",
        "source_file": "raw/logs-agent-2.md",
        "lines": (55, 127),
        "prompt_lines": [55],
        "trace_lines": [57, 127],
        "think_start": 59,
        "think_end": 101,
        "output_start": 103,
        "output_end": 125,
        "tags": [*PARADIGM_TAGS, "freepi", "magnific", "foss", "solaris", "continuacion"],
        "rol": "continuacion",
        "anomalies": [
            "prompt_embebido_en_think_linea_61",
            "proyectos_inferidos_sin_repo",
            "footer_ai_linea_127",
        ],
    },
]

ANCHOR_SCENE = "sesion-01-conversion-apostasia/01-conversion-apostasia-tablas"


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


def strip_footer(text: str) -> tuple[str, bool]:
    had = FOOTER in text
    text = text.replace(FOOTER, "").strip()
    return text, had


def is_trace_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if s == FOOTER:
        return True
    return bool(SEARCH_UNAVAILABLE.search(s))


def extract_layers(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    ls, le = scene["lines"]
    prompt_line_nums = set(scene.get("prompt_lines", []))
    trace_line_nums = set(scene.get("trace_lines", []))

    think_ranges: list[tuple[int, int]] = []
    if "think_start" in scene:
        think_ranges = [(scene["think_start"], scene["think_end"])]

    output_ranges: list[tuple[int, int]] = []
    if "output_ranges" in scene:
        output_ranges = scene["output_ranges"]
    elif "output_start" in scene:
        output_end = scene.get("output_end", le)
        output_ranges = [(scene["output_start"], output_end)]

    think_line_nums: set[int] = set()
    for ts, te in think_ranges:
        think_line_nums.update(range(ts, te + 1))

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
            prompt_parts.append(stripped)
            continue

        if i in think_line_nums:
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
    session: str,
    source_file: str,
    source_lines: list[int],
    layer: str,
    tags: list[str],
    extra: dict | None = None,
) -> Path | None:
    if not body.strip():
        return None
    body, had_footer = strip_footer(body)
    meta: dict = {
        "scene_id": scene_id,
        "session": session,
        "engine": ENGINE_ID,
        "source_file": source_file,
        "source_lines": source_lines,
        "layer": layer,
        "tags": tags,
    }
    if extra:
        meta.update(extra)
    if had_footer and layer == "output":
        meta["ai_generated_footer_stripped"] = True
    path = folder / name
    path.write_text(yaml_frontmatter(meta) + body.strip() + "\n", encoding="utf-8")
    return path


def build_scene(lines_by_file: dict[str, list[str]], scene: dict) -> dict:
    src_file = scene["source_file"]
    lines = lines_by_file[src_file]
    session = scene["session"]
    ls, le = scene["lines"]
    folder = OUT / session / scene["slug"]
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
            session,
            src_file,
            [ls, le],
            layer_name,
            tags,
            extra={"rol": scene["rol"]} if layer_name == "prompt" and body.strip() else None,
        )
        if p:
            files[layer_name] = str(p.relative_to(OUT))

    return {
        "id": scene["id"],
        "session": session,
        "slug": scene["slug"],
        "source": {"file": src_file, "line_start": ls, "line_end": le},
        "title": scene["title"],
        "engine": ENGINE_ID,
        "rol": scene["rol"],
        "tags": scene["tags"],
        "files": files,
        "anomalies": scene.get("anomalies", []),
    }


def verify_line_coverage(lines_by_file: dict[str, list[str]]) -> dict:
    issues: list[str] = []
    per_file: dict[str, dict] = {}

    for src in RAW_SOURCES:
        file_ref = src["file"]
        total = len(lines_by_file[file_ref])
        file_scenes = [sc for sc in SCENES if sc["source_file"] == file_ref]
        if not file_scenes:
            issues.append(f"{file_ref}: no scenes defined")
            continue

        ranges = sorted(sc["lines"] for sc in file_scenes)
        covered: set[int] = set()
        file_issues: list[str] = []

        if ranges[0][0] != 1:
            file_issues.append(f"first scene starts at {ranges[0][0]}, expected 1")
        if ranges[-1][1] != total:
            file_issues.append(f"last scene ends at {ranges[-1][1]}, expected {total}")

        for ls, le in ranges:
            for i in range(ls, le + 1):
                if i in covered:
                    file_issues.append(f"duplicate line {i}")
                covered.add(i)

        for i in range(1, total + 1):
            if i not in covered:
                file_issues.append(f"gap at line {i}")

        file_ok = (
            ranges[0][0] == 1
            and ranges[-1][1] == total
            and len(covered) == total
            and not file_issues
        )
        per_file[file_ref] = {
            "total_lines": total,
            "covered_lines": len(covered),
            "scenes": len(file_scenes),
            "ok": file_ok,
        }
        issues.extend(f"{file_ref}: {x}" for x in file_issues)

    return {
        "sources": per_file,
        "total_lines": sum(len(v) for v in lines_by_file.values()),
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
                if layer == "prompt" and sc["rol"] == "continuacion":
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
        "# INDICE — engine-model-D (Cohen Force credos)",
        "",
        "## Rol en Modo Aleph",
        "",
        "**Force D:** credos — tablas comparadas de conversión/apostasía y paradigmas tecnológicos.",
        "",
        f"Escena ancla: [`01-conversion-apostasia-tablas`]({ANCHOR_SCENE}/).",
        "Sesión 02: paradigmas IA (API vs P2P/SLM) con lente Teilhard de Chardin.",
        "",
        "Fuentes:",
        "- [`raw/logs-agent-1.md`](raw/logs-agent-1.md) (52 líneas) — conversión/apostasía en religiones mayoritarias",
        "- [`raw/logs-agent-2.md`](raw/logs-agent-2.md) (127 líneas) — paradigmas IA, FreePI, Magnific",
        "",
        "Registry: [`../manifest.json`](../manifest.json) · Ficha: [`engine.json`](engine.json).",
        "Contraste sugerido: [`engine-model-F`](../engine-model-F/) (poético), [`cima-aleph`](../../cima-aleph/INDICE.md).",
        "",
        "## Visión del hilo",
        "",
        "Log-1 parte de tablas entrada/salida por credo: monoteísmos abrahámicos, luego hinduismo,",
        "budismo y sijismo. Log-2 traslada el contraste 2001/Solaris al ecosistema IA (API centralizada",
        "vs P2P/Petals/SLM) con Teilhard de Chardin, y añade FreePI y Magnific como ejemplos FOSS españoles.",
        "",
        "## Tabla de escenas",
        "",
        "| ID | Escena | Sesión | Fuente | Líneas | Rol | Resumen | Tags |",
        "|----|--------|--------|--------|--------|-----|---------|------|",
    ]
    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        src = sc["source"]["file"].replace("raw/", "")
        lr = f"{sc['source']['line_start']}–{sc['source']['line_end']}"
        tags = ", ".join(f"`{t}`" for t in sc["tags"][:4])
        lines.append(
            f"| [{sc['id']}]({rel}/) | [{sc['slug']}]({rel}/) | `{sc['session']}` | `{src}` | {lr} | `{sc['rol']}` | {sc['title']} | {tags} |"
        )

    lines.extend(
        [
            "",
            "## Mapa conceptual",
            "",
            "```mermaid",
            "flowchart TB",
            "  subgraph log1 [Log 1 conversion apostasia]",
            "    A1[01 Monoteismos abrahamicos]",
            "    A2[02 Otras religiones mayoritarias]",
            "    A1 --> A2",
            "  end",
            "  subgraph log2 [Log 2 paradigmas IA Chardin]",
            "    B1[01 API vs P2P SLM]",
            "    B2[02 FreePI Magnific Solaris]",
            "    B1 --> B2",
            "  end",
            "  Prompt[tablas entrada salida] --> A1",
            "  A2 --> Credos[credo ruptura confesional]",
            "  Chardin[Teilhard noosfera Omega] --> B1",
            "  B2 --> FOSS[freepi magnific foss]",
            "```",
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
            "| ¿Conversión/apostasía en judaísmo, cristianismo, islam? | `sesion-01-conversion-apostasia/01-conversion-apostasia-tablas/output.md` |",
            "| ¿Hinduismo, budismo, sijismo — entrada y salida? | `sesion-01-conversion-apostasia/02-otras-religiones-mayoritarias/output.md` |",
            "| ¿API centralizada vs P2P/SLM con Chardin? | `sesion-02-paradigmas-ia-chardin/01-paradigma-api-p2p-chardin/output.md` |",
            "| ¿FreePI y Magnific en clave Solaris? | `sesion-02-paradigmas-ia-chardin/02-freepi-magnific-solaris/output.md` |",
            "",
            "## Cobertura",
            "",
        ]
    )
    for file_ref, stats in coverage.get("sources", {}).items():
        ok = "OK" if stats.get("ok") else "ISSUES"
        lines.append(
            f"- `{file_ref}`: {stats.get('covered_lines', '?')}/{stats.get('total_lines', '?')} líneas · {ok}"
        )
    lines.extend(
        [
            f"- Total: {coverage.get('total_lines', '?')} líneas · "
            f"{'OK' if coverage.get('ok') else 'ISSUES'}",
            "",
            "## Estructura",
            "",
            "```",
            "engine-model-D/",
            "├── raw/logs-agent-1.md",
            "├── raw/logs-agent-2.md",
            "├── segment_engine_model_d_log.py",
            "├── manifest.json",
            "├── INDICE.md",
            "├── engine.json",
            "├── sesion-01-conversion-apostasia/",
            "└── sesion-02-paradigmas-ia-chardin/",
            "```",
            "",
            "Regenerar: `python3 segment_engine_model_d_log.py`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    lines_by_file: dict[str, list[str]] = {}
    for src in RAW_SOURCES:
        path = src["path"]
        if not path.exists():
            raise SystemExit(f"Source log missing: {path}")
        lines_by_file[src["file"]] = read_lines(path)

    manifest = [build_scene(lines_by_file, sc) for sc in SCENES]
    coverage = verify_line_coverage(lines_by_file)
    file_check = verify_files(manifest)

    (OUT / "manifest.json").write_text(
        json.dumps(
            {
                "engine": ENGINE_ID,
                "cohen_type": "credos",
                "description": "Force credos — conversión/apostasía + paradigmas IA/Chardin",
                "anchor_scene": ANCHOR_SCENE,
                "sources": [
                    {"file": s["file"], "lines": len(lines_by_file[s["file"]])}
                    for s in RAW_SOURCES
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
    (OUT / "INDICE.md").write_text(build_indice(manifest, coverage), encoding="utf-8")

    result = {
        "scenes": len(manifest),
        "files": file_check["files"],
        "coverage": coverage,
        "file_check": file_check,
        "anchor": ANCHOR_SCENE,
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
