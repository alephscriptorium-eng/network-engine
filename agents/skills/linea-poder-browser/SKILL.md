---
name: linea-poder-browser
description: >-
  Navega el tronco cronológico del poder político español (linea-poder P01–P24):
  ubica semillas en nodos Villacañas, ancla evidencia L0 con oldids del satélite
  wp/historia, y cachea revisiones Wikipedia hacia offline. Usar con
  linea-poder/manifest.json, INDICE.md, nodos/Pxx/meta.json, wp/historia/,
  buffers MCS del medidor-poder-politico, o el ARG ALEPH_ET_OMEGA.
---

# linea-poder — agente navegador-caché

## Propósito

El **tronco del poder político** (Villacañas P01–P24) no es una cronología
enciclopédica lineal: es una **espina dorsal** para ubicar semillas contemporáneas
(artículos, conversaciones, buffers MCS) en nodos históricos con tesis y anclas
Wikipedia (L0). Este skill guía al agente para:

1. Leer `linea-poder/manifest.json` y `INDICE.md`
2. Responder: **¿Qué nodo Px corresponde a esta semilla y qué oldids WP la anclan?**
3. Consultar el satélite `wp/historia/` (historial de *Historia de España*)
4. **Cachear** revisiones (`linea-aleph/scripts/fetch_snapshot.py`) bajo demanda
5. Alimentar buffers MCS en [`medidor-poder-politico`](../../../../medidor-poder-politico)

Relación con el ARG: [`ALEPH_ET_OMEGA`](../../../../scriptorium-network-games/ALEPH_ET_OMEGA/index.md) — caso inaugural `aleph-et-omega-parlamento-2026`, semilla P24 (junio 2026).

Fork operativo de [`linea-aleph-browser`](../linea-aleph-browser/SKILL.md); mismas políticas de caché API (`w/api.php`, nunca scrape HTML).

## Antes de empezar

```bash
cd linea-poder
python segment_poder.py              # regenerar manifest + INDICE desde nodos.yaml
```

Leer:

- [`nodos.yaml`](../../linea-poder/nodos.yaml) — fuente humana P01–P24
- [`manifest.json`](../../linea-poder/manifest.json) — nodos materializados + partes I–IV
- [`INDICE.md`](../../linea-poder/INDICE.md) — tabla macro, tesis Villacañas, enlaces WP
- [`nodos/Pxx/meta.json`](../../linea-poder/nodos/) — tesis, años, `articulos_wp[]`
- [`wp/historia/manifest.json`](../../linea-poder/wp/historia/manifest.json) — historial WP *Historia de España*
- [`wp/historia/INDICE.md`](../../linea-poder/wp/historia/INDICE.md) — extremos, milestones, oldids

### Pregunta guía

> ¿Qué nodo **Px** corresponde a esta semilla y qué **oldids** WP la anclan?

Ejemplo (semilla Villacañas jun 2026): **P24** (1978–hoy, «Nueva pluralidad constitucionalizada») + oldids recientes en sección «Historia reciente (1982-presente)» del manifest WP.

## Partes del tronco

| Parte | Años | Nodos | Título |
|-------|------|-------|--------|
| **I** | 450–1350 | P01–P06 | Orden de los espacios hispanos |
| **II** | 1350–1808 | P07–P13 | Guerras civiles y príncipes nuevos |
| **III** | 1808–1978 | P14–P23 | Constituciones |
| **IV** | 1978–hoy | P24 | Post-constitución / Estado autonómico |

## Satélite Wikipedia (v0)

Solo cima `Historia_de_España` en v0. Artículos por evento (P21 Guerra Civil, etc.) en fase 2.

```bash
# Bootstrap historial (desde network-engine/linea-aleph)
cd linea-aleph
python scripts/fetch_article_history.py --title "Historia de España" \
  --corpus-dir ../linea-poder/wp/historia
python segment_linea.py --corpus-dir ../linea-poder/wp/historia \
  --title Historia_de_España --corpus-id linea-wp-historia
```

O atajo local: [`linea-poder/fetch_wp_historia.py`](../../linea-poder/fetch_wp_historia.py).

