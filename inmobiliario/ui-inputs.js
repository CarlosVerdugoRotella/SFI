// ==================== ui-inputs.js — Calculadora Inversión Inmobiliaria ====================
// Gestión de tiers, sidebar, validaciones y listeners
// Depende de: ../gastro/engine.js (cleanNumber, debounce), app.js (tiers, nextTierId, calcularTodo)
// NO redeclara tiers ni nextTierId — esos viven en app.js
// ===========================================================================================

// ==================== VALIDACIONES ====================

// validarPctMicroinv ya está declarada en app.js
// Este archivo la complementa actualizando el campo controladora en tiempo real.

function syncPctControlador() {
  const pctMicroinv     = parseFloat(document.getElementById('pctSocMicroinv').value) || 0;
  const inputControlador = document.getElementById('pctSocControlador');
  if (inputControlador) {
    inputControlador.value = Math.max(0, 100 - pctMicroinv).toFixed(1);
  }
}

// ==================== GESTIÓN DE TIERS ====================

function agregarTier() {
  if (tiers.length >= 6) {
    alert('Máximo 6 tiers permitidos');
    return;
  }

  tiers.push({
    id: nextTierId++,
    nombre: `Tier ${tiers.length + 1}`,
    cantidad: 5,
    monto: 5000000,
    mesInversion: 0,
    mesRetornos: 6,
    tipoHolder: 'personanatural',
    retencion: 10,
    collapsed: false,
  });

  renderTiers();
  calcularTodo();
}

function eliminarTier(id) {
  if (tiers.length <= 1) {
    alert('Debe haber al menos 1 tier.');
    return;
  }
  if (!confirm('¿Eliminar este tier?')) return;

  tiers = tiers.filter(t => t.id !== id);
  delete detalleState[id];
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

  // Guardia: mesRetornos debe ser posterior a mesInversion
  if (field === 'mesRetornos' || field === 'mesInversion') {
    if (tier.mesRetornos <= tier.mesInversion) {
      tier.mesRetornos = tier.mesInversion + 1;
      renderTiers();
      alert('El mes de inicio de retornos debe ser posterior al mes de inversión. Se ajustó automáticamente.');
      return;
    }
  }

  calcularTodo();
}

// ==================== RENDER TIERS ====================

function renderTiers() {
  const container = document.getElementById('tiersContainer');
  if (!container) return;
  container.innerHTML = '';

  tiers.forEach((tier, index) => {
    const mesWarning = tier.mesRetornos <= tier.mesInversion;

    const section = document.createElement('section');
    section.className = 'tier-section';
    section.setAttribute('data-tier-index', index);

    section.innerHTML = `
      <div class="tier-header" onclick="toggleCollapseTier(${tier.id})">
        <div class="tier-title">${tier.nombre} · Tier ${index + 1}</div>
        <div class="tier-actions">
          <button class="tier-btn-collapse"
                  onclick="event.stopPropagation(); toggleCollapseTier(${tier.id})"
                  title="${tier.collapsed ? 'Expandir' : 'Colapsar'}">
            ${tier.collapsed ? '▼' : '▲'}
          </button>
          <button class="tier-btn-delete"
                  onclick="event.stopPropagation(); eliminarTier(${tier.id})"
                  title="Eliminar tier">
            ×
          </button>
        </div>
      </div>

      <div class="tier-content ${tier.collapsed ? 'collapsed' : ''}">

        <div class="input-group">
          <label>Nombre del Tier</label>
          <input type="text" value="${tier.nombre}"
                 onchange="actualizarTier(${tier.id}, 'nombre', this.value); this.closest('.tier-section').querySelector('.tier-title').textContent = this.value + ' · Tier ${index + 1}'">
        </div>

        <div class="input-grid-2">
          <div class="input-group">
            <label>N° Inversionistas</label>
            <input type="number" min="1" max="999" step="1" value="${tier.cantidad}"
                   onchange="actualizarTier(${tier.id}, 'cantidad', parseInt(this.value) || 1)">
          </div>
          <div class="input-group">
            <label>Inversión Individual <small>(CLP)</small></label>
            <input type="text" class="money-input"
                   value="${tier.monto.toLocaleString('es-CL')}"
                   data-tier-id="${tier.id}" data-field="monto">
          </div>
        </div>

        <div class="input-group">
          <label>Capital Total Tier <small>(auto)</small></label>
          <input type="text" value="${(tier.cantidad * tier.monto).toLocaleString('es-CL')}" disabled>
          <div class="input-help-text">N° Inversionistas × Inversión Individual</div>
        </div>

        <div class="input-grid-2">
          <div class="input-group">
            <label>Mes de Inversión</label>
            <input type="number" min="0" max="359" step="1" value="${tier.mesInversion}"
                   class="${mesWarning ? 'warning' : ''}"
                   onchange="actualizarTier(${tier.id}, 'mesInversion', parseInt(this.value) || 0)">
          </div>
          <div class="input-group">
            <label>Mes Inicio Retornos</label>
            <input type="number" min="1" max="360" step="1" value="${tier.mesRetornos}"
                   class="${mesWarning ? 'warning' : ''}"
                   onchange="actualizarTier(${tier.id}, 'mesRetornos', parseInt(this.value) || 1)">
            <div class="input-error-msg ${mesWarning ? 'show' : ''}">
              Debe ser mayor al mes de inversión
            </div>
          </div>
        </div>

        <div class="input-grid-2">
          <div class="input-group">
            <label>Tipo de Holder</label>
            <select onchange="actualizarTier(${tier.id}, 'tipoHolder', this.value)">
              <option value="personanatural" ${tier.tipoHolder === 'personanatural' ? 'selected' : ''}>Persona Natural</option>
              <option value="empresa"        ${tier.tipoHolder === 'empresa'        ? 'selected' : ''}>Empresa</option>
            </select>
          </div>
          <div class="input-group">
            <label>% Retención Impuestos</label>
            <input type="number" min="0" max="50" step="0.1" value="${tier.retencion}"
                   onchange="actualizarTier(${tier.id}, 'retencion', parseFloat(this.value) || 0)">
          </div>
        </div>

      </div>
    `;

    container.appendChild(section);
  });

  // Re-attachar money inputs dinámicos tras cada render
  attachMoneyInputsTiers();
}

