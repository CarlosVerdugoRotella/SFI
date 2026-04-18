// ==================== ui-results.js ====================
// Render de resultados, detalle mensual, gráfico y PDF
// Depende de: engine.js (calcularVAN, getDividendoMensual, formatMoney, formatPercent,
//             PLAZO_PROYECCION_MESES)
//             ui-inputs.js (tiers)
// ========================================================

// ==================== ESTADO DETALLE MENSUAL ====================
let detalleState = {};

// Intervalo trimestral para el gráfico (cada 3 meses)
const GRAFICO_INTERVALO_MESES = 3;

// ==================== RENDER TIERS RESULTADOS ====================

function renderTiersResults(resultados) {
  const container = document.getElementById('tiersResultsContainer');
  container.innerHTML = '';

  resultados.forEach((res, index) => {
    const tierCard = document.createElement('section');
    tierCard.className = 'result-card';
    tierCard.setAttribute('data-tier-index', index);
    tierCard.setAttribute('data-tier-id', res.tier.id);

    const paybackTexto = res.paybackMeses
      ? res.paybackMeses + ' meses'
      : '>' + PLAZO_PROYECCION_MESES + ' meses';

    tierCard.innerHTML = `
      <div class="card-header">
        <div class="card-tier-label">${res.tier.nombre.toUpperCase()}</div>
        <h2 class="card-title">Por inversionista • <span class="amount">${formatMoney(res.tier.monto)}</span></h2>
      </div>
      <div class="card-grid">
        <div class="card-metric">
          <span class="card-metric-label">Inversión Individual</span>
          <div class="card-metric-value">${formatMoney(res.tier.monto)}</div>
        </div>
        <div class="card-metric">
          <span class="card-metric-label">Inicio Retornos</span>
          <div class="card-metric-value">Mes ${res.tier.mesRetornos}</div>
        </div>
        <div class="card-metric">
          <span class="card-metric-label">% en Sociedad Microinv.</span>
          <div class="card-metric-value">${formatPercent(res.pctEnSociedad, 2)}</div>
          <div class="card-metric-subtext">Del total fondos levantados</div>
        </div>
        <div class="card-metric">
          <span class="card-metric-label">% en Restaurante</span>
          <div class="card-metric-value">${formatPercent(res.pctEnRestaurant, 2)}</div>
          <div class="card-metric-subtext">Del total empresa</div>
        </div>
        <div class="card-metric">
          <span class="card-metric-label">Retiro Mensual NETO (Año 5)</span>
          <div class="card-metric-value highlight">${formatMoney(res.divAo5.neto)}</div>
          <div class="card-metric-subtext">Bruto: ${formatMoney(res.divAo5.bruto)}</div>
        </div>
        <div class="card-metric">
          <span class="card-metric-label">Retiro Prom. 5 Años</span>
          <div class="card-metric-value highlight">${formatMoney(res.retiroPromedio5Aos)}</div>
          <div class="card-metric-subtext">Promedio mensual</div>
        </div>
        <div class="card-metric">
          <span class="card-metric-label">ROI Anual NETO</span>
          <div class="card-metric-value ${res.roiAnual < 0.10 ? 'text-error' : ''}">${formatPercent(res.roiAnual)}</div>
          <div class="card-metric-subtext">Año 5 estabilizado</div>
        </div>
        <div class="card-metric">
          <span class="card-metric-label">Payback Real</span>
          <div class="card-metric-value ${res.paybackMeses && res.paybackMeses > 48 ? 'text-warning' : ''}">${paybackTexto}</div>
          <div class="card-metric-subtext">Desde inversión</div>
        </div>
        <div class="card-metric">
          <span class="card-metric-label">TIR</span>
          <div class="card-metric-value">${res.tir !== null ? formatPercent(res.tir) : 'N/C'}</div>
          <div class="card-metric-subtext">30 años</div>
        </div>
        <div class="card-metric">
          <span class="card-metric-label">VAN</span>
          <div class="card-metric-value ${res.van < 0 ? 'text-error' : 'highlight'}">${formatMoney(res.van)}</div>
          <div class="card-metric-subtext">Valor creado</div>
        </div>
      </div>

      <div class="detalle-toggle">
        <button class="btn-toggle-detalle"
                onclick="toggleDetalleMensual(${res.tier.id})">
          📊 Ver detalle mensual
        </button>
      </div>
      <div class="detalle-content" id="detalle-${res.tier.id}">
        <table class="detalle-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Año.Mes</th>
              <th>Dividendo Bruto</th>
              <th>Dividendo Neto</th>
              <th>Acumulado Neto</th>
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

    // Guardar detalle mensual en dataset usando tier.id como clave
    tierCard.dataset.detalle = JSON.stringify(res.detalleMensual);

    container.appendChild(tierCard);
  });
}

// ==================== DETALLE MENSUAL ====================

function toggleDetalleMensual(tierId) {
  const detalleEl = document.getElementById(`detalle-${tierId}`);
  const btn = detalleEl.previousElementSibling.querySelector('.btn-toggle-detalle');

  if (!detalleState[tierId]) {
    detalleState[tierId] = { expanded: false, loaded: 0 };
  }

  if (!detalleState[tierId].expanded) {
    detalleEl.classList.add('expanded');
    btn.textContent = '📊 Ocultar detalle';
    detalleState[tierId].expanded = true;
    if (detalleState[tierId].loaded === 0) {
      loadMoreDetalle(tierId);
    }
  } else {
    detalleEl.classList.remove('expanded');
    btn.textContent = '📊 Ver detalle mensual';
    detalleState[tierId].expanded = false;
  }
}

function loadMoreDetalle(tierId) {
  // Correción bug original: buscar card por data-tier-id en vez de comparar mes
  const targetCard = document.querySelector(`[data-tier-id="${tierId}"]`);
  if (!targetCard) return;

  const detalleMensual = JSON.parse(targetCard.dataset.detalle || '[]');
  const tbody        = document.getElementById(`detalle-body-${tierId}`);
  const loadMoreBtn  = document.getElementById(`load-more-${tierId}`);

  if (!detalleState[tierId]) {
    detalleState[tierId] = { expanded: true, loaded: 0 };
  }

  const start = detalleState[tierId].loaded;
  const end   = Math.min(start + 24, detalleMensual.length);

  for (let i = start; i < end; i++) {
    const d   = detalleMensual[i];
    const row = tbody.insertRow();
    if (d.esPayback) row.className = 'payback-row';

    row.innerHTML = `
      <td>${d.mes}</td>
      <td>${d.aoMes}</td>
      <td>${formatMoney(d.bruto)}</td>
      <td>${formatMoney(d.neto)}</td>
      <td>${formatMoney(d.acumulado)}</td>
    `;
  }

  detalleState[tierId].loaded = end;

  if (end >= detalleMensual.length) {
    loadMoreBtn.classList.add('hidden');
  } else {
    loadMoreBtn.classList.remove('hidden');
  }
}

// ==================== GRÁFICO ====================
// Horizonte: PLAZO_PROYECCION_MESES (360)
// Eje X: cada GRAFICO_INTERVALO_MESES (3) → 120 puntos, agrupados por año en labels

function renderChart(resultadosTiers, controladorData, tasaDescuento) {
  const ctx = document.getElementById('vanChart');

  // Generar puntos del eje X (trimestral)
  const puntos = [];
  for (let mes = 0; mes <= PLAZO_PROYECCION_MESES; mes += GRAFICO_INTERVALO_MESES) {
    puntos.push(mes);
  }

  // Labels del eje X: mostrar solo años completos para no saturar
  const labels = puntos.map(mes => {
    if (mes % 12 === 0) return `Año ${mes / 12}`;
    return '';
  });

  const datasets = [];
  const colors   = ['#4F46E5', '#0891B2', '#7C3AED', '#DB2777', '#059669'];

  // Dataset por tier: VAN acumulado trimestral
  resultadosTiers.forEach((res, index) => {
    const data = puntos.map(mes => {
      const flujos = [{ mes: res.tier.mesInversion, monto: -res.tier.monto }];
      for (let m = res.tier.mesRetornos; m <= mes; m++) {
        const d = res.detalleMensual.find(x => x.mes === m);
        if (d) flujos.push({ mes: m, monto: d.neto });
      }
      return calcularVAN(flujos, tasaDescuento);
    });

    datasets.push({
      label: res.tier.nombre,
      data,
      borderColor: colors[index % colors.length],
      backgroundColor: 'transparent',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 0
    });
  });

  // Dataset controlador
  if (controladorData && controladorData.flujos) {
    const dataCtrl = puntos.map(mes => {
      const flujos = controladorData.flujos.filter(f => f.mes <= mes);
      return calcularVAN(flujos, tasaDescuento);
    });

    datasets.push({
      label: 'Controlador',
      data: dataCtrl,
      borderColor: '#047857',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [5, 5],
      tension: 0.3,
      pointRadius: 0
    });
  }

  // Destruir chart anterior
  if (window.vanChart && typeof window.vanChart.destroy === 'function') {
    window.vanChart.destroy();
  }

  window.vanChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 10, font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleFont: { size: 12, weight: 600 },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 4,
          callbacks: {
            title: (items) => `Mes ${puntos[items[0].dataIndex]}`,
            label: (ctx) => ctx.dataset.label + ': ' + formatMoney(ctx.parsed.y)
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            maxRotation: 0,
            autoSkip: false
          }
        },
        y: {
          grid: { color: '#F3F4F6' },
          ticks: {
            font: { size: 11 },
            callback: (value) => '$' + (value / 1000000).toFixed(1) + 'M'
          }
        }
      }
    }
  });
}

// ==================== EXPORT PDF ====================

function exportarPDF() {
  const nombreProyecto = document.getElementById('nombreProyecto').value.trim() || 'Proyecto';
  const fecha    = new Date().toLocaleDateString('es-CL');
  const element  = document.getElementById('mainContainer');

  const opt = {
    margin: 10,
    filename: `modelo-financiero-${nombreProyecto.replace(/\s+/g, '-')}-${fecha}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: {
      scale: 1.5,
      useCORS: true,
      logging: false,
      width: element.scrollWidth,
      windowWidth: element.scrollWidth
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
    pagebreak: { mode: 'avoid-all', css: [] },
    legacy: true
  };

  html2pdf().set(opt).from(element).save();
}
