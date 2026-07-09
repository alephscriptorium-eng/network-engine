# Firehose contract — Firehose Explorer

Block-0 interface for `@zeus/firehose-view-ui` and `@zeus/linea-firehose`.

## Ports

| Service | Port |
|---------|------|
| `@zeus/firehose-view-ui` | **3016** |

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
| `@zeus/linea-firehose` | Schema, corpus browse, `listPosts` |
| `@zeus/firehose-view-ui` | HTTP server + browser UI |
| `@zeus/ui-kit` | `micropost-list.js`, `dual-viewer.css` |

## E2E

```bash
npm run e2e:firehose
```

Validates real DISK_01 data: stats 605/4076/3706/0, batch browse, handle+text normalization.
