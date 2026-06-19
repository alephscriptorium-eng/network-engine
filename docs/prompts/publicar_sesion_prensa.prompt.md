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
  meta.json
  asentamiento.md
  respuesta.md
```

### meta.json (validar con `data/schema/session.schema.json`)

```json
{
  "id": "{{session_id}}",
  "title": "{{title}}",
  "profile_slug": "{{profile_slug}}",
  "created_at": "2026-06-19T12:00:00Z",
  "semilla": "{{semilla}}",
  "loadout_id": "{{loadout_id}}",
  "asentamiento_path": "data/sessions/{{session_id}}/asentamiento.md",
  "respuesta_path": "data/sessions/{{session_id}}/respuesta.md"
}
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
