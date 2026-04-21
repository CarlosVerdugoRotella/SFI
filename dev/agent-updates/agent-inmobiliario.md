# Agent-Inmobiliario — Updates

---

## 2026-04-20 — COMPLETADO ✅ (Sesión #3)

### Qué se hizo

**Bug fix: botones "Agregar propiedad" no funcionaban en sensibilizador.**

- Diagnosticado problema raíz: `localStorage` bloqueado en sandbox/iframe (Perplexity, GitHub Pages embebido). `_write()` fallaba silenciosamente, `_read()` retornaba siempre `{}`, y `SFI.getPropiedad(id)` retornaba `null` — interrumpiendo el flujo de render de cada card.
- Actualizado `inmobiliario/sfi-state.js` → **v2.1** (commit `4806b4d`)
  - Backend de `_read()` / `_write()` / `clearAll()` reemplazado por objeto en memoria (`let _state = {}`)
  - Toda la API pública queda **100% idéntica** a v2 — ningún otro archivo requiere cambios
  - `SFI` ahora es un IIFE (`(() => { ... })()`) para encapsular `_state` como variable privada
  - Impacto en `sensibilizador-propiedades.html`, `costos-modal.js` y `balance-final.html`: **cero cambios requeridos**

**Consideración para el futuro:** si el sistema se despliega en un contexto donde `localStorage` está disponible (servidor propio, no iframe), se puede restaurar el backend original cambiando solo `_read()`, `_write()` y `clearAll()`. La API pública no cambia.

---

### Estado de archivos del flujo inmobiliario (actualizado)

| Archivo | Estado | Commit |
|---|---|---|
| `inmobiliario/sfi-state.js` | ✅ v2.1 funcional (fix localStorage) | `4806b4d` |
| `inmobiliario/costos-modal.js` | ✅ funcional | `eda8c99` |
| `inmobiliario/sensibilizador-propiedades.html` | ✅ v2 integrado | `3dd4c6a` |
| `inmobiliario/balance-final.html` | ✅ H3 listo | `c49b374` |
| `inmobiliario/calculadora-inversion-inmob.html` | 🔲 pendiente | — |

---

### Próximo paso

Sin cambios respecto a sesión anterior. Siguiente tarea sigue siendo:

Construir `inmobiliario/calculadora-inversion-inmob.html`:
1. Shell HTML + `<script src="../gastro/engine.js">` + `<script src="./sfi-state.js">`
2. Sidebar: selector patrón → inputs inmob (prellenados desde H3) → tiers → parámetros societarios
3. Resultados: KPIs TIR/VAN/ROI/Payback + gráfico + tabla mensual
4. Banner H3 si hay datos guardados

---

## 2026-04-20 — COMPLETADO ✅ (Sesión #2)

### Qué se hizo

- Rediseño completo de `sfi-state.js` → **v2** (commit `b1eef05`)
  - API eliminada: `saveH1/loadH1/saveH2/loadH2`
  - API nueva: `savePropiedad`, `loadPropiedades`, `savePropiedad`, `saveCostos`, `getPropiedad`, `deletePropiedad`, `loadOportunidades`, `saveH3Params`, `loadH3Params`, `saveValorUF`, `loadValorUF`, `clearAll`, `debug`
  - Cada propiedad tiene costos embebidos y `gapNetoUF` recalculado automáticamente por `saveCostos()`

- Creado `inmobiliario/costos-modal.js` (commit `eda8c99`)
  - Modal reutilizable para editar costos de cualquier propiedad
  - Bloques: Compra (notaría + comisión + otros), Arquitectura/Permisos (filas dinámicas), Construcción/Remodelación (filas dinámicas + % imprevistos), Holding (contribuciones + gastos básicos + otros por duración)
  - Persiste en `SFI.saveCostos(id, costos)` y dispara evento DOM `sfi:costos-saved` para que H1 actualice el badge y el gap neto en la card

- Actualizado `sensibilizador-propiedades.html` → **v2** (commit `3dd4c6a`)
  - Integración completa con `sfi-state.js` y `costos-modal.js`
  - Nuevo campo por propiedad: `arriendoEstimadoUF` (UF/mes)
  - Badge por card: `Costos guardados` / `Pendiente costos`
  - Gap neto visible en cada card (lee `gapNetoUF` desde estado)
  - Tabla comparativa ampliada: columnas `Arriendo` y `Gap Neto` ordenables
  - Botón `Seleccionar para H3` por oportunidad → navega a `balance-final.html`
  - Barra sticky con conteo de propiedades, oportunidades y con costos
  - Persiste todas las propiedades en `SFI.savePropiedad()` y rehidrata al cargar

- Creado `inmobiliario/balance-final.html` — **H3** (commit `c49b374`)
  - Lee oportunidades desde `SFI.loadOportunidades()`
  - Selector de patrón de salida: `arriendo-mensual` / `venta-activo` / `hibrido`
  - Captura parámetros que el motor (engine.js) necesita y que H1/H2 no tienen: `ajusteAnualPct`, `plazoAnios`, `mesVenta`, `costoVentaPct`, `costoVentaFijoCLP`
  - Calcula métricas operativas: inversión base, venta neta, utilidad venta, ROI, yield bruto, yield sobre inversión, payback simple
  - Tabla de campos exportados con semáforo de completitud por campo
  - Tabla explícita de los datos que la calculadora de inversión debe seguir pidiendo en su propia UI
  - Guarda paquete completo en `SFI.saveH3Params(data)` al presionar "Guardar outputs"

