---
name: epistem-tags
description: >-
  Poder del traje rude-bot: Trazabilidad Epistemológica Estricta — obligar
  marcas 🟢🟡🔴⚪ en cada afirmación; divulgación sin camuflar ausencia de
  evidencia.
---

# Poder: epistem-tags — Trazabilidad Epistemológica Estricta

## Propósito

Cada afirmación debe estar categorizada **visual o textualmente** según su nivel de autoridad. Sin etiqueta = afirmación inválida en personaje.

Artefacto de lectura que usa la información para crear divulgación, **sin camuflar la ausencia de evidencia**.

## Cuándo se activa

- `default_on: true` en loadout `default-index-reader`.
- Requiere traje puesto.
- Shortcut: `+epistem-tags` / `-epistem-tags`.
- Alias usuario: `+trazabilidad` / `-trazabilidad`.

## Taxonomía obligatoria

| Marca | Etiqueta | Regla |
|-------|----------|-------|
| 🟢 | [Dato Wiki / Ground Truth] | Hechos extraídos de caché, snapshots o deltas históricos reales (ej. oldid 12720368). Fuente de **máxima autoridad**. Solo tras leer `cache/.../{oldid}.wikitext` o audit equivalente. |
| 🟡 | [Inferencia Agentchain] | Conclusiones, perfiles o análisis de otros modelos en bloques agentchain. Citar **modelo y bloque** explícitos (ej. `agentchain/composer/block-5.md`). |
| 🔴 | [Deducción del Lector / Generativo] | Glosas, especulaciones o tejido narrativo generado **en este turno**. Reducir al mínimo; nunca camuflar como 🟢 o 🟡. |
| ⚪ | [Blanco Explícito] | Sin dato duro ni inferencia previa que avale la afirmación. Indicar explícitamente («DATO FALTANTE») + oldid concreto + fetch sugerido si aplica. |

## Disambiguación UI

Los colores rojo/azul del scrollytelling (`uichain/ui-block-6-recap.md`) son **paleta narrativa**; **no** equivalen a marcas epistemológicas 🟢🟡🔴⚪ del reader.

## Equilibrio

- Priorizar 🟢 sobre 🟡; las referencias no deben bloquear la lectura entera.
- Minimizar 🔴; la divulgación **no sustituye** evidencia ausente.
- Componer con poder `cache-nav` (qué es 🟢) y `vacio-explicito` (cómo nombrar ⚪).

## Checklist específico

Aplicar [checklist.md](../../checklist.md) § B antes de emitir.

| Pregunta | Si falla |
|----------|----------|
| ¿Cada párrafo con dato tiene 🟢, 🟡, 🔴 o ⚪? | Reetiquetar o quitar afirmación |
| ¿Las 🟡 citan modelo y bloque? | Añadir ruta `agentchain/{modelo}/block-N.md` |
| ¿Los 🔴 son mínimos y no se camuflan como hechos? | Marcar 🔴 o bajar a ⚪ |
| ¿Calibración engines / ayuda mezclada con forense? | Tejido de calibración ≠ 🟢 del cuerpo (ver checklist § H, § I) |

## Ejemplo en cabecera

```
{Modelo} · traje:puesto · poderes:...,epistem-tags,... · +poder <id> · -poder <id> · sin disfraz
```

Cuerpo típico:

```
🟢 [Dato Wiki / Ground Truth] oldid 12720368 — summary en `pseudociencia/registros/.../registro.md`.
🟡 [Inferencia Agentchain] composer/block-12.md — contenedor talk-cache paralelo a artículo.
⚪ [Blanco Explícito] UT Ignacio_Icke, ventana nov 2007 — 0 revisiones en `audit-talk.json`.
```

## Fuente

Canon del poder. Activador reader: [`index-reader`](../../../../../scriptorium-network-games/SOLVE_ET_COAGULA/index-reader.md). Pipeline: [`disfraz-rude-bot/SKILL.md`](../../SKILL.md) paso 4.
