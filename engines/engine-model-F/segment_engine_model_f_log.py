#!/usr/bin/env python3
"""Segment engine-model-F/raw/logs-agent-1.md into Cohen Force corpus (poetic_existential)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
LOG = RAW / "logs-agent-1.md"
SRC = "raw/logs-agent-1.md"
OUT = ROOT
SESSION = "sesion-01-pizarnik-jaula-pajaro"
ENGINE_ID = "engine-model-F"

FOOTER = "This response is AI-generated, for reference only."
TRACE_READ = re.compile(r"^Read \d+ (web pages|pages)", re.I)
TRACE_FOUND = re.compile(r"^Found \d+ web pages", re.I)

FORCE_TAGS = ["force:F", "cohen:poetic_existential", "Pizarnik", "Fonollosa"]

SCENES = [
    {
        "id": "f01-01",
        "slug": "01-pizarnik-jaula-pajaro",
        "title": "Pizarnik «El despertar» — jaula que se vuelve pájaro",
        "lines": (1, 51),
        "prompt_lines": [1],
        "trace_lines": [2],
        "output_start": 3,
        "output_end": 51,
        "tags": [*FORCE_TAGS, "jaula-pajaro", "El-despertar", "ancla"],
        "rol": "ancla",
        "anomalies": ["dialogo_plano_sin_think_explicito"],
    },
    {
        "id": "f01-02",
        "slug": "02-jaulas-espejo-invertido",
        "title": "Dos jaulas espejo — Fonollosa afuera vs Pizarnik adentro",
        "lines": (52, 106),
        "prompt_lines": [52, 54],
        "output_start": 55,
        "output_end": 106,
        "tags": [*FORCE_TAGS, "jaula", "espejo-invertido", "brujula-sentimental"],
        "rol": "contraste",
        "anomalies": ["prompt_usuario_en_dos_bloques_lineas_52_54"],
    },
    {
        "id": "f01-03",
        "slug": "03-godel-cohen-forcing",
        "title": "Alfa/omega — Fonollosa-Gödel sistema vs Pizarnik-Cohen forcing",
        "lines": (107, 163),
        "prompt_lines": [107],
        "output_start": 108,
        "output_end": 163,
        "tags": [*FORCE_TAGS, "Godel", "Cohen", "forcing", "hipotesis-continuo"],
        "rol": "forcing",
        "anomalies": [],
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
    if TRACE_READ.match(s) or TRACE_FOUND.match(s):
        return True
    return False


def join_range(lines: list[str], start: int, end: int) -> str:
    return "".join(lines[start - 1 : end]).rstrip("\n")


def extract_layers(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    ls, le = scene["lines"]
    prompt_line_nums = set(scene.get("prompt_lines", [scene.get("prompt_line", ls)]))
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
        "# INDICE — engine-model-F (Cohen Force poético-existencial)",
        "",
        "## Rol en Modo Aleph",
        "",
        "**Force F:** poética existencial — Pizarnik jaula-pájaro como forcing imaginativo",
        "frente al sistema urbano de Fonollosa (Gödel) y la hipótesis del continuo poética.",
        "",
        "Escena ancla: [`01-pizarnik-jaula-pajaro`](sesion-01-pizarnik-jaula-pajaro/01-pizarnik-jaula-pajaro/).",
        "",
        "Registry: [`../manifest.json`](../manifest.json) · Ficha: [`engine.json`](engine.json).",
        "Contraste sugerido: [`engine-model-D`](../engine-model-D/) (credos), [`sima-aleph`](../../sima-aleph/INDICE.md).",
        "",
        "## Visión del hilo",
        "",
        "El corpus [`raw/logs-agent-1.md`](raw/logs-agent-1.md) (163 líneas) parte de Fonollosa",
        "y «Puedo empezar» para desplegar el poema «El despertar» de Pizarnik (jaula → pájaro),",
        "contrasta dos jaulas espejo (ciudad compartida vs refugio íntimo), y cierra con la bisagra",
        "alfa/omega Fonollosa-Gödel / Pizarnik-Cohen y el forcing ontológico del pájaro-jaula.",
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
            "  subgraph f01 [Sesion 01 Pizarnik jaula pajaro]",
            "    A1[01 Pizarnik El despertar]",
            "    A2[02 Jaulas espejo invertido]",
            "    A3[03 Godel Cohen forcing]",
            "    A1 --> A2 --> A3",
            "  end",
            "  Fonollosa[Fonollosa sistema ciudad] --> A1",
            "  A3 --> HC[hipotesis continuo poetica]",
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
            "| ¿Jaula que se vuelve pájaro / «qué haré con el miedo»? | `01-pizarnik-jaula-pajaro/output.md` |",
            "| ¿Fonollosa afuera vs Pizarnik adentro? | `02-jaulas-espejo-invertido/output.md` |",
            "| ¿Gödel/Cohen, alfa-omega, forcing poético? | `03-godel-cohen-forcing/output.md` |",
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
            "engine-model-F/",
            "├── raw/logs-agent-1.md",
            "├── segment_engine_model_f_log.py",
            "├── manifest.json",
            "├── INDICE.md",
            "├── engine.json",
            "└── sesion-01-pizarnik-jaula-pajaro/",
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
                "cohen_type": "poetic_existential",
                "description": "Force poético-existencial — Pizarnik jaula-pájaro, contraste Fonollosa",
                "anchor_scene": f"{SESSION}/01-pizarnik-jaula-pajaro",
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
        "anchor": f"{SESSION}/01-pizarnik-jaula-pajaro",
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
