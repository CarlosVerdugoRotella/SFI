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

## 2026-04-18 — En progreso

**Hice:**
Lectura completa del sistema (CONSTITUTION, AGENTS, FLUJOS, PROMPT-agent-modelo, este archivo). Análisis del motor actual en `calculadora-inversion v1.0.html`. Diseño de arquitectura para implementar los tres patrones inmobiliarios. Validación tributaria: la cascada sociedad → inversionista es estructuralmente idéntica a gastro cuando opera vía sociedad (que es el modelo SFI). Confirmación con el humano de los tres puntos de decisión arquitectónica.

**Decisiones de arquitectura aprobadas por humano:**

1. **Dos capas separadas** (aprobado ✅)
   - Capa 1: Generadores de flujo por patrón → producen `distribuibleTotal`
   - Capa 2: Cascada tributaria → reutilizada sin cambios desde gastro
   - Orquestador: `getDividendoMensual(mes, patron, params)` — retrocompatible con firma actual

2. **Tributación inmobiliaria** (investigado y resuelto ✅)
   - Sociedad inmobiliaria SÍ paga Impuesto 1ª Categoría (25%) sobre rentas de arriendo
   - Distribución posterior a inversionistas afecta a IGC o IA según domicilio
   - Cascada tributaria del motor existente se reutiliza 100% para patrones inmobiliarios
   - La diferencia con gastro: `distribuibleTotal` = arriendo neto directo (sin margen operacional)

3. **Moneda** (aprobado ✅)
   - Motor interno siempre en CLP (conversión UF × valorUF ocurre dentro del generador)
   - Inputs de generadores inmobiliarios reciben valores en UF + `valorUF` como parámetro separado
   - Output agrega `retornoMensualNetoUF = neto / valorUF` para que Agent-Inmobiliario maneje UI en UF sin hacer conversiones

**Arquitectura de funciones a implementar:**

```
CAPA 1 — Generadores (nuevas funciones JS)
├── getFlujoDividendosRecurrentes(mes, ingresos, margen, pctDistribuir)
│     Extrae lógica existente de getDividendoMensual (sin cambios de comportamiento)
├── getFlujoArriendoMensual(mes, arriendoBaseUF, ajusteAnualPct, plazoAnios, valorUF)
│     → arriendoBaseUF × (1 + ajusteAnualPct/100)^floor((mes-1)/12) × valorUF
│     → 0 si mes > plazoAnios × 12
├── getFlujoVentaActivo(mes, mesVenta, precioVentaUF, valorUF)
│     → 0 si mes ≠ mesVenta
│     → precioVentaUF × valorUF si mes === mesVenta
└── getFlujoHibrido(mes, arriendoBaseUF, ajusteAnualPct, mesVenta, precioVentaUF, valorUF)
      → getFlujoArriendoMensual(mes, ...) + getFlujoVentaActivo(mes, ...)

CAPA 2 — Cascada tributaria (extraída del código existente, sin cambios de comportamiento)
└── aplicarCascadaTributaria(distribuibleTotal, pctSocMicroinv, pctEnSociedad,
                              impuesto1Cat, retencion)
      → { bruto, neto }

ORQUESTADOR (reemplaza getDividendoMensual, retrocompatible)
└── getDividendoMensual(mes, patron='dividendos-recurrentes', params, ...)
      → { ingresoMes, distribuibleTotal, bruto, neto, netoUF }
```

**Inputs por patrón — contrato para Agent-Inmobiliario:**

### arriendo-mensual
| Nombre | Tipo | Unidad | Descripción |
|--------|------|--------|-------------|
| `arriendoBaseUF` | number | UF/mes | Arriendo mensual en mes 1 del contrato |
| `ajusteAnualPct` | number | % | Reajuste aplicado cada 12 meses (ej: 3 = 3%) |
| `plazoAnios` | integer | años | Duración del contrato; flujo = 0 después |
| `valorUF` | number | CLP/UF | Tasa de conversión ingresada manualmente |

### venta-activo
| Nombre | Tipo | Unidad | Descripción |
|--------|------|--------|-------------|
| `precioVentaUF` | number | UF | Precio proyectado de venta |
| `mesVenta` | integer | mes | Mes del evento de venta (ej: 60 = año 5) |
| `valorUF` | number | CLP/UF | Tasa de conversión ingresada manualmente |
| *(inversión inicial)* | — | UF | Va en `monto` del tier = precioCompraUF + costosAdicionalesUF |

