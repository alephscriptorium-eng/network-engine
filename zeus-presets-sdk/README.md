# ZEUS Presets SDK

Monorepo autocontenido para descubrimiento de catálogo MCP, gestión de presets, servidores demo (solar, líneas, firehose) y UIs de editor, player, view y firehose. Desacoplado de MCPGallery y NETWORK-ENGINE (esos repos son fuentes de solo lectura).

## Requisitos

- Node.js ≥ 18 (ver `engines` en [`package.json`](package.json))
- En Windows, Git Bash para tareas VS Code (ver [`.vscode/tasks.json`](.vscode/tasks.json))

## Instalación

```bash
cp .env.example .env   # ajustar ZEUS_* según tu entorno
npm install
```

Volúmenes opcionales: ver [docs/volumes-contract.md](docs/volumes-contract.md) y scripts `volumes:init:lineas` / `volumes:sync:firehose` en [`package.json`](package.json). Contrato de variables: [`ZEUS_ENV_CONTRACT`](packages/presets-sdk/src/zeus-env.mjs).

## Uso rápido

Tarea VS Code **Start ▸ ALL** (Terminal → Run Task) o los scripts `start:*` en [`package.json`](package.json). Las URLs siguen `http://${ZEUS_HOST}:${ZEUS_PORT_*}`; valores por defecto en [`.env.example`](.env.example).

## Escenarios

| Escenario | Arranque | Manual |
|-----------|----------|--------|
| Editor + presets | `npm run start:editor` | [docs/README.md](docs/README.md) |
| Mesa DJ / Tablero ALEPH | `start:lineas` + `start:player` (+ `seed:aleph` si aplica) | [docs/tablero-aleph.md](docs/tablero-aleph.md), [MANUAL-DJ](packages/player-ui/MANUAL-DJ.md) |
| Cache Explorer | Tarea **Start ▸ Cache Explorer** | [docs/view-ui.md](docs/view-ui.md) |
| Firehose Explorer | Tarea **Start ▸ Firehose Explorer** | [docs/firehose-contract.md](docs/firehose-contract.md) |
| Solar demo | `npm run start:solar` | [e2e/demo.mjs](e2e/demo.mjs) |
| Cursor MCP | Tras levantar servidores | [docs/cursor-mcp-lineas.md](docs/cursor-mcp-lineas.md) y guías relacionadas en [docs/README.md](docs/README.md) |

## Arquitectura

El catálogo MCP se descubre vía `@zeus/presets-sdk`; los presets viven en `data/presets.json`. Mapa de paquetes, contratos block-0 y topología: **[docs/README.md](docs/README.md)**. Vista en vivo: `npm run canvas:generate` → `canvases/SPRINT0.canvas.tsx`.

## Desarrollo

Scripts y tests en [`package.json`](package.json); CI en [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Tras añadir un paquete workspace, ejecutar `npm run docs:index`.

## Licencia

[Animus Iocandi AIPLv1](LICENSE-ANIMUS-IOCATI.md) — licencia compuesta (GPL-3.0-or-later + capa Animus Iocandi). Declarada como `AIPLv1` en [`package.json`](package.json).
