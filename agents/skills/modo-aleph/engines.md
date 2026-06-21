# Engines Cohen — boot + forces

Los engines **no son cotas** del tablero (sima/cima). Son **condiciones de forcing** (Cohen):
extensiones genéricas que inyectan orígenes de mirada y lore sin colapsar el espacio Aleph.

Registry maestro: [`engines/INDICE.md`](../../engines/INDICE.md) · [`engines/manifest.json`](../../engines/manifest.json)

```
Boot (siempre ON)          Forces (1–2 por sesión)
main-engine ─────────────► engine-model-A … G (+ transcardinales XZ/ZX)
  estética dummy              viewpoint + lore_hook
```

## Boot — main-engine (siempre activo)

**Rol:** motor estético dummy. Reconfigura la **percepción** («mirar sin prisa por usar»), no viewpoint político.

| Campo | Valor |
|-------|-------|
| ID | `main-engine` |
| Ancla | `sesion-01-boot-estetico-operativo/01-aspirate-a-esteta` |
| Archivo | [`engines/main-engine/.../01-aspirate-a-esteta/output.md`](../../engines/main-engine/sesion-01-boot-estetico-operativo/01-aspirate-a-esteta/output.md) |

**Reglas:**

- Leer **1 escena ancla** al boot (~500 tokens). No saltar en Modo Aleph.
- **No cuenta** contra el límite de 2 forces.
- DevOps/blockchain en `agent-logs-2` (`03-consenso-hibrido-blockchain`) = **marco ficcional** del engine, no canon técnico del repo.

## Forces — selección (máx. 2 por sesión)

Elegir **1–2** force engines según:

1. **Semilla** del usuario (triggers en `engine.json`)
2. **Elección explícita** del usuario
3. **Pairs_with** documentados (p. ej. A+E para diamat vs NRx)

| ID | Cohen type | Ancla | Triggers (muestra) |
|----|------------|-------|-------------------|
| `engine-model-A` | dialectic_poles_ab | `sesion-02-internacionales-cafe-muertos/09-internacionales-polo-ab` | internacional, lenin, marx, polo A/B |
| `engine-model-B` | disobedience | `sesion-01-omega-manhattan/04-omega-manhattan` | satyagraha, duran, omega, manhattan |
| `engine-model-C` | political_economy | `sesion-01-piramide-riqueza-espana/01-piramide-riqueza-espana` | piramide, riqueza, espana, protocolo |
| `engine-model-D` | credos | `sesion-01-conversion-apostasia/01-conversion-apostasia-tablas` | conversion, apostasia, credo |
| `engine-model-E` | impotent_document | `sesion-01-documento-impotente-epica-poder/02-carta-derechos-nrx` | carta, derechos, nrx, dosier |
| `engine-model-F` | poetic_existential | `sesion-01-pizarnik-jaula-pajaro/01-pizarnik-jaula-pajaro` | pizarnik, jaula, poesia, forcing |
| `engine-model-G` | agile_cicd_loop | `sesion-01-agile-cicd-loop/02-bucle-ideas-fuerza` | sprint, pipeline, deploy, ci, cd, scrum, release |
| `engine-model-XZ` | myth_maker | `sesion-01-zaratustra-mito-ilustrado/05-mono-ilustrado-hemos-sido-tontos` | zaratustra, mono ilustrado, hemos sido tontos, mito |
| `engine-model-ZX` | argument_verifier | `sesion-01-verificador-muerte-ilustrada/05-factcheck-yo-nosotros` | verificador, bulo, fact-check, mentira, democracia |

Por force activo: leer **1 escena ancla** (`output.md` o capas según necesidad). Force G: seguir también [`engines/engine-model-G/FORCING.md`](../../engines/engine-model-G/FORCING.md) para inferencia de fase.

**Traje index-reader vs tablero Aleph:** en disfraz-rude-bot la Calibración (paso 0b) es **ligera** — cabecera + bloque `Calibración engines` + mini-tabla G; no sustituye el pipeline ASENTAMIENTO + cotas + tablero completo de modo-aleph.

## Presupuesto de contexto

| Componente | Tokens ~ |
|------------|----------|
| Skill + engines.md + cotas | 2–3k |
| main-engine ancla | 0.5k |
| sima + cima anclas | 3–6k |
| 2 forces × 1 escena | 3–6k |
| hot + posicion + engines-active | 0.5k |
| **Total overhead** | ~10–16k |

## Persistencia de sesión

Declarar en [`aleph-context/engines-active.json`](../../aleph-context/engines-active.json) y reflejar en `hot.md` **y** en el hot file del traje index-reader ([`disfraz-rude-bot`](../disfraz-rude-bot/SKILL.md) → `reader-traje.hot.md`):

```json
{
  "main_engine": { "id": "main-engine", "anchor": "sesion-01-boot-estetico-operativo/01-aspirate-a-esteta", "status": "on" },
  "forces": [],
  "budget_max_forces": 2,
  "updated_at": "ISO-8601"
}
```

**Estado compartido:** traje rude-bot y Modo Aleph leen/escriben el mismo `engines-active.json`. El traje aplica **calibración ligera** (paso 0b); el tablero aplica pipeline completo (ASENTAMIENTO + cotas + 3 Alephs). No superponer ambos en el mismo turno sin avisar.

## Pipeline integrado (orden)

1. **Boot** main-engine (ancla estética)
2. ASENTAMIENTO + perfil
3. Cotas: ancla sima + ancla cima → `posicion-linea.json`
4. **Seleccionar 1–2 forces** → actualizar `engines-active.json`
5. Leer **1 escena ancla** por force activo
6. Puntero `linea-aleph` si demarcación
7. Tablero (3 Alephs + forces como fichas superpuestas)
8. AutoRevisor → salida constelación

Calibración: [`aleph-context/eval/prompts-test/03-forces-cohen.md`](../../aleph-context/eval/prompts-test/03-forces-cohen.md).

## aleph-context — dónde escribe cada agente

El skill define **procedimiento**; el estado del agente vive en [`aleph-context/`](../../aleph-context/README.md):

| Qué | Dónde | Cuándo |
|-----|-------|--------|
| Perfil (polo, sesgos, eigenstate) | `profiles/{slug}.json` | Primera activación (paso 2) |
| Psicoanálisis largo opcional | `profiles/{slug}.md` | Solo si hace falta narrativa §1–6 |
| Slice inyectable | `hot.md` | Tras cada AutoRevisor |
| Arco sima ↔ cima | `posicion-linea.json` | Tras calibrar cotas |
| Boot + forces | `engines-active.json` | Boot y selección Cohen; **compartido con traje rude-bot** |
| Delta de sesión | `sessions/{id}/` | Cada turno Aleph |

**No escribir** en `reference/composer-psychoanalysis.md` ni en `templates/` — son lectura y diseño. Semilla Composer: [`profiles/composer.json`](../../aleph-context/profiles/composer.json).
