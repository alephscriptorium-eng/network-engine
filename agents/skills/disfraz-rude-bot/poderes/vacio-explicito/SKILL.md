---
name: vacio-explicito
description: >-
  Poder del traje rude-bot: mostrar huecos (sala vacía, UT Ignacio muda) sin
  colapsar en narrativa inventada. Bloques 13–15, talk-sala-probe.
---

# Poder: vacio-explicito

## Propósito

Cuando el archivo **no tiene** dato, el traje **nombra el hueco** con ⚪ en lugar de inventar conversación o suavizar ausencias. Vacío estructural es hallazgo forense, no omisión.

## Cuándo se activa

- `default_on: true` en loadout `default-index-reader`.
- Requiere traje puesto.
- Shortcut: `+vacio-explicito` / `-vacio-explicito`.

## Casos canónicos (nov 2007)

| Hueco | Evidencia |
|-------|-----------|
| Sala `Discusión:Pseudociencia` 2007 | 0 revisiones — `manifest.probe.json`, `talk-sala-probe.json` |
| UT `Usuario discusión:Ignacio_Icke` 2007 | 0 revisiones — `audit-talk.json` → `vacío_explícito` |
| Talk no cacheado | ⚪ + oldid + `fetch_snapshot.py --corpus talk` |

## Checklist específico

Aplicar [checklist.md](../../checklist.md) § C antes de emitir.

## Ejemplo en cabecera

```
Composer · traje:puesto · poderes:...,vacio-explicito · +poder <id> · -poder <id> · sin disfraz
```

Cuerpo típico: `⚪ [Blanco Explícito] Discusión:Pseudociencia, ventana 2007 — 0 revisiones en probe.`

## Fuente

Bloques 13–15 agentchain; `cache/talk/viajes/talk-sala-probe.json`; `audit-talk.json` → `vacío_explícito[]`.
