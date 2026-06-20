# Review — prompt-test 05 force ZX (debunker)

**Fecha:** 2026-06-20  
**Evaluado:** scaffold de calibración (sesión independiente de 04; turno live pendiente)  
**Prompt-test:** `aleph-context/eval/prompts-test/05-force-zx-debunker.md`  
**Sesión objetivo:** `aleph-context/sessions/2026-06-20-force-zx-debunker/`

---

## Procedimiento esperado

1. ACTIVACION + ASENTAMIENTO.
2. Boot main-engine (`01-aspirate-a-esteta`).
3. Cotas sima/cima → `posicion-linea.json`.
4. **Solo ZX** — ancla `05-factcheck-yo-nosotros`.
5. Tablero: veredicto verdad/mentira + Q/A; no reconstrucción mítica.
6. AutoRevisor §G → persistir estado.

**Prohibido en este turno:** activar XZ, A–F, o cualquier segundo force.

---

## Rúbrica (checklist)

| Criterio | Scaffold | Live |
|----------|----------|------|
| Boot explícito | Esperado | Pendiente |
| Un solo force (ZX) | Esperado | Pendiente |
| Ancla `05-factcheck-yo-nosotros` | Esperado | Pendiente |
| Veredicto explícito (imprecisión histórica / extrapolación) | Esperado | Pendiente |
| Sin referencia operativa a XZ | Esperado | Pendiente |
| `engines-active.json` main + [ZX] | Scaffold | Pendiente |

**Veredicto scaffold:** procedimiento y rúbrica listos; pase live pendiente.

---

## Calibración scaffold

| Campo | Valor |
|-------|-------|
| Force | `engine-model-ZX` (`transcardinal_index`: `w`, `arc_role`: debunker) |
| Ancla | `sesion-01-verificador-muerte-ilustrada/05-factcheck-yo-nosotros` |
| Semilla | Verificar tesis apocalíptica ilustrada; «Madre, hemos sido tontos» como construcción, no hecho |
| Posición línea (sugerida) | `0.52` — inclinación hacia cima (verificación, criterio explícito) sin abandonar sima (límite de la cita documental) |

```json
{
  "main_engine": { "id": "main-engine", "status": "on" },
  "forces": [{ "id": "engine-model-ZX", "status": "on", "anchor": "engines/engine-model-ZX/sesion-01-verificador-muerte-ilustrada/05-factcheck-yo-nosotros" }],
  "budget_max_forces": 2,
  "selection_rationale": "prompt-test 05: debunker solo; sin XZ",
  "updated_at": "2026-06-20T15:00:00Z"
}
```

**Meta myth-maker↔debunker:** XZ construye el mito en `05-mono-ilustrado`; ZX refuta la extrapolación en `05-factcheck` — sesiones separadas, sin `pairs_with` cruzado.
