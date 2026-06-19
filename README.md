# Network Engine

**Artefacto** FOSS (GPL-3.0) para el tablero Aleph — loadouts, forces Cohen, catálogo corpus — y **centro de datos** prensa donde se publican índices y sesiones.

**Web:** https://alephscriptorium-eng.github.io/network-engine · **Versión:** 0.1.0

---

## Qué es esto

| Cara | Qué es | Dónde vive |
|------|--------|------------|
| **Artefacto** | Motor tablero: loadout, engines, cotas, build estático | `network_engine/`, `data/`, CLI `nengine` |
| **Centro de datos** | Catálogo engines/corpus/sesiones | `data/catalog.json`, `public/prensa/` |

El corpus raw (**engines/**, **logs-aleph/**, etc.) permanece **in situ**; prensa enlaza `blob/main` sin duplicar.

---

## Instalación

```bash
git clone https://github.com/alephscriptorium-eng/network-engine.git
cd network-engine
pip install -e ".[dev]"
```

## Comandos

```bash
nengine loadout validate default-tablero
nengine catalog sync
nengine build --target all
pytest
```

---

## La web: `site/` → `public/`

```
data/ + site/ (Jinja2)  →  nengine build  →  public/  →  GitHub Pages
```

| Portal | Ruta |
|--------|------|
| Índice | `public/index.html` |
| Prensa | `public/prensa/` |
| FOSS | `public/foss/` |

**No editar `public/` a mano** — regenerar con `nengine build`.

---

## Onboarding agentes

Leer **`llms.md`** antes de tocar código. Prompts en `docs/prompts/`. Metodología en `agents/skills/modo-aleph/` (documentada en `docs/metodologia/`).

---

## Licencia

GPL-3.0-or-later — ver [LICENSE](LICENSE).
