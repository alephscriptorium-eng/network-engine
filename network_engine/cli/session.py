# SPDX-License-Identifier: GPL-3.0-or-later
"""CLI session init|commit|publish."""

from __future__ import annotations

import argparse

from network_engine.tablero.session import (
    cargar_session,
    commit_session,
    init_session,
    parse_forces,
    publish_session,
)
from network_engine.tablero.loadout import cargar_loadout


def run_init(args: argparse.Namespace) -> int:
    try:
        session = init_session(args.loadout, args.semilla, session_id=args.session_id)
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}")
        return 1
    print(f"Sesión iniciada: {session['session_id']}")
    print(f"  loadout: {session['loadout_id']}")
    print(f"  semilla: {session['semilla']}")
    print(f"  status: {session['status']}")
    return 0


def run_commit(args: argparse.Namespace) -> int:
    forces = parse_forces(args.forces)
    if not forces:
        loadout = cargar_loadout(cargar_session(args.session_id)["loadout_id"])
        forces = loadout["engines_active"]["forces"]
    try:
        session = commit_session(args.session_id, posicion=args.posicion, forces=forces)
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}")
        return 1
    print(f"Sesión confirmada: {session['session_id']}")
    print(f"  posicion_linea: {session['posicion_linea']}")
    print(f"  forces: {session.get('engines_active', {}).get('forces', [])}")
    print(f"  status: {session['status']}")
    return 0


def run_publish(args: argparse.Namespace) -> int:
    try:
        session = publish_session(args.session_id)
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}")
        return 1
    print(f"Sesión publicada: {session['session_id']}")
    print(f"  url_prensa: {session.get('url_prensa')}")
    return 0
