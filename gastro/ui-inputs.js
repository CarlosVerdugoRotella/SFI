// ==================== ui-inputs.js ====================
// Gestión de estado de tiers, sidebar, validaciones y listeners
// Depende de: engine.js (cleanNumber, debounce, formatMoney)
// No llama a ui-results.js directamente — usa calcularTodo() de app.js
// ======================================================

// ==================== ESTADO GLOBAL ====================
let tiers = [];
let nextTierId = 1;

// ==================== VALIDACIONES ====================

function validarPctMicroinv() {
  const pctMicroinv = parseFloat(document.getElementById('pctSocMicroinv').value) || 0;
  const errorEl     = document.getElementById('errorPct');
  const inputMicroinv = document.getElementById('pctSocMicroinv');
  const inputChef     = document.getElementById('pctSocChef');

  if (pctMicroinv < 1 || pctMicroinv > 99) {
    errorEl.classList.add('show');
    inputMicroinv.classList.add('error');
    return false;
  }

  errorEl.classList.remove('show');
  inputMicroinv.classList.remove('error');
  inputChef.value = (100 - pctMicroinv).toFixed(1);
  return true;
}

// ==================== GESTIÓN DE TIERS ====================

function agregarTier() {
  if (tiers.length >= 6) {
    alert('Máximo 6 tiers permitidos');
    return;
  }

  const tier = {
    id: nextTierId++,
    nombre: `Tier ${tiers.length + 1}`,
    cantidad: 1,
    monto: 10000000,
    mesInversion: 0,
    mesRetornos: 12,
    tipoHolder: 'personanatural',
    retencion: 10,
    collapsed: false
  };

  tiers.push(tier);
  renderTiers();
  calcularTodo();
}

function eliminarTier(id) {
  if (tiers.length <= 1) {
    alert('Debe haber al menos 1 tier');
    return;
  }
  if (!confirm('¿Eliminar este tier?')) return;

  tiers = tiers.filter(t => t.id !== id);
  renderTiers();
  calcularTodo();
}

function toggleCollapseTier(id) {
  const tier = tiers.find(t => t.id === id);
  if (tier) {
    tier.collapsed = !tier.collapsed;
    renderTiers();
  }
}

function actualizarTier(id, field, value) {
  const tier = tiers.find(t => t.id === id);
  if (!tier) return;

  tier[field] = value;

  if (field === 'mesRetornos' || field === 'mesInversion') {
    if (tier.mesRetornos <= tier.mesInversion) {
      tier.mesRetornos = tier.mesInversion + 1;
      renderTiers();
      alert('El mes de inicio de retornos debe ser posterior al mes de inversión. Se ajustó automáticamente.');
    }
  }

  calcularTodo();
}

// ==================== RENDER TIERS ====================

function renderTiers() {
  const container = document.getElementById('tiersContainer');
  container.innerHTML = '';

  tiers.forEach((tier, index) => {
    const tierEl = document.createElement('section');
    tierEl.className = 'tier-section';
    tierEl.setAttribute('data-tier-index', index);

    const mesWarning = tier.mesRetornos <= tier.mesInversion;

    tierEl.innerHTML = `
      <div class="tier-header" onclick="toggleCollapseTier(${tier.id})">
        <div class="tier-title">${tier.nombre} (Tier ${index + 1})</div>
        <div class="tier-actions">
          <button class="tier-btn-collapse" onclick="event.stopPropagation(); toggleCollapseTier(${tier.id})">
            ${tier.collapsed ? '▼' : '▲'}
          </button>
          <button class="tier-btn-delete" onclick="event.stopPropagation(); eliminarTier(${tier.id})">
            ×
          </button>
        </div>
      </div>
      <div class="tier-content ${tier.collapsed ? 'collapsed' : ''}">
        <div class="input-group">
          <label>Nombre del Tier</label>
          <input type="text" value="${tier.nombre}"
                 onchange="actualizarTier(${tier.id}, 'nombre', this.value)">
        </div>
        <div class="input-group">
          <label>Cantidad de Inversionistas</label>
          <input type="number" min="1" step="1" value="${tier.cantidad}"
                 onchange="actualizarTier(${tier.id}, 'cantidad', parseInt(this.value) || 1)">
        </div>
        <div class="input-group">
          <label>Inversión Individual ($)</label>
          <input type="text" class="money-input"
                 value="${tier.monto.toLocaleString('es-CL')}"
                 data-tier-id="${tier.id}" data-field="monto">
        </div>
        <div class="input-group">
          <label>Mes de Inversión</label>
          <input type="number" min="0" max="360" step="1" value="${tier.mesInversion}"
                 class="${mesWarning ? 'warning' : ''}"
                 onchange="actualizarTier(${tier.id}, 'mesInversion', parseInt(this.value) || 0)">
        </div>
        <div class="input-group">
          <label>Mes Inicio Retornos</label>
          <input type="number" min="0" max="360" step="1" value="${tier.mesRetornos}"
                 class="${mesWarning ? 'warning' : ''}"
                 onchange="actualizarTier(${tier.id}, 'mesRetornos', parseInt(this.value) || 0)">
          <div class="input-warning-msg ${mesWarning ? 'show' : ''}">
            Debe ser mayor al mes de inversión
          </div>
        </div>
        <div class="input-group">
          <label>Tipo de Holder</label>
          <select onchange="actualizarTier(${tier.id}, 'tipoHolder', this.value)">
            <option value="personanatural" ${tier.tipoHolder === 'personanatural' ? 'selected' : ''}>Persona Natural</option>
            <option value="empresa" ${tier.tipoHolder === 'empresa' ? 'selected' : ''}>Empresa</option>
          </select>
        </div>
        <div class="input-group">
          <label>% Retención Impuestos (%)</label>
          <input type="number" min="0" max="99" step="0.1" value="${tier.retencion}"
                 onchange="actualizarTier(${tier.id}, 'retencion', parseFloat(this.value) || 0)">
        </div>
      </div>
    `;

    container.appendChild(tierEl);
  });

  attachMoneyInputs();
}

