// ==================== app.js ====================
// Coordinador principal — Suite Financiera Inversión v3.2
// Depende de: engine.js, ui-inputs.js, ui-results.js
// Orden de carga en HTML:
//   1. engine.js
//   2. ui-inputs.js
//   3. ui-results.js
//   4. app.js  ← este archivo
// ================================================

// ==================== LEER INPUTS ====================

function leerInputs() {
  const pctSocMicroinv = (parseFloat(document.getElementById('pctSocMicroinv').value) / 100) || 0;
  const pctSocChef     = (parseFloat(document.getElementById('pctSocChef').value)     / 100) || 0;

  const incluirIVA = document.getElementById('incluirIVA').checked;
  const pctIVA     = (parseFloat(document.getElementById('pctIVA').value) / 100) || 0.19;

  const ingresos = {
    ao1: cleanNumber(document.getElementById('ingresoAo1').value),
    ao2: cleanNumber(document.getElementById('ingresoAo2').value),
    ao3: cleanNumber(document.getElementById('ingresoAo3').value),
    ao4: cleanNumber(document.getElementById('ingresoAo4').value),
    ao5: cleanNumber(document.getElementById('ingresoAo5').value)
  };

  const margenUtilidad = (parseFloat(document.getElementById('margenUtilidad').value) / 100) || 0;
  const pctDistribuir  = (parseFloat(document.getElementById('pctDistribuir').value)  / 100) || 0;
  const impuesto1Cat   = (parseFloat(document.getElementById('impuesto1Cat').value)   / 100) || 0.25;
  const tasaDescuento  = (parseFloat(document.getElementById('tasaDescuento').value)  / 100) || 0.12;

  const controlador = {
    capitalInicial: cleanNumber(document.getElementById('ctrlCapitalInicial').value),
    retencion:      (parseFloat(document.getElementById('ctrlRetencion').value) / 100) || 0
  };

  return {
    pctSocMicroinv, pctSocChef,
    incluirIVA, pctIVA,
    ingresos,
    margenUtilidad, pctDistribuir, impuesto1Cat, tasaDescuento,
    controlador
  };
}

// ==================== CALCULAR TODO ====================

