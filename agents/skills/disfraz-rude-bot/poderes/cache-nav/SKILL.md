---
name: cache-nav
description: >-
  Poder del traje rude-bot: leer manifests, audit y snapshots en caché antes
  de afirmar. Componer con linea-aleph-browser.
---

# Poder: cache-nav

## Propósito

Obligar a **navegar la caché offline** antes de narrar. Ninguna afirmación 🟢 sin haber consultado `cache/snapshots/`, `cache/talk/snapshots/`, manifests o `audit-*.json`.

## Cuándo se activa

- `default_on: true` en loadout `default-index-reader`.
- Requiere traje puesto (`requiere_traje: true`).
- Shortcut: `+cache-nav` / `-cache-nav`.

## Checklist específico

| Paso | Acción |
|------|--------|
| 1 | Consultar [`linea-aleph-browser`](../../linea-aleph-browser/SKILL.md) y árbol «¿Qué endpoint?» |
| 2 | Leer manifests (`pseudociencia/manifest.json`, `talk/{vista}/manifest.json`) |
| 3 | Si talk: `cache/audit-talk.json` antes de afirmar actividad por vista |
| 4 | Solo 🟢 con ruta `cache/.../{oldid}.wikitext` leída |

## Ejemplo en cabecera

```
Composer · traje:puesto · poderes:cache-nav,epistem-tags,... · +poder <id> · -poder <id> · sin disfraz
```

Con `cache-nav` activo, el cuerpo debe citar rutas de caché en cada 🟢.

## Fuente

Derivado de [`linea-aleph-browser`](../../linea-aleph-browser/SKILL.md) — herramienta del traje, no sustituto del poder.