// ==================== MONEY INPUTS DINÁMICOS (tiers) ====================

function attachMoneyInputsTiers() {
  const inputs = document.querySelectorAll('.money-input[data-tier-id]');
  inputs.forEach(input => {
    // Clonar para limpiar listeners anteriores
    const fresh = input.cloneNode(true);
    input.parentNode.replaceChild(fresh, input);

    fresh.addEventListener('input', debounce((e) => {
      const raw   = cleanNumber(e.target.value);
      // Reformatear mientras escribe
      const pos   = e.target.selectionStart;
      e.target.value = raw.toLocaleString('es-CL');

      const tierId = parseInt(e.target.getAttribute('data-tier-id'));
      const field  = e.target.getAttribute('data-field');
      if (tierId && field) {
        actualizarTier(tierId, field, raw);
        // Actualizar campo capital total del mismo tier
        const tier = tiers.find(t => t.id === tierId);
        if (tier) {
          // Buscar el input disabled de capital total en esa sección
          const sectionInputs = e.target.closest('.tier-content').querySelectorAll('input[disabled]');
          sectionInputs.forEach(inp => {
            inp.value = (tier.cantidad * tier.monto).toLocaleString('es-CL');
          });
        }
      }
    }, 350));
  });
}

// ==================== MONEY INPUTS GLOBALES (sidebar fijo) ====================

function attachMoneyInputsGlobales() {
  const ids = ['ctrlCapitalInicial', 'costoVentaFijoCLP', 'valorUF'];
  ids.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    // Formatear valor inicial
    const initial = cleanNumber(input.value);
    if (initial > 0) input.value = initial.toLocaleString('es-CL');

    input.addEventListener('input', debounce((e) => {
      const raw = cleanNumber(e.target.value);
      e.target.value = raw.toLocaleString('es-CL');
      calcularTodo();
    }, 350));
  });
}

// ==================== INICIALIZAR LISTENERS SIDEBAR ====================
// Llamado por app.js en DOMContentLoaded, DESPUÉS de renderTiers() y preCargarDesdeH3()

function initInputListeners() {

  // 1. Money inputs globales
  attachMoneyInputsGlobales();

  // 2. % Microinversionistas → auto-actualiza Controladora
  const inputMicroinv = document.getElementById('pctSocMicroinv');
  if (inputMicroinv) {
    inputMicroinv.addEventListener('input', debounce(() => {
      syncPctControlador();
      if (validarPctMicroinv()) calcularTodo();
    }, 350));
  }

  // 3. Resto de inputs numéricos del sidebar fijo
  //    Excluye: money-inputs (tienen debounce propio), pctSocMicroinv (arriba),
  //    pctSocControlador (disabled), data-tier-id (en tiers dinámicos)
  const sidebarInputs = document.querySelectorAll(
    '.input-section input:not(.money-input):not(#pctSocMicroinv):not(#pctSocControlador):not([data-tier-id]):not([disabled]), ' +
    '.input-section select'
  );
  const debouncedCalc = debounce(calcularTodo, 350);
  sidebarInputs.forEach(el => {
    el.addEventListener('input',  debouncedCalc);
    el.addEventListener('change', debouncedCalc);
  });

  // 4. Botón agregar tier
  const btnAdd = document.getElementById('btnAddTier');
  if (btnAdd) btnAdd.addEventListener('click', agregarTier);

  // 5. Sync inicial del campo controladora
  syncPctControlador();
}
