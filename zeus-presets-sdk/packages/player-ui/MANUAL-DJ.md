# Manual de DJ — Zeus Player UI

Mesa de DJ para "pinchar" líneas de poder históricas. En vez de dos platos de vinilo, tienes **dos platos (A y B)** conectados a **servidores MCP** (`linea-*`), y en vez de mover la aguja por un surco, mueves un **playhead sobre una línea temporal** (años). Los **presets Zeus** funcionan como filtros de capacidades: recortan lo que cada plato puede "sonar".

- URL Tablero: http://localhost:3013
- URL Sesión debug: http://localhost:3013/session
- Servidor: `@zeus/player-ui` (Express + socket.io namespace `/session` + máquina de estados XState)

---

## 1. Arranque y parada

Desde VS Code (`Ctrl+Shift+P` → *Tasks: Run Task*), usando las tareas del workspace `zeus-presets-sdk` (shell git bash):

| Necesitas | Tarea |
|-----------|-------|
| **Tablero ALEPH (recomendado)** | `Start ▸ Tablero ALEPH` (seed + lineas + player) |
| Todo el escenario Zeus | `Start ▸ ALL` |
| Solo las fuentes del DJ | `Start ▸ lineas` (puertos 4111-4112) |
| La mesa / Tablero | `Start ▸ player-ui (DJ)` (puerto 3013) |
| Monitor TOP de sesión | `Start ▸ player-ui-debug` (consola TUI + MCP :3014) |
| Presets ALEPH (una vez o tras cambios) | `Seed ▸ aleph presets` |
| Apagar la mesa | `Stop ■ player-ui (DJ)` |
| Apagar las fuentes | `Stop ■ lineas` |
| Pánico / liberar todo | `Stop ■ ALL (kill all ports)` |
| Validar Tablero (e2e) | `Test ✓ e2e tablero aleph` |

El player hace *discovery* al arrancar y **re-descubre en cada listado de servidores** (`GET /api/servers`, socket `catalog:servers`). Las URLs se resuelven en este orden: defaults SDK → [`data/zeus-discovery.json`](../../data/zeus-discovery.json) → [`src/config.json`](src/config.json) `discovery`. Las fuentes deben estar arriba **antes** para aparecer en los desplegables de cada plato.

El **editor-ui** (`:3012`) usa la misma config compartida pero refresca bajo demanda: `POST /api/mcp/refresh` o botón refresh del MCP Explorer.

Orden mínimo Tablero ALEPH: `Seed ▸ aleph presets` → `Start ▸ lineas` → `Start ▸ player-ui (DJ)` — o la tarea compuesta `Start ▸ Tablero ALEPH` (seed y luego lineas + player + debug en paralelo).

### Monitor de depuración (`@zeus/player-ui-debug`)

Consola estilo **TOP** + **servidor MCP** (`:3014`) en un solo proceso. Conecta al namespace socket `/session`, hace polling REST y expone el mismo estado a agentes Cursor vía `player://snapshot`.

| Acción | Cómo |
|--------|------|
| Arrancar monitor + MCP | `Start ▸ player-ui-debug` o `npm run start:player-debug` |
| Con Tablero completo | `Start ▸ Tablero ALEPH` (incluye monitor en paralelo) |
| Registrar en Cursor | Ver [`docs/cursor-mcp-player-debug.md`](../../docs/cursor-mcp-player-debug.md) |
| Métricas servidor | Pon `"debug": true` en [`src/config.json`](src/config.json) y reinicia player-ui |

**Teclas TUI** (terminal con foco): `q` salir · `r` reconectar · `p` pausar transporte · `1`–`4` saltar a cues (450, 1350, 1808, 1978).

**Agentes MCP**: poll `player://snapshot`; tools de bajo nivel (`set_playhead`, `deck_load`, …) hacen proxy al socket; tools de sesión (`goto_parte`, `goto_anchor`, `bootstrap_decks`, `session_report`, …) emulan acciones del operador. Prompts `sync-with-operator` y `pinch-session` documentan alineación colaborativa sin Playwright.

### Variables de entorno (`.env`)

Puertos y host se leen del `.env` del monorepo (copiar desde `.env.example`). Tras cambiar puertos MCP, ejecutar `npm run env:sync-mcp`.

