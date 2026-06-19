---
name: linea-aleph-browser
description: >-
  Navega la línea de demarcación (linea-aleph): expande deltas del historial WP
  SolveCoagula, cachea revisiones wikitext y viajes hipervinculados hacia offline.
  Usar al trabajar con linea-aleph/raw/linea.md, linea-aleph/, criterio de
  demarcación, caché
  aleph, ontology-seeds, o viajes Wikipedia desde registros.
---

# linea-aleph — agente navegador-caché

## Propósito

La **línea de demarcación** no es «una ciencia» única: es una **espina dorsal**
de revisiones enlazadas. Este skill guía al agente para:

1. Leer `linea-aleph/manifest.json` y `INDICE.md`
2. Elegir el siguiente **viaje** (registro milestone o sección en `ontology-seeds.json`)
3. **Cachear** revisiones (`fetch_snapshot.py`) y artículos enlazados
4. **Curar** `delta.md` con interpretación ontología/gnoseología
5. Ir volviendo el corpus **más offline** en viajes sucesivos

Relación con `logs-aleph`: sesión 02 (diamat, demarcación ABC, Gaia) es el marco
conversacional; `linea-aleph` es el **cuerpo histórico** (Wikipedia 2007, SolveCoagula).

## Antes de empezar

```bash
cd linea-aleph
python3 segment_linea.py              # regenerar manifest + índice
python3 segment_linea.py --expand milestones
```

Leer:

- `raw/linea.md` — fuente canónica del historial WP (export SolveCoagula)
- `INDICE.md` — tesis, extremos inicial/final, hitos
- `manifest.json` — 677 registros con oldid, delta bytes, sección
- `ontology-seeds.json` — pack de secciones para expandir
- `snapshots/inicial/meta.json` y `snapshots/final/meta.json`

## Formatos (no bulk markdown)

| Qué | Dónde | Formato |
|-----|-------|---------|
| Índice narrativo | `INDICE.md` | Markdown (humano) |
| Delta interpretado | `registros/*/delta.md` | Markdown (curado) |
| Metadatos de registro | `registros/*/registro.md` | Markdown + YAML |
| **Cuerpo de artículo WP** | `cache/snapshots/{oldid}.wikitext` | Wikitext (verdad) |
| Metadatos de fetch | `cache/snapshots/{oldid}.meta.json` | JSON |
| Viaje (grafo de enlaces) | `cache/viajes/{viaje-id}.json` | JSON |

**No** materializar los 677 snapshots en markdown. Solo milestones + fetch bajo demanda.

## Flujo de un viaje

### 1. Elegir ancla

Prioridad sugerida:

1. `snapshots/inicial` si `fetched: false`
2. Milestone con `delta_status: pending` en manifest
3. Sección alta frecuencia en `ontology-seeds.json`
4. Enlace saliente del wikitext ya cacheado (`[[...]]`)

### 2. Fetch revisión

```bash
python3 scripts/fetch_snapshot.py --oldid 11951034   # inicial
python3 scripts/fetch_snapshot.py --oldid 12370021   # final
```

Comprobar `cache/snapshots/{oldid}.meta.json` → `fetched_at`.

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
# Un registro extra
python3 segment_linea.py --registro r0026

# Todos (pesado)
python3 segment_linea.py --expand all

# Verificar manifest
python3 -c "import json; m=json.load(open('manifest.json')); print(len(m['registros']))"
```

## Qué no hacer

- No reescribir `raw/linea.md`
- No volcar 677 artículos completos al repo sin pedido explícito
- No sustituir wikitext por paráfrasis markdown del artículo entero
- No saltar `delta.md`: el índice narrativo vive en los deltas curados

## Archivos clave

- `linea-aleph/segment_linea.py` — segmentador
- `linea-aleph/scripts/fetch_snapshot.py` — fetch API MediaWiki
- `logs-aleph/sesion-02-demarcacion-gaia/06-linea-demarcacion-abc-aleph/` — marco Aleph
