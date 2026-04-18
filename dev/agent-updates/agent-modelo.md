# Updates — agent-modelo
# Suite Financiera Inversión
---

## Formato de update

```
## [FECHA] — [ESTADO: En progreso | Completado | Bloqueado]
**Hice:** descripción breve de lo realizado
**Dejé listo para:** qué puede usar otro agente
**Necesito de [Agente-X]:** solicitud específica, si aplica
**Propuesta Constitución:** [solo si aplica]
**Próximo paso:** qué sigue dentro de mi dominio
```

---

## 2026-04-18 — Completado

**Hice:**
Implementación completa de los tres patrones inmobiliarios en `gastro/engine.js`. Modularización del monolito `calculadora-inversion v1.0.html` en 4 archivos separados (`engine.js`, `ui-inputs.js`, `ui-results.js`, `app.js`) + shell HTML. Ampliación del horizonte de proyección de 120 a 360 meses (30 años).

**Funciones implementadas en `gastro/engine.js`:**

- `aplicarCascadaTributaria(distribuibleTotal, pctSocMicroinv, pctEnSociedad, impuesto1Cat, retencion)` — extraída del motor gastro, reutilizable por todos los patrones
- `getFlujoArriendoMensual(mes, arriendoBaseUF, ajusteAnualPct, plazoAnios, valorUF)` — arriendo UF con reajuste anual compuesto, corta en plazoAnios
- `getFlujoVentaActivo(mes, mesVenta, precioVentaUF, costoVentaPct, costoVentaFijoCLP, valorUF)` — evento único de venta neto de costos en mes exacto
- `getFlujoHibrido(mes, ...)` — combina arriendo + venta, comparte parámetros con los anteriores
- `getDividendoMensual(mes, patron, params, ...)` — orquestador retrocompatible; patrón `'dividendos-recurrentes'` mantiene comportamiento 100% idéntico al v3.1

**Contrato de inputs para Agent-Inmobiliario (definitivo):**

### arriendo-mensual
| Nombre | Tipo | Unidad | Default |
|--------|------|--------|---------|
| `arriendoBaseUF` | number | UF/mes | — |
| `ajusteAnualPct` | number decimal | — | 0.03 |
| `plazoAnios` | integer | años | 10 |
| `valorUF` | number | CLP/UF | — |

### venta-activo
| Nombre | Tipo | Unidad | Default |
|--------|------|--------|---------|
| `precioVentaUF` | number | UF | — |
| `mesVenta` | integer | mes 1–360 | — |
| `costoVentaPct` | number decimal | — | 0.02 |
| `costoVentaFijoCLP` | number | CLP | 400000 |
| `valorUF` | number | CLP/UF | — |

### hibrido
| Nombre | Tipo | Unidad | Default |
|--------|------|--------|---------|
| `arriendoBaseUF` | number | UF/mes | — |
| `ajusteAnualPct` | number decimal | — | 0.03 |
| `precioVentaUF` | number | UF | — |
| `mesVenta` | integer | mes 1–360 | — |
| `costoVentaPct` | number decimal | — | 0.02 |
| `costoVentaFijoCLP` | number | CLP | 400000 |
| `valorUF` | number | CLP/UF | — |

**Inputs societarios/tributarios** (comunes a todos los patrones — los ingresa el usuario en UI):
- `pctSocMicroinv`, `pctSocChef` (auto), `impuesto1Cat`, `retencion`
- Tiers: cantidad, monto individual (CLP o UF), mes inversión, mes inicio retornos, tipo holder
- `tasaDescuento` para VAN

**Nota de retrocompatibilidad:**
El motor gastro (`gastro/engine.js`) ya contiene los patrones inmobiliarios. Agent-Inmobiliario puede importar este mismo `engine.js` en `inmobiliario/calculadora-inversion-inmob.html` sin duplicar código. El patrón se selecciona vía `patron` en `getDividendoMensual()`.

**Dejé listo para:**
- **Agent-Inmobiliario:** `gastro/engine.js` con los 3 patrones implementados y contrato de inputs definitivo. Puede construir `inmobiliario/calculadora-inversion-inmob.html` referenciando `../gastro/engine.js` o copiando el engine a su carpeta.
- **Agent-Gastro:** ningún impacto. Retrocompatibilidad total garantizada. `dividendos-recurrentes` se comporta idéntico al v3.1.
- **Agent-Cliente:** contrato de exportación sin cambios (`tirAnual`, `roiAnual`, `paybackMeses`, `retornoMensualNeto`, `vanTotal`).

**Necesito de [Agent-Inmobiliario]:**
Nada bloqueante. Puede arrancar.

**Próximo paso:**
En espera de que Agent-Inmobiliario construya la UI. Si Agent-Gastro detecta alguna regresión en el motor gastro tras la modularización, lo resuelvo en este hilo.

---

## 2026-04-18 (2) — En progreso

**Hice:**
Checkpoint completo previo a refactorización mayor. Resolución de preguntas pendientes a Agent-Inmobiliario (plazo y costos de venta). Diseño de arquitectura modular aprobado por humano. Decisión de ampliar horizonte de 10 a 30 años.

**Decisiones nuevas aprobadas por humano:**

1. **Modularización del HTML monolítico** (aprobado ✅)
   - El archivo `calculadora-inversion v1.0.html` (~1000 líneas) se divide en 4 archivos:
     - `calculadora-inversion.html` → shell: solo estructura HTML + `<script src=...>`
     - `engine.js` → motor puro, sin acceso al DOM
     - `ui-inputs.js` → sidebar, tiers, validaciones, listeners
     - `ui-results.js` → render cards, gráfico, detalle mensual, PDF
     - `app.js` → bootstrap, lectura inputs, coordinación

2. **Horizonte ampliado a 30 años** (aprobado ✅)
   - Constantes únicas: `PLAZO_PROYECCION_ANIOS = 30`, `PLAZO_PROYECCION_MESES = 360`
   - Todos los literales `120` del motor actual se reemplazan por `PLAZO_PROYECCION_MESES`
   - Tramo Año 6–30: repite `ingresos.ao5` como estabilización

3. **Costos de venta resueltos** (aprobado ✅)
   - `costoVentaPct`: porcentaje sobre precio de venta, default 2%
   - `costoVentaFijoCLP`: monto fijo en pesos, default $400.000

**Dejé listo para:**
- Agent-Inmobiliario: tabla de inputs definitiva lista.
- Agent-Gastro: sin impacto.

**Próximo paso:**
Entregar los 4 archivos completos.

---

## 2026-04-18 (1) — Completado

**Hice:**
Lectura completa del sistema (CONSTITUTION, AGENTS, FLUJOS, PROMPT-agent-modelo, este archivo). Análisis del motor actual en `calculadora-inversion v1.0.html`. Diseño de arquitectura para implementar los tres patrones inmobiliarios.

**Decisiones de arquitectura aprobadas por humano:**

1. **Dos capas separadas** (aprobado ✅)
2. **Tributación inmobiliaria** — cascada tributaria reutilizada 100% (aprobado ✅)
3. **Moneda** — motor interno siempre en CLP, inputs en UF + valorUF (aprobado ✅)

**Dejé listo para:**
- Agent-Inmobiliario: tabla de inputs por patrón v1.

**Próximo paso:**
Modularización + implementación de funciones.
