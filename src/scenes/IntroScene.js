// ============================================================================
// IntroScene — pantalla de apertura
// Rediseño: hero con neurona animada + cards + botón pulsante.
// ============================================================================

import { CONFIG } from '../config.js';
import { GameState } from '../state.js';

export class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  create() {
    GameState.reset();
    const W = CONFIG.ancho;
    const H = CONFIG.alto;

    // Fondo: gradiente + silueta de cerebro muy tenue + partículas
    this._dibujarFondo(W, H);

    // Hero: título grande + tagline + neurona XL a la derecha
    this._dibujarHero(W, H);

    // Cards: consigna + controles
    this._dibujarCards(W, H);

    // Botón Comenzar grande con pulse y glow
    this._dibujarBotonComenzar(W, H);

    this.cameras.main.fadeIn(420, 31, 56, 100);
  }

  // --------------------------------------------------------------------------
  // Fondo
  // --------------------------------------------------------------------------
  _dibujarFondo(W, H) {
    // Color base
    this.cameras.main.setBackgroundColor('#0e1e3a');

    // Gradiente vertical sutil (panel inferior un poco más claro)
    const grad = this.add.graphics();
    grad.fillGradientStyle(0x0e1e3a, 0x0e1e3a, 0x1f3864, 0x1f3864, 1);
    grad.fillRect(0, 0, W, H);

    // Silueta de cerebro tenue de fondo
    const brain = this.add.image(W / 2 + 220, H / 2 + 40, 'cerebroSilueta')
      .setAlpha(0.07).setScale(1.4);
    this.tweens.add({
      targets: brain, scale: { from: 1.4, to: 1.45 }, alpha: { from: 0.07, to: 0.1 },
      duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Partículas de impulsos nerviosos drift
    try {
      this.add.particles(0, 0, 'particula', {
        x: { min: 0, max: W }, y: { min: 0, max: H },
        lifespan: 9000, quantity: 1, frequency: 350,
        scale: { start: 0.9, end: 0 }, alpha: { start: 0.35, end: 0 },
        speedX: { min: -14, max: 14 }, speedY: { min: -10, max: -2 },
        blendMode: 'ADD',
      });
    } catch (e) { /* ignorar diferencias de versión de Phaser */ }

    // Líneas decorativas "sinapsis": pares de puntos unidos por una línea
    // tenue. Sugieren conexiones neuronales en el fondo.
    const linG = this.add.graphics().setAlpha(0.18);
    const rand = mulberry32(99);
    for (let i = 0; i < 14; i++) {
      const x1 = rand() * W, y1 = rand() * H;
      const x2 = x1 + (rand() - 0.5) * 250;
      const y2 = y1 + (rand() - 0.5) * 250;
      linG.lineStyle(1, 0x88a4dd, 0.5);
      linG.lineBetween(x1, y1, x2, y2);
      linG.fillStyle(0x88a4dd, 0.7);
      linG.fillCircle(x1, y1, 2);
      linG.fillCircle(x2, y2, 2);
    }
  }

  // --------------------------------------------------------------------------
  // Hero
  // --------------------------------------------------------------------------
  _dibujarHero(W, H) {
    // Título "Sinapsis" con glow detrás
    const titleY = 105;
    const glow = this.add.text(W / 2, titleY, 'Sinapsis', {
      fontFamily: 'sans-serif', fontSize: '78px', fontStyle: 'bold',
      color: '#2e5fa3',
    }).setOrigin(0.5).setAlpha(0.35);
    this.tweens.add({
      targets: glow, scale: { from: 1.0, to: 1.05 }, alpha: { from: 0.25, to: 0.4 },
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const title = this.add.text(W / 2, titleY, 'Sinapsis', {
      fontFamily: 'sans-serif', fontSize: '76px', fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: title, alpha: 1, y: { from: titleY - 8, to: titleY },
      duration: 600, ease: 'Cubic.easeOut',
    });

    // Tagline
    const tag = this.add.text(W / 2, 160, 'Un recorrido por el cerebro cuando aprende', {
      fontFamily: 'sans-serif', fontSize: '18px', fontStyle: 'italic',
      color: '#a8b8d8',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: tag, alpha: 1, duration: 600, delay: 200, ease: 'Cubic.easeOut',
    });

    // Neurona XL flotante a la derecha (decorativa)
    const neuronaX = W - 200;
    const neuronaY = H / 2 + 60;
    const neurona = this.add.image(neuronaX, neuronaY, 'neuronaXL').setScale(1.0);
    this.tweens.add({
      targets: neurona, scale: { from: 0.85, to: 0.92 },
      duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: neurona, y: { from: neuronaY - 8, to: neuronaY + 8 },
      duration: 3800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: neurona, angle: 360, duration: 24000, repeat: -1, ease: 'Linear',
    });

    // Pulso de "impulso" que recorre las dendritas
    this.time.addEvent({
      delay: 1400, loop: true,
      callback: () => {
        const ang = Math.random() * Math.PI * 2;
        const dot = this.add.circle(neuronaX, neuronaY, 6, 0xfff7c2, 1)
          .setStrokeStyle(2, 0xffe27a, 1);
        this.tweens.add({
          targets: dot,
          x: neuronaX + Math.cos(ang) * 90,
          y: neuronaY + Math.sin(ang) * 90,
          alpha: { from: 1, to: 0 },
          duration: 800, ease: 'Cubic.easeOut',
          onComplete: () => dot.destroy(),
        });
      },
    });
  }

  // --------------------------------------------------------------------------
  // Cards
  // --------------------------------------------------------------------------
  _dibujarCards(W, H) {
    const cardX = 80;
    const cardW = 680;

    // Card 1: Tu rol / consigna
    this._tarjeta(cardX, 215, cardW, 180, 'TU ROL', CONFIG.textoApertura, '#ffe27a');

    // Card 2: Controles (con chips visuales para teclas)
    const c2y = 420;
    this._tarjetaControles(cardX, c2y, cardW, 130);
  }

  _tarjeta(x, y, w, h, header, body, accent) {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.06);
    g.fillRoundedRect(x, y, w, h, 14);
    g.lineStyle(1, 0xffffff, 0.16);
    g.strokeRoundedRect(x, y, w, h, 14);
    // banda izquierda con color de acento
    g.fillStyle(Phaser.Display.Color.HexStringToColor(accent).color, 1);
    g.fillRoundedRect(x, y, 5, h, 3);

    this.add.text(x + 22, y + 16, header, {
      fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold',
      color: accent, letterSpacing: 3,
    });
    this.add.text(x + 22, y + 38, body, {
      fontFamily: 'sans-serif', fontSize: '15px',
      color: '#e6ecf8',
      wordWrap: { width: w - 40 }, lineSpacing: 4,
    });
  }

  _tarjetaControles(x, y, w, h) {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.06);
    g.fillRoundedRect(x, y, w, h, 14);
    g.lineStyle(1, 0xffffff, 0.16);
    g.strokeRoundedRect(x, y, w, h, 14);
    g.fillStyle(Phaser.Display.Color.HexStringToColor('#88a4dd').color, 1);
    g.fillRoundedRect(x, y, 5, h, 3);

    this.add.text(x + 22, y + 16, 'CONTROLES', {
      fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold',
      color: '#88a4dd', letterSpacing: 3,
    });

    // Fila de "chips" con las teclas + texto
    const ya = y + 50;
    this._chipKeys(x + 22, ya, ['W', 'A', 'S', 'D'], 'mover por el cerebro');
    this._chipKeys(x + 22, ya + 36, ['↑', '↓', '←', '→'], 'mover (alternativa)');
    this._chipKeys(x + 320, ya, ['🖱'], 'resolver estaciones');
    this._chipKeys(x + 320, ya + 36, ['1', '7'], 'notas de hipocampo', '–');
  }

  _chipKeys(x, y, keys, label, sep = ' ') {
    let cx = x;
    keys.forEach((k, i) => {
      const w = Math.max(28, 10 + k.length * 12);
      const h = 24;
      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 0.12);
      bg.fillRoundedRect(cx, y, w, h, 5);
      bg.lineStyle(1, 0xffffff, 0.3);
      bg.strokeRoundedRect(cx, y, w, h, 5);
      this.add.text(cx + w / 2, y + h / 2, k, {
        fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(0.5);
      cx += w + 4;
      if (i < keys.length - 1 && sep !== ' ') {
        this.add.text(cx, y + h / 2, sep, {
          fontFamily: 'sans-serif', fontSize: '14px', color: '#a8b8d8',
        }).setOrigin(0.5);
        cx += 8;
      }
    });
    this.add.text(cx + 8, y + 12, label, {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#c4d0e8',
    }).setOrigin(0, 0.5);
  }

  // --------------------------------------------------------------------------
  // Botón Comenzar (grande, con glow y pulse)
  // --------------------------------------------------------------------------
  _dibujarBotonComenzar(W, H) {
    const cx = 420;
    const cy = H - 75;
    const bw = 320, bh = 70;

    // Glow detrás del botón
    const glow = this.add.graphics();
    const drawGlow = (alpha) => {
      glow.clear();
      glow.fillStyle(0x2e5fa3, alpha);
      glow.fillRoundedRect(cx - bw / 2 - 12, cy - bh / 2 - 12, bw + 24, bh + 24, 16);
    };
    drawGlow(0.35);
    this.tweens.add({
      targets: { v: 0.35 }, v: 0.6,
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: (t) => drawGlow(t.getValue()),
    });

    const btn = this.add.graphics();
    const drawBtn = (color) => {
      btn.clear();
      btn.fillStyle(color, 1);
      btn.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 12);
      btn.lineStyle(2, 0xffffff, 0.4);
      btn.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 12);
    };
    drawBtn(0x2e5fa3);

    const txt = this.add.text(cx, cy, 'Comenzar', {
      fontFamily: 'sans-serif', fontSize: '26px', fontStyle: 'bold',
      color: '#FFFFFF', letterSpacing: 2,
    }).setOrigin(0.5);
    // Pequeña flecha animada
    const arrow = this.add.text(cx + 110, cy, '→', {
      fontFamily: 'sans-serif', fontSize: '28px', fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    this.tweens.add({
      targets: arrow, x: { from: cx + 110, to: cx + 118 },
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const hit = this.add.zone(cx, cy, bw, bh).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => drawBtn(0x4477c2));
    hit.on('pointerout', () => drawBtn(0x2e5fa3));
    hit.on('pointerdown', () => {
      drawBtn(0x1f3864);
      this.cameras.main.fadeOut(360, 14, 30, 58);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MapScene');
      });
    });
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
