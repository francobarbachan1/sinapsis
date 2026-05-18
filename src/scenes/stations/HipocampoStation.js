// ============================================================================
// Estación 3 — Hipocampo (Memoria)
// Patrones rítmicos: el jugador escucha y reproduce con la barra espaciadora.
// 3 rondas (4, 5, 6 golpes). Si falla una ronda, se repite esa ronda (no se
// reinicia toda la estación).
//
// IMPORTANTE (Sección 16 del spec): no presentar estos sonidos como "ondas
// alfa" ni "frecuencias del aprendizaje". Son patrones rítmicos, nada más.
// ============================================================================

import { CONFIG } from '../../config.js';
import { StationBase } from './StationBase.js';

// Patrones por ronda — vienen de config.dificultad.hipocampo.patrones.
// Los WAV rhythm-1/2/3 se regeneran para calzar con estos timings
// (ver tools/generate-audio.ps1).
const AUDIO_KEYS = ['rhythm1', 'rhythm2', 'rhythm3'];

export class HipocampoStation extends StationBase {
  constructor() {
    super('HipocampoStation', 'hipocampo');
  }

  consignaTexto() {
    return 'Vas a escuchar un patrón rítmico. Cuando termine, reproducilo presionando la barra espaciadora (o haciendo clic en el círculo) en el mismo ritmo. Si fallás una ronda, se repite. Son 3 rondas.';
  }

  construirContenido() {
    const L = CONFIG.layout;
    this.patrones = CONFIG.dificultad.hipocampo.patrones;
    this.rondas = this.patrones.map((p) => p.length); // [5, 7, 9] por ejemplo
    this.rondaActual = 0;

    this.add.text(L.brainAreaW / 2, 80, 'Escuchá y reproducí el patrón', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#5F5E5A',
    }).setOrigin(0.5);

    // Indicador de ronda
    this.indicadorRonda = this.add.text(L.brainAreaW / 2, 130, '', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: this.region.colorHex,
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Visualizador de beats
    this.zonaBeats = this.add.container(L.brainAreaW / 2, 220);

    // Estado: "esperando" / "escuchando" / "reproduciendo" / "evaluando"
    this.estado = 'inicio';
    this.estadoTxt = this.add.text(L.brainAreaW / 2, 320, '', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#1F3864',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Botón principal grande (también clickable como input rítmico)
    this.botonGrande = this.add.circle(L.brainAreaW / 2, 470, 90, this.region.color, 0.25)
      .setStrokeStyle(4, this.region.color, 1);
    this.botonAro = this.add.circle(L.brainAreaW / 2, 470, 90, this.region.color, 0)
      .setStrokeStyle(2, this.region.color, 0.4);

    this.botonGrande.setInteractive({ useHandCursor: true });
    this.botonGrande.on('pointerdown', () => this._onTap());

    this.add.text(L.brainAreaW / 2, 470, '●', {
      fontFamily: 'sans-serif',
      fontSize: '64px',
      color: this.region.colorHex,
    }).setOrigin(0.5);

    this.add.text(L.brainAreaW / 2, 580, 'Barra espaciadora o clic', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#5F5E5A',
    }).setOrigin(0.5);

    // Botón "escuchar de nuevo"
    const btnY = 630;
    const btn = this.add.rectangle(L.brainAreaW / 2, btnY, 200, 32, 0xffffff, 1)
      .setStrokeStyle(2, this.region.color, 1).setInteractive({ useHandCursor: true });
    this.add.text(L.brainAreaW / 2, btnY, 'Escuchar de nuevo', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: this.region.colorHex,
    }).setOrigin(0.5);
    btn.on('pointerdown', () => {
      if (this.estado === 'escuchando' || this.estado === 'evaluando') return;
      this._reproducirRondaActual();
    });

