# Plan — paridad traducción en→es (Demarcación, oct 2007)

**Bloqueo reportado:** el artículo inglés fuente (`en:Demarcation problem`, oct 2007) no estaba en caché → imposible verificar paridad con `es:11951034`.

**Objetivo:** cerrar el par ancla 🟢 y emitir veredicto de paridad estructural (no traducción literal 1:1).

---

## Fases

| Fase | Acción | Artefacto | Estado |
|------|--------|-----------|--------|
| **0** | Identificar oldid enwiki vigente al momento de la traducción es | `crosswiki/anchors/demarcation-en-es-oct2007.json` | ✓ |
| **1** | Fetch cuerpo enwiki | `cache/crosswiki/en/snapshots/161154035.wikitext` | ✓ 2026-06-21 |
| **2** | Verificar es traducción ya cacheada | `cache/snapshots/11951034.wikitext` | ✓ |
| **3** | Comparar secciones + bytes + summary | `crosswiki/reports/demarcation-en-es-oct2007-parity.json` | ✓ |
| **4** | Actualizar tabla inaugural máquina B | fila `en` deja de ser ⚪ | ✓ |
| **5** | (opt) Diff API en↔es no aplica cross-lang — comparar secciones offline | script `compare_translation_pair.py` | ✓ |

---

## Anclas (fase 0)

| Rol | Wiki | oldid | timestamp | bytes | summary |
|-----|------|-------|-----------|-------|---------|
| **Fuente** | en | **161154035** | 2007-09-29T17:59:50Z | 13.973 | última edición antes de traducción SC |
| **Traducción** | es | **11951034** | 2007-10-10 04:53 | 16.056 | «Traducción completa del original en inglés» |
| **Destino previo** | es | 11663303 | 2007-09-28 | 472 | miniesbozo Popper |
| **Revert traducción** | es | 11951164 | 2007-10-10 | 515 | −15.582 bytes (manifest, sin cuerpo) |

**Criterio oldid en:** no hubo edits en `Demarcation problem` entre 2007-09-29 y 2007-10-10 → **161154035** es el estado fuente al traducir.

---

## Comandos (fase 1–3)

```bash
cd network-engine/linea-aleph

# 1 · Fetch fuente inglesa
python scripts/fetch_snapshot.py \
  --lang en \
  --corpus crosswiki \
  --oldid 161154035 \
  --title "Demarcation problem"

# 2 · Paridad (es ya cacheado)
python scripts/compare_translation_pair.py \
  --anchor crosswiki/anchors/demarcation-en-es-oct2007.json
```

---

## Criterios de aceptación

- [x] `161154035.wikitext` existe bajo `cache/crosswiki/en/snapshots/`
- [x] Meta incluye `lang`, `source_api`, `fetch_method=api`
- [x] Reporte lista secciones en ∩ es y delta de bytes explicado (traducción ≠ copia byte-a-byte)
- [x] Tabla inaugural: celda `en · demarcación · oct2007` pasa de ⚪ a 🟢

---

## Qué NO es este plan

- No fetch masivo de 70 idiomas (máquina B fase 2)
- No paridad con pseudociencia (oldid `11597663` eswiki aún sin wikitext en disco)
- No afirmar «traducción idéntica» — solo paridad **estructural** verificable
