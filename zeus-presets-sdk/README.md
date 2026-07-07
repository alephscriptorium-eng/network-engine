# ZEUS Presets Editor

Self-contained monorepo for MCP catalog discovery, preset management, solar/linea demo servers, editor UI, and DJ deck player. Decoupled from MCPGallery and NETWORK-ENGINE (those repos are read-only sources).

## Architecture

```text
packages/presets-sdk   Core: discovery, catalog, preset-store, catalog-service, preset-filter, readResource
packages/ui-kit        Shared shell: template, nav, themes, base.css, base.js
packages/solar-system  Demo MCP: sun, moon, earth (ports 4101–4103)
packages/linea-system  Linea MCP: linea-espana, linea-wp-historia (4111–4112)
packages/editor-ui     Preset editor + MCP explorer (:3012)
packages/player-ui     DJ deck: 2 platos, playhead, socket.io session (:3013)
e2e/demo.mjs           Solar-system-observer validation
e2e/deck-demo.mjs      Linea deck sync + degraded validation
docs/deck-contract.md  Block-0 interface for deck/linea/player
```

Data flow:

1. **Solar** (`4101–4103`) and **lineas** (`4111–4112`) expose `POST /mcp` + `GET /mcp/health`
2. **presets-sdk** discovers servers, builds catalog, filters presets via `applyPresetFilter`
3. **editor-ui** and **player-ui** use the SDK in-process; share `data/presets.json`
4. **player-ui** resolves `linea://nodo/{year}` and `linea://oldid/{year}` on playhead ticks via `readResource`

## Quickstart

```bash
cd network-engine/zeus-presets-sdk
npm install

# Terminal 1: solar demo
npm run start:solar

# Terminal 2: linea servers (read-only lineas-poder data)
npm run start:lineas

# Terminal 3: editor
npm run start:editor

# Terminal 4: DJ deck player
npm run start:player
```

Open http://localhost:3012 (editor) and http://localhost:3013 (deck). Nav cross-links Editor ↔ Player.

## DJ deck (player-ui)

- Two decks (A/B): pick MCP server + optional preset filter
- Shared playhead in **historical years** (450–2026 tronco; 2001–2026 WP oldid)
- Parte I–IV cue marks on the slider
- Socket.io namespace `/session` — see `docs/deck-contract.md`

```bash
npm run e2e:deck   # automated sync + degraded test
```

## linea-system

| Server | Port | Templates |
|--------|------|-----------|
| linea-espana | 4111 | `linea://nodo/{year}`, `linea://parte/{id}` |
| linea-wp-historia | 4112 | + `linea://oldid/{year}` |

Smoke: year 1300 → P06 «Transfiguración carismática»; year 2010 → oldid on satellite.

## Preset schema

```json
{
  "items": [
    { "serverName": "linea-espana", "type": "tool", "name": "get_nodo" },
    { "serverName": "linea-wp-historia", "type": "resourceTemplate", "name": "linea-oldid" }
  ]
}
```

Item `type`: `tool`, `resource`, `resourceTemplate`, `prompt`.

Presets persist to `data/presets.json` (shared by editor and player).

## SDK additions

- `extractor.readResource(uri)` — native MCP resource reads
- `createCatalogService({ registry })` — TTL catalog cache (moved from editor-ui)
- `applyPresetFilter(serverEntry, preset)` — preset ∩ catalog intersection

## Cursor MCP bridge

See `docs/cursor-mcp-lineas.md` for registering linea servers in Cursor (`http://localhost:4111/mcp`, `http://localhost:4112/mcp`).

## Tests

```bash
npm run test:sdk
npm run test:solar
npm run test:lineas
npm run e2e
npm run e2e:deck
```

## Manual validation

1. `npm run start:lineas` + `npm run start:player`
2. Deck A → linea-espana; Deck B → linea-wp-historia; move playhead to 1300 → P06 on A
3. `npm run start:editor` — create a preset; confirm it appears in player preset dropdown
4. Editor nav **Player** link → :3013; Player nav **Editor** → :3012
