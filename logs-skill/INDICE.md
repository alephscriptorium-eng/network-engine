# INDICE — logs-skill (meta-corpus)

## Visión

Corpus de la **sesión de diseño**: construcción de `logs-aleph/`,
`linea-aleph/`, lectura epistemológica del diamat, y refactor del skill
`modo-aleph` (tablero + AutoRevisor). Fuente: [`raw/log-agent1.md`](raw/log-agent1.md).
Plan: [`raw/log-agent2.md`](raw/log-agent2.md).

Activación del bucle eval: [`aleph-context/ACTIVACION.md`](../aleph-context/ACTIVACION.md).

## Tabla de escenas

| ID | Escena | Resumen | Tags |
|----|--------|---------|------|
| [s01-01](sesion-01-corpus-logs-aleph/01-plan-corpus-logs/) | [01-plan-corpus-logs](sesion-01-corpus-logs-aleph/01-plan-corpus-logs/) | Plan corpus logs-aleph | `plan`, `logs-aleph`, `corpus` |
| [s01-02](sesion-01-corpus-logs-aleph/02-build-e-implementacion/) | [02-build-e-implementacion](sesion-01-corpus-logs-aleph/02-build-e-implementacion/) | Build e implementación logs-aleph | `build`, `segment_logs`, `logs-aleph` |
| [s01-03](sesion-01-corpus-logs-aleph/03-notificacion-subagente/) | [03-notificacion-subagente](sesion-01-corpus-logs-aleph/03-notificacion-subagente/) | Notificación subagente (meta) | `subagent`, `meta`, `notification` |
| [s01-04](sesion-01-corpus-logs-aleph/04-migracion-autocontenida/) | [04-migracion-autocontenida](sesion-01-corpus-logs-aleph/04-migracion-autocontenida/) | Migración autocontenida (incompleta) | `migracion`, `verify`, `logs-aleph` |
| [s02-01](sesion-02-linea-aleph/01-infra-navegador-cache/) | [01-infra-navegador-cache](sesion-02-linea-aleph/01-infra-navegador-cache/) | Infra linea-aleph + navegador-caché | `linea-aleph`, `skill-browser`, `demarcacion` |
| [s03-01](sesion-03-lectura-epistemologia/01-asimetria-diamat-logs-s02/) | [01-asimetria-diamat-logs-s02](sesion-03-lectura-epistemologia/01-asimetria-diamat-logs-s02/) | Asimetría diamat en logs-aleph s02 | `diamat`, `epistemologia`, `asimetria`, `logs-aleph` |
| [s03-02](sesion-03-lectura-epistemologia/02-ciclo-vital-ciencias-universales/) | [02-ciclo-vital-ciencias-universales](sesion-03-lectura-epistemologia/02-ciclo-vital-ciencias-universales/) | Ciclo vital y ciencias universales | `diamat`, `ciclo-vital`, `demarcacion`, `linea-aleph` |
| [s04-01](sesion-04-skill-modo-aleph/01-autorevisor-tablero-skill/) | [01-autorevisor-tablero-skill](sesion-04-skill-modo-aleph/01-autorevisor-tablero-skill/) | AutoRevisor, tablero, refactor skill | `modo-aleph`, `autorevisor`, `skill-design`, `fundacional` |

## Anomalías

- **s01-03**: turno `system_notification`, no prompt usuario limpio.
- **s01-04**: migración verificada fuera del export (interrumpido).
- **s04-01**: primer `ASENTAMIENTO_ALEPH` canónico → `asentamiento.md`.

## Capas por escena

| Capa | Contenido |
|------|-----------|
| `prompt.md` | Usuario |
| `trace.md` | Narrativa operativa Cursor |
| `output.md` | Respuesta sustantiva |
| `meta.md` | Notifications / preferencias plan |
| `think.md` | Stub: export sin think interno |

## Estructura

```
logs-skill/
├── raw/log-agent1.md | log-agent2.md (plan)
├── segment_skill_log.py
├── manifest.json
├── INDICE.md
└── sesion-*/
```

Regenerar: `python3 segment_skill_log.py`

## Detalle por escena

