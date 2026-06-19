# SPDX-License-Identifier: GPL-3.0-or-later
"""Punto de entrada CLI: nengine."""

from __future__ import annotations

import argparse
import sys

from network_engine.catalog.sync import sincronizar_catalog
from network_engine.cli.build import run_build


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="nengine",
        description="Network Engine — tablero Aleph, catálogo y build web",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_build = sub.add_parser("build", help="Generar sitios estáticos")
    p_build.add_argument(
        "--target",
        choices=["all", "prensa", "foss", "root"],
        default="all",
    )

    p_catalog = sub.add_parser("catalog", help="Operaciones de catálogo")
    p_catalog_sub = p_catalog.add_subparsers(dest="catalog_cmd", required=True)
    p_catalog_sub.add_parser("sync", help="Sincronizar catalog.json desde manifests")

    p_loadout = sub.add_parser("loadout", help="Gestión de loadouts")
    p_loadout_sub = p_loadout.add_subparsers(dest="loadout_cmd", required=True)
    p_loadout_validate = p_loadout_sub.add_parser("validate", help="Validar loadout")
    p_loadout_validate.add_argument("loadout_id", help="ID del loadout (sin .json)")
    p_loadout_apply = p_loadout_sub.add_parser("apply", help="Aplicar loadout (stub)")
    p_loadout_apply.add_argument("loadout_id", help="ID del loadout")
    p_loadout_apply.add_argument("--semilla", help="Tema del turno")

    sub.add_parser("pack", help="Generar paquete ZIP (stub)")
    sub.add_parser("session", help="Operaciones de sesión (stub)")

    args = parser.parse_args(argv)

    if args.command == "build":
        run_build(target=args.target)
        return 0
    if args.command == "catalog" and args.catalog_cmd == "sync":
        cat = sincronizar_catalog()
        print(
            f"Catálogo sincronizado: {len(cat['engines'])} engines, "
            f"{len(cat['corpus'])} corpus, {len(cat['sessions'])} sesiones"
        )
        return 0
    if args.command == "loadout" and args.loadout_cmd == "validate":
        from network_engine.cli.loadout import run_validate
        return run_validate(args)
    if args.command == "loadout" and args.loadout_cmd == "apply":
        from network_engine.cli.loadout import run_apply
        return run_apply(args)
    if args.command == "pack":
        from network_engine.cli.pack import run
        return run(args)
    if args.command == "session":
        from network_engine.cli.session import run
        return run(args)

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
