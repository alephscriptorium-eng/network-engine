# Caché local (no versionada)

Los volcados de Wikipedia viven aquí en disco. **No se commitean** al repo.

Regenerar según [`../CACHE_RUNBOOK.md`](../CACHE_RUNBOOK.md):

```bash
cd linea-aleph
python scripts/build_fetch_manifest.py --viaje-id mi-viaje --dry-run
python scripts/fetch_batch.py --priority-file scripts/fetch-priority-mi-viaje.json --wave all --sleep 1.0
python scripts/audit_cache.py
```

| Carpeta | Contenido |
|---------|-----------|
| `snapshots/` | `{oldid}.wikitext` + `{oldid}.meta.json` |
| `diffs/` | salida de `fetch_compare.py` |
| `viajes/` | log JSON del viaje |
| `dumps/` | XML `.bz2` de Wikimedia (gitignored) |
