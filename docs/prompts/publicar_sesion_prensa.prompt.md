# Prompt — Publicar sesión prensa (agente externo)

Plantilla para depositar una sesión calibrada en `data/sessions/` para que el build prensa la indexe. Sustituir variables entre `{{…}}`.

---

## Variables

| Variable | Ejemplo |
|----------|---------|
| `{{session_id}}` | `sesion-2026-06-19-composer-ilustracion` |
| `{{title}}` | `La Ilustración Oscura — turno composer` |
| `{{profile_slug}}` | `composer` |
| `{{loadout_id}}` | `default-tablero` |
| `{{semilla}}` | `La Ilustración Oscura cancela la carta de derechos` |

---

## BLOQUE PARA EL AGENTE

Necesito **publicar una sesión** en el Network Engine para prensa:

- **ID:** `{{session_id}}`
- **Título:** {{title}}
- **Loadout:** `{{loadout_id}}`
- **Perfil:** `{{profile_slug}}`
- **Semilla:** {{semilla}}

---

### Estructura a crear

```
data/sessions/{{session_id}}/
  session.json
  asentamiento.md
  respuesta.md
```

### session.json (validar con `data/schema/session.schema.json`)

```json
{
  "session_id": "{{session_id}}",
  "title": "{{title}}",
  "profile_slug": "{{profile_slug}}",
  "profile_ref": "data/profiles/{{profile_slug}}.json",
  "created_at": "2026-06-19T12:00:00Z",
  "semilla": "{{semilla}}",
  "loadout_id": "{{loadout_id}}",
  "status": "draft",
  "asentamiento_path": "asentamiento.md",
  "respuesta_path": "respuesta.md"
}
```

**Alternativa CLI (preferida):**

```bash
nengine session init --loadout {{loadout_id}} --semilla "{{semilla}}"
# editar asentamiento.md y respuesta.md
nengine session commit --session-id {{session_id}} --posicion 0.42 --forces A,E
nengine session publish --session-id {{session_id}}
nengine pack --session {{session_id}}
```

### Contenido

1. **asentamiento.md** — bloque `<!-- ASENTAMIENTO_ALEPH -->` completo del turno.
2. **respuesta.md** — constelación del tablero (sin cierre lineal enciclopédico).

---

### Después de escribir archivos

```bash
nengine catalog sync
nengine build --target prensa
```

---

### Reglas

- No duplicar corpus; enlazar escenas vía paths relativos al repo.
- La sesión es **ilustrativa** del tablero, no sustituye el artefacto.
- Sin ASENTAMIENTO no hay sesión publicable.

---

## FIN DEL PROMPT
