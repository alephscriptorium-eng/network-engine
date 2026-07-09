# View contract — Cache Explorer

Block-0 interface for `@zeus/view-ui` and agent clients.

## Ports

| Service | Port |
|---------|------|
| `@zeus/view-ui` | **3015** |

## REST endpoints

| Route | Content |
|-------|---------|
| `GET /health` | `{ status, service: "view-ui" }` |
| `GET /api/config` | Public config: theme, discovery, viewers |
| `GET /api/lineas` | Registry entries |
| `GET /api/browse?linea=&path=` | Directory listing (relative path, no `..`) |
| `GET /api/file?linea=&path=` | File payload |
| `GET /api/stats?linea=` | Cache coverage stats |
| `GET /api/anchors?linea=` | Wave A anchor grid |
| `GET /api/focus` | Current UI focus snapshot |

### Browse query params

| Param | Default | Notes |
|-------|---------|-------|
| `linea` | required | Line id from registry |
| `path` | `""` | Relative to line root |
| `offset` | `0` | Pagination for large dirs |
| `limit` | `200` | Max entries per page |

### File response shape

```json
{
  "linea": "espana",
  "path": "manifest.json",
  "name": "manifest.json",
  "ext": ".json",
  "viewer": "object-explorer",
  "kind": "json",
  "data": {},
  "meta": null
}
```

`kind`: `json` | `text` | `markdown` | `wikitext` | `anchors-index`

## URI scheme — `view://`

Mirror for agents. Native reads SHOULD use REST; URI templates document the contract.

### Fixed resources

| URI | Content |
|-----|---------|
| `view://info` | Service metadata (port, basePath, lineas count) |
| `view://focus` | Same as `GET /api/focus` |
| `server://card` | Server card |

### Resource templates

| URI template | Content |
|--------------|---------|
| `view://linea/{lineaId}/browse/{path}` | Directory listing |
| `view://linea/{lineaId}/file/{path}` | File content |

Path segments in templates use `/` (URL-encoded when needed). Empty path = line root.

## Viewers registry (config.json)

```json
{
  "viewers": {
    "handlers": [
      { "match": "basename", "value": "fetch-priority-viaje1.json", "viewer": "anchors-explorer" },
      { "match": "basename", "value": "wave-a-anchors.json", "viewer": "anchors-explorer" },
      { "match": "ext", "value": ".json", "viewer": "object-explorer" },
      { "match": "ext", "value": ".md", "viewer": "markdown-preview" },
      { "match": "ext", "value": ".wikitext", "viewer": "text-plain" },
      { "match": "fallback", "viewer": "text-plain" }
    ]
  }
}
```

Match order: first match wins. `match`: `basename` | `ext` | `fallback`.

## Deep links

Browser: `/?linea={id}&path={rel}`

### Deep links desde otras UIs

Cualquier UI Zeus puede abrir view-ui con `@zeus/ui-kit` + `@zeus/presets-sdk`:

| Capa | Export | Rol |
|------|--------|-----|
| presets-sdk | `buildViewDeepLink`, `buildViewLinkItems`, `wikitextPath`, `nodoMetaPath` | Paths relativos + URLs |
| ui-kit | `openViewerButton`, `viewerLauncherMenu`, `Zeus.ViewerLauncher` | Controles SSR/cliente |
| player-ui | `GET /api/aleph/view-links` | Receta ALEPH desde `deck.resolved` |

**ViewLinkItem** (contrato compartido):

```json
{
  "id": "wikitext-2118229",
  "label": "r3278 · wikitext 2118229",
  "path": "wp/historia/cache/snapshots/2118229.wikitext",
  "href": "http://localhost:3015/?linea=espana&path=wp%2Fhistoria%2Fcache%2Fsnapshots%2F2118229.wikitext",
  "kind": "wikitext",
  "title": "optional tooltip",
  "disabled": false
}
```

`kind`: `wikitext` | `markdown` | `json` | `browse`

Mesh `view` host/port: `zeus-discovery.json` → `uis.view` → per-UI `config.view`.

## Security

- All `path` values resolved under line root from `registry.yaml`
- Reject `..`, absolute paths, and paths outside resolved root
- Read-only: no write endpoints

## Discovery

Same merge order as deck-contract: SDK defaults → `data/zeus-discovery.json` → `view-ui/config.json`.

MCP enrichment (optional): `linea://cache/stats` from `linea-wp-historia` when server is up.
