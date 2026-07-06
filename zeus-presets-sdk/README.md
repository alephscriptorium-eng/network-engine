# ZEUS Presets Editor

Self-contained monorepo for MCP catalog discovery, preset management, and a web editor UI. Decoupled from MCPGallery and NETWORK-ENGINE (those repos are read-only sources).

## Architecture

```text
packages/presets-sdk   Core: discovery, catalog extraction, preset store, HTTP routes
packages/solar-system  Demo: 3 MCP servers (sun, moon, earth) with deterministic orbital data
packages/editor-ui     Web UI: browse catalog, manage presets (no AI inference)
e2e/demo.mjs           End-to-end validation with solar-system-observer preset
```

Data flow:

1. `solar-system` exposes `POST /mcp` + `GET /mcp/health` on ports 4101-4103
2. `presets-sdk` discovers servers via health probe, connects with Streamable HTTP, builds catalog
3. `editor-ui` uses the SDK in-process and serves pages at `:3012`

## Quickstart

```bash
cd ZEUS_PRESETS_EDITOR
npm install

# Terminal 1: demo MCP servers
npm run start:solar

# Terminal 2: editor UI
npm run start:editor

# Run e2e demo (starts solar-system internally)
npm run e2e
```

Open http://localhost:3012 — pages: Home, Preset Library, MCP Editor, Settings.

## API

SDK routes (also mounted by editor-ui):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mcp/list` | Full MCP catalog |
| GET | `/api/mcp/presets` | Preset summaries |
| POST | `/api/mcp/set` | Create/update preset |
| GET | `/api/mcp/preset/:name` | Get preset by name |
| DELETE | `/api/mcp/preset/:id` | Delete preset |

Editor UI routes: `/api/presets`, `/api/presets/:id/download`, `/api/mcp/servers`, etc.

## Preset schema

```json
{
  "id": "1700000000000-abc123",
  "name": "solar-system-observer",
  "description": "...",
  "category": "Analysis",
  "prompt": "Optional agent instructions",
  "items": [
    { "serverName": "sun", "type": "tool", "name": "get_position" },
    { "serverName": "earth", "type": "resource", "name": "body-info" }
  ],
  "createdAt": "2026-07-06T...",
  "updatedAt": "2026-07-06T..."
}
```

Presets persist to `data/presets.json` (configurable via `packages/editor-ui/src/config.json`).

## Preset bundle export

Presets can be downloaded as a ZIP bundle from the Preset Library (**Download Preset**) or via:

```http
GET /api/presets/:id/download
```

Response: `Content-Type: application/zip` with `Content-Disposition: attachment; filename="{slug}.preset.zip"`.

ZIP layout:

```text
{slug}/
├── preset.json      # full Preset schema (no serverName enrichment)
├── manifest.json    # bundle metadata
└── README.md        # human-readable summary
```

`manifest.json` fields:

```json
{
  "format": "zeus-preset-bundle",
  "version": 1,
  "exportedAt": "2026-07-06T...",
  "presetName": "solar-system-observer",
  "presetId": "1700000000000",
  "itemsCount": { "tools": 2, "resources": 1, "prompts": 0, "total": 3 }
}
```

The SDK exposes `exportPresetBundle(preset)` from `@zeus/presets-sdk` for programmatic export.

## solar-system demo

Each body server exposes:

- **Resources**: `body://info`, `server://card`
- **Tools**: `get_position`, `get_rotation`, `getResourcesUris`, `getResourceByUri` (deterministic orbital tools plus resource bridge for agents that do not attach MCP resources directly)
- **Prompt**: `report-status`

The `solar-system-observer` preset (created by e2e) selects items from all three servers so an agent can report system state at a given moment.

## Tests

```bash
npm test -w @zeus/presets-sdk
npm test -w @zeus/solar-system
npm run e2e
```

## Manual UI validation

1. `npm run start:solar` and `npm run start:editor`
2. Open http://localhost:3012/editor — verify 3 servers appear
3. Select tools/resources from sun, moon, earth — create a preset
4. Open http://localhost:3012/presets — verify preset appears and persists after restart
