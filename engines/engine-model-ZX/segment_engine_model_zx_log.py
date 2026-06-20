#!/usr/bin/env python3
"""Segment engine-model-ZX/raw/logs-agent1.md into Cohen Force corpus (argument_verifier)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
LOG = RAW / "logs-agent1.md"
SRC = "raw/logs-agent1.md"
OUT = ROOT
SESSION = "sesion-01-verificador-muerte-ilustrada"
ENGINE_ID = "engine-model-ZX"
LOG_FORMAT = "expert_mode"

WE_NEED = re.compile(r"^We need to\b")
INTERPRETATION = re.compile(r"^Interpretation:")
SPANISH_THINK = re.compile(
    r"^(El usuario |Análisis |Mi fact-checking |Luego, |Estructuraré |Vamos a |"
    r"Primero el fact|Perfecto\. Aplico)"
)

FORCE_TAGS = ["force:ZX", "cohen:argument_verifier", "verificador", "bulo", "periodista"]

SCENES = [
    {
        "id": "zx01-01",
        "slug": "01-mandato-periodista",
        "title": "Mandato periodista — síntesis bloques y verdad/mentira",
        "lines": (1, 14),
        "prompt_lines": [1],
        "think_ranges": [(3, 14)],
        "output_ranges": [],
        "tags": [*FORCE_TAGS, "mandato", "journalist-mode"],
        "rol": "apertura",
        "anomalies": ["titulo_linea_1_contexto_bloque"],
    },
    {
        "id": "zx01-02",
        "slug": "02-articulo-bloques-inicial",
        "title": "Artículo — bloques 1–2 (anuncio muerte + llanto Nietzsche)",
        "lines": (15, 47),
        "prompt_lines": [],
        "think_ranges": [],
        "output_ranges": [(15, 46)],
        "tags": [*FORCE_TAGS, "bloque-1", "bloque-2", "Sujeto-Ilustrado"],
        "rol": "articulo",
        "anomalies": [],
    },
    {
        "id": "zx01-03",
        "slug": "03-articulo-bloques-medio",
        "title": "Artículo — bloques 3–4 (mono bifronte + profecía apocalíptica)",
        "lines": (48, 71),
        "prompt_lines": [],
        "think_ranges": [],
        "output_ranges": [(48, 70)],
        "tags": [*FORCE_TAGS, "bloque-3", "bloque-4", "dualidad"],
        "rol": "articulo",
        "anomalies": [],
    },
    {
        "id": "zx01-04",
        "slug": "04-veredicto-mentira-qa",
        "title": "Cuadro de conjunto + veredicto MENTIRA + apertura Q/A",
        "lines": (72, 103),
        "prompt_lines": [],
        "think_ranges": [],
        "output_ranges": [(72, 102)],
        "tags": [*FORCE_TAGS, "veredicto", "mentira", "cuadro-conjunto"],
        "rol": "veredicto",
        "anomalies": [],
    },
    {
        "id": "zx01-05",
        "slug": "05-factcheck-yo-nosotros",
        "title": "Fact-checking yo→nosotros + refutación falacia ejemplaridad",
        "lines": (104, 187),
        "prompt_lines": [104],
        "think_ranges": [(106, 118)],
        "output_ranges": [(120, 187)],
        "tags": [*FORCE_TAGS, "yo-nosotros", "fact-check", "ancla"],
        "rol": "ancla",
        "anomalies": ["prompt_usuario_cita_bloque_previo"],
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


def is_think_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if WE_NEED.match(s) or INTERPRETATION.match(s):
        return True
    if SPANISH_THINK.match(s):
        return True
    if s.startswith("-   ") and ("La afirmación" in s or "Nietzsche" in s):
        return True
    return False


def line_in_ranges(i: int, ranges: list[tuple[int, int]]) -> bool:
    return any(ls <= i <= le for ls, le in ranges)


def extract_layers(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    ls, le = scene["lines"]
    prompt_line_nums = set(scene.get("prompt_lines", []))
    think_ranges = scene.get("think_ranges", [])
    output_ranges = scene.get("output_ranges", [])

    prompt_parts: list[str] = []
    think_parts: list[str] = []
    output_parts: list[str] = []

    for i in range(ls, le + 1):
        line = lines[i - 1]
        stripped = line.rstrip("\n")
        if not stripped.strip():
            continue

        if i in prompt_line_nums:
            prompt_parts.append(stripped)
            continue

        if line_in_ranges(i, think_ranges):
            think_parts.append(stripped)
            continue

        if line_in_ranges(i, output_ranges):
            output_parts.append(stripped)

    return (
        "\n\n".join(prompt_parts).strip(),
        "\n\n".join(think_parts).strip(),
        "\n".join(output_parts).strip(),
        "",
    )


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
        "log_format": LOG_FORMAT,
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
            files[layer_name] = p.relative_to(OUT).as_posix()

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
                if layer == "output" and (sc["files"].get("think") or sc["files"].get("prompt")):
                    continue
                if layer == "prompt" and sc["files"].get("output"):
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
        "# INDICE — engine-model-ZX (Cohen Force argument_verifier)",
        "",
        "Proyecto cartesiano **ZX** · `transcardinal_index`: **w** · arc: **debunker**.",
        "",
        "**Force ZX:** periodista verificador — artículo de conjunto sobre el mito ilustrado,",
        "veredicto verdad/mentira y refutación del paso yo→nosotros.",
        "",
        "Escena ancla: [`05-factcheck-yo-nosotros`](sesion-01-verificador-muerte-ilustrada/05-factcheck-yo-nosotros/).",
        "",
        "Registry: [`../manifest.json`](../manifest.json) · Ficha: [`engine.json`](engine.json).",
        "Runbook: [`../RUNBOOK-indexar.md`](../RUNBOOK-indexar.md).",
        "Sin `pairs_with` operativo a engine-model-XZ.",
        "",
        "## Visión del hilo",
        "",
        "El corpus [`raw/logs-agent1.md`](raw/logs-agent1.md) (187 líneas) sintetiza cinco bloques",
        "de verificación argumental en un artículo periodístico, dictamina MENTIRA la tesis central",
        "y refuta la operación retórica del singular al plural en «madre, hemos sido tontos».",
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
            "  subgraph zx01 [Sesion 01 verificador muerte ilustrada]",
            "    B1[01 Mandato periodista]",
            "    B2[02 Articulo bloques 1-2]",
            "    B3[03 Articulo bloques 3-4]",
            "    B4[04 Veredicto MENTIRA]",
            "    B5[05 Factcheck yo nosotros ancla]",
            "    B1 --> B2 --> B3 --> B4 --> B5",
            "  end",
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
            "| ¿Veredicto MENTIRA sobre democracia/ASI? | `04-veredicto-mentira-qa/output.md` |",
            "| ¿Refutación yo→nosotros / falacia ejemplaridad? | `05-factcheck-yo-nosotros/output.md` |",
            "| ¿Cuadro de conjunto cinco bloques? | `04-veredicto-mentira-qa/output.md` |",
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
            "engine-model-ZX/",
            "├── raw/logs-agent1.md",
            "├── segment_engine_model_zx_log.py",
            "├── manifest.json",
            "├── INDICE.md",
            "├── engine.json",
            "└── sesion-01-verificador-muerte-ilustrada/",
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
                "cohen_type": "argument_verifier",
                "log_format": LOG_FORMAT,
                "transcardinal_index": "w",
                "cartesian_project": "ZX",
                "description": "Force argument_verifier — verificador bulos mito ilustrado",
                "anchor_scene": f"{SESSION}/05-factcheck-yo-nosotros",
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
        "anchor": f"{SESSION}/05-factcheck-yo-nosotros",
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
