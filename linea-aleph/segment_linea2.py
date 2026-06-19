#!/usr/bin/env python3
"""Parse raw/linea2.md (user contribs API) → manifest2.json + INDICE2.md."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from segment_linea import slugify

ROOT = Path(__file__).parent
RAW = ROOT / "raw"
SRC_LINEA2 = "raw/linea2.md"
LINEA2 = RAW / "linea2.md"
MANIFEST1 = ROOT / "manifest.json"
WIKI_BASE = "https://es.wikipedia.org"

DEMARCACION = "Problema de la demarcación"
PSEUDOCIENCIA = "Pseudociencia"
THICK_LINE = "linea.md"
PSEUDO_THICK_LINE = "pseudociencia/raw/linea.md"
MEDIUM_MIN = 20
THICK_CANDIDATE_MIN = 100


def pseudociencia_corpus_ready() -> bool:
    return (ROOT / "pseudociencia" / "raw" / "linea.md").exists()

ENTRY_RE = re.compile(
    r"^- \[(?P<ts>[^\]]+)\] \*\*(?P<title>[^*]+)\*\* · oldid (?P<oldid>\d+)"
    r"(?: · (?P<minor>m )?(?P<delta>[+\-]?\d+))?(?: · (?P<comment>.*))?$"
)


def read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines(keepends=True)


def parse_preamble(lines: list[str]) -> dict:
    pre: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip("\n")
        if line.strip().startswith("- [") and "oldid" in line:
            break
        if line.strip():
            pre.append(line)
        i += 1
    return {"lines": [1, i], "text": "\n".join(pre).strip()}


def parse_entry(line: str, line_no: int, seq: int) -> dict | None:
    m = ENTRY_RE.match(line.strip())
    if not m:
        return None
    delta_str = m.group("delta")
    byte_delta = int(delta_str) if delta_str else 0
    comment = (m.group("comment") or "").strip()
    title = m.group("title").strip()
    oldid = int(m.group("oldid"))
    return {
        "id": f"c{seq:04d}",
        "source": {"file": SRC_LINEA2, "line": line_no},
        "title": title,
        "oldid": oldid,
        "timestamp": m.group("ts"),
        "byte_delta": byte_delta,
        "minor": bool(m.group("minor")),
        "comment": comment,
        "in_linea1": False,
        "linea1_registro_id": None,
        "urls": {
            "revision": (
                f"{WIKI_BASE}/w/index.php?title={urllib_quote_title(title)}&oldid={oldid}"
            ),
            "article": f"{WIKI_BASE}/wiki/{urllib_quote_title(title)}",
        },
    }


def urllib_quote_title(title: str) -> str:
    from urllib.parse import quote

    return quote(title.replace(" ", "_"), safe="/:")


def load_linea1_oldids() -> dict[int, str]:
    if not MANIFEST1.exists():
        return {}
    data = json.loads(MANIFEST1.read_text(encoding="utf-8"))
    return {r["oldid"]: r["id"] for r in data.get("registros", [])}


def apply_linea1_crossref(contrib: dict, oldid_map: dict[int, str]) -> None:
    if contrib["title"] != DEMARCACION:
        return
    reg_id = oldid_map.get(contrib["oldid"])
    if reg_id:
        contrib["in_linea1"] = True
        contrib["linea1_registro_id"] = reg_id


def cluster_tier(edit_count: int, title: str) -> str:
    if title == DEMARCACION:
        return "thick"
    if title == PSEUDOCIENCIA and pseudociencia_corpus_ready():
        return "thick"
    if edit_count >= THICK_CANDIDATE_MIN:
        return "thick_candidate"
    if edit_count >= MEDIUM_MIN:
        return "medium"
    return "thin"


def build_clusters(contribs: list[dict]) -> list[dict]:
    by_title: dict[str, list[dict]] = defaultdict(list)
    for c in contribs:
        by_title[c["title"]].append(c)

    clusters: list[dict] = []
    for title, edits in sorted(by_title.items(), key=lambda x: -len(x[1])):
        tier = cluster_tier(len(edits), title)
        first = edits[0]["timestamp"]
        last = edits[-1]["timestamp"]
        in_linea1_count = sum(1 for e in edits if e["in_linea1"])
        slug = slugify(title)
        cluster: dict = {
            "slug": slug,
            "title": title,
            "edit_count": len(edits),
            "tier": tier,
            "first_edit": first,
            "last_edit": last,
            "contrib_ids": [e["id"] for e in edits],
            "in_linea1_count": in_linea1_count,
        }
        if title == DEMARCACION:
            cluster["thick_line"] = THICK_LINE
        if title == PSEUDOCIENCIA and pseudociencia_corpus_ready():
            cluster["thick_line"] = PSEUDO_THICK_LINE
        elif tier == "thick_candidate":
            cluster["thick_line_candidate"] = True
        clusters.append(cluster)
    return clusters


def parse_ts(ts: str) -> datetime:
    return datetime.strptime(ts, "%Y-%m-%d %H:%M")


def temporal_analysis(contribs: list[dict], clusters: list[dict]) -> dict:
    demarc_edits = [c for c in contribs if c["title"] == DEMARCACION]
    first = contribs[0]
    last = contribs[-1]

    demarc_last_ts = demarc_edits[-1]["timestamp"] if demarc_edits else None
    demarc_last_dt = parse_ts(demarc_last_ts) if demarc_last_ts else None

    after_demarc: list[dict] = []
    if demarc_last_dt:
        after_demarc = [c for c in contribs if parse_ts(c["timestamp"]) > demarc_last_dt]

    intercalado_titles = sorted(
        {
            c["title"]
            for c in contribs
            if c["title"] != DEMARCACION
            and demarc_edits
            and parse_ts(c["timestamp"]) <= parse_ts(demarc_edits[-1]["timestamp"])
        }
    )

    after_by_title = Counter(c["title"] for c in after_demarc)

    return {
        "first_edit": {
            "id": first["id"],
            "title": first["title"],
            "timestamp": first["timestamp"],
            "oldid": first["oldid"],
        },
        "last_edit": {
            "id": last["id"],
            "title": last["title"],
            "timestamp": last["timestamp"],
            "oldid": last["oldid"],
        },
        "precedes_linea1": (
            "nada — la primera edición del usuario es ya sobre demarcación"
            if first["title"] == DEMARCACION
            else f"edits previas en {first['title']}"
        ),
        "demarcacion_window": {
            "first": demarc_edits[0]["timestamp"] if demarc_edits else None,
            "last": demarc_last_ts,
            "edit_count": len(demarc_edits),
        },
        "intercalado_articles": intercalado_titles,
        "after_demarcacion": {
            "edit_count": len(after_demarc),
            "by_article": dict(after_by_title.most_common()),
            "contrib_ids": [c["id"] for c in after_demarc],
        },
    }


def build_manifest(
    preamble: dict, contribs: list[dict], clusters: list[dict], temporal: dict
) -> dict:
    demarc_cluster = next((c for c in clusters if c["title"] == DEMARCACION), None)
    demarc_count = demarc_cluster["edit_count"] if demarc_cluster else 0
    linea1_registros = 677
    in_linea1_total = sum(1 for c in contribs if c["in_linea1"])

    meta_clusters = [
        {
            "slug": c["slug"],
            "title": c["title"],
            "edit_count": c["edit_count"],
            "tier": c["tier"],
            **({"thick_line": c["thick_line"]} if "thick_line" in c else {}),
            **(
                {"thick_line_candidate": True}
                if c.get("thick_line_candidate")
                else {}
            ),
        }
        for c in clusters
    ]

    return {
        "meta": {
            "corpus": "linea2-aleph",
            "user": "SolveCoagula",
            "source": SRC_LINEA2,
            "generated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "preamble": preamble,
            "contrib_count": len(contribs),
            "article_count": len(clusters),
            "ordering": "oldest_first_in_linea2_md",
            "linea1_crossref": {
                "article": DEMARCACION,
                "linea1_registros": linea1_registros,
                "linea2_edits_same_article": demarc_count,
                "gap": demarc_count - linea1_registros,
                "in_linea1_matched": in_linea1_total,
            },
            "clusters": meta_clusters,
            "temporal": temporal,
        },
        "contribuciones": contribs,
        "clusters": clusters,
    }


def build_indice2(manifest: dict) -> str:
    meta = manifest["meta"]
    temporal = meta["temporal"]
    clusters = manifest["clusters"]
    cross = meta["linea1_crossref"]

    thick = [c for c in clusters if c["tier"] == "thick"]
    thick_cand = [c for c in clusters if c["tier"] == "thick_candidate"]
    medium = [c for c in clusters if c["tier"] == "medium"]
    thin = [c for c in clusters if c["tier"] == "thin"]

    lines = [
        "# INDICE2 — mapa enciclopedista SolveCoagula",
        "",
        "## Tesis del corpus",
        "",
        "Este corpus es la **cronología completa por usuario** (~"
        f"{meta['contrib_count']} ediciones NS0 en {meta['article_count']} artículos),",
        "complementaria a [`INDICE.md`](INDICE.md) / [`raw/linea.md`](raw/linea.md),",
        "que documenta solo el historial de *Problema de la demarcación*.",
        "",
        "La pregunta que responde: **qué precede, qué se intercala y qué sigue**",
        "a la línea gruesa de demarcación en la carrera enciclopedista de SolveCoagula.",
        "",
        "Relacionado: [`logs-aleph`](../logs-aleph/INDICE.md) · "
        "[`GAMES/SOLVE_ET_COAGULA`](../../GAMES/SOLVE_ET_COAGULA/index.md)",
        "",
        "## Estadísticas y clusters",
        "",
        f"| Métrica | Valor |",
        f"|---------|-------|",
        f"| Contribuciones NS0 | {meta['contrib_count']} |",
        f"| Artículos únicos | {meta['article_count']} |",
        f"| Cross-ref linea1 (oldid match) | {cross['in_linea1_matched']} / "
        f"{cross['linea1_registros']} |",
        f"| Gap demarcación API vs export | {cross['linea2_edits_same_article']} API − "
        f"{cross['linea1_registros']} export = **{cross['gap']}** |",
        "",
        "### Tabla de clusters",
        "",
        "| Tier | Artículo | Edits | Notas |",
        "|------|----------|-------|-------|",
    ]

    for c in clusters:
        notes: list[str] = []
        if c.get("thick_line"):
            if c["title"] == PSEUDOCIENCIA:
                notes.append(
                    f"línea gruesa → [`{c['thick_line']}`]({c['thick_line']})"
                )
            else:
                notes.append(f"línea gruesa → [`{c['thick_line']}`](raw/{c['thick_line']})")
        if c.get("thick_line_candidate"):
            notes.append("**candidata** segunda línea gruesa (futuro)")
        if c["in_linea1_count"]:
            notes.append(f"{c['in_linea1_count']} en linea1")
        lines.append(
            f"| {c['tier']} | {c['title']} | {c['edit_count']} | "
            f"{' · '.join(notes) if notes else '—'} |"
        )

    lines.extend(
        [
            "",
            f"- **Thick** ({len(thick)}): línea gruesa implementada",
            f"- **Thick candidate** ({len(thick_cand)}): merece línea gruesa futura",
            f"- **Medium** ({len(medium)}): cúmulo medio, solo índice",
            f"- **Thin** ({len(thin)}): cola fina, solo índice",
            "",
            "## Marco temporal",
            "",
            "### Primera y última edición",
            "",
            f"- **Primera:** [{temporal['first_edit']['id']}](raw/linea2.md) — "
            f"**{temporal['first_edit']['title']}** · "
            f"{temporal['first_edit']['timestamp']} · "
            f"oldid {temporal['first_edit']['oldid']}",
            f"- **Última:** [{temporal['last_edit']['id']}](raw/linea2.md) — "
            f"**{temporal['last_edit']['title']}** · "
            f"{temporal['last_edit']['timestamp']} · "
            f"oldid {temporal['last_edit']['oldid']}",
            "",
            "### Precede a linea.md",
            "",
            temporal["precedes_linea1"] + ".",
            "",
            "### Ventana demarcación (API)",
            "",
        ]
    )

    dw = temporal["demarcacion_window"]
    if dw["first"]:
        lines.append(
            f"- {dw['first']} → {dw['last']} · **{dw['edit_count']}** ediciones en "
            f"*{DEMARCACION}*"
        )
    else:
        lines.append("- (sin ediciones de demarcación)")

    lines.extend(
        [
            "",
            "### Intercalado (paralelo a demarcación)",
            "",
        ]
    )
    inter = temporal["intercalado_articles"]
    if inter:
        for t in inter:
            ec = next(c["edit_count"] for c in clusters if c["title"] == t)
            lines.append(f"- **{t}** ({ec} edits en ventana)")
    else:
        lines.append("- (ninguno)")

    lines.extend(["", "### Después del cierre demarcación", ""])
    ad = temporal["after_demarcacion"]
    if ad["edit_count"]:
        lines.append(
            f"**{ad['edit_count']}** ediciones posteriores a la última edit de demarcación:"
        )
        for title, count in ad["by_article"].items():
            lines.append(f"- **{title}** — {count}")
    else:
        lines.append("- (ninguna)")

    lines.extend(
        [
            "",
            "## Enlace a linea1",
            "",
            "- Índice demarcación: [`INDICE.md`](INDICE.md)",
            "- Historial artículo: [`raw/linea.md`](raw/linea.md) (677 registros, export 2018)",
            "- Manifest cruzado: [`manifest.json`](manifest.json) + [`manifest2.json`](manifest2.json)",
            "",
            "## Decisión de granularidad",
            "",
            "| Artículo / tier | Tratamiento |",
            "|-----------------|-------------|",
            f"| {DEMARCACION} (thick) | línea gruesa existente — `linea.md` / registros |",
            f"| {PSEUDOCIENCIA} (thick) | línea gruesa implementada — `pseudociencia/raw/linea.md` |",
        ]
    )
    for c in thick_cand:
        lines.append(
            f"| {c['title']} (thick_candidate) | **candidata** línea gruesa — "
            f"solo marcada, no implementada |"
        )
    for c in medium + thin:
        lines.append(f"| {c['title']} ({c['tier']}) | solo índice en manifest2 + linea2.md |")

    lines.extend(
        [
            "",
            "## Preamble (linea2.md)",
            "",
            meta["preamble"]["text"],
            "",
            "## Estructura",
            "",
            "```",
            "linea-aleph/",
            "├── raw/linea2.md          # cronología completa (~1006)",
            "├── raw/linea2.json        # backup API",
            "├── manifest2.json",
            "├── INDICE2.md",
            "├── pseudociencia/       # segunda línea gruesa (Pseudociencia)",
            "├── segment_linea2.py",
            "└── scripts/fetch_user_contribs.py",
            "```",
            "",
            "## Comandos de regeneración",
            "",
            "```bash",
            "cd BOT_ALEPH/linea-aleph",
            "python3 scripts/fetch_user_contribs.py --user SolveCoagula",
            "python3 segment_linea2.py",
            "```",
            "",
        ]
    )
    return "\n".join(lines)


def verify(manifest: dict, line_count: int) -> dict:
    issues: list[str] = []
    contribs = manifest["contribuciones"]
    if len(contribs) != manifest["meta"]["contrib_count"]:
        issues.append("contrib count mismatch")
    if len(manifest["clusters"]) != manifest["meta"]["article_count"]:
        issues.append("cluster count mismatch")

    parsed_lines = {c["source"]["line"] for c in contribs}
    expected = sum(
        1
        for i in range(1, line_count + 1)
        if read_lines(LINEA2)[i - 1].strip().startswith("- [")
    )
    if len(contribs) != expected:
        issues.append(f"parsed {len(contribs)} != expected {expected} list items")

    # chronological order check
    for i in range(len(contribs) - 1):
        if parse_ts(contribs[i]["timestamp"]) > parse_ts(contribs[i + 1]["timestamp"]):
            issues.append(f"order break at {contribs[i]['id']}")
            break

    cross = manifest["meta"]["linea1_crossref"]
    if cross["gap"] != cross["linea2_edits_same_article"] - cross["linea1_registros"]:
        issues.append("gap calculation wrong")

    return {
        "contribuciones": len(contribs),
        "clusters": len(manifest["clusters"]),
        "in_linea1_matched": cross["in_linea1_matched"],
        "gap": cross["gap"],
        "issues": issues,
        "ok": len(issues) == 0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Segment linea2.md → manifest2 + INDICE2")
    parser.parse_args()

    if not LINEA2.exists():
        raise FileNotFoundError(
            f"Missing {LINEA2} — run scripts/fetch_user_contribs.py first"
        )

    lines = read_lines(LINEA2)
    preamble = parse_preamble(lines)
    oldid_map = load_linea1_oldids()

    contribs: list[dict] = []
    seq = 1
    for i, line in enumerate(lines, 1):
        rec = parse_entry(line, i, seq)
        if rec:
            apply_linea1_crossref(rec, oldid_map)
            contribs.append(rec)
            seq += 1

    if not contribs:
        raise ValueError("No contribuciones parsed from linea2.md")

    clusters = build_clusters(contribs)
    temporal = temporal_analysis(contribs, clusters)
    manifest = build_manifest(preamble, contribs, clusters, temporal)

    (ROOT / "manifest2.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (ROOT / "INDICE2.md").write_text(build_indice2(manifest), encoding="utf-8")

    result = verify(manifest, len(lines))
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if not result["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
