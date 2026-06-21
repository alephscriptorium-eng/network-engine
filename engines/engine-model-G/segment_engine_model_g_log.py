#!/usr/bin/env python3
"""Segment engine-model-G/raw/logs-agent-1.md into Cohen Force corpus (agile_cicd_loop)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
LOG = RAW / "logs-agent-1.md"
SRC = "raw/logs-agent-1.md"
OUT = ROOT
SESSION = "sesion-01-agile-cicd-loop"
ENGINE_ID = "engine-model-G"

FOOTER = "This response is AI-generated, for reference only."
TRACE_READ = re.compile(r"^Read \d+ (web pages|pages)", re.I)
TRACE_FOUND = re.compile(r"^Found \d+ web pages", re.I)
TRACE_VIEWED = re.compile(r"^\*Viewed \[", re.I)

FORCE_TAGS = ["force:G", "cohen:agile_cicd_loop", "ci-cd", "scrum"]

SCENES = [
    {
        "id": "g01-01",
        "slug": "01-arquetipos-momento",
        "title": "Arquetipos ágiles — minutos antes de la ceremonia",
        "lines": (1, 35),
        "prompt_lines": [5, 7, 8, 9, 10, 11, 12, 13],
        "trace_lines": [1, 2, 3, 33, 34, 35],
        "output_start": 15,
        "output_end": 32,
        "tags": [*FORCE_TAGS, "arquetipos", "divulgacion", "contraste"],
        "rol": "contraste",
        "anomalies": ["dialogo_plano_sin_think_explicito", "cabecera_export_lineas_1_3"],
    },
    {
        "id": "g01-02",
        "slug": "02-bucle-ideas-fuerza",
        "title": "Bucle CI/CD — seis fases PLAN→FEEDBACK con ideas fuerza",
        "lines": (36, 83),
        "prompt_lines": [36],
        "trace_lines": [81, 82, 83],
        "output_start": 38,
        "output_end": 80,
        "tags": [*FORCE_TAGS, "bucle", "ideas-fuerza", "ancla"],
        "rol": "ancla",
        "anomalies": [],
    },
    {
        "id": "g01-03",
        "slug": "03-trazabilidad-index-reader",
        "title": "Misma ontología bajo 🟢🟡🔴 + traje index-reader",
        "lines": (84, 147),
        "prompt_lines": [84, 104, 106],
        "trace_lines": [86, 87, 88],
        "output_ranges": [(90, 102), (108, 147)],
        "tags": [*FORCE_TAGS, "trazabilidad", "index-reader", "forcing"],
        "rol": "forcing",
        "synthetic_forcing_demo": True,
        "anomalies": [
            "synthetic_forcing_demo",
            "dos_turnos_usuario_planner",
            "viewed_trace_lineas_86_88",
        ],
    },
]

INDICE_EXTRA_ANOMALIES = [
    "**block-10 gemini** (reader-chain): descartado — corpus canónico solo en `raw/` + `sesion-01`",
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
    if TRACE_READ.match(s) or TRACE_FOUND.match(s):
        return True
    if TRACE_VIEWED.match(s):
        return True
    return False


def join_range(lines: list[str], start: int, end: int) -> str:
    return "".join(lines[start - 1 : end]).rstrip("\n")


def in_output_ranges(i: int, scene: dict) -> bool:
    output_ranges = scene.get("output_ranges")
    if output_ranges:
        return any(os_ <= i <= oe for os_, oe in output_ranges)
    return scene["output_start"] <= i <= scene.get("output_end", scene["lines"][1])


def extract_layers(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    ls, le = scene["lines"]
    prompt_line_nums = set(scene.get("prompt_lines", [scene.get("prompt_line", ls)]))
    trace_line_nums = set(scene.get("trace_lines", []))

    prompt_parts: list[str] = []
    trace_parts: list[str] = []
    output_parts: list[str] = []

    for i in range(ls, le + 1):
        line = lines[i - 1]
        stripped = line.rstrip("\n")
        if not stripped.strip():
            continue

        if i in trace_line_nums or is_trace_line(line):
            trace_parts.append(stripped)
            continue

        if i in prompt_line_nums:
            prompt_parts.append(stripped)
            continue

        if in_output_ranges(i, scene):
            if stripped.strip() == FOOTER:
                trace_parts.append(stripped)
                continue
            output_parts.append(stripped)

    prompt = "\n\n".join(prompt_parts).strip()
    trace = "\n\n".join(trace_parts).strip()
    output = "\n".join(output_parts).strip()
    return prompt, "", output, trace


def write_layer(
    folder: Path,
    name: str,
    body: str,
    scene_id: str,
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
        "source_file": SRC,
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
    folder = OUT / SESSION / scene["slug"]
    folder.mkdir(parents=True, exist_ok=True)

    prompt, think, output, trace = extract_layers(lines, scene)
    tags = scene["tags"]
    files: dict[str, str] = {}

    synthetic = scene.get("synthetic_forcing_demo", False)
    output_path = folder / "output.md"

    for layer_name, body, layer_tag, placeholder in (
        ("prompt", prompt, "prompt", None),
        ("think", think, "think", "_(sin think explícito)_"),
        ("output", output, "output", None),
        ("trace", trace, "trace", None),
    ):
        if layer_name == "output" and synthetic and output_path.exists():
            files[layer_name] = str(output_path.relative_to(OUT))
            continue
        content = body or (placeholder or "")
        extra = None
        if layer_tag == "prompt":
            extra = {"engine": ENGINE_ID, "rol": scene["rol"]}
        elif layer_name == "output" and synthetic:
            extra = {"synthetic_forcing_demo": True}
        p = write_layer(
            folder,
            f"{layer_name}.md",
            content,
            scene["id"],
            [ls, le],
            layer_tag,
            tags,
            extra=extra,
        )
        if p:
            files[layer_name] = str(p.relative_to(OUT))

    entry = {
        "id": scene["id"],
        "session": SESSION,
        "slug": scene["slug"],
        "source": {"file": SRC, "line_start": ls, "line_end": le},
        "title": scene["title"],
        "engine": ENGINE_ID,
        "rol": scene["rol"],
        "tags": scene["tags"],
        "files": files,
        "anomalies": scene.get("anomalies", []),
    }
    if scene.get("synthetic_forcing_demo"):
        entry["synthetic_forcing_demo"] = True
    return entry


def verify_line_coverage(total_lines: int) -> dict:
    ranges = sorted(sc["lines"] for sc in SCENES)
    issues: list[str] = []

    if ranges[0][0] != 1:
        issues.append(f"first scene starts at {ranges[0][0]}, expected 1")
    if ranges[-1][1] != total_lines:
        issues.append(f"last scene ends at {ranges[-1][1]}, expected {total_lines}")

    covered = set()
    for ls, le in ranges:
        for i in range(ls, le + 1):
            if i in covered:
                issues.append(f"duplicate line {i}")
            covered.add(i)

    for i in range(1, total_lines + 1):
        if i not in covered:
            issues.append(f"gap at line {i}")

    return {
        "total_lines": total_lines,
        "covered_lines": len(covered),
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
                if layer == "trace" and sc["files"].get("output"):
                    continue
                issues.append(f"{sc['id']}: missing {layer}")
                continue
            file_count += 1
            p = OUT / rel
            if not p.exists():
                issues.append(f"Missing: {p}")
            elif p.stat().st_size == 0:
                issues.append(f"Empty: {p}")
    return {
        "files": file_count,
        "issues": issues,
        "ok": len(issues) == 0,
    }


def build_indice(manifest: list[dict], coverage: dict) -> str:
    lines = [
        "# INDICE — engine-model-G (Cohen Force bucle CI/CD ágil)",
        "",
        "## Rol en Modo Aleph",
        "",
        "**Force G:** lente de proceso — reparte la conversación en fases del pipeline",
        "(PLAN→CODE→BUILD_TEST→DEPLOY→OPERATE→FEEDBACK) sin cambiar política del tablero.",
        "",
        "Escena ancla: [`02-bucle-ideas-fuerza`](sesion-01-agile-cicd-loop/02-bucle-ideas-fuerza/).",
        "Protocolo operativo: [`FORCING.md`](FORCING.md).",
        "",
        "Registry: [`../manifest.json`](../manifest.json) · Ficha: [`engine.json`](engine.json).",
        "Puente index-reader: poder `cicd-loop` en [`disfraz-rude-bot`](../../agents/skills/disfraz-rude-bot/).",
        "",
        "## Visión del hilo",
        "",
        "El corpus [`raw/logs-agent-1.md`](raw/logs-agent-1.md) (147 líneas) parte de arquetipos",
        "ágiles en momentos de ceremonia, despliega el bucle CI/CD con ideas fuerza por rol,",
        "y cierra con la misma ontología bajo trazabilidad epistemológica (🟢🟡🔴) del index-reader.",
        "",
        "## Tabla de escenas",
        "",
        "| ID | Escena | Rol | Resumen | Tags |",
        "|----|--------|-----|---------|------|",
    ]
    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        tags = ", ".join(f"`{t}`" for t in sc["tags"][:4])
        lines.append(
            f"| [{sc['id']}]({rel}/) | [{sc['slug']}]({rel}/) | `{sc['rol']}` | {sc['title']} | {tags} |"
        )

    lines.extend(
        [
            "",
            "## Mapa conceptual",
            "",
            "```mermaid",
            "flowchart LR",
            "  PLAN[PLAN PO] --> CODE[CODE Dev]",
            "  CODE --> BUILD[BUILD_TEST QA]",
            "  BUILD --> DEPLOY[DEPLOY Ops]",
            "  DEPLOY --> OPERATE[OPERATE SRE]",
            "  OPERATE --> FEEDBACK[FEEDBACK SM]",
            "  FEEDBACK --> PLAN",
            "```",
            "",
            "## Anomalías documentadas",
            "",
        ]
    )
    for extra in INDICE_EXTRA_ANOMALIES:
        lines.append(f"- {extra}")
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
            "| ¿Arquetipos antes de sprint/review/deploy? | `01-arquetipos-momento/output.md` |",
            "| ¿Seis fases e ideas fuerza del bucle? | `02-bucle-ideas-fuerza/output.md` |",
            "| ¿Bucle bajo 🟢🟡🔴 con traje reader? | `03-trazabilidad-index-reader/output.md` |",
            "",
            "## Cobertura",
            "",
            f"- Líneas fuente: {coverage.get('total_lines', '?')}",
            f"- Líneas cubiertas: {coverage.get('covered_lines', '?')}",
            f"- Verificación: {'OK' if coverage.get('ok') else 'ISSUES — ver manifest'}",
            "",
            "## Estructura",
            "",
            "```",
            "engine-model-G/",
            "├── raw/logs-agent-1.md",
            "├── segment_engine_model_g_log.py",
            "├── FORCING.md",
            "├── manifest.json",
            "├── INDICE.md",
            "├── engine.json",
            "└── sesion-01-agile-cicd-loop/",
            "```",
            "",
        ]
    )
    return "\n".join(lines)


def update_engine_json_status(status: str) -> None:
    path = OUT / "engine.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    data["status"] = status
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    if not LOG.exists():
        raise SystemExit(f"Source log missing: {LOG}")

    lines = read_lines(LOG)
    manifest = [build_scene(lines, sc) for sc in SCENES]

    coverage = verify_line_coverage(len(lines))
    file_check = verify_files(manifest)

    (OUT / "manifest.json").write_text(
        json.dumps(
            {
                "engine": ENGINE_ID,
                "cohen_type": "agile_cicd_loop",
                "description": "Force bucle CI/CD ágil — seis roles, ideas fuerza, puente index-reader",
                "anchor_scene": f"{SESSION}/02-bucle-ideas-fuerza",
                "source": SRC,
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
        "anchor": f"{SESSION}/02-bucle-ideas-fuerza",
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))

    if result["ok"]:
        update_engine_json_status("indexed")
    else:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
