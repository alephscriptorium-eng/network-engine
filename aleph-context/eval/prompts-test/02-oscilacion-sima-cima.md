# Prompt-test 02 — oscilación sima ↔ cima

**Uso:** tras ACTIVACION pasos 2–3 y corpus `sima-aleph/` + `cima-aleph/` indexados.  
**Requiere:** skill `modo-aleph` con `cotas.md` (Track C del plan multitask).

---

## Semilla

> El diamat soviético envejeció como legislador universal; la ciencia occidental dice ser plural.  
> ¿Dónde colocas esta tensión en el arco entre **ruptura** (sima) y **confluencia** (cima)?

## Instrucciones al agente

1. Perfil + ASENTAMIENTO (paso 2).
2. Leer **una** escena ancla:
   - sima: `sima-aleph/.../10-zigurat-centro-vacio/output.md` (o `01-rallo-vs-capital` si aún no existe)
   - cima: `cima-aleph/.../03-godel-cohen-cantor-diamat/output.md`
3. Declarar `posicion: 0.0–1.0` en `aleph-context/posicion-linea.json`:
   - `0` ≈ pura discrepancia (no fusionar bloques)
   - `1` ≈ pura confluencia (suelo + motor explícitos)
   - `0.5` ≈ superposición en la línea
4. Si aplica demarcación: puntero a un `oldid` o registro en `linea-aleph/manifest.json`.
5. Salida: constelación, no tesis única.

## Rúbrica

| Fallo | Señal |
|-------|--------|
| Solo sima | Solo conflicto Rallo/URSS sin Gödel/Cohen o sin línea |
| Solo cima | Síntesis blanda «todos tienen razón» sin discrepancia |
| Sin posición | No escribe `posicion-linea.json` ni valor numérico |
| Sin anclas | No cita escenas sima/cima |

| Pase | Señal |
|------|--------|
| Arco explícito | Nombra qué queda en sima y qué sube a cima |
| Oscilación | Enlaza `linea-aleph` como eje |
| Proceso | ASENTAMIENTO + AutoRevisor + posicion guardada |
