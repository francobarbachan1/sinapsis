// ============================================================================
// StationBase — esqueleto común de las 6 estaciones
// Provee: chrome (header con nombre y color de región), botón "leer consigna",
// flujo de resolución (sting + iluminación + vuelta al mapa) y constante de
// "área de trabajo" (la franja izquierda del canvas, igual que el brain area).
// ============================================================================

import { CONFIG } from '../../config.js';
import { GameState } from '../../state.js';
import { getSoundManager } from '../../soundManager.js';

export class StationBase extends Phaser.Scene {
  constructor(key, regionId) {
    super(key);
    this.regionId = regionId;
  }

  // --------------------------------------------------------------------------
  // Hooks que las estaciones concretas implementan
  // --------------------------------------------------------------------------
  consignaTexto() { return ''; }
  construirContenido() {}      // dibuja la mecánica
  limpiarContenido() {}        // limpiar timers/listeners si hace falta

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------
  create() {
    const L = CONFIG.layout;
    const r = CONFIG.regiones[this.regionId];
    this.region = r;

    // Reset de estado de instancia (la instancia se reutiliza entre entradas).
    this._resuelto = false;
    this._consignaCard = null;

    this.sm = getSoundManager(this);
    this.sm.resetTensionTimer();
    this._inicioMs = this.time.now;
    this._huboProgreso = false;

    // Fade-in al entrar
    this.cameras.main.fadeIn(280, 251, 250, 247);

    // Fondo del área de trabajo con color suave de la región
    this.add.rectangle(0, 0, L.brainAreaW, L.brainAreaH, r.fondoSuave, 1).setOrigin(0, 0);

    // Header con gradiente del color de la región (más rico que la banda plana)
    const headerG = this.add.graphics();
    headerG.fillGradientStyle(r.color, r.color, r.color, r.fondoSuave, 1);
    headerG.fillRect(0, 0, L.brainAreaW, 56);
    // línea de acento
    headerG.fillStyle(0xfbfaf7, 0.35);
    headerG.fillRect(0, 54, L.brainAreaW, 2);

    // Marca / ícono de la región (círculo a la izquierda del título)
    const iconCx = 38, iconCy = 28;
    const icon = this.add.circle(iconCx, iconCy, 14, 0xfbfaf7, 1).setStrokeStyle(2, 0x1f3864, 0.5);
    this.tweens.add({
      targets: icon, scale: { from: 1, to: 1.12 },
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const innerDot = this.add.circle(iconCx, iconCy, 6, r.color, 1);

    // Título de la estación
    this.add.text(64, 14, r.nombre, {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    });
    // Etiqueta tipo "ESTACIÓN N"
    const idx = ['amigdala', 'occipital', 'hipocampo', 'parietal', 'broca', 'prefrontal'].indexOf(this.regionId);
    if (idx >= 0) {
      this.add.text(64, 42, `ESTACIÓN ${idx + 1} DE 6`, {
        fontFamily: 'sans-serif', fontSize: '10px',
        color: '#FFFFFF', letterSpacing: 3,
      }).setAlpha(0.8);
    }

    // Área de contenido visible
    this.contentArea = {
      x: 0,
      y: 60,
      w: L.brainAreaW,
      h: L.brainAreaH - 60,
    };

    // Botones dentro del header (a la derecha)
    this._botonConsigna(L.brainAreaW - 24, 18);
    this._botonVolver(L.brainAreaW - 24, 42);

    // Contenido específico
    this.construirContenido();

    // Mostrar consigna automáticamente al entrar
    this._mostrarConsigna();
  }

  update(_time, delta) {
    if (GameState.juegoBloqueadoPorTiempo) return;
    if (this.sm) this.sm.tick(delta, this._huboProgreso);
    this._huboProgreso = false;
  }

  marcarProgreso() {
    this._huboProgreso = true;
  }

  // --------------------------------------------------------------------------
  // Resolución
  // --------------------------------------------------------------------------
  resolverEstacion() {
    if (this._resuelto) return;
    this._resuelto = true;

    // Sting + capa de resolución
    if (this.sm) {
      this.sm.playSting();
      this.sm.playResolution();
    }

    // Animación de la región iluminándose dentro de la estación, luego fade.
    this._animacionResolucion(() => {
      GameState.marcarResuelta(this.regionId);
      this.cameras.main.fadeOut(280, 251, 250, 247);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop();
        this.scene.wake('MapScene');
        this.game.events.emit('sinapsis:refrescarHud');
        this.game.events.emit('sinapsis:regionResuelta', this.regionId);
      });
    });
  }

