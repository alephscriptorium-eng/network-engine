#!/usr/bin/env python3
"""Segment cima-aleph/raw/log-agent-1.md into consultable corpus (cota máxima)."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
LOG = RAW / "log-agent-1.md"
SRC = "raw/log-agent-1.md"
OUT = ROOT

FOOTER = "This response is AI-generated, for reference only."

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


def read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines(keepends=True)


def strip_footer(text: str) -> tuple[str, bool]:
    had = FOOTER in text
    text = text.replace(FOOTER, "").strip()
    return text, had


def yaml_frontmatter(
    scene_id: str,
    session: str,
    source_file: str,
    source_lines: list[int],
    layer: str,
    tags: list[str],
    extra: dict | None = None,
) -> str:
    meta = {
        "scene_id": scene_id,
        "session": session,
        "source_file": source_file,
        "source_lines": source_lines,
        "layer": layer,
        "tags": tags,
    }
    if extra:
        meta.update(extra)
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
    lines.append("---")
    return "\n".join(lines) + "\n\n"


def write_layer(
    folder: Path,
    name: str,
    body: str,
    scene_id: str,
    session: str,
    source_lines: list[int],
    layer: str,
    tags: list[str],
    extra: dict | None = None,
) -> Path:
    body, had_footer = strip_footer(body)
    fm_extra = dict(extra or {})
    if had_footer and layer == "output":
        fm_extra["ai_generated_footer_stripped"] = True
    path = folder / name
    path.write_text(
        yaml_frontmatter(
            scene_id, session, SRC, source_lines, layer, tags, fm_extra or None
        )
        + body
        + ("\n" if body and not body.endswith("\n") else ""),
        encoding="utf-8",
    )
    return path


def join_lines(lines: list[str], start: int, end: int) -> str:
    return "".join(lines[start - 1 : end])


def is_trace_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if TRACE_LINE.match(s):
        return True
    if s.startswith("[") and "](http" in s:
        return True
    return False


def is_think_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
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
    return False


def classify_range(lines: list[str], start: int, end: int) -> tuple[str, str]:
    think_parts: list[str] = []
    trace_parts: list[str] = []
    for i in range(start, end + 1):
        line = lines[i - 1]
        if not line.strip():
            continue
        stripped = line.rstrip("\n")
        if is_trace_line(stripped):
            trace_parts.append(stripped)
        elif is_think_line(stripped) or (
            think_parts and not stripped.startswith("###") and not stripped.startswith("¡")
        ):
            think_parts.append(stripped)
        elif not think_parts and not trace_parts:
            think_parts.append(stripped)
        else:
            think_parts.append(stripped)
    think = "\n\n".join(think_parts).strip()
    trace = "\n".join(trace_parts).strip()
    return think, trace


def extract_turn(
    lines: list[str],
    prompt_start: int,
    prompt_end: int,
    body_start: int,
    output_start: int,
    end: int,
) -> tuple[str, str, str, str]:
    prompt = "\n\n".join(
        lines[i - 1].rstrip("\n") for i in range(prompt_start, prompt_end + 1) if lines[i - 1].strip()
    )
    think, trace = classify_range(lines, body_start, output_start - 1)
    output = "\n".join(
        lines[i - 1].rstrip("\n")
        for i in range(output_start, end + 1)
        if lines[i - 1].strip() and lines[i - 1].strip() != FOOTER
    ).strip()
    return prompt, think, trace, output


def merge_turns(parts: list[tuple[str, str, str, str]]) -> tuple[str, str, str]:
    prompts: list[str] = []
    thinks: list[str] = []
    traces: list[str] = []
    outputs: list[str] = []
    for idx, (p, t, tr, o) in enumerate(parts, 1):
        if p:
            prompts.append(p if len(parts) == 1 else f"## Turno {idx}\n\n{p}")
        if t:
            thinks.append(t if len(parts) == 1 else f"## Turno {idx}\n\n{t}")
        if tr:
            traces.append(tr if len(parts) == 1 else f"## Turno {idx}\n\n{tr}")
        if o:
            outputs.append(o if len(parts) == 1 else f"## Turno {idx}\n\n{o}")
    return (
        "\n\n---\n\n".join(prompts),
        "\n\n---\n\n".join(thinks),
        "\n\n---\n\n".join(traces),
        "\n\n---\n\n".join(outputs),
    )


SESSION = "sesion-01-ontologia-gnoseologia-confluencia"

SCENES = [
    {
        "id": "s01-01",
        "slug": "01-ontologia-gnoseologia-juntos",
        "title": "Ontología + gnoseología juntas (referentes y hoja de ruta)",
        "lines": (1, 74),
        "tags": ["cima", "confluencia", "ontologia", "gnoseologia", "objetividad-sistemica"],
        "turns": [
            {"prompt": (1, 3), "body": 5, "output": 25, "end": 73},
        ],
        "anomalies": ["prompt_duplicado_lineas_1_y_3"],
    },
    {
        "id": "s01-02",
        "slug": "02-polarizacion-ontologia-gnoseologia",
        "title": "Polarización ontología vs gnoseología (¿es normal ignorar uno?)",
        "lines": (75, 145),
        "tags": ["cima", "confluencia", "polarizacion", "reduccionismo", "objetividad-sistemica"],
        "turns": [
            {"prompt": (75, 75), "body": 77, "output": 105, "end": 145},
        ],
        "anomalies": [],
    },
    {
        "id": "s01-03",
        "slug": "03-godel-cohen-cantor-diamat",
        "title": "Diamat + Gödel/Cohen/Cantor — escena ancla cima",
        "lines": (147, 508),
        "tags": [
            "cima",
            "ancla",
            "diamat",
            "Godel",
            "Cohen",
            "Cantor",
            "objetividad-sistemica",
            "confluencia",
        ],
        "turns": [
            {"prompt": (147, 147), "body": 149, "output": 171, "end": 213},
            {"prompt": (215, 215), "body": 217, "output": 239, "end": 275},
            {"prompt": (277, 277), "body": 279, "output": 341, "end": 391},
            {"prompt": (394, 394), "body": 396, "output": 474, "end": 508},
        ],
        "anomalies": [
            "escena_compuesta_4_turnos",
            "user1_user2_fusionados_linea_277",
            "footer_ai_linea_392_en_turno_mareev",
        ],
        "anchor": True,
    },
    {
        "id": "s01-04",
        "slug": "04-clasificacion-ia-ont-gnose",
        "title": "IA 1956–hoy: clasificación ontológica / gnoseológica / híbrida",
        "lines": (510, 709),
        "tags": ["cima", "IA", "cognicion", "hibrido", "Dartmouth", "objetividad-sistemica"],
        "turns": [
            {"prompt": (510, 510), "body": 512, "output": 522, "end": 585},
            {"prompt": (585, 585), "body": 587, "output": 595, "end": 637},
            {"prompt": (639, 639), "body": 641, "output": 663, "end": 709},
        ],
        "anomalies": [
            "escena_compuesta_3_turnos",
            "turno_2_think_espanol_sin_bloques_Analyze",
            "meta_reflexion_ia_mapa_territorio_en_turnos_2_3",
        ],
    },
]


def build_scenes() -> list[dict]:
    lines = read_lines(LOG)
    manifest: list[dict] = []

    for sc in SCENES:
        folder = OUT / SESSION / sc["slug"]
        folder.mkdir(parents=True, exist_ok=True)

        parts: list[tuple[str, str, str, str]] = []
        for turn in sc["turns"]:
            ps, pe = turn["prompt"]
            parts.append(
                extract_turn(
                    lines,
                    ps,
                    pe,
                    turn["body"],
                    turn["output"],
                    turn["end"],
                )
            )

        prompt, think, trace, output = merge_turns(parts)
        start, end = sc["lines"]
        tags = sc["tags"]

        files = {
            "prompt": write_layer(
                folder, "prompt.md", prompt, sc["id"], SESSION, [start, end], "prompt", tags
            ),
            "think": write_layer(
                folder,
                "think.md",
                think or "_(sin think explícito)_",
                sc["id"],
                SESSION,
                [start, end],
                "think",
                tags,
                {"composite_turns": len(sc["turns"])} if len(sc["turns"]) > 1 else None,
            ),
            "trace": write_layer(
                folder,
                "trace.md",
                trace or "_(sin traces web en este turno)_",
                sc["id"],
                SESSION,
                [start, end],
                "trace",
                tags,
            ),
            "output": write_layer(
                folder, "output.md", output, sc["id"], SESSION, [start, end], "output", tags
            ),
        }

        entry = {
            "id": sc["id"],
            "session": SESSION,
            "slug": sc["slug"],
            "source": {"file": SRC, "line_start": start, "line_end": end},
            "title": sc["title"],
            "cota": "cima",
            "rol": ["confluencia", "reunion", "objetividad-sistemica"],
            "tags": tags,
            "files": {k: str(v.relative_to(OUT)) for k, v in files.items()},
            "anomalies": sc.get("anomalies", []),
        }
        if sc.get("anchor"):
            entry["anchor"] = True
        manifest.append(entry)

    return manifest


def build_indice(manifest: list[dict]) -> str:
    lines = [
        "# INDICE — corpus cima-aleph (cota máxima)",
        "",
        "## Visión del hilo",
        "",
        "Corpus de **confluencia**: ontología y gnoseología no excluyentes; reunión hacia "
        "**objetividad sistémica**. Fuente: [`raw/log-agent-1.md`](raw/log-agent-1.md). "
        "Plan local: [`raw/log-agent2.md`](raw/log-agent2.md). "
        "Multitask: [`aleph-context/PLAN-multitask-sima-cima.md`](../aleph-context/PLAN-multitask-sima-cima.md).",
        "",
        "El hilo abre con la aspiración de ser ontologista y gnoseologista a la vez; critica la "
        "polarización; recorre el diamat (marxismo-leninismo, historiografía soviética Mareev/Iliénkov); "
        "ancla en **Gödel (suelo ontológico) + Cohen (motor gnoseológico) + Cantor (horizonte Aleph)**; "
        "cierra clasificando paradigmas de IA (Dartmouth → hoy) y reflexionando si el mapa (IA) subsume "
        "el territorio (mente humana).",
        "",
        "**Cota:** máxima (cima) — opuesta a [`sima-aleph/`](../sima-aleph/) (ruptura/discrepancia).",
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
            "flowchart TB",
            "  subgraph cima [Sesion 01 Confluencia]",
            "    C1[01 Ontologia gnoseologia juntas]",
            "    C2[02 Polarizacion critica]",
            "    C3[03 Diamat Godel Cohen Cantor]",
            "    C4[04 IA clasificacion hibrida]",
            "    C1 --> C2 --> C3 --> C4",
            "  end",
            "  C3 -.->|ancla cima| C4",
            "```",
            "",
            "## Anomalías documentadas",
            "",
            "1. **s01-01**: prompt duplicado (líneas 1 y 3; línea 2 repetición corta).",
            "2. **s01-03**: escena compuesta de 4 turnos (ML, diamat, Mareev, Gödel/Cohen); USER 1/2 en línea 277; footer AI línea 392.",
            "3. **s01-04**: 3 turnos (clasificación IA, auto-aplicación híbrida, tabla mapa/territorio); think español sin `Analyze` en turno 2.",
            "4. **Footers AI**: eliminados del cuerpo `output.md`; anotados en frontmatter.",
            "",
            "## Guía de consulta para agentes",
            "",
            "| Pregunta | Archivo recomendado |",
            "|----------|---------------------|",
            "| ¿Confluencia ontología+gnoseología? | `sesion-01-.../01-ontologia-gnoseologia-juntos/output.md` |",
            "| ¿Crítica a la polarización? | `sesion-01-.../02-polarizacion-ontologia-gnoseologia/` |",
            "| ¿Ancla Gödel/Cohen/Cantor + diamat? | `sesion-01-.../03-godel-cohen-cantor-diamat/output.md` |",
            "| ¿Mapa IA ontológico/gnoseológico/híbrido? | `sesion-01-.../04-clasificacion-ia-ont-gnose/output.md` |",
            "| ¿IA mapa vs territorio (isomorfismo)? | `sesion-01-.../04-clasificacion-ia-ont-gnose/output.md` (turno 3) |",
            "",
            "## Estructura",
            "",
            "```",
            "cima-aleph/",
            "├── raw/log-agent-1.md",
            "├── raw/log-agent2.md          # plan local",
            "├── segment_cima_log.py",
            "├── manifest.json",
            "├── INDICE.md",
            "└── sesion-01-ontologia-gnoseologia-confluencia/",
            "```",
            "",
            "Regenerar: `python3 segment_cima_log.py`",
            "",
            "## Detalle por escena",
            "",
        ]
    )

    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        lines.append(f"### [{sc['slug']}]({rel}/)")
        lines.append(f"**Tema:** {sc['title']}")
        lines.append(f"**Cota:** `{sc.get('cota', 'cima')}` · **Rol:** {', '.join(sc.get('rol', []))}")
        if sc.get("anomalies"):
            lines.append(f"**Anomalías:** {', '.join(sc['anomalies'])}")
        lines.append(
            f"- [prompt]({rel}/prompt.md) · [think]({rel}/think.md) · "
            f"[trace]({rel}/trace.md) · [output]({rel}/output.md)"
        )
        lines.append("")

    return "\n".join(lines)


def body_from_md(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    if text.startswith("---"):
        end = text.find("---", 3)
        if end != -1:
            text = text[end + 3 :].lstrip("\n")
    return text


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def normalize_for_verify(text: str) -> str:
    text = re.sub(r"## Turno \d+\s*", "", text)
    text = re.sub(r"---+", " ", text)
    return normalize_ws(text)


def verify_line_coverage(manifest: list[dict], total_lines: int) -> dict:
    issues: list[str] = []
    covered = [False] * (total_lines + 1)
    for sc in manifest:
        ls, le = sc["source"]["line_start"], sc["source"]["line_end"]
        for i in range(ls, le + 1):
            covered[i] = True
        if ls < 1 or le > total_lines:
            issues.append(f"{sc['id']}: range {ls}-{le} out of bounds (1-{total_lines})")

    uncovered = [i for i in range(1, total_lines + 1) if not covered[i]]
    blank_only = []
    lines = read_lines(LOG)
    for i in uncovered:
        if not lines[i - 1].strip():
            blank_only.append(i)
        else:
            issues.append(f"line {i} not covered: {lines[i - 1].strip()[:60]!r}")

    return {
        "total_lines": total_lines,
        "uncovered_non_blank": [i for i in uncovered if i not in blank_only],
        "uncovered_blank": blank_only,
        "ok": len(issues) == 0,
        "issues": issues,
    }


def verify_content_coverage(manifest: list[dict]) -> dict:
    issues: list[str] = []
    source_lines = read_lines(LOG)
    full = normalize_ws("".join(source_lines))

    for sc in manifest:
        ls, le = sc["source"]["line_start"], sc["source"]["line_end"]
        chunk = normalize_ws("".join(source_lines[ls - 1 : le]))
        for layer in ("prompt", "think", "output", "trace"):
            p = OUT / sc["files"][layer]
            body = normalize_for_verify(body_from_md(p))
            if len(body) < 20 or body.startswith("_("):
                continue
            if layer == "trace":
                segments = [
                    normalize_ws(s)
                    for s in body_from_md(p).splitlines()
                    if s.strip() and not s.strip().startswith("## Turno")
                ]
                for seg in segments:
                    if len(seg) < 12:
                        continue
                    if seg not in chunk and seg[:40] not in full:
                        issues.append(f"{sc['id']}/trace: segment not in source: {seg[:40]!r}")
                continue
            needle = body[: min(100, len(body))]
            if needle not in chunk and normalize_for_verify(needle[:60]) not in full:
                issues.append(f"{sc['id']}/{layer}: body not found in source range")

    return {"coverage_issues": issues, "ok": len(issues) == 0}


def verify(manifest: list[dict]) -> dict:
    issues: list[str] = []
    file_count = 0
    layers = ("prompt", "think", "output", "trace")
    for sc in manifest:
        for layer in layers:
            p = OUT / sc["files"][layer]
            file_count += 1
            if not p.exists():
                issues.append(f"Missing: {p}")
            elif p.stat().st_size == 0:
                issues.append(f"Empty: {p}")
    if not LOG.exists():
        issues.append(f"Raw log missing: {LOG}")
    return {
        "scenes": len(manifest),
        "files": file_count,
        "expected_files": len(manifest) * 4,
        "issues": issues,
        "ok": len(issues) == 0 and file_count == len(manifest) * 4,
    }


def main() -> None:
    if not LOG.exists():
        raise FileNotFoundError(f"Source log not found: {LOG}")

    manifest = build_scenes()
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (OUT / "INDICE.md").write_text(build_indice(manifest), encoding="utf-8")

    total = len(read_lines(LOG))
    result = verify(manifest)
    line_cov = verify_line_coverage(manifest, total)
    content_cov = verify_content_coverage(manifest)
    result["line_coverage"] = line_cov
    result["content_coverage"] = content_cov
    result["ok"] = result["ok"] and line_cov["ok"] and content_cov["ok"]
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
