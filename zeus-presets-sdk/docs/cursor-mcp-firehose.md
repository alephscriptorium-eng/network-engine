# Cursor MCP bridge — firehose disk server

Register `firehose-mcp-server` as a Streamable HTTP MCP server in Cursor. This is the **Zeus read-only disk MCP** over `VOLUMES/DISK_01/FIREHOSE` — not the external MCPGallery Jetstream server (outside Zeus).

## Prerequisites

```bash
# Desde la raíz del repositorio
npm run start:firehose-mcp
```

Optional UI (REST browse + micropost preview):

```bash
npm run start:firehose
```

| Service | Health | MCP endpoint |
|---------|--------|--------------|
| firehose-mcp-server | http://localhost:3008/mcp/health | http://localhost:3008/mcp |
| firehose-view-ui | http://localhost:3016/health | (REST only, no `/mcp`) |

Override port with `ZEUS_MCP_FIREHOSE` in `.env` (default **3008**). Host: `ZEUS_HOST`.

## Cursor configuration

Project entries live in `.cursor/mcp.json` and `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "firehose-mcp-server": {
      "url": "http://localhost:3008/mcp"
    }
  }
}
```

Use **Streamable HTTP** transport (not stdio).

## Verify

1. `curl http://localhost:3008/mcp/health` → `{ "status": "ok", "server": "firehose-mcp-server", ... }`
2. In Cursor, enable `firehose-mcp-server` and call `firehose_browse` with `{ "corpus": "candidate" }`.
3. Read resource `firehose://stats` for corpus counts.

## Tools

| Tool | Purpose |
|------|---------|
| `firehose_browse` | Lazy directory listing within a corpus |
| `firehose_list_posts` | Normalized micropost preview list |
| `firehose_get_post` | Single JSON post by volume-relative path |

## Resources

| URI | Content |
|-----|---------|
| `firehose://stats` | Corpus file counts |
| `firehose://triage` | `triage-manifest.json` |
| `firehose://corpus/{corpusId}` | Corpus metadata template |
| `firehose://post/{corpusId}/{batch}/{filename}` | Normalized post template |

## Full stack

```bash
npm run start:firehose-mcp   # 3008 — MCP disk
npm run start:firehose       # 3016 — Firehose Explorer UI
npm run start:lineas         # 4111-4112
npm run start:player         # 3013 — Tablero + firehose-links
```
