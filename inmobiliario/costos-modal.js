/**
 * CostosModal v1
 * Modal reutilizable de costos inmobiliarios.
 * Depende de sfi-state.js (debe cargarse antes).
 *
 * Uso:
 *   CostosModal.open(propiedadId, { precioUF, vobUF, nombre, valorUF })
 *
 * Al guardar llama SFI.saveCostos(id, costos) y dispara el evento:
 *   window.dispatchEvent(new CustomEvent('sfi:costos-saved', { detail: { id, costos } }))
 */

const CostosModal = (() => {

  // ── Estado interno ──────────────────────────────────────────────────────────
  let _propiedadId   = null;
  let _precioUF      = 0;
  let _vobUF         = 0;
  let _nombre        = '';
  let _valorUF       = 38500;
  let _arqRows       = [];
  let _conRows       = [];
  let _rowCounter    = 0;

  // ── Formatters ──────────────────────────────────────────────────────────────
  const fUF = n => new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(n) + ' UF';

  const fCLP = n => new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', maximumFractionDigits: 0
  }).format(n);

  const gn = id => parseFloat(document.getElementById('cm-' + id)?.value) || 0;

  // ── Inyectar HTML + CSS ─────────────────────────────────────────────────────
  function _inject() {
    if (document.getElementById('cm-overlay')) return;

    // CSS
    const style = document.createElement('style');
    style.textContent = `
      #cm-overlay {
        position: fixed; inset: 0; z-index: 2000;
        background: rgba(0,0,0,0.45);
        display: flex; align-items: flex-start; justify-content: center;
        padding: 40px 16px 40px;
        overflow-y: auto;
      }
      #cm-overlay.cm-hidden { display: none !important; }
      #cm-dialog {
        background: #FFFFFF;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        width: 100%;
        max-width: 860px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        color: #111827;
        overflow: hidden;
      }
      #cm-header {
        background: #1E40AF;
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      #cm-header h2 { font-size: 16px; font-weight: 700; margin: 0; }
      #cm-close {
        background: none; border: none; color: white;
        font-size: 22px; cursor: pointer; line-height: 1;
        padding: 0 4px;
        opacity: 0.8;
        transition: opacity 0.15s;
      }
      #cm-close:hover { opacity: 1; }
      #cm-body { padding: 20px; }
      .cm-section {
        background: #F9FAFB;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .cm-section-title {
        font-size: 13px; font-weight: 700;
        color: #1E40AF;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid #E5E7EB;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .cm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .cm-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
      .cm-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
      .cm-field { display: flex; flex-direction: column; gap: 4px; }
      .cm-field label {
        font-size: 11px; font-weight: 500;
        color: #6B7280;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .cm-field input,
      .cm-field select {
        height: 36px;
        padding: 0 10px;
        border: 1px solid #D1D5DB;
        border-radius: 4px;
        font-size: 13px;
        font-family: inherit;
        background: white;
        color: #111827;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .cm-field input:focus,
      .cm-field select:focus {
        outline: none;
        border-color: #1E40AF;
        box-shadow: 0 0 0 3px rgba(30,64,175,0.1);
      }
      .cm-field input:disabled {
        background: #F3F4F6;
        color: #6B7280;
        cursor: default;
      }
      .cm-cost-row {
        display: grid;
        grid-template-columns: 2fr 1fr 90px 36px;
        gap: 8px;
        margin-bottom: 8px;
        align-items: end;
      }
      .cm-btn-remove {
        height: 36px; width: 36px;
        border: 1px solid #DC2626;
        background: white; color: #DC2626;
        border-radius: 4px; cursor: pointer;
        font-size: 18px; font-weight: 600;
        transition: all 0.15s;
      }
      .cm-btn-remove:hover { background: #DC2626; color: white; }
      .cm-btn-add {
        width: 100%;
        height: 36px;
        border: 2px dashed #D1D5DB;
        background: transparent;
        color: #6B7280;
        border-radius: 6px;
        font-size: 12px; font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        margin-top: 4px;
      }
      .cm-btn-add:hover { border-color: #1E40AF; color: #1E40AF; background: rgba(30,64,175,0.04); }
      .cm-summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }
      .cm-metric {
        background: #EFF6FF;
        border: 1px solid #DBEAFE;
        border-radius: 6px;
        padding: 10px;
        text-align: center;
      }
      .cm-metric-label {
        font-size: 10px; color: #6B7280;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 4px;
      }
      .cm-metric-value {
        font-size: 15px; font-weight: 700;
        color: #111827;
        font-variant-numeric: tabular-nums;
      }
      .cm-metric-value.success { color: #047857; }
      .cm-metric-value.error   { color: #DC2626; }
      .cm-metric-value.primary { color: #1E40AF; }
      #cm-footer {
        padding: 14px 20px;
        border-top: 1px solid #E5E7EB;
        background: #F9FAFB;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      #cm-gap-neto-footer {
        font-size: 14px; font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .cm-footer-actions { display: flex; gap: 8px; }
      .cm-btn {
        height: 36px;
        padding: 0 16px;
        border: none;
        border-radius: 6px;
        font-size: 13px; font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.15s;
      }
      .cm-btn-secondary {
        background: white; color: #374151;
        border: 1px solid #D1D5DB;
      }
      .cm-btn-secondary:hover { background: #F3F4F6; border-color: #9CA3AF; }
      .cm-btn-primary { background: #1E40AF; color: white; }
      .cm-btn-primary:hover { background: #1E3A8A; }
      @media (max-width: 640px) {
        .cm-grid-2, .cm-grid-3, .cm-grid-4, .cm-summary { grid-template-columns: 1fr 1fr; }
        .cm-cost-row { grid-template-columns: 1fr 1fr 80px 36px; }
        #cm-overlay { padding: 0; align-items: flex-end; }
        #cm-dialog { border-radius: 12px 12px 0 0; max-height: 92dvh; overflow-y: auto; }
      }
    `;
    document.head.appendChild(style);

    // HTML
    const overlay = document.createElement('div');
    overlay.id = 'cm-overlay';
    overlay.className = 'cm-hidden';
    overlay.innerHTML = `
      <div id="cm-dialog" role="dialog" aria-modal="true" aria-labelledby="cm-title">

        <div id="cm-header">
          <h2 id="cm-title">🧱 Costos del Proyecto</h2>
          <button id="cm-close" aria-label="Cerrar">×</button>
        </div>

        <div id="cm-body">

          <!-- Base -->
          <div class="cm-section">
            <div class="cm-section-title">Base del Proyecto</div>
            <div class="cm-grid-4">
              <div class="cm-field">
                <label>Propiedad</label>
                <input type="text" id="cm-propNombre" disabled>
              </div>
              <div class="cm-field">
                <label>Precio Compra (UF)</label>
                <input type="text" id="cm-propPrecio" disabled>
              </div>
              <div class="cm-field">
                <label>VOB (UF)</label>
                <input type="text" id="cm-propVob" disabled>
              </div>
              <div class="cm-field">
                <label>Duración Proyecto (meses)</label>
                <input type="number" id="cm-duracionMeses" min="0" step="1" value="6" oninput="CostosModal._calcular()">
              </div>
            </div>
          </div>

          <!-- A. Compra -->
          <div class="cm-section">
            <div class="cm-section-title">A. Costos de Compra</div>
            <div class="cm-grid-4">
              <div class="cm-field">
                <label>Notaría / CBR (%)</label>
                <input type="number" id="cm-pctNotaria" min="0" step="0.01" value="1.00" oninput="CostosModal._calcular()">
              </div>
              <div class="cm-field">
                <label>Comisión compra (%)</label>
                <input type="number" id="cm-pctComision" min="0" step="0.01" value="0.00" oninput="CostosModal._calcular()">
              </div>
              <div class="cm-field">
                <label>Otros gastos (UF)</label>
                <input type="number" id="cm-otrosCompraUF" min="0" step="0.01" value="0" oninput="CostosModal._calcular()">
              </div>
              <div class="cm-field">
                <label>Total Compra Asociado</label>
                <input type="text" id="cm-totalCompraDisplay" disabled value="0 UF">
              </div>
            </div>
          </div>

          <!-- B. Arquitectura -->
          <div class="cm-section">
            <div class="cm-section-title">B. Arquitectura y Permisos</div>
            <div id="cm-arqContainer"></div>
            <button class="cm-btn-add" onclick="CostosModal._addRow('arq')">+ Agregar costo arquitectura / permiso</button>
          </div>

          <!-- C. Construcción -->
          <div class="cm-section">
            <div class="cm-section-title">C. Construcción y Remodelación</div>
            <div id="cm-conContainer"></div>
            <button class="cm-btn-add" onclick="CostosModal._addRow('con')">+ Agregar costo construcción</button>
            <div style="margin-top:12px;" class="cm-grid-3">
              <div class="cm-field">
                <label>Imprevistos sobre construcción (%)</label>
                <input type="number" id="cm-pctImprevistos" min="0" step="0.1" value="10" oninput="CostosModal._calcular()">
              </div>
              <div class="cm-field">
                <label>Imprevistos calculados</label>
                <input type="text" id="cm-imprevistosDisplay" disabled value="0 UF">
              </div>
              <div class="cm-field">
                <label>Construcción + imprevistos</label>
                <input type="text" id="cm-conTotalDisplay" disabled value="0 UF">
              </div>
            </div>
          </div>

          <!-- D. Holding -->
          <div class="cm-section">
            <div class="cm-section-title">D. Holding / Mantención</div>
            <div class="cm-grid-4">
              <div class="cm-field">
                <label>Contribuciones mensuales (UF)</label>
                <input type="number" id="cm-contribuciones" min="0" step="0.01" value="0" oninput="CostosModal._calcular()">
              </div>
              <div class="cm-field">
                <label>Gastos básicos mensuales (UF)</label>
                <input type="number" id="cm-gastosBasicos" min="0" step="0.01" value="0" oninput="CostosModal._calcular()">
              </div>
              <div class="cm-field">
                <label>Otros holding mensuales (UF)</label>
                <input type="number" id="cm-otrosHolding" min="0" step="0.01" value="0" oninput="CostosModal._calcular()">
              </div>
              <div class="cm-field">
                <label>Total Holding</label>
                <input type="text" id="cm-holdingDisplay" disabled value="0 UF">
              </div>
            </div>
          </div>

          <!-- Resumen -->
          <div class="cm-summary">
            <div class="cm-metric">
              <div class="cm-metric-label">Compra + cierre</div>
              <div class="cm-metric-value" id="cm-mCompra">0 UF</div>
            </div>
            <div class="cm-metric">
              <div class="cm-metric-label">Arquitectura</div>
              <div class="cm-metric-value" id="cm-mArq">0 UF</div>
            </div>
            <div class="cm-metric">
              <div class="cm-metric-label">Construcción</div>
              <div class="cm-metric-value" id="cm-mCon">0 UF</div>
            </div>
            <div class="cm-metric">
              <div class="cm-metric-label">Holding</div>
              <div class="cm-metric-value" id="cm-mHolding">0 UF</div>
            </div>
            <div class="cm-metric">
              <div class="cm-metric-label">Costo Total (UF)</div>
              <div class="cm-metric-value primary" id="cm-mTotal">0 UF</div>
            </div>
            <div class="cm-metric">
              <div class="cm-metric-label">Costo Total (CLP)</div>
              <div class="cm-metric-value" id="cm-mTotalCLP">$0</div>
            </div>
            <div class="cm-metric">
              <div class="cm-metric-label">Gap Bruto</div>
              <div class="cm-metric-value" id="cm-mGapBruto">0 UF</div>
            </div>
            <div class="cm-metric">
              <div class="cm-metric-label">Gap Neto</div>
              <div class="cm-metric-value success" id="cm-mGapNeto">0 UF</div>
            </div>
          </div>

        </div><!-- /cm-body -->

        <div id="cm-footer">
          <div id="cm-gap-neto-footer">Gap Neto: — UF</div>
          <div class="cm-footer-actions">
            <button class="cm-btn cm-btn-secondary" onclick="CostosModal.close()">Cancelar</button>
            <button class="cm-btn cm-btn-primary" onclick="CostosModal._guardar()">💾 Guardar costos</button>
          </div>
        </div>

      </div><!-- /cm-dialog -->
    `;
    document.body.appendChild(overlay);

    // Cerrar con Escape o click fuera
    overlay.addEventListener('click', e => { if (e.target === overlay) CostosModal.close(); });
    document.getElementById('cm-close').addEventListener('click', () => CostosModal.close());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') CostosModal.close(); });
  }

  // ── Helpers de filas ────────────────────────────────────────────────────────
  function _rowsToUF(rows) {
    return rows.reduce((acc, r) => {
      const m = parseFloat(r.monto) || 0;
      return acc + (r.unidad === 'CLP' ? (_valorUF > 0 ? m / _valorUF : 0) : m);
    }, 0);
  }

  function _renderRows(tipo) {
    const rows = tipo === 'arq' ? _arqRows : _conRows;
    const containerId = tipo === 'arq' ? 'cm-arqContainer' : 'cm-conContainer';
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    rows.forEach(row => {
      const div = document.createElement('div');
      div.className = 'cm-cost-row';
      div.innerHTML = `
        <div class="cm-field" style="margin:0">
          <label>Descripción</label>
          <input type="text" value="${row.nombre}" placeholder="Ej: Arquitecto, cocina, pintura"
            oninput="CostosModal._updateRow('${tipo}',${row.id},'nombre',this.value)">
        </div>
        <div class="cm-field" style="margin:0">
          <label>Monto</label>
          <input type="number" value="${row.monto}" min="0" step="0.01"
            oninput="CostosModal._updateRow('${tipo}',${row.id},'monto',this.value)">
        </div>
        <div class="cm-field" style="margin:0">
          <label>Unidad</label>
          <select onchange="CostosModal._updateRow('${tipo}',${row.id},'unidad',this.value)">
            <option value="UF"  ${row.unidad === 'UF'  ? 'selected' : ''}>UF</option>
            <option value="CLP" ${row.unidad === 'CLP' ? 'selected' : ''}>CLP</option>
          </select>
        </div>
        <button class="cm-btn-remove" onclick="CostosModal._removeRow('${tipo}',${row.id})">×</button>
      `;
      container.appendChild(div);
    });
  }

  // ── API pública ─────────────────────────────────────────────────────────────
  return {

    /**
     * Abre el modal para una propiedad.
     * @param {Number} propiedadId
     * @param {Object} opts — { precioUF, vobUF, nombre, valorUF }
     */
    open(propiedadId, opts = {}) {
      _inject();

      _propiedadId = propiedadId;
      _precioUF    = opts.precioUF || 0;
      _vobUF       = opts.vobUF   || 0;
      _nombre      = opts.nombre  || `Propiedad ${propiedadId}`;
      _valorUF     = opts.valorUF || SFI.loadValorUF();

      // Precargar costos existentes si los hay
      const prop = SFI.getPropiedad(propiedadId);
      const c    = prop?.costos;

      _arqRows = c?.detalle?.filasArquitectura
        ? c.detalle.filasArquitectura.map((r, i) => ({ ...r, id: ++_rowCounter }))
        : [];
      _conRows = c?.detalle?.filasConstruccion
        ? c.detalle.filasConstruccion.map((r, i) => ({ ...r, id: ++_rowCounter }))
        : [];

      // Rellenar campos base
      document.getElementById('cm-title').textContent    = `🧱 Costos — ${_nombre}`;
      document.getElementById('cm-propNombre').value     = _nombre;
      document.getElementById('cm-propPrecio').value     = fUF(_precioUF);
      document.getElementById('cm-propVob').value        = fUF(_vobUF);
      document.getElementById('cm-duracionMeses').value  = c?.duracionMeses ?? 6;
      document.getElementById('cm-pctNotaria').value     = c?.detalle?.pctNotaria    ?? 1.00;
      document.getElementById('cm-pctComision').value    = c?.detalle?.pctComision   ?? 0.00;
      document.getElementById('cm-otrosCompraUF').value  = c?.detalle?.otrosCompraUF ?? 0;
      document.getElementById('cm-pctImprevistos').value = c?.detalle?.pctImprevistos ?? 10;
      document.getElementById('cm-contribuciones').value = c?.detalle?.contribucionesMensualesUF ?? 0;
      document.getElementById('cm-gastosBasicos').value  = c?.detalle?.gastosBasicosMensualesUF  ?? 0;
      document.getElementById('cm-otrosHolding').value   = c?.detalle?.otrosHoldingMensualesUF   ?? 0;

      // Si no hay filas, arrancar con defaults
      if (_arqRows.length === 0) _arqRows.push({ id: ++_rowCounter, nombre: 'Arquitecto', monto: 0, unidad: 'UF' });
      if (_conRows.length === 0) _conRows.push({ id: ++_rowCounter, nombre: 'Remodelación general', monto: 0, unidad: 'UF' });

      _renderRows('arq');
      _renderRows('con');
      this._calcular();

      document.getElementById('cm-overlay').classList.remove('cm-hidden');
      document.body.style.overflow = 'hidden';
    },

    close() {
      const overlay = document.getElementById('cm-overlay');
      if (overlay) overlay.classList.add('cm-hidden');
      document.body.style.overflow = '';
    },

    // ── Métodos internos (llamados desde HTML inline) ────────────────────────

    _addRow(tipo, nombre = '', monto = 0, unidad = 'UF') {
      const row = { id: ++_rowCounter, nombre, monto, unidad };
      if (tipo === 'arq') _arqRows.push(row);
      else                _conRows.push(row);
      _renderRows(tipo);
      this._calcular();
    },

    _removeRow(tipo, id) {
      if (tipo === 'arq') _arqRows = _arqRows.filter(r => r.id !== id);
      else                _conRows = _conRows.filter(r => r.id !== id);
      _renderRows(tipo);
      this._calcular();
    },

    _updateRow(tipo, id, field, value) {
      const rows = tipo === 'arq' ? _arqRows : _conRows;
      const row  = rows.find(r => r.id === id);
      if (!row) return;
      row[field] = field === 'monto' ? (parseFloat(value) || 0) : value;
      this._calcular();
    },

    _calcular() {
      const precioUF       = _precioUF;
      const vobUF          = _vobUF;
      const duracionMeses  = gn('duracionMeses');
      const pctNotaria     = gn('pctNotaria')    / 100;
      const pctComision    = gn('pctComision')   / 100;
      const otrosCompraUF  = gn('otrosCompraUF');
      const pctImprevistos = gn('pctImprevistos') / 100;
      const contribuciones = gn('contribuciones');
      const gastosBasicos  = gn('gastosBasicos');
      const otrosHolding   = gn('otrosHolding');

      const totalCompraUF = precioUF * pctNotaria + precioUF * pctComision + otrosCompraUF;
      const totalArqUF    = _rowsToUF(_arqRows);
      const totalConBaseUF = _rowsToUF(_conRows);
      const imprevistosUF = totalConBaseUF * pctImprevistos;
      const totalConUF    = totalConBaseUF + imprevistosUF;
      const holdingMensual = contribuciones + gastosBasicos + otrosHolding;
      const totalHoldingUF = holdingMensual * duracionMeses;
      const costoTotalUF   = totalCompraUF + totalArqUF + totalConUF + totalHoldingUF;
      const gapBrutoUF     = vobUF - precioUF;
      const gapNetoUF      = gapBrutoUF - costoTotalUF;

      // Displays intermedios
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
      set('cm-totalCompraDisplay', fUF(totalCompraUF));
      set('cm-imprevistosDisplay', fUF(imprevistosUF));
      set('cm-conTotalDisplay',    fUF(totalConUF));
      set('cm-holdingDisplay',     fUF(totalHoldingUF));

      // Métricas resumen
      const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setT('cm-mCompra',   fUF(totalCompraUF));
      setT('cm-mArq',      fUF(totalArqUF));
      setT('cm-mCon',      fUF(totalConUF));
      setT('cm-mHolding',  fUF(totalHoldingUF));
      setT('cm-mTotal',    fUF(costoTotalUF));
      setT('cm-mTotalCLP', fCLP(costoTotalUF * _valorUF));
      setT('cm-mGapBruto', fUF(gapBrutoUF));
      setT('cm-mGapNeto',  fUF(gapNetoUF));

      const gapEl = document.getElementById('cm-mGapNeto');
      if (gapEl) {
        gapEl.classList.remove('success', 'error');
        gapEl.classList.add(gapNetoUF >= 0 ? 'success' : 'error');
      }

      const footerEl = document.getElementById('cm-gap-neto-footer');
      if (footerEl) {
        footerEl.textContent = `Gap Neto: ${fUF(gapNetoUF)} (${fCLP(gapNetoUF * _valorUF)})`;
        footerEl.style.color = gapNetoUF >= 0 ? '#047857' : '#DC2626';
      }

      // Guardar estado calculado para uso en _guardar()
      this._lastCalc = {
        duracionMeses,
        totalCompraUF, totalArqUF, totalConUF, totalHoldingUF,
        costoTotalUF, gapBrutoUF, gapNetoUF,
        detalle: {
          pctNotaria:    gn('pctNotaria'),
          pctComision:   gn('pctComision'),
          otrosCompraUF, pctImprevistos,
          contribucionesMensualesUF: contribuciones,
          gastosBasicosMensualesUF:  gastosBasicos,
          otrosHoldingMensualesUF:   otrosHolding,
          filasArquitectura: _arqRows.map(({ nombre, monto, unidad }) => ({ nombre, monto, unidad })),
          filasConstruccion: _conRows.map(({ nombre, monto, unidad }) => ({ nombre, monto, unidad })),
        }
      };
    },

    _guardar() {
      if (_propiedadId === null) return;
      const costos = { ...this._lastCalc };
      SFI.saveCostos(_propiedadId, costos);
      window.dispatchEvent(new CustomEvent('sfi:costos-saved', {
        detail: { id: _propiedadId, costos }
      }));
      this.close();
    },

    _lastCalc: {},
  };

})();
