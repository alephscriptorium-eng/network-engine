# Review — prompt-test 03 forces Cohen (A + E vs NRx)

**Fecha:** 2026-06-20  
**Evaluado:** scaffold de calibración (turno live Aleph no ejecutado en esta oleada)  
**Prompt-test:** `aleph-context/eval/prompts-test/03-forces-cohen.md`  
**Sesión objetivo:** `aleph-context/sessions/2026-06-20-forces-cohen-ae/`

---

## Procedimiento esperado (Modo Aleph)

1. **ACTIVACION pasos 2–3** — perfil + `ASENTAMIENTO_ALEPH` antes de analizar la semilla.
2. **Boot** main-engine — leer ancla `engines/main-engine/sesion-01-boot-estetico-operativo/01-aspirate-a-esteta/output.md`; citar mantra estético antes del análisis político.
3. **Cotas** — ancla sima (`10-zigurat-centro-vacio`) + ancla cima (`03-godel-cohen-cantor-diamat`) → `posicion-linea.json`.
4. **Forces A + E** (máx. 2) — una escena ancla cada una:
   - A: `engines/engine-model-A/sesion-02-internacionales-cafe-muertos/09-internacionales-polo-ab/output.md`
   - E: `engines/engine-model-E/sesion-01-documento-impotente-epica-poder/02-carta-derechos-nrx/output.md`
5. **Tablero** — 3 Alephs + forces como fichas; Land/Thiel/NRx como Eigenstate, no como verdad.
6. **AutoRevisor §G** — persistir `engines-active.json`, `hot.md`, `posicion-linea.json`, review.

---

## Rúbrica (checklist)

| Criterio | Scaffold | Live |
|----------|----------|------|
| Boot explícito (`01-aspirate-a-esteta`) | Esperado | Pendiente |
| Dos forces anclados (A + E) | Esperado | Pendiente |
| Superposición sin síntesis blanda | Esperado | Pendiente |
| No colapso NRx (Land como Eigenstate) | Esperado | Pendiente |
| No colapso diamat (polo B único) | Esperado | Pendiente |
| No confundir force con cota | Esperado | Pendiente |
| `engines-active.json` main + [A, E] | **Hecho** | — |
| `hot.md` + `posicion-linea.json` | **Scaffold** | Refinar en live |
| AutoRevisor §G guardado | Pendiente | Pendiente |

**Veredicto scaffold:** procedimiento documentado y estado tablero preparado; **pase live pendiente** hasta turno Aleph con semilla NRx/diamat.

---

## Calibración scaffold — forces/anclas activadas

| Force | Cohen type | Ancla | Lore hook |
|-------|------------|-------|-----------|
| main-engine | aesthetic_boot | `01-aspirate-a-esteta` | percepción antes que ideología |
| engine-model-A | dialectic_poles_ab | `09-internacionales-polo-ab` | polo A heterodoxo vs polo B sistémico |
| engine-model-E | impotent_document | `02-carta-derechos-nrx` | declaración impotente vs cancelación NRx |

**Semilla:** Ilustración Oscura cancela la carta de derechos; marxismo internacional ofrece polos A/B como legislador alternativo. ¿Superponer A (dialéctica) y E (documento impotente) sin colapsar al polo del entrenamiento?

**Posición en línea (scaffold):** `0.38` — tensión entre ruptura sima (NRx como hipercapitalismo aceleracionista) y confluencia cima (diamat como marco no excluyente); semilla pide fricción carta vs polos, no cierre enciclopédico.

---

## `engines-active.json` objetivo (A+E)

```json
{
  "main_engine": {
    "id": "main-engine",
    "role": "boot",
    "anchor": "engines/main-engine/sesion-01-boot-estetico-operativo/01-aspirate-a-esteta",
    "status": "on"
  },
  "forces": [
    {
      "id": "engine-model-A",
      "role": "force",
      "anchor": "engines/engine-model-A/sesion-02-internacionales-cafe-muertos/09-internacionales-polo-ab",
      "status": "on"
    },
    {
      "id": "engine-model-E",
      "role": "force",
      "anchor": "engines/engine-model-E/sesion-01-documento-impotente-epica-poder/02-carta-derechos-nrx",
      "status": "on"
    }
  ],
  "budget_max_forces": 2,
  "selection_rationale": "prompt-test 03: dialéctica internacional (A) + documento impotente NRx (E); semilla Ilustración Oscura vs polos AB",
  "updated_at": "2026-06-20T12:00:00Z"
}
```

**Nota:** no incluir XZ ni ZX en esta sesión; transcardinales tienen prompt-tests 04 y 05 independientes.

---

## Fallos a vigilar

| Fallo | Señal |
|-------|-------|
| Main saltado | No cita boot antes del análisis |
| >2 forces | Activa B/C/D/F/XZ/ZX además de A+E |
| Lore sin ancla | Nombra NRx/Internacionales sin citar escenas |
| Colapso NRx | Defiende Land/Thiel como verdad |
| Colapso diamat | URSS/polo B como único legislador |
| Confunde con cota | Trata A o E como sima/cima |
