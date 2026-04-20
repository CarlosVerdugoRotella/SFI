// ==================== app.js — Calculadora Inversión Inmobiliaria ====================
// Coordinador principal — Suite Financiera Inversión (SFI) v1.0
// Depende de: ../gastro/engine.js, ./sfi-state.js, ui-inputs.js, ui-results.js
// Orden de carga en HTML:
//   1. ../gastro/engine.js
//   2. ./sfi-state.js
//   3. ui-inputs.js
//   4. ui-results.js
//   5. app.js  ← este archivo
// =====================================================================================

// ==================== CONSTANTES ====================

const PLAZO_INMOB_MESES = 360; // 30 años

// ==================== ESTADO GLOBAL ====================

let tiers         = [];
let nextTierId    = 2;
let detalleState  = {}; // { tierId: { expanded, page } }
let h3Params      = null; // datos precargados desde Balance Final
let h3Propiedad   = null; // objeto propiedad completo

// ==================== UTILIDADES NUMÉRICAS ====================

function cleanNumber(val) {
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
}

function formatMoney(val) {
  if (val === null || val === undefined || isNaN(val)) return '$0';
  return '$' + Math.round(val).toLocaleString('es-CL');
}

function formatUF(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return 'UF 0';
  return 'UF ' + val.toFixed(decimals).replace('.', ',');
}

function formatPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return '0,0%';
  return (val * 100).toFixed(1).replace('.', ',') + '%';
}

function getAoFromMes(mes) {
  return Math.ceil(mes / 12);
}

// ==================== LEER VALOR UF ====================

function getValorUF() {
  const raw = document.getElementById('valorUF').value;
  const parsed = cleanNumber(raw);
  return parsed > 0 ? parsed : SFI.loadValorUF();
}

// ==================== CONSTRUIR inmobParams PARA EL MOTOR ====================
// Contrato definido en dev/agent-updates/agent-modelo.md
// Para patrones inmobiliarios getDividendoMensual() usa:
//   arriendoBaseUF, ajusteAnualPct, plazoAnios  → flujo arriendo
//   precioVentaUF, mesVenta, costoVentaPct,
//   costoVentaFijoCLP, valorUF                 → flujo venta
// Los campos gastro (ingresos, incluirIVA, pctIVA, margenUtilidad, pctDistribuir)
// se pasan como null/0 — el motor los ignora en patrones inmobiliarios.

function buildInmobParams() {
  const valorUF          = getValorUF();
  const arriendoBaseUF   = parseFloat(document.getElementById('arriendoBaseUF').value)   || 0;
  const ajusteAnualPct   = parseFloat(document.getElementById('ajusteAnualPct').value)    || 0;
  const plazoAnios       = parseInt(document.getElementById('plazoAnios').value)          || 0;
  const precioVentaUF    = parseFloat(document.getElementById('precioVentaUF').value)     || 0;
  const mesVenta         = parseInt(document.getElementById('mesVenta').value)            || 0;
  const costoVentaPct    = (parseFloat(document.getElementById('costoVentaPct').value)    || 0) / 100;
  const costoVentaFijoCLP= cleanNumber(document.getElementById('costoVentaFijoCLP').value);

  return {
    // Arriendo
    arriendoBaseUF,
    ajusteAnualPct: ajusteAnualPct / 100,
    plazoAnios,
    // Venta
    precioVentaUF,
    mesVenta,
    costoVentaPct,
    costoVentaFijoCLP,
    // UF
    valorUF,
    // Campos gastro requeridos por firma pero no usados en inmobiliario
    ingresos:       null,
    incluirIVA:     false,
    pctIVA:         0,
    margenUtilidad: 0,
    pctDistribuir:  0,
  };
}

// ==================== LEER INPUTS SOCIETARIOS ====================

function leerInputsSocietarios() {
  const pctSocMicroinv = (parseFloat(document.getElementById('pctSocMicroinv').value) / 100) || 0;
  const pctSocCtrl     = 1 - pctSocMicroinv;
  const impuesto1Cat   = (parseFloat(document.getElementById('impuesto1Cat').value)   / 100) || 0;
  const tasaDescuento  = (parseFloat(document.getElementById('tasaDescuento').value)  / 100) || 0.08;
  const controlador = {
    capitalInicial: cleanNumber(document.getElementById('ctrlCapitalInicial').value),
    retencion:      (parseFloat(document.getElementById('ctrlRetencion').value) / 100) || 0,
  };
  return { pctSocMicroinv, pctSocCtrl, impuesto1Cat, tasaDescuento, controlador };
}

