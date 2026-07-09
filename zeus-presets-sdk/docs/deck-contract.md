# Deck contract — Mesa DJ Zeus

Block-0 interface decisions for `linea-system`, `player-ui`, and sibling UIs. All parallel agents MUST read this before implementing.

## Playhead (canonical)

| Field | Decision |
|-------|----------|
| Unit | Historical **year** as `number` (fractional years allowed, e.g. `1300.5`) |
| Tronco (`linea-espana`) range | **450–2026** inclusive |
| Satélite (`linea-wp-historia`) range | **2001–2026** only |
| Out-of-range (satellite) | Explicit empty response `{ error, coverage }` — never invent data |
| Out-of-range (tronco) | Same explicit empty pattern |

The playhead is the shared needle both decks follow when sync is on. Resolution is deterministic server-side via MCP resources.

## Linea-server URIs

Same style as `@zeus/solar-system` `body-server.mjs`: fixed URIs + parameterized templates.

### Fixed resources

| URI | Content |
|-----|---------|
| `linea://info` | Line metadata (name, coverage, part boundaries) |
| `server://card` | Server card (name, version, port, capabilities) |

### Resource templates

| URI template | Server | Content |
|--------------|--------|---------|
| `linea://nodo/{year}` | tronco + satélite | Nodo Px + tesis + articulos_wp for the year |
| `linea://parte/{id}` | tronco | Part I–IV descriptor |
| `linea://oldid/{year}` | satélite only | Registry entry whose revision timestamp is closest at-or-before the end of `{year}` (returns `oldid` + timestamp) |

### Mirror tools

| Tool | Purpose |
|------|---------|
| `get_nodo` | Tool bridge for `linea://nodo/{year}` |
| `get_oldid` | Tool bridge for `linea://oldid/{year}` (satellite) |
| `getResourcesUris` | List fixed resource URIs |
| `getResourceTemplates` | List template descriptors |
| `getResourceByUri` | Fallback read for clients without native `readResource` |
| `getPrompts` | List prompt names + descriptions (+ argument keys) |
| `getPrompt` | Fallback read for clients without native `getPrompt` |

Native prompt reads SHOULD use MCP `listPrompts` / `getPrompt`. Mirror tools remain for clients that only support `callTool`.

### Prompt

| Prompt | Purpose |
|--------|---------|
| `report-nodo` | Agent prompt for nodo + oldid at a given year |

Native reads SHOULD use `extractor.readResource(uri)` from `@zeus/presets-sdk`. The tool bridge remains for external MCP clients.

## Ports

| Service | Port |
|---------|------|
| `linea-espana` | **4111** |
| `linea-wp-historia` | **4112** |
| Solar bodies (unchanged) | 4101–4103 |
| `@zeus/editor-ui` | **3012** |
| `@zeus/player-ui` | **3013** |
| `@zeus/player-ui-debug` MCP | **3014** |

## MCP server discovery

Orchestration lives in `@zeus/presets-sdk`: `discoverServers()` probes `/mcp/health`; `syncDiscoveredServers()` registers results on a `ServerRegistry` and optionally refreshes `createCatalogService`.

### Config merge order

| Layer | Source |
|-------|--------|
| 1 | `DEFAULT_ZEUS_DISCOVERY` in SDK |
| 2 | [`data/zeus-discovery.json`](../../data/zeus-discovery.json) (shared workspace) |
| 3 | Per-UI `config.json` → `discovery` section |

Use `resolveDiscoverySources({ dataDir, localDiscovery })` before calling `syncDiscoveredServers`.

### UI policies

| UI | `pruneStale` | Refresh trigger |
|----|--------------|-----------------|
| editor-ui | `false` | Boot; `POST /api/mcp/refresh`; after `PUT /api/settings/discovery` |
| player-ui | `true` | Boot; every `GET /api/servers` / socket `catalog:servers` |

## MCP URI scheme — `player://` (player-ui-debug)

Mirror monitor for agents. Poll `player://snapshot` for live Tablero state. Native reads SHOULD use MCP `readResource`; bridge via `getResourceByUri`.

### Fixed resources

| URI | Content |
|-----|---------|
| `player://info` | Monitor metadata (URLs, poll intervals, MCP port) |
| `player://snapshot` | **Canonical composite** — session, decks, health, infrastructure, events |
| `player://session` | Full `session:state` payload |
| `player://health` | Socket connected + REST health |
| `player://events` | Typed event ring buffer |
| `player://servers` | Merged socket `catalog:servers` + REST `/api/servers` |
| `player://aleph/anchors` | `/api/aleph/anchors?linea={anchorsLineaId}` (poller default `espana`) |
| `player://aleph/medicion` | Default caso medicion |
| `server://card` | Server card (name, version, port, capabilities) |

