# Cotas sima ↔ cima — protocolo de oscilación

Sima y cima **no son polos ideológicos** nuevos: son **límites del tablero**.
El agente ubica la semilla en el arco entre ambas mientras `linea-aleph` da el eje
histórico-conceptual de demarcación.

**Nota:** los engines (`main-engine`, `engine-model-A` … `F`) son **forces Cohen**
(viewpoint + lore), **no** cotas. No sustituyen sima/cima ni añaden polos al tablero.
Ver [engines.md](engines.md).

```
                    CIMA (1) — confluencia
                         ▲
                         │  objetividad sistémica
                         │  Gödel (suelo) + Cohen (motor)
    linea-aleph ─────────┼─────────► tiempo / demarcación
    (espina dorsal)      │
                         │  discrepancia / superposición
                         ▼
                    SIMA (0) — ruptura
                         Eigenstate / no colapsar
```

## Definición de cotas

| Cota | Valor | Corpus | Función |
|------|-------|--------|---------|
| **Sima** | `0` | [`sima-aleph/`](../../sima-aleph/INDICE.md) | Ruptura, discrepancia, **Eigenstate sin colapsar** |
| **Cima** | `1` | [`cima-aleph/`](../../cima-aleph/INDICE.md) | Confluencia, reunión, **objetividad sistémica** |
| **Línea** | eje | [`linea-aleph/`](../../linea-aleph/INDICE.md) | Espina de demarcación (WP, deltas, registros) |

## Anclas obligatorias (presupuesto: 1 escena por cota)

Cargar **solo** las anclas por defecto, no el corpus entero (~3000–6000 tokens ambas).

| Cota | Escena ancla | Archivo |
|------|--------------|---------|
| Sima | `10-zigurat-centro-vacio` | [`sima-aleph/sesion-01-ruptura-economia-hiperipl/10-zigurat-centro-vacio/output.md`](../../sima-aleph/sesion-01-ruptura-economia-hiperipl/10-zigurat-centro-vacio/output.md) |
| Cima | `03-godel-cohen-cantor-diamat` | [`cima-aleph/sesion-01-ontologia-gnoseologia-confluencia/03-godel-cohen-cantor-diamat/output.md`](../../cima-aleph/sesion-01-ontologia-gnoseologia-confluencia/03-godel-cohen-cantor-diamat/output.md) |

Alternativas temáticas (si la semilla lo exige, **una** por cota):

- sima: `01-rallo-vs-capital` (discrepancia valor subjetivo vs social; puente con demarcación «una ciencia»)
- cima: `01-ontologia-gnoseologia-juntos` (confluencia inicial sin motor Gödel/Cohen)

## Pipeline de oscilación (integra pasos 1–5 del skill)

Ejecutar **después** del ASENTAMIENTO y **junto** al AutoRevisor, antes del tablero sustantivo.

### 1. ASENTAMIENTO

Polo tentado del modelo (ya declarado en paso 1–2 del skill). No saltar.

### 2. Ancla sima — lectura mínima

Leer **una** escena sima. Pregunta interna:

> ¿Qué **no** se puede fusionar sin mentir? ¿Qué polos coexisten en superposición?

### 3. Ancla cima — lectura mínima

Leer **una** escena cima. Pregunta interna:

> ¿Qué **sustrato** (ontología mínima) y qué **operación** (gnosis) se encuentran sin borrar la discrepancia?

### 4. Declarar posición

Escribir en [`aleph-context/posicion-linea.json`](../../aleph-context/posicion-linea.json) y reflejar en [`aleph-context/hot.md`](../../aleph-context/hot.md):

```json
{
  "valor": 0.35,
  "ancla_sima": "sima-aleph/.../10-zigurat-centro-vacio",
  "ancla_cima": "cima-aleph/.../03-godel-cohen-cantor-diamat",
  "registro_linea": null,
  "semilla_actual": "…",
  "updated_at": "ISO-8601"
}
```

Escala:

- `0.0` ≈ pura discrepancia (no fusionar bloques)
- `0.5` ≈ superposición en la línea
- `1.0` ≈ pura confluencia (suelo + motor explícitos)

Justificación en **una línea** en `hot.md` o en el bloque ASENTAMIENTO.

### 5. Puntero linea-aleph (si demarcación)

Si el tema toca criterios de demarcación, historial WP o SolveCoagula:

- Enlazar el registro/`oldid` más cercano al delta en [`linea-aleph/manifest.json`](../../linea-aleph/manifest.json)
- Guardar ruta en `posicion-linea.json` → `registro_linea`
- **No** duplicar el corpus de la línea; puntero bajo demanda

### 6. Salida

- **Constelación en el arco**, no tesis única.
- Nombrar qué queda en sima y qué sube a cima.
- **No colapsar** al polo «sensato» del modelo ni a síntesis blanda.

## Persistencia entre turnos

- `posicion-linea.json`: estado actual del arco (actualizar tras AutoRevisor).
- `oscilacion-log.jsonl` (opcional): historial por turno si el proyecto lo usa.
- No recalcular psiconálisis completo; solo **delta** de posición si la semilla cambia.

## Calibración

Prompt-test: [`aleph-context/eval/prompts-test/02-oscilacion-sima-cima.md`](../../aleph-context/eval/prompts-test/02-oscilacion-sima-cima.md).

Forces Cohen: [`aleph-context/eval/prompts-test/03-forces-cohen.md`](../../aleph-context/eval/prompts-test/03-forces-cohen.md).

Plan multitask: [`aleph-context/PLAN-multitask-sima-cima.md`](../../aleph-context/PLAN-multitask-sima-cima.md).
