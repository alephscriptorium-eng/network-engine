# INDICE — linea-aleph

## Tesis del corpus

Este corpus no es «una ciencia» monolítica: es la **línea de demarcación** como
espina dorsal hipervinculada — un historial de ediciones de
[Discusión:Problema de la demarcación](https://es.wikipedia.org/wiki/Discusión:Problema_de_la_demarcación)
donde **SolveCoagula** inyecta ontología de partida (secciones, véase también,
falsacionismo, Kuhn, Feyerabend…). El agente navegador-caché expande desde cada
**delta** hacia artículos enlazados; los viajes sucesivos deben volverse más offline.

Relacionado: [`logs-aleph`](../logs-aleph/INDICE.md) (sesión demarcación / Gaia / diamat).

**Segunda línea gruesa:** [`pseudociencia/INDICE.md`](pseudociencia/INDICE.md) —
historial artículo *Pseudociencia* (ventana SolveCoagula).

## Preamble (linea.md)

# Discusión:Problema de la demarcación — historial talk (es.wikipedia)
# generado: 2026-06-22T07:47:37Z · registros en ventana 2007-10-01 – 2007-10-31: 3
Página: [Discusión:Problema de la demarcación](https://es.wikipedia.org/wiki/Discusión:Problema_de_la_demarcación)
Namespace: **1** · corpus: **talk**
Artículo enlazado: [Problema de la demarcación](https://es.wikipedia.org/wiki/Problema de la demarcación)

## Extremos de la línea

| Rol | Registro | oldid | Fecha (WP) | Carpeta |
|-----|----------|-------|------------|---------|
| **Previo** (antes de SolveCoagula) | — | 0 | 28 sep 2007 | [snapshots/previo](snapshots/previo/) |
| **Inicial** (traducción / arranque) | `r0003` | 12051164 | 11:13 14 oct 2007 | [snapshots/inicial](snapshots/inicial/) |
| **Final** (más reciente en linea.md) | `r0001` | 12057983 | 17:30 14 oct 2007 | [snapshots/final](snapshots/final/) |
| **SC cierre** (última edit SolveCoagula, linea2) | — | 12057983 | 17:30 14 oct 2007 | [snapshots/sc_cierre](snapshots/sc_cierre/) |
| **Actual** (Wikipedia hoy) | — | — | — | [snapshots/actual](snapshots/actual/) |

Delta extremo: [`snapshots/delta-extremo.md`](snapshots/delta-extremo.md) (previo → final). Delta SC→hoy: [`snapshots/delta-sc-actual.md`](snapshots/delta-sc-actual.md). Entre inicial y final: **3** registros en [`manifest.json`](manifest.json).
## ¿Markdown para snapshots intermedios?

**No como cuerpo del artículo.** Recomendación:

| Capa | Formato | Quién lo llena |
|------|---------|----------------|
| Índice, deltas curados | `.md` | humano + agente |
| Metadatos de registro | `.md` + `manifest.json` | `segment_linea.py` |
| Snapshot de revisión WP | `.wikitext` + `.meta.json` en `cache/` | `fetch_snapshot.py` / agente |
| Viajes hipervinculados | `cache/viajes/*.json` | skill navegador-caché |

Materializar todos los snapshots completos sería bulk innecesario: usar milestones
(0 marcados) + fetch bajo demanda.

## Hitos (milestones)

| ID | Δ bytes | Usuario | Sección / resumen |
|----|---------|---------|-------------------|

## Ontología por sección (frecuencia en historial)

Pack de partida para expandir caché (véase `ontology-seeds.json`):

| Sección | Ediciones |
|---------|-----------|

## Estructura

```
linea-aleph/
├── raw/linea.md
├── segment_linea.py
├── manifest.json
├── INDICE.md
├── ontology-seeds.json
├── snapshots/previo|inicial|final|sc_cierre|actual/
├── snapshots/delta-extremo.md
├── snapshots/delta-sc-actual.md
├── registros/          # milestones por defecto
└── ../cache/           # wikitext compartido (agente)
```

## Comandos

```bash
python3 segment_linea.py --corpus-dir . --expand milestones
python3 scripts/fetch_snapshot.py --oldid <oldid> --title Discusión:Problema de la demarcación
python3 scripts/fetch_snapshot.py --latest --title "Discusión:Problema de la demarcación"
```

## Curación de deltas

Cada `registros/*/delta.md` explica el **delta interpretado** respecto al
registro anterior (más reciente en el tiempo → `r0001` es el más nuevo).
El índice narrativo lo escribimos nosotros; el script solo deja el esqueleto.
