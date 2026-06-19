#!/usr/bin/env python3
"""Parse linea.md (historial WP Problema de la demarcación) into linea-aleph/ corpus.

Phase 1 (default): manifest + INDICE skeleton + snapshot endpoints + milestone folders.
Phase 2 (--expand): materialize registro.md / delta.md stubs (milestones or all).
Phase 3 (agent/skill): fetch wikitext into cache/snapshots/ — not done here.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote

BASE = Path(__file__).parent
ROOT = BASE
CORPUS_ID = "linea-aleph"
DISPLAY_TITLE = "Problema de la demarcación (historial WP es)"
SRC_LINEA = "raw/linea.md"
LINEA = ROOT / "raw" / "linea.md"

TITLE = "Problema_de_la_demarcación"
WIKI_BASE = "https://es.wikipedia.org"


def configure_corpus(corpus_dir: str, title: str, corpus_id: str) -> None:
    global ROOT, CORPUS_ID, DISPLAY_TITLE, SRC_LINEA, LINEA, TITLE
    ROOT = BASE / corpus_dir if corpus_dir not in (".", "") else BASE
    CORPUS_ID = corpus_id
    TITLE = title.replace(" ", "_")
    DISPLAY_TITLE = f"{title.replace('_', ' ')} (historial WP es)"
    SRC_LINEA = "raw/linea.md"
    LINEA = ROOT / SRC_LINEA


def load_linea2_oldids(article: str) -> set[int]:
    m2 = BASE / "manifest2.json"
    if not m2.exists():
        return set()
    data = json.loads(m2.read_text(encoding="utf-8"))
    return {
        c["oldid"]
        for c in data.get("contribuciones", [])
        if c.get("title") == article.replace("_", " ")
    }


def load_linea2_contrib(article: str, oldid: int) -> dict | None:
    m2 = BASE / "manifest2.json"
    if not m2.exists():
        return None
    data = json.loads(m2.read_text(encoding="utf-8"))
    article_name = article.replace("_", " ")
    for c in data.get("contribuciones", []):
        if c.get("title") == article_name and c.get("oldid") == oldid:
            return c
    return None


# Last SolveCoagula edit per article (linea2); demarcación export ends earlier at 12370021
SC_CIERRE_OLDIDS = {
    "Problema_de_la_demarcación": 12763920,
    "Pseudociencia": 12910974,
}

# Registro line pattern (wiki history list item)
OLDID_RE = re.compile(
    r"oldid=(\d+).*?\[(\d{2}:\d{2}\s+\d{1,2}\s+\w+\s+\d{4})\].*?"
    r"oldid=(\d+)",
    re.DOTALL,
)
BYTES_RE = re.compile(r"\(\s*([\d\s\xa0]+)\s*bytes\s*\)")
DELTA_RE = re.compile(r"\(\s*([+\-]?[\d\s\xa0]+)\s*\)")
USER_RE = re.compile(
    r"/wiki/Usuario:([^\"\s]+)\"[^\"]*\"[^\"]*\"Usuario:([^\"]+)\""
)
SECTION_RE = re.compile(r"#([^\"\)\s]+)")
SUMMARY_PAREN_RE = re.compile(r"\)\s*\.\s*\.\s*\(([^)]+)\)\s*\(")

MILESTONE_DELTA = 500
MILESTONE_KEYWORDS = (
    "fusión",
    "fusion",
    "trasladado",
    "traducción",
    "traduccion",
    "proviene del artículo",
    "ampliada sección",
    "ordenación alfabética",
)


def read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines(keepends=True)


def ensure_raw_linea() -> Path:
    LINEA.parent.mkdir(parents=True, exist_ok=True)
    if not LINEA.exists():
        raise FileNotFoundError(
            f"Missing {LINEA} — copiar export WP a linea-aleph/raw/linea.md"
        )
    return LINEA


def slugify(text: str, max_len: int = 48) -> str:
    text = unquote(text).replace("_", "-")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if c.isalnum() or c in "- ")
    text = re.sub(r"[-\s]+", "-", text.strip().lower())
    return text[:max_len].strip("-") or "sin-seccion"


def parse_num(s: str) -> int:
    return int(s.replace("\xa0", "").replace(" ", "").replace(",", ""))


def extract_user(line: str) -> str:
    if "SolveCoagula" in line:
        return "SolveCoagula"
    if "Ctrl_Z" in line or "Ctrl Z" in line:
        return "Ctrl_Z"
    if "Pinar" in line:
        return "Pinar~eswiki"
    m = re.search(r"/wiki/Usuario:([^\"\s]+)", line)
    return unquote(m.group(1)) if m else "desconocido"


def extract_section(line: str) -> str | None:
    m = SECTION_RE.search(line)
    if not m:
        return None
    return unquote(m.group(1).replace("_", " "))


def extract_summary(line: str) -> str:
    if "ha sido trasladado" in line:
        m = re.search(r"\.\s*\.\s*\(([^)]+ha sido trasladado[^)]*)\)", line)
        if m:
            return m.group(1).strip()
    # Prefer text after byte delta, before (deshacer|undo link)
    m = re.search(
        r"bytes\)?\s*(?:\*\*\([+\-][\d\s\xa0]+\)\*\*|\([+\-]?[\d\s\xa0]+\))?\s*"
        r"\.\s*\.\s*\(([^)]+)\)\s*\(",
        line,
    )
    if m:
        s = m.group(1).strip()
        if "bytes" not in s and "→" not in s:
            return s
    parts = re.findall(r"\)\s*\.\s*\.\s*\(([^)]+)\)", line)
    for p in reversed(parts):
        if "deshacer" not in p.lower() and "→" not in p and "bytes" not in p.lower():
            return p.strip()
    return ""


def parse_registro_line(line: str, line_no: int, seq: int) -> dict | None:
    if not line.strip().startswith("-") or "oldid=" not in line:
        return None
    oldids = re.findall(r"oldid=(\d+)", line)
    if len(oldids) < 2:
        return None
    parent_oldid, oldid = oldids[0], oldids[2] if len(oldids) > 2 else oldids[1]
    # timestamp link uses revision oldid (third match typically)
    if len(oldids) >= 3:
        oldid = oldids[2]
        parent_oldid = oldids[1]

    tm = re.search(r"\[(\d{2}:\d{2}\s+\d{1,2}\s+\w+\s+\d{4})\]", line)
    timestamp = tm.group(1) if tm else ""

    bm = BYTES_RE.search(line)
    bytes_size = parse_num(bm.group(1)) if bm else None

    byte_delta = 0
    dm = re.search(r"\*\*\(([+\-]?[\d\s\xa0]+)\)\*\*", line)
    if dm:
        byte_delta = parse_num(dm.group(1))
    else:
        for dm in DELTA_RE.finditer(line):
            cand = dm.group(1)
            if "+" in cand or "-" in cand:
                byte_delta = parse_num(cand)
                break

    user = extract_user(line)
    section = extract_section(line)
    summary = extract_summary(line)

    reg_id = f"r{seq:04d}"
    slug = f"{reg_id}-oldid-{oldid}"
    if section:
        slug += f"-{slugify(section)[:30]}"

    milestone = False
    reasons: list[str] = []
    if abs(byte_delta) >= MILESTONE_DELTA:
        milestone = True
        reasons.append(f"byte_delta_{byte_delta}")
    low = summary.lower()
    for kw in MILESTONE_KEYWORDS:
        if kw in low or kw in line.lower():
            milestone = True
            reasons.append(f"keyword_{kw.replace(' ', '_')}")
            break
    if user not in ("SolveCoagula",) and abs(byte_delta) >= 100:
        milestone = True
        reasons.append(f"user_{user}")

    return {
        "id": reg_id,
        "slug": slug,
        "source": {"file": SRC_LINEA, "line": line_no},
        "oldid": int(oldid),
        "parent_oldid": int(parent_oldid),
        "timestamp": timestamp,
        "user": user,
        "bytes": bytes_size,
        "byte_delta": byte_delta,
        "section": section,
        "summary": summary,
        "urls": {
            "revision": f"{WIKI_BASE}/w/index.php?title={TITLE}&oldid={oldid}",
            "diff_prev": (
                f"{WIKI_BASE}/w/index.php?title={TITLE}"
                f"&diff={oldid}&oldid={parent_oldid}"
            ),
            "article": f"{WIKI_BASE}/wiki/{TITLE}",
        },
        "milestone": milestone,
        "milestone_reasons": reasons,
        "files": {},
        "delta_status": "pending",  # pending | draft | curated
    }


def parse_preamble(lines: list[str]) -> dict:
    pre = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip("\n")
        if line.strip().startswith("-") and "oldid=" in line:
            break
        if line.strip():
            pre.append(line)
        i += 1
    return {"lines": [1, i], "text": "\n".join(pre).strip()}


def build_manifest(lines: list[str]) -> tuple[dict, list[dict]]:
    preamble = parse_preamble(lines)
    registros: list[dict] = []
    seq = 1
    for i, line in enumerate(lines, 1):
        rec = parse_registro_line(line, i, seq)
        if rec:
            registros.append(rec)
            seq += 1

    if not registros:
        raise ValueError("No registros parsed from linea.md")

    # linea.md lists newest first (line 5) → oldest last (line 681)
    final = registros[0]
    inicial = registros[-1]

    sections: dict[str, int] = {}
    for r in registros:
        if r["section"]:
            sections[r["section"]] = sections.get(r["section"], 0) + 1

    previo_oldid = inicial["parent_oldid"]
    linea2_oldids = load_linea2_oldids(TITLE) if CORPUS_ID == "linea-pseudociencia" else set()
    if linea2_oldids:
        for r in registros:
            if r["oldid"] in linea2_oldids:
                r["in_linea2"] = True

    manifest_meta = {
        "corpus": CORPUS_ID,
        "title": DISPLAY_TITLE,
        "source": SRC_LINEA,
        "generated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "preamble": preamble,
        "registro_count": len(registros),
        "ordering": "newest_first_in_linea_md",
        "snapshots": {
            "previo": {
                "role": "previo",
                "registro_id": None,
                "oldid": previo_oldid,
                "timestamp": "28 sep 2007",
                "user": "Dhidalgo",
                "path": "snapshots/previo",
            },
            "final": {
                "role": "final",
                "registro_id": final["id"],
                "oldid": final["oldid"],
                "timestamp": final["timestamp"],
                "path": "snapshots/final",
            },
            "inicial": {
                "role": "inicial",
                "registro_id": inicial["id"],
                "oldid": inicial["oldid"],
                "timestamp": inicial["timestamp"],
                "summary": inicial["summary"],
                "path": "snapshots/inicial",
            },
            "sc_cierre": {
                "role": "sc_cierre",
                "oldid": SC_CIERRE_OLDIDS.get(TITLE, final["oldid"]),
                "path": "snapshots/sc_cierre",
            },
            "actual": {
                "role": "actual",
                "oldid": None,
                "path": "snapshots/actual",
            },
        },
        "ontology_sections": sorted(
            sections.items(), key=lambda x: -x[1]
        )[:40],
        "milestones": [r["id"] for r in registros if r["milestone"]],
    }
    return manifest_meta, registros


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
        elif v is None:
            lines.append(f"{k}: null")
        else:
            esc = str(v).replace('"', '\\"')
            lines.append(f'{k}: "{esc}"')
    lines.append("---\n")
    return "\n".join(lines)


def write_registro_files(reg: dict, prev_reg: dict | None, folder: Path) -> dict[str, str]:
    folder.mkdir(parents=True, exist_ok=True)
    rel = folder.relative_to(ROOT)

    registro_body = (
        f"{reg['summary'] or '(sin resumen en historial)'}\n\n"
        f"Línea cruda: ver [`{SRC_LINEA}`](../{SRC_LINEA}) línea {reg['source']['line']}.\n"
    )
    reg_path = folder / "registro.md"
    reg_path.write_text(
        yaml_frontmatter(
            {
                "registro_id": reg["id"],
                "oldid": reg["oldid"],
                "parent_oldid": reg["parent_oldid"],
                "timestamp": reg["timestamp"],
                "user": reg["user"],
                "bytes": reg["bytes"],
                "byte_delta": reg["byte_delta"],
                "section": reg["section"],
                "layer": "registro",
                "milestone": reg["milestone"],
            }
        )
        + registro_body,
        encoding="utf-8",
    )

    prev_id = prev_reg["id"] if prev_reg else None
    prev_oldid = prev_reg["oldid"] if prev_reg else None
    sec_note = f" en sección «{reg['section']}»" if reg["section"] else ""
    delta_tpl = (
        "## Delta (curación pendiente)\n\n"
        f"**Respecto a:** `{prev_id}` (oldid {prev_oldid})\n\n"
        f"**Cambio nominal:** {reg['byte_delta']:+d} bytes{sec_note}.\n\n"
        "### Preguntas guía (rellenar)\n\n"
        "- ¿Qué ontología/gnoseología entra o sale?\n"
        "- ¿Es ampliación, fusión, corrección o reorder?\n"
        "- ¿Qué enlaces de «Véase también» o referencias abre para la caché?\n"
        "- ¿Cómo se lee en la **línea de demarcación** (no una sola ciencia)?\n\n"
        "### Notas\n\n"
        "_Escribir aquí la interpretación del delta._\n"
    )
    delta_path = folder / "delta.md"
    delta_path.write_text(
        yaml_frontmatter(
            {
                "registro_id": reg["id"],
                "prev_registro_id": prev_id,
                "layer": "delta",
                "status": "pending",
            }
        )
        + delta_tpl,
        encoding="utf-8",
    )

    return {
        "registro": str((rel / "registro.md").as_posix()),
        "delta": str((rel / "delta.md").as_posix()),
    }


def write_previo_snapshot(inicial: dict, folder: Path) -> dict:
    """Snapshot before SolveCoagula — parent revision of r0677 (not in linea.md list)."""
    folder.mkdir(parents=True, exist_ok=True)
    oldid = inicial["parent_oldid"]
    meta_path = folder / "meta.json"
    existing: dict = {}
    if meta_path.exists():
        existing = json.loads(meta_path.read_text(encoding="utf-8"))

    previo_json: dict = {}
    linea_json = ROOT / "raw" / "linea.json"
    if linea_json.exists():
        previo_json = json.loads(linea_json.read_text(encoding="utf-8")).get("previo", {})

    meta = {
        "role": "previo",
        "registro_id": None,
        "oldid": oldid,
        "parent_oldid": None,
        "timestamp": existing.get("timestamp") or previo_json.get("timestamp", "")[:10],
        "user": existing.get("user") or previo_json.get("user") or "desconocido",
        "bytes": existing.get("bytes") or previo_json.get("size") or 0,
        "summary": "(estado previo a SolveCoagula)",
        "revision_url": (
            f"{WIKI_BASE}/w/index.php?title={TITLE}&oldid={oldid}"
        ),
        "cache_wikitext": f"cache/snapshots/{oldid}.wikitext",
        "cache_meta": f"cache/snapshots/{oldid}.meta.json",
        "fetched": existing.get("fetched", False),
    }
    if existing.get("fetched_at"):
        meta["fetched_at"] = existing["fetched_at"]

    meta_path.write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    readme = f"""# Snapshot previo

