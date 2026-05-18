// ============================================================================
// EndScene — pantalla de cierre metacognitivo + estadísticas
// Sin "ganador": las stats hablan por sí mismas (Sección 16 del spec).
// ============================================================================

import { CONFIG } from '../config.js';
import { GameState } from '../state.js';

export class EndScene extends Phaser.Scene {
  constructor() {
    super('EndScene');
  }

  init(data) {
    this.porTiempo = !!(data && data.porTiempo);
  }

  create() {
    const W = CONFIG.ancho;
    const H = CONFIG.alto;

    // Fondo con gradiente azul
    this._dibujarFondo(W, H);

    this.cameras.main.fadeIn(500, 14, 30, 58);

    // Título
    const tit = this.porTiempo ? 'El tiempo terminó' : 'Encendieron el cerebro completo';
    this.add.text(W / 2, 38, tit, {
      fontFamily: 'sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    // Mini-cerebro a la izquierda
    this._dibujarMiniCerebro(290, H / 2 + 30);

    // Layout derecha
    const rightX = 600;
    const rightW = 620;

    // Texto cierre
    this.add.text(rightX, 80, this.porTiempo ? CONFIG.textoFinDeTiempo : CONFIG.textoCierreCompleto, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#e6ecf8',
      wordWrap: { width: rightW },
      lineSpacing: 4,
    });

    // Línea metacognitiva (en cursiva con color de acento)
    this.add.text(rightX, 220,
      'Ese cerebro que recorrieron es el suyo: así se ve, por dentro, cada vez que aprenden algo nuevo.',
      {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        fontStyle: 'italic',
        color: '#ffe27a',
        wordWrap: { width: rightW },
        lineSpacing: 3,
      });

    // 4 big stats en una grilla
    this._dibujarStatsBig(rightX, 290, rightW);

    // Errores por estación
    this._dibujarErrores(rightX, 470, rightW);

    // Botón
    this._dibujarBotonNueva(rightX, H - 42, rightW);
  }

  _dibujarFondo(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0e1e3a, 0x0e1e3a, 0x1f3864, 0x1f3864, 1);
    g.fillRect(0, 0, W, H);

    // Líneas decorativas sinapsis
    const rand = mulberry32(7);
    const lines = this.add.graphics().setAlpha(0.12);
    for (let i = 0; i < 10; i++) {
      const x1 = rand() * W, y1 = rand() * H;
      const x2 = x1 + (rand() - 0.5) * 220;
      const y2 = y1 + (rand() - 0.5) * 220;
      lines.lineStyle(1, 0x88a4dd, 0.5);
      lines.lineBetween(x1, y1, x2, y2);
      lines.fillStyle(0x88a4dd, 0.7);
      lines.fillCircle(x1, y1, 2);
      lines.fillCircle(x2, y2, 2);
    }
  }