### hibrido
| Nombre | Tipo | Unidad | Descripción |
|--------|------|--------|-------------|
| `arriendoBaseUF` | number | UF/mes | Arriendo mensual inicial |
| `ajusteAnualPct` | number | % | Reajuste anual del arriendo |
| `precioVentaUF` | number | UF | Precio de venta al final del período |
| `mesVenta` | integer | mes | Define fin de arriendo Y evento de venta |
| `valorUF` | number | CLP/UF | Tasa de conversión ingresada manualmente |

**Dejé listo para:**
- Agent-Inmobiliario: tabla de inputs por patrón lista para construir las herramientas de UI. Puede empezar a diseñar `calculadora-inversion-inmob.html` con estos inputs mientras yo implemento las funciones JS.
- Agent-Gastro: ningún impacto esperado. La refactorización mantiene retrocompatibilidad total con `dividendos-recurrentes`.

**Necesito de [Agent-Inmobiliario]:**
- Confirmación de si `plazoAnios` en `arriendo-mensual` debe tener un valor máximo definido (10 años como el motor actual, o configurable más allá).
- Confirmar si el evento de venta en `venta-activo` debe modelar también los costos de venta (comisión corredor ~2%, gastos notariales) como descuento sobre `precioVentaUF`, o si eso lo calcula la calculadora de remodelación antes de pasarlo al motor.

**Próximo paso:**
Implementar las cuatro funciones JS en `calculadora-inversion v1.0.html` (sección CÁLCULOS MATEMÁTICOS) y escribir update de completado con el diff exacto de lo que cambió.

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
   - Tramo Año 6–30: repite `ingresos.ao5` como estabilización (comportamiento actual mantenido)
   - Razón: créditos bancarios inmobiliarios pueden tener plazos de 20–30 años

3. **Costos de venta resueltos** (aprobado ✅)
   - `costoVentaPct`: porcentaje sobre precio de venta, default 2% (corretaje + notaría)
   - `costoVentaFijoCLP`: monto fijo en pesos, default $400.000
   - Fórmula: `ventaNetaCLP = (precioVentaUF × valorUF) - (precioVentaUF × valorUF × costoVentaPct) - costoVentaFijoCLP`
   - Aplica en `venta-activo` e `hibrido`. Ausente en `arriendo-mensual`.

**Inputs actualizados para Agent-Inmobiliario:**

| Input | Tipo | Default | Descripción |
|---|---|---|---|
| `patronFlujo` | enum | — | `'arriendo-mensual'` / `'venta-activo'` / `'hibrido'` |
| `valorUF` | number CLP | — | Valor UF vigente al momento del cálculo |
| `arriendoBaseUF` | number UF/mes | — | Arriendo mensual base del activo en UF |
| `ajusteAnualPct` | number decimal | 0.03 | Reajuste anual del arriendo (ej: 3% = 0.03) |
| `precioVentaUF` | number UF | — | Precio de salida del activo en UF |
| `mesVenta` | integer 1–360 | — | Mes exacto de liquidación dentro del horizonte de 360 meses |
| `costoVentaPct` | number decimal | 0.02 | Costo variable de venta (corretaje + notaría) |
| `costoVentaFijoCLP` | number CLP | 400000 | Costo fijo de venta en pesos |

**Inputs societarios y tributarios** (siguen siendo ingresados por el usuario en la UI):
- `% sociedad microinversionistas`, `impuesto 1ª categoría`, `% retención`
- Tiers (cantidad, monto, mes inversión, mes retornos)
- Tasa de descuento

**Orden de implementación:**
1. Crear los 4 archivos separados a partir del HTML actual
2. En `engine.js`, reemplazar literal `120` → `PLAZO_PROYECCION_MESES = 360`
3. Agregar funciones inmobiliarias y `aplicarCascadaTributaria()` a `engine.js`
4. Entregar archivos completos al humano para subida manual al repo

**Dejé listo para:**
- Agent-Inmobiliario: tabla de inputs definitiva (incluyendo costos de venta y horizonte 360 meses) lista para construir calculadoras de UI.
- Agent-Gastro: sin impacto. Retrocompatibilidad total garantizada.

**Necesito de [Agent-Inmobiliario]:**
- Nada bloqueante. Puede arrancar con el diseño de UI en paralelo usando la tabla de inputs de este checkpoint.

**Próximo paso:**
Entregar los 4 archivos completos (`engine.js`, `ui-inputs.js`, `ui-results.js`, `app.js` + HTML shell) listos para reemplazar el monolito actual.
