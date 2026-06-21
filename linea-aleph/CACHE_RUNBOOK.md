# CACHE_RUNBOOK — Política de caché linea-aleph

Fuente de verdad para **cómo** obtener datos de Wikipedia sin romper la política del juego ni la robot policy de Wikimedia.

## Prohibido

| Vía | Por qué |
|-----|---------|
| `es.wikipedia.org/wiki/...` (HTML scrape) | Rate limit agresivo, parsing frágil, riesgo de ban IP |
| `Special:Export` masivo vía navegador | Mismo problema |
| Agentes con browser automation para volcados | Fuera de política del juego |

## Permitido

| Necesidad | Endpoint MediaWiki | Script |
|-----------|-------------------|--------|
| Cuerpo de una revisión por `oldid` | `GET w/api.php?action=query&prop=revisions&revids={id}&rvprop=content` | `scripts/fetch_snapshot.py` |
| Revisión vigente | mismo + `rvlimit=1` en título | `fetch_snapshot.py --latest` |
| Historial artículo (meta, sin cuerpo) | `prop=revisions&rvlimit=500` paginado | `scripts/fetch_article_history.py` |
| Contribuciones usuario | `list=usercontribs` | `scripts/fetch_user_contribs.py` |
| Diff entre dos revisiones | `action=compare&fromrev=&torev=` | `scripts/fetch_compare.py` |
| Meta de una revisión (bytes, parent, user) | `revids` + `rvprop=ids\|timestamp\|user\|size\|parentids` | `scripts/mw_client.py` → `fetch_revision_meta()` |
| Volcado masivo años / artículo completo offline | `dumps.wikimedia.org/eswiki/` | `scripts/ingest_dump_revisions.py` (fase 2) |

Todos los fetches de producción usan **`w/api.php`**, nunca el frontend.

## URLs `index.php?oldid=`

Solo en `*.meta.json` → campo `source_url` como **cita humana** para agentes y agentchain.

**Nunca** usar `index.php` ni `/wiki/` como URL de fetch de ingestión.

## User-Agent obligatorio

```
linea-aleph/1.0 (BOT_ALEPH corpus; educational)
```

Requisito de la [Wikimedia Foundation User-Agent Policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy). Centralizado en `scripts/mw_client.py`.

## Rate limits (aprendizaje block-10)

- `--sleep 1.0` por defecto en viajes con **>50 oldids**
- Ante HTTP **429**: backoff exponencial (en `fetch_batch.py`), reanudar con `--sleep 1.5`
- **Idempotente**: re-ejecutar batch salta `.wikitext` existentes
- Block-10: 262 cuerpos nuevos en un día; oleada B requirió retry tras 429 con sleep 1.5

## Artefactos de caché

| Artefacto | Ruta |
|-----------|------|
| Ground truth | `cache/snapshots/{oldid}.wikitext` |
| Ground truth talk | `cache/talk/snapshots/{oldid}.wikitext` |
| Meta fetch | `cache/snapshots/{oldid}.meta.json` (`source_api`, `source_url`, `fetch_method`) |
| Meta fetch talk | `cache/talk/snapshots/{oldid}.meta.json` (`corpus`, `namespace`, `linked_article`) |
| Diff API | `cache/diffs/{from}-{to}.json` (+ opcional `.diff`) |
| Manifiesto viaje | `scripts/fetch-priority-{viaje-id}.json` |
| Log viaje | `cache/viajes/{fecha}-{viaje-id}.json` |
| Baseline cobertura | `cache/audit-{viaje-id}.json` |
| Dumps locales (fase 2) | `cache/dumps/` (`.bz2` en gitignore) |

Campo `fetch_method` en meta: `"api"` | `"dump"` — trazabilidad del origen.

## Convención de oleadas

| Wave | Contenido | Cuándo |
|------|-----------|--------|
| **A** | Anclas del bloque blockchain actual (p.ej. Matrix parents) | Siempre primero |
| **B** | Milestones sin cuerpo | Core offline |
| **C** | Ontology `sample_oldids` gap | Completar seeds |
| **D** (futuro) | Registros no-milestone vía dumps | Solo si meta >30 % registros sin cuerpo |

Wave A puede cargarse desde JSON externo: `build_fetch_manifest.py --wave-a-file anchors.json`.

---

## Corpus talk

Namespace paralelo (`Discusión:`, `Usuario discusión:`). Misma API y contrato `{oldid}.wikitext` + `{oldid}.meta.json`, rutas separadas bajo `cache/talk/`.

| Necesidad | Script |
|-----------|--------|
| Historial meta (4 vistas, oct–nov 2007) | `scripts/fetch_talk_history.py --all-anchors` |
| Cuerpo por oldid | `scripts/fetch_snapshot.py --corpus talk --oldid N --title "Discusión:Pseudociencia"` |
| Manifiesto oleadas | `scripts/build_fetch_manifest.py --corpus talk --viaje-id talk-block13` |
| Batch oleada | `scripts/fetch_batch.py --corpus talk --priority-file scripts/fetch-priority-talk-block13.json` |
| Auditoría | `scripts/audit_cache.py --corpus talk` → `cache/audit-talk.json` |

Meta talk incluye: `corpus: "talk"`, `namespace`, `linked_article` (si aplica). Cruce artículo: `article_refs[]` en manifest talk (±24 h vs `pseudociencia/manifest.json`).

