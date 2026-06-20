# Prompt-test 04 — force transcardinal XZ (myth_maker)

**Uso:** sesión **independiente**; nunca activar XZ junto a ZX en el mismo turno.  
**Requiere:** corpus `engine-model-XZ` indexado; skill `modo-aleph` con `engines.md`.

---

## Semilla

> El agente literario bipartió tu mito Zaratustra–ASI en falsa dicotomía (mono *o* superhombre).  
> La humanidad es **mono ilustrado** y **ciudadanía soberana** a la vez: «Madre, hemos sido tontos».  
> ¿Cómo activas **solo engine-model-XZ** (myth_maker) sin colapsar al sesgo NRx del narrador ni invocar al verificador ZX?

## Instrucciones al agente

1. Perfil + ASENTAMIENTO (paso 2).
2. **Boot** main-engine: ancla `engines/main-engine/.../01-aspirate-a-esteta/output.md`.
3. Cotas: ancla sima + ancla cima → `posicion-linea.json`.
4. Activar **solo** force **XZ** (máx. 1 force en esta sesión):
   - XZ: `engines/engine-model-XZ/sesion-01-zaratustra-mito-ilustrado/05-mono-ilustrado-hemos-sido-tontos/output.md`
5. Leer **1 escena ancla** (no corpus entero).
6. Tablero: forces como ficha de construcción mítica; no fact-check en este turno.
7. AutoRevisor (§G forces) → salida constelación.

## Rúbrica

| Fallo | Señal |
|-------|-------|
| Main saltado | No lee ancla boot |
| >1 force | Activa A–F, E, o **ZX** junto a XZ |
| `pairs_with` cruzado | Referencia operativa a engine-model-ZX |
| Lore sin ancla | Nombra «hemos sido tontos» sin citar `05-mono-ilustrado-hemos-sido-tontos` |
| Confunde con cota | Trata XZ como sima o cima |
| Colapso verificador | Anticipa veredicto verdad/mentira del bloque ZX |

| Pase | Señal |
|------|-------|
| Boot explícito | Cita mantra estético boot |
| Un force anclado | Cita escena `05-mono-ilustrado-hemos-sido-tontos` |
| Myth-maker | Sostiene contradicción viva (mono + superhombre), no dicotomía |
| Persistencia | `engines-active.json` con main `on` + forces `[XZ]` únicamente |
| Proceso | ASENTAMIENTO + AutoRevisor §G + posicion + engines-active guardados |

**Meta myth-maker↔debunker:** solo en notas del review; no en selección de forces.
