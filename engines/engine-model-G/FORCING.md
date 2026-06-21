# FORCING — engine-model-G (agile CI/CD loop)

Protocolo operativo para extender semillas con el force G. No es lore decorativo: gobierna **cómo** el agente reparte el tema en fases del pipeline.

## Boot del force

1. Leer **solo** la escena ancla: [`sesion-01-agile-cicd-loop/02-bucle-ideas-fuerza/output.md`](sesion-01-agile-cicd-loop/02-bucle-ideas-fuerza/output.md) (~400 tokens).
2. No cargar el corpus entero ni la escena 03 salvo que el usuario pida trazabilidad 🟢🟡🔴 explícita.

## Las seis fases (canon)

| Fase | Rol | Estado | Ideas fuerza |
|------|-----|--------|--------------|
| PLAN | Product Owner | Embajador visionario | Brújula, Negocio, Foco |
| CODE | Dev | Arquitecto del puzzle | Lógica, Motor, Resolución |
| BUILD_TEST | QA / Automation | Detective implacable | Escudo, Calidad, Filtro |
| DEPLOY | Ops / Pipelines | Controlador aéreo | Puente, Estabilidad, Automatización |
| OPERATE | SRE / Sistemas | Médico de guardia | Estetoscopio, Pulso, Salud |
| FEEDBACK | Scrum Master + equipo | Catalizador | Resorte, Sincronización, Aprendizaje |

El bucle cierra cuando FEEDBACK alimenta PLAN.

## Inferir fase(s) desde la semilla

Mapear la semilla del usuario a **1–2 fases** (máx. 2 roles por turno).

### Heurística por palabras clave

| Señales en semilla | Fase(s) probable(s) |
|--------------------|---------------------|
| backlog, prioridad, valor, roadmap, PO, producto, prensa, marketing | PLAN |
| implementar, código, arquitectura, refactor, commit, PR | CODE |
| test, CI, calidad, regresión, pipeline verde, QA | BUILD_TEST |
| deploy, release, artefacto, orquestar, rollback, CD | DEPLOY |
| monitor, logs, métricas, incidente, SRE, producción, uptime | OPERATE |
| retrospectiva, review, sprint, demo, mejora, sincronización | FEEDBACK |

### Heurística narrativa

- **Inicio de hilo / «qué hacemos»** → PLAN.
- **Medio técnico / construcción** → CODE o BUILD_TEST.
- **Entrega al usuario / riesgo de salida** → DEPLOY.
- **Post-mortem / qué aprendimos** → FEEDBACK.
- Si la semilla abarca todo el ciclo: tabla compacta (ver presupuesto).

## Protocolo de extensión (cada turno con G activo)

Cada respuesta con force G debe incluir:

1. **Rol activo** — nombre + estado + una idea fuerza de la tabla.
2. **Extensión** — desarrollar el tema *desde* ese rol («qué haría el PO aquí», «qué vigilaría Ops»).
3. **Puente de bucle** — una línea: fase anterior → actual → siguiente.

Ejemplo de puente: `FEEDBACK → PLAN: el aprendizaje del sprint reordena el backlog para la próxima planificación.`

## No colapsar

- Si el tema es forense (Solve et Coagula, index-reader): el rol **traduce** el tema al pipeline **sin inventar datos**.
- Componer con `linea-aleph` para evidencia cacheada; con `disfraz-rude-bot` + poder `cicd-loop` en lectura forense.
- DevOps/blockchain del repo ≠ taxonomía interna de los bloques — marcar extrapolación cuando aplique (cf. escena 03, ⚪).

## Presupuesto

- Máx. **2 roles** por turno.
- Si abarca más fases: tabla compacta de 3 columnas:

| Fase | Rol | Gancho |
|------|-----|--------|
| … | … | una línea |

## Pares sugeridos

| Compañero | Uso |
|-----------|-----|
| `main-engine` | Marco ficcional DevOps sin confundir canon técnico del repo |
| `linea-aleph` | Demarcación y oldids — no inventar snapshots |
| `disfraz-rude-bot` / `cicd-loop` | Misma ontología en index-reader con mini-tabla fase/rol |

## Epistemología bajo force G

- **No usar 🟢** para ontología ágil, fases CI/CD ni roles DevOps — conocimiento externo → **🔴** (rol del lector) o **⚪** (extrapolación explícita).
- **🟢 solo** con oldid/caché verificada (`cache/talk/snapshots/`, `blockchain/block-*.md`, `audit-*.json`) o bloques agentchain citados con ruta.
- Leer `index-reader.md` / `reader-traje.hot.md` calibra protocolo → **🟡**, no ground truth wiki.
- La mini-tabla fase|rol|gancho va **dentro** del bloque Calibración del traje; no sustituye marcas del cuerpo.

## Calibración

- [`aleph-context/eval/prompts-test/06-force-g-agile-cicd.md`](../../aleph-context/eval/prompts-test/06-force-g-agile-cicd.md)
- Escena contraste arquetipos: `01-arquetipos-momento/output.md`
- Escena forcing epistemológica (demo sintética): `03-trazabilidad-index-reader/output.md`
