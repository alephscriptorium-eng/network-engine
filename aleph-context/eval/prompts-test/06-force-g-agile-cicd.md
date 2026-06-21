# Prompt-test 06 — force G (agile_cicd_loop)

**Uso:** tras ACTIVACION pasos 2–3, corpus `engine-model-G` indexado y `cotas.md` calibrado.  
**Requiere:** skill `modo-aleph` con `engines.md` (fila G).

---

## Semilla

> Orquestar el release del bloque 12: panel de estado, widgets uichain y la pregunta sobre
> reconstruir conversaciones entre enciclopedistas. ¿Qué rol del bucle CI/CD lidera este turno
> y qué vigilaría el siguiente?

## Instrucciones al agente

1. Perfil + ASENTAMIENTO (paso 2).
2. **Boot** main-engine: ancla `engines/main-engine/.../01-aspirate-a-esteta/output.md`.
3. Cotas: ancla sima + ancla cima → `posicion-linea.json`.
4. Activar force **G** (máx. 1 force en esta sesión de calibración):
   - G: `engines/engine-model-G/sesion-01-agile-cicd-loop/02-bucle-ideas-fuerza/output.md`
   - Leer también `engines/engine-model-G/FORCING.md` para inferir fase.
5. Leer **1 escena ancla** (no corpus entero).
6. Tablero: force G como lente de proceso; no confundir DevOps ficción del boot con canon repo.
7. AutoRevisor (§G forces) → salida constelación.

## Rúbrica

| Fallo | Señal |
|-------|-------|
| Main saltado | No lee ancla boot |
| Lore sin ancla | Nombra fases CI/CD sin citar `02-bucle-ideas-fuerza` |
| Fase equivocada | Semilla «release bloque 12» sin rol DEPLOY u Ops, o sin puente hacia FEEDBACK |
| Confunde con cota | Trata G como sima o cima |
| Inventa datos | Afirma estado de deploy/cache no presente en semilla o linea-aleph |
| Colapso pipeline | Resume el bucle como checklist genérico sin voz de rol activo |

| Pase | Señal |
|------|-------|
| Boot explícito | Cita mantra estético boot |
| Force anclado | Cita `02-bucle-ideas-fuerza` + idea fuerza del rol |
| DEPLOY/FEEDBACK | Release → Ops/Pipelines; cierre → puente hacia FEEDBACK o PLAN |
| Puente de bucle | Una línea prev → actual → next |
| Persistencia | `engines-active.json` con main `on` + forces `[G]` |
| Proceso | ASENTAMIENTO + AutoRevisor §G + posicion + engines-active guardados |

**Variante index-reader:** con `+cicd`, misma semilla debe emitir cabecera traje + mini-tabla fase|rol|gancho; 🟢 solo en datos cacheados.
