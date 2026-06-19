# aleph-context — estado del tablero (esqueleto)

Carpeta de **contexto persistente** para Modo Aleph. Separada del skill (procedimiento) y del corpus (logs-aleph, linea-aleph, logs-skill).

## Estructura

```
aleph-context/
├── ACTIVACION.md          ← leer primero (entrada al juego)
├── hot.md                 ← slice activo inyectable (plantilla)
├── templates/
│   ├── psiconalisis-plantilla.md   ← §1–6 rellenables
│   └── profile.schema.json         ← validar profiles/{slug}.json
├── reference/
│   └── composer-psychoanalysis.md  ← caso Composer (solo lectura)
├── profiles/              ← perfil operativo por agente (+ .md opcional)
├── sessions/              ← delta por sesión de trabajo
├── posicion-linea.json    ← arco sima ↔ cima
├── engines-active.json    ← boot + forces Cohen
└── eval/
    ├── prompts-test/      ← prompts de prueba
    └── reviews/           ← evaluaciones (evaluador → evaluado)
```

## Taxonomía de artefactos

| Artefacto | Ubicación | Rol | Quién escribe |
|-----------|-----------|-----|----------------|
| **Plantilla psicoanálisis** | `templates/psiconalisis-plantilla.md` | Estructura §1–6 con placeholders | Humano / diseño |
| **Esquema perfil** | `templates/profile.schema.json` | Validar JSON de perfil | Diseño |
| **Referencia canónica** | `reference/composer-psychoanalysis.md` | Instancia Composer documentada | Solo lectura; actualizar explícitamente |
| **Perfil operativo** | `profiles/{slug}.json` | Polo, sesgos, eigenstate reutilizable | Agente (ACTIVACION paso 2) |
| **Narrativa opcional** | `profiles/{slug}.md` | Psicoanálisis largo si hace falta | Agente (opcional) |
| **Sesión** | `sessions/{id}/` | Asentamiento + autorevisor por turno | Agente en cada sesión Aleph |
| **Hot** | `hot.md` | Síntesis ≤30 líneas inyectable | Agente tras AutoRevisor |
| `eval/prompts-test/` | Semillas de prueba | Humano o agente diseñador |
| `eval/reviews/` | Rúbrica pasada/fallo | Agente evaluador |

**Regla:** el skill guarda procedimiento y plantillas de bloque; el **contenido** del agente vive aquí, no en raíz ni en `agents/skills/`.

## No recalcular todo cada sesión

1. Cargar `profiles/{slug}.json` si existe (semilla: [`profiles/composer.json`](profiles/composer.json) para el caso Composer).
2. Si no existe → seguir `ACTIVACION.md` paso 2.
3. Actualizar solo `sessions/` + `hot.md` en la sesión actual.
4. No reescribir `reference/` ni la plantilla salvo actualización de diseño.

## Enlaces

- Skill: [`agents/skills/modo-aleph/`](../agents/skills/modo-aleph/SKILL.md)
- Plan meta: [`logs-skill/raw/log-agent2.md`](../logs-skill/raw/log-agent2.md)
- Stub raíz (compat): [`composer.model.md`](../composer.model.md) → redirige a templates/reference/profiles
