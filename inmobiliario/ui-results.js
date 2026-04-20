// ==================== ui-results.js — Calculadora Inversión Inmobiliaria ====================
// Render de resultados, detalle mensual (UF + CLP), gráfico VAN acumulado
// Depende de: ../gastro/engine.js (calcularVAN), app.js (detalleState, formatMoney,
//             formatUF, formatPercent, PLAZO_INMOB_MESES)
// NO redeclara detalleState — vive en app.js
// ============================================================================================

const GRAFICO_INTERVALO_MESES = 3; // punto cada trimestre → 120 puntos en 30 años

// ==================== RENDER TIERS RESULTADOS ====================

function renderTiersResults(resultados, inmobParams, valorUF) {
  const container = document.getElementById('tiersResultsContainer');
  if (!container) return;
  container.innerHTML = '';

  resultados.forEach((res, index) => {
    const card = document.createElement('section');
    card.className = 'result-card';
    card.setAttribute('data-tier-index', index);
    card.setAttribute('data-tier-id', res.tier.id);

    // Guardar detalle serializado para loadMore (evita recalcular)
    card.dataset.detalle  = JSON.stringify(res.detalleMensual);
    card.dataset.valorUF  = valorUF || 38500;
    card.dataset.mesVenta = inmobParams ? (inmobParams.mesVenta || 0) : 0;

    const paybackTexto = res.paybackMeses
      ? res.paybackMeses + ' meses'
      : '> 30 años';
    const paybackClass = !res.paybackMeses || res.paybackMeses > 180 ? 'text-warning' : '';
    const vanClass     = (res.van || 0) < 0 ? 'text-error' : 'highlight';
    const roiClass     = res.roiAnual < 0.04 ? 'text-error' : '';

    // Arriendo neto mensual en UF (mes de referencia = mesRetornos o 12, lo que sea mayor)
    const arriendoNetoUF = valorUF > 0 && res.divRef
      ? (res.divRef.neto / valorUF).toFixed(2)
      : '0,00';
    const arriendoBrutoUF = valorUF > 0 && res.divRef
      ? (res.divRef.bruto / valorUF).toFixed(2)
      : '0,00';

    // Capital total del tier
    const capitalTierFmt = formatMoney(res.capitalTier);
    const capitalTierUF  = valorUF > 0
      ? 'UF ' + (res.capitalTier / valorUF).toFixed(1)
      : '';

    card.innerHTML = `
      <div class="card-header">
        <div class="card-tier-label">${res.tier.nombre.toUpperCase()} · ${res.tier.cantidad} inversionista${res.tier.cantidad !== 1 ? 's' : ''}</div>
        <h2 class="card-title">Por inversionista · <span class="amount">${formatMoney(res.tier.monto)}</span></h2>
      </div>

      <div class="card-grid">

        <div class="card-metric">
          <span class="card-metric-label">Capital Total Tier</span>
          <div class="card-metric-value">${capitalTierFmt}</div>
          <div class="card-metric-subtext">${capitalTierUF}</div>
        </div>

        <div class="card-metric">
          <span class="card-metric-label">% en Fondo Microinv.</span>
          <div class="card-metric-value">${formatPercent(res.pctEnSociedad)}</div>
          <div class="card-metric-subtext">Del total levantado</div>
        </div>

        <div class="card-metric">
          <span class="card-metric-label">% en Inmobiliaria</span>
          <div class="card-metric-value">${formatPercent(res.pctEnInmobiliario)}</div>
          <div class="card-metric-subtext">Del total empresa</div>
        </div>

        <div class="card-metric">
          <span class="card-metric-label">Arriendo Mensual NETO</span>
          <div class="card-metric-value highlight">UF ${arriendoNetoUF}</div>
          <div class="card-metric-subtext">Bruto UF ${arriendoBrutoUF}</div>
        </div>

        <div class="card-metric">
          <span class="card-metric-label">Arriendo Mensual NETO</span>
          <div class="card-metric-value highlight">${res.divRef ? formatMoney(res.divRef.neto) : '$0'}</div>
          <div class="card-metric-subtext">Bruto ${res.divRef ? formatMoney(res.divRef.bruto) : '$0'}</div>
        </div>

        <div class="card-metric">
          <span class="card-metric-label">Retiro Prom. Arriendo</span>
          <div class="card-metric-value highlight">${formatMoney(res.retiroPromedio)}</div>
          <div class="card-metric-subtext">Promedio mensual</div>
        </div>

        <div class="card-metric">
          <span class="card-metric-label">ROI Anual NETO</span>
          <div class="card-metric-value ${roiClass}">${formatPercent(res.roiAnual)}</div>
          <div class="card-metric-subtext">Año estabilizado</div>
        </div>

        <div class="card-metric">
          <span class="card-metric-label">Payback Real</span>
          <div class="card-metric-value ${paybackClass}">${paybackTexto}</div>
          <div class="card-metric-subtext">Desde inversión</div>
        </div>

        <div class="card-metric">
          <span class="card-metric-label">TIR (30 años)</span>
          <div class="card-metric-value">${res.tir !== null ? formatPercent(res.tir) : 'N/C'}</div>
          <div class="card-metric-subtext">Tasa interna retorno</div>
        </div>

        <div class="card-metric">
          <span class="card-metric-label">VAN</span>
          <div class="card-metric-value ${vanClass}">${formatMoney(res.van)}</div>
          <div class="card-metric-subtext">Valor creado</div>
        </div>

      </div>

      <div class="detalle-toggle">
        <button class="btn-toggle-detalle" onclick="toggleDetalleMensual(${res.tier.id})">
          📊 Ver detalle mensual
        </button>
      </div>

      <div class="detalle-content" id="detalle-${res.tier.id}">
        <table class="detalle-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Año.Mes</th>
              <th>Flujo Bruto (UF)</th>
              <th>Flujo Bruto (CLP)</th>
              <th>Flujo Neto (UF)</th>
              <th>Flujo Neto (CLP)</th>
              <th>Acum. Neto (CLP)</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody id="detalle-body-${res.tier.id}"></tbody>
        </table>
        <button class="btn-load-more hidden"
                id="load-more-${res.tier.id}"
                onclick="loadMoreDetalle(${res.tier.id})">
          Cargar más (siguientes 24 meses)
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

// ==================== TOGGLE DETALLE MENSUAL ====================

function toggleDetalleMensual(tierId) {
  const detalleEl = document.getElementById(`detalle-${tierId}`);
  if (!detalleEl) return;

  const btn = detalleEl.previousElementSibling.querySelector('.btn-toggle-detalle');

  if (!detalleState[tierId]) {
    detalleState[tierId] = { expanded: false, loaded: 0 };
  }

  if (!detalleState[tierId].expanded) {
    detalleEl.classList.add('expanded');
    if (btn) btn.textContent = '📊 Ocultar detalle';
    detalleState[tierId].expanded = true;
    if (detalleState[tierId].loaded === 0) {
      loadMoreDetalle(tierId);
    }
  } else {
    detalleEl.classList.remove('expanded');
    if (btn) btn.textContent = '📊 Ver detalle mensual';
    detalleState[tierId].expanded = false;
  }
}

// ==================== CARGAR MÁS (paginación detalle) ====================

function loadMoreDetalle(tierId) {
  const card = document.querySelector(`[data-tier-id="${tierId}"]`);
  if (!card) return;

  const detalleMensual = JSON.parse(card.dataset.detalle || '[]');
  const valorUF        = parseFloat(card.dataset.valorUF)  || 38500;
  const mesVenta       = parseInt(card.dataset.mesVenta)   || 0;
  const tbody          = document.getElementById(`detalle-body-${tierId}`);
  const loadMoreBtn    = document.getElementById(`load-more-${tierId}`);
  if (!tbody) return;

  if (!detalleState[tierId]) {
    detalleState[tierId] = { expanded: true, loaded: 0 };
  }

  const start = detalleState[tierId].loaded;
  const end   = Math.min(start + 24, detalleMensual.length);

  for (let i = start; i < end; i++) {
    const d   = detalleMensual[i];
    const row = tbody.insertRow();

    // Clases especiales
    if (d.esVenta)   row.className = 'venta-row';
    else if (d.esPayback) row.className = 'payback-row';

    // Nota de la fila
    let nota = '';
    if (d.esVenta)        nota = '🏠 Venta';
    else if (d.esPayback) nota = '✅ Payback';

    // Valores UF
    const brutoUF = valorUF > 0 ? (d.bruto / valorUF) : 0;
    const netoUF  = valorUF > 0 ? (d.neto  / valorUF) : 0;

    row.innerHTML = `
      <td>${d.mes}</td>
      <td>${d.aoMes}</td>
      <td>UF ${brutoUF.toFixed(2)}</td>
      <td>${formatMoney(d.bruto)}</td>
      <td>UF ${netoUF.toFixed(2)}</td>
      <td>${formatMoney(d.neto)}</td>
      <td>${formatMoney(d.acumulado)}</td>
      <td>${nota}</td>
    `;
  }

  detalleState[tierId].loaded = end;

  if (loadMoreBtn) {
    if (end >= detalleMensual.length) {
      loadMoreBtn.classList.add('hidden');
    } else {
      loadMoreBtn.classList.remove('hidden');
    }
  }
}

// ==================== GRÁFICO VAN ACUMULADO ====================
// Horizonte: PLAZO_INMOB_MESES (360) | Intervalo: GRAFICO_INTERVALO_MESES (3)
// Usa detalleMensual precalculado en calcularTodo() — no recalcula flujos aquí

function renderChart(resultadosTiers, controladorData, tasaDescuento) {
  const ctx = document.getElementById('vanChart');
  if (!ctx) return;

  // Puntos del eje X: cada 3 meses
  const puntos = [];
  for (let mes = 0; mes <= PLAZO_INMOB_MESES; mes += GRAFICO_INTERVALO_MESES) {
    puntos.push(mes);
  }

  // Labels: solo años completos
  const labels = puntos.map(mes =>
    mes % 12 === 0 ? `Año ${mes / 12}` : ''
  );

  const colores = ['#4F46E5', '#0891B2', '#7C3AED', '#DB2777', '#059669'];
  const datasets = [];

  // Dataset por tier: VAN acumulado usando detalleMensual precalculado
  resultadosTiers.forEach((res, index) => {
    // Construir mapa mes → neto para lookup O(1)
    const mapaFlujosNeto = new Map();
    res.detalleMensual.forEach(d => mapaFlujosNeto.set(d.mes, d.neto));

    const data = puntos.map(puntoMes => {
      const flujos = [{ mes: res.tier.mesInversion, monto: -res.tier.monto }];
      for (let m = res.tier.mesRetornos; m <= puntoMes; m++) {
        const neto = mapaFlujosNeto.get(m);
        if (neto !== undefined) flujos.push({ mes: m, monto: neto });
      }
      return calcularVAN(flujos, tasaDescuento);
    });

    datasets.push({
      label:           res.tier.nombre,
      data,
      borderColor:     colores[index % colores.length],
      backgroundColor: 'transparent',
      borderWidth:     2,
      tension:         0.3,
      pointRadius:     0,
    });
  });

  // Dataset controladora
  if (controladorData && controladorData.flujos) {
    const dataCtrl = puntos.map(puntoMes => {
      const flujos = controladorData.flujos.filter(f => f.mes <= puntoMes);
      return calcularVAN(flujos, tasaDescuento);
    });

    datasets.push({
      label:           'Controladora',
      data:            dataCtrl,
      borderColor:     '#047857',
      backgroundColor: 'transparent',
      borderWidth:     2,
      borderDash:      [5, 5],
      tension:         0.3,
      pointRadius:     0,
    });
  }

  // Destruir instancia anterior
  if (window.vanChartInstance && typeof window.vanChartInstance.destroy === 'function') {
    window.vanChartInstance.destroy();
  }

  window.vanChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 10, font: { size: 11 } },
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleFont:  { size: 12, weight: 600 },
          bodyFont:   { size: 12 },
          padding:    10,
          cornerRadius: 4,
          callbacks: {
            title: (items) => `Mes ${puntos[items[0].dataIndex]}`,
            label: (item)  => item.dataset.label + ': ' + formatMoney(item.parsed.y),
          },
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          ticks: {
            font: { size: 11 },
            maxRotation: 0,
            autoSkip: false,
          },
        },
        y: {
          grid:  { color: '#F3F4F6' },
          ticks: {
            font: { size: 11 },
            callback: (value) => '$' + (value / 1000000).toFixed(1) + 'M',
          },
        },
      },
    },
  });
}
