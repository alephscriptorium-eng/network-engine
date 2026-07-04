# Corpus talk — discusión Wikipedia (NS1 / NS3)

Sub-corpus **paralelo** a `pseudociencia/` y la raíz de demarcación. Mismo contrato de caché (`{oldid}.wikitext` + `{oldid}.meta.json`) pero en `cache/talk/snapshots/` — **no mezclar** con `cache/snapshots/`.

## Cuatro vistas (bloque 13) + cinco vistas demarcación (bloque 16)

| Slug | Título API | Namespace | `linked_article` |
|------|------------|-----------|------------------|
| `discusion-pseudociencia/` | `Discusión:Pseudociencia` | 1 | `Pseudociencia` |
| `usuario-discusion-analiza/` | `Usuario discusión:Analiza` | 3 | — |
| `usuario-discusion-ignacio-icke/` | `Usuario discusión:Ignacio_Icke` | 3 | — |
| `usuario-discusion-solvecoagula/` | `Usuario discusión:SolveCoagula` | 3 | — |
| `discusion-problema-demarcacion/` | `Discusión:Problema de la demarcación` | 1 | `Problema de la demarcación` |
| `discusion-criterio-demarcacion/` | `Discusión:Criterio de demarcación` | 1 | `Criterio de demarcación` |
| `usuario-discusion-pabloallo/` | `Usuario discusión:Pabloallo` | 3 | — |
| `usuario-discusion-fernando-estel/` | `Usuario discusión:Fernando Estel` | 3 | — |
| `usuario-discusion-ctrl-z/` | `Usuario discusión:Ctrl_Z` | 3 | — |

Cada vista expone:

- `raw/linea.md` — historial API (meta, sin cuerpos masivos)
- `raw/linea.json` — revisiones en ventana oct–nov 2007
- `manifest.json` — registros segmentados + `article_refs[]` (cruce ±24 h con milestones artículo)
- `INDICE.md` — índice narrativo
- `snapshots/` — extremos (previo ventana, pico nov, actual)

## Ventana de interés

**1 oct – 30 nov 2007** — cubre pulso SC + fricción bloque 8 (reverts 12719652, 12909144).

**1 oct – 31 oct 2007** — ventana `ventana_oct_2007` del anexo demarcación (bloque 16–18). Alineación artículo: `article_alignment_demarcacion` (anclas 11663303, 11951034, 11951164, 11957942).

## Comandos

```bash
cd network-engine/linea-aleph

# 1. Ingesta historial (meta) — bloque 13
python scripts/fetch_talk_history.py --all-anchors

# 2. Anexo demarcación (bloque 16) — no pisa manifests block-13
python scripts/fetch_talk_history.py --vista discusion-problema-demarcacion --probe-full-history
python scripts/fetch_talk_history.py --vista discusion-criterio-demarcacion --probe-full-history
python scripts/fetch_talk_history.py --block16-ingest
python scripts/fetch_talk_history.py --vista usuario-discusion-fernando-estel \
  --window-start 2007-10-01 --window-end 2007-11-30 --production

# 3. Manifiesto oleada block-16
python scripts/build_fetch_manifest.py --corpus talk --viaje-id talk-block16 \
  --anchors-file cache/talk/anchors/discusion-problema-demarcacion.json

# 4. Fetch cuerpos (Wave A)
python scripts/fetch_batch.py --corpus talk \
  --priority-file scripts/fetch-priority-talk-block16.json --wave A --sleep 1.0

# 5. Auditoría (+ participant-register.json)
python scripts/audit_cache.py --corpus talk
# → cache/audit-talk.json, cache/talk/participant-register.json
```

### Bloque 13 (pseudociencia nov)

```bash
# Manifiesto oleada
python scripts/build_fetch_manifest.py --corpus talk --viaje-id talk-block13 \
  --anchors-file cache/talk/anchors/discusion-pseudociencia.json

# Fetch cuerpos (Wave A primero)
python scripts/fetch_batch.py --corpus talk \
  --priority-file scripts/fetch-priority-talk-block13.json --wave A --sleep 1.0
```

Ver [`CACHE_RUNBOOK.md`](../CACHE_RUNBOOK.md) sección **Corpus talk**.
