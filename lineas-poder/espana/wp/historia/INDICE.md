# INDICE — linea-wp-historia

## Tesis del corpus

Satélite Wikipedia L0 de la línea [`espana`](../../INDICE.md): historial de ediciones de
[Historia de España](https://es.wikipedia.org/wiki/Historia_de_España) para anclar
semillas y buffers MCS en nodos P01–P24 (evidencia L0 / oldid).

Relacionado: tronco Villacañas [`../../nodos.yaml`](../../nodos.yaml) ·
[`../../manifest.json`](../../manifest.json) · [`nodo-sections.json`](nodo-sections.json) ·
[`README.md`](README.md).

## Puente nodo ↔ registros

Para cada nodo P01–P24, [`nodo-sections.json`](nodo-sections.json) lista secciones WP cuyas
ediciones alimentan el Plato B del Tablero (`linea://registros/year/{año}`). Distinto de
`linea://oldid/{year}`, que resuelve por **año calendario de edición** (2001–2026).

Validación: `python3 scripts/build_nodo_registros_index.py` desde `lineas-poder/`.

## Preamble (linea.md)

# Historia de España — historial artículo (es.wikipedia)
# generado: 2026-07-04T21:16:34Z · registros: 3564
Artículo: [Historia de España](https://es.wikipedia.org/wiki/Historia_de_España)
Ventana: historial completo vía API (v0 bootstrap lineas-poder/espana).

## Extremos de la línea

| Rol | Registro | oldid | Fecha (WP) | Carpeta |
|-----|----------|-------|------------|---------|
| **Previo** (antes de SolveCoagula) | — | 0 | 28 sep 2007 | [snapshots/previo](snapshots/previo/) |
| **Inicial** (traducción / arranque) | `r3564` | 2010 | 15:29 18 dic 2001 | [snapshots/inicial](snapshots/inicial/) |
| **Final** (más reciente en linea.md) | `r0001` | 174095416 | 20:30 24 jun 2026 | [snapshots/final](snapshots/final/) |
| **SC cierre** (última edit SolveCoagula, linea2) | — | 174095416 | 20:30 24 jun 2026 | [snapshots/sc_cierre](snapshots/sc_cierre/) |
| **Actual** (Wikipedia hoy) | — | — | — | [snapshots/actual](snapshots/actual/) |

Delta extremo: [`snapshots/delta-extremo.md`](snapshots/delta-extremo.md) (previo → final). Delta SC→hoy: [`snapshots/delta-sc-actual.md`](snapshots/delta-sc-actual.md). Entre inicial y final: **3564** registros en [`manifest.json`](manifest.json).
## ¿Markdown para snapshots intermedios?

**No como cuerpo del artículo.** Recomendación:

| Capa | Formato | Quién lo llena |
|------|---------|----------------|
| Índice, deltas curados | `.md` | humano + agente |
| Metadatos de registro | `.md` + `manifest.json` | `segment_linea.py` |
| Snapshot de revisión WP | `.wikitext` + `.meta.json` en `cache/` | `fetch_snapshot.py` / agente |
| Viajes hipervinculados | `cache/viajes/*.json` | skill navegador-caché |

Materializar todos los snapshots completos sería bulk innecesario: usar milestones
(950 marcados) + fetch bajo demanda.

## Hitos (milestones)

| ID | Δ bytes | Usuario | Sección / resumen |
|----|---------|---------|-------------------|
| [r0001](registros/r0001-oldid-174095416/registro.md) | +1172 | Margo92 | Recuperado sentido de un párrafo mediante búsqueda |
| [r0003](registros/r0003-oldid-174089071-imperio-espanol/registro.md) | +123 | ~2026-36564-02 | Imperio español |
| [r0008](registros/r0008-oldid-173445512/registro.md) | +2727 | Automoderador | — |
| [r0009](registros/r0009-oldid-173445511/registro.md) | -2604 | ~2026-29011-26 | (sin resumen |
| [r0010](registros/r0010-oldid-173445467-era-musulmana/registro.md) | -123 | ~2026-29011-26 | Era musulmana |
| [r0027](registros/r0027-oldid-172185186-iabot/registro.md) | +149 | InternetArchiveBot | IABot |
| [r0029](registros/r0029-oldid-172034355/registro.md) | +1372 | Margo92 | + referencias; ortografía |
| [r0032](registros/r0032-oldid-171946180-historia-reciente-1982-present/registro.md) | +204 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0034](registros/r0034-oldid-171637798-historia-reciente-1982-present/registro.md) | +152 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0038](registros/r0038-oldid-171313483-historia-reciente-1982-present/registro.md) | +134 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0041](registros/r0041-oldid-171313240-reinados-de-juan-carlos-i-y-de/registro.md) | +158 | Campeones_2008 | Reinados de Juan Carlos I y de Felipe VI |
| [r0042](registros/r0042-oldid-171313084-reinados-de-juan-carlos-i-y-de/registro.md) | +361 | Campeones_2008 | Reinados de Juan Carlos I y de Felipe VI |
| [r0051](registros/r0051-oldid-170626093-reinados-de-juan-carlos-i-y-de/registro.md) | -293 | Campeones_2008 | Reinados de Juan Carlos I y de Felipe VI |
| [r0052](registros/r0052-oldid-170595759/registro.md) | -135 | Varondán | Deshecha la [[Especial:Diff/170595732/edición 1705 |
| [r0053](registros/r0053-oldid-170595732/registro.md) | +135 | Eladio2020 | Detalles sobre la historia de españa |
| [r0057](registros/r0057-oldid-170506565-historia-reciente-1982-present/registro.md) | -486 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0059](registros/r0059-oldid-170506279-historia-reciente-1982-present/registro.md) | +156 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0072](registros/r0072-oldid-170035463-historia-reciente-1982-present/registro.md) | +137 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0075](registros/r0075-oldid-170035366-historia-reciente-1982-present/registro.md) | +125 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0080](registros/r0080-oldid-169551501/registro.md) | +356 | PedroAcero76 | Rv a la versión estable: sucesión de vandalismos. |
| [r0094](registros/r0094-oldid-169536172/registro.md) | -6913 | 5ergiu1211 | Revertidas 2 ediciones de [[Special:Contributions/ |
| [r0095](registros/r0095-oldid-169536163-introduccion/registro.md) | +3456 | 195.235.194.132 | Introducción |
| [r0096](registros/r0096-oldid-169536158-introduccion/registro.md) | +3457 | 195.235.194.132 | Introducción |
| [r0097](registros/r0097-oldid-169536152/registro.md) | -3456 | SeroBOT | Revertidas 2 ediciones de [[Special:Contributions/ |
| [r0099](registros/r0099-oldid-169536144-introduccion/registro.md) | +3456 | 195.235.194.132 | Introducción |
| [r0100](registros/r0100-oldid-169536129/registro.md) | -3659 | 5ergiu1211 | Revertidas 6 ediciones de [[Special:Contributions/ |
| [r0101](registros/r0101-oldid-169536126-quien-eres-dejame-tu-ubicacion/registro.md) | +3393 | 195.235.194.132 | quien eres? dejame tu ubicacion en el siguiente telefono: |
| [r0104](registros/r0104-oldid-169536082-que-es-esto/registro.md) | +187 | 195.235.194.132 | que es esto? |
| [r0110](registros/r0110-oldid-169535482/registro.md) | -341 | 88.6.12.207 | Todo |
| [r0112](registros/r0112-oldid-168629510-introduccion/registro.md) | -1101 | AntonioLeonMexico | Introducción |
| [r0117](registros/r0117-oldid-168510829-historia-reciente-1982-present/registro.md) | +104 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0125](registros/r0125-oldid-168143942/registro.md) | +328 | Margo92 | Deshecha la [[Especial:Diff/167645487/edición 1676 |
| [r0126](registros/r0126-oldid-167645487-hispania-cartaginesa/registro.md) | -328 | 2001:1388:13A6:7F5B:2880:F599:4A12:1161 | Hispania cartaginesa |
| [r0136](registros/r0136-oldid-167127701-historia-reciente-1982-present/registro.md) | +140 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0138](registros/r0138-oldid-166948380-la-reconquista/registro.md) | +181 | Janitoalevic | La Reconquista |
| [r0139](registros/r0139-oldid-166943756/registro.md) | +908 | SeroBOT | — |
| [r0140](registros/r0140-oldid-166943754/registro.md) | -908 | 46.6.198.13 | La historia del hombre |
| [r0145](registros/r0145-oldid-166233326/registro.md) | -193 | Eduardosalg | Revertida una edición de [[Special:Contributions/8 |
| [r0146](registros/r0146-oldid-166233319/registro.md) | +193 | 81.34.40.186 | Eh cambiado las cosas |
| [r0149](registros/r0149-oldid-166097893/registro.md) | -393 | Varondán | (sin resumen |
| [r0151](registros/r0151-oldid-166097627/registro.md) | +296 | 31.221.177.174 | Si lo e cambiaron |
| [r0152](registros/r0152-oldid-166069484/registro.md) | -146 | SeroBOT | Revertida una edición de [[Special:Contributions/3 |
| [r0153](registros/r0153-oldid-166069481/registro.md) | +146 | 31.221.227.235 | (sin resumen |
| [r0157](registros/r0157-oldid-165569956/registro.md) | +2371 | SeroBOT | — |
| [r0158](registros/r0158-oldid-165569953-introduccion/registro.md) | -2371 | 185.197.91.169 | Introducción |
| [r0160](registros/r0160-oldid-165550650-historia-reciente-1982-present/registro.md) | +106 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0163](registros/r0163-oldid-165175785/registro.md) | +451 | Margo92 | (sin resumen |
| [r0164](registros/r0164-oldid-165137325-historia-reciente-1982-present/registro.md) | +167 | Campeones_2008 | Historia reciente (1982-presente) |
| [r0165](registros/r0165-oldid-165132978/registro.md) | +427 | LMLM | Revertida una edición de [[Special:Contributions/1 |
| [r0166](registros/r0166-oldid-165132929-crisis-bajomedieval/registro.md) | -427 | 195.235.87.121 | Crisis bajomedieval |
| [r0167](registros/r0167-oldid-165064243/registro.md) | +2519 | SeroBOT | — |
| [r0168](registros/r0168-oldid-165064241/registro.md) | -2519 | Elmateviejas | srdjktcghdfxlkd |
| [r0175](registros/r0175-oldid-164544856/registro.md) | -143 | SeroBOT | Revertida una edición de [[Special:Contributions/9 |
| [r0176](registros/r0176-oldid-164544854/registro.md) | +143 | 93.156.218.1 | (sin resumen |
| [r0179](registros/r0179-oldid-164076320/registro.md) | +600 | Margo92 | Enlaces internos; cambios en dos referencias |
| [r0180](registros/r0180-oldid-164023112/registro.md) | +876 | SeroBOT | — |
| [r0181](registros/r0181-oldid-164023110-dictadura-de-francisco-franco-/registro.md) | -876 | 217.61.227.52 | Dictadura de Francisco Franco (1939-1975) |
| [r0184](registros/r0184-oldid-163890371/registro.md) | +362 | Montgomery | Revertida una edición de [[Special:Contributions/3 |
| [r0185](registros/r0185-oldid-163890362/registro.md) | -362 | 37.29.157.164 | Mujeres SEXO ALMERÍA |
| [r0208](registros/r0208-oldid-162673361/registro.md) | -217 | Omphalographer | rvv |
| … | | | _890 más en manifest_ |

## Ontología por sección (frecuencia en historial)

Pack de partida para expandir caché (véase `ontology-seeds.json`):

| Sección | Ediciones |
|---------|-----------|
| Introducción | 145 |
| Prehistoria | 85 |
| Historia actual | 69 |
| Llegada de distintos pueblos | 47 |
| Historia reciente (1982-presente) | 41 |
| De «las Españas» a España | 39 |
| Historia actual (1982-presente) | 38 |
| Historia actual (1982–presente) | 29 |
| Enlaces externos | 28 |
| De Hispania a España | 28 |
| La Reconquista | 28 |
| Historia reciente (1982–presente) | 28 |
| Véase también | 27 |
| Historia contemporánea de España | 27 |
| Dictadura del general Franco | 27 |
| Casa de Austria | 21 |
| La conquista islámica | 21 |
| La caída del Imperio romano | 20 |
| La Reconquista (siglos VIII a XV) | 19 |
| Historia moderna de España | 18 |
| Restauración borbónica | 18 |
| Era musulmana | 17 |
| Imperio español | 16 |
| El auge del castellano | 16 |
| Restauración borbónica (1875-1931) | 15 |

## Estructura

```
lineas-poder/espana/wp/historia/
├── raw/linea.md
├── manifest.json
├── nodo-sections.json   # puente P01–P24 → secciones WP
├── INDICE.md
├── README.md
├── ontology-seeds.json
├── snapshots/previo|inicial|final|sc_cierre|actual/
└── registros/          # milestones (segment_linea --expand)
```

## Comandos

```bash
python3 segment_linea.py --corpus-dir . --expand milestones
python3 scripts/fetch_snapshot.py --oldid <oldid> --title Historia de España
python3 scripts/fetch_snapshot.py --latest --title "Historia de España"
```

## Curación de deltas

Cada `registros/*/delta.md` explica el **delta interpretado** respecto al
registro anterior (más reciente en el tiempo → `r0001` es el más nuevo).
El índice narrativo lo escribimos nosotros; el script solo deja el esqueleto.