### Resource templates

| URI template | Content |
|--------------|---------|
| `player://deck/{deckId}` | Deck A/B with `resolved` |
| `player://aleph/medicion/{casoId}` | Medicion by caso |
| `player://events/{limit}` | Last N events |
| `player://snapshot/at/{path}` | Subtree focus navigation — `{ value, children, parent, siblings }` |

Path convention for `player://snapshot/at/{path}`:

- Top-level snapshot keys (`session`, `health`, `events`, `monitor`, …) use paths like `health` or `session.decks.A`.
- Session-relative paths (`decks.A.resolved`, `playhead.year`) omit the `session.` prefix and resolve against `snapshot.session`.

Browser `/session` explorer uses **session-relative** paths (root = live `session:state`).

### REST endpoints (player-ui-debug HTTP)

| Route | Content |
|-------|---------|
| `GET /snapshot` | Full `player://snapshot` JSON |
| `GET /snapshot/at?path=` | Subtree inspection (same shape as template read) |

Player-ui proxies these when monitor is up:

| Route | Proxy target |
|-------|----------------|
| `GET /api/debug/health` | `{debugMonitor}/mcp/health` |
| `GET /api/debug/snapshot` | `{debugMonitor}/snapshot` |
| `GET /api/debug/at?path=` | `{debugMonitor}/snapshot/at?path=` |

Config: `debugMonitor.enabled`, `debugMonitor.baseUrl` (default `http://localhost:3014`).

### Tools (socket proxy to player-ui)

| Tool | Socket event |
|------|--------------|
| `set_playhead` | `playhead:set` |
| `transport_play` / `transport_pause` | `transport:play` / `transport:pause` |
| `sync_toggle` | `sync:toggle` |
| `deck_load` | `deck:load` |
| `registro_select` | `registro:select` |
| `wikitext_cache` / `wikitext_poll` | `wikitext:cache` / `wikitext:poll` |
| `cache_anchor` | `ZeusAnchorsExplorer` Cachear — lookup nodo in `player://aleph/anchors`, then cache+poll on deck B |
| `refresh_snapshot` | Force REST poll + return snapshot |
| `session_inspect` | Read `player://snapshot/at/{path}` metadata for focus navigation |

### Tools (session orchestration — logic-session.mjs)

High-level composite tools for collaborative DJ sessions (no Playwright). Each returns `{ ok, action, before, after, waitedMs }`.

| Tool | Emulates |
|------|----------|
| `bootstrap_decks` | Browser `autoLoadDecks` (A: linea-espana, B: linea-wp-historia) |
| `goto_parte` | Click Parte I–IV cue mark |
| `goto_anchor` | `ZeusAnchorsExplorer` navigate — optional `lineaId` (default `espana`) |
| `goto_year` | Playhead slider / year jump |
| `ensure_wikitext` | Cache + poll loop until wikitext cached |
| `select_caso` | `#caso-select` change (syncs operator VU meters) |
| `wait_for_session` | Block until year/nodo/phase matches |
| `session_report` | Structured summary for operator alignment |

### Prompts

| Prompt | Purpose |
|--------|---------|
| `explore-monitor` | Onboarding: info + server card + capabilities |
| `report-session` | Summarize snapshot for operator alignment |
| `diagnose-deck` | Inspect deck errors and wikitext |
| `sync-with-operator` | Poll snapshot each turn before commenting |
| `pinch-session` | Collaborative DJ: session_report + goto_* + bootstrap |

## Socket.io — namespace `/session`

Transport: Socket.IO attached to the player-ui HTTP server.

### Client → server

| Event | Payload | Effect |
|-------|---------|--------|
| `deck:load` | `{ deckId, serverName, presetId? }` | Load a catalog server (optional preset filter) onto a deck |
| `playhead:set` | `{ year }` | Move shared playhead |
| `sync:toggle` | _(none)_ | Toggle linked playhead between decks |
| `transport:play` | _(none)_ | Start playhead transport |
| `transport:pause` | _(none)_ | Pause playhead transport |
| `registro:select` | `{ deckId?, oldid, registro_id? }` | Select a registro revision on a deck; re-resolves wikitext |
| `wikitext:cache` | `{ deckId?, oldid }` | Call `cache_wikitext` on deck server (when preset allows) |
| `wikitext:poll` | `{ deckId?, oldid }` | Poll wikitext cache; auto-selects when cached |
| `caso:set` | `{ casoId }` | Set active ALEPH caso (syncs crossover VU meters across clients) |

### Server → clients

