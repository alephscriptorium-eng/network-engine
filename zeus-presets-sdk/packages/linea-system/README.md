# @zeus/linea-system

MCP servers for `VOLUMES/DISK_02/LINEAS`: **linea-espana** (tronco, :4111) and **linea-wp-historia** (satélite, :4112).

## Start

```bash
# Desde la raíz del repositorio
npm run start:lineas
```

## Bridge API (wp-historia)

| URI / tool | Semántica |
|------------|-----------|
| `linea://nodo/{year}` | Nodo Villacañas P01–P24 (450–2026) |
| `linea://registros/year/{year}` | **Puente temático:** nodo al año histórico + lista de revisiones WP sobre sus secciones |
| `linea://registros/nodo/{nodo_id}` | Igual, por nodo directo (P01–P24) |
| `linea://oldid/{year}` | Última revisión WP por **año calendario de edición** (2001–2026 only) |
| `linea://wikitext/{oldid}` | Cuerpo cacheado |
| `linea://registro/{id}` | Curación `registro.md` + `delta.md` |
| `get_registros_for_year` | Tool equivalente a `registros/year` |
| `get_registros_for_nodo` | Tool equivalente a `registros/nodo` |
| `cache_wikitext` | Fetch async de un oldid vía `fetch_snapshot.py` + rescan índice |

Respuesta `not cached` en `linea://wikitext/{oldid}` incluye `action.tool = cache_wikitext` para Tablero.

Datos del puente: `DISK_02/LINEAS/espana/wp/historia/nodo-sections.json`.

## Test

```bash
npm test --workspace=@zeus/linea-system
```
