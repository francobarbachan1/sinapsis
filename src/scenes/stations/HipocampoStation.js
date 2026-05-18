// ============================================================================
// Estación 3 — Hipocampo (Memoria)
// Mecánica: Simon Says con notas musicales (Do Re Mi Fa Sol La Si = 1..7).
// El juego reproduce una secuencia de N notas; cada nota suena y la primera
// reproducción la acompaña una luz en el botón. El jugador replica la
// secuencia clickeando los botones o pulsando las teclas 1-7.
//
// 3 rondas: 3 → 5 → 7 notas. Si falla, se repite esa ronda (sin penalización).
//
// IMPORTANTE (Sección 16 del spec): NO presentar las notas como "ondas alfa"
// ni "frecuencias del aprendizaje". Son notas musicales que se memorizan.
// ============================================================================

import { CONFIG } from '../../config.js';
import { GameState } from '../../state.js';
import { StationBase } from './StationBase.js';

const NOTAS = [
  { num: 1, key: 'note1', nombre: 'Do', color: 0xe06b6b },
  { num: 2, key: 'note2', nombre: 'Re', color: 0xf2a93b },
  { num: 3, key: 'note3', nombre: 'Mi', color: 0xffd54f },
  { num: 4, key: 'note4', nombre: 'Fa', color: 0x4caf50 },
  { num: 5, key: 'note5', nombre: 'Sol', color: 0x26a69a },
  { num: 6, key: 'note6', nombre: 'La', color: 0x42a5f5 },
  { num: 7, key: 'note7', nombre: 'Si', color: 0x7e57c2 },
];

export class HipocampoStation extends StationBase {
  constructor() {
    super('HipocampoStation', 'hipocampo');
  }

  consignaTexto() {
    return 'Vas a escuchar una secuencia de notas (Do, Re, Mi, Fa, Sol, La, Si = 1 a 7). Replicala clickeando los botones en el mismo orden, o usando las teclas 1-7 del teclado. La primera vez que suena, la nota se ilumina. Si pedís escucharla de nuevo, va sin luz. Son 3 rondas.';
  }

  construirContenido() {
    const L = CONFIG.layout;
    this.cfg = CONFIG.dificultad.hipocampo;
    this.rondaIdx = 0;
    this.secuencia = [];          // secuencia objetivo de la ronda actual
    this.entrada = [];            // notas que el jugador ya ingresó esta ronda
    this.fase = 'inicio';         // inicio | escuchando | turno | evaluando | completo
    this._reproduccionDeRonda = 0; // 0 = primera (con luz), >0 = repeticiones (audio only)

    this.add.text(L.brainAreaW / 2, 76, 'Escuchá la secuencia y replicala', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#5F5E5A',
    }).setOrigin(0.5);

