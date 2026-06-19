# Prompt — Calibrar cotas (agente externo)

Plantilla para calibrar el eje vertical **sima ↔ cima** y persistir `posicion-linea.json`. Sustituir variables entre `{{…}}`.

---

## Variables

| Variable | Ejemplo |
|----------|---------|
| `{{semilla}}` | `diamat, ciclo vital, ¿hay ciencia universal sin envejecer?` |
| `{{profile_slug}}` | `composer` |

---

## BLOQUE PARA EL AGENTE

Estoy en **modo tablero** del Network Engine. Necesito **calibrar cotas** para la semilla:

- **Semilla:** {{semilla}}
- **Perfil:** `aleph-context/profiles/{{profile_slug}}.json` (o `data/profiles/{{profile_slug}}.json`)

---

### Qué debes leer

1. `agents/skills/modo-aleph/cotas.md` — definición sima (0) y cima (1).
2. Escena ancla **sima** en `sima-aleph/` (manifest + 1 escena).
3. Escena ancla **cima** en `cima-aleph/` (manifest + 1 escena).
4. `aleph-context/posicion-linea.json` si existe — no sobrescribir sin justificar.

---

### Qué debe contener tu respuesta

1. **Lectura sima** — extracto corto + por qué ancla el suelo ontológico.
2. **Lectura cima** — extracto corto + por qué ancla el horizonte.
3. **Posición numérica** `0.0–1.0` con justificación (no default 0.5 sin argumento).
4. **JSON propuesto** para `aleph-context/posicion-linea.json`:

```json
{
  "posicion": 0.42,
  "semilla": "{{semilla}}",
  "ancla_sima": "sima-aleph/...",
  "ancla_cima": "cima-aleph/...",
  "nota": "..."
}
```

5. Actualizar `aleph-context/hot.md` (≤30 líneas) con cotas + engines activos.

---

### Reglas

- No colapsar sima y cima en una sola mirada.
- La posición es **del turno**, no universal.
- Validar rango: `nengine loadout validate default-tablero` si hay loadout activo.

---

## FIN DEL PROMPT
