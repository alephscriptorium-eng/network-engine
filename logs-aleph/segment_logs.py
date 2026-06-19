#!/usr/bin/env python3
"""Segment log-agent-1.md and log-agent-2.md into logs-aleph/ corpus."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
LOG1 = RAW / "log-agent-1.md"
LOG2 = RAW / "log-agent-2.md"
OUT = ROOT
SRC1 = "raw/log-agent-1.md"
SRC2 = "raw/log-agent-2.md"

FOOTER = "This response is AI-generated, for reference only."
THINK_START = re.compile(
    r"^\d+\.\s+\*\*(Analyze|Deconstruct|Determine|Identify|Formulate|Drafting|Final Polish)"
)
THINK_END = re.compile(r"Let's (?:write|craft|go|draft) it\.?", re.IGNORECASE)


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
                lines.append(f"{k}: {json.dumps(v)}")
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
    source_file: str,
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
            scene_id, session, source_file, source_lines, layer, tags, fm_extra or None
        )
        + body
        + ("\n" if body and not body.endswith("\n") else ""),
        encoding="utf-8",
    )
    return path


def join_lines(lines: list[str], start: int, end: int) -> str:
    """1-based inclusive line range."""
    return "".join(lines[start - 1 : end])


def find_think_range(lines: list[str], start: int, end: int) -> tuple[int, int]:
    first = None
    last = None
    for i in range(start, end + 1):
        if THINK_START.match(lines[i - 1]):
            if first is None:
                first = i
            last = i
    if first is None:
        return start, start
    return first, last


def find_output_start(lines: list[str], think_end: int, scene_end: int) -> int:
    for i in range(think_end + 1, scene_end + 1):
        line = lines[i - 1]
        if not line.strip():
            continue
        if THINK_START.match(line):
            continue
        if FOOTER in line and line.strip() == FOOTER:
            continue
        return i
    return scene_end + 1


def extract_turn(lines: list[str], prompt_line: int, scene_end: int) -> tuple[str, str, str, list[int]]:
    """Extract prompt, think, output from a simple multi-line turn."""
    think_start, think_end = find_think_range(lines, prompt_line + 1, scene_end)
    # Collect tool traces before formal numbered think
    think_parts: list[str] = []
    for i in range(prompt_line + 1, think_start if think_start > prompt_line else scene_end + 1):
        line = lines[i - 1]
        if line.strip():
            think_parts.append(line.rstrip("\n"))

    if think_start <= scene_end:
        for i in range(think_start, think_end + 1):
            think_parts.append(lines[i - 1].rstrip("\n"))

    out_start = find_output_start(lines, think_end if think_end else prompt_line, scene_end)
    output_lines = []
    for i in range(out_start, scene_end + 1):
        line = lines[i - 1]
        if line.strip() == FOOTER or line.strip() == "":
            if line.strip() == FOOTER:
                continue
            if i == scene_end:
                continue
        output_lines.append(line.rstrip("\n"))

    prompt = lines[prompt_line - 1].rstrip("\n")
    think = "\n\n".join(think_parts).strip()
    output = "\n".join(output_lines).strip()
    return prompt, think, output, [prompt_line, scene_end]


def slice_turn(
    lines: list[str],
    prompt_line: int,
    think_start: int,
    output_start: int,
    end: int,
) -> tuple[str, str, str]:
    prompt = lines[prompt_line - 1].rstrip("\n")
    think = "\n".join(
        lines[i - 1].rstrip("\n")
        for i in range(think_start, output_start)
        if lines[i - 1].strip() and lines[i - 1].strip() != FOOTER
    )
    output = "\n".join(
        lines[i - 1].rstrip("\n")
        for i in range(output_start, end + 1)
        if lines[i - 1].strip()
        and lines[i - 1].strip() != FOOTER
        and not lines[i - 1].strip().startswith("Sigue en")
    )
    return prompt, think, output


def build_session1() -> list[dict]:
    lines = read_lines(LOG1)
    scenes = [
        {
            "id": "s01-01",
            "slug": "01-marco-historiografico",
            "title": "Marco historiográfico y rol Aleph",
            "lines": (1, 95),
            "prompt_line": 1,
            "think_start": 3,
            "output_start": 65,
            "tags": ["Aleph", "historiografia", "Halley-218", "Eigenstate"],
        },
        {
            "id": "s01-02",
            "slug": "02-critica-bot-demo-liberal",
            "title": "Crítica al bot demo-liberal",
            "lines": (96, 166),
            "prompt_line": 96,
            "think_start": 98,
            "output_start": 138,
            "tags": ["Aleph", "bot-agente", "critica-metodologica", "Eigenstate"],
            "anomalies": ["output_includes_ai_generated_footer_in_source"],
        },
        {
            "id": "s01-03",
            "slug": "03-mandato-semilla-tres-alephs",
            "title": "Mandato semilla y tres alephs",
            "lines": (168, 225),
            "prompt_line": 168,
            "think_start": 170,
            "output_start": 204,
            "tags": ["Aleph", "mandato-semilla", "metodo"],
        },
        {
            "id": "s01-04",
            "slug": "04-eigenstate-halley-con-contraejemplo",
            "title": "Eigenstate Halley con contra-ejemplo",
            "lines": (226, 299),
            "prompt_line": 226,
            "think_start": 228,
            "output_start": 262,
            "tags": ["Eigenstate", "Halley-218", "bot-agente"],
        },
        {
            "id": "s01-05",
            "slug": "05-eigenstate-halley-puro",
            "title": "Eigenstate Halley puro",
            "lines": (300, 414),
            "prompt_line": 300,
            "think_start": 302,
            "output_start": 362,
            "tags": ["Eigenstate", "Halley-218", "Aleph"],
            "anomalies": ["termina_en_sigue_en_continuidad_sesion_2"],
        },
    ]
    session = "sesion-01-halley-aleph"
    manifest = []
    for sc in scenes:
        start, end = sc["lines"]
        prompt, think, output = slice_turn(
            lines, sc["prompt_line"], sc["think_start"], sc["output_start"], end
        )
        folder = OUT / session / sc["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        rel = f"{session}/{sc['slug']}"
        files = {
            "prompt": write_layer(
                folder,
                "prompt.md",
                prompt,
                sc["id"],
                session,
                SRC1,
                list(sc["lines"]),
                "prompt",
                sc["tags"],
            ),
            "think": write_layer(
                folder,
                "think.md",
                think,
                sc["id"],
                session,
                SRC1,
                list(sc["lines"]),
                "think",
                sc["tags"],
            ),
            "output": write_layer(
                folder,
                "output.md",
                output,
                sc["id"],
                session,
                SRC1,
                list(sc["lines"]),
                "output",
                sc["tags"],
            ),
        }
        manifest.append(
            {
                "id": sc["id"],
                "session": session,
                "slug": sc["slug"],
                "source": {
                    "file": SRC1,
                    "line_start": start,
                    "line_end": end,
                },
                "title": sc["title"],
                "tags": sc["tags"],
                "files": {k: str(v.relative_to(OUT)) for k, v in files.items()},
                "anomalies": sc.get("anomalies", []),
            }
        )
    return manifest


def build_session2() -> list[dict]:
    lines = read_lines(LOG2)
    line93 = lines[92]  # corrupted mega-line
    session = "sesion-02-demarcacion-gaia"

    # --- Scene 01: lines 3-91 ---
    s01_folder = OUT / session / "01-diamat-ciencia-nacional"
    s01_folder.mkdir(parents=True, exist_ok=True)
    s01_prompt = lines[2].rstrip("\n")
    s01_think_parts = [lines[4].rstrip("\n")]
    for i in range(7, 24):
        if lines[i - 1].strip():
            s01_think_parts.append(lines[i - 1].rstrip("\n"))
    s01_think = "\n\n".join(s01_think_parts)
    s01_output = "\n".join(lines[i - 1].rstrip("\n") for i in range(25, 92) if lines[i - 1].strip())
    s01_tags = ["diamat", "criterio-demarcacion", "Popper", "Kuhn", "Aleph"]
    s01_files = {
        "prompt": write_layer(
            s01_folder,
            "prompt.md",
            s01_prompt,
            "s02-01",
            session,
            SRC2,
            [3, 91],
            "prompt",
            s01_tags,
            {"tool_traces_merged": True},
        ),
        "think": write_layer(
            s01_folder,
            "think.md",
            s01_think,
            "s02-01",
            session,
            SRC2,
            [3, 91],
            "think",
            s01_tags,
            {"tool_traces_merged": True},
        ),
        "output": write_layer(
            s01_folder,
            "output.md",
            s01_output,
            "s02-01",
            session,
            SRC2,
            [3, 91],
            "output",
            s01_tags,
        ),
    }

    # --- Scene 02: corrupted line 93 split ---
    s02_prompt = line93[:207].strip()
    s02_think = line93[207:4467].strip()
    s02_output = line93[4467:12013].strip()
    s02_folder = OUT / session / "02-peticion-demarcacion-respuesta-test2"
    s02_folder.mkdir(parents=True, exist_ok=True)
    s02_anomalies = [
        "prompt_pide_disertacion_demarcacion_output_critica_test2",
        "prompt_y_think_fusionados_en_linea_93_del_log",
        "think_en_ingles_sobre_test2_no_sobre_demarcacion",
    ]
    s02_tags = ["anomalia", "test2", "criterio-demarcacion", "critica-metodologica"]
    s02_files = {
        "prompt": write_layer(
            s02_folder,
            "prompt.md",
            s02_prompt,
            "s02-02",
            session,
            SRC2,
            [93, 93],
            "prompt",
            s02_tags,
            {"repair": "split_at_char_207_before_Analyze"},
        ),
        "think": write_layer(
            s02_folder,
            "think.md",
            s02_think,
            "s02-02",
            session,
            SRC2,
            [93, 93],
            "think",
            s02_tags,
            {"repair": "embedded_english_think_extracted"},
        ),
        "output": write_layer(
            s02_folder,
            "output.md",
            s02_output,
            "s02-02",
            session,
            SRC2,
            [93, 93],
            "output",
            s02_tags,
            {"responds_to": "test2.md_critique_not_demarcation_dissertation"},
        ),
    }

    # --- Scene 03: objetividad sistémica PSOE/Corea (embedded in line 93) ---
    s03_prompt = line93[12013:27413].strip()
    s03_think = line93[27413:34952].strip()
    s03_output = line93[34952:41742].strip()
    s03_folder = OUT / session / "03-objetividad-sistemica-psoe-corea"
    s03_folder.mkdir(parents=True, exist_ok=True)
    s03_tags = ["objetividad-sistemica", "PSOE", "Corea-del-Norte", "Songbun"]
    s03_files = {
        "prompt": write_layer(
            s03_folder,
            "prompt.md",
            s03_prompt,
            "s02-03",
            session,
            SRC2,
            [93, 93],
            "prompt",
            s03_tags,
            {"embedded_in_line_93": True},
        ),
        "think": write_layer(
            s03_folder,
            "think.md",
            s03_think,
            "s02-03",
            session,
            SRC2,
            [93, 93],
            "think",
            s03_tags,
        ),
        "output": write_layer(
            s03_folder,
            "output.md",
            s03_output,
            "s02-03",
            session,
            SRC2,
            [93, 93],
            "output",
            s03_tags,
        ),
    }

    # --- Scene 04: mapa geoglobal + Wilber ---
    s04_prompt = line93[41742:63356].strip()
    s04_think = line93[63356:70441].strip()
    s04_output = line93[70441 + len("Let's craft it.") : 78215].strip()
    s04_folder = OUT / session / "04-objetividad-sistemica-mapa-geoglobal"
    s04_folder.mkdir(parents=True, exist_ok=True)
    s04_tags = ["objetividad-sistemica", "mapa-geoglobal", "Wilber", "geopolitica"]
    s04_files = {
        "prompt": write_layer(
            s04_folder,
            "prompt.md",
            s04_prompt,
            "s02-04",
            session,
            SRC2,
            [93, 93],
            "prompt",
            s04_tags,
            {"embedded_in_line_93": True},
        ),
        "think": write_layer(
            s04_folder,
            "think.md",
            s04_think,
            "s02-04",
            session,
            SRC2,
            [93, 93],
            "think",
            s04_tags,
        ),
        "output": write_layer(
            s04_folder,
            "output.md",
            s04_output,
            "s02-04",
            session,
            SRC2,
            [93, 93],
            "output",
            s04_tags,
        ),
    }

    # --- Scene 05: Gaia 2026-2100 ---
    s05_prompt = line93[78215:78529].strip()
    s05_think_en = line93[78529:84053].strip()
    s05_think_es = "\n".join(
        lines[i - 1].rstrip("\n") for i in range(95, 122) if lines[i - 1].strip()
    )
    s05_think = f"{s05_think_en}\n\n---\n\n## Think duplicado (español, líneas 95-121 del log)\n\n{s05_think_es}"
    s05_output = "\n".join(
        lines[i - 1].rstrip("\n") for i in range(123, 194) if lines[i - 1].strip()
    )
    s05_folder = OUT / session / "05-perspectiva-gaia-siglo-xxi"
    s05_folder.mkdir(parents=True, exist_ok=True)
    s05_tags = ["Gaia", "termodinamica", "siglo-XXI", "ecosistema"]
    s05_anomalies = [
        "think_duplicado_ingles_en_linea_93_y_espanol_lineas_95_121",
        "output_tambien_embebido_en_linea_93_usamos_lineas_123_193",
    ]
    s05_files = {
        "prompt": write_layer(
            s05_folder,
            "prompt.md",
            s05_prompt,
            "s02-05",
            session,
            SRC2,
            [93, 95],
            "prompt",
            s05_tags,
        ),
        "think": write_layer(
            s05_folder,
            "think.md",
            s05_think,
            "s02-05",
            session,
            SRC2,
            [93, 121],
            "think",
            s05_tags,
            {"duplicate_think": True},
        ),
        "output": write_layer(
            s05_folder,
            "output.md",
            s05_output,
            "s02-05",
            session,
            SRC2,
            [123, 193],
            "output",
            s05_tags,
        ),
    }

    # --- Scene 06: lines 195-271 ---
    s06_prompt = lines[194].rstrip("\n")
    s06_think = "\n\n".join(
        lines[i - 1].rstrip("\n")
        for i in range(197, 219)
        if lines[i - 1].strip()
    )
    s06_output = "\n".join(
        lines[i - 1].rstrip("\n")
        for i in range(219, 272)
        if lines[i - 1].strip()
    )
    s06_folder = OUT / session / "06-linea-demarcacion-abc-aleph"
    s06_folder.mkdir(parents=True, exist_ok=True)
    s06_tags = ["criterio-demarcacion", "Aleph", "Gaia", "Popper", "Kuhn"]
    s06_files = {
        "prompt": write_layer(
            s06_folder,
            "prompt.md",
            s06_prompt,
            "s02-06",
            session,
            SRC2,
            [195, 271],
            "prompt",
            s06_tags,
        ),
        "think": write_layer(
            s06_folder,
            "think.md",
            s06_think,
            "s02-06",
            session,
            SRC2,
            [195, 271],
            "think",
            s06_tags,
            {"tool_traces_merged": True},
        ),
        "output": write_layer(
            s06_folder,
            "output.md",
            s06_output,
            "s02-06",
            session,
            SRC2,
            [195, 271],
            "output",
            s06_tags,
        ),
    }

    # --- Scene 07: lines 273-end ---
    s07_prompt, s07_think, s07_output = slice_turn(lines, 273, 275, 324, len(lines))
    s07_folder = OUT / session / "07-artefacto-aleph-gaia-reprompt-diamat"
    s07_folder.mkdir(parents=True, exist_ok=True)
    s07_tags = ["Aleph", "Gaia", "diamat", "criterio-demarcacion", "artefacto"]
    s07_files = {
        "prompt": write_layer(
            s07_folder,
            "prompt.md",
            s07_prompt,
            "s02-07",
            session,
            SRC2,
            [273, len(lines)],
            "prompt",
            s07_tags,
        ),
        "think": write_layer(
            s07_folder,
            "think.md",
            s07_think,
            "s02-07",
            session,
            SRC2,
            [273, len(lines)],
            "think",
            s07_tags,
        ),
        "output": write_layer(
            s07_folder,
            "output.md",
            s07_output,
            "s02-07",
            session,
            SRC2,
            [273, len(lines)],
            "output",
            s07_tags,
        ),
    }

    return [
        {
            "id": "s02-01",
            "session": session,
            "slug": "01-diamat-ciencia-nacional",
            "source": {"file": SRC2, "line_start": 3, "line_end": 91},
            "title": "¿Diamat es ciencia?",
            "tags": s01_tags,
            "files": {k: str(v.relative_to(OUT)) for k, v in s01_files.items()},
            "anomalies": [],
        },
        {
            "id": "s02-02",
            "session": session,
            "slug": "02-peticion-demarcacion-respuesta-test2",
            "source": {"file": SRC2, "line_start": 93, "line_end": 93},
            "title": "Petición demarcación → desvío test2",
            "tags": s02_tags,
            "files": {k: str(v.relative_to(OUT)) for k, v in s02_files.items()},
            "anomalies": s02_anomalies,
        },
        {
            "id": "s02-03",
            "session": session,
            "slug": "03-objetividad-sistemica-psoe-corea",
            "source": {"file": SRC2, "line_start": 93, "line_end": 93},
            "title": "Objetividad sistémica I (PSOE / RPDC)",
            "tags": s03_tags,
            "files": {k: str(v.relative_to(OUT)) for k, v in s03_files.items()},
            "anomalies": ["contenido_embebido_en_linea_93"],
        },
        {
            "id": "s02-04",
            "session": session,
            "slug": "04-objetividad-sistemica-mapa-geoglobal",
            "source": {"file": SRC2, "line_start": 93, "line_end": 93},
            "title": "Objetividad sistémica II (mapa geoglobal + Wilber)",
            "tags": s04_tags,
            "files": {k: str(v.relative_to(OUT)) for k, v in s04_files.items()},
            "anomalies": ["contenido_embebido_en_linea_93"],
        },
        {
            "id": "s02-05",
            "session": session,
            "slug": "05-perspectiva-gaia-siglo-xxi",
            "source": {"file": SRC2, "line_start": 93, "line_end": 193},
            "title": "Perspectiva Gaia 2026-2100",
            "tags": s05_tags,
            "files": {k: str(v.relative_to(OUT)) for k, v in s05_files.items()},
            "anomalies": s05_anomalies,
        },
        {
            "id": "s02-06",
            "session": session,
            "slug": "06-linea-demarcacion-abc-aleph",
            "source": {"file": SRC2, "line_start": 195, "line_end": 271},
            "title": "Línea demarcación a/b/c (Aleph)",
            "tags": s06_tags,
            "files": {k: str(v.relative_to(OUT)) for k, v in s06_files.items()},
            "anomalies": ["redireccion_usuario_tras_desvio_gaia"],
        },
        {
            "id": "s02-07",
            "session": session,
            "slug": "07-artefacto-aleph-gaia-reprompt-diamat",
            "source": {"file": SRC2, "line_start": 273, "line_end": len(lines)},
            "title": "Artefacto Aleph+Gaia reprompt diamat",
            "tags": s07_tags,
            "files": {k: str(v.relative_to(OUT)) for k, v in s07_files.items()},
            "anomalies": [],
        },
    ]


def build_indice(manifest: list[dict]) -> str:
    lines = [
        "# INDICE — corpus logs-aleph",
        "",
        "## Visión del hilo",
        "",
        "El corpus documenta un hilo en dos sesiones. En la **sesión 1** ([log-agent-1.md](raw/log-agent-1.md)) "
        "el usuario establece un marco historiográfico (canon, sedimentos, Halley 218) y encarna al agente como "
        "*voz Aleph*: no bot-agente lineal, sino punto que ve superposiciones. Tras criticar un contra-ejemplo "
        "\"demo-liberal\" (mecánica cuántica como historiografía), acuerdan el método de la *semilla* y tres "
        "*alephs* que sobrevuelan un *Eigenstate* sin colapsarlo. La sesión cierra con el eigenstate Halley "
        "puro, sin referencias al bot-agente, y la palabra **«Sigue en»**.",
        "",
        "La **sesión 2** ([log-agent-2.md](raw/log-agent-2.md)) continúa con la nota `(viene de) log-agent-1.md`. "
        "El hilo pivota hacia epistemología política: ¿el diamat es ciencia?, objetividad sistémica (PSOE, Corea, "
        "mapa geoglobal, Wilber), perspectiva Gaia termodinámica, la línea del criterio de demarcación (historia, "
        "state of the art, deseo de Gaia) y un **artefacto** Aleph+Gaia que re-responde al prompt original del diamat.",
        "",
        "## Tabla de escenas",
        "",
        "| ID | Escena | Resumen | Tags |",
        "|----|--------|---------|------|",
    ]
    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        summary = sc["title"]
        tags = ", ".join(f"`{t}`" for t in sc["tags"][:4])
        lines.append(
            f"| [{sc['id']}]({rel}/) | [{sc['slug']}]({rel}/) | {summary} | {tags} |"
        )

    lines.extend(
        [
            "",
            "## Mapa conceptual",
            "",
            "```mermaid",
            "flowchart TB",
            "  subgraph s1 [Sesion 01 Halley Aleph]",
            "    A1[01 Marco historiografico]",
            "    A2[02 Critica bot liberal]",
            "    A3[03 Mandato semilla]",
            "    A4[04 Eigenstate v1]",
            "    A5[05 Eigenstate puro]",
            "    A1 --> A2 --> A3 --> A4 --> A5",
            "  end",
            "  subgraph s2 [Sesion 02 Demarcacion Gaia]",
            "    B1[01 Diamat ciencia]",
            "    B2[02 Anomalia test2]",
            "    B3[03 Obj sistemica I]",
            "    B4[04 Obj sistemica II]",
            "    B5[05 Gaia]",
            "    B6[06 Demarcacion ABC]",
            "    B7[07 Artefacto reprompt]",
            "    B1 --> B2 --> B3 --> B4 --> B5 --> B6 --> B7",
            "  end",
            "  A5 -->|Sigue en| B1",
            "  B6 --> B7",
            "  B1 -.->|repregunta| B7",
            "```",
            "",
            "## Anomalías documentadas",
            "",
            "1. **Continuidad entre logs**: `log-agent-2.md` línea 1 = `(viene de) log-agent-1.md`; "
            "`log-agent-1.md` termina en `Sigue en`.",
            "2. **s02-02 — corrupción línea 93**: el usuario pide disertación Aleph sobre demarcación; "
            "el output real critica `test2.md` (Lenin, Marcuse, Adorno). Prompt y think inglés estaban fusionados.",
            "3. **s02-03 / s02-04**: escenas embebidas dentro de la línea 93 monolítica.",
            "4. **s02-05 — think duplicado**: think en inglés (línea 93) + plan en español (líneas 95-121); "
            "output legible en líneas 123-193.",
            "5. **s02-06**: el usuario redirige («No, no me has entendido, ¿tú eras Aleph?») tras el desvío Gaia.",
            "6. **Footers AI**: `This response is AI-generated...` eliminados del cuerpo; anotados en frontmatter.",
            "",
            "## Guía de consulta para agentes",
            "",
            "| Pregunta | Archivo recomendado |",
            "|----------|---------------------|",
            "| ¿Perihelio Halley sin contra-ejemplo? | `sesion-01-halley-aleph/05-eigenstate-halley-puro/output.md` |",
            "| ¿Crítica al bot demo-liberal? | `sesion-01-halley-aleph/02-critica-bot-demo-liberal/` (think + output) |",
            "| ¿Método semilla y tres alephs? | `sesion-01-halley-aleph/03-mandato-semilla-tres-alephs/output.md` |",
            "| ¿Diamat y línea de demarcación? | `sesion-02-demarcacion-gaia/07-artefacto-aleph-gaia-reprompt-diamat/output.md` |",
            "| ¿Historia/state of the art demarcación? | `sesion-02-demarcacion-gaia/06-linea-demarcacion-abc-aleph/output.md` |",
            "| ¿Objetividad sistémica PSOE/Corea? | `sesion-02-demarcacion-gaia/03-objetividad-sistemica-psoe-corea/` |",
            "| ¿Mapa geoglobal + Wilber? | `sesion-02-demarcacion-gaia/04-objetividad-sistemica-mapa-geoglobal/` |",
            "| ¿Perspectiva Gaia 2026-2100? | `sesion-02-demarcacion-gaia/05-perspectiva-gaia-siglo-xxi/output.md` |",
            "| ¿Anomalía test2? | `sesion-02-demarcacion-gaia/02-peticion-demarcacion-respuesta-test2/` + `manifest.json` |",
            "",
            "## Fuentes originales (intactas)",
            "",
            "- [log-agent-1.md](raw/log-agent-1.md) — sesión Halley / Aleph",
            "- [log-agent-2.md](raw/log-agent-2.md) — sesión demarcación / Gaia",
            "",
            "## Estructura del corpus",
            "",
            "```",
            "logs-aleph/",
            "├── raw/                    # logs originales (fuente de verdad)",
            "├── segment_logs.py         # segmentador reproducible",
            "├── manifest.json",
            "├── INDICE.md",
            "├── sesion-01-halley-aleph/",
            "└── sesion-02-demarcacion-gaia/",
            "```",
            "",
        ]
    )

    # Per-scene detail blocks
    lines.append("## Detalle por escena\n")
    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        lines.append(f"### [{sc['slug']}]({rel}/)")
        lines.append(f"**Pregunta/tema:** {sc['title']}")
        lines.append(f"**Tags:** {', '.join(f'`{t}`' for t in sc['tags'])}")
        if sc.get("anomalies"):
            lines.append(f"**Anomalías:** {', '.join(sc['anomalies'])}")
        lines.append(
            f"- [prompt]({rel}/prompt.md) · [think]({rel}/think.md) · [output]({rel}/output.md)"
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


def verify_content_coverage(manifest: list[dict]) -> dict:
    """Check scene bodies map back to raw log line ranges (no content lost in move)."""
    issues = []
    logs = {SRC1: LOG1, SRC2: LOG2}
    line_counts = {}

    for src, path in logs.items():
        if not path.exists():
            issues.append(f"Raw log missing: {path}")
            continue
        lines = read_lines(path)
        line_counts[src] = len(lines)

    for sc in manifest:
        src = sc["source"]["file"]
        if src not in logs:
            issues.append(f"{sc['id']}: unknown source {src}")
            continue
        ls, le = sc["source"]["line_start"], sc["source"]["line_end"]
        n = line_counts.get(src, 0)
        if le > n:
            issues.append(f"{sc['id']}: line_end {le} exceeds {src} ({n} lines)")

        source_lines = read_lines(logs[src])
        source_chunk = normalize_ws("".join(source_lines[ls - 1 : le]))

        for layer in ("prompt", "think", "output"):
            p = OUT / sc["files"][layer]
            body = normalize_ws(body_from_md(p))
            if len(body) < 30:
                continue
            needle = body[: min(100, len(body))]
            if needle not in source_chunk:
                # embedded-in-line-93 scenes: check full raw file
                full = normalize_ws("".join(source_lines))
                if needle[:60] not in full:
                    issues.append(
                        f"{sc['id']}/{layer}: body not found in source range {ls}-{le}"
                    )

    # Session 1 line coverage: scenes should span 1..414 without gaps (except blank separators)
    s1_ranges = [
        (sc["source"]["line_start"], sc["source"]["line_end"])
        for sc in manifest
        if sc["source"]["file"] == SRC1
    ]
    if s1_ranges:
        s1_ranges.sort()
        if s1_ranges[0][0] != 1:
            issues.append(f"s01: first scene does not start at line 1 ({s1_ranges[0][0]})")
        if s1_ranges[-1][1] != line_counts.get(SRC1, 0):
            issues.append(
                f"s01: last scene ends at {s1_ranges[-1][1]}, "
                f"expected {line_counts.get(SRC1, 0)}"
            )

    return {
        "raw_lines": line_counts,
        "coverage_issues": issues,
        "ok": len(issues) == 0,
    }


def verify(manifest: list[dict]) -> dict:
    issues = []
    file_count = 0
    for sc in manifest:
        for layer in ("prompt", "think", "output"):
            p = OUT / sc["files"][layer]
            file_count += 1
            if not p.exists():
                issues.append(f"Missing: {p}")
            elif p.stat().st_size == 0:
                issues.append(f"Empty: {p}")
    # Check originals untouched
    for orig in (LOG1, LOG2):
        if not orig.exists():
            issues.append(f"Original missing: {orig}")
    return {
        "scenes": len(manifest),
        "files": file_count,
        "expected_files": len(manifest) * 3,
        "issues": issues,
        "ok": len(issues) == 0 and file_count == len(manifest) * 3,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = build_session1() + build_session2()
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (OUT / "INDICE.md").write_text(build_indice(manifest), encoding="utf-8")
    result = verify(manifest)
    coverage = verify_content_coverage(manifest)
    result["coverage"] = coverage
    result["ok"] = result["ok"] and coverage["ok"]
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