- **oldid:** {oldid}
- **usuario:** {meta['user']}
- **estado:** artículo antes de la intervención SolveCoagula (sin registro en `linea.md`)
- **URL:** {meta['revision_url']}

El cuerpo del artículo **no** vive aquí en markdown. Tras `fetch_snapshot.py`:

```
cache/snapshots/{oldid}.wikitext   # fuente
cache/snapshots/{oldid}.meta.json  # metadatos de fetch
```

Usar wikitext como verdad; markdown solo para índice y deltas curados.

Ver también: [snapshots/inicial](../inicial/) (r0677, primera edición SC).
"""
    (folder / "README.md").write_text(readme, encoding="utf-8")
    return meta


def write_sc_cierre_snapshot(final_reg: dict, folder: Path) -> dict:
    """SC cierre: última edición SolveCoagula (linea2); en pseudo coincide con final."""
    folder.mkdir(parents=True, exist_ok=True)
    meta_path = folder / "meta.json"
    existing = {}
    if meta_path.exists():
        existing = json.loads(meta_path.read_text(encoding="utf-8"))

    sc_oldid = SC_CIERRE_OLDIDS.get(TITLE, final_reg["oldid"])
    if sc_oldid == final_reg["oldid"]:
        reg = final_reg
    else:
        contrib = load_linea2_contrib(TITLE, sc_oldid) or {}
        reg = {
            "id": contrib.get("linea1_registro_id"),
            "oldid": sc_oldid,
            "parent_oldid": None,
            "timestamp": (contrib.get("timestamp") or "").replace("T", " "),
            "user": "SolveCoagula",
            "bytes": existing.get("bytes", 0),
            "summary": contrib.get("comment", ""),
            "urls": contrib.get(
                "urls",
                {"revision": f"{WIKI_BASE}/w/index.php?title={TITLE}&oldid={sc_oldid}"},
            ),
            "slug": f"sc-cierre-oldid-{sc_oldid}",
        }

    meta = {
        "role": "sc_cierre",
        "registro_id": reg.get("id"),
        "oldid": sc_oldid,
        "parent_oldid": reg.get("parent_oldid"),
        "timestamp": reg["timestamp"],
        "user": reg["user"],
        "bytes": existing.get("bytes") or reg.get("bytes") or 0,
        "summary": reg.get("summary", "(última edición SolveCoagula, linea2)"),
        "revision_url": reg["urls"]["revision"],
        "cache_wikitext": f"cache/snapshots/{sc_oldid}.wikitext",
        "cache_meta": f"cache/snapshots/{sc_oldid}.meta.json",
        "fetched": existing.get("fetched", False),
    }
    if existing.get("fetched_at"):
        meta["fetched_at"] = existing["fetched_at"]
    meta_path.write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    note = (
        "Coincide con `snapshots/final/` en este sub-corpus."
        if sc_oldid == final_reg["oldid"]
        else "Última edición SC según linea2; posterior al export `final` (linea.md)."
    )
    readme = f"""# Snapshot sc_cierre

