// ============================================================================
// StationBase — esqueleto común de las 6 estaciones
// Provee: chrome (header + botones), flujo de consigna + cuenta regresiva
// 3-2-1, hook iniciarJuego() para el arranque de cada mecánica, y la
// resolución (sting + iluminación + vuelta al mapa).
//
// IMPORTANTE (pedido del usuario): el juego NO arranca mientras está la
// consigna en pantalla. Recién después del "Entendido" y un 3-2-1 cuenta
// regresiva se llama iniciarJuego(), que cada estación implementa para
// disparar su mecánica (audio incluido).
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
  construirContenido() {}      // dibuja la mecánica (sin disparar audio/timers)
  iniciarJuego() {}             // arranca audio/timers/secuencias diferidos
  limpiarContenido() {}         // (opcional) limpiar timers/listeners

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
    this._juegoInicio = false; // queda true tras el 3-2-1

    this.sm = getSoundManager(this);
    this.sm.resetTensionTimer();
    this._inicioMs = this.time.now;
    this._huboProgreso = false;

    this.cameras.main.fadeIn(280, 251, 250, 247);

    // Fondo
    this.add.rectangle(0, 0, L.brainAreaW, L.brainAreaH, r.fondoSuave, 1).setOrigin(0, 0);

    // Header con gradiente
    const headerG = this.add.graphics();
    headerG.fillGradientStyle(r.color, r.color, r.color, r.fondoSuave, 1);
    headerG.fillRect(0, 0, L.brainAreaW, 56);
    headerG.fillStyle(0xfbfaf7, 0.35);
    headerG.fillRect(0, 54, L.brainAreaW, 2);

    // Marca / ícono
    const iconCx = 38, iconCy = 28;
    const icon = this.add.circle(iconCx, iconCy, 14, 0xfbfaf7, 1).setStrokeStyle(2, 0x1f3864, 0.5);
    this.tweens.add({
      targets: icon, scale: { from: 1, to: 1.12 },
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.add.circle(iconCx, iconCy, 6, r.color, 1);

    // Título
    this.add.text(64, 14, r.nombre, {
      fontFamily: 'sans-serif', fontSize: '26px', fontStyle: 'bold', color: '#FFFFFF',
    });
    const idx = ['amigdala', 'occipital', 'hipocampo', 'parietal', 'broca', 'prefrontal'].indexOf(this.regionId);
    if (idx >= 0) {
      this.add.text(64, 42, `ESTACIÓN ${idx + 1} DE 6`, {
        fontFamily: 'sans-serif', fontSize: '10px',
        color: '#FFFFFF', letterSpacing: 3,
      }).setAlpha(0.8);
    }

    this.contentArea = { x: 0, y: 60, w: L.brainAreaW, h: L.brainAreaH - 60 };

    // Botones del header
    this._botonConsigna(L.brainAreaW - 24, 18);
    this._botonVolver(L.brainAreaW - 24, 42);

    // Construir el contenido (UI sólo, NO arrancar timers ni audio)
    this.construirContenido();

    // Mostrar la consigna en modo "primera vez": al cerrarla, dispara 3-2-1.
    this._mostrarConsigna(true);
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
  // Cuenta regresiva 3 → 2 → 1 → ¡YA!
  // --------------------------------------------------------------------------
  _iniciarCountdown() {
    if (this._juegoInicio) return;
    const L = CONFIG.layout;
    const cx = L.brainAreaW / 2;
    const cy = L.brainAreaH / 2;

    // Velo semitransparente sobre el área de trabajo (no encima del header)
    const veil = this.add.rectangle(0, 60, L.brainAreaW, L.brainAreaH - 60, 0xfbfaf7, 0.55)
      .setOrigin(0, 0).setDepth(50).setInteractive();
    veil.on('pointerdown', () => {});

    const labelHeader = this.add.text(cx, cy - 100, 'PREPARATE', {
      fontFamily: 'sans-serif', fontSize: '14px', fontStyle: 'bold',
      color: this.region.colorHex, letterSpacing: 4,
    }).setOrigin(0.5).setDepth(51).setAlpha(0);
    this.tweens.add({ targets: labelHeader, alpha: 1, duration: 250 });

    const showNumber = (text, color, delay) => {
      this.time.delayedCall(delay, () => {
        const t = this.add.text(cx, cy + 10, text, {
          fontFamily: 'sans-serif', fontSize: '180px', fontStyle: 'bold',
          color,
        }).setOrigin(0.5).setDepth(51).setAlpha(0).setScale(0.6);
        this.tweens.add({
          targets: t, alpha: { from: 0, to: 1 }, scale: { from: 0.6, to: 1.1 },
          duration: 220, ease: 'Back.easeOut',
        });
        this.tweens.add({
          targets: t, alpha: 0, scale: 1.4,
          delay: 600, duration: 280, ease: 'Cubic.easeIn',
          onComplete: () => t.destroy(),
        });
        // sting de tic
        if (this.sm) this.sm.playOneShot('note' + (text === '3' ? '5' : text === '2' ? '4' : '3'), 0.4);
      });
    };
    showNumber('3', this.region.colorHex, 100);
    showNumber('2', this.region.colorHex, 1000);
    showNumber('1', this.region.colorHex, 1900);

    // ¡Empieza!
    this.time.delayedCall(2800, () => {
      const empieza = this.add.text(cx, cy + 10, '¡Empieza!', {
        fontFamily: 'sans-serif', fontSize: '64px', fontStyle: 'bold',
        color: this.region.colorHex,
      }).setOrigin(0.5).setDepth(51).setAlpha(0).setScale(0.6);
      this.tweens.add({
        targets: empieza, alpha: 1, scale: 1.1,
        duration: 280, ease: 'Back.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: empieza, alpha: 0, duration: 400, delay: 350,
            onComplete: () => empieza.destroy(),
          });
          this.tweens.add({
            targets: [veil, labelHeader], alpha: 0, duration: 400, delay: 350,
            onComplete: () => {
              veil.destroy(); labelHeader.destroy();
            },
          });
        },
      });
      if (this.sm) this.sm.playSting();
    });

    // Llamar iniciarJuego() después de la cuenta + "¡Empieza!" + pequeño respiro
    this.time.delayedCall(3500, () => {
      this._juegoInicio = true;
      try { this.iniciarJuego(); } catch (e) { console.warn('[Sinapsis] iniciarJuego falló:', e); }
    });
  }

  // --------------------------------------------------------------------------
  // Resolución
  // --------------------------------------------------------------------------
  resolverEstacion() {
    if (this._resuelto) return;
    this._resuelto = true;

    if (this.sm) {
      this.sm.playSting();
      this.sm.playResolution();
    }

    // Bajar el estrés: parte porcentual + parte fija. Resolver una estación
    // alivia notablemente la carga.
    const E = CONFIG.estres;
    const reduccion = GameState.estres * (E.reduccionPorEstacionPct / 100) + E.reduccionPorEstacionFija;
    GameState.estres = Math.max(0, GameState.estres - reduccion);
    this.game.events.emit('sinapsis:estresCambio', GameState.estres);

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

    this.tweens.add({ targets: flash, radius: 240, alpha: 0, duration: 900, ease: 'Cubic.easeOut' });
    this.tweens.add({
      targets: ring, radius: 320, alpha: 0, duration: 1300, ease: 'Cubic.easeOut',
      onComplete: () => { flash.destroy(); ring.destroy(); if (onDone) onDone(); },
    });

    const txt = this.add.text(cx, cy, '✓', {
      fontFamily: 'sans-serif', fontSize: '80px', fontStyle: 'bold',
      color: this.region.colorHex,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: txt, alpha: 1, scale: { from: 0.5, to: 1.2 },
      duration: 400, ease: 'Back.easeOut', yoyo: true,
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
    this.add.text(xL + w / 2, y, 'Leer consigna', {
      fontFamily: 'sans-serif', fontSize: '12px',
      color: this.region.colorHex, fontStyle: 'bold',
    }).setOrigin(0.5);
    const hit = this.add.zone(xL, y - h / 2, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => bg.setFillStyle(0xfbfaf7, 1));
    hit.on('pointerout', () => bg.setFillStyle(0xffffff, 0.95));
    // Al re-abrir la consigna, NO disparamos otra cuenta regresiva.
    hit.on('pointerdown', () => this._mostrarConsigna(false));
  }

  _botonVolver(x, y) {
    const w = 140, h = 22;
    const xL = x - w;
    const bg = this.add.rectangle(xL, y - h / 2, w, h, 0xffffff, 0.3).setOrigin(0, 0)
      .setStrokeStyle(1, 0xfbfaf7, 0.5);
    this.add.text(xL + w / 2, y, '← Volver al mapa', {
      fontFamily: 'sans-serif', fontSize: '10px', color: '#FFFFFF',
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
  }

  _mostrarConsigna(conCountdown = false) {
    if (this._consignaCard) {
      this._consignaCard.destroy();
      this._consignaCard = null;
    }
    const L = CONFIG.layout;
    const cardW = 560;
    const cardH = 230;
    const cx = L.brainAreaW / 2;
    const cy = L.brainAreaH / 2;

    const cont = this.add.container(0, 0).setDepth(100);
    const veil = this.add.rectangle(0, 0, L.brainAreaW, L.brainAreaH, 0x000000, 0.55)
      .setOrigin(0, 0).setInteractive();
    cont.add(veil);

    const g = this.add.graphics();
    g.fillStyle(0xfbfaf7, 1);
    g.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 14);
    g.lineStyle(3, this.region.color, 1);
    g.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 14);
    cont.add(g);

    const head = this.add.text(cx, cy - cardH / 2 + 22, 'Consigna', {
      fontFamily: 'sans-serif', fontSize: '13px', fontStyle: 'bold',
      color: this.region.colorHex, letterSpacing: 3,
    }).setOrigin(0.5);
    cont.add(head);

    const body = this.add.text(cx, cy - 6, this.consignaTexto(), {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#1F3864',
      wordWrap: { width: cardW - 50 }, align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);
    cont.add(body);

    const btnY = cy + cardH / 2 - 32;
    const btn = this.add.rectangle(cx, btnY, 200, 40, this.region.color, 1)
      .setStrokeStyle(2, 0x1f3864, 0.5);
    const btnTxt = this.add.text(cx, btnY, conCountdown ? 'Entendido — Empezar' : 'Cerrar', {
      fontFamily: 'sans-serif', fontSize: '15px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    cont.add([btn, btnTxt]);

    // Animación de entrada
    cont.setAlpha(0);
    this.tweens.add({ targets: cont, alpha: 1, duration: 240, ease: 'Cubic.easeOut' });

    const close = () => {
      this.tweens.add({
        targets: cont, alpha: 0, duration: 200,
        onComplete: () => {
          cont.destroy();
          this._consignaCard = null;
          if (conCountdown && !this._juegoInicio) {
            this._iniciarCountdown();
          }
        },
      });
    };
    btn.on('pointerdown', close);
    // El veil ya no cierra el modal — el usuario tiene que pulsar el botón
    // explícitamente. Evita cierres accidentales antes de leer.

    this._consignaCard = cont;
  }
}
