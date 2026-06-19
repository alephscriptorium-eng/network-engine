# Prompt — Iniciar turno

Plantilla para el turno del tablero tras equipamiento. Variables: `{{loadout_id}}`, `{{semilla}}`.

---

## BLOQUE PARA EL AGENTE

Loadout activo: **`{{loadout_id}}`**  
Semilla del turno: **{{semilla}}**

1. Carga `aleph-context/hot.md` + perfil + `engines-active.json`
2. AutoRevisor (checklist A–H) **antes** del análisis
3. Fetch bajo demanda: 1 ancla sima + 1 ancla cima si cotas activas
4. Forces activos: leer 1 escena ancla por force
5. Salida: constelación en el arco; no colapsar (∅ opcional)
6. Actualizar `hot.md` (≤30 líneas) y `sessions/` si aplica

---

## FIN DEL PROMPT