| Event | Payload | Effect |
|-------|---------|--------|
| `session:state` | Snapshot: machine value, playhead, decks, parteCues | Full session broadcast after every transition |
| `deck:resolved` | `{ deckId, year, nodo?, oldid?, registros?, selected?, wikitext? }` | Deterministic resolution for one deck at current playhead |
| `catalog:servers` | Server catalog array | Sent on connect; same shape as `GET /api/servers` |
| `wikitext:cache-result` | `{ ok, oldid, error?, … }` | Result of `wikitext:cache` |
| `wikitext:poll-result` | `{ cached, oldid, error?, action? }` | Result of `wikitext:poll` |
| `debug:stats` | `{ uptime, lastResolveMs, resolveCount, eventCounts }` | Heartbeat (~1s) when `config.debug=true` |
| `debug:resolve-timing` | `{ deckId, year, ms }` | Per-resolve timing when `config.debug=true` |

`wikitext` (optional, Tablero ALEPH): when preset exposes `linea-wikitext` and oldid resolves:

```json
{ "cached": true, "bytes": 4200, "preview": "..." }
// or
{ "cached": false, "error": "not cached", "hint": "..." }
```

## REST API — Tablero ALEPH extension (Carril B)

Read-only routes on player-ui (no socket contract change):

| Route | Purpose |
|-------|---------|
| `GET /api/aleph/config` | Casos, presets default, branding, `defaultLinea`, `lineaServers` |
| `GET /api/aleph/lineas` | Registry of line instances (`id`, `etiqueta`, `nodo_count`, …) |
| `GET /api/aleph/anchors?linea=espana` | Wave A anchor grid + live cache/stats for a línea (default `espana`) |
| `GET /api/aleph/medicion/:casoId` | `estado.json` summary |
| `GET /api/aleph/topology` | MCP server cards + Composer/Reader lanes |

See `docs/tablero-aleph.md`.

Resolution logic lives in **player-ui server** via in-process SDK (`readResource`, `applyPresetFilter`). Clients render; they do not resolve URIs themselves.

## Preset as filter

When a deck loads with a preset:

1. Take `preset.items` entries whose `serverName` matches the deck's server.
2. Intersect with the server's catalog entry (`tools`, `resources`, `resourceTemplates`, `prompts`) by `(type, name)`.
3. Exposed capabilities = intersection only.

Implementation: `applyPresetFilter(serverEntry, preset)` in `@zeus/presets-sdk` — **not** in player-ui ad-hoc logic.

Item schema (validated by `PresetStore`):

```json
{ "serverName": "linea-espana", "type": "tool|resource|resourceTemplate|prompt", "name": "get_nodo" }
```

No preset (`presetId` omitted) → full catalog entry for that server (no filter).

## Sibling UI rules (editor ↔ player)

Both UIs are **siblings on shared substrate**, not copies of each other.

| Concern | Rule |
|---------|------|
| Presets SDK | Both use `@zeus/presets-sdk` **in-process** (same pattern as `editor-ui/src/server.mjs`) |
| Shared data | `dataDir` = `<repo>/data` → same `presets.json`; preset created in editor appears in player |
| Shared UI kit | Both consume `@zeus/ui-kit` for template, nav, themes, `base.css`, `base.js` |
| Config | Autogenerated `config.json` per UI package (same pattern as `editor-ui/src/config.mjs`) |
| Nav cross-links | Editor nav includes **Player** → `http://localhost:3013`; Player nav includes **Editor** → `http://localhost:3012` (host/port configurable) |
| Session debug UI | `GET /session` — focus-based object explorer (ui-kit `ObjectExplorer`); nav **Sesión**; optional monitor panel via `/api/debug/*` |
| Assets | Each UI serves its own page assets; shared assets from `ui-kit` `assetsDir` via `express.static` |
| Scope | Editor owns preset CRUD + MCP explorer; Player owns deck/session/socket — no duplication |

### Phase 3 (planned, not yet implemented)

| URI / route | Purpose |
|-------------|---------|
| `player://session/at/{path}` | Alias canonical for in-process session actor reads |
| `GET /api/session/at?path=` | player-ui reads XState actor without debug monitor |
| `session_navigate`, `session_diff` | MCP tools for agent focus navigation and change detection |

---

## Dependency boundary

- `@zeus/presets-sdk`: discovery, registry, catalog-service, preset-store, preset-filter, `readResource`
- `@zeus/ui-kit`: layout shell, themes, base client JS
- `@zeus/linea-system`: MCP servers only (Carril A)
- `@zeus/player-ui`: session machine + deck view (Carril B)
- `lineas-poder/`: read-only data source
- No AOS / ALEPH invocation; player adds only `xstate` + `socket.io` beyond existing deps