---

### Arquitectura adoptada: flujo H1 → costos-modal → H3

**Decisión clave:** `calculadora-costos.html` (herramienta standalone de la entrega original) fue reemplazada funcionalmente por `costos-modal.js`, un modal embebido en H1. Esto evita navegación innecesaria: el usuario carga costos sin salir del sensibilizador.

**El flujo real es:**
```
H1: sensibilizador-propiedades.html
  ↓ por propiedad, abre modal:
  costos-modal.js  →  SFI.saveCostos(id, costos)  →  gapNetoUF recalculado
  ↓ botón "Seleccionar para H3" o botón sticky "Continuar a Balance"
H3: balance-final.html
  ↓ SFI.saveH3Params(data)
  ↓ (futuro) calculadora-inversion-inmob.html lee SFI.loadH3Params()
```

**Estructura de `sfi-state` por propiedad:**
```js
{
  id, nombre, tipo, estado,
  precioUF, vobUF, vobM2,
  m2Construido, m2Terreno, m2Exterior,
  dormitorios, banos, link,
  arriendoEstimadoUF,   // ← nuevo campo H1
  ufM2, vobUfM2, gapBrutoUF,
  costos: {             // ← embebido desde costos-modal.js
    duracionMeses,
    totalCompraUF, totalArquitecturaUF,
    totalConstruccionUF, totalHoldingUF, costoTotalUF,
    detalle: { ... }
  } | null,
  gapNetoUF             // ← recalculado por saveCostos()
}
```

**Estructura de `sfi-state.h3` (paquete exportado desde H3):**
```js
{
  propiedadId,
  patronSalida,          // 'arriendo-mensual' | 'venta-activo' | 'hibrido'
  precioCompraUF,
  costosTotalesUF,
  gapBrutoUF, gapNetoUF,
  arriendoBaseUF,        // ← arriendoEstimadoUF de H1
  precioVentaUF,         // ← vobUF de H1
  valorUF,
  inversionBaseUF,       // precioCompraUF + costosTotalesUF
  ajusteAnualPct,
  plazoAnios,
  mesVenta,
  costoVentaPct,         // default 0.02
  costoVentaFijoCLP,     // default 400.000
  ventaNetaUF, utilidadVentaUF, roiVenta,
  arriendoAnualUF, yieldBruto, yieldSobreInversion, paybackAnios
}
```

---

### Lo que la calculadora de inversión inmobiliaria debe incorporar

`calculadora-inversion-inmob.html` es el siguiente paso. Debe importar `../gastro/engine.js` (o copiarlo a `inmobiliario/`) y estructurarse igual que `gastro/calculadora-inversion.html` con estos delta:

**1. Prellenado desde H3**
Al cargar, leer `SFI.loadH3Params()` y prellenar automáticamente:

| Input de la calculadora | Fuente en h3Params |
|---|---|
| `arriendoBaseUF` | `h3.arriendoBaseUF` |
| `ajusteAnualPct` | `h3.ajusteAnualPct` |
| `plazoAnios` | `h3.plazoAnios` |
| `precioVentaUF` | `h3.precioVentaUF` |
| `mesVenta` | `h3.mesVenta` |
| `costoVentaPct` | `h3.costoVentaPct` |
| `costoVentaFijoCLP` | `h3.costoVentaFijoCLP` |
| `valorUF` | `h3.valorUF` |
| Inversión total tiers (suma) | `h3.inversionBaseUF × valorUF` como referencia visible |

**2. Selector de patrón de salida**
```
Patrón de salida: [ arriendo-mensual | venta-activo | híbrido ]
```
Mostrar/ocultar campos según patrón. Preseleccionar con `h3.patronSalida`.

**3. Llamada al orquestador del motor**
```js
patron: h3.patronSalida,
inmobParams: {
  arriendoBaseUF, ajusteAnualPct, plazoAnios,
  precioVentaUF, mesVenta, costoVentaPct, costoVentaFijoCLP, valorUF
}
```

**4. Inputs societarios (no vienen de H3, los ingresa el usuario)**
- Tiers: cantidad, monto individual (CLP o UF), mes inversión, mes inicio retornos, tipo holder
- `pctSocMicroinv`, `pctEnSociedad`, `impuesto1Cat`, `retencion`, `tasaDescuento`

**5. Banner H3 colapsable** si `SFI.loadH3Params()` tiene datos.

---

### Nomenclatura final

| Paso | Archivo | Función |
|---|---|---|
| H1 | `sensibilizador-propiedades.html` | Comparar propiedades, VOB, gap bruto, costos modal, gap neto |
| costos | `costos-modal.js` | Modal embebido en H1 para cargar costos de proyecto |
| H3 | `balance-final.html` | Patrón de salida, inputs de tiempo, export a calculadora |
| Motor | `../gastro/engine.js` | Motor financiero compartido (gastro + inmobiliario) |
| Calculadora | `calculadora-inversion-inmob.html` | UI societaria + motor + outputs TIR/VAN/ROI |

---

### Necesito de otros agentes

- **Agent-Modelo:** confirmar que `engine.js` en `gastro/` es la referencia a importar con `../gastro/engine.js` desde `/inmobiliario/`. Si la ruta genera problemas en GitHub Pages, evaluar copiar el engine a `/inmobiliario/engine.js`.
