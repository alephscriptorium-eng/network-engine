#!/usr/bin/env python3
"""Extract wikilinks, cites, refs and external URLs from wikitext."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from cache_paths import wikitext_path  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]

WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
CITE_RE = re.compile(r"\{\{(?:cita|cite)[^}]*\}\}", re.IGNORECASE)
REF_RE = re.compile(r"<ref[^>]*>(.*?)</ref>", re.IGNORECASE | re.DOTALL)
URL_RE = re.compile(r"https?://[^\s\]<>'\"]+")
SECTION_RE = re.compile(r"^(={2,})\s*(.+?)\s*\1\s*$", re.MULTILINE)

CLUSTER_KEYWORDS: dict[str, list[str]] = {
    "paranormal_matrix": [
        "matrix", "bostrom", "alcock", "tipler", "paranormal", "simulación",
        "simulacion", "telepatía", "telepatia", "ovni", "ufología",
    ],
    "filosofia": [
        "popper", "kuhn", "feyerabend", "quine", "lakatos", "laudan",
        "positivismo", "falsacionismo", "empirismo", "racionalismo",
        "demarcación", "demarcacion", "epistemología", "epistemologia",
    ],
    "autoridad_cientifica": [
        "josephson", "guth", "linde", "nobel", "cern", "física", "fisica",
        "cosmología", "cosmologia", "einstein", "hawking",
    ],
    "cultura_media": [
        "nyt", "new york times", "tve", "bbc", "nature", "science ",
        "revista", "periódico", "periodico", "documental",
    ],
    "satelites_internos": [
        "pseudociencia", "cuerdas", "holismo", "occam", "causalidad",
        "método científico", "metodo cientifico", "filosofía de la ciencia",
    ],
}


def load_wikitext(oldid: int | None, wikitext_file: Path | None) -> tuple[str, int | None]:
    if wikitext_file:
        return wikitext_file.read_text(encoding="utf-8", errors="replace"), oldid
    if oldid is None:
        raise ValueError("Provide --oldid or --wikitext")
    path = wikitext_path("article", oldid)
    if not path.exists():
        raise FileNotFoundError(f"Missing {path}; run fetch_snapshot.py --oldid {oldid}")
    return path.read_text(encoding="utf-8", errors="replace"), oldid


def section_at(pos: int, sections: list[tuple[int, str]]) -> str:
    current = "(lead)"
    for start, name in sections:
        if start <= pos:
            current = name
        else:
            break
    return current


def parse_sections(text: str) -> list[tuple[int, str]]:
    return [(m.start(), m.group(2).strip()) for m in SECTION_RE.finditer(text)]


def normalize_target(raw: str) -> str:
    t = raw.strip()
    if t.lower().startswith("es:"):
        t = t[3:]
    return t.replace("_", " ")


def guess_namespace(target: str) -> tuple[str, int | None]:
    lower = target.lower()
    if lower.startswith("categoría:") or lower.startswith("category:"):
        return "category", 14
    if lower.startswith("archivo:") or lower.startswith("file:"):
        return "file", 6
    if lower.startswith("plantilla:") or lower.startswith("template:"):
        return "template", 10
    if ":" in target and not target.startswith("http"):
        return "special", None
    return "article", 0


def classify_cluster(target: str, context: str) -> str:
    blob = f"{target} {context}".lower()
    scores: dict[str, int] = {}
    for cluster, keywords in CLUSTER_KEYWORDS.items():
        scores[cluster] = sum(1 for kw in keywords if kw in blob)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "otros"


def extract_refs(text: str, source_oldid: int | None) -> list[dict]:
    sections = parse_sections(text)
    entries: list[dict] = []
    seen: set[tuple[str, str, str]] = set()

    def add(target: str, tipo: str, pos: int, context: str = "") -> None:
        sec = section_at(pos, sections)
        key = (target.lower(), tipo, sec)
        if key in seen:
            return
        seen.add(key)
        ns_label, ns = guess_namespace(target)
        entries.append(
            {
                "target": target,
                "namespace": ns,
                "namespace_label": ns_label,
                "seccion_origen": sec,
                "tipo": tipo,
                "source_oldid": source_oldid,
                "context_snippet": context[:200] if context else "",
            }
        )

    for m in WIKILINK_RE.finditer(text):
        add(normalize_target(m.group(1)), "internal", m.start())

    for m in CITE_RE.finditer(text):
        cite = m.group(0)
        title_m = re.search(r"\|t[ií]tulo=([^|}]+)", cite, re.IGNORECASE)
        target = title_m.group(1).strip() if title_m else cite[:80]
        add(target, "biblio", m.start(), cite)

    for m in REF_RE.finditer(text):
        body = m.group(1)
        for um in URL_RE.finditer(body):
            add(um.group(0).rstrip(".,)"), "external", m.start(), body)
        for wm in WIKILINK_RE.finditer(body):
            add(normalize_target(wm.group(1)), "internal", m.start(), body)
        if not URL_RE.search(body) and not WIKILINK_RE.search(body) and body.strip():
            add(body.strip()[:120], "ref_text", m.start(), body)

    for m in URL_RE.finditer(text):
        if any(m.start() >= r.start() and m.end() <= r.end() for r in REF_RE.finditer(text)):
            continue
        add(m.group(0).rstrip(".,)"), "external", m.start())

    return entries


def build_index(entries: list[dict], source_oldid: int | None) -> dict:
    by_type = Counter(e["tipo"] for e in entries)
    ns0 = [e for e in entries if e.get("namespace") == 0]
    freq = Counter(e["target"] for e in ns0)
    top_ns0 = [{"target": t, "count": c} for t, c in freq.most_common(30)]

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_oldid": source_oldid,
        "counts": {
            "total_unique": len(entries),
            "by_type": dict(by_type),
            "ref_tags": by_type.get("ref_text", 0) + sum(
                1 for e in entries if e["tipo"] in ("external", "internal", "biblio")
                and e.get("context_snippet")
            ),
            "internal_ns0": len(ns0),
            "internal_all": by_type.get("internal", 0),
            "external": by_type.get("external", 0),
            "biblio": by_type.get("biblio", 0),
        },
        "top_ns0": top_ns0,
        "entries": entries,
    }


def build_clusters(entries: list[dict]) -> dict:
    clusters: dict[str, list[dict]] = defaultdict(list)
    for e in entries:
        cluster = classify_cluster(e["target"], e.get("context_snippet", ""))
        clusters[cluster].append(e)
    summary = {k: len(v) for k, v in sorted(clusters.items(), key=lambda x: -len(x[1]))}
    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_oldid": entries[0]["source_oldid"] if entries else None,
        "cluster_counts": summary,
        "clusters": {k: v for k, v in clusters.items()},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract references from wikitext")
    parser.add_argument("--oldid", type=int, help="Source revision oldid")
    parser.add_argument("--wikitext", type=Path, help="Path to local wikitext file")
    parser.add_argument("--output", type=Path, required=True, help="Output JSON path")
    parser.add_argument("--clusters-output", type=Path, help="Optional clusters JSON")
    parser.add_argument("--viaje-output", type=Path, help="Optional viaje manifest JSON")
    args = parser.parse_args()

    text, oldid = load_wikitext(args.oldid, args.wikitext)
    entries = extract_refs(text, oldid)
    index = build_index(entries, oldid)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {args.output} ({index['counts']['total_unique']} unique refs)")

    if args.clusters_output:
        clusters = build_clusters(entries)
        args.clusters_output.parent.mkdir(parents=True, exist_ok=True)
        args.clusters_output.write_text(
            json.dumps(clusters, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"wrote {args.clusters_output}")

    if args.viaje_output:
        viaje = {
            "viaje_id": "2026-referencias-dem",
            "generated_at": index["generated_at"],
            "anchor_oldid": oldid,
            "phase": 1,
            "index_path": "cache/viajes/refs-12763920-index.json",
            "counts": index["counts"],
            "top_ns0": index["top_ns0"][:10],
            "offline_ready": False,
        }
        args.viaje_output.parent.mkdir(parents=True, exist_ok=True)
        args.viaje_output.write_text(json.dumps(viaje, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"wrote {args.viaje_output}")


if __name__ == "__main__":
    main()