    this.indicadorRonda = this.add.text(L.brainAreaW / 2, 110, '', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: this.region.colorHex,
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.estadoTxt = this.add.text(L.brainAreaW / 2, 150, '', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#1F3864',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Visualizador de avance: una fila de puntitos por cada nota de la ronda
    this.barraAvance = this.add.container(L.brainAreaW / 2, 200);

    // 7 botones de notas (fila)
    this._dibujarBotonesNotas(L.brainAreaW / 2, 360);

    // Botón "escuchar de nuevo"
    const btnY = 560;
    const btn = this.add.rectangle(L.brainAreaW / 2, btnY, 220, 38, 0xffffff, 1)
      .setStrokeStyle(2, this.region.color, 1).setInteractive({ useHandCursor: true });
    this.add.text(L.brainAreaW / 2, btnY, 'Escuchar de nuevo', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: this.region.colorHex,
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(this.region.fondoSuave, 1));
    btn.on('pointerout', () => btn.setFillStyle(0xffffff, 1));
    btn.on('pointerdown', () => {
      if (this.fase === 'escuchando' || this.fase === 'evaluando') return;
      this._reproducirSecuencia(false /* sin luz */);
    });

    // Teclas 1-7
    this.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 7) this._onNotaClick(n);
    });
    // El arranque real (audio + secuencia) se difiere a iniciarJuego(),
    // que StationBase llama después del 3-2-1.
  }

  iniciarJuego() {
    this._iniciarRonda(0);
  }

  // --------------------------------------------------------------------------
  // Botones de notas
  // --------------------------------------------------------------------------
  _dibujarBotonesNotas(cx, cy) {
    const btnW = 78, btnH = 110, gap = 12;
    const totalW = NOTAS.length * btnW + (NOTAS.length - 1) * gap;
    const startX = cx - totalW / 2;
    this.botonesNotas = [];
    for (let i = 0; i < NOTAS.length; i++) {
      const n = NOTAS[i];
      const bx = startX + i * (btnW + gap) + btnW / 2;
      const by = cy;
      const bg = this.add.rectangle(bx, by, btnW, btnH, n.color, 0.85)
        .setStrokeStyle(3, 0x1f3864, 0.6);
      const num = this.add.text(bx, by - 20, String(n.num), {
        fontFamily: 'sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#FFFFFF',
      }).setOrigin(0.5);
      const nom = this.add.text(bx, by + 28, n.nombre, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this._onNotaClick(n.num));
      bg.on('pointerover', () => bg.setStrokeStyle(3, 0xfbfaf7, 1));
      bg.on('pointerout', () => bg.setStrokeStyle(3, 0x1f3864, 0.6));
      this.botonesNotas.push({ n, bg, num, nom });
    }
  }

  _iluminarBoton(num, dur = 380) {
    const b = this.botonesNotas[num - 1];
    if (!b) return;
    b.bg.setFillStyle(0xffffff, 1);
    b.num.setColor(NOTAS[num - 1].colorHex || '#1F3864');
    // brillo
    this.tweens.add({
      targets: b.bg, scale: { from: 1, to: 1.08 }, duration: dur / 2, yoyo: true,
    });
    this.time.delayedCall(dur, () => {
      if (b.bg && b.bg.scene) {
        b.bg.setFillStyle(NOTAS[num - 1].color, 0.85);
        b.num.setColor('#FFFFFF');
      }
    });
  }

  // --------------------------------------------------------------------------
  // Flujo de rondas
  // --------------------------------------------------------------------------
  _iniciarRonda(idx) {
    this.rondaIdx = idx;
    const N = this.cfg.longitudesRonda[idx];
    // Generar secuencia aleatoria
    this.secuencia = [];
    for (let i = 0; i < N; i++) this.secuencia.push(Phaser.Math.Between(1, 7));
    this.entrada = [];
    this._reproduccionDeRonda = 0;

    this.indicadorRonda.setText(`RONDA ${idx + 1} DE ${this.cfg.longitudesRonda.length}  ·  ${N} NOTAS`);
    this._dibujarBarraAvance(N);
    this._reproducirSecuencia(true /* con luz */);
  }

  _dibujarBarraAvance(n) {
    this.barraAvance.removeAll(true);
    const sz = 14, gap = 8;
    const totalW = n * sz + (n - 1) * gap;
    const startX = -totalW / 2;
    this._avancePuntos = [];
    for (let i = 0; i < n; i++) {
      const x = startX + i * (sz + gap) + sz / 2;
      const c = this.add.circle(x, 0, sz / 2, this.region.color, 0.2)
        .setStrokeStyle(2, this.region.color, 0.6);
      this.barraAvance.add(c);
      this._avancePuntos.push(c);
    }
  }

  _marcarAvance(idx, ok) {
    const c = this._avancePuntos && this._avancePuntos[idx];
    if (!c) return;
    if (ok) c.setFillStyle(0x0f6e56, 1).setStrokeStyle(2, 0xfbfaf7, 1);
    else c.setFillStyle(0xc14a4a, 1).setStrokeStyle(2, 0xfbfaf7, 1);
  }

  _resetAvance() {
    for (const c of (this._avancePuntos || [])) {
      c.setFillStyle(this.region.color, 0.2).setStrokeStyle(2, this.region.color, 0.6);
    }
  }

  _reproducirSecuencia(conLuz) {
    this.fase = 'escuchando';
    this.estadoTxt.setText('Escuchá…');
    this._inhabilitarBotones(true);
    this._resetAvance();

    const dt = this.cfg.intervaloEntreNotasMs;
    const dur = this.cfg.duracionNotaMs;

    this.secuencia.forEach((num, i) => {
      this.time.delayedCall(i * dt, () => {
        if (this.sm) this.sm.playOneShot(`note${num}`, CONFIG.audio.volumenRitmo);
        if (conLuz) this._iluminarBoton(num, dur);
      });
    });

    const finMs = this.secuencia.length * dt + dur + 200;
    this.time.delayedCall(finMs, () => {
      this.fase = 'turno';
      this.estadoTxt.setText('Tu turno');
      this._inhabilitarBotones(false);
      this.entrada = [];
      this._reproduccionDeRonda++;
    });
  }

  _inhabilitarBotones(disable) {
    for (const b of (this.botonesNotas || [])) {
      if (disable) b.bg.disableInteractive();
      else b.bg.setInteractive({ useHandCursor: true });
      b.bg.setAlpha(disable ? 0.55 : 1);
    }
  }

  _onNotaClick(num) {
    if (this.fase !== 'turno') return;
    if (num < 1 || num > 7) return;
    this.marcarProgreso();

    // Reproducir la nota + iluminar
    if (this.sm) this.sm.playOneShot(`note${num}`, CONFIG.audio.volumenRitmo);
    this._iluminarBoton(num, 280);

    const idx = this.entrada.length;
    const esperado = this.secuencia[idx];

    if (num === esperado) {
      this.entrada.push(num);
      this._marcarAvance(idx, true);
      if (this.entrada.length >= this.secuencia.length) {
        // Ronda completa
        this.fase = 'evaluando';
        this._inhabilitarBotones(true);
        this.estadoTxt.setText('¡Bien!');
        this.estadoTxt.setColor(this.region.colorHex);
        this.time.delayedCall(900, () => {
          if (this.rondaIdx + 1 >= this.cfg.longitudesRonda.length) {
            this.resolverEstacion();
          } else {
            this.estadoTxt.setColor('#1F3864');
            this._iniciarRonda(this.rondaIdx + 1);
          }
        });
      }
    } else {
      // Nota incorrecta: reset de entrada de esta ronda, sin avanzar
      this._marcarAvance(idx, false);
      this.estadoTxt.setText('No coincide. Probemos otra vez.');
      this.estadoTxt.setColor('#993556');
      GameState.errores.hipocampo = (GameState.errores.hipocampo || 0) + 1;
      this.time.delayedCall(900, () => {
        this.entrada = [];
        this._resetAvance();
        this.estadoTxt.setText('Tu turno');
        this.estadoTxt.setColor('#1F3864');
      });
    }
  }
}
