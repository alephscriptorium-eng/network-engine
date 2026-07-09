# Firehose contract — Firehose Explorer

Block-0 interface for `@zeus/firehose-view-ui` and `@zeus/linea-firehose`.

## Ports

| Service | Port |
|---------|------|
| `@zeus/firehose-view-ui` | **3016** |
| `@zeus/linea-firehose` MCP (disk) | **3008** |

## MCP disk server (`:3008`)

Read-only MCP over `VOLUMES/DISK_01/FIREHOSE`. **Not** the legacy MCPGallery Jetstream live server.

| Route | Content |
|-------|---------|
| `GET /mcp/health` | Server status + capability counts |
| `POST /mcp` | Streamable HTTP MCP |

Start: `npm run start:firehose-mcp`. Cursor: see `docs/cursor-mcp-firehose.md`.

### Tools

| Tool | Purpose |
|------|---------|
| `firehose_browse` | Corpus directory listing |
| `firehose_list_posts` | Normalized micropost preview list |
| `firehose_get_post` | Single post by volume-relative path |

### Resources

| URI | Content |
|-----|---------|
| `firehose://stats` | Corpus counts |
| `firehose://triage` | `triage-manifest.json` |
| `firehose://corpus/{corpusId}` | Corpus metadata |
| `firehose://post/{corpusId}/{batch}/{filename}` | Normalized post |

Env: `FIREHOSE_MCP_PORT` (default 3008).

## Volume

| Field | Value |
|-------|-------|
| Volume id | `firehose` |
| Disk | `DISK_01` |
| Path | `VOLUMES/DISK_01/FIREHOSE` |
| Files | 8 388 JSON (605 candidate · 4076 raw · 3706 discarded · 0 labeled) |

## Corpora

| id | Label | Layout |
|----|-------|--------|
| `candidate` | Candidatos | `batchTs/{eventId}_simple-rule.json` |
| `raw` | Raw | batch directories |
| `discarded` | Descartados | `bot/`, `no_spanish/`, `too_short/` |
| `labeled` | Etiquetados | empty in v1 |

## REST endpoints

| Route | Content |
|-------|---------|
| `GET /health` | `{ status, service: "firehose-view-ui" }` |
| `GET /api/config` | Theme, discovery, volume metadata |
| `GET /api/corpora` | Corpus list with `empty` flag |
| `GET /api/browse?corpus=&path=` | Directory listing within corpus |
| `GET /api/file?corpus=&path=` | File payload (JSON parsed) |
| `GET /api/posts?corpus=&path=` | Micropost preview list |
| `GET /api/triage` | `triage-manifest.json` at volume root |
| `GET /api/stats` | Corpus file counts from `volumes.json` |
| `GET /api/focus` | Current UI focus snapshot |

### Post shape (`normalizeFirehosePost`)

```json
{
  "id": "at://...",
  "handle": "user.bsky.social",
  "text": "...",
  "isReply": false,
  "uri": "at://...",
  "createdAt": "2026-02-28T22:34:59.838Z",
  "kind": "commit",
  "did": "did:plc:...",
  "raw": { }
}
```

Jetstream fields: `handle`, `commit.record.text`, `commit.record.reply`, `uri`.

## UI

- Shell: `@zeus/ui-kit` with `resolveUiMesh({ selfUiId: 'firehose' })`
- Subnav: 4 corpora tabs
- Viewer: **Raw** (object-explorer / text) | **Preview** (MicropostList + MicropostCard)
- Deep links: `?corpus=&path=&mode=raw|preview`
- **labeled** empty state when `files: 0`

## Packages

| Package | Role |
|---------|------|
| `@zeus/presets-sdk` | `resolveVolume`, `browseVolume`, `firehose-paths` |
| `@zeus/linea-firehose` | Schema, corpus browse, MCP disk server |
| `@zeus/firehose-view-ui` | HTTP server + browser UI |
| `@zeus/ui-kit` | `micropost-list.js`, `dual-viewer.css` |

## E2E

```bash
npm run e2e:firehose
npm run e2e:firehose-links
npm run test:firehose-mcp
```

Validates real DISK_01 data: stats 605/4076/3706/0, batch browse, handle+text normalization, player firehose-links, MCP smoke.

## Tablero Plato C

Plato **C** en `@zeus/player-ui` carga preset `aleph-firehose-browse` sobre `firehose-mcp-server` y resuelve microposts in-process (corpus → batch → lista → selección).

| Evento socket | Uso |
|---------------|-----|
| `deck:load` `{ deckId: 'C', serverName: 'firehose-mcp-server', presetId }` | Carga preset firehose |
| `firehose:corpus` `{ corpus, path? }` | Cambia corpus activo |
| `micropost:select` `{ filePath, corpus?, path? }` | Selecciona post para preview + deep link |

E2E Tablero: `npm run e2e:firehose-deck` (deck C + posts + links contextuales). A/B sin cambio: `npm run e2e:tablero`.
