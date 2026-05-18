// ============================================================================
// EndScene — pantalla de cierre metacognitivo (Sección 16, recordatorio 4)
// Muestra el cerebro con las regiones logradas (etiquetadas con su nombre
// anatómico) y un texto que revela que ese cerebro es el del propio jugador.
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

    // Título
    const tit = this.porTiempo ? 'El tiempo terminó' : 'Encendieron el cerebro completo';
    this.add.text(W / 2, 70, tit, {
      fontFamily: 'sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: CONFIG.ui.tituloHex,
    }).setOrigin(0.5);

    // Mini-cerebro a la izquierda
    this._dibujarMiniCerebro(280, H / 2 + 30);

    // Texto cierre a la derecha
    const textoFinal = this.porTiempo ? CONFIG.textoFinDeTiempo : CONFIG.textoCierreCompleto;
    this.add.text(W - 540, 160, textoFinal, {
      fontFamily: 'sans-serif',
      fontSize: '17px',
      color: '#1F3864',
      wordWrap: { width: 500 },
      lineSpacing: 5,
    });

    // Mensaje metacognitivo (siempre, no condicional al tiempo)
    this.add.text(W - 540, 460, 'Ese cerebro que recorrieron es el suyo: así se ve, por dentro, cada vez que aprenden algo nuevo.', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'italic',
      color: '#2E5FA3',
      wordWrap: { width: 500 },
      lineSpacing: 5,
    });

    // Resumen de regiones encendidas
    const resumenY = H - 130;
    const totalResueltas = GameState.regionesResueltas.length;
    this.add.text(W - 540, resumenY, `Regiones encendidas: ${totalResueltas} de 6`, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#5F5E5A',
      fontStyle: 'bold',
    });

    // Botón volver al inicio
    const btnY = H - 50;
    const btn = this.add.rectangle(W - 540 + 110, btnY, 220, 42, 0x2e5fa3, 1).setStrokeStyle(2, 0x1f3864);
    this.add.text(W - 540 + 110, btnY, 'Nueva partida', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      GameState.reset();
      this.scene.start('IntroScene');
    });
  }

  _dibujarMiniCerebro(cx, cy) {
    const rx = 200, ry = 250;
    const g = this.add.graphics();
    // sombra
    g.fillStyle(0x000000, 0.06);
    g.fillEllipse(cx + 5, cy + 8, rx * 2, ry * 2);
    // cuerpo
    g.fillStyle(0xf6e8e5, 1);
    g.fillEllipse(cx, cy, rx * 2, ry * 2);
    g.lineStyle(2, 0xc9a8a3, 1);
    g.strokeEllipse(cx, cy, rx * 2, ry * 2);

    // Regiones (proporcionalmente reposicionadas)
    const L = CONFIG.layout;
    for (const [id, r] of Object.entries(CONFIG.regiones)) {
      const dx = (r.x - L.brainAreaW / 2) * (rx / 270);
      const dy = (r.y - (L.brainAreaH / 2 + 10)) * (ry / 320);
      const x = cx + dx;
      const y = cy + dy;
      const resuelta = GameState.esRegionResuelta(id);
      if (resuelta) {
        this.add.circle(x, y, r.radio * 0.55, r.color, 0.9).setStrokeStyle(2, r.color, 1);
      } else {
        this.add.circle(x, y, r.radio * 0.55, r.color, 0.15).setStrokeStyle(1, r.color, 0.5);
      }
      // Etiqueta anatómica (visible si se logró)
      const lblColor = resuelta ? r.colorHex : '#9b988f';
      this.add.text(x, y + r.radio * 0.55 + 8, r.nombre, {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: lblColor,
        fontStyle: resuelta ? 'bold' : 'normal',
      }).setOrigin(0.5);
    }
  }
}
