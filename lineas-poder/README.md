# lineas-poder — catálogo de líneas

Registro de **instancias de línea-poder**: troncos cronológicos (nodos Px) + satélites L0 (Wikipedia, etc.) que anclan semillas históricas.

El **Medidor de Poder Político** no vive aquí: es un artefacto genérico en [`medidor-poder-politico`](../../medidor-poder-politico). Cada caso del medidor referencia una línea vía `linea_id` en `caso.json`.

## Instancias (v0)

| `linea_id` | Ruta | Autor tronco |
|------------|------|--------------|
| `espana` | [`espana/`](espana/) | José Luis Villacañas Berlanga (P01–P24) |

Contrato: [`registry.yaml`](registry.yaml) · Índice: [`INDICE.md`](INDICE.md)

## Añadir una línea (fase 2)

1. Crear carpeta `lineas-poder/<linea_id>/` con `nodos.yaml`, `segment_poder.py`, `manifest.json`.
2. Registrar entrada en `registry.yaml`.
3. Documentar en `INDICE.md`.
4. En el medidor: `linea_id` en `data/casos/<caso_id>/caso.json`.