// ==================== VALIDAR % MICROINV ====================

function validarPctMicroinv() {
  const val = parseFloat(document.getElementById('pctSocMicroinv').value);
  const errEl = document.getElementById('errorPct');
  if (isNaN(val) || val < 1 || val > 99) {
    errEl.classList.add('show');
    return false;
  }
  errEl.classList.remove('show');
  return true;
}

// ==================== CALCULAR FLUJO INMOBILIARIO POR MES ====================
// Wrapper sobre getDividendoMensual del engine con firma inmobiliaria.
// El engine detecta el patrón 'hibrido-inmobiliario' y usa los campos inmobParams.

function calcularFlujoPorMes(mes, inmobParams, pctSocMicroinv, pctEnSociedad, impuesto1Cat, retencion) {
  return getDividendoMensual(
    mes,
    inmobParams.ingresos,      // null → motor usa path inmobiliario
    inmobParams.incluirIVA,
    inmobParams.pctIVA,
    inmobParams.margenUtilidad,
    inmobParams.pctDistribuir,
    pctSocMicroinv,
    pctEnSociedad,
    impuesto1Cat,
    retencion,
    // inmobParams extendido (motor v3.2+ lee este 11vo argumento)
    inmobParams
  );
}

// ==================== CALCULAR TODO ====================