  _dibujarStatsBig(x, y, w) {
    const cellW = (w - 20) / 4;
    const cellH = 80;
    const tiempoUsado = GameState.tiempoUsadoSegundos();
    const tMin = Math.floor(tiempoUsado / 60);
    const tSec = tiempoUsado % 60;
    const tiempoFmt = `${tMin}:${String(tSec).padStart(2, '0')}`;

    const stats = [
      { lbl: 'Tiempo',    val: tiempoFmt,                                color: '#88a4dd' },
      { lbl: 'Regiones',  val: `${GameState.regionesResueltas.length}/6`, color: '#ffe27a' },
      { lbl: 'Vida',      val: `${GameState.vida}/${GameState.vidaMax}`,
        color: GameState.vida >= 4 ? '#7fd1a8' : (GameState.vida >= 2 ? '#ffd9a8' : '#ff8a8a') },
      { lbl: 'Pulsos',    val: `${GameState.colisionesCortisol || 0}`,    color: '#ff8a5c' },
    ];
    stats.forEach((s, i) => {
      const cx = x + i * (cellW + 7);
      const cy = y;
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.06);
      g.fillRoundedRect(cx, cy, cellW, cellH, 10);
      g.lineStyle(1, 0xffffff, 0.16);
      g.strokeRoundedRect(cx, cy, cellW, cellH, 10);
      this.add.text(cx + cellW / 2, cy + 16, s.lbl.toUpperCase(), {
        fontFamily: 'sans-serif', fontSize: '10px', color: '#a8b8d8',
        fontStyle: 'bold', letterSpacing: 2,
      }).setOrigin(0.5);
      this.add.text(cx + cellW / 2, cy + 48, s.val, {
        fontFamily: 'sans-serif', fontSize: '26px', fontStyle: 'bold',
        color: s.color,
      }).setOrigin(0.5);
    });
  }

  _dibujarErrores(x, y, w) {
    this.add.text(x, y, 'ERRORES POR ESTACIÓN', {
      fontFamily: 'sans-serif', fontSize: '11px', color: '#a8b8d8',
      fontStyle: 'bold', letterSpacing: 2,
    });
    this.add.rectangle(x, y + 18, w, 1, 0xffffff, 0.18).setOrigin(0, 0);

    const orden = ['amigdala', 'occipital', 'hipocampo', 'parietal', 'broca', 'prefrontal'];
    // Encontrar el máximo para escalar las barras
    let maxErr = 1;
    for (const id of orden) maxErr = Math.max(maxErr, GameState.errores[id] || 0);

    const startY = y + 30;
    const rowH = 24;
    orden.forEach((id, i) => {
      const r = CONFIG.regiones[id];
      const errores = GameState.errores[id] || 0;
      const ry = startY + i * rowH;
      // Bullet de color
      this.add.circle(x + 6, ry + 8, 5, r.color, 1).setStrokeStyle(1, 0xfbfaf7, 0.6);
      // Nombre
      this.add.text(x + 22, ry, r.nombre, {
        fontFamily: 'sans-serif', fontSize: '12px', color: '#e6ecf8',
      });
      // Barra
      const barX = x + 200;
      const barW = w - 200 - 50;
      const barH = 6;
      this.add.rectangle(barX, ry + 9, barW, barH, 0xffffff, 0.12).setOrigin(0, 0);
      const fillRel = errores === 0 ? 0.0 : errores / maxErr;
      const barColor = errores === 0 ? 0x7fd1a8 : r.color;
      if (fillRel > 0) {
        this.add.rectangle(barX, ry + 9, barW * fillRel, barH, barColor, 1).setOrigin(0, 0);
      }
      // Número
      this.add.text(x + w - 4, ry, `${errores}`, {
        fontFamily: 'sans-serif', fontSize: '13px', fontStyle: 'bold',
        color: errores === 0 ? '#7fd1a8' : '#FFFFFF',
      }).setOrigin(1, 0);
    });
  }

  _dibujarBotonNueva(x, cy, w) {
    const bw = 220, bh = 42;
    const cx = x + w / 2;
    const btn = this.add.graphics();
    const drawBtn = (color) => {
      btn.clear();
      btn.fillStyle(color, 1);
      btn.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
      btn.lineStyle(2, 0xffffff, 0.4);
      btn.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
    };
    drawBtn(0x2e5fa3);
    this.add.text(cx, cy, 'Nueva partida', {
      fontFamily: 'sans-serif', fontSize: '15px', fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    const hit = this.add.zone(cx, cy, bw, bh).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => drawBtn(0x4477c2));
    hit.on('pointerout', () => drawBtn(0x2e5fa3));
    hit.on('pointerdown', () => {
      this.cameras.main.fadeOut(380, 14, 30, 58);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        GameState.reset();
        this.scene.start('IntroScene');
      });
    });
  }

  _dibujarMiniCerebro(cx, cy) {
    // Usar la silueta procedural
    const silueta = this.add.image(cx, cy, 'cerebroSilueta').setScale(1.05);
    silueta.setTint(0xffe5e0);

    // Regiones sobre la silueta
    const L = CONFIG.layout;
    for (const [id, r] of Object.entries(CONFIG.regiones)) {
      const dx = (r.x - L.brainAreaW / 2) * (120 / 270);
      const dy = (r.y - (L.brainAreaH / 2 + 10)) * (150 / 320);
      const x = cx + dx;
      const y = cy + dy;
      const resuelta = GameState.esRegionResuelta(id);

      let circle;
      if (resuelta) {
        // Halo glow
        const halo = this.add.circle(x, y, r.radio * 0.55, r.color, 0.25);
        this.tweens.add({
          targets: halo, scale: { from: 1, to: 1.4 }, alpha: { from: 0.25, to: 0 },
          duration: 1600, repeat: -1, ease: 'Cubic.easeOut',
        });
        circle = this.add.circle(x, y, r.radio * 0.42, r.color, 0.95)
          .setStrokeStyle(2, 0xfbfaf7, 1);
        this.tweens.add({
          targets: circle, scale: { from: 1, to: 1.08 },
          duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      } else {
        circle = this.add.circle(x, y, r.radio * 0.4, r.color, 0.18)
          .setStrokeStyle(1, r.color, 0.5);
      }
      const lblColor = resuelta ? r.colorHex : '#9b988f';
      this.add.text(x, y + r.radio * 0.5 + 6, r.nombre, {
        fontFamily: 'sans-serif',
        fontSize: '10px',
        color: lblColor,
        fontStyle: resuelta ? 'bold' : 'normal',
      }).setOrigin(0.5);
    }
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
