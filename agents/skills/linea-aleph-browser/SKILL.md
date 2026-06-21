---
name: linea-aleph-browser
description: >-
  Navega la línea de demarcación (linea-aleph): expande deltas del historial WP
  SolveCoagula, cachea revisiones wikitext y viajes hipervinculados hacia offline.
  Usar al trabajar con linea-aleph/raw/linea.md, linea-aleph/raw/linea2.md,
  INDICE2.md, linea-aleph/, criterio de demarcación, caché aleph, ontology-seeds,
  o viajes Wikipedia desde registros.
---

# linea-aleph — agente navegador-caché

## Propósito

La **línea de demarcación** no es «una ciencia» única: es una **espina dorsal**
de revisiones enlazadas. Este skill guía al agente para:

1. Leer `linea-aleph/manifest.json` y `INDICE.md` (o `manifest2.json` + `INDICE2.md` para contexto usuario)
2. Elegir el siguiente **viaje** (registro milestone o sección en `ontology-seeds.json`)
3. **Cachear** revisiones (`fetch_snapshot.py`) y artículos enlazados
4. **Curar** `delta.md` con interpretación ontología/gnoseología
5. Ir volviendo el corpus **más offline** en viajes sucesivos

Relación con `logs-aleph`: sesión 02 (diamat, demarcación ABC, Gaia) es el marco
conversacional; `linea-aleph` es el **cuerpo histórico** (Wikipedia 2007, SolveCoagula).

### linea1 vs linea2 vs linea-pseudo

| Corpus | Fuente | Índice | Pregunta |
|--------|--------|--------|----------|
| **linea1** | `raw/linea.md` (export historial artículo) | `INDICE.md` | ¿Qué hizo SolveCoagula en *Problema de la demarcación*? |
| **linea2** | `raw/linea2.md` (API usercontribs NS0) | `INDICE2.md` | ¿Qué precede/intercala/sigue en toda su carrera enciclopedista? |
| **linea-pseudo** | `pseudociencia/raw/linea.md` (API historial artículo) | `pseudociencia/INDICE.md` | ¿Qué pasó en *Pseudociencia* (todos los editores, ventana SC)? |
| **linea-talk** | `talk/{vista}/raw/linea.md` (API historial NS1/NS3) | `talk/{vista}/INDICE.md` | ¿Hubo conversación en sala/UT o solo commits de artículo? (bloque 13) |

