# Tablero ALEPH — manual operador

Extensión transmedia de la **Mesa DJ Zeus** para el juego ALEPH et OMEGA (Scriptorium Skins · Animus Iocandi).

## Arranque

```bash
cd network-engine/zeus-presets-sdk
npm install
npm run start:lineas      # :4111 espana, :4112 wp-historia
npm run seed:aleph        # presets ALEPH en data/presets.json
npm run start:player      # http://localhost:3013
```

Orden: **lineas primero**, luego player.

## Superficie

| Zona | Metáfora sound-system | Datos |
|------|----------------------|-------|
| Plato A | Medios — tronco Villacañas | `linea-espana`, preset `aleph-tronco-puro` |
| Plato B | Agudos — revisiones WP temáticas | `linea-wp-historia`, preset `aleph-wp-cache` |
| LED strip | Wave A anclas P01–P24 | `/api/aleph/anchors` |
| Crossover | Graves (blockchain) + VU medidor | `/api/aleph/medicion/:casoId` |
| Drawer Viaje | Block-4 — sin fetch | `#viaje` |
| Drawer MCP | Block-5 — topología | `#mcp` |

## Semántica dual del playhead

El **año histórico** del slider (450–2026) gobierna el tronco Villacañas en ambos platos:

- **Plato A:** `linea://nodo/{year}` → nodo Px y tesis.
- **Plato B (bridge):** `linea://registros/year/{year}` → lista de revisiones WP que editaron secciones mapeadas a ese nodo (`nodo-sections.json`).

Distinto de `linea://oldid/{year}`, que resuelve por **año calendario de edición WP** (2001–2026) y falla fuera de esa ventana (p. ej. año 1000).

Ejemplo canónico: playhead **1000** → Plato A = **P03**; Plato B = lista no vacía de registros sobre «La Reconquista», «Era musulmana», etc.; **sin error** de cobertura WP.

Click en LED Wave A: playhead al `año_ini` del nodo + selección del **oldid ancla** (no confundir con año WP del tooltip).

## Presets ALEPH

| Preset | Uso |
|--------|-----|
| `aleph-tronco-puro` | Plato A — solo tesis P01–P24 |
| `aleph-wp-bridge` | Plato B — puente temático nodo→registros + wikitext on select |
| `aleph-wp-cache` | Plato B — bridge + tool `cache_wikitext` + botón Cachear (**default B**) |
| `aleph-wp-snapshots` | Plato B — oldid + wikitext por año calendario (MCS) |
| `aleph-viaje-wave-a` | Plato B — stats + wikitext anclas (drawer `#viaje`) |
| `aleph-reader-divulgacion` | Reader — sin fetch ni wikitext |

## REST API (extensión Carril B)

| Ruta | Contenido |
|------|-----------|
| `GET /api/aleph/config` | casos, presets default, branding |
| `GET /api/aleph/anchors` | grid P01–P24 + cache/stats |
| `GET /api/aleph/registros/:year` | puente temático (debug sin socket) |
| `GET /api/aleph/medicion/:casoId` | estado.json resumido |
| `GET /api/aleph/topology` | server cards + carriles Composer/Reader |

## Socket

`deck:resolved` incluye:

```js
{
  year, nodo, oldid?,           // oldid solo si preset expone linea-oldid
  registros: { anchor, sections, items, total, cached_count },
  selected?, wikitext?
}
```

Evento `registro:select` → `{ deckId, oldid, registro_id? }` carga wikitext del oldid elegido.

### Cache on-demand (Plato B)

Si `wikitext` no está cacheado, `deck:resolved` incluye:

```js
wikitext: {
  cached: false,
  oldid: 155320296,
  error: 'not cached',
  action: { tool: 'cache_wikitext', server: 'linea-wp-historia', arguments: { oldid }, poll: 'linea://wikitext/...' }
}
```

| Evento socket | Payload | Efecto |
|---------------|---------|--------|
| `wikitext:cache` | `{ deckId, oldid }` | `callTool cache_wikitext` en linea-wp-historia (spawn `fetch_snapshot.py`) |
| `wikitext:poll` | `{ deckId, oldid }` | Re-lee `linea://wikitext/{oldid}`; si cached → `deck:resolved` |
| `wikitext:cache-result` | `{ ok, status, oldid, poll }` | Respuesta al cliente tras disparar cache |

El browser arranca un timer (~2s) de `wikitext:poll` hasta cached o timeout 60s.

## Enlaces ALEPH

- Story board: `scriptorium-network-games/ALEPH_ET_OMEGA/readerapp/aleph-et-omega-story-board.json`
- Spec uichain: `ALEPH_ET_OMEGA/uichain/tablero-aleph.prompt.md`
- Manual DJ base: `packages/player-ui/MANUAL-DJ.md`
- Mapa nodo↔secciones: `lineas-poder/espana/wp/historia/nodo-sections.json`

## Tests

```bash
cd packages/linea-system && npm test
npm run e2e:tablero
```
