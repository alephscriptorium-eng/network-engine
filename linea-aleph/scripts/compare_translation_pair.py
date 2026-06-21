#!/usr/bin/env python3
"""Compare section structure between a crosswiki anchor pair."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
ROOT = SCRIPTS.parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from cache_paths import ROOT as CACHE_ROOT, wikitext_path


def load_anchor(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def section_headers(text: str) -> list[str]:
    return [m.group(1).strip() for m in re.finditer(r"^==+\s*(.+?)\s*==+$", text, re.M)]


def resolve_wikitext(rel: str) -> Path:
    return CACHE_ROOT / rel.replace("cache/", "cache/")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--anchor",
        default=str(ROOT / "crosswiki/anchors/demarcation-en-es-oct2007.json"),
        help="Anchor JSON with source/target cache paths",
    )
    parser.add_argument("--out", default=None, help="Write parity report JSON here")
    args = parser.parse_args()

    anchor = load_anchor(Path(args.anchor))
    src = anchor["source"]
    tgt = anchor["target"]

    src_path = CACHE_ROOT / src["cache_wikitext"].replace("cache/", "cache/")
    tgt_path = CACHE_ROOT / tgt["cache_wikitext"].replace("cache/", "cache/")

    missing = [p for p in (src_path, tgt_path) if not p.exists()]
    if missing:
        for p in missing:
            print(f"MISSING: {p}", file=sys.stderr)
        sys.exit(1)

    src_text = src_path.read_text(encoding="utf-8")
    tgt_text = tgt_path.read_text(encoding="utf-8")
    src_sections = section_headers(src_text)
    tgt_sections = section_headers(tgt_text)

    # Rough EN→ES section mapping for demarcation article (oct 2007)
    en_to_es = {
        "History": "Historia",
        "Separation between science and religion": "Separación entre ciencia y religión",
        "Logical Positivism": "Positivismo Lógico",
        "Falsificationism": "Falsacionismo",
        "Kuhn and paradigm shifts": "Kuhn y los cambios de paradigma",
        "Feyerabend and the problem of autonomy in science": (
            "Feyerabend y el problema de la autonomía en la ciencia"
        ),
        "Demarcation in contemporary scientific method": (
            "La demarcación en el método científico contemporáneo"
        ),
        "References": "Referencias",
    }

    mapped_pairs = []
    for en_sec in src_sections:
        es_expected = en_to_es.get(en_sec)
        present = es_expected in tgt_sections if es_expected else False
        mapped_pairs.append(
            {"en": en_sec, "es_expected": es_expected, "es_present": present}
        )

    report = {
        "pair_id": anchor["pair_id"],
        "source_oldid": src["oldid"],
        "target_oldid": tgt["oldid"],
        "bytes": {
            "en": len(src_text),
            "es": len(tgt_text),
            "en_meta": src.get("bytes"),
            "es_meta": tgt.get("bytes"),
        },
        "sections": {
            "en": src_sections,
            "es": tgt_sections,
            "mapped": mapped_pairs,
            "en_count": len(src_sections),
            "es_count": len(tgt_sections),
            "mapped_present": sum(1 for p in mapped_pairs if p["es_present"]),
        },
        "verdict": "",
    }

    all_mapped = all(p["es_present"] for p in mapped_pairs if p["es_expected"])
    extra_es = [s for s in tgt_sections if s not in en_to_es.values()]
    report["sections"]["extra_es"] = extra_es
    if all_mapped and len(src_sections) <= len(tgt_sections):
        report["verdict"] = (
            "PARIDAD_ESTRUCTURAL: traducción es refleja arquitectura de secciones en oct 2007"
        )
    else:
        report["verdict"] = "PARIDAD_PARCIAL: revisar mapped_pairs"

    out_path = Path(args.out) if args.out else ROOT / "crosswiki/reports/demarcation-en-es-oct2007-parity.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "report": str(out_path), "verdict": report["verdict"]}, indent=2))


if __name__ == "__main__":
    main()
