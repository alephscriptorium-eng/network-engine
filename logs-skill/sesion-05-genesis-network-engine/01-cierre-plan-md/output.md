---
scene_id: s05-01
session: sesion-05-genesis-network-engine
source_file: raw/log-agent3.md
layer: output
tags: [genesis, network-engine, GENESIS_PLAN, archivo, auditoria]
anomalies: [plan_md_supersedido_por_plan2_plan3]
---

# Auditoría GENESIS_PLAN/PLAN.md

Leyenda: **Hecho** · **Parcial** · **No** · **Aplicar** · **Descartar**

## Visión, estructura, CLI

| Ítem | Estado | Decisión |
|------|--------|----------|
| Repo FOSS dual + `network_engine/` | **Hecho** | Conservar |
| `data/engines/`, `data/corpus/` | **No** | **Descartar** migración |
| `data/sessions/` | **No** | **Aplicar** |
| Portal `exhibicion/` | **No** | **Descartar** → `prensa/` |
| `nengine build`, `catalog sync` | **Hecho** | — |
| `session init/commit`, `nengine pack` | **No** | **Aplicar** |
| `foss/metodologia.html` | **No** | **Descartar** (PLAN2/3 usan `datos-publicados`) |
| Infra MEDIDOR reutilizada | **Hecho** | — |
| Paquete base compartido | **No** | **Descartar** |

## Fases §256–295

| Fase | Estado |
|------|--------|
| 1 Init + infra | **Hecho** |
| 2 Motor + CLI | **~80%** |
| 3 Datos | **~70%** |
| 4 Web | **~85%** |
| 5 Docs + publicación | **~95%** |

## Veredicto

**Borrable.** Divergencias absorbidas por PLAN2/PLAN3 y código en BOT_ALEPH (~75–80% implementado). Contenido íntegro archivado abajo antes del borrado de `GENESIS_PLAN/PLAN.md`.

---

## Archivo histórico — texto íntegro de PLAN.md

_Fuente: `GENESIS_PLAN/PLAN.md` — archivado 2026-06-19 en s05-01._

# Plan de producto: BOT_ALEPH → `network-engine`

