# SPDX-License-Identifier: GPL-3.0-or-later
"""CLI loadout validate|apply."""

from __future__ import annotations

import argparse

from network_engine.tablero.loadout import cargar_loadout, validar_loadout


def run_validate(args: argparse.Namespace) -> int:
    loadout = cargar_loadout(args.loadout_id)
    errors = validar_loadout(loadout)
    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        return 1
    print(f"Loadout '{args.loadout_id}' válido.")
    return 0


def run_apply(args: argparse.Namespace) -> int:
    loadout = cargar_loadout(args.loadout_id)
    errors = validar_loadout(loadout)
    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        return 1
    semilla = args.semilla or "(sin semilla)"
    print(f"Loadout '{args.loadout_id}' aplicado.")
    print(f"  skill: {loadout.get('skill')}")
    print(f"  profile: {loadout.get('profile_ref')}")
    print(f"  forces: {loadout.get('engines_active', {}).get('forces', [])}")
    print(f"  semilla: {semilla}")
    print("Siguiente paso: emitir ASENTAMIENTO_ALEPH e iniciar turno.")
    return 0
