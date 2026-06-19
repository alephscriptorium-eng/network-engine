#!/usr/bin/env python3
"""Segment engine-model-D/raw/logs-agent-1.md into Cohen Force corpus (credos)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
LOG = RAW / "logs-agent-1.md"
SRC = "raw/logs-agent-1.md"
OUT = ROOT
SESSION = "sesion-01-conversion-apostasia"
ENGINE_ID = "engine-model-D"

FOOTER = "This response is AI-generated, for reference only."
SEARCH_UNAVAILABLE = re.compile(r"Search is unavailable", re.I)

FORCE_TAGS = ["force:D", "credos", "conversion", "apostasia"]

SCENES = [
    {
        "id": "d01-01",
        "slug": "01-conversion-apostasia-tablas",
        "title": "Tabla 1 — monoteísmos abrahámicos (entrada / salida)",
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
        "slug": "02-otras-religiones-mayoritarias",
        "title": "Tabla 2 — hinduismo, budismo, sijismo",
        "lines": (32, 52),
        "output_start": 33,
        "output_end": 52,
        "tags": [*FORCE_TAGS, "hinduismo", "budismo", "sijismo", "continuacion"],
        "rol": "continuacion",
        "anomalies": ["sin_nuevo_prompt_usuario"],
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
    return False


def extract_layers(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    ls, le = scene["lines"]
    prompt_line_nums = set(scene.get("prompt_lines", []))
    trace_line_nums = set(scene.get("trace_lines", []))
    output_start = scene["output_start"]
    output_end = scene.get("output_end", le)

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

        if output_start <= i <= output_end:
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

    for layer_name, body, layer_tag in (
        ("prompt", prompt, "prompt"),
        ("think", think, "think"),
        ("output", output, "output"),
        ("trace", trace, "trace"),
    ):
        p = write_layer(
            folder,
            f"{layer_name}.md",
            body,
            scene["id"],
            [ls, le],
            layer_tag,
            tags,
            extra={"engine": ENGINE_ID, "rol": scene["rol"]} if layer_tag == "prompt" else None,
        )
        if p:
            files[layer_name] = str(p.relative_to(OUT))

    return {
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
                if layer in ("trace", "think"):
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
    return {
        "files": file_count,
        "issues": issues,
        "ok": len(issues) == 0,
    }


def build_indice(manifest: list[dict], coverage: dict) -> str:
    lines = [
        "# INDICE — engine-model-D (Cohen Force credos)",
        "",
        "## Rol en Modo Aleph",
        "",
        "**Force D:** credos — tablas comparadas de conversión y apostasía en religiones mayoritarias.",
        "",
        "Escena ancla: [`01-conversion-apostasia-tablas`](sesion-01-conversion-apostasia/01-conversion-apostasia-tablas/).",
        "",
        "Registry: [`../manifest.json`](../manifest.json) · Ficha: [`engine.json`](engine.json).",
        "Contraste sugerido: [`engine-model-F`](../engine-model-F/) (poético), [`cima-aleph`](../../cima-aleph/INDICE.md).",
        "",
        "## Visión del hilo",
        "",
        "El corpus [`raw/logs-agent-1.md`](raw/logs-agent-1.md) (52 líneas) parte de una solicitud",
        "de tablas entrada/salida por credo: primero los tres monoteísmos abrahámicos, luego",
        "hinduismo, budismo y sijismo. Formato Expert Mode con trace «Search unavailable».",
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
            "flowchart TB",
            "  subgraph d01 [Sesion 01 conversion apostasia]",
            "    A1[01 Monoteismos abrahamicos]",
            "    A2[02 Otras religiones mayoritarias]",
            "    A1 --> A2",
            "  end",
            "  Prompt[tablas entrada salida] --> A1",
            "  A2 --> Credos[credo ruptura confesional]",
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
            "| ¿Conversión/apostasía en judaísmo, cristianismo, islam? | `01-conversion-apostasia-tablas/output.md` |",
            "| ¿Hinduismo, budismo, sijismo — entrada y salida? | `02-otras-religiones-mayoritarias/output.md` |",
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
            "engine-model-D/",
            "├── raw/logs-agent-1.md",
            "├── segment_engine_model_d_log.py",
            "├── manifest.json",
            "├── INDICE.md",
            "├── engine.json",
            "└── sesion-01-conversion-apostasia/",
            "```",
            "",
        ]
    )
    return "\n".join(lines)


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
                "cohen_type": "credos",
                "description": "Force credos — tablas conversión/apostasía en religiones mayoritarias",
                "anchor_scene": f"{SESSION}/01-conversion-apostasia-tablas",
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
        "anchor": f"{SESSION}/01-conversion-apostasia-tablas",
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
