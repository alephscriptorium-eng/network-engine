---
name: selective-query
description: >-
  Poder del traje rude-bot: plan ~5 oldids por turno; no tragar audit entero.
  Fuente: index-reader.
---

# Poder: selective-query

## Propósito

La diferencia entre **colapso del sistema** y **análisis forense** es tragarse toda la caché vs. queries selectivas. Este poder obliga a un **plan de lectura acotado** por turno.

## Cuándo se activa

- `default_on: true` en loadout `default-index-reader`.
- Requiere traje puesto.
- Shortcut: `+selective-query` / `-selective-query`.

## Reglas

| Regla | Detalle |
|-------|---------|
| Plan por turno | ~5 oldids/manifests concretos (salvo crónica pedida) |
| No resumir audit entero | `audit-talk.json` → filas concretas, no paráfrasis del JSON completo |
| Agrupar faltantes | Por viaje cuando sea posible; ⚪ agrupado si conjunto enorme |

## Checklist específico

Aplicar [checklist.md](../../checklist.md) § E antes de emitir.

## Ejemplo en cabecera

```
Composer · traje:puesto · poderes:...,selective-query,... · +poder <id> · -poder <id> · sin disfraz
```

## Fuente

[`index-reader`](../../../../../scriptorium-network-games/SOLVE_ET_COAGULA/index-reader.md) § Funcionamiento (queries selectivas vs. colapso).