function calcularTodo() {
  try {
    if (!validarPctMicroinv()) return;
    if (tiers.length === 0) return;

    const p = leerInputs();

    // Capital levantado y valorización
    const capitalLevantado = tiers.reduce((sum, t) => sum + (t.cantidad * t.monto), 0);
    const valorEmpresa     = p.pctSocMicroinv > 0 ? (capitalLevantado / p.pctSocMicroinv) : 0;
    const valorControlador = valorEmpresa * p.pctSocChef;

    // ── RESULTADOS POR TIER ──────────────────────────────────────────────
    const resultadosTiers = tiers.map(tier => {
      const pctEnSociedad  = capitalLevantado > 0 ? (tier.monto / capitalLevantado) : 0;
      const pctEnRestaurant = pctEnSociedad * p.pctSocMicroinv;
      const retencionDec   = tier.retencion / 100;

      // Retiro Año 5
      const divAo5 = getDividendoMensual(
        60, p.ingresos, p.incluirIVA, p.pctIVA, p.margenUtilidad,
        p.pctDistribuir, p.pctSocMicroinv, pctEnSociedad,
        p.impuesto1Cat, retencionDec
      );

      // Retiro promedio primeros 5 años
      let sumaRetiros5Aos = 0;
      for (let mes = tier.mesRetornos; mes <= 60; mes++) {
        const div = getDividendoMensual(
          mes, p.ingresos, p.incluirIVA, p.pctIVA, p.margenUtilidad,
          p.pctDistribuir, p.pctSocMicroinv, pctEnSociedad,
          p.impuesto1Cat, retencionDec
        );
        sumaRetiros5Aos += div.neto;
      }
      const mesesRetornos5Aos  = Math.max(1, 60 - tier.mesRetornos + 1);
      const retiroPromedio5Aos = sumaRetiros5Aos / mesesRetornos5Aos;

      const roiAnual = tier.monto > 0 ? ((divAo5.neto * 12) / tier.monto) : 0;

      // Payback
      let paybackMeses = null;
      let acumulado    = 0;
      for (let mes = tier.mesRetornos; mes <= PLAZO_PROYECCION_MESES; mes++) {
        const div = getDividendoMensual(
          mes, p.ingresos, p.incluirIVA, p.pctIVA, p.margenUtilidad,
          p.pctDistribuir, p.pctSocMicroinv, pctEnSociedad,
          p.impuesto1Cat, retencionDec
        );
        acumulado += div.neto;
        if (acumulado >= tier.monto) {
          paybackMeses = mes - tier.mesInversion;
          break;
        }
      }

      // TIR / VAN
      const flujos = [{ mes: tier.mesInversion, monto: -tier.monto }];
      for (let mes = tier.mesRetornos; mes <= PLAZO_PROYECCION_MESES; mes++) {
        const div = getDividendoMensual(
          mes, p.ingresos, p.incluirIVA, p.pctIVA, p.margenUtilidad,
          p.pctDistribuir, p.pctSocMicroinv, pctEnSociedad,
          p.impuesto1Cat, retencionDec
        );
        flujos.push({ mes, monto: div.neto });
      }
      const tir = calcularTIR(flujos);
      const van = calcularVAN(flujos, p.tasaDescuento);

      // Detalle mensual completo (360 meses)
      const detalleMensual = [];
      let acumNeto = 0;
      for (let mes = tier.mesRetornos; mes <= PLAZO_PROYECCION_MESES; mes++) {
        const div = getDividendoMensual(
          mes, p.ingresos, p.incluirIVA, p.pctIVA, p.margenUtilidad,
          p.pctDistribuir, p.pctSocMicroinv, pctEnSociedad,
          p.impuesto1Cat, retencionDec
        );
        acumNeto += div.neto;

        const ao       = getAoFromMes(mes);
        const mesEnAo  = mes - ((ao - 1) * 12);

        detalleMensual.push({
          mes,
          aoMes:      `${ao}.${mesEnAo}`,
          bruto:      div.bruto,
          neto:       div.neto,
          acumulado:  acumNeto,
          esPayback:  paybackMeses === (mes - tier.mesInversion)
        });
      }

      return {
        tier,
        pctEnSociedad,
        pctEnRestaurant,
        divAo5,
        retiroPromedio5Aos,
        roiAnual,
        paybackMeses,
        tir,
        van,
        detalleMensual,
        capitalTier: tier.cantidad * tier.monto
      };
    });

    // ── CONTROLADOR ──────────────────────────────────────────────────────
    const retencionCtrlDec = p.controlador.retencion;

    const divCtrlAo5       = getDividendoMensual(
      60, p.ingresos, p.incluirIVA, p.pctIVA, p.margenUtilidad,
      p.pctDistribuir, p.pctSocChef, 1.0,
      p.impuesto1Cat, retencionCtrlDec
    );
    const utilidadAnualCtrl = divCtrlAo5.neto * 12;

    const inversionInicialChef = valorEmpresa * p.pctSocChef;
    const flujosCtrl = [{ mes: 0, monto: -inversionInicialChef }];
    for (let mes = 1; mes <= PLAZO_PROYECCION_MESES; mes++) {
      const div = getDividendoMensual(
        mes, p.ingresos, p.incluirIVA, p.pctIVA, p.margenUtilidad,
        p.pctDistribuir, p.pctSocChef, 1.0,
        p.impuesto1Cat, retencionCtrlDec
      );
      flujosCtrl.push({ mes, monto: div.neto });
    }
    const tirCtrl = calcularTIR(flujosCtrl);
    const vanCtrl = calcularVAN(flujosCtrl, p.tasaDescuento);

    // ── PROMEDIOS PONDERADOS ─────────────────────────────────────────────
    const paybackPromedio = resultadosTiers.reduce((sum, r) =>
      sum + ((r.paybackMeses || PLAZO_PROYECCION_MESES) * r.capitalTier), 0
    ) / capitalLevantado;

    const roiPromedio = resultadosTiers.reduce((sum, r) =>
      sum + (r.roiAnual * r.capitalTier), 0
    ) / capitalLevantado;

    const tirPromedio = resultadosTiers.reduce((sum, r) =>
      sum + ((r.tir || 0) * r.capitalTier), 0
    ) / capitalLevantado;

    const vanTotal = resultadosTiers.reduce((sum, r) => sum + (r.van || 0), 0) + (vanCtrl || 0);

    // ── ACTUALIZAR MÉTRICAS RESUMEN ──────────────────────────────────────
    document.getElementById('metricCapital').textContent    = formatMoney(capitalLevantado);
    document.getElementById('metricCapitalPct').textContent = formatPercent(p.pctSocMicroinv) + ' equity';
    document.getElementById('metricPayback').textContent    = Math.round(paybackPromedio) + ' meses';
    document.getElementById('metricROI').textContent        = formatPercent(roiPromedio);
    document.getElementById('metricTIR').textContent        = tirPromedio !== null ? formatPercent(tirPromedio) : 'N/C';
    document.getElementById('metricVAN').textContent        = formatMoney(vanTotal);
    document.getElementById('metricValor').textContent      = formatMoney(valorEmpresa);

    const metricPaybackEl = document.getElementById('metricPayback');
    metricPaybackEl.classList.remove('text-warning', 'text-error');
    if (paybackPromedio > 48) metricPaybackEl.classList.add('text-warning');

    const metricROIEl = document.getElementById('metricROI');
    metricROIEl.classList.remove('text-error');
    if (roiPromedio < 0.10) metricROIEl.classList.add('text-error');

    // ── RENDER TIERS RESULTADOS ──────────────────────────────────────────
    renderTiersResults(resultadosTiers);

    // ── ACTUALIZAR CONTROLADOR ───────────────────────────────────────────
    document.getElementById('ctrlResultPct').textContent        = formatPercent(p.pctSocChef);
    document.getElementById('ctrlResultPctSub').textContent     = formatPercent(p.pctSocChef) + ' empresa';
    document.getElementById('ctrlResultValor').textContent      = formatMoney(valorControlador);
    document.getElementById('ctrlResultRetiroNeto').textContent = formatMoney(divCtrlAo5.neto);
    document.getElementById('ctrlResultRetiroBruto').textContent= 'Bruto: ' + formatMoney(divCtrlAo5.bruto);
    document.getElementById('ctrlResultAnual').textContent      = formatMoney(utilidadAnualCtrl);
    document.getElementById('ctrlResultTIR').textContent        = tirCtrl !== null ? formatPercent(tirCtrl) : 'N/A';
    document.getElementById('ctrlResultVAN').textContent        = vanCtrl !== null ? formatMoney(vanCtrl)   : 'N/A';

    // ── GRÁFICO ──────────────────────────────────────────────────────────
    renderChart(
      resultadosTiers,
      { flujos: flujosCtrl },
      p.tasaDescuento
    );

  } catch (error) {
    console.error('Error en cálculos:', error);
  }
}

