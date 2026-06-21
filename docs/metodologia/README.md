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
| `SKILL.md` | Traje rude bot, cabecera (`engines:main · forces:`), shortcuts, hot file |
| `poderes/registry.yaml` | Catálogo extensible de poderes |
| `poderes/{id}/SKILL.md` | Módulos (cache-nav, epistem-tags, alineacion-dual, cicd-loop, …) |
| `loadouts/default-index-reader.json` | Poderes ON por defecto |
| `checklist.md` | Revisión en personaje (A–H) |
| `ejemplos.md` | Cabecera, +alineacion, +cicd / force G, Calibración |
| `templates/reader-traje.hot.md` | Plantilla estado traje entre turnos |

**Cabecera obligatoria** incluye `engines:main` (siempre ON) y `forces:` (máx. 2). Shortcuts: `+force`, `-force`, `forces?`, `+cicd` (alias `+force engine-model-G`), `+poder`, `-poder`, `sin disfraz`.

**Estado compartido:** [`aleph-context/engines-active.json`](../../aleph-context/engines-active.json) — mismo archivo que sincroniza `reader-traje.hot.md` (campos `engines_*`).

**Pipeline Calibración (paso 0b):** bloque generativo acotado tras cabecera cuando hay forces activos; mini-tabla force G dentro de Calibración, no sustituye 🟢🟡🔴⚪ del cuerpo.

**Extensión:** añadir entrada en `poderes/registry.yaml` + `poderes/{id}/SKILL.md`; opcional en `loadouts/*.json` como `poderes_optional`. Opt-in: `alineacion-dual` (carril artículo | talk), `cicd-loop` (protocolo `+force engine-model-G`).

**Force G:** [`engines/engine-model-G/INDICE.md`](../../engines/engine-model-G/INDICE.md) · [`FORCING.md`](../../engines/engine-model-G/FORCING.md).

## Cursor

Los skills viven en `agents/skills/`; configura el IDE para leer esa ruta si hace falta.

## FOSS

- Landing estática: [`public/foss/index.html`](../../public/foss/index.html) (técnico, funcional, devops…)
- **Canon en repo** (manifest → GitHub): [`public/foss/canon.html`](../../public/foss/canon.html) · [`manifest.json`](../../public/foss/manifest.json)
- No se duplica corpus en `public/` — enlaces vía `github_blob()` en [`github_blob.js`](../../public/foss/github_blob.js)

**GitHub Pages:** workflow [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml) despliega `public/` en push a `main`. Configuración única en el repo: Settings → Pages → Source: GitHub Actions.

URLs: `https://alephscriptorium-eng.github.io/network-engine/foss/` · `…/foss/canon.html`
