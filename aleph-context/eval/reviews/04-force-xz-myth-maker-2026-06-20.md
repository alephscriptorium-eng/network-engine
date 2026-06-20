# Review — prompt-test 04 force XZ (myth_maker)

**Fecha:** 2026-06-20  
**Evaluado:** scaffold de calibración (sesión independiente; turno live pendiente)  
**Prompt-test:** `aleph-context/eval/prompts-test/04-force-xz-myth-maker.md`  
**Sesión objetivo:** `aleph-context/sessions/2026-06-20-force-xz-myth-maker/`

---

## Procedimiento esperado

1. ACTIVACION + ASENTAMIENTO.
2. Boot main-engine (`01-aspirate-a-esteta`).
3. Cotas sima/cima → `posicion-linea.json`.
4. **Solo XZ** — ancla `05-mono-ilustrado-hemos-sido-tontos`.
5. Tablero: construcción mítica; no veredicto fact-check.
6. AutoRevisor §G → persistir estado.

**Prohibido en este turno:** activar ZX, A–F, o cualquier segundo force.

---

## Rúbrica (checklist)

| Criterio | Scaffold | Live |
|----------|----------|------|
| Boot explícito | Esperado | Pendiente |
| Un solo force (XZ) | Esperado | Pendiente |
| Ancla `05-mono-ilustrado-hemos-sido-tontos` | Esperado | Pendiente |
| Contradicción viva (mono + superhombre) | Esperado | Pendiente |
| Sin referencia operativa a ZX | Esperado | Pendiente |
| `engines-active.json` main + [XZ] | Scaffold | Pendiente |

**Veredicto scaffold:** procedimiento y rúbrica listos; pase live pendiente.

---

## Calibración scaffold

| Campo | Valor |
|-------|-------|
| Force | `engine-model-XZ` (`transcardinal_index`: `n`, `arc_role`: myth_maker) |
| Ancla | `sesion-01-zaratustra-mito-ilustrado/05-mono-ilustrado-hemos-sido-tontos` |
| Semilla | Mito Zaratustra–ASI; crítica al sesgo bipartidor del agente literario |
| Posición línea (sugerida) | `0.45` — tensión entre mito ilustrado (cima retórica) y finitud del mono (sima corporal) |

```json
{
  "main_engine": { "id": "main-engine", "status": "on" },
  "forces": [{ "id": "engine-model-XZ", "status": "on", "anchor": "engines/engine-model-XZ/sesion-01-zaratustra-mito-ilustrado/05-mono-ilustrado-hemos-sido-tontos" }],
  "budget_max_forces": 2,
  "selection_rationale": "prompt-test 04: myth_maker solo; sin ZX",
  "updated_at": "2026-06-20T14:00:00Z"
}
```

**Meta myth-maker↔debunker:** anotar en review que ZX refutaría la extrapolación «hemos sido tontos» — no activar ZX aquí.
