// ==================== engine.js ====================
// Motor financiero puro — Suite Financiera Inversión v3.2
// SIN acceso al DOM. Solo funciones y constantes.
// Cargado antes que app.js, ui-inputs.js, ui-results.js
// ====================================================

// ==================== CONSTANTES ====================

const PLAZO_PROYECCION_ANIOS  = 30;
const PLAZO_PROYECCION_MESES  = 360;   // PLAZO_PROYECCION_ANIOS * 12

// ==================== UTILIDADES ====================

function cleanNumber(str) {
  if (!str) return 0;
  return parseFloat(str.toString().replace(/\./g, '').replace(/[^0-9]/g, '')) || 0;
}

function formatMoney(num) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(num);
}

function formatPercent(num, decimals = 1) {
  return (num * 100).toFixed(decimals) + '%';
}

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function getAoFromMes(mes) {
  return Math.ceil(mes / 12);
}

// ==================== CÁLCULOS FINANCIEROS ====================

function calcularTIR(flujos, maxIter = 100, tolerancia = 0.0001) {
  if (flujos.length === 0) return null;

  let r = 0.1;
  for (let iter = 0; iter < maxIter; iter++) {
    let van = 0;
    let vanDerivada = 0;

    flujos.forEach(f => {
      const t = f.mes / 12;
      van += f.monto / Math.pow(1 + r, t);
      vanDerivada += -t * f.monto / Math.pow(1 + r, t + 1);
    });

    if (Math.abs(van) < tolerancia) return r;
    if (vanDerivada === 0) break;

    r = r - van / vanDerivada;
    if (r < -0.99) r = -0.99;
    if (r > 10)    r = 10;
  }

  return null;
}

function calcularVAN(flujos, tasaDescuentoAnual) {
  let van = 0;
  flujos.forEach(f => {
    const t = f.mes / 12;
    van += f.monto / Math.pow(1 + tasaDescuentoAnual, t);
  });
  return van;
}

// ==================== CASCADA TRIBUTARIA ====================
// Reutilizable por todos los patrones (gastro e inmobiliario)

function aplicarCascadaTributaria(distribuibleTotal, pctSocMicroinv, pctEnSociedad, impuesto1Cat, retencion) {
  const dividendoSociedad = distribuibleTotal * pctSocMicroinv;
  const impuesto1CatSoc   = dividendoSociedad * impuesto1Cat;
  const utilidadNetaSoc   = dividendoSociedad - impuesto1CatSoc;
  const bruto             = utilidadNetaSoc * pctEnSociedad;
  const retencionInd      = bruto * retencion;
  return {
    dividendoSociedad,
    impuesto1CatSoc,
    utilidadNetaSoc,
    bruto,
    neto: bruto - retencionInd
  };
}

// ==================== GENERADORES DE FLUJO INMOBILIARIO ====================

/**
 * Flujo mensual de arriendo ajustado anualmente en UF, convertido a CLP.
 * Retorna 0 después del plazo máximo.
 */
function getFlujoArriendoMensual(mes, arriendoBaseUF, ajusteAnualPct, plazoAnios, valorUF) {
  const ao = getAoFromMes(mes);
  if (ao > plazoAnios) return 0;
  const arriendoAjustado = arriendoBaseUF * Math.pow(1 + ajusteAnualPct, ao - 1);
  return arriendoAjustado * valorUF;
}

/**
 * Evento único de venta de activo en CLP, neto de costos.
 * Retorna 0 en todos los meses excepto mesVenta.
 * costoVentaPct: decimal (ej: 0.02 = 2%)
 * costoVentaFijoCLP: monto fijo en pesos (ej: 400000)
 */
function getFlujoVentaActivo(mes, mesVenta, precioVentaUF, costoVentaPct, costoVentaFijoCLP, valorUF) {
  if (mes !== mesVenta) return 0;
  const ventaBrutaCLP  = precioVentaUF * valorUF;
  const costoVentaCLP  = (ventaBrutaCLP * costoVentaPct) + costoVentaFijoCLP;
  return ventaBrutaCLP - costoVentaCLP;
}

/**
 * Patrón híbrido: arriendo mensual + evento de venta en el mes de salida.
 */
