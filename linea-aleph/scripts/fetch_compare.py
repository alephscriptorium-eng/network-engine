#!/usr/bin/env python3
"""Compare reference sets between revisions (Wave C) or fetch API diff."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from cache_paths import cached, wikitext_path  # noqa: E402
from extract_wikilinks import extract_refs, load_wikitext  # noqa: E402
from fetch_snapshot import write_snapshot  # noqa: E402
from mw_client import fetch_revision_content  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CHAIN = [11951034, 12763920, 166864369]
DEFAULT_TITLE = "Problema de la demarcación"


def ensure_cached(oldid: int, title: str, sleep: float) -> str:
    if not cached("article", oldid):
        content, meta = fetch_revision_content(oldid, sleep=sleep)
        write_snapshot("article", oldid, meta.get("title") or title, content, meta)
    return wikitext_path("article", oldid).read_text(encoding="utf-8", errors="replace")


def link_set(text: str, oldid: int) -> set[str]:
    entries = extract_refs(text, oldid)
    return {e["target"].lower() for e in entries if e["tipo"] in ("internal", "biblio", "external")}


def compare_chain(oldids: list[int], title: str, sleep: float) -> dict:
    sets: dict[int, set[str]] = {}
    for oid in oldids:
        text = ensure_cached(oid, title, sleep)
        sets[oid] = link_set(text, oid)

    diffs = []
    for i in range(len(oldids) - 1):
        a, b = oldids[i], oldids[i + 1]
        added = sorted(sets[b] - sets[a])
        removed = sorted(sets[a] - sets[b])
        diffs.append(
            {
                "from_oldid": a,
                "to_oldid": b,
                "added_count": len(added),
                "removed_count": len(removed),
                "added_sample": added[:20],
                "removed_sample": removed[:20],
            }
        )

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "title": title,
        "oldids": oldids,
        "link_counts": {str(k): len(v) for k, v in sets.items()},
        "diffs": diffs,
    }


def cross_talk_refs(index_path: Path, register_path: Path) -> dict:
    index = json.loads(index_path.read_text(encoding="utf-8"))
    register = json.loads(register_path.read_text(encoding="utf-8"))
    targets = {e["target"].lower() for e in index.get("entries", []) if e.get("namespace") == 0}
    hits = []
    for participant, data in register.get("participants", {}).items():
        for cite in data.get("citas_verificables", []):
            blob = json.dumps(cite, ensure_ascii=False).lower()
            matched = [t for t in targets if t in blob]
            if matched:
                hits.append({"participant": participant, "matched_targets": matched[:10], "cita": cite})
    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "index_path": str(index_path),
        "register_path": str(register_path),
        "ns0_targets": len(targets),
        "talk_hits": hits,
        "hit_count": len(hits),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare reference graphs between revisions")
    parser.add_argument("--fromrev", type=int, help="Start revision (legacy single-step)")
    parser.add_argument("--torev", type=int, help="End revision (legacy single-step)")
    parser.add_argument("--chain", nargs="+", type=int, default=DEFAULT_CHAIN)
    parser.add_argument("--title", default=DEFAULT_TITLE)
    parser.add_argument("--sleep", type=float, default=1.0)
    parser.add_argument("--output", type=Path, default=ROOT / "cache" / "viajes" / "refs-wave-c-diff.json")
    parser.add_argument("--talk-cross", action="store_true", help="Wave D: cross talk×refs")
    parser.add_argument("--index", type=Path, default=ROOT / "cache" / "viajes" / "refs-12763920-index.json")
    parser.add_argument("--register", type=Path, default=ROOT / "cache" / "talk" / "participant-register.json")
    args = parser.parse_args()

    if args.talk_cross:
        result = cross_talk_refs(args.index, args.register)
        out = ROOT / "cache" / "viajes" / "refs-wave-d-talk-cross.json"
    else:
        chain = [args.fromrev, args.torev] if args.fromrev and args.torev else args.chain
        result = compare_chain(chain, args.title, args.sleep)
        out = args.output

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