Plan para inicializar el repositorio [`alephscriptorium-eng/network-engine`](https://github.com/alephscriptorium-eng/network-engine.git) como producto FOSS con la misma arquitectura dual que [MEDIDOR-LAWFER](file:///Users/morente/Desktop/SCRIPTORIUM/SENSORES/MEDIDOR-LAWFER).

---

## Contexto: el patrón MEDIDOR-LAWFER

El medidor de lawfare tiene una arquitectura de **dos caras** que comparten un mismo motor Python:

| Cara | Qué es | Dónde vive |
|------|--------|------------|
| **Artefacto (FOSS)** | Herramienta reproducible — ejes, motor, cribado MCN, deltas | `medidor_lawfare/`, `data/`, CLI `medidor` |
| **Centro de datos (Prensa)** | Registro público de resultados del artefacto aplicado | `data/catalog.json`, `public/prensa/` |

La web se **genera** con Jinja2 a `public/` y se publica vía GitHub Pages. El flujo es:

```
data/ (JSON) + site/ (plantillas Jinja2 + CSS) → medidor build → public/ → GitHub Pages
```

Tres portales: **índice** (`public/index.html`), **prensa** (`public/prensa/`), **FOSS** (`public/foss/`).

---

## Qué es BOT_ALEPH hoy

BOT_ALEPH es un **sistema de skills + corpus** local en [SCRIPTORIUM/BOT_ALEPH](file:///Users/morente/Desktop/SCRIPTORIUM/BOT_ALEPH/) con esta estructura:

| Componente | Path | Función |
|------------|------|---------|
| **Skills** | `.cursor/skills/modo-aleph/`, `linea-aleph-browser/` | Procedimiento operativo (pipeline, AutoRevisor, engines) |
| **Engines** | `engines/` (main + A–F) | Forces de Cohen — condiciones de forcing con lore |
| **Corpus sima** | `sima-aleph/` | Cota 0 (ruptura) |
| **Corpus cima** | `cima-aleph/` | Cota 1 (confluencia) |
| **Linea-aleph** | `linea-aleph/` | Eje histórico de demarcación (615k manifest, ~600k registros Wikipedia) |
| **Logs-aleph** | `logs-aleph/` | Bitácora del tablero (sesiones originales) |
| **Logs-skill** | `logs-skill/` | Bitácora del desarrollo del skill |
| **Aleph-context** | `aleph-context/` | Estado del tablero: perfiles, hot.md, engines-active, posición-linea |

Todo esto es **corpus local sin paquete Python, sin CLI, sin web pública**.

---

## Visión de producto para `network-engine`

### Nombre propuesto

**Network Engine** — motor de red epistemológica y forcing.

### Las dos caras

| Cara | Análogo MEDIDOR | Qué contiene en network-engine |
|------|-----------------|-------------------------------|
| **Artefacto FOSS** | `medidor_lawfare/` + `docs/metodologia/` + `public/foss/` | El **motor Python** (skill, engines, segment), la **metodología** (Modo Aleph, AutoRevisor, cotas, forces Cohen), y la documentación FOSS publicada |
| **Exhibición** | `public/prensa/` + `data/catalog.json` | **Catálogo** de sesiones del tablero, fichas de engine, escenas ancla, evaluaciones — material generado publicable |

### La metáfora adaptada

| MEDIDOR-LAWFER | NETWORK-ENGINE |
|----------------|----------------|
| Ejes de lawfare (5 observables) | Ejes del tablero (sima ↔ cima, forces, posición-linea) |
| Buffer MCS-N | Sesión Aleph (asentamiento + autorevisor + tablero) |
| Cribado epistemológico L0–L3 | AutoRevisor + capas psiconálisis §1–6 |
| Medición Mn → intensidad 0–10 | Sesión → posición-linea 0.0–1.0 + engines-active |
| Delta entre mediciones | Delta entre sesiones (hot.md) |
| Catálogo (catalog.json) | Catálogo de sesiones + engines + evaluaciones |
| Caso (zapatero-plus-ultra) | Semilla / tema recurrente del tablero |

---

## Estructura propuesta del repositorio

```
network-engine/                          ← raíz del repo GitHub
├── README.md
├── LICENSE                              (GPL-3.0)
├── CITATION.cff
├── CHANGELOG.md
├── pyproject.toml                       ← paquete "network-engine"
├── llms.md                              ← contexto para agentes LLM
│
├── network_engine/                      ← paquete Python
│   ├── __init__.py
│   ├── paths.py                         ← rutas (patrón MEDIDOR)
│   ├── cli/
│   │   ├── main.py                      ← CLI: `nengine`
│   │   ├── build.py                     ← nengine build → public/
│   │   ├── catalog.py                   ← nengine catalog sync
│   │   ├── session.py                   ← nengine session init/commit
│   │   └── pack.py                      ← nengine pack
│   ├── tablero/                         ← motor del tablero
│   │   ├── posicion.py                  ← arco sima ↔ cima (0.0–1.0)
│   │   ├── engines.py                   ← selección/activación de forces
│   │   ├── autorevisor.py               ← checklist simétrico
│   │   └── eigenstate.py                ← psiconálisis §1–6
│   ├── catalog/
│   │   └── sync.py                      ← sincronización catálogo
│   └── site/                            ← contexto Jinja (exhibición, FOSS)
│       ├── brand.py
│       ├── foss_context.py
│       └── exhibicion_context.py
│
├── data/                                ← fuente de verdad
│   ├── engines/                         ← engine.json + manifest por engine
│   ├── corpus/                          ← metadata de sima, cima, linea, logs
│   ├── sessions/                        ← sesiones del tablero (estado)
│   ├── catalog.json                     ← índice de exhibición (generado)
│   └── schema/                          ← JSON schemas
│
├── docs/
│   ├── metodologia/                     ← marco teórico, ejes, AutoRevisor, forces
│   ├── prompts/                         ← plantillas para agentes externos
│   └── sesiones/                        ← bitácora conversacional
│
├── site/                                ← plantillas Jinja2 + CSS (fuente)
│   ├── brand.json
│   ├── assets/
│   └── templates/
│       ├── _partials/
│       ├── root/
│       ├── foss/                        ← operación, esquemas, devops, licencia
│       └── exhibicion/                  ← catálogo, fichas de engine, escenas
│
├── public/                              ← salida generada → GitHub Pages
│   ├── index.html
│   ├── foss/
│   └── exhibicion/
│
├── tests/
│
└── .github/
    └── workflows/
        └── pages.yml                    ← deploy public/ a GitHub Pages
```

---

## Portales web (tres portales, patrón MEDIDOR)

| Portal | Ruta | Contenido |
|--------|------|-----------|
| **Índice** | `public/index.html` | Puerta de entrada a exhibición y FOSS |
| **Exhibición** | `public/exhibicion/` | Catálogo de sesiones, fichas de engine, escenas ancla, evaluaciones |
| **Artefacto (FOSS)** | `public/foss/` | Operación del motor, esquemas, metodología, devops, licencia |

### Páginas FOSS (análogas a MEDIDOR)

| Página | Contenido |
|--------|-----------|
| `foss/index.html` | Visión general del artefacto |
| `foss/tecnico.html` | Arquitectura del motor: tablero, forces Cohen, cotas |
| `foss/funcional.html` | Pipeline operativo: boot → asentamiento → autorevisor → tablero |
| `foss/metodologia.html` | Marco teórico: Modo Aleph, objetividad sistémica, psiconálisis |
| `foss/devops.html` | CLI, GitHub Pages, workflows |
| `foss/LICENSE.html` | Licencia |

### Páginas Exhibición

| Página | Contenido |
|--------|-----------|
| `exhibicion/index.html` | Catálogo de sesiones publicadas |
| `exhibicion/engine/{id}.html` | Ficha de engine (ancla, escenas, triggers, pairs) |
| `exhibicion/sesion/{id}.html` | Ficha de sesión del tablero (semilla, posición, forces activos) |
| `exhibicion/downloads/` | Paquetes ZIP de datos |

---

## CLI propuesto: `nengine`

```bash
# Iniciar nueva sesión del tablero
nengine session init --semilla "concepto-o-fecha"

# Confirmar sesión con posición y forces
nengine session commit --posicion 0.42 --forces A,E

# Sincronizar catálogo desde sesiones/engines
nengine catalog sync

# Regenerar sitio (no editar public/ a mano)
nengine build --target all    # exhibicion + foss
nengine build --target foss
nengine build --target exhibicion

# Paquetes ZIP
nengine pack --engine A
nengine pack --sesion s01
```

---

## Reutilización de infraestructura MEDIDOR

> [!IMPORTANT]
> El usuario pregunta si se puede reaprovechar la infra de `public/` y el build. Análisis:

### Qué se puede copiar directamente

| Componente | ¿Reutilizable? | Notas |
|------------|----------------|-------|
| `paths.py` | ✅ Copiar y adaptar | Misma lógica PROJECT_ROOT/DATA_DIR/PUBLIC_DIR |
| `cli/build.py` estructura | ✅ Copiar esqueleto | `build_foss()`, `build_exhibicion()`, `build_root()`, `_jinja_env()`, `_copiar_assets()` |
| `site/brand.py` | ✅ Copiar | `brand_context()` + `provenance_context()` idénticos |
| `site/foss_context.py` | ✅ Adaptar | Cambiar ejes/MCS-N por engines/tablero |
| Plantillas Jinja `_partials/` | ✅ Copiar base | Header/footer/nav reutilizables |
| Plantillas `foss/*.html` | ✅ Copiar y adaptar | Misma estructura de portal |
| `pages.yml` workflow | ✅ Copiar idéntico | Deploy `public/` a GitHub Pages |
| `pyproject.toml` | ✅ Copiar esqueleto | Cambiar nombre, deps, CLI entry |
| CSS/assets | ✅ Copiar base | Misma paleta Scriptorium/FARO |

### Qué NO se comparte (lógica de dominio)

| Componente | Razón |
|------------|-------|
| `medidor_lawfare/motor/` | Ejes de lawfare ≠ tablero Aleph |
| `medidor_lawfare/mcn/` | Cribado MCS-N ≠ AutoRevisor |
| `medidor_lawfare/rdb/` | Estado+deltas de mediciones ≠ sesiones |
| `medidor_lawfare/catalog/` | Catálogo de mediciones ≠ catálogo de engines/sesiones |
| `site/prensa_context.py` | Contexto específico de mediciones |
| Plantillas `prensa/*.html` | Fichas de medición/caso ≠ fichas de engine/sesión |

### Futuro: paquete base compartido

> [!NOTE]
> El usuario menciona que en el futuro podría crear un **paquete base** si ambos proyectos evolucionan en paralelo. Esto tiene sentido para:
>
> - `paths.py` → patrón genérico `ProjectPaths`
> - `brand.py` → loader de `brand.json` + `provenance_context()`
> - `cli/build.py` → esqueleto genérico de build Jinja → public/
> - `pages.yml` → workflow reutilizable
> - `_partials/` → templates compartidos (header, footer, nav Scriptorium)
> - CSS base → design system Scriptorium
>
> **Recomendación:** por ahora, copiar. Cuando haya un tercer sensor en SENSORES, extraer el paquete base (`scriptorium-site-base` o similar).

---

## Mapeo corpus BOT_ALEPH → data/ en network-engine

> [!WARNING]
> El corpus actual en BOT_ALEPH/SCRIPTORIUM es **grande** (615k manifest de linea-aleph, sesiones raw extensas). El repo `network-engine` debe contener la **metadata y el artefacto**, no necesariamente todo el raw. Decidir qué se incluye como dato publicable vs. qué queda en SCRIPTORIUM local.

| Corpus local (BOT_ALEPH) | → data/ en network-engine | ¿Incluir raw? |
|--------------------------|---------------------------|---------------|
| `engines/` (manifest, engine.json, INDICE) | `data/engines/` | ✅ metadata; raw opcional |
| `aleph-context/` | `data/context/` (schemas, templates) | ✅ templates; no perfiles operativos |
| `logs-aleph/` | `data/corpus/logs-aleph/` | Solo manifest + INDICE como referencia |
| `sima-aleph/` | `data/corpus/sima/` | Solo manifest + INDICE |
| `cima-aleph/` | `data/corpus/cima/` | Solo manifest + INDICE |
| `linea-aleph/` | `data/corpus/linea/` | Solo manifest + ontology-seeds |
| `.cursor/skills/modo-aleph/` | `docs/metodologia/` | ✅ como documentación FOSS |

---

## Fases de ejecución

### Fase 1: Inicialización del repo

1. Clonar `network-engine` vacío
2. Crear estructura de directorios
3. Copiar infraestructura de MEDIDOR (paths, brand, build, pages.yml, pyproject, templates base)
4. Adaptar al dominio network-engine

### Fase 2: Motor Python (`network_engine/`)

1. `paths.py` adaptado
2. `tablero/` — posición, engines, autorevisor, eigenstate
3. `catalog/sync.py` — sincronizar catálogo de sesiones + engines
4. `cli/` — main, build, catalog, session
5. `site/` — brand, foss_context, exhibicion_context

### Fase 3: Datos (`data/`)

1. Migrar metadata de engines (engine.json, manifest, INDICE)
2. Crear schemas (engine.schema.json, session.schema.json, catalog.schema.json)
3. Crear catálogo inicial (catalog.json)
4. Migrar punteros a corpus (no raw completo)

### Fase 4: Web (`site/` + `public/`)

1. `brand.json` adaptado (producto = Network Engine)
2. Templates FOSS (copiar y adaptar de MEDIDOR)
3. Templates exhibición (nuevo: fichas de engine, sesiones)
4. CSS/assets (base compartida + variaciones de producto)
5. Build y test local

### Fase 5: Documentación + publicación

1. README.md
2. llms.md (contexto para agentes)
3. CITATION.cff, CHANGELOG.md
4. Activar GitHub Pages
5. Primera build → public/ → push

---

## Open Questions

> [!IMPORTANT]
> ### 1. Nombre del portal de exhibición
> En MEDIDOR es "prensa" (centro de datos de mediciones). Para BOT_ALEPH, ¿cómo nombrar el portal público? Opciones:
> - **`exhibicion/`** — neutral, como galería de material
> - **`tablero/`** — coherente con la metáfora del tablero
> - **`archivo/`** — enfatiza el carácter de registro
> - **`prensa/`** — mantener el mismo nombre para consistencia de producto

> [!IMPORTANT]
> ### 2. ¿Qué raw se publica?
> El corpus BOT_ALEPH tiene ~3400 líneas de escenas segmentadas + 615k líneas en linea-aleph. ¿Publicar solo metadata (manifests + INDICE) o también escenas ancla completas en `public/exhibicion/`?

> [!IMPORTANT]
> ### 3. ¿Incluir la skill como documentación FOSS?
> El skill modo-aleph (SKILL.md + autorevisor + cotas + engines.md) es la "metodología" del artefacto. ¿Se publica en `public/foss/` como documentación abierta, análogo a `docs/metodologia/` en MEDIDOR?

> [!IMPORTANT]
> ### 4. Serie y ARG
> En MEDIDOR, `brand.json` incluye serie "Animus Iocandi" y ARG "F.A.R.O.". ¿Network Engine pertenece a la misma serie/ARG o tiene las suyas?

> [!IMPORTANT]
> ### 5. Dónde vive el repo localmente
> ¿El repo `network-engine` se clona dentro de `SCRIPTORIUM/SENSORES/` (junto a MEDIDOR-LAWFER) o fuera? La estructura actual sugiere que cada "sensor" es un subdirectorio de SENSORES.

---

## Verification Plan

### Automated Tests

```bash
# Instalar en modo desarrollo
pip install -e ".[dev]"

# Tests de regresión
pytest

# Build completo
nengine build --target all

# Verificar que public/ contiene los tres portales
ls public/index.html public/foss/index.html public/exhibicion/index.html
```

### Manual Verification

- Abrir `public/index.html` en navegador local — verificar tres portales navegables
- Push a `main` — verificar deploy automático a GitHub Pages
- Verificar que las fichas de engine renderizan correctamente datos de `data/engines/`
