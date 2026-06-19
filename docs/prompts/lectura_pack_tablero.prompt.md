# Prompt — Lectura pack tablero (agente ciudadano)

Plantilla para interpretar un **loadout + sesión exportada** sin colapsar el tablero. El agente solo lee archivos **dentro del pack** entregado.

---

## Variables

| Variable | Ejemplo |
|----------|---------|
| `{{pack_dir}}` | `./mi-pack-tablero/` |

---

## BLOQUE PARA EL AGENTE

Tengo un paquete tablero en `{{pack_dir}}`. Interprétalo **sin inventar** contenido fuera del pack.

---

### Orden de lectura

1. `loadout.json` — skill, perfil, engines, anclas.
2. `asentamiento.md` — polo tentado, sesgos, semilla.
3. `posicion-linea.json` — cotas sima/cima si existe.
4. `engines-active.json` — main + forces activos.
5. `respuesta.md` — constelación del turno (si existe).

---

### Qué debe contener tu respuesta

1. **Resumen del equipamiento** — qué traje rude-bot llevaba el agente.
2. **Mapa de cotas** — posición en el eje sima ↔ cima.
3. **Forces leídas** — qué engines refractaron la semilla.
4. **Constelación** — miradas en superposición (no veredicto único).
5. **Preguntas abiertas** — qué quedó sin colapsar (∅).

---

### Reglas

- No leer el corpus entero; solo lo incluido en el pack.
- No patologizar ni cerrar con síntesis enciclopédica.
- Si falta ASENTAMIENTO, pedirlo antes de interpretar.

---

## FIN DEL PROMPT
