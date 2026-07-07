# Cursor MCP bridge — linea servers

Register `linea-espana` and `linea-wp-historia` as Streamable HTTP MCP servers in Cursor (same pattern as the solar `user-earth-mcp-server` entries).

## Prerequisites

```bash
cd network-engine/zeus-presets-sdk
npm run start:lineas
```

Servers listen at:

| Server | Health | MCP endpoint |
|--------|--------|--------------|
| linea-espana | http://localhost:4111/mcp/health | http://localhost:4111/mcp |
| linea-wp-historia | http://localhost:4112/mcp/health | http://localhost:4112/mcp |

## Cursor configuration

Add to your Cursor MCP settings (`.cursor/mcp.json` in the project or global Cursor config):

```json
{
  "mcpServers": {
    "linea-espana": {
      "url": "http://localhost:4111/mcp"
    },
    "linea-wp-historia": {
      "url": "http://localhost:4112/mcp"
    }
  }
}
```

Use **Streamable HTTP** transport (not stdio). Cursor discovers tools/resources after the servers are running.

## Verify

1. `curl http://localhost:4111/mcp/health` → `{ "status": "ok", "server": "linea-espana", ... }`
2. In Cursor chat, enable both MCP servers and call `get_nodo` with `{ "year": 1300 }` on linea-espana (expect P06).
3. On linea-wp-historia, read `linea://oldid/2010` or call `get_oldid` for a revision oldid.

## Sibling solar servers

Existing solar MCP entries (ports 4101–4103) remain unchanged. A full DJ stack runs:

```bash
npm run start:solar    # 4101-4103
npm run start:lineas   # 4111-4112
npm run start:editor   # 3012
npm run start:player   # 3013
```
