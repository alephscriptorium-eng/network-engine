# INDICE — linea-aleph

## Tesis del corpus

Este corpus no es «una ciencia» monolítica: es la **línea de demarcación** como
espina dorsal hipervinculada — un historial de ediciones de
[Usuario discusión:SolveCoagula](https://es.wikipedia.org/wiki/Usuario_discusión:SolveCoagula)
donde **SolveCoagula** inyecta ontología de partida (secciones, véase también,
falsacionismo, Kuhn, Feyerabend…). El agente navegador-caché expande desde cada
**delta** hacia artículos enlazados; los viajes sucesivos deben volverse más offline.

Relacionado: [`logs-aleph`](../logs-aleph/INDICE.md) (sesión demarcación / Gaia / diamat).

**Segunda línea gruesa:** [`pseudociencia/INDICE.md`](pseudociencia/INDICE.md) —
historial artículo *Pseudociencia* (ventana SolveCoagula).

## Preamble (linea.md)

# Usuario discusión:SolveCoagula — historial talk (es.wikipedia)
# generado: 2026-06-21T00:44:10Z · registros en ventana oct–nov 2007: 34
Página: [Usuario discusión:SolveCoagula](https://es.wikipedia.org/wiki/Usuario_discusión:SolveCoagula)
Namespace: **3** · corpus: **talk**

## Extremos de la línea

| Rol | Registro | oldid | Fecha (WP) | Carpeta |
|-----|----------|-------|------------|---------|
| **Previo** (antes de SolveCoagula) | — | 0 | 28 sep 2007 | [snapshots/previo](snapshots/previo/) |
| **Inicial** (traducción / arranque) | `r0034` | 11958157 | 14:34 10 oct 2007 | [snapshots/inicial](snapshots/inicial/) |
| **Final** (más reciente en linea.md) | `r0001` | 12912735 | 20:52 18 nov 2007 | [snapshots/final](snapshots/final/) |
| **SC cierre** (última edit SolveCoagula, linea2) | — | 12912735 | 20:52 18 nov 2007 | [snapshots/sc_cierre](snapshots/sc_cierre/) |
| **Actual** (Wikipedia hoy) | — | — | — | [snapshots/actual](snapshots/actual/) |

Delta extremo: [`snapshots/delta-extremo.md`](snapshots/delta-extremo.md) (previo → final). Delta SC→hoy: [`snapshots/delta-sc-actual.md`](snapshots/delta-sc-actual.md). Entre inicial y final: **34** registros en [`manifest.json`](manifest.json).
## ¿Markdown para snapshots intermedios?

**No como cuerpo del artículo.** Recomendación:

| Capa | Formato | Quién lo llena |
|------|---------|----------------|
| Índice, deltas curados | `.md` | humano + agente |
| Metadatos de registro | `.md` + `manifest.json` | `segment_linea.py` |
| Snapshot de revisión WP | `.wikitext` + `.meta.json` en `cache/` | `fetch_snapshot.py` / agente |
| Viajes hipervinculados | `cache/viajes/*.json` | skill navegador-caché |

Materializar todos los snapshots completos sería bulk innecesario: usar milestones
(17 marcados) + fetch bajo demanda.

## Hitos (milestones)

| ID | Δ bytes | Usuario | Sección / resumen |
|----|---------|---------|-------------------|
| [r0003](registros/r0003-oldid-12911274-bloqueo/registro.md) | +798 | SolveCoagula | Bloqueo |
| [r0005](registros/r0005-oldid-12792536-bloqueo/registro.md) | +502 | SolveCoagula | Bloqueo |
| [r0012](registros/r0012-oldid-12783855/registro.md) | +2496 | SolveCoagula | — |
| [r0013](registros/r0013-oldid-12765952-hola-solvecoagula/registro.md) | +536 | SolveCoagula | Hola, SolveCoagula |
| [r0014](registros/r0014-oldid-12765399-guerra-de-ediciones/registro.md) | +1791 | SolveCoagula | Guerra de ediciones |
| [r0015](registros/r0015-oldid-12764925-hola-solvecoagula/registro.md) | +595 | SolveCoagula | Hola, SolveCoagula |
| [r0017](registros/r0017-oldid-12756249-guerra-de-ediciones/registro.md) | +2511 | SolveCoagula | Guerra de ediciones |
| [r0018](registros/r0018-oldid-12756192/registro.md) | +1343 | SolveCoagula | Nueva sección: /* Largos */ |
| [r0022](registros/r0022-oldid-12737478-guerra-de-ediciones/registro.md) | +916 | SolveCoagula | Guerra de ediciones |
| [r0023](registros/r0023-oldid-12736728-guerra-de-ediciones/registro.md) | +539 | SolveCoagula | Guerra de ediciones |
| [r0027](registros/r0027-oldid-12719917/registro.md) | +611 | SolveCoagula | Nueva sección: /* Pseudociencia */ |
| [r0028](registros/r0028-oldid-12474528-respuesta-en-pseudociencia/registro.md) | +1214 | SolveCoagula | respuesta en pseudociencia |
| [r0029](registros/r0029-oldid-12473072/registro.md) | +1712 | SolveCoagula | Nueva sección: /* respuesta en pseudociencia */ |
| [r0030](registros/r0030-oldid-12274469/registro.md) | +831 | SolveCoagula | Nueva sección: /* Bertrand Russell: Filosofía de l |
| [r0031](registros/r0031-oldid-12098449/registro.md) | +1327 | SolveCoagula | Nueva sección: /* psicoanálisis */ |
| [r0033](registros/r0033-oldid-12052572/registro.md) | +652 | SolveCoagula | Nueva sección: /* Criterio de demarcación */ |
| [r0034](registros/r0034-oldid-11958157/registro.md) | +0 | SolveCoagula | Página nueva: {{subst:Bienvenido usuario}} ~~~~    |

## Ontología por sección (frecuencia en historial)

Pack de partida para expandir caché (véase `ontology-seeds.json`):

| Sección | Ediciones |
|---------|-----------|
| Bloqueo | 6 |
| Guerra de ediciones | 5 |
| Reversiones | 2 |
| Hola, SolveCoagula | 2 |
| Criterio de demarcación | 2 |
| Pseudociencia | 2 |
| Destacado | 1 |
| respuesta en pseudociencia | 1 |

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
python3 scripts/fetch_snapshot.py --oldid <oldid> --title Usuario discusión:SolveCoagula
python3 scripts/fetch_snapshot.py --latest --title "Usuario discusión:SolveCoagula"
```

## Curación de deltas

Cada `registros/*/delta.md` explica el **delta interpretado** respecto al
registro anterior (más reciente en el tiempo → `r0001` es el más nuevo).
El índice narrativo lo escribimos nosotros; el script solo deja el esqueleto.
