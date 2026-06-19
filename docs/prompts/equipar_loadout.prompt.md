# Prompt — Equipar loadout

Plantilla para aplicar un loadout serializado al agente. Sustituir `{{loadout_id}}` y `{{semilla}}`.

---

## Variables

| Variable | Ejemplo |
|----------|---------|
| `{{loadout_id}}` | `default-tablero` |
| `{{semilla}}` | tema del turno del usuario |

---

## BLOQUE PARA EL AGENTE

Equipa el tablero Aleph con el loadout **`{{loadout_id}}`**:

1. Ejecuta (o simula) `nengine loadout validate {{loadout_id}}`
2. Lee el skill en `agents/skills/modo-aleph/SKILL.md`
3. Carga el perfil referenciado en el loadout
4. Boot main-engine: escena `01-aspirate-a-esteta`
5. Lee escenas ancla del loadout
6. Emite bloque `ASENTAMIENTO_ALEPH` con semilla: **{{semilla}}**

No analices el tema hasta completar el ASENTAMIENTO.

---

## FIN DEL PROMPT
