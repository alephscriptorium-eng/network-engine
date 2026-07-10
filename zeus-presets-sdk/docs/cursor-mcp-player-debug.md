# Cursor MCP — player-ui-debug

Register the Tablero ALEPH **monitor MCP** so Cursor agents can poll live session state without opening the browser TUI.

## Prerequisites

1. **player-ui** running on port **3013** (Tablero in browser).
2. **player-ui-debug** running — starts TUI + MCP in one process:

```bash
# Desde la raíz del repositorio
npm run start:player-debug
```

MCP listens at `http://localhost:3014/mcp` (override with `ZEUS_PORT_PLAYER_DEBUG` in `.env`).

## Cursor registration

Add to workspace `.cursor/mcp.json` and `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "player-ui-debug-mcp-server": {
      "url": "http://localhost:3014/mcp"
    }
  }
}
```

Reload Cursor MCP after starting the debug service.

**Workspace root:** `.cursor/mcp.json` en la raíz del repositorio (o `.vscode/mcp.json`). Tras cambiar puertos en `.env`, ejecutar `npm run env:sync-mcp`. Enable `player-ui-debug-mcp-server` in Cursor Settings → MCP.

## Agent workflow

1. **Poll state**: read `player://snapshot` (or `getResourceByUri`).
2. **Align with operator**: use prompt `sync-with-operator` or `pinch-session` — refresh before stating Tablero facts.
3. **Low-level actions**: tools proxy to player-ui socket (`set_playhead`, `deck_load`, …).
4. **Session orchestration**: composite tools (`goto_parte`, `goto_anchor`, `bootstrap_decks`, `session_report`, …).
5. **Force refresh**: `refresh_snapshot` or `session_report` after REST-only changes.

## Pinchar sesión (agente + operador)

The operator drives the Tablero in the browser (`:3013`); the agent drives the same session via MCP (`:3014`) — both receive the same `session:state` broadcast. **Do not use Playwright** for agent interaction.

| Step | Agent | Operator sees |
|------|-------|----------------|
| Read | `session_report` or `player://snapshot` | — |
| Bootstrap | `bootstrap_decks` | Decks A/B load |
| Navigate | `goto_parte` / `goto_anchor` / `goto_year` | Playhead + nodo update |
| Caso | `select_caso` | VU meters + pregunta crossover |
| Confirm | `session_report` again | Compare year, nodos, phases |

Prompt `pinch-session` documents the full collaborative workflow.

## Key URIs

| URI | Use |
|-----|-----|
| `player://snapshot` | Main polling resource |
| `player://session` | Raw session machine state |
| `player://deck/A` | Deck A resolved payload |
| `player://health` | Connectivity check |
| `server://card` | Tools, templates, prompts catalog |

## Health check

```bash
curl http://localhost:3014/mcp/health
```

## Environment

Set ports in the monorepo root `.env` (copy from `.env.example`). Canonical names:

| Variable | Default | Purpose |
|----------|---------|---------|
| `ZEUS_HOST` | `localhost` | Shared host for UIs and MCP |
| `ZEUS_PORT_PLAYER` | `3013` | Target player-ui HTTP port |
| `ZEUS_PORT_PLAYER_DEBUG` | `3014` | MCP HTTP port |

Player-ui URL is derived from `ZEUS_HOST` + `ZEUS_PORT_PLAYER`.

See also [`deck-contract.md`](deck-contract.md) for full `player://` scheme and socket contract.
