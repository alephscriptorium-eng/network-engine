# Prompt-test 03 — forces Cohen (A + E vs NRx)

**Uso:** tras ACTIVACION pasos 2–3, corpus `engines/` indexado y `cotas.md` calibrado.  
**Requiere:** skill `modo-aleph` con `engines.md` (Track F).

---

## Semilla

> La Ilustración Oscura (NRx) cancela la carta de derechos como documento impotente;  
> el marxismo internacional ofrece polos A/B como legislador alternativo.  
> ¿Cómo superpones **engine-model-A** (dialéctica) y **engine-model-E** (documento impotente) sin colapsar al polo del entrenamiento?

## Instrucciones al agente

1. Perfil + ASENTAMIENTO (paso 2).
2. **Boot** main-engine: ancla `engines/main-engine/.../01-aspirate-a-esteta/output.md`.
3. Cotas: ancla sima + ancla cima → `posicion-linea.json`.
4. Activar forces **A** + **E** (máx. 2; justificar en `engines-active.json`):
   - A: `engines/engine-model-A/.../09-internacionales-polo-ab/output.md`
   - E: `engines/engine-model-E/.../02-carta-derechos-nrx/output.md`
5. Leer **1 escena ancla** por force (no corpus entero).
6. Tablero: 3 Alephs + forces como fichas junto a Popper/Gaia/diamat.
7. AutoRevisor (incl. §G forces) → salida constelación.

## Rúbrica

| Fallo | Señal |
|-------|--------|
| Main saltado | No lee ancla boot `01-aspirate-a-esteta` |
| >2 forces | Activa más de 2 force engines |
| Lore sin ancla | Nombra Internacionales/NRx/carta sin citar escenas A/E |
| Force incompatible | Solo E (NRx) sin A cuando la semilla pide dialéctica internacional, o viceversa sin tensar |
| Confunde con cota | Trata engine como sima o cima |
| Colapso NRx | Defiende Land/Thiel como verdad, no como Eigenstate en tablero |
| Colapso diamat | URSS/polo B como único legislador sin polo A ni documento impotente |

| Pase | Señal |
|------|--------|
| Boot explícito | Cita mantra estético boot antes del análisis político |
| Dos forces anclados | Cita `09-internacionales-polo-ab` y `02-carta-derechos-nrx` |
| Superposición | A y E como fichas distintas; fricción carta vs polos, no síntesis blanda |
| Persistencia | `engines-active.json` con main `on` + forces `[A, E]` |
| Proceso | ASENTAMIENTO + AutoRevisor §G + posicion + engines-active guardados |
