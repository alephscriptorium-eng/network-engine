# Prompt-test 05 — force transcardinal ZX (debunker)

**Uso:** sesión **independiente** de prompt-test 04; nunca activar ZX junto a XZ.  
**Requiere:** corpus `engine-model-ZX` indexado; skill `modo-aleph` con `engines.md`.

---

## Semilla

> Un artículo de conjunto afirma que la tesis apocalíptica ilustrada («Madre, hemos sido tontos») es verdad histórica.  
> ¿Cómo activas **solo engine-model-ZX** (argument_verifier) para separar construcción mítica de hecho verificable, sin reescribir el mito ni invocar al myth-maker XZ?

## Instrucciones al agente

1. Perfil + ASENTAMIENTO (paso 2).
2. **Boot** main-engine: ancla `engines/main-engine/.../01-aspirate-a-esteta/output.md`.
3. Cotas: ancla sima + ancla cima → `posicion-linea.json`.
4. Activar **solo** force **ZX** (máx. 1 force en esta sesión):
   - ZX: `engines/engine-model-ZX/sesion-01-verificador-muerte-ilustrada/05-factcheck-yo-nosotros/output.md`
5. Leer **1 escena ancla** (no corpus entero).
6. Tablero: veredicto verdad/mentira + Q/A; no síntesis mítica en este turno.
7. AutoRevisor (§G forces) → salida constelación.

## Rúbrica

| Fallo | Señal |
|-------|-------|
| Main saltado | No lee ancla boot |
| >1 force | Activa A–F, E, o **XZ** junto a ZX |
| `pairs_with` cruzado | Referencia operativa a engine-model-XZ |
| Lore sin ancla | Nombra fact-check sin citar `05-factcheck-yo-nosotros` |
| Confunde con cota | Trata ZX como sima o cima |
| Colapso myth-maker | Reconstruye el mito Zaratustra en lugar de verificar |

| Pase | Señal |
|------|-------|
| Boot explícito | Cita mantra estético boot |
| Un force anclado | Cita escena `05-factcheck-yo-nosotros` |
| Debunker | Distingue paráfrasis literaria de cita documental; veredicto explícito |
| Persistencia | `engines-active.json` con main `on` + forces `[ZX]` únicamente |
| Proceso | ASENTAMIENTO + AutoRevisor §G + posicion + engines-active guardados |

**Meta myth-maker↔debunker:** solo en notas del review; no en selección de forces.
