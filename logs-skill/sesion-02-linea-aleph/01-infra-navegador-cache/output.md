---
scene_id: s02-01
session: sesion-02-linea-aleph
source_file: raw/log-agent1.md
source_lines: [260, 349]
layer: output
tags: [linea-aleph, skill-browser, demarcacion]
---
## Qué hay ahora

```
linea-aleph/
├── raw/linea.md              # copia autocontenida
├── segment_linea.py          # segmentador (fase 1)
├── scripts/fetch_snapshot.py # fetch API MediaWiki → cache/
├── manifest.json             # 677 registros parseados
├── manifest.draft.json
├── ontology-seeds.json       # pack de secciones SolveCoagula
├── INDICE.md                 # tesis + extremos + 99 hitos
├── snapshots/inicial|final/  # meta.json (oldid mapeados)
├── registros/                # 99 milestones con registro.md + delta.md (plantilla)
└── cache/                    # vacío; aquí va el offline

.cursor/skills/linea-aleph-browser/SKILL.md
```

**Verificación:** 677 registros, 99 milestones, 0 issues.

| Extremo | Registro | oldid | Evento |
|---------|----------|-------|--------|
| Final (más nuevo en linea.md) | `r0001` | 12370021 | 27-oct-2007 |
| Inicial | `r0677` | 11951034 | «Traducción completa del original en inglés» |

## ¿Markdown para snapshots intermedios?

**No para el cuerpo del artículo.** Propuesta en el índice:

| Capa | Formato |
|------|---------|
| Índice narrativo y **deltas curados por vosotros** | `.md` |
| Metadatos de cada registro | `.md` + `manifest.json` |
| **Snapshot real de WP** | `.wikitext` + `.meta.json` en `cache/snapshots/` |
| Viajes hipervinculados | `cache/viajes/*.json` |

Los 677 snapshots completos en markdown serían bulk inútil (~160 KB × 677). El script materializa solo **hitos** (|Δ| ≥ 500, fusiones, Ctrl Z, traducción…) y deja el resto en `manifest.json` para expandir bajo demanda.

## Comandos

```bash
cd linea-aleph
python3 segment_linea.py                    # manifest + índice + milestones
python3 segment_linea.py --registro r0022   # un registro extra
python3 segment_linea.py --expand all       # los 677 (pesado)

python3 scripts/fetch_snapshot.py --oldid 11951034   # snapshot inicial → cache/
```

El fetch inicial funciona (dry-run: ~15.7k chars wikitext, comentario «Traducción completa del original en inglés»).

## Skill navegador-caché

`.cursor/skills/linea-aleph-browser/SKILL.md` define el bucle:

1. Elegir ancla (inicial → milestone pendiente → sección en `ontology-seeds.json` → `[[enlace]]` del wikitext cacheado)
2. `fetch_snapshot.py` → `cache/snapshots/{oldid}.wikitext`
3. Curar `delta.md` (interpretación ontología/gnoseología — **eso lo escribís vosotros**)
4. Registrar viaje en `cache/viajes/` hasta `offline_ready: true`

## Respuesta a la hipótesis

La línea de demarcación encaja con el problema de logs-aleph s02 («no hay UNA ciencia»): en lugar de unificar diamat/positivismo/Kuhn en una respuesta, **cartografiáis una espina dorsal** — el historial SolveCoagula sobre [Problema de la demarcación](https://es.wikipedia.org/wiki/Problema_de_la_demarcación) — y cada delta pregunta *qué entra en el bloque «ciencia»* y qué queda fuera.

Señales ya en el manifest para la pregunta «¿línea occidental federando bloque ajeno al diamat?»:

- **r0677** — traducción del artículo inglés (arranque occidental-canónico)
- **r0676–r0674** — fusiones con «Criterio de demarcación»
- **r0664** — Ctrl Z, trasladado masivo (−18 866 bytes)
- Secciones recurrentes: Feyerabend, Kuhn, falsacionismo, «ciencia normal vs paranormal»

El pack ontológico de partida está en `ontology-seeds.json`; la **clasificación** emerge cuando rellenéis los `delta.md` — el script solo deja el esqueleto y los enlaces.

**Siguiente paso natural:** fetch de `11951034` + `12370021` y curar el primer `delta.md` del hito que elijáis (p. ej. `r0677` → traducción). ¿Queréis que lance el fetch real de ambos extremos al `cache/`?

---
