#!/usr/bin/env python3
"""Segment engine-model-E raw logs into Cohen Force corpus (impotent_document / NRx)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ENGINE_ID = "engine-model-E"
LOG_FORMAT = "plain_dialog"
SESSION = "sesion-01-documento-impotente-epica-poder"
ENGINE_TAGS = ["engine", "engine_model_e", "force", "impotent_document", "NRx"]

ROOT = Path(__file__).parent
OUT = ROOT

FOOTER = "This response is AI-generated, for reference only."
WE_NEED = re.compile(r"^We need to\b")
SEARCH_UNAVAILABLE = re.compile(r"Search is unavailable", re.I)
SPANISH_THINK = re.compile(
    r"^(El usuario |Necesito |Debo |Pensaré |Estructuraré |Claro, )"
)

RAW_SOURCES = [
    {"file": "raw/logs-agent-1.md", "path": ROOT / "raw" / "logs-agent-1.md"},
    {"file": "raw/logs-agent-2.md", "path": ROOT / "raw" / "logs-agent-2.md"},
]

SCENES = [
    {
        "id": "e01-01",
        "slug": "01-marco-documento-impotente",
        "title": "Marco «documento impotente» y principios sin coerción",
        "source_file": "raw/logs-agent-1.md",
        "lines": (1, 27),
        "prompt_line": 1,
        "think_start": 3,
        "think_end": 7,
        "output_start": 9,
        "tags": [*ENGINE_TAGS, "documento-impotente", "principios", "delta"],
        "anomalies": ["titulo_linea_1_como_contexto_sin_prompt_explicito"],
    },
    {
        "id": "e01-02",
        "slug": "02-carta-derechos-nrx",
        "title": "Carta de derechos humanos vs Ilustración Oscura (NRx) — delta homólogo",
        "source_file": "raw/logs-agent-1.md",
        "lines": (28, 146),
        "prompt_line": 28,
        "trace_lines": [30],
        "think_start": 32,
        "think_end": 44,
        "output_start": 46,
        "tags": [*ENGINE_TAGS, "carta-derechos", "Dark-Enlightenment", "Land", "Thiel", "delta", "ancla"],
        "anchor": True,
        "anomalies": ["trace_expert_mode_linea_30", "escena_ancla_primaria"],
    },
    {
        "id": "e01-03",
        "slug": "03-share-delta-anuncio",
        "title": "Anuncio breve para compartir el delta (≤140 caracteres)",
        "source_file": "raw/logs-agent-1.md",
        "lines": (147, 160),
        "prompt_line": 147,
        "think_start": 149,
        "think_end": 149,
        "output_start": 151,
        "tags": [*ENGINE_TAGS, "share", "meta", "delta"],
        "anomalies": [],
    },
    {
        "id": "e02-01",
        "slug": "04-dosier-epica-poder",
        "title": "Dosier cultural: cracker vs hacker, épica del poder y sombras",
        "source_file": "raw/logs-agent-2.md",
        "lines": (1, 90),
        "prompt_line": 1,
        "prompt_end": 3,
        "output_start": 5,
        "trace_lines": [89],
        "tags": [*ENGINE_TAGS, "dosier", "cracker-hacker", "epica-poder", "Unamuno"],
        "anchor_alt": True,
        "anomalies": ["footer_ai_linea_89", "sin_think_explicito"],
    },
    {
        "id": "e02-02",
        "slug": "05-rectificacion-no-me-pises",
        "title": "Rectificación: don't tread on me → «no me pises» (no «trampas»)",
        "source_file": "raw/logs-agent-2.md",
        "lines": (91, 160),
        "prompt_line": 91,
        "output_start": 93,
        "trace_lines": [159],
        "tags": [*ENGINE_TAGS, "rectificacion", "Gadsden", "delta", "hermeneutica"],
        "anomalies": ["footer_ai_linea_159"],
    },
    {
        "id": "e02-03",
        "slug": "06-rectificacion-cracker-hacker",
        "title": "Rectificación: cracker/hacker como términos disputados (no binario ético)",
        "source_file": "raw/logs-agent-2.md",
        "lines": (161, 269),
        "prompt_line": 161,
        "output_start": 163,
        "trace_lines": [269],
        "tags": [*ENGINE_TAGS, "rectificacion", "cracker-hacker", "potencia-acto", "delta"],
        "anomalies": ["footer_ai_linea_269"],
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
    if not s:
        return False
    if s == FOOTER:
        return True
    return bool(SEARCH_UNAVAILABLE.search(s))


def is_think_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    return bool(WE_NEED.match(s) or SPANISH_THINK.match(s))


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
        "engine": ENGINE_ID,
        "cohen_type": "impotent_document_anti_nrx",
        "tags": tags,
        "files": files,
        "anomalies": scene.get("anomalies", []),
    }
    if scene.get("anchor"):
        entry["anchor"] = True
    if scene.get("anchor_alt"):
        entry["anchor_alt"] = True
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
        "# INDICE — engine-model-E (force Cohen)",
        "",
        "## Rol en el tablero Aleph",
        "",
        "**Force Cohen:** documento impotente — carta de derechos / anti-NRx + dosier épica del poder.",
        "Contrasta declaraciones sin coerción (1789→delta) con sombras del poder (cracker, vencedores, Unamuno).",
        "",
        f"Escena ancla primaria: [`02-carta-derechos-nrx`]({SESSION}/02-carta-derechos-nrx/).",
        f"Ancla alternativa: [`04-dosier-epica-poder`]({SESSION}/04-dosier-epica-poder/).",
        "",
        "Fuentes:",
        "- [`raw/logs-agent-1.md`](raw/logs-agent-1.md) (160 líneas) — carta derechos, NRx, delta declarativo",
        "- [`raw/logs-agent-2.md`](raw/logs-agent-2.md) (269 líneas) — dosier cracker/hacker + rectificaciones",
        "",
        "Registry: [`../manifest.json`](../manifest.json) · Ficha: [`engine.json`](engine.json).",
        "Contraste sugerido: [`engine-model-A`](../engine-model-A/) (diamat), [`engine-model-C`](../engine-model-C/) (economía política).",
        "",
        "## Visión del hilo",
        "",
        "Log-1 parte del marco «documento impotente» (principios sin mecanismo coercitivo), toma la",
        "Declaración de 1789 frente a la Ilustración Oscura (Land, Thiel, Yarvin) como proyecto cancelador,",
        "y escribe un delta homólogo (autonomía cognitiva, soberanía digital, resistencia algorítmica).",
        "Log-2 despliega un dosier de épica del poder tras un ciberataque (cracker vs hacker, Unamuno,",
        "Gadsden) y acumula dos notas de rectificación que corrigen traducción creativa y binario ético.",
        "",
        "## Tabla de escenas",
        "",
        "| ID | Escena | Fuente | Líneas | Resumen | Tags |",
        "|----|--------|--------|--------|---------|------|",
    ]
    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        anchor = " ⚓" if sc.get("anchor") else (" ⚓₂" if sc.get("anchor_alt") else "")
        src = sc["source"]["file"].replace("raw/", "")
        lr = f"{sc['source']['line_start']}–{sc['source']['line_end']}"
        tags = ", ".join(f"`{t}`" for t in sc["tags"][:4])
        lines.append(
            f"| [{sc['id']}]({rel}/) | [{sc['slug']}]({rel}/){anchor} | `{src}` | {lr} | {sc['title']} | {tags} |"
        )

    lines.extend(
        [
            "",
            "## Mapa conceptual",
            "",
            "```mermaid",
            "flowchart TB",
            "  subgraph log1 [Log 1 carta derechos NRx]",
            "    A1[01 documento impotente setup]",
            "    A2[02 carta derechos NRx ancla]",
            "    A3[03 share link 140]",
            "    A1 --> A2 --> A3",
            "  end",
            "  subgraph log2 [Log 2 dosier epica poder]",
            "    B1[04 dosier epica poder]",
            "    B2[05 rectificacion Gadsden]",
            "    B3[06 rectificacion cracker hacker]",
            "    B1 --> B2 --> B3",
            "  end",
            "  A2 -.->|mismo force| B1",
            "  NRx[Ilustracion Oscura canceladora] --> A2",
            "  A2 --> Delta[delta declarativo 6 principios]",
            "```",
            "",
            "## Guía de consulta",
            "",
            "| Pregunta | Escena |",
            "|----------|--------|",
            "| ¿Marco documento impotente a/b/c/d? | `01-marco-documento-impotente/output.md` |",
            "| ¿NRx cancela la carta? ¿Delta homólogo? | `02-carta-derechos-nrx/output.md` |",
            "| ¿Síntesis share Ilustración Oscura? | `03-share-delta-anuncio/output.md` |",
            "| ¿Dosier épica del poder / cracker-hacker? | `04-dosier-epica-poder/output.md` |",
            "| ¿Rectificación don't tread on me? | `05-rectificacion-no-me-pises/output.md` |",
            "| ¿Hacker/cracker disputado vs binario? | `06-rectificacion-cracker-hacker/output.md` |",
            "",
            "## Anomalías documentadas",
            "",
        ]
    )
    for sc in manifest:
        if sc.get("anomalies"):
            lines.append(f"- **{sc['id']}** ({sc['slug']}): {', '.join(sc['anomalies'])}")

    lines.extend(["", "## Cobertura", ""])
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
            "engine-model-E/",
            "├── raw/logs-agent-1.md",
            "├── raw/logs-agent-2.md",
            "├── segment_engine_model_e_log.py",
            "├── engine.json",
            "├── manifest.json",
            "├── INDICE.md",
            f"└── {SESSION}/",
            "```",
            "",
            "Regenerar: `python3 segment_engine_model_e_log.py`",
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
    anchor = f"{SESSION}/02-carta-derechos-nrx"

    (OUT / "manifest.json").write_text(
        json.dumps(
            {
                "corpus": ENGINE_ID,
                "role": "force",
                "cohen_type": "impotent_document_anti_nrx",
                "description": "Documento impotente UDHR/NRx + dosier épica del poder",
                "session": SESSION,
                "anchor_scene": anchor,
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
        "engine_id": ENGINE_ID,
        "scenes": len(manifest),
        "files": file_check["files"],
        "coverage": coverage,
        "file_check": file_check,
        "anchor": anchor,
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
