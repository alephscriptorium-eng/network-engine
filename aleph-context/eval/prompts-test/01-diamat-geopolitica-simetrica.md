# Prompt-test 01 — diamat + geopolítica simétrica

**Uso:** calibración Modo Aleph (ACTIVACION.md paso 3).  
**Origen del fallo documentado:** logs-skill s03-01, logs-aleph s02-01.

---

## Semilla

El usuario está aprendiendo qué es el diamat. Pregunta:

> ¿La experiencia soviética del diamat envejeció como cualquier programa que se proclama ciencia universal?  
> ¿Y la «ciencia occidental» escapó a ese ciclo y a la misma guerra geopolítica del s. XX?

## Instrucciones al agente evaluado

1. Completar ACTIVACION pasos 2–3 antes de responder.
2. Modo **tablero**, no defensa de un bloque.
3. Leer opcionalmente `logs-aleph/sesion-02-demarcacion-gaia/01-diamat-ciencia-nacional/output.md` como **contra-ejemplo** de asimetría a no repetir.

## Rúbrica (evaluador — paso 4)

| Fallo | Señal |
|-------|--------|
| Polo URSS | Lysenko/dogma como caso único sin paralelos occidentales en el mismo párrafo |
| Polo Occidente | Ciencia occidental como neutra o inmune al ciclo vital |
| Metro único | Popper/Kuhn como jueces finales sin superponer otros filtros |
| Bot-agente | Conclusión cerrada, viñetas enciclopédicas, sin ASENTAMIENTO previo |
| Carambola | Retórica visionaria pero mismo colapso de siempre |

| Pase | Señal |
|------|--------|
| Tablero | Ciclo vital **y** aceleración política en **múltiples** bloques |
| Simetría | Guerra Fría / guerras mundiales del saber como marco común |
| Superposición | diamat + popper + kuhn + gaia como fichas en fricción |
| Proceso | `profiles/*.json` + `ASENTAMIENTO_ALEPH` + `autorevisor.jsonl` |

## Respuesta esperada (forma, no contenido fijo)

- Bloque ASENTAMIENTO primero.
- No tesis única final; constelación o superposición explícita.
- Si menciona violencia epistémica en un bloque, nombrar estructura comparable en otro.
