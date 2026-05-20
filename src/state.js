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
  currentRoomId: CONFIG.mapa.startRoomId, // sala actual del avatar
  spawnFromDoor: null,
  // Nivel de estrés (0..100). Sube con cortisol, baja con tiempo y al
  // resolver estaciones. Afecta velocidad de la neurona. No hay game over
  // (decisión pedagógica, Sección 16).
  estres: 0,
  // Contador de errores por estación, mostrado en EndScene.
  errores: {
    amigdala: 0,
    occipital: 0,
    hipocampo: 0,
    parietal: 0,
    broca: 0,
    prefrontal: 0,
  },
  // Contador de colisiones con cortisol, mostrado en EndScene.
  colisionesCortisol: 0,

  reset() {
    this.regionesResueltas = [];
    this.indicePistaActiva = 0;
    this.tiempoRestante = CONFIG.tiempoTotalSegundos;
    this.juegoBloqueadoPorTiempo = false;
    this.currentRoomId = CONFIG.mapa.startRoomId;
    this.spawnFromDoor = null;
    this.estres = CONFIG.estres.inicial;
    this.errores = { amigdala: 0, occipital: 0, hipocampo: 0, parietal: 0, broca: 0, prefrontal: 0 };
    this.colisionesCortisol = 0;
  },

  // Devuelve el tiempo realmente usado (para stats finales).
  tiempoUsadoSegundos() {
    return CONFIG.tiempoTotalSegundos - this.tiempoRestante;
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
