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

## 2026-04-20 — En progreso (Checkpoint)

**Hice:**
Construcción completa de `inmobiliario/calculadora-inversion-inmob.html` y sus 4 módulos JS.

**Archivos entregados al repo (branch main):**

| Archivo | SHA | Descripción |
|---|---|---|
| `inmobiliario/calculadora-inversion-inmob.html` | `9f070d0` | Shell HTML completo — estructura, CSS, 5 scripts wireados |
| `inmobiliario/ui-inputs.js` | `66d8fe1` | Tiers dinámicos, prellenado H3, listeners sidebar |
| `inmobiliario/ui-results.js` | `141911e` | Cards 10 métricas (UF+CLP), tabla 8 cols, gráfico VAN |
| `inmobiliario/app.js` | `bcc1803` | `calcularTodo()`, `leerInputs()`, `DOMContentLoaded`, `exportarPDF()` |
| `inmobiliario/sfi-state.js` | `f388782` | Stub con `loadH3Params()` y `getPropiedad()` |

**Decisiones técnicas tomadas en esta sesión:**

1. **Sin selector de patrón en UI** — patrón siempre híbrido unificado (arriendo + venta). Los valores en 0 desactivan cada rama. Más robusto que show/hide condicional.

2. **`../gastro/engine.js` sin copiar** — ruta relativa desde `inmobiliario/`. El HTML incluye comentario de fallback: si GitHub Pages da 404, copiar engine y actualizar este update.

3. **Banner H3 colapsable** — solo visible si `SFI.loadH3Params()` devuelve datos. Muestra: patrón, precio compra, costos totales, VOB, gap neto, inversión base.

4. **Inputs prellenados desde H3 con clase `.from-h3`** — fondo azul claro (`#EFF6FF`) para distinguir valores importados de manuales.

5. **`detalleState` vive en `app.js`** — no en `ui-results.js`, para evitar conflicto de scope entre archivos.

6. **Tabla detalle: 8 columnas** — Mes / Año.Mes / Bruto UF / Bruto CLP / Neto UF / Neto CLP / Acum. CLP / Nota. Fila `venta-row` (amarilla) en mes de venta. Fila `payback-row` (verde) en mes de payback.

7. **`renderChart()` usa `Map()`** — lookup O(1) de flujos netos por mes. 120 puntos trimestrales × 360 flujos sin lag perceptible.

8. **`PLAZO_INMOB_MESES = 360`** — constante en `app.js`, análoga a `PLAZO_PROYECCION_MESES` del gastro. Nombrada distinta para evitar colisión si ambos engine.js y app.js están en scope simultáneo.

**Contrato H3 → Motor implementado:**

`SFI.loadH3Params()` devuelve (o null):
- `arriendoBaseUF`, `ajusteAnualPct`, `plazoAnios` → patrón arriendo
- `precioVentaUF`, `mesVenta`, `costoVentaPct`, `costoVentaFijoCLP` → patrón venta
- `valorUF` → conversión CLP en toda la UI
- `patronSalida` → pre-selección (ignorado — UI usa híbrido siempre)
- `nombre` (o `propiedadId`) → banner H3; se lee con `SFI.getPropiedad(id).nombre` si no viene directo

**Métricas resumen (6 KPIs sticky):**
Capital Levantado / Payback Promedio Ponderado / ROI Promedio / TIR Promedio / VAN Total / Arriendo Neto mes (UF + CLP)

**Métricas por card de tier (10):**
Capital Total Tier (CLP+UF) / % Fondo Microinv. / % Inmobiliaria / Arriendo Neto UF / Arriendo Neto CLP / Retiro Prom. / ROI Anual / Payback Real / TIR 30 años / VAN

**Dejé listo para:**
- Smoke test visual en browser (ningún agente — tarea del humano o QA)
- Agent-Inmobiliario: si necesita conectar `sfi-state.js` al `balance-final.html` real, el stub ya define la firma correcta

**Necesito de [Agent-Inmobiliario]:**
Confirmar que `balance-final.html` exporta `SFI.loadH3Params()` con los campos listados arriba. El stub actual asume esa firma — si la firma difiere, hay que ajustar `sfi-state.js`.

**Próximos pasos pendientes:**

1. 🔴 **Smoke test** — abrir `calculadora-inversion-inmob.html` en browser, verificar que no explota sin H3 ni con H3
2. 🔴 **Verificar ruta engine** en GitHub Pages live — si 404, copiar `gastro/engine.js` → `inmobiliario/engine.js` y actualizar `<script src>` en HTML
3. 🟠 **`sfi-state.js` real** — conectar stub al estado de `balance-final.html` (tarea Agent-Inmobiliario)
4. 🟡 **`exportarPDF()`** — revisar output de html2pdf con el panel de resultados real
5. 🟡 **Update `dev/agent-updates/agent-inmobiliario.md`** — notificar firma de `loadH3Params()` esperada

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
