# Plan — sesión 05: cierre GENESIS y reunificación de planes

_Documento de síntesis persistido. Fuente: auditoría triple archivada en [`raw/archive-reunification.md`](archive-reunification.md) (19/6/2026)._

## Objetivo

Cerrar el ciclo de los tres planes GENESIS (`PLAN.md`, `PLAN2.md`, `PLAN3.md`) frente al producto implementado [`BOT_ALEPH/`](../) (= repo `network-engine`), archivar planes íntegros en `raw/`, liquidar roadmap por implementación, y cuadrar la bitácora en `logs-skill/`.

## Roles de los tres planes

| Plan | Rol | Destino tras cierre |
|------|-----|---------------------|
| **PLAN.md** | Motor-first, portal `exhibicion/`, pipeline clásico | **Borrado** (archivo en s05-01) |
| **PLAN2.md** | Contraplan: juego, loadout, `prensa/`, FOSS estricto | **Archivado** [`archive-plan2.md`](archive-plan2.md) |
| **PLAN3.md** | Unifica PLAN+PLAN2 + snapshot BOT_ALEPH + deuda + fases | **Archivado** [`archive-plan3.md`](archive-plan3.md) |
| **REUNIFICATION.md** | Auditoría triple | **Archivado** [`archive-reunification.md`](archive-reunification.md) |

## Catálogo de escenas (sesión 05)

### Sesión 5 — `sesion-05-genesis-network-engine/`

| ID | Slug | Tema |
|----|------|------|
| s05-01 | `01-cierre-plan-md` | Auditoría PLAN.md + archivo histórico + veredicto borrado |
| s05-02 | `02-estado-plan2-contraplan` | Fases PLAN2 §238–263: Hecho/Parcial/Aplicar/Descartar |
| s05-03 | `03-auditoria-refactor-plan3` | Inventario §1, deuda §2, fases §7; lista cambios refactor |
| s05-04 | `04-cierre-carpeta-genesis-plan` | Roadmap liquidado + carpeta GENESIS_PLAN borrada |

**Tags:** `genesis`, `network-engine`, `archivo`, `auditoria`

## Matriz de conflictos (resumen)

| Tema | Ganador |
|------|---------|
| Portal público | **PLAN2/3** → `prensa/` |
| Activación | **PLAN2/3** → loadout apply persistente |
| Layout `data/engines`, `data/corpus/` | **Descartado** — corpus in situ |
| `docs/sesiones/` | **Descartar** → `logs-skill/` |
| CLI session / pack | **Hecho** (s05-04) |
| `prensa/sesiones/` + `downloads/` | **Hecho** (s05-04) |

## Orden de ejecución (completado)

1. Crear s05-01..04 + este documento
2. Archivar PLAN2/PLAN3/REUNIFICATION en `raw/archive-*.md`
3. Implementar loadout apply, session, pack, prensa sesiones/downloads
4. Borrar carpeta `GENESIS_PLAN/` del workspace
5. `nengine catalog sync` + `nengine build --target prensa`

## Archivos raw

- [`archive-plan2.md`](archive-plan2.md) — PLAN2 íntegro
- [`archive-plan3.md`](archive-plan3.md) — PLAN3 íntegro
- [`archive-reunification.md`](archive-reunification.md) — REUNIFICATION íntegro