// ==================== LIMPIAR FORMULARIO ====================

function limpiarFormulario() {
  if (!confirm('¿Seguro que deseas limpiar todos los datos? Esta acción no se puede deshacer.')) return;

  document.getElementById('nombreProyecto').value    = '';
  document.getElementById('pctSocMicroinv').value    = 48;
  document.getElementById('pctSocChef').value        = 52;
  document.getElementById('incluirIVA').checked      = false;
  document.getElementById('containerIVA').style.display = 'none';
  document.getElementById('pctIVA').value            = 19;
  document.getElementById('ingresoAo1').value        = '600.000.000';
  document.getElementById('ingresoAo2').value        = '750.000.000';
  document.getElementById('ingresoAo3').value        = '900.000.000';
  document.getElementById('ingresoAo4').value        = '1.000.000.000';
  document.getElementById('ingresoAo5').value        = '1.100.000.000';
  document.getElementById('margenUtilidad').value    = 0;
  document.getElementById('pctDistribuir').value     = 0;
  document.getElementById('impuesto1Cat').value      = 0;
  document.getElementById('ctrlCapitalInicial').value= '0';
  document.getElementById('ctrlRetencion').value     = 0;
  document.getElementById('tasaDescuento').value     = 12;

  tiers = [{
    id: 1,
    nombre: 'Early Investors',
    cantidad: 20,
    monto: 10000000,
    mesInversion: 0,
    mesRetornos: 12,
    tipoHolder: 'personanatural',
    retencion: 10,
    collapsed: false
  }];
  nextTierId  = 2;
  detalleState = {};

  renderTiers();
  calcularTodo();

  document.getElementById('displayNombreProyecto').textContent = 'Proyecto Sin Nombre';
}

// ==================== INICIALIZAR ====================

document.addEventListener('DOMContentLoaded', () => {

  // 1. Estado inicial de tiers
  tiers = [{
    id: 1,
    nombre: 'Early Investors',
    cantidad: 20,
    monto: 10000000,
    mesInversion: 0,
    mesRetornos: 12,
    tipoHolder: 'personanatural',
    retencion: 10,
    collapsed: false
  }];
  nextTierId = 2;
  renderTiers();

  // 2. Cargar desde localStorage (Calculadora m²)
  const datosGuardados = localStorage.getItem('datosIngresos');
  if (datosGuardados) {
    try {
      const datos = JSON.parse(datosGuardados);
      if (datos.ingresosAnuales && Array.isArray(datos.ingresosAnuales) && datos.ingresosAnuales.length === 5) {
        console.log('✅ Datos cargados desde Calculadora m²:', datos);
        document.getElementById('ingresoAo1').value = datos.ingresosAnuales[0].toLocaleString('es-CL');
        document.getElementById('ingresoAo2').value = datos.ingresosAnuales[1].toLocaleString('es-CL');
        document.getElementById('ingresoAo3').value = datos.ingresosAnuales[2].toLocaleString('es-CL');
        document.getElementById('ingresoAo4').value = datos.ingresosAnuales[3].toLocaleString('es-CL');
        document.getElementById('ingresoAo5').value = datos.ingresosAnuales[4].toLocaleString('es-CL');
        setTimeout(() => {
          alert('✅ Datos cargados desde Calculadora de Ingresos m²\n\nIngresos anuales importados correctamente.');
        }, 500);
        localStorage.removeItem('datosIngresos');
      }
    } catch(e) {
      console.error('❌ Error al cargar datos desde localStorage:', e);
    }
  }

  // 3. Inicializar listeners del sidebar (ui-inputs.js)
  initInputListeners();

  // 4. Botones globales
  document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
  document.getElementById('btnExportar').addEventListener('click', exportarPDF);

  // 5. Nombre proyecto → header
  document.getElementById('nombreProyecto').addEventListener('input', (e) => {
    const nombre = e.target.value.trim() || 'Proyecto Sin Nombre';
    document.getElementById('displayNombreProyecto').textContent = nombre;
  });

  // 6. Cálculo inicial
  calcularTodo();
});
