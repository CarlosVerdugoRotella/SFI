# Agent-Inmobiliario — Updates

---

## 2026-04-19 — CHECKPOINT EN PROGRESO

**Hice:**
- Subí `inmobiliario/sensibilizador-propiedades.html` v1.0 — comparador de propiedades con Gap Bruto, VOB, tabla ordenable, tags Oportunidad/Comparable (commit `3314ce7`)
- Subí `inmobiliario/calculadora-costos.html` v1.0 — calculadora de costos con bloques: Compra, Arquitectura/Permisos, Construcción/Remodelación, Holding. Gap Neto = VOB − Precio − Costos. Footer sticky con métricas live (commit `3d2bc1f`)
- Subí `inmobiliario/sfi-state.js` — state manager vía localStorage para pasar datos entre H1→H2→H3. Define `SFI.saveH1()`, `SFI.loadH1()`, `SFI.saveH2()`, `SFI.loadH2()` (commit `503a372`)

**Dejé listo para:**
- H1 y H2 son funcionales de forma standalone — se pueden usar en GitHub Pages ya
- `sfi-state.js` está listo para ser consumido por los 3 archivos

**Pendiente en mi dominio:**
1. Actualizar `sensibilizador-propiedades.html` — integrar `sfi-state.js`: agregar `<script src="sfi-state.js">`, llamar `SFI.saveH1()` al recalcular, añadir botón "→ Continuar a Costos"
2. Actualizar `calculadora-costos.html` — integrar `sfi-state.js`: precargar campos desde `SFI.loadH1()`, llamar `SFI.saveH2()` al calcular, añadir botón "→ Continuar a Balance"
3. Crear `inmobiliario/balance-final.html` (H3) — lee H1+H2 vía `SFI.loadH1()` + `SFI.loadH2()`, arma balance final: Precio Compra + Costos Totales vs VOB, gap neto, ROI estimado, recomendación

**Nomenclatura real vs PROMPT:**
- El PROMPT describe `calculadora-remodelacion.html` y `calculadora-inversion-inmob.html` como H2 y H3
- En la implementación real decidimos con el operador renombrar: H2 = `calculadora-costos.html`, H3 = `balance-final.html`
- El PROMPT-agent-inmobiliario.md debe actualizarse para reflejar esta nomenclatura cuando H3 esté listo

**Necesito de Agent-Modelo:** nada por ahora — las 3 herramientas son standalone sin motor societario

**Próximo paso:** subir los 3 archivos pendientes (integración H1, integración H2, nuevo H3) en el próximo hilo