| Variable | Uso |
|----------|-----|
| `ZEUS_HOST` | Host compartido UIs + MCP |
| `ZEUS_PORT_PLAYER` | Tablero HTTP |
| `ZEUS_PORT_PLAYER_DEBUG` | Monitor MCP |
| `ZEUS_MCP_LINEA_ESPAN` / `ZEUS_MCP_LINEA_WP` | Fuentes linea |

Player-ui URL: `http://${ZEUS_HOST}:${ZEUS_PORT_PLAYER}`.

### Pinchar sesión en conjunto

| Rol | Canal | Acciones típicas |
|-----|-------|------------------|
| **Operador** | Browser `:3013` | Cues Parte, anchor LEDs, slider, selector Caso |
| **Agente** | MCP `:3014` | `session_report`, `goto_parte`, `goto_anchor`, `select_caso` |

Ambos comparten el mismo `session:state` por socket. Tras cada movimiento del agente, el operador ve el cambio en el Tablero sin recargar. El agente confirma con `session_report` — nunca Playwright.

### Página Sesión (`/session`)

Explorador en vivo del estado de sesión (sin volcado JSON en el Tablero):

| Acción | Dónde |
|--------|-------|
| Abrir explorador | Nav **Sesión** o botón **Sesión** en transport bar |
| Navegar | Breadcrumb + Subir / Anterior / Siguiente |
| Deep link | `#path=decks.B.resolved` |
| Panel monitor | Visible si `player-ui-debug` está activo (`debugMonitor.baseUrl` en config) |

Funciona **sin** el monitor MCP; el panel lateral muestra "Monitor offline" y el socket sigue en vivo.

> El monitor mata su propio proceso con Ctrl+C / `q`; no apaga player-ui ni las fuentes lineas.

> Si arrancas el player con las fuentes caídas, los platos podrán cargarse pero quedarán en estado `degraded` hasta que refresques el discovery (reinicia el player).

---

## 2. La mesa de un vistazo

```
┌─────────────────────────────────────────────────────────────┐
│  ► Play    ❚❚ Pause    🔗 Sync: ON                            │  ← barra de transporte
│                                                               │
│  Año histórico   [────────●───────────────]  1300             │  ← playhead
│  [Parte I·450] [Parte II·1350] [Parte III·1808] [Parte IV·1978]│  ← cue marks
├───────────────────────────┬───────────────────────────────────┤
│  Plato A                   │  Plato B                          │
│  Servidor: linea-espana    │  Servidor: linea-wp-historia      │
│  Preset:   (sin preset)    │  Preset:   (sin preset)           │
│  [ Cargar plato ]          │  [ Cargar plato ]                 │
│  estado: empty             │  estado: empty                    │
│  resuelto: —               │  resuelto: —                      │
├───────────────────────────┴───────────────────────────────────┤
│  Sesión: idle                                                  │
│  { …volcado de estado en vivo… }                               │
└─────────────────────────────────────────────────────────────┘
```

- **Barra de transporte**: Play / Pause / Sync.
- **Playhead**: el "año" actual. Rango por defecto 450–2026 (`deck.troncoRange`).
- **Cue marks**: saltos rápidos a las 4 Partes (I·450, II·1350, III·1808, IV·1978).
- **Plato A / B**: cada uno elige un servidor y (opcional) un preset-filtro.
- **Sesión**: fase global + volcado JSON del estado en vivo (útil para depurar).

---

## 3. Operativa básica (set mínimo)

1. **Elige fuente en un plato.** En *Plato A*, desplegable **Servidor** → `linea-espana`.
2. *(Opcional)* **Pon un filtro.** Desplegable **Preset**: recorta capacidades (ver §5). Sin preset = todo lo que exponga el servidor.
3. **Carga el plato.** Botón **Cargar plato**. Pasa a `loading` y, si la fuente responde, a `cued`.
4. **Mueve el playhead.** Arrastra el slider o pulsa un **cue** (p. ej. *Parte III·1808*). Cada cambio de año **resuelve** los platos cargados contra ese año.
5. **Lee el resultado.** La zona *resuelto* del plato muestra el `nodo` / `oldid` devueltos para ese año. El volcado de *Sesión* refleja todo el estado.
6. **Segundo plato.** Repite en *Plato B* con `linea-wp-historia` para pinchar dos líneas a la vez.

El **Play/Pause** marca la sesión como activa/pausada (transporte); el trabajo real de "sonar" un año ocurre al mover el **playhead** (es lo que dispara las lecturas MCP).

