# Caché talk (no versionada)

Espejo de [`../README.md`](../README.md) para el corpus **talk** (NS1 `Discusión:`, NS3 `Usuario discusión:`).

Los volcados viven en disco local. **No se commitean** al repo.

## Estructura

| Carpeta | Contenido |
|---------|-----------|
| `snapshots/` | `{oldid}.wikitext` + `{oldid}.meta.json` (`corpus: talk`, `namespace`, `linked_article`) |
| `anchors/` | JSON de prioridad Wave A por vista (`discusion-pseudociencia.json`, …) |
| `viajes/` | log JSON de viajes talk (misma convención que `cache/viajes/`) |

## Regenerar

```bash
cd linea-aleph
python scripts/fetch_talk_history.py --all-anchors
python scripts/build_fetch_manifest.py --corpus talk --viaje-id talk-block13 \
  --anchors-file cache/talk/anchors/discusion-pseudociencia.json
python scripts/fetch_batch.py --corpus talk \
  --priority-file scripts/fetch-priority-talk-block13.json --wave A --sleep 1.0
python scripts/audit_cache.py --corpus talk
```

Política completa: [`../CACHE_RUNBOOK.md`](../CACHE_RUNBOOK.md).
