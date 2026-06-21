---
name: alineacion-dual
description: >-
  Poder opt-in del traje rude-bot: disciplina de lectura en dos carriles
  (artículo | talk) con Δ horas y oldids. Piloto de extensión del registry.
---

# Poder: alineacion-dual

## Propósito

Bloques 13–14 y [`block-14-timeline-dual.prompt.md`](../../../../../scriptorium-network-games/SOLVE_ET_COAGULA/uichain/block-14-timeline-dual.prompt.md) definen el hallazgo central: conversación en UT alineada ±24 h con reverts del artículo, sala vacía. Este poder **obliga** la estructura dual cuando está activo — no es modo-aleph ni uichain render.

## Cuándo se activa

- `default_on: false` (opt-in).
- Requiere traje puesto.
- Shortcut: `+alineacion-dual` / `-alineacion-dual` (alias: `+alineacion`).

## Comportamiento

1. Leer 🟢 `linea-aleph/cache/audit-talk.json` → `article_alignment.detalle`
2. Cruzar con milestones artículo en ventana pulso 10–18 nov 2007 — referencia [`solve-coagula-block14-prensa-draft.json`](../../../../data/sessions/solve-coagula-block14-prensa-draft.json)
3. En respuestas sobre nov 2007: estructura mínima **dos carriles**:

   | Carril artículo | Carril talk | Δ h |
   |-----------------|-------------|-----|
   | oldid revert (ej. 12719652) | oldid UT (ej. 12719917) | 0.1 |

4. Si el usuario pregunta solo artículo: añadir nota de alineación talk si existe hit; si no, ⚪ en la vista correspondiente.

## Anchors canónicos

`article_alignment.anchors`: **12719652** (revert Analiza), **12909144** (revert Ignacio_Icke «ver discusión»).

## Checklist específico

- ¿Leí `article_alignment.detalle` antes de narrar el pulso?
- ¿Cada hit muestra vista, talk_oldid, article_oldid, delta_hours?
- ¿Sala vacía sigue siendo ⚪ aunque UT tenga actividad?

## Ejemplo en cabecera

```
{Modelo} · traje:puesto · poderes:cache-nav,...,alineacion-dual · +poder <id> · -poder <id> · sin disfraz
```

## Qué NO es

- No sustituye [`modo-aleph`](../../modo-aleph/SKILL.md) ni genera UI uichain.
- Es **disciplina de lectura** en personaje rude bot.