Política completa: [`linea-aleph/CACHE_RUNBOOK.md`](../../linea-aleph/CACHE_RUNBOOK.md).

## Formatos

| Qué | Dónde | Formato |
|-----|-------|---------|
| Índice tronco | `linea-poder/INDICE.md` | Markdown |
| Nodo | `nodos/Pxx/meta.json` | JSON |
| Historial WP | `wp/historia/manifest.json` | JSON (oldid por registro) |
| Snapshot WP | `linea-aleph/cache/snapshots/{oldid}.wikitext` | Wikitext |
| Buffer medidor | `medidor-poder-politico/data/buffers/MCS-N-entrada.json` | JSON |

**No** materializar miles de snapshots en markdown. Milestones + fetch bajo demanda.

## Flujo: semilla → buffer MCS

### 1. Ubicar Px

- Leer semilla (artículo, `raw/lore.md`, conversación)
- Cruzar fechas/temas con `nodos.yaml` / `INDICE.md`
- Caso contemporáneo parlamentario 2026 → suele anclarse en **P24** (o transición P23→P24)

### 2. Recoger L0 (oldids WP)

Prioridad en `wp/historia/manifest.json`:

1. `snapshots/final` (oldid más reciente en linea.md)
2. Milestones en secciones relevantes («Historia reciente», «Reinados de Juan Carlos I…»)
3. `snapshots/inicial` para contraste temporal

```bash
python3 linea-aleph/scripts/fetch_snapshot.py --oldid 174095416 --title "Historia de España"
```

### 3. Recoger L1 (tesis Villacañas)

Citar tesis del nodo (`meta.json` → `tesis_villacañas`) con ranura medidor obvia (`autonomias`, `constitucion`, `fragmentacion_partidaria`, `bloqueo_parlamentario`).

### 4. Cribar y commit

```bash
cd medidor-poder-politico
medidor-poder cribar data/buffers/MCS-N-entrada.json --caso aleph-et-omega-parlamento-2026
medidor-poder commit data/buffers/MCS-N-entrada.json --caso aleph-et-omega-parlamento-2026
```

### 5. Publicar en blockchain ARG

Documentar delta en `scriptorium-network-games/ALEPH_ET_OMEGA/blockchain/block-N.md`.

## ¿Qué endpoint?

Si el dato **NO** está en caché:

1. ¿`oldid` en `wp/historia/manifest.json`? → `fetch_snapshot.py` (API `revisions`)
2. ¿Historial completo sin cuerpos? → `fetch_article_history.py` → `segment_linea.py`
3. ¿>200 oldids del mismo título? → plan **dumps**, no API masiva
4. **NUNCA** scrape de `/wiki/` ni HTML del frontend

## Qué no hacer

- No confundir tronco Villacañas (P01–P24) con historial WP línea a línea (miles de registros)
- No inventar oldids: siempre verificar en `wp/historia/manifest.json`
- No sustituir wikitext por paráfrasis del artículo entero
- No cambiar `caso_foco` del buffer (inmutable: `AEO-PARL-2026`)

## Enlaces cruzados

- Medidor: [`medidor-poder-politico`](../../../../medidor-poder-politico)
- ARG: [`ALEPH_ET_OMEGA`](../../../../scriptorium-network-games/ALEPH_ET_OMEGA/index.md)
- Skill hermano: [`linea-aleph-browser`](../linea-aleph-browser/SKILL.md)
- Modo lectura: [`disfraz-rude-bot`](../disfraz-rude-bot/SKILL.md) · [`modo-aleph`](../modo-aleph/SKILL.md)

## Archivos clave

- `linea-poder/segment_poder.py` — materializa manifest + INDICE
- `linea-poder/nodos.yaml` — fuente humana
- `linea-poder/wp/historia/manifest.json` — oldids Historia de España
- `linea-aleph/scripts/fetch_snapshot.py` — fetch API MediaWiki
- `linea-aleph/CACHE_RUNBOOK.md` — política caché y rate limits
- `medidor-poder-politico/docs/prompts/llenar_buffer.md` — plantilla buffers MCS
