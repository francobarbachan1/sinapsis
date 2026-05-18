// ============================================================================
// BootScene — carga de assets de audio
// ============================================================================

import { CONFIG } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Texto de carga simple
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'Cargando…', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: CONFIG.ui.tituloHex,
    }).setOrigin(0.5);

    // Audio placeholders
    const r = CONFIG.rutasAudio;
    this.load.audio('ambient', r.ambient);
    this.load.audio('tension', r.tension);
    this.load.audio('resolution', r.resolution);
    this.load.audio('stingLogro', r.stingLogro);
    this.load.audio('rhythm1', r.rhythm1);
    this.load.audio('rhythm2', r.rhythm2);
    this.load.audio('rhythm3', r.rhythm3);
    this.load.audio('emotionCalma', r.emotionCalma);
    this.load.audio('emotionTension', r.emotionTension);
    this.load.audio('emotionAlegria', r.emotionAlegria);
    this.load.audio('emotionTristeza', r.emotionTristeza);

    // Si algún asset no está disponible, no romper el juego.
    this.load.on('loaderror', (file) => {
      console.warn('[Sinapsis] Audio no disponible:', file.key, file.src);
    });
  }

  create() {
    this.scene.start('IntroScene');
  }
}
