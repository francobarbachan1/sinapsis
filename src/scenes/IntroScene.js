// ============================================================================
// IntroScene — pantalla de apertura + consigna + tutorial brevísimo
// ============================================================================

import { CONFIG } from '../config.js';
import { GameState } from '../state.js';

export class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  create() {
    GameState.reset();

    const { width, height } = this.scale;

    // Fondo
    this.cameras.main.setBackgroundColor(CONFIG.ui.fondoHex);

    // Título
    this.add.text(width / 2, 110, 'Sinapsis', {
      fontFamily: 'sans-serif',
      fontSize: '72px',
      fontStyle: 'bold',
      color: CONFIG.ui.tituloHex,
    }).setOrigin(0.5);

    this.add.text(width / 2, 175, 'Un recorrido por el cerebro adolescente cuando aprende', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: CONFIG.ui.textoSecundarioHex,
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Consigna principal
    this.add.text(width / 2, 240, CONFIG.textoApertura, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#222',
      align: 'center',
      wordWrap: { width: 820 },
      lineSpacing: 8,
    }).setOrigin(0.5, 0);

    // Tutorial de controles
    const yTutorial = 460;
    this.add.text(width / 2, yTutorial, 'Controles', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: CONFIG.ui.tituloHex,
    }).setOrigin(0.5, 0);

    this.add.text(
      width / 2,
      yTutorial + 36,
      'Moverse por el cerebro: WASD o flechas\nEntrar a una región: caminá hasta ella\nMouse: para resolver cada estación',
      {
        fontFamily: 'sans-serif',
        fontSize: '17px',
        color: CONFIG.ui.textoSecundarioHex,
        align: 'center',
        lineSpacing: 6,
      },
    ).setOrigin(0.5, 0);

    // Botón comenzar
    this._botonComenzar(width / 2, height - 70);
  }

  _botonComenzar(x, y) {
    const w = 240, h = 60;
    const g = this.add.graphics();
    g.fillStyle(0x2e5fa3, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    g.lineStyle(2, 0x1f3864, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);

    const txt = this.add.text(x, y, 'Comenzar', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    const hit = this.add.zone(x, y, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      g.clear();
      g.fillStyle(0x1f3864, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      g.lineStyle(2, 0x1f3864, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    });
    hit.on('pointerout', () => {
      g.clear();
      g.fillStyle(0x2e5fa3, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      g.lineStyle(2, 0x1f3864, 1);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    });
    hit.on('pointerdown', () => {
      this.scene.start('MapScene');
      this.scene.launch('HudScene');
    });

    return { g, txt, hit };
  }
}
