// ============================================================================
// Sinapsis — Inicialización de Phaser
// ============================================================================

import { CONFIG } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { MapScene } from './scenes/MapScene.js';
import { HudScene } from './scenes/HudScene.js';
import { EndScene } from './scenes/EndScene.js';
import { AmigdalaStation } from './scenes/stations/AmigdalaStation.js';
import { OccipitalStation } from './scenes/stations/OccipitalStation.js';
import { HipocampoStation } from './scenes/stations/HipocampoStation.js';
import { ParietalStation } from './scenes/stations/ParietalStation.js';
import { BrocaStation } from './scenes/stations/BrocaStation.js';
import { PrefrontalStation } from './scenes/stations/PrefrontalStation.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: CONFIG.ancho,
  height: CONFIG.alto,
  backgroundColor: CONFIG.ui.fondoHex,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [
    BootScene,
    IntroScene,
    MapScene,
    HudScene,
    EndScene,
    AmigdalaStation,
    OccipitalStation,
    HipocampoStation,
    ParietalStation,
    BrocaStation,
    PrefrontalStation,
  ],
};

// Quitamos el "Cargando..." inicial antes de montar Phaser.
const mount = document.getElementById('game');
if (mount) mount.innerHTML = '';

const game = new Phaser.Game(config);
// Exposición opcional para debugging desde la consola del navegador.
// No la usa el juego; podés borrarla sin consecuencias.
window.__sinapsis = { game };
