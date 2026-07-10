# Documentación Zeus

Índice canónico del monorepo `zeus-presets-sdk`. Este hub enlaza fuentes de verdad (código, `.env`, contratos); no duplica esquemas ni valores de puerto.

## Contratos (block-0)

| Documento | Alcance |
|-----------|---------|
| [deck-contract.md](deck-contract.md) | Playhead, socket.io, presets compartidos, mesh UI editor ↔ player |
| [view-contract.md](view-contract.md) | REST de view-ui y esquema `view://` |
| [firehose-contract.md](firehose-contract.md) | MCP disco Firehose y Firehose Explorer |
| [volumes-contract.md](volumes-contract.md) | Árbol `VOLUMES` on-disk (`volumes.json`, DISK_01/DISK_02) |

## Manuales de operador

| Documento | Alcance |
|-----------|---------|
| [tablero-aleph.md](tablero-aleph.md) | Tablero ALEPH (ALEPH et OMEGA): LED, crossover, drawers |
| [view-ui.md](view-ui.md) | Cache Explorer: navegación DISK_02/LINEAS |
| [packages/player-ui/MANUAL-DJ.md](../packages/player-ui/MANUAL-DJ.md) | Mesa DJ: platos A/B, playhead histórico |
| [packages/player-ui-debug/MANUAL-DJ.md](../packages/player-ui-debug/MANUAL-DJ.md) | Monitor TOP y sesión MCP de depuración |
| [packages/linea-system/README.md](../packages/linea-system/README.md) | Servidores linea-espana y linea-wp-historia, URIs y puente temático |

## Cursor MCP

Guías para registrar servidores MCP en Cursor (URLs derivadas de `ZEUS_HOST` y `ZEUS_MCP_*`):

| Guía | Servidor |
|------|----------|
| [cursor-mcp-lineas.md](cursor-mcp-lineas.md) | linea-espana, linea-wp-historia |
| [cursor-mcp-firehose.md](cursor-mcp-firehose.md) | Firehose disco |
| [cursor-mcp-player-debug.md](cursor-mcp-player-debug.md) | Player debug monitor |

Tras cambiar puertos en `.env`, ejecutar `npm run env:sync-mcp` y comprobar con `npm run env:check-mcp`.

## Entorno y volúmenes

- Variables de entorno: copiar [`.env.example`](../.env.example) a `.env` en la raíz del monorepo.
- Contrato canónico `ZEUS_*`: [`ZEUS_ENV_CONTRACT`](../packages/presets-sdk/src/zeus-env.mjs) en `@zeus/presets-sdk`.
- Volúmenes on-disk: [volumes-contract.md](volumes-contract.md); scripts `npm run volumes:init:lineas` y `npm run volumes:sync:firehose`.
- Los presets persisten en `data/presets.json` (compartido por editor y player).

Las URLs de servicio siguen `http://${ZEUS_HOST}:${ZEUS_PORT_*}` para UIs y `http://${ZEUS_HOST}:${ZEUS_MCP_*}/mcp` para servidores MCP; valores por defecto en `.env.example`.

## Paquetes del workspace

Tabla generada desde `packages/*/package.json` (`zeus.role`, `description`, `main`). Regenerar tras añadir un paquete:

```bash
npm run docs:index
```

<!-- packages:auto -->
| Rol | Paquete | Entrada | Documentación |
|-----|---------|---------|---------------|
| lib | `@zeus/app-shell` | `src/index.mjs` | [deck-contract.md](deck-contract.md) |
| lib | `@zeus/presets-sdk` | `src/index.mjs` | [zeus-env.mjs](../packages/presets-sdk/src/zeus-env.mjs), [volumes-contract.md](volumes-contract.md) |
| lib | `@zeus/test-utils` | `src/index.mjs` | — |
| lib | `@zeus/ui-kit` | `src/index.mjs` | [deck-contract.md](deck-contract.md) |
| mcp | `@zeus/linea-firehose` | `src/index.mjs` | [firehose-contract.md](firehose-contract.md), [cursor-mcp-firehose.md](cursor-mcp-firehose.md) |
| mcp | `@zeus/linea-system` | `src/start-all.mjs` | [README.md](../packages/linea-system/README.md), [cursor-mcp-lineas.md](cursor-mcp-lineas.md) |
| mcp | `@zeus/player-ui-debug` | `src/index.mjs` | [MANUAL-DJ.md](../packages/player-ui-debug/MANUAL-DJ.md), [cursor-mcp-player-debug.md](cursor-mcp-player-debug.md) |
| mcp | `@zeus/solar-system` | `src/start-all.mjs` | [demo.mjs](../e2e/demo.mjs) |
| app | `@zeus/editor-ui` | `src/server.mjs` | [deck-contract.md](deck-contract.md) |
| app | `@zeus/firehose-view-ui` | `src/server.mjs` | [firehose-contract.md](firehose-contract.md) |
| app | `@zeus/player-ui` | `src/server.mjs` | [deck-contract.md](deck-contract.md), [tablero-aleph.md](tablero-aleph.md), [MANUAL-DJ.md](../packages/player-ui/MANUAL-DJ.md) |
| app | `@zeus/view-ui` | `src/server.mjs` | [view-contract.md](view-contract.md), [view-ui.md](view-ui.md) |
<!-- /packages:auto -->

## Topología en vivo

```bash
npm run canvas:generate
```

Genera [`canvases/SPRINT0.canvas.tsx`](../canvases/SPRINT0.canvas.tsx) a partir de `@zeus/presets-sdk/zeus-registry` (hosts y puertos resueltos desde el entorno actual).

## Desarrollo y CI

- Scripts npm: ver [`package.json`](../package.json) (`start:*`, `test:*`, `e2e:*`, `lint:env`, `canvas:generate`, `docs:index`).
- Tareas VS Code: [`.vscode/tasks.json`](../.vscode/tasks.json) (grupos Start / Stop / Test).
- CI: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — `test:sdk`, `test:lineas`, `test:solar`, `@zeus/app-shell`, `lint:env`, `env:check-mcp`.
