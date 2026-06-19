#!/usr/bin/env python3
"""Segment logs-skill/raw/log-agent1.md into consultable meta-corpus."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
LOG = RAW / "log-agent1.md"
SRC = "raw/log-agent1.md"
OUT = ROOT

ASENTAMIENTO_RE = re.compile(
    r"<!--\s*ASENTAMIENTO_ALEPH\s*-->(.*?)<!--\s*/ASENTAMIENTO_ALEPH\s*-->",
    re.DOTALL,
)

TRACE_LINE = re.compile(
    r"^(Revisando|Lanzo|El script|La script|Escribiendo|Creando|Actualizando|"
    r"Mejorando|Refactorizando|Comprobando|Quick sanity|He lanzado|Te aviso|"
    r"Entiendo el diseño|Entiendo la|Listo:|El segmenter|Actualizando rutas|"
    r"\[Build logs-aleph)",
    re.IGNORECASE,
)

SCENE_META = [
    {
        "id": "s01-01",
        "session": "sesion-01-corpus-logs-aleph",
        "slug": "01-plan-corpus-logs",
        "title": "Plan corpus logs-aleph",
        "tags": ["plan", "logs-aleph", "corpus"],
        "refs_logs_aleph": [],
        "anomalies": [],
    },
    {
        "id": "s01-02",
        "session": "sesion-01-corpus-logs-aleph",
        "slug": "02-build-e-implementacion",
        "title": "Build e implementación logs-aleph",
        "tags": ["build", "segment_logs", "logs-aleph"],
        "refs_logs_aleph": [],
        "anomalies": ["build_e_implement_fusionados_dos_turnos_export"],
    },
    {
        "id": "s01-03",
        "session": "sesion-01-corpus-logs-aleph",
        "slug": "03-notificacion-subagente",
        "title": "Notificación subagente (meta)",
        "tags": ["subagent", "meta", "notification"],
        "refs_logs_aleph": [],
        "anomalies": ["turno_es_system_notification_no_usuario_real"],
    },
    {
        "id": "s01-04",
        "session": "sesion-01-corpus-logs-aleph",
        "slug": "04-migracion-autocontenida",
        "title": "Migración autocontenida (incompleta)",
        "tags": ["migracion", "verify", "logs-aleph"],
        "refs_logs_aleph": [],
        "anomalies": ["export_interrumpido_antes_de_verificar"],
    },
    {
        "id": "s02-01",
        "session": "sesion-02-linea-aleph",
        "slug": "01-infra-navegador-cache",
        "title": "Infra linea-aleph + navegador-caché",
        "tags": ["linea-aleph", "skill-browser", "demarcacion"],
        "refs_logs_aleph": ["s02-01", "s02-06"],
        "anomalies": [],
    },
    {
        "id": "s03-01",
        "session": "sesion-03-lectura-epistemologia",
        "slug": "01-asimetria-diamat-logs-s02",
        "title": "Asimetría diamat en logs-aleph s02",
        "tags": ["diamat", "epistemologia", "asimetria", "logs-aleph"],
        "refs_logs_aleph": ["s02-01", "s02-02"],
        "anomalies": [],
    },
    {
        "id": "s03-02",
        "session": "sesion-03-lectura-epistemologia",
        "slug": "02-ciclo-vital-ciencias-universales",
        "title": "Ciclo vital y ciencias universales",
        "tags": ["diamat", "ciclo-vital", "demarcacion", "linea-aleph"],
        "refs_logs_aleph": ["s02-01", "s02-06"],
        "anomalies": [],
    },
    {
        "id": "s04-01",
        "session": "sesion-04-skill-modo-aleph",
        "slug": "01-autorevisor-tablero-skill",
        "title": "AutoRevisor, tablero, refactor skill",
        "tags": ["modo-aleph", "autorevisor", "skill-design", "fundacional"],
        "refs_logs_aleph": ["s01-02", "s02-03"],
        "skill_artifacts": [".cursor/skills/modo-aleph/"],
        "anomalies": ["primer_asentamiento_aleph_canonico"],
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


def parse_turns(lines: list[str]) -> list[dict]:
    turns: list[dict] = []
    i = 0
    n = len(lines)
    while i < n:
        if lines[i].strip() == "**User**":
            user_start = i + 1
            i += 1
            while i < n and lines[i].strip() in ("", "---"):
                i += 1
            user_end = i
            while i < n and lines[i].strip() != "**Cursor**":
                if lines[i].strip() == "**User**":
                    break
                i += 1
            user_end = i
            user_body = "".join(lines[user_start:user_end]).strip()

            if i >= n or lines[i].strip() != "**Cursor**":
                break
            cursor_start = i + 1
            i += 1
            while i < n and lines[i].strip() in ("", "---"):
                i += 1
            cursor_end = i
            while i < n:
                if lines[i].strip() == "**User**":
                    break
                if lines[i].strip() == "# Conversión" and i > cursor_start:
                    break
                i += 1
            cursor_end = i
            cursor_body = "".join(lines[cursor_start:cursor_end]).strip()
            if user_body or cursor_body:
                turns.append(
                    {
                        "user_line_start": user_start,
                        "user_line_end": user_end,
                        "cursor_line_start": cursor_start,
                        "cursor_line_end": cursor_end,
                        "prompt": user_body,
                        "cursor": cursor_body,
                    }
                )
        else:
            i += 1
    return turns


def extract_meta(text: str) -> tuple[str, str]:
    meta_parts = []
    if "<system_notification>" in text or "<task>" in text:
        meta_parts.append(text)
        return "", text
    if "**Preferencias de estructura" in text or "> **¿Nombre preferido" in text:
        return text, ""
    return "", text


def split_trace_output(cursor: str) -> tuple[str, str]:
    if not cursor.strip():
        return "", ""
    lines = cursor.splitlines()
    trace_lines: list[str] = []
    output_lines: list[str] = []
    seen_heading = False
    for line in lines:
        stripped = line.strip()
        if not stripped:
            if seen_heading:
                output_lines.append(line)
            elif output_lines:
                output_lines.append(line)
            elif trace_lines:
                trace_lines.append(line)
            continue
        if stripped.startswith("##") or stripped.startswith("<!-- ASENTAMIENTO"):
            seen_heading = True
            output_lines.append(line)
            continue
        if not seen_heading and (
            TRACE_LINE.match(stripped)
            or (len(stripped) < 100 and not stripped.startswith("|"))
            or stripped.startswith("[Build logs-aleph")
        ):
            trace_lines.append(line)
        else:
            seen_heading = True
            output_lines.append(line)
    trace = "\n".join(trace_lines).strip()
    output = "\n".join(output_lines).strip()
    if not output and trace:
        output, trace = trace, ""
    return trace, output


def write_layer(
    folder: Path,
    name: str,
    body: str,
    scene_id: str,
    session: str,
    line_range: list[int],
    layer: str,
    tags: list[str],
    extra: dict | None = None,
) -> Path:
    meta = {
        "scene_id": scene_id,
        "session": session,
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


def build_indice(manifest: list[dict]) -> str:
    lines = [
        "# INDICE — logs-skill (meta-corpus)",
        "",
        "## Visión",
        "",
        "Corpus de la **sesión de diseño**: construcción de `logs-aleph/`,",
        "`linea-aleph/`, lectura epistemológica del diamat, y refactor del skill",
        "`modo-aleph` (tablero + AutoRevisor). Fuente: [`raw/log-agent1.md`](raw/log-agent1.md).",
        "Plan: [`raw/log-agent2.md`](raw/log-agent2.md).",
        "",
        "Activación del bucle eval: [`aleph-context/ACTIVACION.md`](../aleph-context/ACTIVACION.md).",
        "",
        "## Tabla de escenas",
        "",
        "| ID | Escena | Resumen | Tags |",
        "|----|--------|---------|------|",
    ]
    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        tags = ", ".join(f"`{t}`" for t in sc["tags"][:4])
        lines.append(
            f"| [{sc['id']}]({rel}/) | [{sc['slug']}]({rel}/) | {sc['title']} | {tags} |"
        )

    lines.extend(
        [
            "",
            "## Anomalías",
            "",
            "- **s01-03**: turno `system_notification`, no prompt usuario limpio.",
            "- **s01-04**: migración verificada fuera del export (interrumpido).",
            "- **s04-01**: primer `ASENTAMIENTO_ALEPH` canónico → `asentamiento.md`.",
            "",
            "## Capas por escena",
            "",
            "| Capa | Contenido |",
            "|------|-----------|",
            "| `prompt.md` | Usuario |",
            "| `trace.md` | Narrativa operativa Cursor |",
            "| `output.md` | Respuesta sustantiva |",
            "| `meta.md` | Notifications / preferencias plan |",
            "| `think.md` | Stub: export sin think interno |",
            "",
            "## Estructura",
            "",
            "```",
            "logs-skill/",
            "├── raw/log-agent1.md | log-agent2.md (plan)",
            "├── segment_skill_log.py",
            "├── manifest.json",
            "├── INDICE.md",
            "└── sesion-*/",
            "```",
            "",
            "Regenerar: `python3 segment_skill_log.py`",
            "",
        ]
    )

    lines.append("## Detalle por escena\n")
    for sc in manifest:
        rel = f"{sc['session']}/{sc['slug']}"
        lines.append(f"### [{sc['slug']}]({rel}/)")
        lines.append(f"**Tema:** {sc['title']}")
        if sc.get("refs_logs_aleph"):
            lines.append(f"**Refs logs-aleph:** {', '.join(sc['refs_logs_aleph'])}")
        if sc.get("anomalies"):
            lines.append(f"**Anomalías:** {', '.join(sc['anomalies'])}")
        links = f"- [prompt]({rel}/prompt.md) · [trace]({rel}/trace.md) · [output]({rel}/output.md)"
        if sc["files"].get("meta"):
            links += f" · [meta]({rel}/meta.md)"
        if sc["files"].get("asentamiento"):
            links += f" · [asentamiento]({rel}/asentamiento.md)"
        lines.append(links)
        lines.append("")

    return "\n".join(lines)


def verify(manifest: list[dict]) -> dict:
    issues = []
    file_count = 0
    required = ("prompt", "trace", "output", "think")
    for sc in manifest:
        for layer in required:
            p = OUT / sc["files"][layer]
            file_count += 1
            if not p.exists():
                issues.append(f"Missing: {p}")
            elif p.stat().st_size == 0 and layer != "trace":
                issues.append(f"Empty: {p}")
    return {
        "scenes": len(manifest),
        "files": file_count,
        "expected": len(manifest) * 4,
        "issues": issues,
        "ok": not issues and file_count == len(manifest) * 4,
    }


def merge_turns(turns: list[dict]) -> list[dict]:
    """Merge Build + Implement plan into single scene (export has 9 turns, 8 scenes)."""
    if len(turns) < 2:
        return turns
    out: list[dict] = [turns[0]]
    i = 1
    while i < len(turns):
        cur = turns[i]
        if cur["prompt"].strip().startswith("Build") and i + 1 < len(turns):
            nxt = turns[i + 1]
            out.append(
                {
                    "user_line_start": cur["user_line_start"],
                    "user_line_end": nxt["user_line_end"],
                    "cursor_line_start": cur["cursor_line_start"],
                    "cursor_line_end": nxt["cursor_line_end"],
                    "prompt": cur["prompt"].strip() + "\n\n---\n\n" + nxt["prompt"].strip(),
                    "cursor": (cur["cursor"] + "\n\n---\n\n" + nxt["cursor"]).strip(),
                }
            )
            i += 2
        else:
            out.append(cur)
            i += 1
    return out


def main() -> None:
    if not LOG.exists():
        raise FileNotFoundError(LOG)
    lines = read_lines(LOG)
    turns = merge_turns(parse_turns(lines))
    if len(turns) != len(SCENE_META):
        raise ValueError(f"Expected {len(SCENE_META)} turns, got {len(turns)}")

    manifest: list[dict] = []
    for meta, turn in zip(SCENE_META, turns):
        folder = OUT / meta["session"] / meta["slug"]
        folder.mkdir(parents=True, exist_ok=True)
        line_lo = turn["user_line_start"]
        line_hi = turn["cursor_line_end"]

        prompt = turn["prompt"]
        prompt_meta, prompt_clean = extract_meta(prompt)
        if prompt_meta and not prompt_clean:
            prompt_clean = prompt

        trace, output = split_trace_output(turn["cursor"])
        cursor_meta = ""
        if "<system_notification>" in turn["cursor"]:
            cursor_meta = turn["cursor"]

        files: dict[str, str] = {}
        files["prompt"] = str(
            write_layer(
                folder,
                "prompt.md",
                prompt_clean,
                meta["id"],
                meta["session"],
                [line_lo, turn["user_line_end"]],
                "prompt",
                meta["tags"],
            ).relative_to(OUT)
        )
        files["trace"] = str(
            write_layer(
                folder,
                "trace.md",
                trace or "_(sin trace operativo; respuesta íntegra en output)_",
                meta["id"],
                meta["session"],
                [turn["cursor_line_start"], turn["cursor_line_end"]],
                "trace",
                meta["tags"],
            ).relative_to(OUT)
        )
        files["output"] = str(
            write_layer(
                folder,
                "output.md",
                output or turn["cursor"],
                meta["id"],
                meta["session"],
                [turn["cursor_line_start"], turn["cursor_line_end"]],
                "output",
                meta["tags"],
            ).relative_to(OUT)
        )
        files["think"] = str(
            write_layer(
                folder,
                "think.md",
                "_Export Cursor: sin capa think interna. Usar trace.md + output.md._\n",
                meta["id"],
                meta["session"],
                [line_lo, line_hi],
                "think",
                meta["tags"],
                {"export_cursor": "no_internal_think"},
            ).relative_to(OUT)
        )

        meta_body = prompt_meta or cursor_meta
        if meta_body:
            files["meta"] = str(
                write_layer(
                    folder,
                    "meta.md",
                    meta_body,
                    meta["id"],
                    meta["session"],
                    [line_lo, line_hi],
                    "meta",
                    meta["tags"],
                ).relative_to(OUT)
            )

        full_out = output or turn["cursor"]
        am = ASENTAMIENTO_RE.search(full_out)
        if am:
            files["asentamiento"] = str(
                write_layer(
                    folder,
                    "asentamiento.md",
                    am.group(1).strip(),
                    meta["id"],
                    meta["session"],
                    [turn["cursor_line_start"], turn["cursor_line_end"]],
                    "asentamiento",
                    meta["tags"],
                    {"canonical": True},
                ).relative_to(OUT)
            )

        entry = {**meta, "source": {"file": SRC, "line_start": line_lo, "line_end": line_hi}, "files": files}
        manifest.append(entry)

    (OUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (OUT / "INDICE.md").write_text(build_indice(manifest), encoding="utf-8")
    result = verify(manifest)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
