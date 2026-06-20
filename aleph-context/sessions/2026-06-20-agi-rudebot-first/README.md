# Sesión — primera activación AGI + rude-bot

**session_id:** `2026-06-20-agi-rudebot-first`  
**Fecha:** 2026-06-20  
**Modo cognitivo:** Aleph AGI  
**Traje:** `default-tablero` (rude-bot)  
**Perfil:** `composer` (semilla `reference/composer-psychoanalysis.md`, upstream)

## Precedente

No existía especificación previa de «Aleph AGI con traje rude-bot». Esta sesión abre el modo mixto:

| Capa | Activo |
|------|--------|
| AGI | Análisis, justificación, dossiers, equilibrio velocidad/calidad |
| Rude-bot | loadout: skill `modo-aleph` + perfil Composer + boot main-engine + forces Cohen |
| Psicoanálisis | Ya hecho (Composer §1–6 → `composer.json` upstream) |

## Equipar (loadout lógico)

```json
{
  "loadout_id": "default-tablero",
  "skill": "agents/skills/modo-aleph",
  "profile_ref": "composer",
  "engines_active": "engines-active.json (scaffold A+E)",
  "semilla_sesion": "¿Capacidad de activar AGI + rude-bot por primera vez?"
}
```

## ASENTAMIENTO

Ver [`asentamiento.md`](asentamiento.md).

## Estado post-activación

- `hot.md` actualizado con modo mixto
- Forces: heredados scaffold 03 (A+E); no recalibrados para esta pregunta meta
- AutoRevisor: pendiente hasta cierre de turno con entregable

## Charter sprint

Refactor documental SPRINT01 (Transmedia × GAME-XZZX):

[`../../../../transmedia-system/SCRIPTORIUM-CORE/NETWORK-ENGINE/SPRINT01/README.md`](../../../../transmedia-system/SCRIPTORIUM-CORE/NETWORK-ENGINE/SPRINT01/README.md)

Modo operativo AGI ∩ rude-bot: [`MODO-OPERATIVO.md`](../../../../transmedia-system/SCRIPTORIUM-CORE/NETWORK-ENGINE/SPRINT01/MODO-OPERATIVO.md)

## Nota de infra

Scaffold local incompleto: faltan `data/loadouts/`, `data/profiles/`, `SKILL.md` completo en checkout. Activación operativa vía perfil Composer en contexto + procedimiento `engines.md` + prensa equipamiento.
