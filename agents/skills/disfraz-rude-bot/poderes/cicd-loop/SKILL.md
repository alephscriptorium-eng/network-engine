---
name: cicd-loop
description: >-
  Poder opt-in del traje rude-bot: alias de +force engine-model-G. Mini-tabla
  fase|rol|gancho va dentro del bloque Calibración (paso 0b); respetar 🟢🟡🔴.
---

# Poder: cicd-loop

## Propósito

**Alias de `+force engine-model-G`.** Puente operativo con [`engine-model-G`](../../../../engines/engine-model-G/INDICE.md) sin duplicar corpus. Cuando está activo, el traje **traduce** el tema forense al pipeline sprint–release usando la ontología de la ancla `02-bucle-ideas-fuerza`.

Protocolo completo: [`engines/engine-model-G/FORCING.md`](../../../../engines/engine-model-G/FORCING.md).

## Cuándo se activa

- `default_on: false` (opt-in).
- Requiere traje puesto.
- Shortcut: `+cicd-loop` / `-cicd-loop` (alias: `+cicd`).
- **`+cicd` / `+cicd-loop`** auto-activa `engine-model-G` en `forces` si no está; confirma en cabecera (`forces:engine-model-G`).
- Requiere `engine-model-G` en `forces` para calibración completa; si solo el poder está ON sin force, activar G al togglear.

## Comportamiento

1. Toggle real: `+force engine-model-G` → actualizar `engines-active.json` (paso 0c del traje).
2. Tras la **cabecera obligatoria**, emitir bloque **Calibración engines** (paso 0b) con viewpoint + lore_hook de G.
3. **Mini-tabla** `Fase|Rol|Gancho` va **dentro** del bloque Calibración — no duplica cabecera ni sustituye marcas 🟢🟡🔴 del cuerpo.
4. Inferir 1–2 fases (PLAN … FEEDBACK) según FORCING.md; máx. 2 filas por turno.
5. Continuar con lectura forense normal (`epistem-tags`, `selective-query`, etc.).
6. **No inventar** datos de pipeline, deploy o CI no presentes en caché — marcar ⚪ si falta evidencia.

Ejemplo mini-tabla dentro de Calibración:

| Fase | Rol | Gancho |
|------|-----|--------|
| DEPLOY | Ops / Pipelines | Puente hacia producción sin afirmar artefactos no cacheados |

## Composición

- `compone_con: [modo-aleph]` — comparte `engines-active.json` con tablero Aleph.
- No superponer con pipeline modo-aleph en el mismo turno sin avisar.

## Checklist específico

- ¿`engine-model-G` está en `forces` (o se auto-activó con `+cicd`)?
- ¿La mini-tabla va **dentro** del bloque Calibración, no suelta tras cabecera?
- ¿Cada afirmación de estado deploy/CI lleva 🟢 solo si hay dato cacheado?
- ¿El gancho enlaza con el bloque/tema leído, no con DevOps genérico?

## Qué NO es

- No es corpus Aleph ni segundo indexado del bucle.
- No sustituye el toggle `+force engine-model-G` — el poder es **protocolo de ejecución**; el estado vive en `forces`.
- No afirma verde en pipelines, releases o artefactos no verificados en `linea-aleph/`.
