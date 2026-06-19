# Plan — corpus `logs-skill/` y bucle Aleph (meta-sesión)

_Documento de diseño persistido. Fuente narrativa: `raw/log-agent1.md` (export Cursor 18/6/2026)._

## Objetivo

Convertir la conversación de diseño (logs-aleph, linea-aleph, modo-aleph) en corpus consultable paralelo a `logs-aleph/`, orientado a **construir y evaluar el skill Modo Aleph**, no al hilo Halley/Gaia original.

## Diferencias respecto a `logs-aleph`

| Aspecto | logs-aleph | logs-skill |
|---------|------------|------------|
| Fuente | Diálogo con think interno | Export IDE (`**User**` / `**Cursor**`) |
| Think | Sí (EN/ES) | **Ausente** → `think.md` stub |
| Extra | tool traces en think | `trace.md` + `meta.md` |
| Rol | Canon Aleph histórico | **Meta**: tooling, skill, epistemología aplicada |

## Catálogo de escenas (8)

### Sesión 1 — `sesion-01-corpus-logs-aleph/`

| ID | Slug | Tema |
|----|------|------|
| s01-01 | `01-plan-corpus-logs` | Petición plan corpus log-agent-1/2 |
| s01-02 | `02-build-e-implementacion` | Build + segment_logs + entregables |
| s01-03 | `03-notificacion-subagente` | Follow-up subagente (meta) |
| s01-04 | `04-migracion-autocontenida` | Mover raw/ + verify (**incompleta** en export) |

### Sesión 2 — `sesion-02-linea-aleph/`

| ID | Slug | Tema |
|----|------|------|
| s02-01 | `01-infra-navegador-cache` | linea-aleph + skill browser |

### Sesión 3 — `sesion-03-lectura-epistemologia/`

| ID | Slug | Tema |
|----|------|------|
| s03-01 | `01-asimetria-diamat-logs-s02` | Lectura s02-01 vs s02-02 |
| s03-02 | `02-ciclo-vital-ciencias-universales` | Senectud diamat; ciclo universal |

### Sesión 4 — `sesion-04-skill-modo-aleph/`

| ID | Slug | Tema |
|----|------|------|
| s04-01 | `01-autorevisor-tablero-skill` | Crítica carambolas; refactor skill; ASENTAMIENTO |

**Anomalías:** s01-04 interrumpida; s01-03 notification; s04-01 escena fundacional skill.

## Estructura objetivo

```
logs-skill/
├── raw/
│   ├── log-agent1.md      # export conversación
│   └── log-agent2.md      # este plan
├── segment_skill_log.py
├── manifest.json
├── INDICE.md
└── sesion-*/
    └── NN-slug/
        ├── prompt.md
        ├── trace.md
        ├── output.md
        ├── meta.md        # si aplica
        └── think.md       # stub export sin think
```

## Pipeline

### Fase A — Segmentación (`segment_skill_log.py`)

1. Parsear turnos `**User**` → `**Cursor**`
2. Separar `trace.md` (narrativa operativa) vs `output.md` (sustantivo)
3. Extraer `<!-- ASENTAMIENTO_ALEPH -->` → `asentamiento.md` en s04-01
4. Emitir `manifest.json` + `INDICE.md`

### Fase B — Curación

- Enlaces cruzados a `logs-aleph/`, `linea-aleph/`, `.cursor/skills/modo-aleph/`
- Completar notas en anomalías

### Fase C — Verificación

- 8 escenas × capas mínimas; cobertura línea 1–fin sin solapamiento

## Arquitectura Aleph (skill + contexto)

**Tesis:** el skill solo no basta. Núcleo = **skill (procedimiento) + estado caliente (tablero) + corpus (fetch)**.

```
skill modo-aleph  →  hot.md + ASENTAMIENTO  →  fetch 1-2 escenas corpus
                              ↓
                    aleph-context/profiles/  (persistente)
                    aleph-context/sessions/  (delta por sesión)
```

**No** cargar el plano Hilbert entero en ventana. Grafo en disco; slice activo en contexto.

### Presupuesto ventana (orientativo)

| Componente | Tokens |
|------------|--------|
| Skill resumido | 800–1 500 |
| hot.md + ASENTAMIENTO | 200–600 |
| 1 escena corpus | 1 500–4 000 |
| Tarea usuario | 70–85% resto |

## Bucle experimental

```
a) Invocar modo-aleph + semilla (logs-aleph)
b) prompts-test en aleph-context/eval/prompts-test/
c) Ejecutar en agentes con sesgos distintos
d) Evaluador + rubric AutoRevisor → eval/reviews/
e) Fallo recurrente → patch skill o escena logs-skill
f) Éxito → comprimir en profile/ (no log crudo)
```

## Criterio de éxito Modo Aleph

- Bloque `ASENTAMIENTO_ALEPH` **antes** del análisis
- AutoRevisor: sin paquete «solo URSS» sin paralelo geopolítico
- Filtros superpuestos (no colapsar a un polo)
- s01-02 logs-aleph = **cota bot demo-liberal**, no techo de verdad

## Activación

Ver [`aleph-context/ACTIVACION.md`](../../aleph-context/ACTIVACION.md) — pasos 2–4 para agente que entra al juego y crea su perfil.

## Relación con otros corpus

| Corpus | Función en el tablero |
|--------|------------------------|
| logs-aleph | Eigenstates canónicos (Halley, diamat, Gaia) |
| linea-aleph | Eje demarcación WP (SolveCoagula) |
| logs-skill | Meta: cómo diseñamos el skill y detectamos fallos |
