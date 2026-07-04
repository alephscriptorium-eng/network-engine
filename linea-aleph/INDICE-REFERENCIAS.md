# INDICE-REFERENCIAS — Grafo bibliográfico demarcación (12763920)

Índice humano del viaje `referencias-demarcacion`. Datos verificados 2026-06-22 desde `cache/snapshots/12763920.wikitext`.

## Ancla

| Campo | Valor |
|-------|-------|
| Artículo | [Problema de la demarcación](https://es.wikipedia.org/wiki/Problema_de_la_demarcación) |
| Cierre SC | [oldid 12763920](https://es.wikipedia.org/w/index.php?title=Problema_de_la_demarcación&oldid=12763920) (12 nov 2007) |
| Bytes | ~173 KB |
| Índice máquina | [`cache/viajes/refs-12763920-index.json`](cache/viajes/refs-12763920-index.json) |
| Clusters | [`cache/viajes/refs-12763920-clusters.json`](cache/viajes/refs-12763920-clusters.json) |
| Viaje | [`cache/viajes/2026-referencias-dem.json`](cache/viajes/2026-referencias-dem.json) |

## Conteos verificados (Fase 1)

| Métrica | Conteo | Notas |
|---------|--------|-------|
| Etiquetas `<ref>` | **259** | grep sobre wikitext local |
| Destinos únicos (todos los tipos) | **832** | dedupe por `target` |
| Enlaces internos NS0 únicos | **774** | artículos enciclopedia |
| Entradas tipadas (target×tipo×sección) | **1118** | granularidad sección |
| Wikilinks internos | 854 | incluye repeticiones por sección |
| URLs externas | 137 | en `<ref>` y prosa |
| `{{cita}}` / biblio | 48 | plantillas cite |

La cifra del constructor (**200+**) queda **confirmada**: 259 `<ref>` y 832 destinos únicos superan el umbral.

## Clusters temáticos (Fase 2)

| Cluster | Entradas | Ejemplos |
|---------|----------|----------|
| otros | 886 | términos generales, años, conceptos sin keyword |
| autoridad_cientifica | 69 | Josephson, Guth, Linde, Nobel, CERN |
| filosofia | 68 | Popper, Kuhn, Feyerabend, falsacionismo |
| satelites_internos | 44 | Pseudociencia, cuerdas, método científico |
| paranormal_matrix | 30 | Matrix, Bostrom, Alcock, simulación |
| cultura_media | 21 | NYT, TVE, revistas |

Top NS0 por frecuencia: ciencia (8), Karl Popper (8), falsacionismo (7), pseudociencia (6).

## Oleadas (Fase 3)

| Wave | Artefacto | Estado |
|------|-----------|--------|
| **A** — top 30 NS0 | [`cache/viajes/refs-wave-a-internal.json`](cache/viajes/refs-wave-a-internal.json) + `cache/snapshots/*.wikitext` | ✅ 30/30 (reanudado 2026-06-22, `--sleep 1.5`) |
| **B** — refs externas | [`cache/viajes/refs-wave-b-external.json`](cache/viajes/refs-wave-b-external.json) | ⚠️ parcial — 81/134 meta ok; ~10 % body sample |
| **C** — diff grafo | [`cache/viajes/refs-wave-c-diff.json`](cache/viajes/refs-wave-c-diff.json) | ✅ |
| **D** — talk×refs | [`cache/viajes/refs-wave-d-talk-cross.json`](cache/viajes/refs-wave-d-talk-cross.json) | ✅ vacío explícito (0 hits) |

### Wave C — evolución del grafo

| Revisión | Enlaces únicos | Evento |
|----------|----------------|--------|
| 11951034 | 78 | Volcado inicial oct 2007 |
| 12763920 | 760 | Cierre SC nov 2007 |
| 166864369 | 205 | Actual ~2025 |

**11951034 → 12763920:** +696 enlaces, −14 (expansión masiva SC).  
**12763920 → 166864369:** poda neta (−555 enlaces únicos): comunidad conservó núcleo filosófico, eliminó clusters paranormal/Matrix.

### Wave B — refs externas (meta)

134 URLs únicas en `<ref>` (external + biblio con URL). Script: `fetch_refs_wave_b.py`.

| Métrica | Valor |
|---------|-------|
| Meta ok | **81/134** (60 %) |
| Meta fallida | 53 (404, DNS muerto, 403, SSL, timeout) |
| Body sample (~10 %) | 13 intentos; 5 con snippet útil |

Fallos esperables en bibliografía 2007 (dominios caídos, paywalls, redirects rotos). No reintentar masivo.

### Wave D — cruce talk oct

`participant-register.json` × índice NS0: **0 coincidencias** de títulos citados en citas verificables de Pabloallo/Fernando Estel. El talk oct critica «conclusiones» sin citar bibliografía del artículo — coherente con desacople roca/engranaje (block-2).

## Scripts

```bash
cd network-engine/linea-aleph
python scripts/extract_wikilinks.py --oldid 12763920 \
  --output cache/viajes/refs-12763920-index.json \
  --clusters-output cache/viajes/refs-12763920-clusters.json \
  --viaje-output cache/viajes/2026-referencias-dem.json
python scripts/fetch_compare.py --chain 11951034 12763920 166864369
python scripts/fetch_compare.py --talk-cross
# Wave A — top 30 NS0 (latest revision per title)
python scripts/fetch_snapshot.py --latest --title "Karl Popper" --sleep 1.5
# Wave B — external refs meta + ~10% body sample
python scripts/fetch_refs_wave_b.py --sleep 1.0
```

## Preguntas abiertas

1. ¿Qué refs de cluster `paranormal_matrix` solo existen en 12763920 y no en 166864369? → analizar `refs-wave-c-diff.json` `removed_sample`.
2. ¿Cuáles destinos top-30 tienen `in_linea2`? → cruzar con `manifest2.json` (pendiente script).
3. Wave B: 55 URLs sin meta (404, DNS muerto, 403, SSL) — esperable en refs 2007; no reintentar masivo.

---

*Generado: cierre SEC 2026-06-22. Ver [`CACHE_RUNBOOK.md`](CACHE_RUNBOOK.md) § Viaje referencias-demarcacion.*
