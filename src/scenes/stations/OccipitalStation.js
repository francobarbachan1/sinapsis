// ============================================================================
// Estación 2 — Lóbulo occipital (Percepción visual)
// Clave letra↔color siempre visible. Se muestra una secuencia de fichas de
// colores que es la palabra objetivo (mapeada). El jugador la reconstruye
// haciendo clic en las fichas de colores en el orden correcto.
// ============================================================================

import { CONFIG } from '../../config.js';
import { StationBase } from './StationBase.js';

// Paleta de colores para las letras (alcanza para palabras con hasta ~10
// letras únicas — soporta la palabra harder por default "APRENDIZAJE").
const PALETA = [
  { color: 0xe06b6b, hex: '#E06B6B', nombre: 'rojo' },
  { color: 0xf2a93b, hex: '#F2A93B', nombre: 'naranja' },
  { color: 0x4caf50, hex: '#4CAF50', nombre: 'verde' },
  { color: 0x42a5f5, hex: '#42A5F5', nombre: 'celeste' },
  { color: 0x7e57c2, hex: '#7E57C2', nombre: 'violeta' },
  { color: 0xf48fb1, hex: '#F48FB1', nombre: 'rosa' },
  { color: 0x8d6e63, hex: '#8D6E63', nombre: 'marrón' },
  { color: 0xffd54f, hex: '#FFD54F', nombre: 'amarillo' },
  { color: 0x26a69a, hex: '#26A69A', nombre: 'turquesa' },
  { color: 0xab47bc, hex: '#AB47BC', nombre: 'lila' },
];

export class OccipitalStation extends StationBase {
  constructor() {
    super('OccipitalStation', 'occipital');
  }

  consignaTexto() {
    return 'Vas a ver una secuencia de colores durante unos segundos. Memorizala. Cuando se oculte, reconstruila haciendo clic en las fichas de colores en el orden correcto. Si acertás, se revela una palabra.';
  }

  construirContenido() {
    const L = CONFIG.layout;
    this.palabra = (CONFIG.palabraOccipital || 'NEURONA').toUpperCase();

    // Construir mapa letra↔color (en orden de primera aparición)
    const letrasUnicas = [];
    for (const ch of this.palabra) {
      if (!letrasUnicas.includes(ch)) letrasUnicas.push(ch);
    }
    this.mapaLetraColor = {};
    letrasUnicas.forEach((l, i) => { this.mapaLetraColor[l] = PALETA[i % PALETA.length]; });
    this.coloresUnicos = letrasUnicas.map((l) => this.mapaLetraColor[l]);

    // Secuencia objetivo: la palabra mapeada a colores
    this.secuenciaObjetivo = this.palabra.split('').map((l) => this.mapaLetraColor[l]);

    // Estado
    this.indiceReconstruccion = 0;
    this.fase = 'inicio'; // 'inicio' | 'mostrando' | 'reconstruyendo'

    this._dibujarUI();
    // Auto-iniciar primera ronda tras pequeño delay
    this.time.delayedCall(700, () => this._mostrarSecuencia());
  }

  _dibujarUI() {
    const L = CONFIG.layout;

    this.add.text(L.brainAreaW / 2, 80, 'Memorizá la secuencia y reconstruila', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#5F5E5A',
    }).setOrigin(0.5);

