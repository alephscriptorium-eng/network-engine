# INDICE — linea-aleph

## Tesis del corpus

Este corpus no es «una ciencia» monolítica: es la **línea de demarcación** como
espina dorsal hipervinculada — un historial de ediciones de
[Usuario discusión:Pabloallo](https://es.wikipedia.org/wiki/Usuario_discusión:Pabloallo)
donde **SolveCoagula** inyecta ontología de partida (secciones, véase también,
falsacionismo, Kuhn, Feyerabend…). El agente navegador-caché expande desde cada
**delta** hacia artículos enlazados; los viajes sucesivos deben volverse más offline.

Relacionado: [`logs-aleph`](../logs-aleph/INDICE.md) (sesión demarcación / Gaia / diamat).

**Segunda línea gruesa:** [`pseudociencia/INDICE.md`](pseudociencia/INDICE.md) —
historial artículo *Pseudociencia* (ventana SolveCoagula).

## Preamble (linea.md)

# Usuario discusión:Pabloallo — historial talk (es.wikipedia)
# generado: 2026-06-22T07:47:37Z · registros en ventana 2007-10-01 – 2007-10-31: 20
Página: [Usuario discusión:Pabloallo](https://es.wikipedia.org/wiki/Usuario_discusión:Pabloallo)
Namespace: **3** · corpus: **talk**

## Extremos de la línea

| Rol | Registro | oldid | Fecha (WP) | Carpeta |
|-----|----------|-------|------------|---------|
| **Previo** (antes de SolveCoagula) | — | 11420206 | 28 sep 2007 | [snapshots/previo](snapshots/previo/) |
| **Inicial** (traducción / arranque) | `r0020` | 12060099 | 18:54 14 oct 2007 | [snapshots/inicial](snapshots/inicial/) |
| **Final** (más reciente en linea.md) | `r0001` | 12346968 | 08:31 26 oct 2007 | [snapshots/final](snapshots/final/) |
| **SC cierre** (última edit SolveCoagula, linea2) | — | 12346968 | 08:31 26 oct 2007 | [snapshots/sc_cierre](snapshots/sc_cierre/) |
| **Actual** (Wikipedia hoy) | — | — | — | [snapshots/actual](snapshots/actual/) |

Delta extremo: [`snapshots/delta-extremo.md`](snapshots/delta-extremo.md) (previo → final). Delta SC→hoy: [`snapshots/delta-sc-actual.md`](snapshots/delta-sc-actual.md). Entre inicial y final: **20** registros en [`manifest.json`](manifest.json).
## ¿Markdown para snapshots intermedios?

**No como cuerpo del artículo.** Recomendación:

| Capa | Formato | Quién lo llena |
|------|---------|----------------|
| Índice, deltas curados | `.md` | humano + agente |
| Metadatos de registro | `.md` + `manifest.json` | `segment_linea.py` |
| Snapshot de revisión WP | `.wikitext` + `.meta.json` en `cache/` | `fetch_snapshot.py` / agente |
| Viajes hipervinculados | `cache/viajes/*.json` | skill navegador-caché |

Materializar todos los snapshots completos sería bulk innecesario: usar milestones
(11 marcados) + fetch bajo demanda.

## Hitos (milestones)

| ID | Δ bytes | Usuario | Sección / resumen |
|----|---------|---------|-------------------|
| [r0002](registros/r0002-oldid-12239634-ps/registro.md) | +185 | Veremos | P.S. |
| [r0003](registros/r0003-oldid-12227467-ps/registro.md) | +118 | Veremos | P.S. |
| [r0004](registros/r0004-oldid-12185855-discusion/registro.md) | +328 | Veremos | Discusion |
| [r0005](registros/r0005-oldid-12185803-clasificando-a-terceros-por-la/registro.md) | +242 | Veremos | Clasificando a terceros por la descendencia |
| [r0006](registros/r0006-oldid-12119915-clasificando-a-terceros-por-la/registro.md) | +209 | Veremos | Clasificando a terceros por la descendencia |
| [r0008](registros/r0008-oldid-12119884-categoria-escritores-judios/registro.md) | +2457 | Veremos | Categoría "escritores judíos" |
| [r0009](registros/r0009-oldid-12101208-categoria-escritores-judios/registro.md) | +1277 | Ferbr1 | Categoría "escritores judíos" |
| [r0010](registros/r0010-oldid-12100295-categoria-escritores-judios/registro.md) | +857 | Ferbr1 | Categoría "escritores judíos" |
| [r0011](registros/r0011-oldid-12100160-categoria-escritores-judios/registro.md) | +1843 | Ferbr1 | Categoría "escritores judíos" |
| [r0013](registros/r0013-oldid-12097714/registro.md) | +449 | Ferbr1 | Nueva sección: /* Categoría "escritores judíos" */ |
| [r0018](registros/r0018-oldid-12069568-criterio-de-demarcacion/registro.md) | +882 | SolveCoagula | Criterio de demarcación |

## Ontología por sección (frecuencia en historial)

Pack de partida para expandir caché (véase `ontology-seeds.json`):

| Sección | Ediciones |
|---------|-----------|
| Criterio de demarcación | 7 |
| Categoría "escritores judíos" | 4 |
| Clasificando a terceros por la descendencia | 3 |
| P.S. | 2 |
| Discusion | 1 |
| WP:PBF | 1 |

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
python3 scripts/fetch_snapshot.py --oldid <oldid> --title Usuario discusión:Pabloallo
python3 scripts/fetch_snapshot.py --latest --title "Usuario discusión:Pabloallo"
```

## Curación de deltas

Cada `registros/*/delta.md` explica el **delta interpretado** respecto al
registro anterior (más reciente en el tiempo → `r0001` es el más nuevo).
El índice narrativo lo escribimos nosotros; el script solo deja el esqueleto.
