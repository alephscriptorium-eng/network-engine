#!/usr/bin/env python3
"""Segment main-engine raw logs into boot aesthetic corpus (Cohen Force)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ENGINE_ID = "main-engine"
LOG_FORMAT = "plain_dialog"
SESSION = "sesion-01-boot-estetico-operativo"
ENGINE_TAGS = ["engine", "main_engine", "boot", "esteta", "cohen_force"]

ROOT = Path(__file__).parent
OUT = ROOT

FOOTER = "This response is AI-generated, for reference only."
WE_NEED = re.compile(r"^We need to\b")
INTERPRETATION = re.compile(r"^Interpretation:")

RAW_SOURCES = [
    {"file": "raw/agent-logs-1.md", "path": ROOT / "raw" / "agent-logs-1.md"},
    {"file": "raw/agent-logs-2.md", "path": ROOT / "raw" / "agent-logs-2.md"},
]

SCENES = [
    {
        "id": "s01-01",
        "slug": "01-aspirate-a-esteta",
        "title": "Aspírate a esteta — mantra hacklab (escena ancla boot)",
        "source_file": "raw/agent-logs-1.md",
        "lines": (1, 33),
        "prompt_line": 1,
        "prompt_end": 3,
        "output_start": 5,
        "tags": [*ENGINE_TAGS, "ancla", "hacklab", "percepcion", "mantra"],
        "anomalies": ["sin_think_explicito_dialogo_plano"],
        "anchor": True,
    },
    {
        "id": "s01-02",
        "slug": "02-aspirate-esencia",
        "title": "Aspírate a esteta — esencia sin lore hacklab",
        "source_file": "raw/agent-logs-1.md",
        "lines": (34, 60),
        "prompt_line": 35,
        "prompt_end": 36,
        "output_start": 37,
        "tags": [*ENGINE_TAGS, "percepcion", "mirada", "anti-funcional"],
        "anomalies": ["correccion_usuario_quita_lore_hacklab"],
    },
    {
        "id": "s02-01",
        "slug": "03-consenso-hibrido-blockchain",
        "title": "Consenso híbrido PoW/PoS/PoT — marco ficcional DevOps",
        "source_file": "raw/agent-logs-2.md",
        "lines": (1, 214),
        "prompt_line": 1,
        "prompt_end": 3,
        "think_start": 5,
        "think_end": 55,
        "output_start": 57,
        "tags": [*ENGINE_TAGS, "blockchain", "devops", "ficcion_operativa", "consenso"],
        "anomalies": [
            "marco_ficcional_no_canon_tecnico",
            "titulo_linea_1_incluido_en_prompt",
        ],
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


def strip_footer(text: str) -> tuple[str, bool]:
    had = FOOTER in text
    text = text.replace(FOOTER, "").strip()
    return text, had


def is_trace_line(line: str) -> bool:
    s = line.strip()
    return bool(s) and s == FOOTER


def is_think_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    return bool(WE_NEED.match(s) or INTERPRETATION.match(s))


def extract_range_scene(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    ls, le = scene["lines"]
    prompt_start = scene["prompt_line"]
    prompt_end = scene.get("prompt_end", prompt_start)
    trace_line_nums = set(scene.get("trace_lines", []))

    think_ranges: list[tuple[int, int]] = []
    if "think_start" in scene:
        think_ranges = [(scene["think_start"], scene["think_end"])]

    output_ranges: list[tuple[int, int]] = []
    if "output_ranges" in scene:
        output_ranges = scene["output_ranges"]
    else:
        output_ranges = [(scene["output_start"], le)]

    prompt_lines: list[int] = scene.get("prompt_lines", [])
    if not prompt_lines:
        prompt_lines = list(range(prompt_start, prompt_end + 1))

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

        if i in prompt_lines:
            if not is_think_line(line):
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
        "session": SESSION,
        "source_file": source_file,
        "source_lines": source_lines,
        "layer": layer,
        "tags": tags,
        "engine_id": ENGINE_ID,
    }
    if extra:
        meta.update(extra)
    if had_footer and layer == "output":
        meta["ai_generated_footer_stripped"] = True
    path = folder / name
    path.write_text(yaml_frontmatter(meta) + body.strip() + "\n", encoding="utf-8")
    return path


def source_path_for(file_ref: str) -> Path:
    for src in RAW_SOURCES:
        if src["file"] == file_ref:
            return src["path"]
    raise KeyError(f"Unknown source file: {file_ref}")


def build_scene(lines_by_file: dict[str, list[str]], scene: dict) -> dict:
    src_file = scene["source_file"]
    lines = lines_by_file[src_file]
    ls, le = scene["lines"]
    folder = OUT / SESSION / scene["slug"]
    folder.mkdir(parents=True, exist_ok=True)

    prompt, think, output, trace = extract_range_scene(lines, scene)
    tags = scene.get("tags", ENGINE_TAGS)
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
            src_file,
            [ls, le],
            layer_name,
            tags,
        )
        if p:
            files[layer_name] = str(p.relative_to(OUT))

    entry: dict = {
        "id": scene["id"],
        "session": SESSION,
        "slug": scene["slug"],
        "source": {"file": src_file, "line_start": ls, "line_end": le},
        "title": scene["title"],
        "engine_id": ENGINE_ID,
        "tags": tags,
        "files": files,
        "anomalies": scene.get("anomalies", []),
    }
    if scene.get("anchor"):
        entry["anchor"] = True
    return entry


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

        if ranges[0][0] != 1:
            issues.append(f"{file_ref}: first scene starts at {ranges[0][0]}, expected 1")
        if ranges[-1][1] != total:
            issues.append(f"{file_ref}: last scene ends at {ranges[-1][1]}, expected {total}")

        for ls, le in ranges:
            for i in range(ls, le + 1):
                if i in covered:
                    issues.append(f"{file_ref}: duplicate line {i}")
                covered.add(i)

        for i in range(1, total + 1):
            if i not in covered:
                line_text = lines_by_file[file_ref][i - 1].strip()
                if line_text:
                    issues.append(f"{file_ref}: gap at non-blank line {i}: {line_text[:50]!r}")
                else:
                    issues.append(f"{file_ref}: gap at blank line {i}")

        file_ok = (
            ranges[0][0] == 1
            and ranges[-1][1] == total
            and len(covered) == total
            and not any(x.startswith(f"{file_ref}:") for x in issues)
        )
        per_file[file_ref] = {
            "total_lines": total,
            "covered_lines": len(covered),
            "scenes": len(file_scenes),
            "ok": file_ok,
        }

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
        "# INDICE — corpus main-engine (boot Cohen)",
        "",
        "**Rol:** motor estético dummy — siempre ON en Modo Aleph. No aporta viewpoint político;",
        "reconfigura la percepción («mirar sin prisa por usar»).",
        "",
        "Escena ancla: [`01-aspirate-a-esteta`](sesion-01-boot-estetico-operativo/01-aspirate-a-esteta/).",
        "",
        "Fuentes:",
        "- [`raw/agent-logs-1.md`](raw/agent-logs-1.md) (60 líneas) — mantra «aspírate a esteta»",
        "- [`raw/agent-logs-2.md`](raw/agent-logs-2.md) (214 líneas) — consenso híbrido blockchain/DevOps",
        "",
        "**Nota:** el marco DevOps/blockchain en log-2 es **ficción operativa** del engine, no canon técnico del repo.",
        "",
        "Plan: [`../PLAN-multitask-engines.md`](../PLAN-multitask-engines.md) · Registry: [`../manifest.json`](../manifest.json)",
        "",
        "## Tabla de escenas",
        "",
        "| ID | Escena | Resumen | Tags |",
        "|----|--------|---------|------|",
    ]
    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        anchor = " ⚓" if sc.get("anchor") else ""
        tags = ", ".join(f"`{t}`" for t in sc["tags"][:5])
        lines.append(
            f"| [{sc['id']}]({rel}/) | [{sc['slug']}]({rel}/){anchor} | {sc['title']} | {tags} |"
        )

    lines.extend(
        [
            "",
            "## Mapa conceptual",
            "",
            "```mermaid",
            "flowchart LR",
            "  A1[01 Aspirate hacklab ancla]",
            "  A2[02 Aspirate esencia]",
            "  A3[03 Blockchain hibrido ficcion]",
            "  A1 --> A2 --> A3",
            "  A1 -.->|boot Modo Aleph| A2",
            "```",
            "",
            "## Guía de consulta",
            "",
            "| Pregunta | Escena |",
            "|----------|--------|",
            "| ¿Boot estético / ancla Cohen? | `01-aspirate-a-esteta/output.md` |",
            "| ¿Definición sin lore hacklab? | `02-aspirate-esencia/output.md` |",
            "| ¿Marco ficcional DevOps/blockchain? | `03-consenso-hibrido-blockchain/output.md` |",
            "",
            "## Anomalías documentadas",
            "",
            "- **s01-01**: diálogo plano sin bloque think; versión con lore hacklab (corregida en s01-02).",
            "- **s01-02**: corrección explícita del usuario («quita el lore hacklab»).",
            "- **s02-01**: think largo en inglés (`We need to`); blockchain es marco ficcional, no spec real.",
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
            "",
            "## Estructura",
            "",
            "```",
            "main-engine/",
            "├── raw/agent-logs-1.md",
            "├── raw/agent-logs-2.md",
            "├── segment_main_engine_log.py",
            "├── engine.json",
            "├── manifest.json",
            "├── INDICE.md",
            "└── sesion-01-boot-estetico-operativo/",
            "```",
            "",
            "Regenerar: `python3 segment_main_engine_log.py`",
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
                "engine_id": ENGINE_ID,
                "role": "boot",
                "log_format": LOG_FORMAT,
                "sources": [
                    {"file": s["file"], "lines": len(lines_by_file[s["file"]])}
                    for s in RAW_SOURCES
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
        "engine_id": ENGINE_ID,
        "scenes": len(manifest),
        "files": file_check["files"],
        "coverage": coverage,
        "file_check": file_check,
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
