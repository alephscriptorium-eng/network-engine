#!/usr/bin/env python3
"""Segment sima-aleph/raw/log-agent-1.md into ruptura/discrepancia corpus."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
LOG = RAW / "log-agent-1.md"
SRC = "raw/log-agent-1.md"
OUT = ROOT
SESSION = "sesion-01-ruptura-economia-hiperipl"

FOOTER = "This response is AI-generated, for reference only."
SEARCH_UNAVAILABLE = re.compile(r"Search is unavailable", re.I)
SCOPE_REFUSAL = re.compile(r"Sorry, that's beyond my current scope", re.I)
WE_NEED = re.compile(r"^We need to\b")
INTERPRETATION = re.compile(r"^Interpretation:")

COTA_TAGS = ["cota:sima", "ruptura", "discrepancia", "eigenstate"]

SCENES = [
    {
        "id": "s01-01",
        "slug": "01-rallo-vs-capital",
        "title": "Contraste Rallo / El Capital",
        "lines": (1, 89),
        "prompt_line": 1,
        "prompt_end": 3,
        "trace_lines": [5],
        "think_start": 7,
        "think_end": 9,
        "output_start": 11,
        "tags": [*COTA_TAGS, "Rallo", "Marx", "valor-trabajo", "discrepancia"],
        "rol": "discrepancia",
        "anomalies": [],
    },
    {
        "id": "s01-02",
        "slug": "02-tabla-cuatro-columnas",
        "title": "Tabla Marx / Rallo / Ethereum / LLM",
        "lines": (90, 135),
        "prompt_line": 90,
        "prompt_end": 90,
        "think_start": 92,
        "think_end": 94,
        "output_start": 96,
        "trace_lines": [134],
        "tags": [*COTA_TAGS, "Rallo", "Marx", "Ethereum", "tabla"],
        "rol": "eigenstate",
        "anomalies": ["ai_generated_footer_en_trace"],
    },
    {
        "id": "s01-03",
        "slug": "03-objetividad-llm-columna4",
        "title": "Diseño posicionamiento LLM (columna 4)",
        "lines": (136, 182),
        "prompt_line": 136,
        "prompt_end": 136,
        "think_start": 138,
        "think_end": 168,
        "output_start": 170,
        "tags": [*COTA_TAGS, "objetividad-sistemica", "LLM", "Ethereum"],
        "rol": "eigenstate",
        "anomalies": [],
    },
    {
        "id": "s01-04",
        "slug": "04-vocabulario-cristiano-parabolas",
        "title": "Vocabulario cristiano y parábolas cruzadas",
        "lines": (183, 280),
        "prompt_line": 183,
        "prompt_end": 183,
        "think_start": 185,
        "think_end": 225,
        "output_start": 227,
        "trace_lines": [279],
        "tags": [*COTA_TAGS, "teologia", "parabolas", "Rallo", "Marx", "Ethereum"],
        "rol": "ruptura",
        "anomalies": ["ai_generated_footer_en_trace"],
    },
    {
        "id": "s01-05",
        "slug": "05-hiperplaza-ethereum-foos",
        "title": "Hiperplaza / Ethereum FOSS y espejo eclesial",
        "lines": (281, 494),
        "prompt_line": 281,
        "prompt_lines": [281, 386, 390],
        "think_ranges": [(283, 291), (392, 400)],
        "output_ranges": [(293, 383), (402, 493)],
        "trace_lines": [384, 388, 494],
        "tags": [*COTA_TAGS, "HiperIPL", "Ethereum", "FOSS", "hiperplaza", "eclesiologia"],
        "rol": "ruptura",
        "anomalies": [
            "tres_turnos_fusionados_jacobina_china_hiperplaza",
            "rechazo_scope_china_linea_388",
            "ai_generated_footer_en_trace",
        ],
    },
    {
        "id": "s01-06",
        "slug": "06-artefacto-hiperipl",
        "title": "Informe ejecutivo HiperIPL",
        "lines": (495, 675),
        "prompt_line": 495,
        "prompt_end": 495,
        "think_start": 497,
        "think_end": 517,
        "output_start": 519,
        "tags": [*COTA_TAGS, "HiperIPL", "DAO", "IPL", "hiperplaza"],
        "rol": "discrepancia",
        "anomalies": [],
    },
    {
        "id": "s01-07",
        "slug": "07-addendas-gobernanza",
        "title": "Ecosistema Web3, addendas y visiones leninistas",
        "lines": (676, 890),
        "prompt_line": 676,
        "prompt_lines": [676, 724, 817],
        "think_ranges": [(680, 686), (726, 738), (819, 841)],
        "output_ranges": [(688, 722), (740, 815), (843, 890)],
        "trace_lines": [678],
        "tags": [*COTA_TAGS, "HiperIPL", "gobernanza", "addendas", "Lenin", "Trotsky"],
        "rol": "discrepancia",
        "anomalies": [
            "tres_turnos_fusionados_ecosistema_addendas_lenin",
            "bloque_leninista_sin_escena_dedicada",
        ],
    },
    {
        "id": "s01-08",
        "slug": "08-bakunin-proudhon-hiperipl",
        "title": "Bakunin / Proudhon vs HiperIPL",
        "lines": (891, 997),
        "prompt_line": 891,
        "prompt_end": 891,
        "think_start": 895,
        "think_end": 939,
        "output_start": 941,
        "trace_lines": [893],
        "tags": [*COTA_TAGS, "HiperIPL", "Bakunin", "Proudhon", "anarquismo"],
        "rol": "ruptura",
        "anomalies": ["search_unavailable_en_trace"],
    },
    {
        "id": "s01-09",
        "slug": "09-gaia-hiperipl",
        "title": "Gaia como marco crítico de HiperIPL",
        "lines": (998, 1069),
        "prompt_line": 998,
        "prompt_end": 998,
        "think_start": 1000,
        "think_end": 1004,
        "output_start": 1006,
        "tags": [*COTA_TAGS, "HiperIPL", "Gaia", "objetividad-sistemica", "termo"],
        "rol": "eigenstate",
        "anomalies": [],
    },
    {
        "id": "s01-10",
        "slug": "10-zigurat-centro-vacio",
        "title": "Cuatro arquitecturas de la voz / centro vacío",
        "lines": (1070, 1139),
        "prompt_line": 1070,
        "prompt_end": 1070,
        "think_start": 1072,
        "think_end": 1078,
        "output_start": 1080,
        "tags": [*COTA_TAGS, "HiperIPL", "zigurat", "ekklesia", "eigenstate", "ancla"],
        "rol": "eigenstate",
        "anomalies": ["escena_ancla_sima"],
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
    if SCOPE_REFUSAL.search(s):
        return True
    return False


def is_think_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return False
    if WE_NEED.match(s):
        return True
    if INTERPRETATION.match(s):
        return True
    return False


def join_range(lines: list[str], start: int, end: int) -> str:
    return "".join(lines[start - 1 : end]).rstrip("\n")


def join_ranges(lines: list[str], ranges: list[tuple[int, int]]) -> str:
    parts: list[str] = []
    for start, end in ranges:
        chunk = join_range(lines, start, end).strip()
        if chunk:
            parts.append(chunk)
    return "\n\n".join(parts)


def extract_layers(lines: list[str], scene: dict) -> tuple[str, str, str, str]:
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

        if i in trace_line_nums or is_trace_line(line):
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

    prompt = "\n\n".join(prompt_parts).strip()
    trace = "\n\n".join(trace_parts).strip()
    think = "\n\n".join(think_parts).strip()
    output = "\n".join(output_parts).strip()
    return prompt, think, output, trace


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
            extra={"cota": "sima", "rol": scene["rol"]} if layer_tag == "prompt" else None,
        )
        if p:
            files[layer_name] = str(p.relative_to(OUT))

    return {
        "id": scene["id"],
        "session": SESSION,
        "slug": scene["slug"],
        "source": {"file": SRC, "line_start": ls, "line_end": le},
        "title": scene["title"],
        "cota": "sima",
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
                if layer == "trace":
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
        "# INDICE — corpus sima-aleph",
        "",
        "## Rol en el tablero Aleph",
        "",
        "**Cota mínima (sima):** ruptura, discrepancia, **Eigenstate sin colapsar**.",
        "Rallo ≠ Marx ≠ Ethereum ≠ teología ≠ Gaia — coexisten sin síntesis falsa.",
        "",
        "Escena ancla: [`10-zigurat-centro-vacio`](sesion-01-ruptura-economia-hiperipl/10-zigurat-centro-vacio/).",
        "",
        "Plan multitask: [`aleph-context/PLAN-multitask-sima-cima.md`](../aleph-context/PLAN-multitask-sima-cima.md).",
        "Confluencia (cota máx): [`cima-aleph/`](../cima-aleph/).",
        "Espina: [`linea-aleph/`](../linea-aleph/INDICE.md).",
        "",
        "## Visión del hilo",
        "",
        "El corpus [`raw/log-agent-1.md`](raw/log-agent-1.md) (~1138 líneas) documenta un ejercicio",
        "de teoría política y económica: crítica de Rallo a Marx, tabla de cuatro polos",
        "(Capital / Rallo / Ethereum / objetividad LLM), capa teológica cristiana, hiperplaza FOSS,",
        "artefacto HiperIPL (DAO + IPL sindical), críticas leninista/anarquista/Gaia, y cierre",
        "con las cuatro arquitecturas de la voz y el centro vacío de la ἐκκλησία.",
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
            "  subgraph sima [Sesion 01 Ruptura HiperIPL]",
            "    A1[01 Rallo vs Capital]",
            "    A2[02 Tabla 4 columnas]",
            "    A3[03 Objetividad LLM]",
            "    A4[04 Vocabulario cristiano]",
            "    A5[05 Hiperplaza FOSS]",
            "    A6[06 Artefacto HiperIPL]",
            "    A7[07 Addendas gobernanza]",
            "    A8[08 Bakunin Proudhon]",
            "    A9[09 Gaia]",
            "    A10[10 Zigurat centro vacio]",
            "    A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> A7 --> A8 --> A9 --> A10",
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
            "| ¿Rallo vs Marx valor-trabajo? | `01-rallo-vs-capital/output.md` |",
            "| ¿Tabla cuatro polos? | `02-tabla-cuatro-columnas/output.md` |",
            "| ¿Objetividad sistémica LLM? | `03-objetividad-llm-columna4/output.md` |",
            "| ¿Parábolas cristianas cruzadas? | `04-vocabulario-cristiano-parabolas/` |",
            "| ¿Hiperplaza FOSS eclesial? | `05-hiperplaza-ethereum-foos/output.md` |",
            "| ¿Informe HiperIPL? | `06-artefacto-hiperipl/output.md` |",
            "| ¿Addendas tiempos/espacios/relación? | `07-addendas-gobernanza/output.md` |",
            "| ¿Anarquismo vs HiperIPL? | `08-bakunin-proudhon-hiperipl/` |",
            "| ¿Crítica Gaia? | `09-gaia-hiperipl/output.md` |",
            "| ¿Ancla Eigenstate / centro vacío? | `10-zigurat-centro-vacio/output.md` |",
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
            "sima-aleph/",
            "├── raw/log-agent-1.md",
            "├── segment_sima_log.py",
            "├── manifest.json",
            "├── INDICE.md",
            "└── sesion-01-ruptura-economia-hiperipl/",
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
                "corpus": "sima-aleph",
                "cota": "sima",
                "description": "Ruptura, discrepancia, Eigenstate sin colapsar",
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
        "ok": coverage["ok"] and file_check["ok"],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
