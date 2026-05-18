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
      console.warn('[Sinapsis] Asset no disponible:', file.key, file.src);
    });
  }

  create() {
    this._generarTexturas();
    // Usamos setTimeout en lugar de this.time.delayedCall para evitar un
    // edge case donde Phaser deja BootScene en RUNNING sin tickear su time.
    window.setTimeout(() => {
      this.scene.start('IntroScene');
    }, 0);
  }

  // --------------------------------------------------------------------------
  // Texturas procedurales
  // --------------------------------------------------------------------------
  _generarTexturas() {
    this._textureNeurona();
    this._textureNeuronaGlow();
    this._textureNeuronaXL();
    this._texturePulso();
    this._texturePulsoHalo();
    this._textureParticula();
    this._textureCerebroSilueta();
    this._textureCelula();
  }

  // Neurona "in game" (avatar)
  _textureNeurona() {
    const size = 48;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cx = size / 2, cy = size / 2;
    const numDend = 7;
    g.lineStyle(2.2, 0x1f3864, 1);
    for (let i = 0; i < numDend; i++) {
      const ang = (i / numDend) * Math.PI * 2 + Math.PI / 6;
      const x1 = cx + Math.cos(ang) * 8;
      const y1 = cy + Math.sin(ang) * 8;
      const x2 = cx + Math.cos(ang) * 21;
      const y2 = cy + Math.sin(ang) * 21;
      g.lineBetween(x1, y1, x2, y2);
      // dendrita más fina con bifurcación
      g.lineStyle(1.4, 0x1f3864, 0.85);
      const bx = cx + Math.cos(ang + 0.25) * 17;
      const by = cy + Math.sin(ang + 0.25) * 17;
      g.lineBetween(cx + Math.cos(ang) * 14, cy + Math.sin(ang) * 14, bx, by);
      g.lineStyle(2.2, 0x1f3864, 1);
      g.fillStyle(0x1f3864, 1);
      g.fillCircle(x2, y2, 2.5);
    }
    // Cuerpo (soma)
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

  // Neurona XL para IntroScene / decoración
  _textureNeuronaXL() {
    const size = 240;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cx = size / 2, cy = size / 2;
    // Halo difuso primero
    for (let r = 110; r > 60; r -= 4) {
      const a = ((115 - r) / 115) * 0.10;
      g.fillStyle(0xffe27a, a);
      g.fillCircle(cx, cy, r);
    }
    // Dendritas largas con bifurcaciones
    const numDend = 8;
    for (let i = 0; i < numDend; i++) {
      const ang = (i / numDend) * Math.PI * 2 + Math.PI / 6;
      const x1 = cx + Math.cos(ang) * 40;
      const y1 = cy + Math.sin(ang) * 40;
      const x2 = cx + Math.cos(ang) * 100;
      const y2 = cy + Math.sin(ang) * 100;
      g.lineStyle(5, 0x1f3864, 1);
      g.lineBetween(x1, y1, x2, y2);
      g.fillStyle(0x1f3864, 1);
      g.fillCircle(x2, y2, 5);
      // bifurcaciones
      g.lineStyle(3, 0x2e5fa3, 1);
      const bx1 = cx + Math.cos(ang + 0.3) * 88;
      const by1 = cy + Math.sin(ang + 0.3) * 88;
      g.lineBetween(cx + Math.cos(ang) * 70, cy + Math.sin(ang) * 70, bx1, by1);
      g.fillCircle(bx1, by1, 3);
      const bx2 = cx + Math.cos(ang - 0.25) * 92;
      const by2 = cy + Math.sin(ang - 0.25) * 92;
      g.lineBetween(cx + Math.cos(ang) * 75, cy + Math.sin(ang) * 75, bx2, by2);
      g.fillCircle(bx2, by2, 3);
    }
    // Soma (cuerpo)
    g.fillStyle(0xffe27a, 1);
    g.fillCircle(cx, cy, 46);
    g.lineStyle(4, 0x1f3864, 1);
    g.strokeCircle(cx, cy, 46);
    // núcleo
    g.fillStyle(0x1f3864, 1);
    g.fillCircle(cx, cy, 18);
    // shine
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(cx - 14, cy - 14, 10);
    g.generateTexture('neuronaXL', size, size);
    g.destroy();
  }

  _textureNeuronaGlow() {
    const size = 80;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
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
    for (let r = 16; r > 8; r -= 1) {
      const a = ((17 - r) / 17) * 0.35;
      g.fillStyle(0xff5b3c, a);
      g.fillCircle(cx, cy, r);
    }
    g.fillStyle(0xff8a5c, 1);
    g.fillCircle(cx, cy, 6);
    g.lineStyle(1.5, 0xc94320, 1);
    g.strokeCircle(cx, cy, 6);
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

  // Silueta orgánica de un cerebro visto de planta (para minimapa y EndScene
  // y como decoración de IntroScene).
  _textureCerebroSilueta() {
    const W = 260, H = 320;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cx = W / 2, cy = H / 2 + 4;
    const rx = 120, ry = 150;

    // semilla determinista para que se vea igual cada vez
    const rand = mulberry32(42);
    const pts = [];
    const steps = 80;
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const jitter = 1 + (rand() - 0.5) * 0.07;
      pts.push({
        x: cx + Math.cos(t) * rx * jitter,
        y: cy + Math.sin(t) * ry * jitter,
      });
    }

    // Sombra suave
    g.fillStyle(0x000000, 0.05);
    g.fillEllipse(cx + 4, cy + 8, rx * 2, ry * 2);

    // Cuerpo del cerebro (rosa pálido)
    g.fillStyle(0xf6e8e5, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xb88a85, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.strokePath();

    // Fisura longitudinal (línea ondulada vertical)
    g.lineStyle(2, 0xb88a85, 0.7);
    g.beginPath();
    g.moveTo(cx, cy - ry + 14);
    for (let y = cy - ry + 24; y < cy + ry - 24; y += 10) {
      const dx = (Math.floor(y / 20) % 2 === 0) ? -3 : 3;
      g.lineTo(cx + dx, y);
    }
    g.lineTo(cx, cy + ry - 14);
    g.strokePath();

    // Surcos decorativos sutiles (gyros)
    g.lineStyle(1.5, 0xb88a85, 0.35);
    for (let i = 0; i < 14; i++) {
      const t = rand() * Math.PI * 2;
      const ang = t;
      const r1 = 25 + rand() * 80;
      const r2 = r1 + 18 + rand() * 28;
      const x1 = cx + Math.cos(ang) * r1 * 0.85;
      const y1 = cy + Math.sin(ang) * r1;
      const x2 = cx + Math.cos(ang) * r2 * 0.85;
      const y2 = cy + Math.sin(ang) * r2;
      g.lineBetween(x1, y1, x2, y2);
    }

    g.generateTexture('cerebroSilueta', W, H);
    g.destroy();
  }

  // Pequeña "célula" para decorar el piso de las salas con textura de tejido
  _textureCelula() {
    const size = 28;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const cx = size / 2, cy = size / 2;
    g.fillStyle(0xc9a8a3, 0.18);
    g.fillCircle(cx, cy, 11);
    g.lineStyle(1, 0xb88a85, 0.35);
    g.strokeCircle(cx, cy, 11);
    // núcleo
    g.fillStyle(0xb88a85, 0.32);
    g.fillCircle(cx, cy, 4);
    g.generateTexture('celula', size, size);
    g.destroy();
  }
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
