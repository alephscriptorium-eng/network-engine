#!/usr/bin/env python3
"""Scan SOLVE_ET_COAGULA and emit solve-coagula-story-board.json for Widget B."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
GAME_ROOT = REPO_ROOT / "scriptorium-network-games" / "SOLVE_ET_COAGULA"
OUTPUT = (
    REPO_ROOT
    / "network-engine"
    / "data"
    / "sessions"
    / "solve-coagula-story-board.json"
)

BLOCK_MAX = 15

ACTS = [
    {"id": "constitucion", "label": "Constitución", "blocks": list(range(0, 5))},
    {"id": "radiografia", "label": "Radiografía", "blocks": list(range(5, 8))},
    {"id": "friccion", "label": "Fricción", "blocks": [8]},
    {"id": "profundizacion", "label": "Profundización", "blocks": [9, 10]},
    {"id": "cierre", "label": "Cierre", "blocks": list(range(11, 16))},
]

SUBTRAMAS = [
    {"id": "matrix", "label": "Matrix", "blocks": [9, 10]},
    {"id": "noviembre_analiza", "label": "Noviembre/Analiza", "blocks": [8]},
    {"id": "dual_reader", "label": "Dual reader", "blocks": [13, 14]},
    {"id": "talk_cache", "label": "Talk-cache", "blocks": [12, 13, 14]},
    {"id": "epilogo", "label": "Epílogo", "blocks": [15]},
]

ACT_BY_BLOCK: dict[int, str] = {}
for act in ACTS:
    for n in act["blocks"]:
        ACT_BY_BLOCK[n] = act["id"]


def act_for_block(n: int) -> str | None:
    return ACT_BY_BLOCK.get(n)


def chips_for_block(n: int) -> list[str]:
    return [s["id"] for s in SUBTRAMAS if n in s["blocks"]]


def extract_user_summary(path: Path) -> str | None:
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# User"):
            rest = stripped[len("# User") :].strip()
            if rest:
                return rest[:120]
            continue
        if stripped and not stripped.startswith("#"):
            return stripped[:120]
    return None


def uichain_files(n: int) -> list[str]:
    ui_dir = GAME_ROOT / "uichain"
    if not ui_dir.is_dir():
        return []
    pattern = re.compile(rf"block-{n}\b", re.IGNORECASE)
    found: list[str] = []
    for p in sorted(ui_dir.iterdir()):
        if p.is_file() and pattern.search(p.name):
            found.append(f"uichain/{p.name}")
    return found


def scan_block(n: int) -> dict:
    rel = f"scriptorium-network-games/SOLVE_ET_COAGULA"
    bc = GAME_ROOT / "blockchain" / f"block-{n}.md"
    composer = GAME_ROOT / "agentchain" / "composer" / f"block-{n}.md"
    gemini = GAME_ROOT / "reader-chain" / "gemini" / f"block-{n}.md"
    ui = uichain_files(n)

    bc_present = bc.exists()
    summary = extract_user_summary(bc) if bc_present else None

    return {
        "n": n,
        "act": act_for_block(n),
        "blockchain": {
            "present": bc_present,
            "path": f"{rel}/blockchain/block-{n}.md" if bc_present else None,
            "ultra_resumen": summary,
        },
        "composer": {
            "present": composer.exists(),
            "path": f"{rel}/agentchain/composer/block-{n}.md" if composer.exists() else None,
        },
        "gemini": {
            "present": gemini.exists(),
            "path": f"{rel}/reader-chain/gemini/block-{n}.md" if gemini.exists() else None,
        },
        "uichain": {
            "present": bool(ui),
            "paths": ui,
        },
        "chips": chips_for_block(n),
    }


def build_manifest() -> dict:
    blocks = [scan_block(n) for n in range(0, BLOCK_MAX + 1)]
    return {
        "schema_version": "0.1",
        "game": "solve-et-coagula",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_root": "scriptorium-network-games/SOLVE_ET_COAGULA",
        "acts": [
            {"id": a["id"], "label": a["label"], "blocks": a["blocks"]} for a in ACTS
        ],
        "subtramas": [
            {"id": s["id"], "label": s["label"], "blocks": s["blocks"]} for s in SUBTRAMAS
        ],
        "blocks": blocks,
        "gemini_range": "1-3",
        "ayuda_poder": "network-engine/agents/skills/disfraz-rude-bot/poderes/ayuda/SKILL.md",
    }


def main() -> None:
    manifest = build_manifest()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    present_bc = sum(1 for b in manifest["blocks"] if b["blockchain"]["present"])
    print(f"Wrote {OUTPUT.relative_to(REPO_ROOT)} ({present_bc} blockchain blocks on disk)")


if __name__ == "__main__":
    main()
