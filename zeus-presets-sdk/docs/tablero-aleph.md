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
| Plato B | Agudos — WP + caché | `linea-wp-historia`, preset `aleph-viaje-wave-a` |
| LED strip | Wave A anclas P01–P24 | `/api/aleph/anchors` |
| Crossover | Graves (blockchain) + VU medidor | `/api/aleph/medicion/:casoId` |
| Drawer Viaje | Block-4 — sin fetch | `#viaje` |
| Drawer MCP | Block-5 — topología | `#mcp` |

## Presets ALEPH

| Preset | Uso |
|--------|-----|
| `aleph-tronco-puro` | Plato A — solo tesis P01–P24 |
| `aleph-wp-snapshots` | Plato B — oldid + wikitext para MCS |
| `aleph-viaje-wave-a` | Plato B — stats + wikitext anclas |
| `aleph-reader-divulgacion` | Reader — sin fetch ni wikitext |

## REST API (extensión Carril B)

| Ruta | Contenido |
|------|-----------|
| `GET /api/aleph/config` | casos, presets default, branding |
| `GET /api/aleph/anchors` | grid P01–P24 + cache/stats |
| `GET /api/aleph/medicion/:casoId` | estado.json resumido |
| `GET /api/aleph/topology` | server cards + carriles Composer/Reader |

## Socket (sin cambios de contrato base)

`deck:resolved` incluye campo opcional `wikitext: { cached, bytes, preview?, error? }` cuando el preset expone `linea-wikitext`.

## Enlaces ALEPH

- Story board: `scriptorium-network-games/ALEPH_ET_OMEGA/readerapp/aleph-et-omega-story-board.json`
- Spec uichain: `ALEPH_ET_OMEGA/uichain/tablero-aleph.prompt.md`
- Manual DJ base: `packages/player-ui/MANUAL-DJ.md`

## Tests

```bash
npm run e2e:tablero
```
