# VOLUMES contract

Canonical on-disk storage for Zeus preset datasets under `VOLUMES/`.

## Registry

- **`volumes.json`** — volume ids, DISK slots, corpora counts, sync metadata.
- **`ZEUS_VOLUMES_ROOT`** — override VOLUMES directory (default: `<repo>/VOLUMES`).
- **`ZEUS_VOLUME_LINEAS`** — absolute override for `lineas` volume (`DISK_02/LINEAS`).
- **`FIREHOSE_REMOTE_PATH`** — override remote sync source for firehose.

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
| `resolveLineasSourceRoot()` | Registry/manifest root (lineas-poder) |
| `resolveLineasBasePath()` | Alias for source root (loaders, view-ui) |
| `resolveLineasVolumeRoot()` | DISK_02/LINEAS absolute path |
| `resolveLineasLineFilePath(linePath, rel)` | Hybrid cache overlay |

## DISK slots

| Slot | Volume | Status |
|------|--------|--------|
| `DISK_01` | `firehose` | **active** — 8 388 JSON |
| `DISK_02` | `lineas` | **active** — cache on volume, manifests at source |

## Hybrid lineas policy (DISK_02)

- **`DISK_02/LINEAS`** holds `*/cache/**` trees (wikitext snapshots, viajes, audits).
- **`lineas-poder`** remains canonical for `registry.yaml`, manifests, nodos, and fetch scripts.
- `resolveVolume('lineas')` → `DISK_02/LINEAS` (browse API, volume disk).
- `resolveLineasSourceRoot()` → `lineas-poder` (registry, manifests, player-ui, view-ui base).

## Read-only policy

- Remote pipeline sources are synced verbatim (`npm run volumes:sync:firehose`).
- Local `DISK_01` is operator-editable on disk; browse API enforces `readonly: true` from config.
- `DISK_02` cache is synced from lineas-poder via init script; manifests stay at source.

## Sync / init

```bash
npm run volumes:sync:firehose
npm run volumes:sync:firehose -- --verify

npm run volumes:init:lineas
npm run volumes:init:lineas -- --verify
npm run volumes:init:lineas -- --dry-run
```

Reports:
- `VOLUMES/DISK_01/FIREHOSE_SYNC_REPORT.md`
- `VOLUMES/DISK_02/LINEAS_SYNC_REPORT.md`
