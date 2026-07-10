# VOLUMES contract

Canonical on-disk storage for Zeus preset datasets under `VOLUMES/`.

## Registry

- **`volumes.json`** — volume ids, DISK slots, corpora counts, sync metadata.
- **`ZEUS_VOLUMES_ROOT`** — override VOLUMES directory (default: `<repo>/VOLUMES`). The `lineas` volume path is `{ZEUS_VOLUMES_ROOT}/DISK_02/LINEAS` per `volumes.json`.
- **`ZEUS_FIREHOSE_REMOTE_PATH`** — override remote sync source for firehose.

## API (`@zeus/presets-sdk`)

| Export | Purpose |
|--------|---------|
| `resolveVolumesRoot()` | Absolute VOLUMES root |
| `loadVolumesConfig()` | Parsed `volumes.json` |
| `resolveVolume(id)` | Merged config + `absPath` |
| `listVolumes()` | Volume id list |
| `browseVolume(id, path, opts)` | Lazy paginated directory browse |
| `readVolumeFile(id, path)` | Read file within volume |
| `sanitizeRelativePath(path)` | Reject `..` and absolute paths |
| `resolveLineasBasePath()` | DISK_02/LINEAS absolute path (loaders, view-ui) |
| `resolveLineasVolumeRoot()` | Alias for `resolveLineasBasePath()` |
| `resolveLineasVolumePath(rel)` | Path relative to volume root |
| `resolveLineasLineFilePath(linePath, rel)` | File within a line instance |
| `resolveLineasSatCacheDir(satDir)` | Satellite `cache/` directory |
| `resolveMedidorCasosPath(lineaId?)` | Medidor casos under `{lineaId}/etiquetados` |

## DISK slots

| Slot | Volume | Status |
|------|--------|--------|
| `DISK_01` | `firehose` | **active** — 8 388 JSON |
| `DISK_02` | `lineas` | **active** — full tree on volume |

## Lineas policy (DISK_02)

- **`DISK_02/LINEAS`** is the sole canonical read root: `registry.yaml`, manifests, nodos, cache, registros, scripts.
- Medidor **casos** (estado.json for Tablero crossover) live under `DISK_02/LINEAS/espana/etiquetados/`.
- `resolveVolume('lineas')` and `resolveLineasBasePath()` both resolve to `DISK_02/LINEAS`.
- Historical `lineas-poder` tree removed after migration (2026-07-09). Optional re-import via `ZEUS_LINEAS_IMPORT_SOURCE` + `--import`.
- Medidor casos optional re-import via `ZEUS_MEDIDOR_IMPORT_SOURCE` + `npm run volumes:init:medidor -- --import`.

## Read-only policy

- Remote pipeline sources are synced verbatim (`npm run volumes:sync:firehose`).
- Local `DISK_01` is operator-editable on disk; browse API enforces `readonly: true` from config.
- `DISK_02` is operator data; verify with `npm run volumes:init:lineas -- --verify`.

## Sync / init

```bash
npm run volumes:sync:firehose
npm run volumes:sync:firehose -- --verify

npm run volumes:init:lineas -- --verify
npm run volumes:init:lineas -- --stats
npm run volumes:init:lineas -- --import   # requires ZEUS_LINEAS_IMPORT_SOURCE env
npm run volumes:init:lineas -- --import --dry-run

npm run volumes:init:medidor -- --verify
npm run volumes:init:medidor -- --stats
npm run volumes:init:medidor -- --import   # requires ZEUS_MEDIDOR_IMPORT_SOURCE env
npm run volumes:init:medidor -- --import --dry-run
```

Reports:
- `VOLUMES/DISK_01/FIREHOSE_SYNC_REPORT.md`
- `VOLUMES/DISK_02/LINEAS_SYNC_REPORT.md`
- `VOLUMES/DISK_02/LINEAS/espana/etiquetados/MEDIDOR_SYNC_REPORT.md`