function getFlujoHibrido(mes, arriendoBaseUF, ajusteAnualPct, mesVenta, precioVentaUF, costoVentaPct, costoVentaFijoCLP, valorUF) {
  return getFlujoArriendoMensual(mes, arriendoBaseUF, ajusteAnualPct, PLAZO_PROYECCION_ANIOS, valorUF)
       + getFlujoVentaActivo(mes, mesVenta, precioVentaUF, costoVentaPct, costoVentaFijoCLP, valorUF);
}

// ==================== ORQUESTADOR PRINCIPAL ====================
// getDividendoMensual — retrocompatible con patrón gastro (v3.1)
// Nuevo parámetro: patron (default 'dividendos-recurrentes')
// Nuevo parámetro: inmobParams (solo para patrones inmobiliarios)

function getDividendoMensual(
  mes,
  ingresos,
  incluirIVA,
  pctIVA,
  margenUtilidad,
  pctDistribuir,
  pctSocMicroinv,
  pctEnSociedad,
  impuesto1Cat,
  retencion,
  patron = 'dividendos-recurrentes',
  inmobParams = null
) {
  let distribuibleTotal = 0;
  let ingresoMes = 0;
  let iva = 0;
  let ingresoNeto = 0;
  let utilidadOperacional = 0;

  if (patron === 'dividendos-recurrentes') {
    // --- PATRÓN GASTRO (comportamiento original intacto) ---
    const ao = getAoFromMes(mes);
    let ingresoAnual;
    if      (ao === 1) ingresoAnual = ingresos.ao1;
    else if (ao === 2) ingresoAnual = ingresos.ao2;
    else if (ao === 3) ingresoAnual = ingresos.ao3;
    else if (ao === 4) ingresoAnual = ingresos.ao4;
    else               ingresoAnual = ingresos.ao5;

    ingresoMes = ingresoAnual / 12;

    if (incluirIVA) {
      iva         = ingresoMes * pctIVA;
      ingresoNeto = ingresoMes - iva;
    } else {
      ingresoNeto = ingresoMes;
    }

    utilidadOperacional = ingresoNeto * margenUtilidad;
    distribuibleTotal   = utilidadOperacional * pctDistribuir;

  } else if (patron === 'arriendo-mensual') {
    // --- PATRÓN INMOBILIARIO: ARRIENDO ---
    const { arriendoBaseUF, ajusteAnualPct, plazoAnios, valorUF } = inmobParams;
    distribuibleTotal = getFlujoArriendoMensual(mes, arriendoBaseUF, ajusteAnualPct, plazoAnios, valorUF);

  } else if (patron === 'venta-activo') {
    // --- PATRÓN INMOBILIARIO: VENTA ---
    const { mesVenta, precioVentaUF, costoVentaPct, costoVentaFijoCLP, valorUF } = inmobParams;
    distribuibleTotal = getFlujoVentaActivo(mes, mesVenta, precioVentaUF, costoVentaPct, costoVentaFijoCLP, valorUF);

  } else if (patron === 'hibrido') {
    // --- PATRÓN INMOBILIARIO: HÍBRIDO ---
    const { arriendoBaseUF, ajusteAnualPct, mesVenta, precioVentaUF, costoVentaPct, costoVentaFijoCLP, valorUF } = inmobParams;
    distribuibleTotal = getFlujoHibrido(mes, arriendoBaseUF, ajusteAnualPct, mesVenta, precioVentaUF, costoVentaPct, costoVentaFijoCLP, valorUF);
  }

  // --- CASCADA TRIBUTARIA (común a todos los patrones) ---
  const cascada = aplicarCascadaTributaria(distribuibleTotal, pctSocMicroinv, pctEnSociedad, impuesto1Cat, retencion);

  return {
    // Intermedios gastro (útiles para debug, cero en patrones inmobiliarios)
    ingresoMes,
    iva,
    ingresoNeto,
    utilidadOperacional,
    distribuibleTotal,
    // Cascada tributaria
    dividendoSociedad:  cascada.dividendoSociedad,
    impuesto1CatSoc:    cascada.impuesto1CatSoc,
    utilidadNetaSoc:    cascada.utilidadNetaSoc,
    // Outputs principales
    bruto:   cascada.bruto,
    neto:    cascada.neto,
    // Output UF (para UI inmobiliaria)
    netoUF:  inmobParams && inmobParams.valorUF ? cascada.neto / inmobParams.valorUF : null
  };
}