---

## 4. Estados (qué significa cada etiqueta)

**Fases de un plato** (`empty → loading → cued → playing → degraded`):

| Fase | Significado |
|------|-------------|
| `empty` | Sin servidor cargado. |
| `loading` | Se cargó servidor/preset; resolviendo capacidades. |
| `cued` | Listo y preparado ("en cue"), fuente conectada. |
| `playing` | Ha resuelto contenido para el año actual. |
| `degraded` | El servidor no responde / se cayó. Se auto-recupera si vuelve a contestar. |

**Fases de la sesión** (`idle → preparada → activa → cierre`):

| Fase | Cuándo |
|------|--------|
| `idle` | Nada cargado todavía. |
| `preparada` | Hay al menos un plato cargándose/cargado, aún no todo en cue. |
| `activa` | Todos los platos activos están `cued`/`playing` (o pulsaste Play). |
| `cierre` | Sesión terminada (al cerrar el servidor). |

---

## 5. Presets como filtros de capacidades

Un preset Zeus **no añade** nada: **recorta**. Al cargar un plato con un preset, el servidor se filtra (`applyPresetFilter`) a solo los items del preset. En la práctica, el DJ solo resolverá los **resource templates** que el plato (ya filtrado) siga exponiendo:

- `linea-nodo` → lee `linea://nodo/{año}`
- `linea-oldid` → lee `linea://oldid/{año}`

Es decir: si tu preset deja fuera `linea-oldid`, al mover el playhead ese plato devolverá `nodo` pero no `oldid`. Los presets se crean/editan en el **editor-ui** (http://localhost:3012) y se comparten vía el mismo `PresetStore`.

---

## 6. Sync

El botón **🔗 Sync** conmuta un flag de sesión (`sync: on/off`). Conceptualmente indica que ambos platos comparten el mismo playhead (un único año gobierna A y B a la vez), que es el comportamiento por defecto: al mover el año se **resuelven todos los platos** contra ese mismo instante.

---

## 7. Resolución en vivo (qué pasa por dentro)

Al mover el playhead a un año `Y`:

```
playhead:set { year: Y }
      │
      ▼
resolveAllDecks()  ── por cada plato cargado ──▶ ¿servidor conectado?
      │                                              │ no ▶ DECK_DEGRADED
      │                                              │ sí ▼
      │                        readResource linea://nodo/Y   (si expone linea-nodo)
      │                        readResource linea://oldid/Y  (si expone linea-oldid)
      ▼
deck:resolved  +  session:state   ──▶  UI actualiza "resuelto" y el volcado
```

Todo viaja por socket.io (`/session`). Eventos que emite la UI: `deck:load`, `playhead:set`, `sync:toggle`, `transport:play`, `transport:pause`. Eventos que recibe: `session:state` (estado completo) y `deck:resolved` (resultado puntual de un plato).

---

## 8. Problemas frecuentes

| Síntoma | Causa probable | Solución |
|--------|----------------|----------|
| Los desplegables de servidor salen vacíos | El player arrancó sin fuentes vivas | Arranca `Start ▸ lineas` y reinicia `player-ui` |
| Un plato queda en `degraded` | Su servidor MCP se cayó | Relevanta la fuente; el plato se recupera al responder de nuevo |
| "Address already in use" al arrancar | Puerto ocupado por un proceso viejo | `Stop ■ ALL (kill all ports)` y vuelve a arrancar |
| Cambié un preset y no filtra | El plato se cargó antes del cambio | Recarga el plato (**Cargar plato**) |

> Nota operativa: los servidores en segundo plano lanzados por agentes pueden ser barridos por limpiezas de proceso del entorno. Para una sesión estable, arranca las fuentes y la mesa en **terminales propias del IDE** con las tareas `Start ▸ …`.

---

## 9. Referencia rápida de puertos

| Servicio | Puerto(s) | Rol en la mesa |
|----------|-----------|----------------|
| solar-system | 4101-4103 | Fuente MCP alternativa (demo) |
| lineas | 4111-4112 | Fuentes por defecto de los platos A/B |
| editor-ui | 3012 | Crear/editar presets (los filtros) |
| player-ui (DJ) | 3013 | **La mesa** |
| player-ui-debug MCP | 3014 | Monitor + agentes Cursor (`player://snapshot`) |
