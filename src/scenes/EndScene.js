// ============================================================================
// EndScene — pantalla de cierre metacognitivo (Sección 16, recordatorio 4) +
// estadísticas de la partida (pedido del usuario). Sin "ganador": las stats
// hablan por sí mismas. El docente decide qué hacer con los datos.
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
    this.cameras.main.setBackgroundColor(CONFIG.ui.fondoHex);
    this.cameras.main.fadeIn(450, 31, 56, 100);

    // Título
    const tit = this.porTiempo ? 'El tiempo terminó' : 'Encendieron el cerebro completo';
    this.add.text(W / 2, 48, tit, {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: CONFIG.ui.tituloHex,
    }).setOrigin(0.5);

    // Mini-cerebro a la izquierda
    this._dibujarMiniCerebro(245, H / 2 + 20);

    // Layout derecha
    const rightX = 500;
    const rightW = 500;

    // Texto de cierre
    const textoFinal = this.porTiempo ? CONFIG.textoFinDeTiempo : CONFIG.textoCierreCompleto;
    this.add.text(rightX, 110, textoFinal, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#1F3864',
      wordWrap: { width: rightW },
      lineSpacing: 4,
    });

    // Línea metacognitiva
    this.add.text(rightX, 290, 'Ese cerebro que recorrieron es el suyo: así se ve, por dentro, cada vez que aprenden algo nuevo.', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'italic',
      color: '#2E5FA3',
      wordWrap: { width: rightW },
      lineSpacing: 4,
    });

    // Panel de estadísticas
    this._dibujarStats(rightX, 360, rightW);

    // Botón
    const btnY = H - 48;
    const btn = this.add.rectangle(rightX + 115, btnY, 220, 42, 0x2e5fa3, 1).setStrokeStyle(2, 0x1f3864);
    this.add.text(rightX + 115, btnY, 'Nueva partida', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setFillStyle(0x1f3864, 1));
    btn.on('pointerout', () => btn.setFillStyle(0x2e5fa3, 1));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(350, 31, 56, 100);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        GameState.reset();
        this.scene.start('IntroScene');
      });
    });
  }

  // --------------------------------------------------------------------------
  // Stats: tiempo + vida + errores por estación + colisiones de cortisol.
  // --------------------------------------------------------------------------
  _dibujarStats(x, y, w) {
    // Header
    this.add.text(x, y, 'CÓMO LES FUE', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    this.add.rectangle(x, y + 18, w, 1, 0x5f5e5a, 0.25).setOrigin(0, 0);

    const lineH = 22;
    let cy = y + 30;

    const tiempoUsado = GameState.tiempoUsadoSegundos();
    const tMin = Math.floor(tiempoUsado / 60);
    const tSec = tiempoUsado % 60;
    const tiempoFmt = `${tMin}:${String(tSec).padStart(2, '0')}`;

    const filas = [
      ['Tiempo usado', tiempoFmt, '#1F3864'],
      ['Regiones encendidas', `${GameState.regionesResueltas.length} de 6`, '#1F3864'],
      ['Vida al final', `${GameState.vida} / ${GameState.vidaMax}`,
        GameState.vida >= 4 ? '#0F6E56' : (GameState.vida >= 2 ? '#854F0B' : '#993556')],
      ['Pulsos de estrés que tocaron', `${GameState.colisionesCortisol || 0}`, '#1F3864'],
    ];

    for (const [lbl, val, color] of filas) {
      this.add.text(x, cy, lbl, {
        fontFamily: 'sans-serif', fontSize: '13px', color: '#5F5E5A',
      });
      this.add.text(x + w - 4, cy, val, {
        fontFamily: 'sans-serif', fontSize: '13px', color, fontStyle: 'bold',
      }).setOrigin(1, 0);
      cy += lineH;
    }

    // Errores por estación
    cy += 8;
    this.add.text(x, cy, 'ERRORES POR ESTACIÓN', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    cy += 20;

    const orden = ['amigdala', 'occipital', 'hipocampo', 'parietal', 'broca', 'prefrontal'];
    for (const id of orden) {
      const r = CONFIG.regiones[id];
      const errores = GameState.errores[id] || 0;
      // Bullet de color
      this.add.circle(x + 6, cy + 8, 5, r.color, 1).setStrokeStyle(1, 0x1f3864, 0.4);
      this.add.text(x + 18, cy, r.nombre, {
        fontFamily: 'sans-serif', fontSize: '12px', color: '#5F5E5A',
      });
      this.add.text(x + w - 4, cy, `${errores}`, {
        fontFamily: 'sans-serif', fontSize: '13px',
        color: errores === 0 ? '#0F6E56' : '#1F3864',
        fontStyle: 'bold',
      }).setOrigin(1, 0);
      cy += 19;
    }
  }

  _dibujarMiniCerebro(cx, cy) {
    const rx = 175, ry = 230;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.06);
    g.fillEllipse(cx + 5, cy + 8, rx * 2, ry * 2);
    g.fillStyle(0xf6e8e5, 1);
    g.fillEllipse(cx, cy, rx * 2, ry * 2);
    g.lineStyle(2, 0xc9a8a3, 1);
    g.strokeEllipse(cx, cy, rx * 2, ry * 2);

    const L = CONFIG.layout;
    for (const [id, r] of Object.entries(CONFIG.regiones)) {
      const dx = (r.x - L.brainAreaW / 2) * (rx / 270);
      const dy = (r.y - (L.brainAreaH / 2 + 10)) * (ry / 320);
      const x = cx + dx;
      const y = cy + dy;
      const resuelta = GameState.esRegionResuelta(id);
      let circle;
      if (resuelta) {
        circle = this.add.circle(x, y, r.radio * 0.5, r.color, 0.9).setStrokeStyle(2, r.color, 1);
        this.tweens.add({
          targets: circle, scale: { from: 1, to: 1.08 },
          duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      } else {
        circle = this.add.circle(x, y, r.radio * 0.5, r.color, 0.15).setStrokeStyle(1, r.color, 0.5);
      }
      const lblColor = resuelta ? r.colorHex : '#9b988f';
      this.add.text(x, y + r.radio * 0.5 + 7, r.nombre, {
        fontFamily: 'sans-serif',
        fontSize: '10px',
        color: lblColor,
        fontStyle: resuelta ? 'bold' : 'normal',
      }).setOrigin(0.5);
    }
  }
}