    // Clave (letra ↔ color), siempre visible
    this.add.text(L.brainAreaW / 2, 120, 'CLAVE', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    const keys = Object.entries(this.mapaLetraColor);
    const keyW = 56, keyH = 56, gap = 10;
    const totalW = keys.length * keyW + (keys.length - 1) * gap;
    const startX = (L.brainAreaW - totalW) / 2;
    keys.forEach(([letra, c], i) => {
      const cx = startX + i * (keyW + gap) + keyW / 2;
      const cy = 168;
      this.add.rectangle(cx, cy, keyW, keyH, c.color, 1).setStrokeStyle(2, 0x1f3864, 0.4);
      this.add.text(cx, cy, letra, {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(0.5);
    });

    // Zona secuencia
    this.add.text(L.brainAreaW / 2, 230, 'SECUENCIA', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.zonaSecuencia = this.add.container(L.brainAreaW / 2, 280);

    // Línea de reconstrucción + letras reveladas
    this.add.text(L.brainAreaW / 2, 360, 'TU RECONSTRUCCIÓN', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.zonaReconstruccion = this.add.container(L.brainAreaW / 2, 410);
    this._dibujarSlotsReconstruccion();

    // Botonera: paleta de colores para clicar
    this.add.text(L.brainAreaW / 2, 510, 'Tocá los colores en orden:', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#5F5E5A',
    }).setOrigin(0.5);

    this._dibujarPaletaClicable();

    // Botón "ver secuencia de nuevo"
    const btnY = 660;
    const btn = this.add.rectangle(L.brainAreaW / 2, btnY, 220, 36, 0xffffff, 1)
      .setStrokeStyle(2, this.region.color, 1).setInteractive({ useHandCursor: true });
    this.add.text(L.brainAreaW / 2, btnY, 'Ver la secuencia de nuevo', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: this.region.colorHex,
    }).setOrigin(0.5);
    btn.on('pointerdown', () => {
      if (this.fase === 'mostrando') return;
      this._resetReconstruccion();
      this._mostrarSecuencia();
    });
  }

  _dibujarSlotsReconstruccion() {
    this.zonaReconstruccion.removeAll(true);
    const n = this.palabra.length;
    const slotW = 42, slotH = 42, gap = 6;
    const totalW = n * slotW + (n - 1) * gap;
    const startX = -totalW / 2;
    this._slotsReconstruccion = [];
    for (let i = 0; i < n; i++) {
      const x = startX + i * (slotW + gap) + slotW / 2;
      const bg = this.add.rectangle(x, 0, slotW, slotH, 0xffffff, 1).setStrokeStyle(2, 0xc4c4b8, 1);
      const letra = this.add.text(x, 0, '', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#1F3864',
      }).setOrigin(0.5);
      this.zonaReconstruccion.add([bg, letra]);
      this._slotsReconstruccion.push({ bg, letra });
    }
  }

  _dibujarPaletaClicable() {
    const L = CONFIG.layout;
    const n = this.coloresUnicos.length;
    const tileW = 56, tileH = 56, gap = 12;
    const totalW = n * tileW + (n - 1) * gap;
    const startX = (L.brainAreaW - totalW) / 2;
    const y = 580;

    this._paletaTiles = [];
    this.coloresUnicos.forEach((c, i) => {
      const cx = startX + i * (tileW + gap) + tileW / 2;
      const tile = this.add.rectangle(cx, y, tileW, tileH, c.color, 1).setStrokeStyle(3, 0x1f3864, 0.4);
      tile.setInteractive({ useHandCursor: true });
      tile.on('pointerdown', () => this._onClickColor(c, tile));
      this._paletaTiles.push(tile);
    });
  }

  _mostrarSecuencia() {
    this.fase = 'mostrando';
    this._inhabilitarPaleta(true);
    this.zonaSecuencia.removeAll(true);

    const n = this.secuenciaObjetivo.length;
    const tileW = 42, tileH = 42, gap = 6;
    const totalW = n * tileW + (n - 1) * gap;
    const startX = -totalW / 2;

    this.secuenciaObjetivo.forEach((c, i) => {
      const x = startX + i * (tileW + gap) + tileW / 2;
      const tile = this.add.rectangle(x, 0, tileW, tileH, c.color, 1).setStrokeStyle(2, 0x1f3864, 0.5);
      this.zonaSecuencia.add(tile);
    });

    // Cuenta regresiva visual: barra que se acorta
    const barW = 200;
    const barBg = this.add.rectangle(0, 36, barW, 6, 0xc4c4b8, 1).setOrigin(0.5);
    const bar = this.add.rectangle(-barW / 2, 36, barW, 6, this.region.color, 1).setOrigin(0, 0.5);
    this.zonaSecuencia.add([barBg, bar]);

    const duracionMs = CONFIG.dificultad.occipital.tiempoMostrarSecuenciaMs;
    this.tweens.add({
      targets: bar,
      scaleX: 0,
      duration: duracionMs,
      ease: 'Linear',
    });

    this.time.delayedCall(duracionMs, () => {
      // Ocultar la secuencia
      this.zonaSecuencia.removeAll(true);
      const aviso = this.add.text(0, 0, '?', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#C4C4B8',
      }).setOrigin(0.5);
      this.zonaSecuencia.add(aviso);

      this.fase = 'reconstruyendo';
      this._inhabilitarPaleta(false);
      this.indiceReconstruccion = 0;
      this._resetReconstruccion();
    });
  }

  _resetReconstruccion() {
    this.indiceReconstruccion = 0;
    this._dibujarSlotsReconstruccion();
  }

  _onClickColor(c, tile) {
    if (this.fase !== 'reconstruyendo') return;
    this.marcarProgreso();

    const esperado = this.secuenciaObjetivo[this.indiceReconstruccion];
    const slot = this._slotsReconstruccion[this.indiceReconstruccion];

    if (c === esperado) {
      slot.bg.setFillStyle(c.color, 1);
      slot.bg.setStrokeStyle(2, 0x1f3864, 0.5);
      slot.letra.setText(this.palabra[this.indiceReconstruccion]);
      slot.letra.setColor('#FFFFFF');
      this.indiceReconstruccion++;
      // Feedback de tile
      this.tweens.add({ targets: tile, scale: { from: 1, to: 1.15 }, duration: 120, yoyo: true });

      if (this.indiceReconstruccion >= this.secuenciaObjetivo.length) {
        // ¡Palabra revelada!
        this.fase = 'completo';
        this._inhabilitarPaleta(true);
        this.time.delayedCall(700, () => {
          // Mostrar palabra grande
          const L = CONFIG.layout;
          const palabraTxt = this.add.text(L.brainAreaW / 2, 480, this.palabra, {
            fontFamily: 'sans-serif',
            fontSize: '46px',
            fontStyle: 'bold',
            color: this.region.colorHex,
          }).setOrigin(0.5).setAlpha(0);
          this.tweens.add({
            targets: palabraTxt,
            alpha: 1,
            scale: { from: 0.6, to: 1 },
            duration: 600,
            ease: 'Back.easeOut',
            onComplete: () => this.time.delayedCall(800, () => this.resolverEstacion()),
          });
        });
      }
    } else {
      // Error: feedback + reset de reconstrucción (la secuencia sigue oculta)
      this.tweens.add({
        targets: tile, alpha: { from: 1, to: 0.4 }, duration: 100, yoyo: true,
      });
      const flash = this.add.rectangle(slot.bg.x + this.zonaReconstruccion.x, slot.bg.y + this.zonaReconstruccion.y, 50, 50, 0xc14a4a, 0.4);
      this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
      this._resetReconstruccion();
    }
  }

  _inhabilitarPaleta(inhabilitar) {
    for (const t of (this._paletaTiles || [])) {
      if (inhabilitar) t.disableInteractive();
      else t.setInteractive({ useHandCursor: true });
      t.setAlpha(inhabilitar ? 0.55 : 1);
    }
  }
}