- **oldid:** {sc_oldid}
- **usuario:** {meta['user']}
- **nota:** {note}
- **URL:** {meta['revision_url']}

El cuerpo del artículo **no** vive aquí en markdown. Tras `fetch_snapshot.py`:

```
cache/snapshots/{sc_oldid}.wikitext   # fuente
cache/snapshots/{sc_oldid}.meta.json  # metadatos de fetch
```

Delta SC→hoy: [`snapshots/delta-sc-actual.md`](../delta-sc-actual.md).
"""
    (folder / "README.md").write_text(readme, encoding="utf-8")
    return meta


def write_actual_snapshot(folder: Path) -> dict:
    """Placeholder for current Wikipedia revision; oldid filled on --latest fetch."""
    folder.mkdir(parents=True, exist_ok=True)
    meta_path = folder / "meta.json"
    existing = {}
    if meta_path.exists():
        existing = json.loads(meta_path.read_text(encoding="utf-8"))

    oldid = existing.get("oldid")
    meta = {
        "role": "actual",
        "article": TITLE.replace("_", " "),
        "registro_id": None,
        "oldid": oldid,
        "parent_oldid": None,
        "timestamp": existing.get("timestamp", ""),
        "user": existing.get("user", ""),
        "bytes": existing.get("bytes", 0),
        "summary": "(revisión actual Wikipedia)",
        "revision_url": (
            f"{WIKI_BASE}/w/index.php?title={TITLE}&oldid={oldid}"
            if oldid
            else f"{WIKI_BASE}/wiki/{TITLE}"
        ),
        "cache_wikitext": f"cache/snapshots/{oldid}.wikitext" if oldid else None,
        "cache_meta": f"cache/snapshots/{oldid}.meta.json" if oldid else None,
        "fetched": existing.get("fetched", False),
    }
    if existing.get("fetched_at"):
        meta["fetched_at"] = existing["fetched_at"]
    meta_path.write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    readme = f"""# Snapshot actual

