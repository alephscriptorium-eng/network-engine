#!/usr/bin/env python3
"""Materialize linea-poder corpus from nodos.yaml.

Reads human-edited nodos.yaml (or manifest.json) and writes:
  - manifest.json
  - nodos/Pxx/meta.json (one per node)
  - INDICE.md
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError as exc:
    raise SystemExit("segment_poder.py requires PyYAML: pip install pyyaml") from exc

ROOT = Path(__file__).resolve().parent
NODOS_YAML = ROOT / "nodos.yaml"
MANIFEST_JSON = ROOT / "manifest.json"
INDICE_MD = ROOT / "INDICE.md"
NODOS_DIR = ROOT / "nodos"

WIKI_BASE = "https://es.wikipedia.org/wiki"
VILLACAÑAS_REF = (
    "José Luis Villacañas, *Historia del poder político en España* (RBA, 2014/2023); "
    "*La formación de los reinos hispánicos* (Espasa, 2006)."
)
MEDIDOR_LINK = "../../medidor-poder-politico"
ARG_LINK = "../../scriptorium-network-games/ALEPH_ET_OMEGA/index.md"


def load_source(path: Path | None) -> dict:
    if path and path.suffix == ".json":
        return json.loads(path.read_text(encoding="utf-8"))
    src = path or NODOS_YAML
    if not src.exists():
        raise FileNotFoundError(f"Missing source: {src}")
    data = yaml.safe_load(src.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or "nodos" not in data:
        raise ValueError("Source must contain a 'nodos' list")
    return data


def normalize_nodo(raw: dict) -> dict:
    required = ("id", "parte", "año_ini", "etiqueta", "tesis_villacañas")
    for key in required:
        if key not in raw:
            raise ValueError(f"Nodo {raw.get('id', '?')} missing field: {key}")
    articulos = raw.get("articulos_wp") or []
    if isinstance(articulos, str):
        articulos = [articulos]
    return {
        "id": raw["id"],
        "parte": raw["parte"],
        "año_ini": raw["año_ini"],
        "año_fin": raw.get("año_fin"),
        "etiqueta": raw["etiqueta"],
        "tesis_villacañas": raw["tesis_villacañas"],
        "articulos_wp": articulos,
        "paths": {
            "meta": f"nodos/{raw['id']}/meta.json",
            "folder": f"nodos/{raw['id']}/",
        },
        "urls": {
            "wp_primary": f"{WIKI_BASE}/{articulos[0]}" if articulos else None,
        },
    }


def format_years(nodo: dict) -> str:
    fin = nodo.get("año_fin")
    if fin is None:
        return f"{nodo['año_ini']}–hoy"
    return f"{nodo['año_ini']}–{fin}"


def build_manifest(data: dict) -> dict:
    nodos = [normalize_nodo(n) for n in data["nodos"]]
    ids = {n["id"] for n in nodos}
    if len(ids) != len(nodos):
        raise ValueError("Duplicate nodo ids in source")
    expected = {f"P{i:02d}" for i in range(1, 25)}
    if ids != expected:
        missing = sorted(expected - ids)
        extra = sorted(ids - expected)
        raise ValueError(f"Expected P01–P24; missing={missing} extra={extra}")

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "meta": {
            "corpus": data.get("corpus", "linea-poder"),
            "version": data.get("version", "0.1.0"),
            "generated_at": generated_at,
            "source": "nodos.yaml",
            "autor_tronco": data.get("autor_tronco", "José Luis Villacañas Berlanga"),
            "referencia_wp_cima": data.get("referencia_wp_cima", "Historia_de_España"),
            "nodo_count": len(nodos),
            "partes": data.get("partes", []),
            "satelite_wp": "wp/historia/",
            "links": {
                "medidor": MEDIDOR_LINK,
                "arg": ARG_LINK,
                "wp_cima": f"{WIKI_BASE}/Historia_de_España",
            },
        },
        "nodos": nodos,
    }


def write_nodo_meta(nodo: dict) -> Path:
    folder = NODOS_DIR / nodo["id"]
    folder.mkdir(parents=True, exist_ok=True)
    meta = {
        "id": nodo["id"],
        "parte": nodo["parte"],
        "año_ini": nodo["año_ini"],
        "año_fin": nodo["año_fin"],
        "etiqueta": nodo["etiqueta"],
        "tesis_villacañas": nodo["tesis_villacañas"],
        "articulos_wp": nodo["articulos_wp"],
        "años_display": format_years(nodo),
        "urls": {
            "wp": [f"{WIKI_BASE}/{t}" for t in nodo["articulos_wp"]],
        },
    }
    path = folder / "meta.json"
    path.write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def parte_label(partes: list[dict], parte_id: str) -> str:
    for p in partes:
        if p.get("id") == parte_id:
            return p.get("titulo", parte_id)
    return parte_id


def build_indice(manifest: dict) -> str:
    meta = manifest["meta"]
    nodos = manifest["nodos"]
    partes = meta.get("partes", [])

    lines = [
        "# INDICE — linea-poder",
        "",
        "Tronco cronológico **P01–P24** (José Luis Villacañas) para el ARG "
        "[ALEPH et OMEGA](https://github.com/alephscriptorium-eng/scriptorium-network-games/tree/main/ALEPH_ET_OMEGA).",
        "",
        "## Tesis del corpus",
        "",
        "Este corpus no es una cronología enciclopédica lineal: es el **tronco del poder político**",
        "en España como espina dorsal para ubicar semillas (artículos, conversaciones, buffers MCS)",
        "en nodos históricos con tesis Villacañas y anclas Wikipedia (L0).",
        "",
        f"Referencia: {VILLACAÑAS_REF}",
        "",
        "Satélite WP v0: [`wp/historia/`](wp/historia/) — historial del artículo "
        f"[Historia de España]({WIKI_BASE}/Historia_de_España).",
        "",
        "## Partes",
        "",
        "| Parte | Años | Nodos | Título |",
        "|-------|------|-------|--------|",
    ]
    for p in partes:
        años = f"{p.get('año_ini', '?')}–{p.get('año_fin') or 'hoy'}"
        nodos_str = "–".join(p.get("nodos", [])[:1] + p.get("nodos", [])[-1:])
        if len(p.get("nodos", [])) > 2:
            nodos_str = f"{p['nodos'][0]}–{p['nodos'][-1]}"
        lines.append(
            f"| **{p.get('id', '?')}** | {años} | {nodos_str} | {p.get('titulo', '')} |"
        )

    lines.extend(
        [
            "",
            "## Nodos P01–P24",
            "",
            "| ID | Años | Etiqueta | Parte | Tesis Villacañas | WP |",
            "|----|------|----------|-------|------------------|-----|",
        ]
    )
    for n in nodos:
        wp = n["articulos_wp"][0] if n["articulos_wp"] else "—"
        wp_link = f"[{wp}]({WIKI_BASE}/{wp})" if wp != "—" else "—"
        parte_t = parte_label(partes, n["parte"])
        lines.append(
            f"| [{n['id']}](nodos/{n['id']}/meta.json) | {format_years(n)} | "
            f"{n['etiqueta']} | {n['parte']} — {parte_t} | {n['tesis_villacañas']} | {wp_link} |"
        )

    lines.extend(
        [
            "",
            "## Enlaces cruzados",
            "",
            f"- Medidor: [`medidor-poder-politico`]({MEDIDOR_LINK})",
            f"- ARG: [`ALEPH_ET_OMEGA/index.md`]({ARG_LINK})",
            f"- Manifest: [`manifest.json`](manifest.json)",
            f"- Fuente humana: [`nodos.yaml`](nodos.yaml)",
            "",
            "## Estructura",
            "",
            "```",
            "linea-poder/",
            "├── nodos.yaml           # fuente de verdad",
            "├── segment_poder.py",
            "├── manifest.json",
            "├── INDICE.md",
            "├── nodos/P01..P24/meta.json",
            "└── wp/historia/         # satélite Wikipedia",
            "```",
            "",
            "## Comandos",
            "",
            "```bash",
            "python segment_poder.py",
            "# WP satélite (desde linea-aleph):",
            "python scripts/fetch_wp_historia.py   # o ver wp/historia/README.md",
            "```",
            "",
            f"_Generado: {meta['generated_at']}_",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Materialize linea-poder from nodos.yaml")
    parser.add_argument(
        "--source",
        type=Path,
        default=NODOS_YAML,
        help="nodos.yaml or manifest.json (default: nodos.yaml)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Parse only, do not write")
    args = parser.parse_args()

    data = load_source(args.source)
    manifest = build_manifest(data)

    if args.dry_run:
        print(json.dumps({"ok": True, "nodo_count": len(manifest["nodos"]), "dry_run": True}, indent=2))
        return

    MANIFEST_JSON.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    written_meta: list[str] = []
    for nodo in manifest["nodos"]:
        path = write_nodo_meta(nodo)
        written_meta.append(str(path.relative_to(ROOT)))

    INDICE_MD.write_text(build_indice(manifest), encoding="utf-8")

    result = {
        "ok": True,
        "nodo_count": len(manifest["nodos"]),
        "manifest": str(MANIFEST_JSON.relative_to(ROOT)),
        "indice": str(INDICE_MD.relative_to(ROOT)),
        "nodos_meta": written_meta,
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
