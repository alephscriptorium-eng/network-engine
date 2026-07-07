# CACHE_RUNBOOK-PODER — Política de caché lineas-poder

Runbook para cachear revisiones de Wikipedia del corpus `lineas-poder/espana/wp/historia` (Historia de España).

---

## Prohibido

| Vía | Por qué |
|-----|---------|
| `es.wikipedia.org/wiki/...` (HTML scrape) | Rate limit agresivo, parsing frágil, riesgo de ban IP |
| `Special:Export` masivo vía navegador | Mismo problema |
| Scraping vía servidor MCP | Fuera de política del juego |
| Cualquier forma de scraping HTML | Solo API permitida |

## Permitido

| Necesidad | Endpoint MediaWiki | Script |
|-----------|-------------------|--------|
| Cuerpo de una revisión por `oldid` | `GET w/api.php?action=query&prop=revisions&revids={id}&rvprop=content` | `scripts/fetch_snapshot.py` |
| Revisión vigente | mismo + `rvlimit=1` en título | `fetch_snapshot.py --latest` |
| Batch priorizado | iteración sobre manifiesto | `scripts/fetch_batch.py` |

**Todos los fetches de producción usan `w/api.php`, nunca el frontend.**

## User-Agent obligatorio

```
lineas-poder/1.0 (corpus educational; non-commercial)
```

Requisito de la [Wikimedia Foundation User-Agent Policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy). Centralizado en `scripts/mw_client.py`.

## URLs `index.php?oldid=`

Solo en `*.meta.json` → campo `source_url` como **cita humana** para agentes.

**Nunca** usar `index.php` ni `/wiki/` como URL de fetch de ingestión.

## Rate limits

- `--sleep 1.0` por defecto en viajes con **>50 oldids**
- Ante HTTP **429**: backoff exponencial (en `fetch_batch.py`), reanudar con `--sleep 1.5`
- **Idempotente**: re-ejecutar batch salta `.wikitext` existentes
- Presupuesto aprobado por usuario vía `--max N`

## Artefactos de caché

| Artefacto | Ruta |
|-----------|------|
| Ground truth | `espana/wp/historia/cache/snapshots/{oldid}.wikitext` |
| Meta fetch | `espana/wp/historia/cache/snapshots/{oldid}.meta.json` |
| Manifiesto viaje | `scripts/fetch-priority-{viaje-id}.json` |
| Baseline cobertura | `espana/wp/historia/cache/audit-{viaje-id}.json` |

Campo `fetch_method` en meta: `"api"` (siempre, no hay dumps en este corpus).

## Convención de oleadas

| Wave | Contenido | Cuándo |
|------|-----------|--------|
| **A** | Anclas de los nodos P01–P24 (oldids cercanos a `año_ini` de cada nodo) | Siempre primero |
| **B** | Milestones sin cuerpo | Core offline |
| **C** | Muestreo por parte I–IV (5 registros/parte) | Completar cobertura |

**Wave A**: Para cada nodo P01–P24, encuentra el registro cuyo `timestamp` (año) esté más cercano al `año_ini` del nodo.

**Wave B**: Todos los registros con `milestone: true` que no tengan wikitext cacheado.

**Wave C**: Muestreo uniforme de registros no-milestone divididos por partes I–IV.

---

## Runbook estándar — «día bueno de internet»

Flujo probado para fetch controlado con presupuesto aprobado.

```bash
cd network-engine/lineas-poder

# 0. Auditoría previa
python scripts/audit_cache.py
# → leer espana/wp/historia/cache/audit-*.json

# 1. Generar manifiesto del viaje
python scripts/build_fetch_manifest.py --viaje-id viaje1 --dry-run
python scripts/build_fetch_manifest.py --viaje-id viaje1

# 2. Oleadas API (solo w/api.php)
# Wave A (anclas nodos) — presupuesto ~24 oldids
python scripts/fetch_batch.py \
  --priority-file scripts/fetch-priority-viaje1.json \
  --wave A --max 24 --sleep 1.0 --dry-run

python scripts/fetch_batch.py \
  --priority-file scripts/fetch-priority-viaje1.json \
  --wave A --max 24 --sleep 1.0

# Wave B (milestones) — presupuesto aprobado por usuario
python scripts/fetch_batch.py \
  --priority-file scripts/fetch-priority-viaje1.json \
  --wave B --max 100 --sleep 1.0 --dry-run

python scripts/fetch_batch.py \
  --priority-file scripts/fetch-priority-viaje1.json \
  --wave B --max 100 --sleep 1.0

# Wave C (muestreo) — opcional
python scripts/fetch_batch.py \
  --priority-file scripts/fetch-priority-viaje1.json \
  --wave C --max 50 --sleep 1.0

# 3. Cierre
python scripts/audit_cache.py --viaje-id viaje1
# → escribir espana/wp/historia/cache/audit-viaje1.json
```

## Árbol de decisión rápido

```
¿Necesitas datos WP?
├─ ¿oldid conocido en manifest?     → fetch_snapshot.py (API)
├─ ¿>200 oldids del mismo artículo? → NO PROCEDER, contactar usuario
├─ ¿solo auditoría sin fetch?       → audit_cache.py
└─ NUNCA scrape de /wiki/ ni index.php como fetch
```

## Formato JSON de auditoría

El servidor MCP consumirá `cache/audit-{viaje}.json` para el recurso `linea://cache/stats`. 

Formato requerido:

```json
{
  "generated_at": "2026-07-07T...",
  "viaje_id": "viaje1",
  "corpus": "lineas-poder/espana/wp/historia",
  "registro_count": 3564,
  "curated_registros": 950,
  "milestone_count": 950,
  "cached_wikitexts": 27,
  "cached_oldids": [174095416, ...],
  "milestones_sin_cuerpo": [oldid1, oldid2, ...],
  "milestones_sin_cuerpo_count": 923,
  "coverage_pct": 0.8
}
```

---

**Fuente:** Portado desde `network-engine/linea-aleph/CACHE_RUNBOOK.md` (solo lectura).
