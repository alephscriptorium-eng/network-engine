---
scene_id: s05-02
session: sesion-05-genesis-network-engine
source_file: raw/log-agent3.md
layer: output
tags: [genesis, network-engine, GENESIS_PLAN, archivo, auditoria]
anomalies: [plan_md_supersedido_por_plan2_plan3]
---
## Veredicto PLAN2

**Conservar** como registro histórico del contraplan (juego, loadout, `prensa/`, FOSS estricto). Pendientes compartidos con PLAN3.

## Fases PLAN2 §238–263

| Fase | Ítem clave | Estado | Decisión |
|------|-----------|--------|----------|
| 0 | `PLAN-CONTRAPLAN.md` en raíz | **No** | **Descartar** ruta; vive en `GENESIS_PLAN/PLAN2.md` |
| 0 | Dejar PLAN.md intacto | Obsoleto | PLAN.md archivado s05-01 y borrado |
| 1 | Infra MEDIDOR | **Hecho** | paths, build, brand, pages.yml, _partials |
| 2 | loadout schema + CLI | **Parcial** | schema ✅; **`apply` persistencia pendiente** |
| 3 | catalog + prensa | **Hecho** | equipamiento, engines, corpus, tablero ✅ |
| 3 | `prensa/sesiones/` | **No** | **Aplicar** |
| 4 | FOSS estricto | **Hecho** | llms, 6 prompts, foss pages |
| 5 | build + Pages | **Parcial** | build local ✅; deploy remoto pendiente |

## Mapeo corpus — nominal vs in situ

| PLAN2 propone | Real en BOT_ALEPH | Decisión |
|---------------|-------------------|----------|
| `data/engines/` | `engines/` in situ | **Descartar** mover |
| `data/corpus/` | `*-aleph/`, `logs-skill/` in situ | **Descartar** mover |
| `data/loadouts/` | `data/loadouts/` | **Hecho** |
| `data/profiles/` | `data/profiles/` + `aleph-context/profiles/` | **Parcial** |
| Portal `prensa/` | `public/prensa/` | **Hecho** |
| Showcase traje rude-bot | `prensa/equipamiento/` | **Hecho** |

## Decisiones contraplan ganadoras vs PLAN.md

| Tema | PLAN2 | Estado código |
|------|-------|---------------|
| Portal | `prensa/` no `exhibicion/` | ✅ |
| Activación | Loadout instantáneo | ⚠️ parcial |
| Metáfora | Traje rude-bot | ✅ equipamiento showcase |
| FOSS | Clon MEDIDOR | ✅ 6 páginas foss |

## Pendientes post-cierre (PLAN2 + PLAN3)

- `nengine loadout apply` persistente
- `prensa/sesiones/` + `downloads/`
- `nengine session` / `nengine pack`
- Deploy GitHub Pages remoto
