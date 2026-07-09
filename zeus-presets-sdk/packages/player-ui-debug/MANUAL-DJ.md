# Manual co-pilot — player-ui-debug MCP

Guía para agentes Cursor que **pinchan sesión** con el operador humano del Tablero ALEPH.

## Arranque

1. `Start ▸ Tablero ALEPH` (o al menos `lineas` + `player-ui` + `player-ui-debug`)
2. Registrar MCP `player-ui-debug-mcp-server` → `http://localhost:3014/mcp`
3. Operador abre http://localhost:3013

## Dos capas de tools

| Capa | Archivo | Uso |
|------|---------|-----|
| Bajo nivel | `logic.mjs` | Proxy 1:1 a eventos socket (`set_playhead`, `deck_load`, …) |
| Sesión | `logic-session.mjs` | Operaciones compuestas que emulan clicks del operador |

Preferir **logic-session** para navegación colaborativa; reservar logic.mjs para casos atípicos.

## Workflow pinch-session

1. `session_report` — estado actual (año, decks, health, activeCaso)
2. Si decks vacíos → `bootstrap_decks`
3. Navegar → `goto_parte` | `goto_anchor` | `goto_year`
4. Cambiar caso crossover → `select_caso`
5. `session_report` de nuevo — confirmar alineación con operador

## Reglas

- **Nunca Playwright** para interactuar con el Tablero
- **Nunca** afirmar estado sin `session_report` o `player://snapshot` fresco
- Si `health.socket.connected` es false, el monitor está offline
- Prompt `pinch-session` en MCP lista el flujo completo

## Verificación manual

| Paso | Agente | Operador confirma |
|------|--------|-------------------|
| 1 | `session_report` | Año y fase coinciden |
| 2 | Operador click Parte IV | Agente ve year=1978 |
| 3 | `goto_year(2026)` | Browser muestra 2026 |
| 4 | `select_caso('aeo-tronco-caso1')` | VU meters actualizados |