### [01-plan-corpus-logs](sesion-01-corpus-logs-aleph/01-plan-corpus-logs/)
**Tema:** Plan corpus logs-aleph
- [prompt](sesion-01-corpus-logs-aleph/01-plan-corpus-logs/prompt.md) · [trace](sesion-01-corpus-logs-aleph/01-plan-corpus-logs/trace.md) · [output](sesion-01-corpus-logs-aleph/01-plan-corpus-logs/output.md)

### [02-build-e-implementacion](sesion-01-corpus-logs-aleph/02-build-e-implementacion/)
**Tema:** Build e implementación logs-aleph
**Anomalías:** build_e_implement_fusionados_dos_turnos_export
- [prompt](sesion-01-corpus-logs-aleph/02-build-e-implementacion/prompt.md) · [trace](sesion-01-corpus-logs-aleph/02-build-e-implementacion/trace.md) · [output](sesion-01-corpus-logs-aleph/02-build-e-implementacion/output.md)

### [03-notificacion-subagente](sesion-01-corpus-logs-aleph/03-notificacion-subagente/)
**Tema:** Notificación subagente (meta)
**Anomalías:** turno_es_system_notification_no_usuario_real
- [prompt](sesion-01-corpus-logs-aleph/03-notificacion-subagente/prompt.md) · [trace](sesion-01-corpus-logs-aleph/03-notificacion-subagente/trace.md) · [output](sesion-01-corpus-logs-aleph/03-notificacion-subagente/output.md)

### [04-migracion-autocontenida](sesion-01-corpus-logs-aleph/04-migracion-autocontenida/)
**Tema:** Migración autocontenida (incompleta)
**Anomalías:** export_interrumpido_antes_de_verificar
- [prompt](sesion-01-corpus-logs-aleph/04-migracion-autocontenida/prompt.md) · [trace](sesion-01-corpus-logs-aleph/04-migracion-autocontenida/trace.md) · [output](sesion-01-corpus-logs-aleph/04-migracion-autocontenida/output.md)

### [01-infra-navegador-cache](sesion-02-linea-aleph/01-infra-navegador-cache/)
**Tema:** Infra linea-aleph + navegador-caché
**Refs logs-aleph:** s02-01, s02-06
- [prompt](sesion-02-linea-aleph/01-infra-navegador-cache/prompt.md) · [trace](sesion-02-linea-aleph/01-infra-navegador-cache/trace.md) · [output](sesion-02-linea-aleph/01-infra-navegador-cache/output.md)

### [01-asimetria-diamat-logs-s02](sesion-03-lectura-epistemologia/01-asimetria-diamat-logs-s02/)
**Tema:** Asimetría diamat en logs-aleph s02
**Refs logs-aleph:** s02-01, s02-02
- [prompt](sesion-03-lectura-epistemologia/01-asimetria-diamat-logs-s02/prompt.md) · [trace](sesion-03-lectura-epistemologia/01-asimetria-diamat-logs-s02/trace.md) · [output](sesion-03-lectura-epistemologia/01-asimetria-diamat-logs-s02/output.md)

### [02-ciclo-vital-ciencias-universales](sesion-03-lectura-epistemologia/02-ciclo-vital-ciencias-universales/)
**Tema:** Ciclo vital y ciencias universales
**Refs logs-aleph:** s02-01, s02-06
- [prompt](sesion-03-lectura-epistemologia/02-ciclo-vital-ciencias-universales/prompt.md) · [trace](sesion-03-lectura-epistemologia/02-ciclo-vital-ciencias-universales/trace.md) · [output](sesion-03-lectura-epistemologia/02-ciclo-vital-ciencias-universales/output.md)

### [01-autorevisor-tablero-skill](sesion-04-skill-modo-aleph/01-autorevisor-tablero-skill/)
**Tema:** AutoRevisor, tablero, refactor skill
**Refs logs-aleph:** s01-02, s02-03
**Anomalías:** primer_asentamiento_aleph_canonico
- [prompt](sesion-04-skill-modo-aleph/01-autorevisor-tablero-skill/prompt.md) · [trace](sesion-04-skill-modo-aleph/01-autorevisor-tablero-skill/trace.md) · [output](sesion-04-skill-modo-aleph/01-autorevisor-tablero-skill/output.md) · [asentamiento](sesion-04-skill-modo-aleph/01-autorevisor-tablero-skill/asentamiento.md)
