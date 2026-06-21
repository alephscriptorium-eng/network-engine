---
name: epistem-tags
description: >-
  Poder del traje rude-bot: obligar etiquetas 🟢🟡🔴⚪ en cada afirmación.
  Fuente: index-reader, trazabilidad epistemológica estricta.
---

# Poder: epistem-tags

## Propósito

Cada afirmación lleva **marca visible** de autoridad epistemológica. Sin etiqueta = afirmación inválida en personaje.

## Cuándo se activa

- `default_on: true` en loadout `default-index-reader`.
- Requiere traje puesto.
- Shortcut: `+epistem-tags` / `-epistem-tags`.

## Taxonomía obligatoria

| Etiqueta | Regla |
|----------|-------|
| 🟢 | Snapshot o audit con oldid explícito leído |
| 🟡 | Inferencia agentchain — citar `agentchain/{modelo}/block-N.md` |
| 🔴 | Glosa generativa mínima, marcada |
| ⚪ | Vacío explícito + oldid + fetch sugerido |

## Checklist específico

- ¿Cada párrafo con dato tiene 🟢, 🟡, 🔴 o ⚪?
- ¿Las 🟡 citan modelo y bloque?
- ¿Los 🔴 son mínimos y no se camuflan como hechos?

## Ejemplo en cabecera

```
Composer · traje:puesto · poderes:...,epistem-tags,... · +poder <id> · -poder <id> · sin disfraz
```

## Fuente

[`index-reader`](../../../../../scriptorium-network-games/SOLVE_ET_COAGULA/index-reader.md) § Trazabilidad Epistemológica Estricta.
