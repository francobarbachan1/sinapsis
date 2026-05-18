// ============================================================================
// Sinapsis — Estado global de la partida
// ----------------------------------------------------------------------------
// Singleton simple. Las escenas leen/escriben acá en vez de la registry de
// Phaser para que las firmas sean explícitas.
// ============================================================================

import { CONFIG, ORDEN_REGIONES } from './config.js';

export const GameState = {
  regionesResueltas: [],          // ['amigdala', 'occipital', ...]
  indicePistaActiva: 0,           // 0..5 → cuál pista está vigente
  tiempoRestante: CONFIG.tiempoTotalSegundos,
  juegoBloqueadoPorTiempo: false,

  reset() {
    this.regionesResueltas = [];
    this.indicePistaActiva = 0;
    this.tiempoRestante = CONFIG.tiempoTotalSegundos;
    this.juegoBloqueadoPorTiempo = false;
  },

  pistaActiva() {
    if (this.indicePistaActiva >= CONFIG.pistas.length) return null;
    return CONFIG.pistas[this.indicePistaActiva];
  },

  regionActiva() {
    const p = this.pistaActiva();
    return p ? p.regionId : null;
  },

  esRegionResuelta(id) {
    return this.regionesResueltas.includes(id);
  },

  marcarResuelta(id) {
    if (!this.esRegionResuelta(id)) this.regionesResueltas.push(id);
    this.indicePistaActiva = this.regionesResueltas.length;
  },

  juegoCompleto() {
    return this.regionesResueltas.length >= ORDEN_REGIONES.length;
  },
};