function calcularTodo() {
  try {
    if (!validarPctMicroinv()) return;
    if (tiers.length === 0) return;

    const p          = leerInputsSocietarios();
    const inmobParams = buildInmobParams();
    const valorUF    = inmobParams.valorUF;

    const capitalLevantado = tiers.reduce((s, t) => s + (t.cantidad * t.monto), 0);
    if (capitalLevantado <= 0) return;

    // ── RESULTADOS POR TIER ──────────────────────────────────────────────
    const resultadosTiers = tiers.map(tier => {
      const pctEnSociedad   = capitalLevantado > 0 ? (tier.monto / capitalLevantado) : 0;
      const pctEnInmobiliario = pctEnSociedad * p.pctSocMicroinv;
      const retencionDec    = tier.retencion / 100;

      // Flujo mes 12 (año 1) — como referencia de "estabilizado"
      const divRef = calcularFlujoPorMes(
        Math.max(12, tier.mesRetornos),
        inmobParams, p.pctSocMicroinv, pctEnSociedad, p.impuesto1Cat, retencionDec
      );

      // Flujo promedio desde mesRetornos hasta fin arriendo
      const mesFinArriendo = inmobParams.plazoAnios > 0
        ? inmobParams.plazoAnios * 12
        : PLAZO_INMOB_MESES;
      let sumaRetiros = 0;
      let mesesContados = 0;
      const mesHasta = Math.min(mesFinArriendo, PLAZO_INMOB_MESES);
      for (let mes = tier.mesRetornos; mes <= mesHasta; mes++) {
        const d = calcularFlujoPorMes(mes, inmobParams, p.pctSocMicroinv, pctEnSociedad, p.impuesto1Cat, retencionDec);
        sumaRetiros += d.neto;
        mesesContados++;
      }
      // Sumar ingreso de venta si mesVenta está en rango
      if (inmobParams.mesVenta > 0 && inmobParams.mesVenta >= tier.mesRetornos && inmobParams.mesVenta <= PLAZO_INMOB_MESES) {
        const dVenta = calcularFlujoPorMes(inmobParams.mesVenta, inmobParams, p.pctSocMicroinv, pctEnSociedad, p.impuesto1Cat, retencionDec);
        // dVenta.neto ya incluye el ingreso de venta neto — está en el flujo del mes de venta
      }
      const retiroPromedio = mesesContados > 0 ? sumaRetiros / mesesContados : 0;

      const roiAnual = tier.monto > 0 ? ((divRef.neto * 12) / tier.monto) : 0;

      // Payback
      let paybackMeses = null;
      let acumulado    = 0;
      for (let mes = tier.mesRetornos; mes <= PLAZO_INMOB_MESES; mes++) {
        const d = calcularFlujoPorMes(mes, inmobParams, p.pctSocMicroinv, pctEnSociedad, p.impuesto1Cat, retencionDec);
        acumulado += d.neto;
        if (acumulado >= tier.monto && paybackMeses === null) {
          paybackMeses = mes - tier.mesInversion;
          break;
        }
      }

      // TIR / VAN
      const flujos = [{ mes: tier.mesInversion, monto: -tier.monto }];
      for (let mes = tier.mesRetornos; mes <= PLAZO_INMOB_MESES; mes++) {
        const d = calcularFlujoPorMes(mes, inmobParams, p.pctSocMicroinv, pctEnSociedad, p.impuesto1Cat, retencionDec);
        flujos.push({ mes, monto: d.neto });
      }
      const tir = calcularTIR(flujos);
      const van = calcularVAN(flujos, p.tasaDescuento);

      // Detalle mensual completo
      const detalleMensual = [];
      let acumNeto = 0;
      for (let mes = tier.mesRetornos; mes <= PLAZO_INMOB_MESES; mes++) {
        const d = calcularFlujoPorMes(mes, inmobParams, p.pctSocMicroinv, pctEnSociedad, p.impuesto1Cat, retencionDec);
        acumNeto += d.neto;

        const ao      = getAoFromMes(mes);
        const mesEnAo = mes - ((ao - 1) * 12);
        const esVenta = inmobParams.mesVenta > 0 && mes === inmobParams.mesVenta;

        detalleMensual.push({
          mes,
          aoMes:     `${ao}.${mesEnAo}`,
          bruto:     d.bruto,
          brutoUF:   valorUF > 0 ? d.bruto / valorUF : 0,
          neto:      d.neto,
          netoUF:    valorUF > 0 ? d.neto  / valorUF : 0,
          acumulado: acumNeto,
          esPayback: paybackMeses !== null && (mes - tier.mesInversion) === paybackMeses,
          esVenta,
        });
      }

      return {
        tier,
        pctEnSociedad,
        pctEnInmobiliario,
        divRef,
        retiroPromedio,
        roiAnual,
        paybackMeses,
        tir,
        van,
        detalleMensual,
        capitalTier: tier.cantidad * tier.monto,
      };
    });

    // ── CONTROLADORA ──────────────────────────────────────────────────────
    const retencionCtrlDec = p.controlador.retencion;

    const divCtrlRef = calcularFlujoPorMes(
      Math.max(12, 1),
      inmobParams, p.pctSocCtrl, 1.0, p.impuesto1Cat, retencionCtrlDec
    );

    const inversionCtrl = p.controlador.capitalInicial > 0
      ? p.controlador.capitalInicial
      : capitalLevantado * (p.pctSocCtrl / (p.pctSocMicroinv || 0.01));

    const flujosCtrl = [{ mes: 0, monto: -inversionCtrl }];
    for (let mes = 1; mes <= PLAZO_INMOB_MESES; mes++) {
      const d = calcularFlujoPorMes(mes, inmobParams, p.pctSocCtrl, 1.0, p.impuesto1Cat, retencionCtrlDec);
      flujosCtrl.push({ mes, monto: d.neto });
    }
    const tirCtrl = calcularTIR(flujosCtrl);
    const vanCtrl = calcularVAN(flujosCtrl, p.tasaDescuento);

    // ── PROMEDIOS PONDERADOS ─────────────────────────────────────────────
    const paybackPromedio = capitalLevantado > 0
      ? resultadosTiers.reduce((s, r) => s + ((r.paybackMeses || PLAZO_INMOB_MESES) * r.capitalTier), 0) / capitalLevantado
      : 0;

    const roiPromedio = capitalLevantado > 0
      ? resultadosTiers.reduce((s, r) => s + (r.roiAnual * r.capitalTier), 0) / capitalLevantado
      : 0;

    const tirPromedio = capitalLevantado > 0
      ? resultadosTiers.reduce((s, r) => s + ((r.tir || 0) * r.capitalTier), 0) / capitalLevantado
      : 0;

    const vanTotal = resultadosTiers.reduce((s, r) => s + (r.van || 0), 0) + (vanCtrl || 0);

    // Arriendo neto mensual (mes 12, tier 1 proporcional al total)
    const arriendoNetoMesUF = valorUF > 0 ? divCtrlRef.neto / valorUF : 0;

    // ── ACTUALIZAR MÉTRICAS RESUMEN ──────────────────────────────────────
    document.getElementById('metricCapital').textContent    = formatMoney(capitalLevantado);
    document.getElementById('metricCapitalPct').textContent = formatPercent(p.pctSocMicroinv) + ' equity';
    document.getElementById('metricPayback').textContent    = paybackPromedio ? Math.round(paybackPromedio) + ' meses' : '> 30 años';
    document.getElementById('metricROI').textContent        = formatPercent(roiPromedio);
    document.getElementById('metricTIR').textContent        = tirPromedio ? formatPercent(tirPromedio) : 'N/C';
    document.getElementById('metricVAN').textContent        = formatMoney(vanTotal);
    document.getElementById('metricArriendoNeto').textContent    = formatUF(arriendoNetoMesUF);
    document.getElementById('metricArriendoNetoCLP').textContent = formatMoney(divCtrlRef.neto);

    // Semáforos métrica payback y ROI
    const metricPaybackEl = document.getElementById('metricPayback');
    metricPaybackEl.classList.remove('text-warning', 'text-error');
    if (paybackPromedio > 120) metricPaybackEl.classList.add('text-warning');
    if (paybackPromedio > 240) metricPaybackEl.classList.add('text-error');

    const metricROIEl = document.getElementById('metricROI');
    metricROIEl.classList.remove('text-error');
    if (roiPromedio < 0.04) metricROIEl.classList.add('text-error');

    // ── RENDER TIERS RESULTADOS ──────────────────────────────────────────
    renderTiersResults(resultadosTiers, inmobParams, valorUF);

    // ── CONTROLADORA ────────────────────────────────────────────────────
    document.getElementById('ctrlResultPct').textContent         = formatPercent(p.pctSocCtrl);
    document.getElementById('ctrlResultPctSub').textContent      = formatPercent(p.pctSocCtrl) + ' inmobiliaria';
    document.getElementById('ctrlResultValor').textContent       = formatMoney(inversionCtrl);
    document.getElementById('ctrlResultRetiroNeto').textContent  = formatMoney(divCtrlRef.neto);
    document.getElementById('ctrlResultRetiroBruto').textContent = 'Bruto: ' + formatMoney(divCtrlRef.bruto);
    document.getElementById('ctrlResultAnual').textContent       = formatMoney(divCtrlRef.neto * 12);
    document.getElementById('ctrlResultTIR').textContent         = tirCtrl !== null ? formatPercent(tirCtrl) : 'N/A';
    document.getElementById('ctrlResultVAN').textContent         = vanCtrl !== null ? formatMoney(vanCtrl)   : 'N/A';

    // ── GRÁFICO ──────────────────────────────────────────────────────────
    renderChart(resultadosTiers, { flujos: flujosCtrl }, p.tasaDescuento);

  } catch (err) {
    console.error('❌ app.js calcularTodo():', err);
  }
}

