#!/usr/bin/env python3
"""Parameterized engine log segmenter — copy to engines/{id}/segment_{id}_log.py.

Patterns from cima-aleph/segment_cima_log.py (Cursor export, multi-turn) and
sima-aleph/segment_sima_log.py (Expert Mode, line-range layers).

Configure ENGINE_ID, LOG, LOG_FORMAT, SESSION, SCENES, then run:
  python3 segment_{id}_log.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Literal

# ── Copy & configure per engine ───────────────────────────────────────────────

ENGINE_ID = "engine-model-X"  # e.g. main-engine, engine-model-A
LOG = "raw/logs-agent-1.md"  # path relative to engine folder
LOG_FORMAT: Literal["cursor_export", "expert_mode", "plain_dialog"] = "cursor_export"
SESSION = "sesion-01-slug-descriptivo"

# Tags applied to all scenes unless overridden per scene
ENGINE_TAGS: list[str] = ["engine", ENGINE_ID.replace("-", "_")]

# Scene definitions — choose schema by LOG_FORMAT (see SCENE SCHEMA below)
SCENES: list[dict] = [
    # cursor_export example (cima-style turns):
    # {
    #     "id": "s01-01",
    #     "slug": "01-slug",
    #     "title": "Scene title",
    #     "lines": (1, 100),
    #     "tags": [*ENGINE_TAGS, "tag1"],
    #     "turns": [
    #         {"prompt": (1, 3), "body": 5, "output": 25, "end": 99},
    #     ],
    #     "anomalies": [],
    #     "anchor": False,
    # },
    #
    # expert_mode / plain_dialog example (sima-style ranges):
    # {
    #     "id": "s01-01",
    #     "slug": "01-slug",
    #     "title": "Scene title",
    #     "lines": (1, 89),
    #     "prompt_line": 1,
    #     "prompt_end": 3,
    #     "think_start": 7,
    #     "think_end": 9,
    #     "output_start": 11,
    #     "trace_lines": [5],
    #     "tags": [*ENGINE_TAGS],
    #     "anomalies": [],
    #     "anchor": False,
    # },
]

# ── Runtime paths ─────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
LOG_PATH = ROOT / LOG if not LOG.startswith("raw/") else ROOT / LOG
SRC = LOG if LOG.startswith("raw/") else f"raw/{Path(LOG).name}"
OUT = ROOT

FOOTER = "This response is AI-generated, for reference only."

# Cursor export (cima)
THINK_START = re.compile(
    r"^\d+\.\s+\*\*(Analyze|Deconstruct|Determine|Identify|Formulate|Structuring|Drafting)"
)
TRACE_LINE = re.compile(
    r"^(Found \d+ web pages|Read \d+ pages|View All|No related content found|\[.+\]\(https?://)"
)
SPANISH_THINK = re.compile(
    r"^(El usuario |Los resultados |La Wikipedia |Necesito |Para |Voy a |Puedo |Mi respuesta |"
    r"¡Vaya!|El usuario,|Mi respuesta debe)"
)

# Expert mode (sima)
SEARCH_UNAVAILABLE = re.compile(r"Search is unavailable", re.I)
SCOPE_REFUSAL = re.compile(r"Sorry, that's beyond my current scope", re.I)
WE_NEED = re.compile(r"^We need to\b")
INTERPRETATION = re.compile(r"^Interpretation:")


# ── Shared utilities ──────────────────────────────────────────────────────────


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


def write_layer(
    folder: Path,
    name: str,
    body: str,
    scene_id: str,
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
        "source_file": SRC,
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


def join_range(lines: list[str], start: int, end: int) -> str:
    return "".join(lines[start - 1 : end])


def join_ranges(lines: list[str], ranges: list[tuple[int, int]]) -> str:
    parts: list[str] = []
    for start, end in ranges:
        chunk = join_range(lines, start, end).strip()
        if chunk:
            parts.append(chunk)
    return "\n\n".join(parts)


# ── Layer classification ──────────────────────────────────────────────────────


def is_trace_line(line: str, log_format: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if s == FOOTER:
        return True
    if log_format in ("expert_mode", "plain_dialog"):
        if SEARCH_UNAVAILABLE.search(s):
            return True
        if SCOPE_REFUSAL.search(s):
            return True
    if TRACE_LINE.match(s):
        return True
    if s.startswith("[") and "](http" in s:
        return True
    return False


def is_think_line(line: str, log_format: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if log_format == "cursor_export":
        if THINK_START.match(s):
            return True
        if SPANISH_THINK.match(s):
            return True
        if s.startswith("-   ") and ("User " in s or "Task " in s or "Let's " in s):
            return True
        if re.match(r"^\d+\.\s+\*\*", s):
            return True
        if s.startswith("*   ") and ("User " in s or "Task " in s):
            return True
    if WE_NEED.match(s) or INTERPRETATION.match(s):
        return True
    return False


# ── cursor_export extraction (cima-style) ─────────────────────────────────────


def classify_range(lines: list[str], start: int, end: int) -> tuple[str, str]:
    think_parts: list[str] = []
    trace_parts: list[str] = []
    for i in range(start, end + 1):
        line = lines[i - 1]
        if not line.strip():
            continue
        stripped = line.rstrip("\n")
        if is_trace_line(stripped, "cursor_export"):
            trace_parts.append(stripped)
        elif is_think_line(stripped, "cursor_export") or (
            think_parts and not stripped.startswith("###") and not stripped.startswith("¡")
        ):
            think_parts.append(stripped)
        elif not think_parts and not trace_parts:
            think_parts.append(stripped)
        else:
            think_parts.append(stripped)
    return "\n\n".join(think_parts).strip(), "\n".join(trace_parts).strip()


def extract_turn_cursor(
    lines: list[str],
    prompt_start: int,
    prompt_end: int,
    body_start: int,
    output_start: int,
    end: int,
) -> tuple[str, str, str, str]:
    prompt = "\n\n".join(
        lines[i - 1].rstrip("\n")
        for i in range(prompt_start, prompt_end + 1)
        if lines[i - 1].strip()
    )
    think, trace = classify_range(lines, body_start, output_start - 1)
    output = "\n".join(
        lines[i - 1].rstrip("\n")
        for i in range(output_start, end + 1)
        if lines[i - 1].strip() and lines[i - 1].strip() != FOOTER
    ).strip()
    return prompt, think, trace, output


def merge_turns(parts: list[tuple[str, str, str, str]]) -> tuple[str, str, str, str]:
    prompts, thinks, traces, outputs = [], [], [], []
    for idx, (p, t, tr, o) in enumerate(parts, 1):
        multi = len(parts) > 1
        if p:
            prompts.append(p if not multi else f"## Turno {idx}\n\n{p}")
        if t:
            thinks.append(t if not multi else f"## Turno {idx}\n\n{t}")
        if tr:
            traces.append(tr if not multi else f"## Turno {idx}\n\n{tr}")
        if o:
            outputs.append(o if not multi else f"## Turno {idx}\n\n{o}")
    return (
        "\n\n---\n\n".join(prompts),
        "\n\n---\n\n".join(thinks),
        "\n\n---\n\n".join(outputs),
        "\n\n---\n\n".join(traces),
    )


def extract_cursor_scene(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    parts: list[tuple[str, str, str, str]] = []
    for turn in scene["turns"]:
        ps, pe = turn["prompt"]
        parts.append(
            extract_turn_cursor(lines, ps, pe, turn["body"], turn["output"], turn["end"])
        )
    return merge_turns(parts)


# ── expert_mode / plain_dialog extraction (sima-style) ────────────────────────


def extract_range_scene(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    ls, le = scene["lines"]
    prompt_start = scene["prompt_line"]
    prompt_end = scene.get("prompt_end", prompt_start)
    trace_line_nums = set(scene.get("trace_lines", []))

    think_ranges = scene.get("think_ranges")
    if think_ranges is None:
        think_ranges = [(scene["think_start"], scene["think_end"])]
    output_ranges = scene.get("output_ranges")
    if output_ranges is None:
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
        if i in trace_line_nums or is_trace_line(stripped, LOG_FORMAT):
            trace_parts.append(stripped)
            continue
        if i in prompt_lines:
            if not is_think_line(line, LOG_FORMAT):
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


# ── Scene builder ─────────────────────────────────────────────────────────────


def extract_scene(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
    if LOG_FORMAT == "cursor_export":
        return extract_cursor_scene(lines, scene)
    return extract_range_scene(lines, scene)


def build_scene(lines: list[str], scene: dict) -> dict:
    ls, le = scene["lines"]
    folder = OUT / SESSION / scene["slug"]
    folder.mkdir(parents=True, exist_ok=True)

    prompt, think, output, trace = extract_scene(lines, scene)
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
            [ls, le],
            layer_name,
            tags,
            extra={"composite_turns": len(scene.get("turns", []))}
            if layer_name == "think" and scene.get("turns") and len(scene["turns"]) > 1
            else None,
        )
        if p:
            files[layer_name] = p.relative_to(OUT).as_posix()

    entry: dict = {
        "id": scene["id"],
        "session": SESSION,
        "slug": scene["slug"],
        "source": {"file": SRC, "line_start": ls, "line_end": le},
        "title": scene["title"],
        "engine_id": ENGINE_ID,
        "tags": tags,
        "files": files,
        "anomalies": scene.get("anomalies", []),
    }
    if scene.get("anchor"):
        entry["anchor"] = True
    return entry


# ── Verification ──────────────────────────────────────────────────────────────


def verify_line_coverage(total_lines: int) -> dict:
    issues: list[str] = []
    if not SCENES:
        return {"total_lines": total_lines, "issues": ["SCENES empty"], "ok": False}

    ranges = sorted(sc["lines"] for sc in SCENES)
    if ranges[0][0] != 1:
        issues.append(f"first scene starts at {ranges[0][0]}, expected 1")
    if ranges[-1][1] != total_lines:
        issues.append(f"last scene ends at {ranges[-1][1]}, expected {total_lines}")

    covered: set[int] = set()
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
        f"# INDICE — corpus {ENGINE_ID}",
        "",
        f"Engine Cohen Force · formato log: `{LOG_FORMAT}` · fuente: [`{SRC}`]({SRC})",
        f"Plan: [`../PLAN-multitask-engines.md`](../PLAN-multitask-engines.md)",
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
        lines.append(
            f"| [{sc['id']}]({rel}/) | [{sc['slug']}]({rel}/){anchor} | {sc['title']} | {tags} |"
        )
    lines.extend(
        [
            "",
            "## Cobertura",
            "",
            f"- Líneas fuente: {coverage.get('total_lines', '?')}",
            f"- Verificación: {'OK' if coverage.get('ok') else 'ISSUES'}",
            "",
            f"Regenerar: `python3 segment_{ENGINE_ID.replace('-', '_')}_log.py`",
            "",
        ]
    )
    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────


def main() -> None:
    if not LOG_PATH.exists():
        raise SystemExit(f"Source log missing: {LOG_PATH}")
    if not SCENES:
        raise SystemExit("Configure SCENES before running segmenter")

    lines = read_lines(LOG_PATH)
    manifest = [build_scene(lines, sc) for sc in SCENES]
    coverage = verify_line_coverage(len(lines))
    file_check = verify_files(manifest)

    (OUT / "manifest.json").write_text(
        json.dumps(
            {
                "engine_id": ENGINE_ID,
                "log_format": LOG_FORMAT,
                "source": SRC,
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
