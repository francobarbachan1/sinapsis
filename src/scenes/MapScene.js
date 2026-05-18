// ============================================================================
// MapScene — el cerebro: hub de navegación
// ============================================================================

import { CONFIG } from '../config.js';
import { GameState } from '../state.js';
import { getSoundManager } from '../soundManager.js';

const STATION_SCENE = {
  amigdala: 'AmigdalaStation',
  occipital: 'OccipitalStation',
  hipocampo: 'HipocampoStation',
  parietal: 'ParietalStation',
  broca: 'BrocaStation',
  prefrontal: 'PrefrontalStation',
};

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create() {
    const L = CONFIG.layout;

    // Fondo + panel HUD (la HudScene dibuja arriba; acá pintamos sólo el área).
    this.cameras.main.setBackgroundColor(CONFIG.ui.fondoHex);

    // Brain area (light tinted background)
    this.add.rectangle(L.brainAreaX, L.brainAreaY, L.brainAreaW, L.brainAreaH, 0xf2efe6, 1)
      .setOrigin(0, 0);

    // Silueta del cerebro
    this._drawBrainSilhouette();

    // Regiones
    this.regionGraphics = {};
    this.regionLabels = {};
    for (const [id, r] of Object.entries(CONFIG.regiones)) {
      this._drawRegion(id, r);
    }

    // Avatar
    this._spawnAvatar();

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Sonido
    this.sm = getSoundManager(this);

    // Lanzar HUD si no está corriendo
    if (!this.scene.isActive('HudScene')) {
      this.scene.launch('HudScene');
    }
    this.scene.bringToTop('HudScene');

    // Si volvimos desde una estación resuelta, redibujar regiones (iluminación).
    // off() primero para no acumular handlers entre partidas (scene.start re-llama create).
    this.events.off('wake');
    this.events.on('wake', () => {
      this._refreshRegions();
      this.scene.bringToTop('HudScene');
      this._lastRegionInside = null;
    });

    // Estado de entrada a región (para no disparar repetidamente)
    this._lastRegionInside = null;
  }

  // --------------------------------------------------------------------------
  // Dibujo
  // --------------------------------------------------------------------------
  _drawBrainSilhouette() {
    const L = CONFIG.layout;
    const cx = L.brainAreaW / 2;
    const cy = L.brainAreaH / 2 + 10;

    // Generamos un polígono organico aproximando un óvalo vertical con jitter
    const points = [];
    const rx = 270, ry = 320;
    const steps = 60;
    // semilla pseudo-aleatoria fija para que se vea igual en cada carga
    const rand = mulberry32(12345);
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const jitter = 1 + (rand() - 0.5) * 0.06;
      const x = cx + Math.cos(t) * rx * jitter;
      const y = cy + Math.sin(t) * ry * jitter;
      points.push({ x, y });
    }

    const g = this.add.graphics();

    // Sombra suave
    g.fillStyle(0x000000, 0.06);
    g.fillEllipse(cx + 6, cy + 10, rx * 2, ry * 2);

    // Cuerpo del cerebro
    g.fillStyle(0xf6e8e5, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.closePath();
    g.fillPath();

    // Contorno suave
    g.lineStyle(2, 0xc9a8a3, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.closePath();
    g.strokePath();

    // Fisura longitudinal (línea vertical central, sugiere los dos hemisferios)
    g.lineStyle(2, 0xc9a8a3, 0.7);
    g.beginPath();
    g.moveTo(cx, cy - ry + 20);
    // pequeño zigzag suave
    for (let y = cy - ry + 30; y < cy + ry - 30; y += 18) {
      const dx = (y % 36 === 0) ? -3 : 3;
      g.lineTo(cx + dx, y);
    }
    g.lineTo(cx, cy + ry - 20);
    g.strokePath();
  }

  _drawRegion(id, r) {
    const g = this.add.graphics();
    this.regionGraphics[id] = g;

    const lbl = this.add.text(r.x, r.y + r.radio + 10, r.nombre, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: CONFIG.ui.textoSecundarioHex,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.regionLabels[id] = lbl;

    this._paintRegion(id, r);
  }

  _paintRegion(id, r) {
    const g = this.regionGraphics[id];
    g.clear();
    const isResolved = GameState.esRegionResuelta(id);
    const isActive = GameState.regionActiva() === id;

    // halo si es la región activa (y aún no resuelta)
    if (isActive && !isResolved) {
      g.fillStyle(r.color, 0.18);
      g.fillCircle(r.x, r.y, r.radio + 18);
    }

    if (isResolved) {
      // Encendida: relleno pleno + halo + brillo central
      g.fillStyle(r.color, 0.85);
      g.fillCircle(r.x, r.y, r.radio);
      g.lineStyle(3, r.color, 1);
      g.strokeCircle(r.x, r.y, r.radio);
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(r.x - r.radio * 0.3, r.y - r.radio * 0.3, r.radio * 0.25);
    } else {
      // Apagada: relleno tenue + contorno
      g.fillStyle(r.color, 0.18);
      g.fillCircle(r.x, r.y, r.radio);
      g.lineStyle(2, r.color, 0.55);
      g.strokeCircle(r.x, r.y, r.radio);
    }

    const lbl = this.regionLabels[id];
    if (lbl) {
      lbl.setColor(isResolved ? r.colorHex : CONFIG.ui.textoSecundarioHex);
      lbl.setAlpha(isResolved ? 1 : 0.65);
    }
  }

  _refreshRegions() {
    for (const [id, r] of Object.entries(CONFIG.regiones)) {
      this._paintRegion(id, r);
    }
  }

  _spawnAvatar() {
    // Spawn en una zona libre del cerebro (lejos de las regiones).
    const spawnX = 555;
    const spawnY = 380;

    this.avatar = this.add.container(spawnX, spawnY);
    const body = this.add.circle(0, 0, 13, 0xfff7c2, 1).setStrokeStyle(2, 0x1f3864);
    const dot = this.add.circle(0, 0, 4, 0x1f3864, 1);
    this.avatar.add([body, dot]);
    this.avatarSpeed = 240; // px / s
  }

  // --------------------------------------------------------------------------
  // Update
  // --------------------------------------------------------------------------
  update(time, delta) {
    if (GameState.juegoBloqueadoPorTiempo) return;

    const dt = delta / 1000;
    const L = CONFIG.layout;

    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      this.avatar.x += dx * this.avatarSpeed * dt;
      this.avatar.y += dy * this.avatarSpeed * dt;
    }

    // Constreñir al brain area con un pequeño margen
    const margin = 14;
    this.avatar.x = Phaser.Math.Clamp(this.avatar.x, L.brainAreaX + margin, L.brainAreaX + L.brainAreaW - margin);
    this.avatar.y = Phaser.Math.Clamp(this.avatar.y, L.brainAreaY + margin, L.brainAreaY + L.brainAreaH - margin);

    // Detectar entrada a regiones
    this._checkRegionEntry();

    // Audio: hay "progreso" si el jugador se está moviendo
    if (this.sm) this.sm.tick(delta, dx !== 0 || dy !== 0);
  }

  _checkRegionEntry() {
    if (GameState.juegoCompleto()) {
      // Cerebro completo → ir a EndScene
      this._irAEndScene();
      return;
    }

    const regionActiva = GameState.regionActiva();
    let inside = null;

    for (const [id, r] of Object.entries(CONFIG.regiones)) {
      const dx = this.avatar.x - r.x;
      const dy = this.avatar.y - r.y;
      if (dx * dx + dy * dy <= r.radio * r.radio) {
        inside = id;
        break;
      }
    }

    // Sólo dispara al entrar (no mientras está adentro)
    if (inside !== this._lastRegionInside) {
      this._lastRegionInside = inside;
      if (inside && inside === regionActiva && !GameState.esRegionResuelta(inside)) {
        this._entrarEstacion(inside);
      }
      // Si entra a una región equivocada: no pasa nada (Sección 7).
    }
  }

  _entrarEstacion(regionId) {
    const sceneKey = STATION_SCENE[regionId];
    if (!sceneKey) return;
    // Sleep MapScene (mantiene el avatar/estado) y lanza la estación.
    this.scene.sleep('MapScene');
    this.scene.run(sceneKey);
    this.scene.bringToTop('HudScene');
  }

  _irAEndScene() {
    this.scene.stop('HudScene');
    this.scene.start('EndScene');
  }
}

// PRNG simple para que el contorno del cerebro sea estable entre cargas
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