function attachMoneyInputs() {
  const moneyInputs = document.querySelectorAll('.money-input[data-tier-id]');
  moneyInputs.forEach(input => {
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.addEventListener('input', debounce((e) => {
      const value = cleanNumber(e.target.value);
      e.target.value = value.toLocaleString('es-CL');

      const tierId = parseInt(e.target.getAttribute('data-tier-id'));
      const field  = e.target.getAttribute('data-field');
      if (tierId && field) {
        actualizarTier(tierId, field, value);
      }
    }, 400));
  });
}

// ==================== INICIALIZAR LISTENERS SIDEBAR ====================
// Llamado desde app.js en DOMContentLoaded

function initInputListeners() {
  // Formatear money inputs globales al cargar
  const moneyInputsGlobal = document.querySelectorAll(
    '#ingresoAo1, #ingresoAo2, #ingresoAo3, #ingresoAo4, #ingresoAo5, #ctrlCapitalInicial'
  );
  moneyInputsGlobal.forEach(input => {
    const initialValue = cleanNumber(input.value);
    input.value = initialValue.toLocaleString('es-CL');
  });

  // Listeners money inputs globales
  moneyInputsGlobal.forEach(input => {
    input.addEventListener('input', debounce(() => {
      const value = cleanNumber(input.value);
      input.value = value.toLocaleString('es-CL');
      calcularTodo();
    }, 400));
  });

  // % Microinversionistas
  document.getElementById('pctSocMicroinv').addEventListener('input', debounce(() => {
    if (validarPctMicroinv()) calcularTodo();
  }, 400));

  // Toggle IVA
  const incluirIVACheckbox = document.getElementById('incluirIVA');
  const containerIVA       = document.getElementById('containerIVA');
  incluirIVACheckbox.addEventListener('change', () => {
    containerIVA.style.display = incluirIVACheckbox.checked ? 'block' : 'none';
    calcularTodo();
  });

  // Resto de inputs del sidebar (excluye money, pctSocMicroinv, pctSocChef, IVA, tier)
  const otherInputs = document.querySelectorAll(
    'input:not(.money-input):not(#pctSocMicroinv):not(#pctSocChef):not(#incluirIVA):not([data-tier-id]), select'
  );
  const debouncedCalc = debounce(calcularTodo, 400);
  otherInputs.forEach(input => {
    input.addEventListener('input', debouncedCalc);
    input.addEventListener('change', debouncedCalc);
  });

  // Botones
  document.getElementById('btnAddTier').addEventListener('click', agregarTier);

  // Nombre proyecto → header
  document.getElementById('nombreProyecto').addEventListener('input', (e) => {
    const nombre = e.target.value.trim() || 'Proyecto Sin Nombre';
    document.getElementById('displayNombreProyecto').textContent = nombre;
  });
}