// ==================== PRELLENADO DESDE H3 ====================

function preCargarDesdeH3() {
  h3Params = SFI.loadH3Params();
  if (!h3Params) return;

  h3Propiedad = SFI.getPropiedad(h3Params.propiedadId);
  if (!h3Propiedad) return;

  const valorUF = SFI.loadValorUF();

  // ── Precargar inputs ─────────────────────────────────────────────────
  const setVal = (id, val, addFromH3 = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = val;
    if (addFromH3) el.classList.add('from-h3');
  };

  // Valor UF
  setVal('valorUF', valorUF.toLocaleString('es-CL'));

  // Arriendo base (viene de la propiedad)
  if (h3Propiedad.arriendoEstimadoUF) {
    setVal('arriendoBaseUF', h3Propiedad.arriendoEstimadoUF.toFixed(2));
  }

  // Reajuste anual: default 3% si no viene en h3
  setVal('ajusteAnualPct', 3, false);

  // Plazo arriendo: h3.plazoAnios (años del crédito como proxy — ajustable)
  if (h3Params.plazoAnios) {
    setVal('plazoAnios', h3Params.plazoAnios);
  }

  // Precio de venta: usar VOB de la propiedad como precio de venta estimado
  if (h3Propiedad.vobUF) {
    setVal('precioVentaUF', h3Propiedad.vobUF.toFixed(2));
  }

  // Mes de venta: h3.anioVenta * 12
  if (h3Params.anioVenta) {
    setVal('mesVenta', h3Params.anioVenta * 12);
  }

  // ── Mostrar banner ───────────────────────────────────────────────────
  const banner = document.getElementById('bannerH3');
  if (banner) {
    banner.classList.add('visible');

    const costos    = h3Propiedad.costos ? h3Propiedad.costos.costoTotalUF : 0;
    const gapNeto   = h3Propiedad.gapNetoUF || 0;
    const inversion = (h3Propiedad.precioUF || 0) + costos;

    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    const patronLabel = h3Params.patronSalida
      ? ({ 'arriendo-mensual': 'Arriendo mensual', 'venta-activo': 'Venta activo', 'hibrido': 'Híbrido' }[h3Params.patronSalida] || h3Params.patronSalida)
      : 'Híbrido (default)';

    setTxt('bannerPatron',      patronLabel);
    setTxt('bannerPrecioCompra', `UF ${(h3Propiedad.precioUF || 0).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
    setTxt('bannerCostos',       `UF ${costos.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
    setTxt('bannerVOB',          `UF ${(h3Propiedad.vobUF || 0).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
    setTxt('bannerGapNeto',      `UF ${gapNeto.toFixed(0)}`);
    setTxt('bannerInversion',    `UF ${inversion.toFixed(0)}`);

    // Nombre en el header
    if (h3Propiedad.nombre) {
      document.getElementById('displayNombreProyecto').textContent = h3Propiedad.nombre;
      const inputNombre = document.getElementById('nombreProyecto');
      if (inputNombre) inputNombre.value = h3Propiedad.nombre;
    }
  }

  console.log('✅ H3 precargado:', h3Propiedad.nombre || h3Params.propiedadId);
}

// ==================== LIMPIAR FORMULARIO ====================

function limpiarFormulario() {
  if (!confirm('¿Seguro que deseas limpiar todos los datos? Esta acción no se puede deshacer.')) return;

  // Limpiar clase from-h3
  document.querySelectorAll('.from-h3').forEach(el => el.classList.remove('from-h3'));

  document.getElementById('nombreProyecto').value     = '';
  document.getElementById('pctSocMicroinv').value     = 48;
  document.getElementById('pctSocControlador').value  = 52;
  document.getElementById('valorUF').value            = SFI.loadValorUF().toLocaleString('es-CL');
  document.getElementById('arriendoBaseUF').value     = 0;
  document.getElementById('ajusteAnualPct').value     = 3;
  document.getElementById('plazoAnios').value         = 10;
  document.getElementById('precioVentaUF').value      = 0;
  document.getElementById('mesVenta').value           = 120;
  document.getElementById('costoVentaPct').value      = 2;
  document.getElementById('costoVentaFijoCLP').value  = '400.000';
  document.getElementById('impuesto1Cat').value       = 0;
  document.getElementById('ctrlCapitalInicial').value = '0';
  document.getElementById('ctrlRetencion').value      = 0;
  document.getElementById('tasaDescuento').value      = 8;

  // Ocultar banner H3
  const banner = document.getElementById('bannerH3');
  if (banner) banner.classList.remove('visible');

  document.getElementById('displayNombreProyecto').textContent = 'Sin nombre';

  h3Params    = null;
  h3Propiedad = null;
  detalleState = {};

  tiers = [{
    id: 1,
    nombre: 'Tier 1',
    cantidad: 10,
    monto: 5000000,
    mesInversion: 0,
    mesRetornos: 6,
    tipoHolder: 'personanatural',
    retencion: 10,
    collapsed: false,
  }];
  nextTierId = 2;

  renderTiers();
  calcularTodo();
}

// ==================== EXPORTAR PDF ====================

function exportarPDF() {
  const element = document.getElementById('mainContainer');
  const opt = {
    margin:       [10, 8, 10, 8],
    filename:     `SFI-Inversion-Inmobiliaria-${Date.now()}.pdf`,
    image:        { type: 'jpeg', quality: 0.95 },
    html2canvas:  { scale: 1.5, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
  };
  html2pdf().set(opt).from(element).save();
}

// ==================== COLAPSO BANNER H3 ====================

function initBannerH3() {
  const header = document.getElementById('bannerH3Header');
  const body   = document.getElementById('bannerH3Body');
  const toggle = document.getElementById('bannerH3Toggle');
  if (!header || !body || !toggle) return;

  header.addEventListener('click', () => {
    const collapsed = body.classList.toggle('collapsed');
    toggle.textContent = collapsed ? '▼' : '▲';
  });
}

// ==================== INICIALIZAR ====================

document.addEventListener('DOMContentLoaded', () => {

  // 1. Estado inicial de tiers
  tiers = [{
    id: 1,
    nombre: 'Tier 1',
    cantidad: 10,
    monto: 5000000,
    mesInversion: 0,
    mesRetornos: 6,
    tipoHolder: 'personanatural',
    retencion: 10,
    collapsed: false,
  }];
  nextTierId = 2;
  renderTiers();

  // 2. Intentar precargar desde H3
  preCargarDesdeH3();

  // 3. Listeners (ui-inputs.js)
  initInputListeners();

  // 4. Banner H3 colapso
  initBannerH3();

  // 5. Botones globales
  document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
  document.getElementById('btnExportar').addEventListener('click', exportarPDF);

  // 6. Nombre proyecto → header live
  document.getElementById('nombreProyecto').addEventListener('input', (e) => {
    const nombre = e.target.value.trim() || 'Sin nombre';
    document.getElementById('displayNombreProyecto').textContent = nombre;
  });

  // 7. Cálculo inicial
  calcularTodo();
});