Consultar **INDICE** para deltas y milestones de demarcación; **INDICE2** para contexto
multi-artículo y clusters; **pseudociencia/INDICE** para la segunda línea gruesa
(223 registros en ventana, 169 con `in_linea2`); **talk/** para las cuatro vistas
de discusión (paralelo a `pseudociencia/`, diseño en `agentchain/composer/block-12.md`).

## Antes de empezar

```bash
cd linea-aleph
python3 segment_linea.py              # regenerar manifest + índice
python3 segment_linea.py --expand milestones
```

Leer:

- `raw/linea.md` — fuente canónica del historial WP (export SolveCoagula)
- `raw/linea2.md` — cronología completa usuario (~1006 edits, 24 artículos)
- `INDICE.md` — tesis, extremos previo/inicial/final, hitos (linea1)
- `INDICE2.md` — mapa enciclopedista, clusters, marco temporal (linea2)
- `manifest.json` — 677 registros con oldid, delta bytes, sección
- `manifest2.json` — contribuciones usuario + cross-ref `in_linea1`
- `pseudociencia/manifest.json` — 223 registros artículo Pseudociencia + `in_linea2`
- `pseudociencia/INDICE.md` — segunda línea gruesa (extremos, milestones)
- `ontology-seeds.json` — pack de secciones para expandir
- `snapshots/previo/meta.json`, `snapshots/inicial/meta.json`, `snapshots/final/meta.json`
- `snapshots/sc_cierre/meta.json` — última edición SolveCoagula (linea2); en demarcación oldid **12763920**, en pseudo coincide con `final`
- `snapshots/actual/meta.json` — revisión vigente Wikipedia (`fetch_snapshot.py --latest`)
- `snapshots/delta-extremo.md` — marco agregado previo→final (metadatos + punteros; curación pendiente)
- `snapshots/delta-sc-actual.md` — marco SC_cierre→actual (post-2007; curar tras fetch)

## Formatos (no bulk markdown)

| Qué | Dónde | Formato |
|-----|-------|---------|
| Índice narrativo | `INDICE.md` | Markdown (humano) |
| Delta interpretado | `registros/*/delta.md` | Markdown (curado) |
| Metadatos de registro | `registros/*/registro.md` | Markdown + YAML |
| **Cuerpo de artículo WP** | `cache/snapshots/{oldid}.wikitext` | Wikitext (verdad) |
| Metadatos de fetch | `cache/snapshots/{oldid}.meta.json` | JSON |
| **Cuerpo talk WP** | `cache/talk/snapshots/{oldid}.wikitext` | Wikitext (verdad; `corpus: talk`) |
| Metadatos talk | `cache/talk/snapshots/{oldid}.meta.json` | JSON (`namespace`, `linked_article`) |
| Manifest talk por vista | `talk/{vista}/manifest.json` | JSON (`article_refs[]` opcional) |
| Auditoría talk | `cache/audit-talk.json` | JSON |
| Viaje (grafo de enlaces) | `cache/viajes/{viaje-id}.json` | JSON |

**No** materializar los 677 snapshots en markdown. Solo milestones + fetch bajo demanda.

## linea2 — mapa enciclopedista (cuándo usar INDICE vs INDICE2)

| Pregunta | Consultar |
|----------|-----------|
| Delta en *Problema de la demarcación*, milestones, snapshots | `INDICE.md` + `manifest.json` + `raw/linea.md` |
| Qué artículos tocó SolveCoagula, orden cronológico, qué sigue a demarcación | `INDICE2.md` + `manifest2.json` + `raw/linea2.md` |
| ¿Esta oldid de demarcación está en linea1? | `manifest2.json` → `contribuciones[].in_linea1` |

Regenerar linea2:

```bash
python3 scripts/fetch_user_contribs.py --user SolveCoagula
python3 segment_linea2.py
```

**INDICE2** documenta: precede (nada — primera edit es demarcación), intercalado
(Pseudociencia, Método científico, etc. en paralelo), sigue (16 edits post-demarcación:
Pseudociencia + Imposturas intelectuales). Pseudociencia (169 edits usuario) tiene
**línea gruesa implementada** en `pseudociencia/`.

## Flujo de un viaje

### 1. Elegir ancla

Prioridad sugerida:

1. `snapshots/previo` si `fetched: false`
2. `snapshots/final` si `fetched: false`
3. `snapshots/sc_cierre` si `fetched: false` (demarcación: 12763920; pseudo = final)
4. `snapshots/actual` si `fetched: false` (`--latest`)
5. Milestone con `delta_status: pending` en manifest
6. Sección alta frecuencia en `ontology-seeds.json`
7. Enlace saliente del wikitext ya cacheado (`[[...]]`)

Consultar `snapshots/delta-extremo.md` para el marco del núcleo de 99 milestones (previo→final).

### 2. Fetch revisión

```bash
python3 scripts/fetch_snapshot.py --oldid 11663303   # previo demarcación
python3 scripts/fetch_snapshot.py --oldid 12763920 --title "Problema de la demarcación"  # sc_cierre demarcación
python3 scripts/fetch_snapshot.py --latest --title "Problema de la demarcación"  # actual demarcación
python3 scripts/fetch_snapshot.py --oldid 11597663 --title Pseudociencia  # previo pseudo
python3 scripts/fetch_snapshot.py --oldid 12910974 --title Pseudociencia  # final/sc_cierre pseudo
python3 scripts/fetch_snapshot.py --latest --title Pseudociencia  # actual pseudo
```

Comprobar `cache/snapshots/{oldid}.meta.json` → `fetched_at`.

### Viaje snapshot actual (2026-06-19)

Registrar en `cache/viajes/2026-06-19-snapshot-actual.json`:

```json
{
  "viaje_id": "2026-06-19-snapshot-actual",
  "anchors": ["demarcacion:12763920→latest", "pseudociencia:12910974→latest"],
  "fetched": ["<oldids>"],
  "delta_status": "pending",
  "offline_ready": true
}
```

Tras curar: actualizar `delta_status` y rellenar `snapshots/delta-sc-actual.md` (y espejo en `pseudociencia/`).

### 3. Diff mental (sin obligar a guardar diff completo)

- Registro actual `rNNNN` vs anterior `rNNNN+1` (lista va de nuevo → viejo)
- Leer `byte_delta`, `section`, `summary` en `registro.md`
- Si hace falta diff WP: usar `urls.diff_prev` del manifest

### 4. Curar delta.md

Rellenar en `registros/{slug}/delta.md`:

- Qué entra/sale en la disputa ontología/gnoseología
- Si es ampliación SolveCoagula vs intervención ajena (Ctrl Z, fusión…)
- Enlaces `[[véase también]]` que abren el **siguiente** viaje
- Lectura **línea de demarcación**: ¿clasifica como ciencia normal, pseudociencia, bloque rival?

### 5. Registrar viaje

Crear `cache/viajes/{fecha}-{registro_id}.json`:

```json
{
  "viaje_id": "2026-06-18-r0677",
  "registro_id": "r0677",
  "oldid": 11951034,
  "fetched": ["11951034"],
  "next_links": ["Falsacionismo", "Thomas Kuhn"],
  "delta_status": "draft",
  "offline_ready": false
}
```

`offline_ready: true` cuando todos los `next_links` estén en `cache/`.

## Hipótesis de trabajo (proyecto Aleph)

- La demarcación **zafa** del problema «no hay UNA ciencia» (logs-aleph s02): en lugar
  de unificar diamat/positivismo, se **cartografía** la línea y sus bifurcaciones.
- SolveCoagula aporta **pack ontológico de partida** (secciones del artículo).
- El navegador **hiperinfla** la espina dorsal → corpus Wikipedia en continua
  revisión/degradación, pero **clasificable** por criterio de demarcación.
- Pregunta abierta: ¿emerge una línea «occidental» de federación de un bloque ajeno
  al diamat? → buscar en deltas de fusión (r0664 Ctrl Z), traducción inicial (r0677),
  y secciones Feyerabend/Kuhn/positivismo.

## Comandos útiles

```bash
# Regenerar mapa enciclopedista (linea2)
python3 scripts/fetch_user_contribs.py --user SolveCoagula
python3 segment_linea2.py

# Un registro extra
python3 segment_linea.py --registro r0026

# Todos (pesado)
python3 segment_linea.py --expand all

# Verificar manifest
python3 -c "import json; m=json.load(open('manifest.json')); print(len(m['registros']))"
```

## ¿Qué endpoint?

Política completa: [`linea-aleph/CACHE_RUNBOOK.md`](../../linea-aleph/CACHE_RUNBOOK.md).

Si el dato **NO** está en `cache/snapshots/{oldid}.wikitext` (artículo) o `cache/talk/snapshots/{oldid}.wikitext` (talk):

1. ¿`oldid` conocido en manifest? → `fetch_snapshot.py` (API `query` + `revisions` + `content`); talk: `--corpus talk --title "Discusión:…"` o `"Usuario discusión:…"`
2. ¿Historial talk sin cuerpos masivos aún? → `fetch_talk_history.py --all-anchors` (meta oct–nov 2007 → `talk/{vista}/raw/linea.md` + `manifest.json`; ver `CACHE_RUNBOOK.md` corpus talk)
3. ¿>200 oldids del mismo título? → plan **dumps** (`ingest_dump_revisions.py`), **NO** API masiva
4. ¿Solo bytes / autor / parent? → API meta (`fetch_revision_meta` en `mw_client.py`, sin `rvprop=content`)
5. ¿Diff entre dos revisiones A↔B? → `fetch_compare.py` (`action=compare`)
6. **NUNCA** pedir scrape de `/wiki/`, `index.php` como fetch, ni `Special:Export` masivo

`index.php?oldid=` solo en `*.meta.json` → `source_url` (cita humana).

## Qué no hacer

- No reescribir `raw/linea.md`
- No volcar 677 artículos completos al repo sin pedido explícito
- No sustituir wikitext por paráfrasis markdown del artículo entero
- No saltar `delta.md`: el índice narrativo vive en los deltas curados
- **No scrapear el frontend** (`es.wikipedia.org/wiki/...`, HTML, browser automation para volcados)
- No usar `index.php` ni `/wiki/` como URL de ingestión — solo `w/api.php` o dumps

## Modos de lectura

- **Disfraz rude bot (index-reader):** [`disfraz-rude-bot`](../disfraz-rude-bot/SKILL.md) — rol forense, traje ON por defecto.
- **Modo Aleph:** [`modo-aleph`](../modo-aleph/SKILL.md) — tablero; quitar traje antes.

## Archivos clave

- `linea-aleph/segment_linea.py` — segmentador linea1
- `linea-aleph/segment_linea2.py` — segmentador linea2 + manifest2
- `linea-aleph/scripts/fetch_user_contribs.py` — harvest API usercontribs
- `linea-aleph/scripts/fetch_article_history.py` — harvest API historial artículo
- `linea-aleph/scripts/fetch_talk_history.py` — harvest API historial talk (4 vistas NS1/NS3)
- `linea-aleph/scripts/fetch_snapshot.py` — fetch API MediaWiki (`--corpus article|talk`)
- `linea-aleph/scripts/cache_paths.py` — rutas `cache/snapshots` vs `cache/talk/snapshots`
- `linea-aleph/scripts/mw_client.py` — cliente API compartido
- `linea-aleph/scripts/fetch_compare.py` — diff API entre revisiones
- `linea-aleph/CACHE_RUNBOOK.md` — política caché, rate limits, runbook viajes
- `linea-aleph/pseudociencia/` — sub-corpus segunda línea gruesa
- `linea-aleph/talk/` — sub-corpus discusión (4 vistas NS1/NS3; espejo de `pseudociencia/`)
- `logs-aleph/sesion-02-demarcacion-gaia/06-linea-demarcacion-abc-aleph/` — marco Aleph

## Modos de lectura

- **Disfraz rude bot (index-reader):** [`disfraz-rude-bot`](../disfraz-rude-bot/SKILL.md) — rol forense, traje ON por defecto.
- **Modo Aleph:** [`modo-aleph`](../modo-aleph/SKILL.md) — tablero; quitar traje antes.
