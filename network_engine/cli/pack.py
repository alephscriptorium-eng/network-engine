# SPDX-License-Identifier: GPL-3.0-or-later
"""CLI pack — genera ZIP de sesión o loadout."""

from __future__ import annotations

import argparse

from network_engine.tablero.pack import pack_loadout, pack_session


def run(args: argparse.Namespace) -> int:
    if args.session and args.loadout:
        print("ERROR: especificar solo --session o --loadout")
        return 1
    if not args.session and not args.loadout:
        print("ERROR: requiere --session ID o --loadout ID")
        return 1
    try:
        if args.session:
            dest = pack_session(args.session)
        else:
            dest = pack_loadout(args.loadout)
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}")
        return 1
    print(f"Pack generado: {dest}")
    return 0
