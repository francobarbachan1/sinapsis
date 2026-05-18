// ============================================================================
// BootScene — carga de audio y generación de texturas procedurales
// ============================================================================

import { CONFIG } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'Cargando…', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: CONFIG.ui.tituloHex,
    }).setOrigin(0.5);

    const r = CONFIG.rutasAudio;
    this.load.audio('ambient', r.ambient);
    this.load.audio('tension', r.tension);
    this.load.audio('resolution', r.resolution);
    this.load.audio('stingLogro', r.stingLogro);
    this.load.audio('rhythm1', r.rhythm1);
    this.load.audio('rhythm2', r.rhythm2);
    this.load.audio('rhythm3', r.rhythm3);
    this.load.audio('note1', r.note1);
    this.load.audio('note2', r.note2);
    this.load.audio('note3', r.note3);
    this.load.audio('note4', r.note4);
    this.load.audio('note5', r.note5);
    this.load.audio('note6', r.note6);
    this.load.audio('note7', r.note7);
    this.load.audio('emotionCalma', r.emotionCalma);
    this.load.audio('emotionTension', r.emotionTension);
    this.load.audio('emotionAlegria', r.emotionAlegria);
    this.load.audio('emotionTristeza', r.emotionTristeza);

    this.load.on('loaderror', (file) => {
      console.warn('[Sinapsis] Audio no disponible:', file.key, file.src);
    });
  }

  create() {
    this._generarTexturas();
    // Transición inmediata; IntroScene tiene su propio fadeIn.
    this.scene.start('IntroScene');
  }

  // --------------------------------------------------------------------------
  // Texturas procedurales (avatar neurona + pulso de estrés + partícula)
  // --------------------------------------------------------------------------
  _generarTexturas() {
    this._textureNeurona();
    this._textureNeuronaGlow();
    this._texturePulso();
    this._texturePulsoHalo();
    this._textureParticula();
  }

  _textureNeurona() {
    const size = 48;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cx = size / 2, cy = size / 2;
    // 6 dendritas radiales
    const numDend = 6;
    g.lineStyle(2.2, 0x1f3864, 1);
    for (let i = 0; i < numDend; i++) {
      const ang = (i / numDend) * Math.PI * 2 + Math.PI / 6;
      const x1 = cx + Math.cos(ang) * 8;
      const y1 = cy + Math.sin(ang) * 8;
      const x2 = cx + Math.cos(ang) * 20;
      const y2 = cy + Math.sin(ang) * 20;
      g.lineBetween(x1, y1, x2, y2);
      g.fillStyle(0x1f3864, 1);
      g.fillCircle(x2, y2, 2.5);
    }
    // Cuerpo
    g.fillStyle(0xffe27a, 1);
    g.fillCircle(cx, cy, 10);
    g.lineStyle(2, 0x1f3864, 1);
    g.strokeCircle(cx, cy, 10);
    // Núcleo
    g.fillStyle(0x1f3864, 1);
    g.fillCircle(cx, cy, 3.5);
    g.generateTexture('neurona', size, size);
    g.destroy();
  }

  _textureNeuronaGlow() {
    const size = 80;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Halo gaussiano por anillos
    for (let r = 38; r > 12; r -= 2) {
      const a = ((40 - r) / 40) * 0.18;
      g.fillStyle(0xffe27a, a);
      g.fillCircle(size / 2, size / 2, r);
    }
    g.generateTexture('neuronaGlow', size, size);
    g.destroy();
  }

  _texturePulso() {
    const size = 36;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cx = size / 2, cy = size / 2;
    // Halo exterior
    for (let r = 16; r > 8; r -= 1) {
      const a = ((17 - r) / 17) * 0.35;
      g.fillStyle(0xff5b3c, a);
      g.fillCircle(cx, cy, r);
    }
    // Núcleo
    g.fillStyle(0xff8a5c, 1);
    g.fillCircle(cx, cy, 6);
    g.lineStyle(1.5, 0xc94320, 1);
    g.strokeCircle(cx, cy, 6);
    // Chispas
    g.lineStyle(1.5, 0xffd9a8, 1);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 8;
      g.lineBetween(
        cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8,
        cx + Math.cos(ang) * 13, cy + Math.sin(ang) * 13,
      );
    }
    g.generateTexture('pulsoEstres', size, size);
    g.destroy();
  }

  _texturePulsoHalo() {
    const size = 48;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    for (let r = 22; r > 8; r -= 1) {
      const a = ((24 - r) / 24) * 0.10;
      g.fillStyle(0xff5b3c, a);
      g.fillCircle(size / 2, size / 2, r);
    }
    g.generateTexture('pulsoHalo', size, size);
    g.destroy();
  }

  _textureParticula() {
    const size = 8;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2, size / 2, 2);
    g.generateTexture('particula', size, size);
    g.destroy();
  }
}