```bash
cd network-engine/linea-aleph
python scripts/fetch_talk_history.py --all-anchors
python scripts/build_fetch_manifest.py --corpus talk --viaje-id talk-block13 \
  --anchors-file cache/talk/anchors/discusion-pseudociencia.json
python scripts/fetch_batch.py --corpus talk \
  --priority-file scripts/fetch-priority-talk-block13.json --wave A --sleep 1.0
python scripts/audit_cache.py --corpus talk
```

Árbol: [`talk/README.md`](talk/README.md), [`cache/talk/README.md`](cache/talk/README.md).

### Viaje `talk-sala-probe` (ventana ampliada, sin pisar oct–nov)

Investigación Fase 2: ¿hay actividad en **sala** (`Discusión:Pseudociencia`) o **Ignacio** fuera de la ventana block-13 (oct–nov 2007)? No invalida el vacío estructural ya documentado en block-13; usa artefactos **aislados** del corpus de producción.

| Artefacto probe | Ruta |
|-----------------|------|
| Historial meta ampliado | `talk/{slug}/probe/raw/linea.md` + `linea.json` |
| Manifiesto probe | `talk/{slug}/manifest.probe.json` (no toca `manifest.json`) |
| Anclas probe | `cache/talk/anchors/{slug}.probe.json` |

**Regla:** siempre `--probe-output` cuando la ventana ≠ oct–nov 2007, para no sobrescribir manifests del viaje `talk-block13`.

Flags CLI `fetch_talk_history.py`:

| Flag | Uso |
|------|-----|
| `--window-start` / `--window-end` | Ventana inclusiva `YYYY-MM-DD` |
| `--vista` | Alias de `--slug` (una vista) |
| `--full-history` | Ventana amplia (historial completo) |
| `--probe-output` | Escribe en `talk/{slug}/probe/` + `manifest.probe.json` |

```bash
cd network-engine/linea-aleph

# Sala — ventana 2007 completa
python scripts/fetch_talk_history.py \
  --vista discusion-pseudociencia \
  --window-start 2007-01-01 --window-end 2007-12-31 \
  --probe-output

# Ignacio — historial completo
python scripts/fetch_talk_history.py \
  --vista usuario-discusion-ignacio-icke \
  --full-history --probe-output

# Manifiesto + batch del viaje probe (tras historial)
python scripts/build_fetch_manifest.py --corpus talk --viaje-id talk-sala-probe \
  --probe-mode \
  --probe-slugs discusion-pseudociencia usuario-discusion-ignacio-icke
python scripts/fetch_batch.py --corpus talk \
  --priority-file scripts/fetch-priority-talk-sala-probe.json --wave A --sleep 1.0
python scripts/audit_cache.py --corpus talk
```

Vistas típicas del probe: `discusion-pseudociencia`, `usuario-discusion-ignacio-icke`. Oleada C manifest (7 Analiza pre-2008) es viaje distinto — ver `fetch-priority-talk-block13.json`, no mezclar con `talk-sala-probe`.

---

## Runbook estándar — «día bueno de internet»

Flujo probado en block-10 (offline milestones boost).

```bash
cd network-engine/linea-aleph

# 0. Auditoría previa
python scripts/audit_cache.py
# → leer cache/audit-block10.json (o el audit vigente)

# 1. Generar manifiesto del viaje
python scripts/build_fetch_manifest.py --dry-run
python scripts/build_fetch_manifest.py \
  --viaje-id offline-milestones \
  --wave-a-file scripts/wave-a-block10.json \
  --output scripts/fetch-priority-offline-milestones.json

# 2. Oleadas API (solo w/api.php)
python scripts/fetch_batch.py --priority-file scripts/fetch-priority-offline-milestones.json --wave A --sleep 1.0
python scripts/fetch_batch.py --priority-file scripts/fetch-priority-offline-milestones.json --wave B --sleep 1.0
python scripts/fetch_batch.py --priority-file scripts/fetch-priority-offline-milestones.json --wave C --sleep 1.0

# 3. Cierre
python scripts/fetch_batch.py --reconcile-only
python scripts/audit_cache.py
# → escribir cache/viajes/{fecha}-{viaje-id}.json + cache/audit-{viaje-id}.json
#    (plantilla viaje: build_fetch_manifest.py --write-viaje-template --viaje-id ...)

# 4. (Opcional) Diff entre revisiones ya cacheadas
python scripts/fetch_compare.py --fromrev 12295751 --torev 12321538
```

### Cuándo usar dumps (fase 2)

- Objetivo: **>80 % registros** con cuerpo o historial completo de un artículo
- Artículos nuevos en linea2 fuera de demarcación/pseudo
- Reconstruir `raw/linea.md` sin export manual

Ver `scripts/ingest_dump_revisions.py --help` y `cache/dumps/`.

---

## Árbol de decisión rápido

```
¿Necesitas datos WP?
├─ ¿oldid conocido en manifest?     → fetch_snapshot.py (API)
├─ ¿>200 oldids del mismo artículo? → plan dumps, NO API masiva
├─ ¿solo bytes/autor/parent?        → API meta (sin rvprop=content)
├─ ¿diff A↔B?                       → fetch_compare.py
└─ NUNCA scrape de /wiki/ ni index.php como fetch
```
