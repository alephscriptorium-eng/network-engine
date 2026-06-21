# Corpus talk — discusión Wikipedia (NS1 / NS3)

Sub-corpus **paralelo** a `pseudociencia/` y la raíz de demarcación. Mismo contrato de caché (`{oldid}.wikitext` + `{oldid}.meta.json`) pero en `cache/talk/snapshots/` — **no mezclar** con `cache/snapshots/`.

## Cuatro vistas (bloque 13)

| Slug | Título API | Namespace | `linked_article` |
|------|------------|-----------|------------------|
| `discusion-pseudociencia/` | `Discusión:Pseudociencia` | 1 | `Pseudociencia` |
| `usuario-discusion-analiza/` | `Usuario discusión:Analiza` | 3 | — |
| `usuario-discusion-ignacio-icke/` | `Usuario discusión:Ignacio_Icke` | 3 | — |
| `usuario-discusion-solvecoagula/` | `Usuario discusión:SolveCoagula` | 3 | — |

Cada vista expone:

- `raw/linea.md` — historial API (meta, sin cuerpos masivos)
- `raw/linea.json` — revisiones en ventana oct–nov 2007
- `manifest.json` — registros segmentados + `article_refs[]` (cruce ±24 h con milestones artículo)
- `INDICE.md` — índice narrativo
- `snapshots/` — extremos (previo ventana, pico nov, actual)

## Ventana de interés

**1 oct – 30 nov 2007** — cubre pulso SC + fricción bloque 8 (reverts 12719652, 12909144).

## Comandos

```bash
cd network-engine/linea-aleph

# 1. Ingesta historial (meta)
python scripts/fetch_talk_history.py --all-anchors

# 2. Manifiesto oleada
python scripts/build_fetch_manifest.py --corpus talk --viaje-id talk-block13 \
  --anchors-file cache/talk/anchors/discusion-pseudociencia.json

# 3. Fetch cuerpos (Wave A primero)
python scripts/fetch_batch.py --corpus talk \
  --priority-file scripts/fetch-priority-talk-block13.json --wave A --sleep 1.0

# 4. Auditoría
python scripts/audit_cache.py --corpus talk
# → cache/audit-talk.json
```

Ver [`CACHE_RUNBOOK.md`](../CACHE_RUNBOOK.md) sección **Corpus talk**.