- **oldid:** {oldid or '(pendiente — `fetch_snapshot.py --latest`)'}
- **estado:** revisión vigente en Wikipedia
- **URL:** {meta['revision_url']}

Tras `python3 scripts/fetch_snapshot.py --latest --title "{TITLE.replace('_', ' ')}"`:

```
cache/snapshots/<oldid>.wikitext   # fuente
cache/snapshots/<oldid>.meta.json  # metadatos de fetch
```

Delta SC→hoy: [`snapshots/delta-sc-actual.md`](../delta-sc-actual.md).
"""
    (folder / "README.md").write_text(readme, encoding="utf-8")
    return meta


def write_snapshot_endpoint(reg: dict, role: str, folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    meta = {
        "role": role,
        "registro_id": reg["id"],
        "oldid": reg["oldid"],
        "parent_oldid": reg["parent_oldid"],
        "timestamp": reg["timestamp"],
        "user": reg["user"],
        "bytes": reg["bytes"],
        "summary": reg["summary"],
        "revision_url": reg["urls"]["revision"],
        "cache_wikitext": f"cache/snapshots/{reg['oldid']}.wikitext",
        "cache_meta": f"cache/snapshots/{reg['oldid']}.meta.json",
        "fetched": False,
    }
    (folder / "meta.json").write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    readme = f"""# Snapshot {role}

