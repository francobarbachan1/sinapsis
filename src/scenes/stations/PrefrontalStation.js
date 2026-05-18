// ============================================================================
// Estación 6 — Corteza prefrontal (Integración)
// 5 preguntas de opción múltiple (una por región anterior). Al acertarlas
// todas, animación de conexiones entre regiones → EndScene.
// ============================================================================

import { CONFIG } from '../../config.js';
import { GameState } from '../../state.js';
import { StationBase } from './StationBase.js';

export class PrefrontalStation extends StationBase {
  constructor() {
    super('PrefrontalStation', 'prefrontal');
  }

  consignaTexto() {
    return 'Para encender la corteza prefrontal hay que integrar todo lo recorrido. Vas a responder 5 preguntas, una por cada región que ya iluminaste.';
  }

  construirContenido() {
    this.preguntas = CONFIG.preguntasPrefrontal;
    this.idx = 0;
    this.consolidadas = new Set();

    this._dibujarPanelLateral();
    this._mostrarPregunta();
  }

  _dibujarPanelLateral() {
    // Pequeños indicadores de las 5 regiones (se "consolidan" al acertar)
    const L = CONFIG.layout;
    this.add.text(L.brainAreaW / 2, 80, 'Reto de síntesis', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#5F5E5A',
    }).setOrigin(0.5);

    const ids = this.preguntas.map((p) => p.regionId);
    const sz = 28, gap = 18;
    const totalW = ids.length * sz + (ids.length - 1) * gap;
    const startX = (L.brainAreaW - totalW) / 2;
    this.markers = {};
    ids.forEach((id, i) => {
      const r = CONFIG.regiones[id];
      const cx = startX + i * (sz + gap) + sz / 2;
      const cy = 120;
      const c = this.add.circle(cx, cy, sz / 2, r.color, 0.25).setStrokeStyle(2, r.color, 1);
      const lbl = this.add.text(cx, cy + sz / 2 + 12, r.nombre.split(' ')[0], {
        fontFamily: 'sans-serif', fontSize: '10px', color: '#5F5E5A',
      }).setOrigin(0.5);
      this.markers[id] = { circle: c, lbl, color: r.color };
    });

    // Contenedor donde se renderiza la pregunta actual
    this.preguntaContainer = this.add.container(0, 0);
  }

  _mostrarPregunta() {
    this.preguntaContainer.removeAll(true);

    if (this.idx >= this.preguntas.length) {
      // Todas resueltas → animación final
      this._animacionConexiones();
      return;
    }

    const p = this.preguntas[this.idx];
    const L = CONFIG.layout;
    const r = CONFIG.regiones[p.regionId];

    // Etiqueta de región
    const tag = this.add.text(L.brainAreaW / 2, 195, `SOBRE ${r.nombre.toUpperCase()}`, {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: r.colorHex,
      letterSpacing: 2,
    }).setOrigin(0.5);
    this.preguntaContainer.add(tag);

    // Pregunta
    const preguntaTxt = this.add.text(L.brainAreaW / 2, 250, p.pregunta, {
      fontFamily: 'sans-serif',
      fontSize: '19px',
      color: '#1F3864',
      fontStyle: 'bold',
      wordWrap: { width: L.brainAreaW - 80 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    this.preguntaContainer.add(preguntaTxt);

    // Opciones
    const startY = 350;
    const optH = 52;
    const gap = 12;
    p.opciones.forEach((opt, i) => {
      const y = startY + i * (optH + gap);
      const bg = this.add.rectangle(L.brainAreaW / 2, y, L.brainAreaW - 160, optH, 0xffffff, 1)
        .setStrokeStyle(2, r.color, 0.6);
      const txt = this.add.text(L.brainAreaW / 2, y, opt, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: '#1F3864',
      }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(r.fondoSuave, 1));
      bg.on('pointerout', () => bg.setFillStyle(0xffffff, 1));
      bg.on('pointerdown', () => this._responder(i, p, r, bg, txt));
      this.preguntaContainer.add([bg, txt]);
    });

    // Mensaje
    this.mensaje = this.add.text(L.brainAreaW / 2, startY + 4 * (optH + gap) + 10, '', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: r.colorHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.preguntaContainer.add(this.mensaje);
  }

  _responder(idx, p, r, bg, txt) {
    this.marcarProgreso();
    if (idx === p.correcta) {
      bg.setFillStyle(r.color, 1);
      txt.setColor('#FFFFFF');
      this.consolidadas.add(p.regionId);
      const m = this.markers[p.regionId];
      if (m) {
        m.circle.setFillStyle(r.color, 1);
        m.circle.setStrokeStyle(3, 0xfbfaf7, 1);
      }
      this.mensaje.setText('Consolidado.');
      this.time.delayedCall(700, () => {
        this.idx++;
        this._mostrarPregunta();
      });
    } else {
      this.mensaje.setText('Esa no es. Volvé a intentar.');
      // Feedback breve y desbloqueo (sin penalización)
      bg.setFillStyle(0xf0e6e2, 1);
      this.time.delayedCall(700, () => bg.setFillStyle(0xffffff, 1));
    }
  }

  // --------------------------------------------------------------------------
  // Animación de cierre: líneas uniendo las 6 regiones → EndScene
  // --------------------------------------------------------------------------
  _animacionConexiones() {
    this.preguntaContainer.removeAll(true);
    const L = CONFIG.layout;

    const head = this.add.text(L.brainAreaW / 2, 200, 'La corteza prefrontal se enciende', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: this.region.colorHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Mini-cerebro con conexiones
    const cx = L.brainAreaW / 2;
    const cy = 460;
    const radio = 140;
    const regiones = Object.entries(CONFIG.regiones);
    const positions = {};
    regiones.forEach(([id, r], i) => {
      const ang = (i / regiones.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(ang) * radio;
      const y = cy + Math.sin(ang) * radio;
      positions[id] = { x, y, color: r.color };
      this.add.circle(x, y, 18, r.color, 1).setStrokeStyle(2, 0xfbfaf7, 1);
    });

    // Animar conexiones
    const ids = Object.keys(positions);
    let delay = 0;
    const g = this.add.graphics();
    g.setDefaultStyles({ lineStyle: { width: 2, color: 0x1f3864, alpha: 0.6 } });

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = positions[ids[i]];
        const b = positions[ids[j]];
        this.time.delayedCall(delay, () => {
          g.lineStyle(2, 0x1f3864, 0.5);
          g.lineBetween(a.x, a.y, b.x, b.y);
        });
        delay += 70;
      }
    }

    this.time.delayedCall(delay + 600, () => {
      // Marcar prefrontal como resuelta y pasar a EndScene
      GameState.marcarResuelta(this.regionId);
      if (this.sm) { this.sm.playSting(); this.sm.playResolution(); }
      this.time.delayedCall(1000, () => {
        this.scene.stop();
        this.scene.stop('HudScene');
        this.scene.start('EndScene', { porTiempo: false });
      });
    });
  }
}
