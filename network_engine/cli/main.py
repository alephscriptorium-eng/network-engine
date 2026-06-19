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
    p_loadout_apply = p_loadout_sub.add_parser("apply", help="Aplicar loadout")
    p_loadout_apply.add_argument("loadout_id", help="ID del loadout")
    p_loadout_apply.add_argument("--semilla", help="Tema del turno")

    p_pack = sub.add_parser("pack", help="Generar paquete ZIP")
    p_pack.add_argument("--session", help="ID de sesión")
    p_pack.add_argument("--loadout", help="ID de loadout")

    p_session = sub.add_parser("session", help="Operaciones de sesión")
    p_session_sub = p_session.add_subparsers(dest="session_cmd", required=True)
    p_session_init = p_session_sub.add_parser("init", help="Iniciar sesión draft")
    p_session_init.add_argument("--loadout", required=True, help="Loadout a aplicar")
    p_session_init.add_argument("--semilla", required=True, help="Semilla del turno")
    p_session_init.add_argument("--session-id", help="ID explícito (opcional)")
    p_session_commit = p_session_sub.add_parser("commit", help="Confirmar turno")
    p_session_commit.add_argument("--session-id", required=True, help="ID de sesión")
    p_session_commit.add_argument("--posicion", type=float, required=True, help="Posición 0.0–1.0")
    p_session_commit.add_argument("--forces", required=True, help="Forces cortos (A,E)")
    p_session_publish = p_session_sub.add_parser("publish", help="Publicar en prensa")
    p_session_publish.add_argument("--session-id", required=True, help="ID de sesión")

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
    if args.command == "session" and args.session_cmd == "init":
        from network_engine.cli.session import run_init
        return run_init(args)
    if args.command == "session" and args.session_cmd == "commit":
        from network_engine.cli.session import run_commit
        return run_commit(args)
    if args.command == "session" and args.session_cmd == "publish":
        from network_engine.cli.session import run_publish
        return run_publish(args)

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
