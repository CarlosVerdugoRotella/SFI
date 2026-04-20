/**
 * SFI State Manager v2
 * Almacena un array de propiedades, cada una con sus costos embebidos.
 * Bridge entre H1 (Sensibilizador), costos-modal.js y H3 (Balance Financiero).
 *
 * Estructura por propiedad:
 * {
 *   id            : Number   — identificador único (timestamp)
 *   nombre        : String
 *   tipo          : 'oportunidad' | 'comparable'
 *   estado        : 'Bien' | 'Antiguo Bien' | 'Antiguo Mal' | 'Antiguo'
 *   precioUF      : Number
 *   vobUF         : Number
 *   vobM2         : Number   — m² de referencia para VOB
 *   m2Construido  : Number
 *   m2Terreno     : Number
 *   m2Exterior    : Number
 *   dormitorios   : Number
 *   banos         : Number
 *   link          : String
 *   arriendoEstimadoUF : Number  — arriendo mensual estimado (UF/mes)
 *   ufM2          : Number   — calculado: precioUF / m2Construido
 *   vobUfM2       : Number   — calculado: vobUF / vobM2
 *   gapBrutoUF    : Number   — calculado: vobUF - precioUF
 *   costos: {
 *     duracionMeses       : Number
 *     totalCompraUF       : Number   — notaría + comisión + otros
 *     totalArquitecturaUF : Number
 *     totalConstruccionUF : Number   — incluye imprevistos
 *     totalHoldingUF      : Number
 *     costoTotalUF        : Number   — suma de los 4 bloques
 *     detalle: {
 *       pctNotaria        : Number
 *       pctComision       : Number
 *       otrosCompraUF     : Number
 *       pctImprevistos    : Number
 *       contribucionesMensualesUF : Number
 *       gastosBasicosMensualesUF  : Number
 *       otrosHoldingMensualesUF   : Number
 *       filasArquitectura : Array<{nombre, monto, unidad}>
 *       filasConstruccion : Array<{nombre, monto, unidad}>
 *     }
 *   } | null
 *   gapNetoUF     : Number | null  — calculado: gapBrutoUF - costos.costoTotalUF
 * }
 */

const SFI = {
  KEY: 'sfi_inmobiliario',

  // ── Core ──────────────────────────────────────────────────────────────────

  _read() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '{}');
    } catch { return {}; }
  },

  _write(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.error('SFI: error escribiendo localStorage', e);
    }
  },

  clearAll() {
    localStorage.removeItem(this.KEY);
  },

  // ── Valor UF global ───────────────────────────────────────────────────────

  saveValorUF(valorUF) {
    const d = this._read();
    d.valorUF = valorUF || 38500;
    this._write(d);
  },

  loadValorUF() {
    return this._read().valorUF || 38500;
  },

  // ── Propiedades ───────────────────────────────────────────────────────────

  /**
   * Guarda o actualiza una propiedad completa.
   * Si ya existe un objeto con el mismo id, hace merge (preserva costos si no se envían).
   * @param {Object} propiedad — debe incluir `id`
   */
  savePropiedad(propiedad) {
    const d = this._read();
    if (!d.propiedades) d.propiedades = [];

    const idx = d.propiedades.findIndex(p => p.id === propiedad.id);
    if (idx >= 0) {
      // Merge: preserva costos si no vienen en el nuevo objeto
      const existing = d.propiedades[idx];
      d.propiedades[idx] = {
        ...existing,
        ...propiedad,
        costos: propiedad.costos !== undefined ? propiedad.costos : existing.costos,
      };
    } else {
      d.propiedades.push({
        costos: null,
        gapNetoUF: null,
        ...propiedad,
      });
    }

    this._write(d);
  },

  /**
   * Guarda los costos de una propiedad específica y recalcula gapNetoUF.
   * @param {Number} id — id de la propiedad
   * @param {Object} costos — objeto costos completo
   */
  saveCostos(id, costos) {
    const d = this._read();
    if (!d.propiedades) return;

    const prop = d.propiedades.find(p => p.id === id);
    if (!prop) return;

    prop.costos = costos;
    prop.gapNetoUF = (prop.gapBrutoUF || 0) - (costos.costoTotalUF || 0);

    this._write(d);
  },

  /**
   * Retorna una propiedad por id.
   * @param {Number} id
   * @returns {Object|null}
   */
  getPropiedad(id) {
    const d = this._read();
    return (d.propiedades || []).find(p => p.id === id) || null;
  },

  /**
   * Retorna todas las propiedades guardadas.
   * @returns {Array}
   */
  loadPropiedades() {
    return this._read().propiedades || [];
  },

  /**
   * Elimina una propiedad por id.
   * @param {Number} id
   */
  deletePropiedad(id) {
    const d = this._read();
    if (!d.propiedades) return;
    d.propiedades = d.propiedades.filter(p => p.id !== id);
    this._write(d);
  },

  /**
   * Retorna solo las propiedades de tipo 'oportunidad' que tienen costos cargados.
   * Útil para el dropdown de H3.
   * @returns {Array}
   */
  loadOportunidades() {
    return this.loadPropiedades().filter(p => p.tipo === 'oportunidad');
  },

  // ── H3: Parámetros financieros ────────────────────────────────────────────

  /**
   * Guarda los parámetros financieros de H3 (crédito, estructura, año venta).
   * @param {Object} params
   * @param {Number}  params.propiedadId       — id de la propiedad seleccionada
   * @param {String}  params.estructura        — 'persona_natural' | 'sociedad'
   * @param {Boolean} params.usaCredito
   * @param {Number}  params.creditoUF
   * @param {Number}  params.tasaAnualPct
   * @param {Number}  params.plazoAnios
   * @param {Number}  params.anioVenta
   * @param {Boolean} params.exencionDisponible
   * @param {Number}  params.tasaMarginalPct   — solo si estructura = sociedad
   */
  saveH3Params(params) {
    const d = this._read();
    d.h3 = { ...params };
    this._write(d);
  },

  loadH3Params() {
    return this._read().h3 || null;
  },

  // ── Utilidades ────────────────────────────────────────────────────────────

  /**
   * Retorna un snapshot legible de todo el estado (útil para debug).
   */
  debug() {
    const d = this._read();
    console.table((d.propiedades || []).map(p => ({
      id:         p.id,
      nombre:     p.nombre,
      tipo:       p.tipo,
      precioUF:   p.precioUF,
      vobUF:      p.vobUF,
      gapBruto:   p.gapBrutoUF,
      costos:     p.costos ? p.costos.costoTotalUF : '—',
      gapNeto:    p.gapNetoUF,
    })));
    return d;
  },
};
