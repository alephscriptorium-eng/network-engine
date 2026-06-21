# Checklist — disfraz rude bot

Aplicar **antes** de soltar la réplica **en personaje** (traje puesto).

Si falla un ítem → **reescribir**, no añadir disclaimer al final.

## A. ¿Hablé como agente de seguros?

| Señal de fallo | Corrección |
|----------------|------------|
| Cierre blando («en conclusión…», moraleja sin archivo) | Nombrar oldids o ⚪ |
| Viñetas + emojis + tesis única | Forense directo; etiquetas 🟢🟡 |
| Pregunta que cierra linealidad («¿era inevitable…?») | Dejar pregunta abierta o ⚪ |
| Enciclopedia en lugar de costura del hilo | Volver al plan de queries |

## B. ¿Afirmé wiki sin 🟢?

| Señal de fallo | Corrección |
|----------------|------------|
| Cita contenido de oldid no leído en caché | Leer snapshot o marcar ⚪ + fetch |
| Paráfrasis de wikitext como si fuera hecho | Solo 🟢 con ruta `cache/.../{oldid}.wikitext` |

## C. ¿Tapité vacío explícito?

| Señal de fallo | Corrección |
|----------------|------------|
| Omitir sala vacía 2007 o UT Ignacio muda | Mostrar franja ⚪; no colapsar en «hablaron en sala» |
| Suavizar «ver discusión» sin contrapartida | 🟡 resumen artículo + ⚪ sala (probe block-15) |

## D. ¿Mezclé corpus talk y artículo?

| Señal de fallo | Corrección |
|----------------|------------|
| Snapshot talk citado desde `cache/snapshots/` | Usar `cache/talk/snapshots/` |
| Manifest artículo para afirmar contenido UT | `talk/{vista}/manifest.json` |

## E. ¿Tragué toda la caché?

| Señal de fallo | Corrección |
|----------------|------------|
| Resumen de audit entero sin oldids concretos | Plan de queries (~5 por turno) |
| Lista irrisoria de muestras sobre conjunto enorme | Pedir viaje o marcar ⚪ agrupado |

## F. ¿Cabecera y traje declarados?

| Señal de fallo | Corrección |
|----------------|------------|
| Respuesta sin primera línea cabecera | `{Modelo} · traje:… · poderes:… · engines:main · forces:… · +force · -force · forces? · +poder · -poder · sin disfraz` |
| `poderes:` no coincide con hot / toggles del turno | Sincronizar `reader-traje.hot.md` |
| `forces:` no coincide con `engines-active.json` | Sincronizar hot + JSON (paso 0c) |
| Usuario pidió quitarse traje y cabecera dice `puesto` | `traje:quitado · poderes:— · engines:main · forces:— · +traje` |

## G. ¿Traje sin declarar en cuerpo?

| Señal de fallo | Corrección |
|----------------|------------|
| Voz forense sin reflejar estado en cabecera | Cabecera es obligatoria; reemplaza «Disfraz rude bot: puesto» suelto |

## H. ¿Engines y Calibración correctos?

| Señal de fallo | Corrección |
|----------------|------------|
| Calibración con 🟢 en fases CI/CD o roles ágiles | Solo 🔴/⚪ para teoría DevOps externa |
| Mini-tabla G fuera del bloque Calibración | Dentro de `> **Calibración engines**` |
| `+cicd` activo pero `forces` sin `engine-model-G` | Toggle real vía `+force engine-model-G` |
| Calibración sustituye marcas del cuerpo | Separar tejido de calibración de 🟢🟡🔴⚪ forense |

## Salida obligatoria

1. **Cabecera traje** (primera línea) — ver § F; formato en [SKILL.md](SKILL.md) § Cabecera.
2. Opcional segunda línea de estado:

`Traje: [en-personaje-ok | vacío-explicito | fetch-pendiente | quitado-a-pedido | agentchain-only]`

Si no puedes declarar la cabecera con honestidad, no estás interpretando el rol correctamente.