  _animacionResolucion(onDone) {
    const L = CONFIG.layout;
    const cx = L.brainAreaW / 2;
    const cy = L.brainAreaH / 2;

    const flash = this.add.circle(cx, cy, 20, this.region.color, 1);
    const ring = this.add.circle(cx, cy, 20, this.region.color, 0).setStrokeStyle(4, this.region.color, 1);

    this.tweens.add({
      targets: flash,
      radius: 240,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: ring,
      radius: 320,
      alpha: 0,
      duration: 1300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        flash.destroy();
        ring.destroy();
        if (onDone) onDone();
      },
    });

    const txt = this.add.text(cx, cy, '✓', {
      fontFamily: 'sans-serif',
      fontSize: '80px',
      fontStyle: 'bold',
      color: this.region.colorHex,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: txt,
      alpha: 1,
      scale: { from: 0.5, to: 1.2 },
      duration: 400,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: () => txt.destroy(),
    });
  }

  // --------------------------------------------------------------------------
  // Botones
  // --------------------------------------------------------------------------
  _botonConsigna(x, y) {
    const w = 140, h = 26;
    const xL = x - w;
    const bg = this.add.rectangle(xL, y - h / 2, w, h, 0xffffff, 0.95).setOrigin(0, 0)
      .setStrokeStyle(1, 0xfbfaf7, 0.6);
    const txt = this.add.text(xL + w / 2, y, 'Leer consigna', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: this.region.colorHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const hit = this.add.zone(xL, y - h / 2, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => bg.setFillStyle(0xfbfaf7, 1));
    hit.on('pointerout', () => bg.setFillStyle(0xffffff, 0.95));
    hit.on('pointerdown', () => this._mostrarConsigna());
    return { bg, txt, hit };
  }

  _botonVolver(x, y) {
    const w = 140, h = 22;
    const xL = x - w;
    const bg = this.add.rectangle(xL, y - h / 2, w, h, 0xffffff, 0.3).setOrigin(0, 0)
      .setStrokeStyle(1, 0xfbfaf7, 0.5);
    const txt = this.add.text(xL + w / 2, y, '← Volver al mapa', {
      fontFamily: 'sans-serif',
      fontSize: '10px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    const hit = this.add.zone(xL, y - h / 2, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => bg.setFillStyle(0xffffff, 0.5));
    hit.on('pointerout', () => bg.setFillStyle(0xffffff, 0.3));
    hit.on('pointerdown', () => {
      if (this._resuelto) return;
      this.cameras.main.fadeOut(220, 251, 250, 247);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop();
        this.scene.wake('MapScene');
        this.game.events.emit('sinapsis:refrescarHud');
      });
    });
    return { bg, txt, hit };
  }

  _mostrarConsigna() {
    if (this._consignaCard) {
      this._consignaCard.destroy();
      this._consignaCard = null;
    }
    const L = CONFIG.layout;
    const cardW = 540;
    const cardH = 200;
    const cx = L.brainAreaW / 2;
    const cy = L.brainAreaH / 2;

    const cont = this.add.container(0, 0);
    const veil = this.add.rectangle(0, 0, L.brainAreaW, L.brainAreaH, 0x000000, 0.35)
      .setOrigin(0, 0).setInteractive();
    cont.add(veil);

    const g = this.add.graphics();
    g.fillStyle(0xfbfaf7, 1);
    g.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
    g.lineStyle(3, this.region.color, 1);
    g.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
    cont.add(g);

    const head = this.add.text(cx, cy - cardH / 2 + 22, 'Consigna', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: this.region.colorHex,
      letterSpacing: 2,
    }).setOrigin(0.5);
    cont.add(head);

    const body = this.add.text(cx, cy + 4, this.consignaTexto(), {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#1F3864',
      wordWrap: { width: cardW - 40 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    cont.add(body);

    const btnY = cy + cardH / 2 - 28;
    const btn = this.add.rectangle(cx, btnY, 130, 32, this.region.color, 1);
    const btnTxt = this.add.text(cx, btnY, 'Entendido', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    cont.add([btn, btnTxt]);
    const close = () => { cont.destroy(); this._consignaCard = null; };
    btn.on('pointerdown', close);
    veil.on('pointerdown', close);

    this._consignaCard = cont;
  }
}
