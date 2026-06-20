# llms.md — Contexto para agentes LLM

Documento de onboarding para cualquier LLM que trabaje en este repositorio. **Leer antes de tocar código o datos.**

**Indexar engine →** [`engines/RUNBOOK-indexar.md`](engines/RUNBOOK-indexar.md)

Repositorio: https://github.com/alephscriptorium-eng/network-engine  
Web (cuando Pages esté activo): https://alephscriptorium-eng.github.io/network-engine

---

## Qué es este proyecto

**Network Engine** (`network-engine` v0.1.0) — **artefacto** FOSS (GPL-3.0 + Animus Iocandi; AIGPL v4 pendiente — ver `LICENSE-ANIMUS-IOCATI.md` en raíz del workspace) + **centro de datos** prensa para el tablero Aleph.

- El **artefacto** opera loadouts, forces Cohen, cotas sima/cima y AutoRevisor.
- El **centro de datos** (`public/prensa/`, `data/catalog.json`) indexa engines, corpus y sesiones; el raw permanece **in situ**.

**Anti-duplicación:** no copiar `engines/`, `logs-aleph/`, etc. a `data/`. Prensa enlaza `blob/main` al mismo repo.

---

## Estructura del repositorio

```
engines/ logs-aleph/ sima-aleph/ cima-aleph/ linea-aleph/ logs-skill/  # corpus in situ
aleph-context/          # estado operativo del tablero
agents/skills/modo-aleph/   # skill operativa (agents/skills en repo)
data/
  catalog.json          # generado: nengine catalog sync
  loadouts/             # default-tablero.json
  profiles/             # composer.json
  schema/               # JSON Schemas
  sessions/             # sesiones publicadas prensa
network_engine/         # paquete Python
  tablero/              # loadout, engines, posicion, autorevisor
  catalog/              # sync.py
  cli/                  # nengine
  site/                 # contexto Jinja
site/                   # plantillas + assets
public/                 # generado: nengine build (NO editar a mano)
docs/prompts/           # prompts operativos
docs/metodologia/       # puntero a modo-aleph skill
```

---

## CLI principal

```bash
pip install -e ".[dev]"
nengine loadout validate default-tablero
nengine loadout apply default-tablero --semilla "tema"
nengine session init --loadout default-tablero --semilla "tema"
nengine session commit --session-id 2026-06-19-tema --posicion 0.42 --forces A,E
nengine session publish --session-id 2026-06-19-tema
nengine pack --session 2026-06-19-tema
nengine pack --loadout default-tablero
nengine catalog sync
nengine build --target all
pytest
```

---

## Ciclo tablero (resumen)

1. Equipar loadout (`equipar_loadout.prompt.md`)
2. ASENTAMIENTO + semilla (`iniciar_turno.prompt.md`)
3. Calibrar cotas (`calibrar_cotas.prompt.md`)
4. Activar ≤2 forces (`activar_forces.prompt.md`)
5. AutoRevisor checklist A–H
6. Publicar sesión opcional (`publicar_sesion_prensa.prompt.md`)

---

## Reglas críticas

- **main-engine siempre ON**; máx. 2 forces Cohen por sesión.
- **public/prensa/** no **exhibicion/**.
- Solo oleada integración modifica `network_engine/cli/build.py` para ensamblar targets.
- Skills del IDE: `agents/skills/` es la fuente canónica en el repositorio.

---

## CI / GitHub Pages

Workflow: `.github/workflows/pages.yml` — push a `main` sube `public/`. Activar Pages → Source: GitHub Actions.

---

## Referencias

- Metodología: `agents/skills/modo-aleph/SKILL.md` (copia en `docs/metodologia/`)
- Plan maestro archivado: `logs-skill/raw/archive-plan3.md` (ex-PLAN3 GENESIS)
- Archivos genesis: `logs-skill/raw/archive-plan2.md`, `archive-reunification.md`
- Patrón build: MEDIDOR-LAWFER (`medidor build`)
