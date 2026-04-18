/**
 * SFI State Manager
 * Shared localStorage bridge between H1 (Sensibilizador), H2 (Costos) and H3 (Balance)
 */

const SFI = {
  KEY: 'sfi_inmobiliario',

  get() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '{}');
    } catch { return {}; }
  },

  set(data) {
    const current = this.get();
    localStorage.setItem(this.KEY, JSON.stringify({ ...current, ...data }));
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  // ---- H1: Sensibilizador ----
  saveH1(data) {
    this.set({
      h1_valorUF:       data.valorUF       || 0,
      h1_precioCompraUF: data.precioCompraUF || 0,
      h1_vobUF:         data.vobUF         || 0,
      h1_m2Construido:  data.m2Construido  || 0,
      h1_m2Terreno:     data.m2Terreno     || 0,
      h1_nombre:        data.nombre        || '',
      h1_gapBrutoUF:    data.gapBrutoUF    || 0,
    });
  },

  loadH1() {
    const d = this.get();
    return {
      valorUF:        d.h1_valorUF        || 38500,
      precioCompraUF: d.h1_precioCompraUF || 0,
      vobUF:          d.h1_vobUF          || 0,
      m2Construido:   d.h1_m2Construido   || 0,
      m2Terreno:      d.h1_m2Terreno      || 0,
      nombre:         d.h1_nombre         || '',
      gapBrutoUF:     d.h1_gapBrutoUF     || 0,
    };
  },

  // ---- H2: Costos ----
  saveH2(data) {
    this.set({
      h2_costoTotalUF:       data.costoTotalUF       || 0,
      h2_totalCompraUF:      data.totalCompraUF      || 0,
      h2_totalArquitecturaUF: data.totalArquitecturaUF || 0,
      h2_totalConstruccionUF: data.totalConstruccionUF || 0,
      h2_totalHoldingUF:     data.totalHoldingUF     || 0,
      h2_duracionMeses:      data.duracionMeses      || 0,
    });
  },

  loadH2() {
    const d = this.get();
    return {
      costoTotalUF:        d.h2_costoTotalUF        || 0,
      totalCompraUF:       d.h2_totalCompraUF       || 0,
      totalArquitecturaUF: d.h2_totalArquitecturaUF || 0,
      totalConstruccionUF: d.h2_totalConstruccionUF || 0,
      totalHoldingUF:      d.h2_totalHoldingUF      || 0,
      duracionMeses:       d.h2_duracionMeses       || 0,
    };
  },
};
