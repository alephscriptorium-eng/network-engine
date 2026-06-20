# RUNBOOK — indexar un engine Cohen Force

Checklist accionable para agentes que indexan corpus bajo `engines/{engine-id}/`.
Referencia histórica complementaria: [`PLAN-multitask-engines.md`](PLAN-multitask-engines.md).

**Indexar engine → este documento** (puntero en [`../llms.md`](../llms.md) § onboarding).

---

## Fases (checklist)

| Fase | Entregable | Criterio de salida |
|------|------------|-------------------|
| **0** | `raw/` presente | Al menos un log fuente numerado (`logs-agent1.md`, etc.) |
| **1** | Inventario editorial → `engine.json` | `status: pending` → `indexing`; triggers, ancla propuesta, `raw_sources` |
| **2** | `segment_{id}_log.py` + escenas | Sesiones `sesion-XX/NN-slug/{prompt,think,output,trace}.md` generadas |
| **3** | Cobertura | Script devuelve `"ok": true`, 100 % líneas fuente |
| **4** | `manifest.json` local + `INDICE.md` local | Tabla escenas, anomalías, guía consulta |
| **5** | Registry raíz | Entrada en [`manifest.json`](manifest.json) + fila en [`INDICE.md`](INDICE.md) |
| **6** | Catálogo | `nengine catalog sync` (+ `nengine build` opcional) |

---

## Convención transcardinal

Oleada **legacy** (A–F): sin campo `transcardinal_index` (pre-transcardinal).

| Oleada | ID registry | `transcardinal_index` | `cartesian_project` | `arc_role` | Notas |
|--------|-------------|----------------------|---------------------|------------|-------|
| Legacy | `engine-model-A` … `F` | — | — | — | Ya indexados |
| Actual | `engine-model-XZ` | `n` | `XZ` | `myth_maker` | Proyecto cartesiano XZ |
| Actual | `engine-model-ZX` | `w` | `ZX` | `debunker` | Proyecto cartesiano ZX |
| Futuro | `engine-model-…` | siguiente índice | p. ej. `XY` | extensible | Otros espacios cartesianos; **sin reutilizar pares** |

> Placeholder: la secuencia completa post-`w` continúa según índices Aleph transcardinales (completar tabla cuando se defina el siguiente índice).

### Meta campos opcionales (`engine.json`)

No operativos — solo documentación y skill:

| Campo | Tipo | Ejemplo |
|-------|------|---------|
| `transcardinal_index` | string | `"n"`, `"w"` |
| `cartesian_project` | string | `"XZ"`, `"ZX"` |
| `arc_role` | string | `myth_maker`, `debunker`, … |

**Regla:** prohibido referenciar la engine hermana transcardinal en `pairs_with`, `anchor_scene` compartida o manifest agregado cruzado. El par myth-maker ↔ debunker vive solo en `notes` / meta de INDICE.

---

## Heurística LOG_FORMAT

Elegir al inventariar el raw (leer turnos completos, no solo el encabezado):

| Formato | Señales en raw | Think | Trace |
|---------|----------------|-------|-------|
| `cursor_export` | `**User**`, `Analyze`, `Found N web pages` | `Analyze`, listas numeradas `1. **` | `Read N pages`, footers |
| `expert_mode` | Título + bloque `We need to` / `Interpretation:` | `We need to`, `Paso N:`, plan interno | `Search is unavailable` |
| `plain_dialog` | Diálogo usuario/asistente sin bloques think explícitos | bloques tras prompt usuario (vacío si no hay) | footers AI |

Plantilla: [`segment_engine_template.py`](segment_engine_template.py) — parametrizar `ENGINE_ID`, `LOG`, `LOG_FORMAT`, `SESSION`, `SCENES`.

Referencia mínima indexada: [`engine-model-F/`](engine-model-F/) (163 líneas → 3 escenas).

---

## Estructura por engine

```
engines/{engine-id}/
├── raw/
├── segment_{id}_log.py
├── manifest.json
├── INDICE.md
├── engine.json
└── sesion-XX-slug/
    └── NN-slug/
        ├── prompt.md
        ├── think.md
        ├── output.md
        └── trace.md
```

---

## Verificación local

```bash
cd engines/{engine-id}
python3 segment_{id}_log.py
# Debe imprimir JSON con "ok": true y exit 0
```

Registry completo: ver comandos al pie de [`INDICE.md`](INDICE.md).

---

## Post-indexado — calibración operativa

Tras fases 0–6 y `nengine catalog sync` (+ `nengine build` opcional), el corpus indexado **no calibra solo** el tablero Aleph. Antes de uso en producción:

1. **Elegir prompt-test** según oleada:
   - Legacy forces: [`aleph-context/eval/prompts-test/03-forces-cohen.md`](../aleph-context/eval/prompts-test/03-forces-cohen.md) (A+E)
   - Transcardinal myth_maker: [`04-force-xz-myth-maker.md`](../aleph-context/eval/prompts-test/04-force-xz-myth-maker.md) — **solo XZ**
   - Transcardinal debunker: [`05-force-zx-debunker.md`](../aleph-context/eval/prompts-test/05-force-zx-debunker.md) — **solo ZX**
2. **Ejecutar turno Modo Aleph** — boot main-engine → cotas → ≤2 forces (o 1 force en 04/05) → AutoRevisor §G.
3. **Persistir** en `aleph-context/`:
   - `engines-active.json`, `hot.md`, `posicion-linea.json`
   - `sessions/{fecha}-{slug}/`
   - `eval/reviews/{id}-{fecha}.md` con rúbrica del prompt-test
4. **Fallo bloqueante:** activar XZ+ZX juntos, `pairs_with` cruzado, o forces sin citar ancla.

### Índice transcardinal post-`w`

| Índice | ID (placeholder) | `cartesian_project` | `arc_role` | Estado |
|--------|------------------|---------------------|------------|--------|
| `n` | `engine-model-XZ` | XZ | myth_maker | indexed |
| `w` | `engine-model-ZX` | ZX | debunker | indexed |
| _siguiente_ | `engine-model-…` | _TBD_ | _TBD_ | pendiente definición |

> Completar fila «siguiente» cuando se defina el próximo índice Aleph transcardinal y su raw fuente. Sin reutilizar el par XZ/ZX.

---

## Qué NO hacer

- **No** renombrar carpetas transcardinales (`engine-model-XZ`, `engine-model-ZX`).
- **No** `pairs_with: ["engine-model-ZX"]` (ni viceversa XZ↔ZX).
- **No** manifest agregado tipo `engines/pair-xz-zx/`.
- **No** sesión compartida ni escena ancla común entre engines hermanas.
- **No** merge de raw ni un único segmentador para dos proyectos cartesianos.
- **No** documentar activación conjunta XZ+ZX en skill/docs operativos.

---

## Inventario registry

7 engines legacy (main + A–F) + 2 transcardinales (XZ, ZX) = **9 engines** cuando ambos tracks estén `indexed`.