    // Tecla espacio
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => this._onTap());

    // Arrancar primera ronda
    this.time.delayedCall(800, () => this._iniciarRonda(0));
  }

  // --------------------------------------------------------------------------
  // Flujo de rondas
  // --------------------------------------------------------------------------
  _iniciarRonda(idx) {
    this.rondaActual = idx;
    const golpes = this.rondas[idx];
    this.indicadorRonda.setText(`RONDA ${idx + 1} DE ${this.rondas.length}  ·  ${golpes} GOLPES`);
    this._dibujarBeats(golpes);
    this._reproducirRondaActual();
  }

  _reproducirRondaActual() {
    const patron = this.patrones[this.rondaActual];
    this.estado = 'escuchando';
    this.estadoTxt.setText('Escuchá…');
    this._iluminarBeats(false);

    // Reproducir audio (si está disponible)
    if (this.sm) this.sm.playOneShot(AUDIO_KEYS[this.rondaActual], CONFIG.audio.volumenRitmo);

    // Visualizador sincronizado con el patrón
    patron.forEach((t, i) => {
      this.time.delayedCall(t, () => this._flashBeatVisual(i));
    });

    // Cuando termina la escucha, abrir ventana de reproducción
    const fin = patron[patron.length - 1] + 600;
    this.time.delayedCall(fin, () => {
      this.estado = 'reproduciendo';
      this.estadoTxt.setText('Reproducí el ritmo');
      this.tapsRegistrados = [];
      this.t0Tap = null;
      this._iluminarBeats(false);
      this._latePulse();
    });
  }

  _latePulse() {
    // Hace pulsar el botón grande para invitar a tocar
    this.tweens.killTweensOf(this.botonAro);
    this.botonAro.setScale(1).setAlpha(0.6);
    this.tweens.add({
      targets: this.botonAro,
      scale: 1.25,
      alpha: 0,
      duration: 900,
      repeat: -1,
      ease: 'Cubic.easeOut',
    });
  }

  _stopLatePulse() {
    this.tweens.killTweensOf(this.botonAro);
    this.botonAro.setScale(1).setAlpha(0);
  }

  _onTap() {
    if (this.estado !== 'reproduciendo') return;
    this.marcarProgreso();

    const patron = this.patrones[this.rondaActual];

    const now = this.time.now;
    if (this.t0Tap === null) this.t0Tap = now;
    const tRel = now - this.t0Tap;
    this.tapsRegistrados.push(tRel);
    const idx = this.tapsRegistrados.length - 1;

    // Feedback visual del tap
    this._flashBeatVisual(idx);
    this.tweens.add({
      targets: this.botonGrande,
      scale: { from: 1.1, to: 1 },
      duration: 180,
      ease: 'Cubic.easeOut',
    });

    if (this.tapsRegistrados.length >= patron.length) {
      this._stopLatePulse();
      this._evaluar();
    }
  }

  _evaluar() {
    this.estado = 'evaluando';
    const patron = this.patrones[this.rondaActual];
    const tol = CONFIG.toleranciaTimingMs;

    let ok = true;
    for (let i = 1; i < patron.length; i++) { // el primer tap define t0
      const esperadoIntervalo = patron[i] - patron[0];
      const realIntervalo = this.tapsRegistrados[i] - this.tapsRegistrados[0];
      if (Math.abs(esperadoIntervalo - realIntervalo) > tol) {
        ok = false;
        break;
      }
    }

    if (ok) {
      this.estadoTxt.setText('¡Bien!');
      this.estadoTxt.setColor(this.region.colorHex);
      this.time.delayedCall(900, () => {
        if (this.rondaActual + 1 >= this.rondas.length) {
          this.resolverEstacion();
        } else {
          this._iniciarRonda(this.rondaActual + 1);
        }
      });
    } else {
      this.estadoTxt.setText('No coincidió. Probemos de nuevo esta ronda.');
      this.estadoTxt.setColor('#5F5E5A');
      this.time.delayedCall(1200, () => {
        this.estadoTxt.setText('');
        this._reproducirRondaActual();
      });
    }
  }

  // --------------------------------------------------------------------------
  // Visualizador de beats
  // --------------------------------------------------------------------------
  _dibujarBeats(n) {
    this.zonaBeats.removeAll(true);
    const sz = 26, gap = 14;
    const totalW = n * sz + (n - 1) * gap;
    const startX = -totalW / 2;
    this._beatCircles = [];
    for (let i = 0; i < n; i++) {
      const x = startX + i * (sz + gap) + sz / 2;
      const c = this.add.circle(x, 0, sz / 2, this.region.color, 0.2).setStrokeStyle(2, this.region.color, 1);
      this.zonaBeats.add(c);
      this._beatCircles.push(c);
    }
  }

  _flashBeatVisual(idx) {
    const c = this._beatCircles[idx];
    if (!c) return;
    c.setFillStyle(this.region.color, 1);
    this.time.delayedCall(220, () => c.setFillStyle(this.region.color, 0.2));
  }

  _iluminarBeats(on) {
    for (const c of (this._beatCircles || [])) {
      c.setFillStyle(this.region.color, on ? 1 : 0.2);
    }
  }
}
