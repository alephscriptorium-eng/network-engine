# Cache Explorer — manual operador

Navegador de cache de líneas (`@zeus/view-ui`). Complementa el Tablero ALEPH sin playhead ni decks.

## Arranque

```bash
cd network-engine/zeus-presets-sdk
npm install
npm run start:view      # http://localhost:3015
```

**Prerequisito:** `VOLUMES/DISK_02/LINEAS/` con `registry.yaml` y datos de línea (vía `resolveVolume('lineas')`).

Opcional (stats live):

```bash
npm run start:lineas    # :4111 espana, :4112 wp-historia
```

## Superficie

| Zona | Contenido |
|------|-----------|
| **Shell global** | Header Zeus (Editor · Tablero · Cache · Sesión) + selector de tema + footer mesh |
| **Cabecera página** | Selector de línea, badge cobertura cache, breadcrumb del fichero activo |
| **Panel izquierdo** | Árbol de directorios (lazy load al expandir) |
| **Panel derecho** | Visor automático según tipo de archivo |

## Dispatcher de viewers

| Tipo | Visor |
|------|-------|
| `.json` | object-explorer |
| `.md` | markdown preview |
| `.wikitext` | texto plano + metadatos `.meta.json` si existe |
| Índice anclas (`fetch-priority-viaje1.json`, `wave-a-anchors.json`) | anchors-explorer |
| Otros | texto plano |

## REST API

| Ruta | Contenido |
|------|-----------|
| `GET /api/config` | Tema, discovery, viewers registry |
| `GET /api/themes` | Lista de temas + tema actual (shell) |
| `POST /api/theme/switch` | Cambio de tema persistente (shell) |
| `GET /api/lineas` | Líneas desde `registry.yaml` |
| `GET /api/browse?linea={id}&path={rel}` | Entradas de directorio |
| `GET /api/file?linea={id}&path={rel}` | Contenido del fichero |
| `GET /api/stats?linea={id}` | Stats cache (MCP o filesystem) |
| `GET /api/anchors?linea={id}` | Grid Wave A |
| `GET /api/focus` | Foco actual (path, viewer, resumen) |

## Deep links

```
http://localhost:3015/?linea=espana&path=manifest.json
http://localhost:3015/?linea=espana&path=wp-historia/cache/snapshots/12345.wikitext
```

## Relación con otros paquetes

| Paquete | Rol |
|---------|-----|
| **player-ui** | Tablero, playhead, cachear wikitext (`cache_wikitext`); **viewer launcher** → deep links vía `GET /api/aleph/view-links` |
| **editor-ui** | Presets y catálogo MCP |
| **linea-system** | Fuente MCP + mismo `basePath` en disco |
| **ui-kit** | Shell, object-explorer, anchors-explorer, **viewer-launcher** (`Zeus.ViewerLauncher`) |

## Tests

```bash
npm run e2e:view
```

Ver también [`view-contract.md`](view-contract.md) y [`deck-contract.md`](deck-contract.md) (puerto 3015).
