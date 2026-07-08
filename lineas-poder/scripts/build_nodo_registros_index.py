#!/usr/bin/env python3
"""
Validate nodo-sections.json against manifest.json and report registro counts per nodo.
Optionally writes wp/historia/registros-by-nodo.json cache.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_NODO_SECTIONS = ROOT / "espana/wp/historia/nodo-sections.json"
DEFAULT_MANIFEST = ROOT / "espana/wp/historia/manifest.json"
DEFAULT_OUTPUT = ROOT / "espana/wp/historia/registros-by-nodo.json"


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def build_section_index(registros: list) -> dict[str, list]:
    index: dict[str, list] = defaultdict(list)
    for reg in registros:
        section = reg.get("section")
        if not section:
            continue
        index[section].append(
            {
                "registro_id": reg["id"],
                "oldid": reg["oldid"],
                "timestamp": reg.get("timestamp"),
                "section": section,
                "milestone": bool(reg.get("milestone")),
            }
        )
    return dict(index)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build/validate nodo → registros index")
    parser.add_argument("--nodo-sections", type=Path, default=DEFAULT_NODO_SECTIONS)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write", action="store_true", help="Write registros-by-nodo.json")
    args = parser.parse_args()

    nodo_map = load_json(args.nodo_sections)
    manifest = load_json(args.manifest)
    registros = manifest.get("registros", [])
    section_index = build_section_index(registros)

    all_manifest_sections = {r["section"] for r in registros if r.get("section")}
    mapped_sections: set[str] = set()
    by_nodo: dict = {}
    empty_nodos: list[str] = []
    orphan_sections = sorted(all_manifest_sections)

    for nodo_id, entry in sorted(nodo_map.get("nodos", {}).items()):
        sections = entry.get("sections") or []
        mapped_sections.update(sections)
        items = []
        seen_oldids: set[int] = set()
        for section in sections:
            for reg in section_index.get(section, []):
                oid = reg["oldid"]
                if oid in seen_oldids:
                    continue
                seen_oldids.add(oid)
                items.append(reg)
        items.sort(key=lambda r: r.get("timestamp") or "", reverse=True)
        by_nodo[nodo_id] = {
            "sections": sections,
            "notes": entry.get("notes"),
            "total": len(items),
            "milestones": sum(1 for r in items if r.get("milestone")),
            "registros": items,
        }
        if len(items) == 0:
            empty_nodos.append(nodo_id)
        print(f"{nodo_id}: {len(items):4d} registros ({len(sections)} sections)")

    orphan_sections = sorted(all_manifest_sections - mapped_sections)
    unmapped_in_map = sorted(mapped_sections - all_manifest_sections)

    print("\n--- Summary ---")
    print(f"Nodos: {len(by_nodo)}")
    print(f"Manifest sections with registros: {len(all_manifest_sections)}")
    print(f"Mapped sections (union): {len(mapped_sections)}")
    print(f"Empty nodos: {empty_nodos or 'none'}")
    print(f"Orphan manifest sections (not in any nodo): {len(orphan_sections)}")
    if unmapped_in_map:
        print(f"Sections in map but absent from manifest: {len(unmapped_in_map)}")
        for s in unmapped_in_map[:10]:
            print(f"  - {s}")

    errors = []
    if empty_nodos:
        errors.append(f"empty nodos: {', '.join(empty_nodos)}")
    if unmapped_in_map:
        errors.append(f"{len(unmapped_in_map)} mapped sections missing from manifest")

    if args.write:
        payload = {
            "version": nodo_map.get("version", "0.1.0"),
            "linea_id": nodo_map.get("linea_id", "espana"),
            "generated_from": {
                "nodo_sections": str(args.nodo_sections.relative_to(ROOT)),
                "manifest": str(args.manifest.relative_to(ROOT)),
            },
            "nodos": by_nodo,
            "orphan_sections": orphan_sections,
        }
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
        print(f"\nWrote {args.output}")

    if errors:
        print("\nVALIDATION WARNINGS:", "; ".join(errors), file=sys.stderr)
        return 1
    print("\nValidation OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
