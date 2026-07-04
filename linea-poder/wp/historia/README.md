# Satélite WP — Historia de España

Corpus Wikipedia L0 para el tronco Villacañas [`../../INDICE.md`](../../INDICE.md).
Artículo cima v0: [Historia de España](https://es.wikipedia.org/wiki/Historia_de_España).

## Estado v0

| Artefacto | Descripción |
|-----------|-------------|
| `raw/linea.md` | Historial completo (3564 revisiones) vía MediaWiki API |
| `raw/linea.json` | Mismo historial en JSON |
| `manifest.json` | Índice segmentado (`segment_linea.py`) |
| `INDICE.md` | Navegación de extremos y milestones |

## Obtener / refrescar historial

Desde `network-engine/linea-poder` (recomendado — sin ventana SolveCoagula):

```bash
python fetch_wp_historia.py
```

Alternativa vía pipeline linea-aleph (puede fallar si la primera revisión no tiene `parentid`):

```bash
cd ../linea-aleph
python scripts/fetch_article_history.py --title "Historia de España" \
  --corpus-dir ../linea-poder/wp/historia
```

Solo API `w/api.php` — ver [`../../linea-aleph/CACHE_RUNBOOK.md`](../../linea-aleph/CACHE_RUNBOOK.md).

## Segmentar

```bash
cd ../linea-aleph
python segment_linea.py --corpus-dir ../linea-poder/wp/historia \
  --title Historia_de_España --corpus-id linea-wp-historia
```

## Enlaces

- Tronco P01–P24: [`../../manifest.json`](../../manifest.json)
- Medidor: [`../../../../medidor-poder-politico`](../../../../medidor-poder-politico)
- ARG: [`../../../../scriptorium-network-games/ALEPH_ET_OMEGA/index.md`](../../../../scriptorium-network-games/ALEPH_ET_OMEGA/index.md)
