# Metodología modo-aleph

Documentación operativa del tablero Aleph. **Fuente canónica:**

```
agents/skills/modo-aleph/
agents/skills/disfraz-rude-bot/
```

## Archivos principales

| Archivo | Función |
|---------|---------|
| `SKILL.md` | Modo tablero, pipeline, reglas |
| `engines.md` | Boot main-engine + presupuesto forces |
| `cotas.md` | Eje sima ↔ cima |
| `autorevisor.md` | Checklist A–H |
| `asentamiento-plantilla.md` | Plantilla ASENTAMIENTO |

### disfraz-rude-bot

| Archivo | Función |
|---------|---------|
| `SKILL.md` | Traje rude bot, cabecera, shortcuts, hot file |
| `poderes/registry.yaml` | Catálogo extensible de poderes |
| `poderes/{id}/SKILL.md` | Módulos (cache-nav, epistem-tags, alineacion-dual, …) |
| `loadouts/default-index-reader.json` | Poderes ON por defecto |
| `checklist.md` | Revisión en personaje (A–G) |
| `ejemplos.md` | Cabecera, +alineacion, opt-out |
| `templates/reader-traje.hot.md` | Plantilla estado traje entre turnos |

**Extensión:** añadir entrada en `poderes/registry.yaml` + `poderes/{id}/SKILL.md`; opcional en `loadouts/*.json` como `poderes_optional`. Piloto opt-in: `alineacion-dual` (carril artículo | talk).

## Cursor

Los skills viven en `agents/skills/`; configura el IDE para leer esa ruta si hace falta.

## FOSS

El portal `public/foss/` enlaza estos archivos vía `github_blob()`; no se duplican en `public/`.