- **oldid:** {reg['oldid']}
- **registro:** [{reg['id']}](../registros/{reg['slug']}/registro.md)
- **URL:** {reg['urls']['revision']}

El cuerpo del artículo **no** vive aquí en markdown. Tras `fetch_snapshot.py`:

```
cache/snapshots/{reg['oldid']}.wikitext   # fuente
cache/snapshots/{reg['oldid']}.meta.json  # metadatos de fetch
```

Usar wikitext como verdad; markdown solo para índice y deltas curados.
"""
    (folder / "README.md").write_text(readme, encoding="utf-8")


def build_indice(meta: dict, registros: list[dict]) -> str:
    prev = meta["snapshots"]["previo"]
    fin = meta["snapshots"]["final"]
    ini = meta["snapshots"]["inicial"]
    milestones = [r for r in registros if r["milestone"]]
    article_name = TITLE.replace("_", " ")
    article_url = f"{WIKI_BASE}/wiki/{TITLE}"

    if CORPUS_ID == "linea-pseudociencia":
        tesis = [
            "## Tesis del corpus",
            "",
            f"Segunda **línea gruesa** del dispositivo linea-aleph: historial completo del artículo",
            f"[{article_name}]({article_url}) en la ventana SolveCoagula (todos los editores,",
            "paridad con `raw/linea.md` de demarcación). Complementa",
            "[`INDICE2.md`](../INDICE2.md) (mapa enciclopedista) y enlaza con",
            "[`INDICE.md`](../INDICE.md) (línea de demarcación).",
            "",
            "Relacionado: [`logs-aleph`](../../logs-aleph/INDICE.md).",
            "",
        ]
        header = "# INDICE — linea-pseudociencia"
    else:
        tesis = [
            "## Tesis del corpus",
            "",
            "Este corpus no es «una ciencia» monolítica: es la **línea de demarcación** como",
            "espina dorsal hipervinculada — un historial de ediciones de",
            f"[{article_name}]({article_url})",
            "donde **SolveCoagula** inyecta ontología de partida (secciones, véase también,",
            "falsacionismo, Kuhn, Feyerabend…). El agente navegador-caché expande desde cada",
            "**delta** hacia artículos enlazados; los viajes sucesivos deben volverse más offline.",
            "",
            "Relacionado: [`logs-aleph`](../logs-aleph/INDICE.md) (sesión demarcación / Gaia / diamat).",
            "",
            "**Segunda línea gruesa:** [`pseudociencia/INDICE.md`](pseudociencia/INDICE.md) —",
            "historial artículo *Pseudociencia* (ventana SolveCoagula).",
            "",
        ]
        header = "# INDICE — linea-aleph"

    lines = [
        header,
        "",
        *tesis,
        "## Preamble (linea.md)",
        "",
        meta["preamble"]["text"],
        "",
        "## Extremos de la línea",
        "",
        "| Rol | Registro | oldid | Fecha (WP) | Carpeta |",
        "|-----|----------|-------|------------|---------|",
        f"| **Previo** (antes de SolveCoagula) | — | {prev['oldid']} | "
        f"{prev['timestamp']} | [snapshots/previo](snapshots/previo/) |",
        f"| **Inicial** (traducción / arranque) | `{ini['registro_id']}` | {ini['oldid']} | "
        f"{registros[-1]['timestamp']} | [snapshots/inicial](snapshots/inicial/) |",
        f"| **Final** (más reciente en linea.md) | `{fin['registro_id']}` | {fin['oldid']} | "
        f"{registros[0]['timestamp']} | [snapshots/final](snapshots/final/) |",
    ]
    sc = meta["snapshots"]["sc_cierre"]
    act = meta["snapshots"]["actual"]
    sc_meta_path = ROOT / "snapshots" / "sc_cierre" / "meta.json"
    sc_ts = ""
    if sc_meta_path.exists():
        sc_ts = json.loads(sc_meta_path.read_text(encoding="utf-8")).get("timestamp", "")
    act_meta_path = ROOT / "snapshots" / "actual" / "meta.json"
    act_oldid = act.get("oldid") or "—"
    act_ts = ""
    if act_meta_path.exists():
        act_meta = json.loads(act_meta_path.read_text(encoding="utf-8"))
        act_ts = act_meta.get("timestamp", "")
        act_oldid = act_meta.get("oldid") or act_oldid
    lines.extend(
        [
            f"| **SC cierre** (última edit SolveCoagula, linea2) | — | {sc['oldid']} | "
            f"{sc_ts or '—'} | [snapshots/sc_cierre](snapshots/sc_cierre/) |",
            f"| **Actual** (Wikipedia hoy) | — | {act_oldid} | "
            f"{act_ts or '—'} | [snapshots/actual](snapshots/actual/) |",
            "",
            f"Delta extremo: [`snapshots/delta-extremo.md`](snapshots/delta-extremo.md) "
            f"(previo → final). Delta SC→hoy: "
            f"[`snapshots/delta-sc-actual.md`](snapshots/delta-sc-actual.md). "
            f"Entre inicial y final: **{len(registros)}** registros en "
            f"[`manifest.json`](manifest.json).",
        ]
    )
    lines.extend(
        [
            "## ¿Markdown para snapshots intermedios?",
            "",
            "**No como cuerpo del artículo.** Recomendación:",
            "",
            "| Capa | Formato | Quién lo llena |",
            "|------|---------|----------------|",
            "| Índice, deltas curados | `.md` | humano + agente |",
            "| Metadatos de registro | `.md` + `manifest.json` | `segment_linea.py` |",
            "| Snapshot de revisión WP | `.wikitext` + `.meta.json` en `cache/` | `fetch_snapshot.py` / agente |",
            "| Viajes hipervinculados | `cache/viajes/*.json` | skill navegador-caché |",
            "",
            "Materializar todos los snapshots completos sería bulk innecesario: usar milestones",
            f"({len(milestones)} marcados) + fetch bajo demanda.",
            "",
        ]
    )
    if CORPUS_ID == "linea-pseudociencia":
        in_l2 = sum(1 for r in registros if r.get("in_linea2"))
        lines.extend(
            [
                f"Cross-ref linea2: **{in_l2}** registros con `in_linea2: true` "
                f"(oldid en contribuciones Pseudociencia de `manifest2.json`).",
                "",
            ]
        )
    lines.extend(
        [
            "## Hitos (milestones)",
            "",
            "| ID | Δ bytes | Usuario | Sección / resumen |",
            "|----|---------|---------|-------------------|",
        ]
    )
    for r in milestones[:60]:
        sec = (r["section"] or r["summary"][:50] or "—").replace("|", "/")
        lines.append(
            f"| [{r['id']}](registros/{r['slug']}/registro.md) | {r['byte_delta']:+d} | "
            f"{r['user']} | {sec} |"
        )
    if len(milestones) > 60:
        lines.append(f"| … | | | _{len(milestones) - 60} más en manifest_ |")

    lines.extend(
        [
            "",
            "## Ontología por sección (frecuencia en historial)",
            "",
            "Pack de partida para expandir caché (véase `ontology-seeds.json`):",
            "",
            "| Sección | Ediciones |",
            "|---------|-----------|",
        ]
    )
    for sec, count in meta["ontology_sections"][:25]:
        lines.append(f"| {sec} | {count} |")

    corpus_prefix = "pseudociencia/" if CORPUS_ID == "linea-pseudociencia" else ""
    lines.extend(
        [
            "",
            "## Estructura",
            "",
            "```",
            f"linea-aleph/{corpus_prefix}",
            "├── raw/linea.md",
            "├── segment_linea.py",
            "├── manifest.json",
            "├── INDICE.md",
            "├── ontology-seeds.json",
            "├── snapshots/previo|inicial|final|sc_cierre|actual/",
            "├── snapshots/delta-extremo.md",
            "├── snapshots/delta-sc-actual.md",
            "├── registros/          # milestones por defecto",
            "└── ../cache/           # wikitext compartido (agente)",
            "```",
            "",
            "## Comandos",
            "",
            "```bash",
            f"python3 segment_linea.py --corpus-dir {corpus_prefix.rstrip('/') or '.'} --expand milestones",
            "python3 scripts/fetch_snapshot.py --oldid <oldid> --title "
            f"{article_name}",
            f"python3 scripts/fetch_snapshot.py --latest --title \"{article_name}\"",
            "```",
            "",
            "## Curación de deltas",
            "",
            "Cada `registros/*/delta.md` explica el **delta interpretado** respecto al",
            "registro anterior (más reciente en el tiempo → `r0001` es el más nuevo).",
            "El índice narrativo lo escribimos nosotros; el script solo deja el esqueleto.",
            "",
        ]
    )
    return "\n".join(lines)


def build_ontology_seeds(registros: list[dict]) -> dict:
    sections: dict[str, dict] = {}
    for r in registros:
        if not r["section"]:
            continue
        key = r["section"]
        if key not in sections:
            sections[key] = {
                "section": key,
                "edit_count": 0,
                "sample_oldids": [],
                "wiki_anchor": f"{WIKI_BASE}/wiki/{TITLE}#{key.replace(' ', '_')}",
            }
        sections[key]["edit_count"] += 1
        if len(sections[key]["sample_oldids"]) < 5:
            sections[key]["sample_oldids"].append(r["oldid"])

    return {
        "description": "Semillas ontológicas extraídas del historial SolveCoagula",
        "article": f"{WIKI_BASE}/wiki/{TITLE}",
        "sections": sorted(sections.values(), key=lambda x: -x["edit_count"]),
        "viaje_sugerido": [
            "snapshots/inicial → registro traducción",
            "sección ¿Ciencia normal, paranormal o pseudociencias?",
            "Feyerabend y autonomía",
            "Kuhn y paradigma",
            "Véase también → artículos enlazados",
            "snapshots/final",
        ],
    }


def expand_registros(
    registros: list[dict], mode: str, single_id: str | None
) -> int:
    count = 0
    # registros ordered newest-first; prev in time = next in list
    for i, reg in enumerate(registros):
        prev = registros[i + 1] if i + 1 < len(registros) else None
        if single_id and reg["id"] != single_id:
            continue
        if not single_id:
            if mode == "milestones" and not reg["milestone"]:
                continue
            if mode == "none":
                continue
        folder = ROOT / "registros" / reg["slug"]
        reg["files"] = write_registro_files(reg, prev, folder)
        count += 1
    return count


def verify(meta: dict, registros: list[dict], line_count: int) -> dict:
    issues = []
    parsed_lines = {r["source"]["line"] for r in registros}
    expected = sum(
        1 for i in range(1, line_count + 1) if "oldid=" in read_lines(LINEA)[i - 1]
    )
    if len(registros) != expected:
        issues.append(f"registro count {len(registros)} != expected {expected}")

    # chain oldids (wiki may have gaps — warn lightly)
    for i in range(len(registros) - 1):
        newer = registros[i]
        older = registros[i + 1]
        if newer["parent_oldid"] != older["oldid"]:
            # wiki history can have gaps; warn only on first few
            if i < 3:
                issues.append(
                    f"chain gap {newer['id']}: parent {newer['parent_oldid']} "
                    f"!= older {older['oldid']}"
                )

    for role in ("previo", "inicial", "final", "sc_cierre", "actual"):
        p = ROOT / "snapshots" / role / "meta.json"
        if not p.exists():
            issues.append(f"missing {p}")

    return {
        "registros": len(registros),
        "milestones": len(meta["milestones"]),
        "issues": issues,
        "ok": len(issues) == 0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Segment linea.md into linea-aleph/")
    parser.add_argument(
        "--corpus-dir",
        default=".",
        help="Sub-corpus directory under linea-aleph/ (default: root)",
    )
    parser.add_argument(
        "--title",
        default="Problema_de_la_demarcación",
        help="Wikipedia article title (underscores ok)",
    )
    parser.add_argument(
        "--corpus-id",
        default="linea-aleph",
        help="Corpus identifier for manifest (default: linea-aleph)",
    )
    parser.add_argument(
        "--expand",
        choices=["none", "milestones", "all"],
        default="milestones",
        help="Materialize registro/ delta folders (default: milestones only)",
    )
    parser.add_argument("--registro", help="Expand single registro id e.g. r0426")
    args = parser.parse_args()

    configure_corpus(args.corpus_dir, args.title, args.corpus_id)
    ensure_raw_linea()
    lines = read_lines(LINEA)
    meta, registros = build_manifest(lines)

    expand_mode = "none" if args.registro else args.expand
    n = expand_registros(registros, expand_mode, args.registro)
    # always write endpoints
    write_previo_snapshot(registros[-1], ROOT / "snapshots" / "previo")
    write_snapshot_endpoint(registros[0], "final", ROOT / "snapshots" / "final")
    write_snapshot_endpoint(registros[-1], "inicial", ROOT / "snapshots" / "inicial")
    write_sc_cierre_snapshot(registros[0], ROOT / "snapshots" / "sc_cierre")
    write_actual_snapshot(ROOT / "snapshots" / "actual")

    draft = {
        **meta,
        "registros": [
            {**r, "confidence": "high" if r["milestone"] else "medium"}
            for r in registros
        ],
    }
    (ROOT / "manifest.draft.json").write_text(
        json.dumps(draft, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (ROOT / "manifest.json").write_text(
        json.dumps({"meta": meta, "registros": registros}, indent=2, ensure_ascii=False)
        + "\n",
        encoding="utf-8",
    )
    (ROOT / "ontology-seeds.json").write_text(
        json.dumps(build_ontology_seeds(registros), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (ROOT / "INDICE.md").write_text(build_indice(meta, registros), encoding="utf-8")

    result = verify(meta, registros, len(lines))
    result["expanded_folders"] = n
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"] and result["issues"]:
        # chain gaps are warnings; only fail on hard errors
        hard = [i for i in result["issues"] if "missing" in i or "!=" in i]
        if hard:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
