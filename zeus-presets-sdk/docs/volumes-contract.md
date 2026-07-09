# VOLUMES contract

Canonical on-disk storage for Zeus preset datasets under `VOLUMES/`.

## Registry

- **`volumes.json`** — volume ids, DISK slots, corpora counts, sync metadata.
- **`ZEUS_VOLUMES_ROOT`** — override VOLUMES directory (default: `<repo>/VOLUMES`).
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

## DISK slots (v1)

| Slot | Volume | Status |
|------|--------|--------|
| `DISK_01` | `firehose` | **active** — 8 388 JSON |
| `DISK_02` | `lineas` | **deferred** (Fase 7) |

## Read-only policy

- Remote pipeline sources are synced verbatim (`npm run volumes:sync:firehose`).
- Local `DISK_01` is operator-editable on disk; browse API enforces `readonly: true` from config.
- `resolveVolume('lineas')` returns config but browse is blocked (`deferred: true`) until Fase 7.

## Sync

```bash
npm run volumes:sync:firehose
npm run volumes:sync:firehose -- --verify
```

Report written to `VOLUMES/DISK_01/FIREHOSE_SYNC_REPORT.md`.
