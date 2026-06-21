#!/usr/bin/env python3
"""Lint reader-chain/gemini/block-*.md for conventions."""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
GEMINI_DIR = (
    REPO_ROOT
    / "scriptorium-network-games"
    / "SOLVE_ET_COAGULA"
    / "reader-chain"
    / "gemini"
)

USER_RE = re.compile(r"^# User\s+(\d+)\s*$", re.MULTILINE)
FILE_URL_RE = re.compile(r"file://", re.IGNORECASE)
TRAJE_HEADER_RE = re.compile(
    r"^[^#\n]+· traje:(puesto|quitado) ·", re.MULTILINE
)
GREEN_RE = re.compile(r"🟢")


def lint_block(path: Path) -> list[str]:
    errors: list[str] = []
    n = int(path.stem.split("-")[1])
    text = path.read_text(encoding="utf-8")

    m = USER_RE.search(text)
    if not m:
        errors.append(f"{path.name}: missing '# User {n}' header")
    elif int(m.group(1)) != n:
        errors.append(
            f"{path.name}: '# User {m.group(1)}' does not match file block-{n}"
        )

    if "# Agent Reader" not in text:
        errors.append(f"{path.name}: missing '# Agent Reader' section")

    if not TRAJE_HEADER_RE.search(text):
        errors.append(f"{path.name}: missing cabecera traje line")

    if FILE_URL_RE.search(text):
        errors.append(f"{path.name}: contains file:// URL (use relative paths)")

    if n >= 3 and not GREEN_RE.search(text):
        errors.append(
            f"{path.name}: block >=3 should contain at least one 🟢 mark or explicit fetch"
        )

    return errors


def main() -> int:
    if not GEMINI_DIR.is_dir():
        print(f"Missing gemini dir: {GEMINI_DIR}", file=sys.stderr)
        return 1

    blocks = sorted(GEMINI_DIR.glob("block-*.md"))
    if not blocks:
        print("No gemini blocks found.", file=sys.stderr)
        return 1

    all_errors: list[str] = []
    for path in blocks:
        all_errors.extend(lint_block(path))

    if all_errors:
        for err in all_errors:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1

    print(f"OK: {len(blocks)} gemini block(s) passed lint.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
