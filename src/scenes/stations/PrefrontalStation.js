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
    // No mostramos la pregunta hasta iniciarJuego(): así no se ve filtrada
    // detrás del velo de la consigna.
  }

  iniciarJuego() {
    this._mostrarPregunta();
  }

  _dibujarPanelLateral() {
    // Pequeños indicadores de las 5 regiones (se "consolidan" al acertar)
    const L = CONFIG.layout;
    // Agrupamos el panel lateral (header + markers) en un container para
    // poder destruirlo cuando arranca el clímax y evitar superposiciones.
    this.panelLateral = this.add.container(0, 0);

    const head = this.add.text(L.brainAreaW / 2, 80, 'Reto de síntesis', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#5F5E5A',
    }).setOrigin(0.5);
    this.panelLateral.add(head);

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
      this.panelLateral.add([c, lbl]);
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
      bg.setFillStyle(0xf0e6e2, 1);
      this.time.delayedCall(700, () => bg.setFillStyle(0xffffff, 1));
      GameState.errores.prefrontal = (GameState.errores.prefrontal || 0) + 1;
    }
  }

  // --------------------------------------------------------------------------
  // Clímax sinapsis (Sección 10.1): cerebro completo iluminándose y
  // conexiones encendiéndose una tras otra.
  // --------------------------------------------------------------------------
  _animacionConexiones() {
    this.preguntaContainer.removeAll(true);
    // Destruir el panel lateral (header + markers) para que no se superponga
    // con el clímax.
    if (this.panelLateral) {
      this.tweens.add({
        targets: this.panelLateral, alpha: 0, duration: 250,
        onComplete: () => { this.panelLateral.destroy(true); this.panelLateral = null; },
      });
    }
    const L = CONFIG.layout;
    const cx = L.brainAreaW / 2;
    const cy = L.brainAreaH / 2 + 30;

    // Oscurecer fondo
    const veil = this.add.rectangle(0, 0, L.brainAreaW, L.brainAreaH, 0x1f3864, 0)
      .setOrigin(0, 0).setDepth(5);
    this.tweens.add({ targets: veil, alpha: 0.85, duration: 500 });

    // Silueta del cerebro
    const brainG = this.add.graphics().setDepth(6);
    const rx = 220, ry = 270;
    brainG.fillStyle(0xf6e8e5, 1);
    brainG.fillEllipse(cx, cy, rx * 2, ry * 2);
    brainG.lineStyle(2, 0xc9a8a3, 1);
    brainG.strokeEllipse(cx, cy, rx * 2, ry * 2);
    brainG.setAlpha(0);
    this.tweens.add({ targets: brainG, alpha: 1, duration: 500 });

    // Posicionar las 6 regiones según CONFIG (escaladas al cerebro chico)
    const baseW = L.brainAreaW;
    const baseH = L.brainAreaH;
    const scaleX = rx / 270;
    const scaleY = ry / 320;
    const nodes = {};
    for (const [id, r] of Object.entries(CONFIG.regiones)) {
      const dx = (r.x - baseW / 2) * scaleX;
      const dy = (r.y - (baseH / 2 + 10)) * scaleY;
      const x = cx + dx, y = cy + dy;
      const node = this.add.circle(x, y, 16, r.color, 0.4)
        .setStrokeStyle(2, r.color, 0.8).setDepth(8);
      const label = this.add.text(x, y + 24, r.nombre.split(' ').slice(-1)[0], {
        fontFamily: 'sans-serif', fontSize: '10px',
        color: '#FFFFFF', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(8).setAlpha(0);
      nodes[id] = { x, y, color: r.color, colorHex: r.colorHex, circle: node, label };
    }

    // Texto guía
    const head = this.add.text(cx, 80, 'La corteza prefrontal integra todo', {
      fontFamily: 'sans-serif', fontSize: '22px',
      color: this.region.colorHex, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(8).setAlpha(0);
    this.tweens.add({ targets: head, alpha: 1, duration: 400, delay: 300 });

    // Secuencia: encender cada región con sting + glow.
    const ordenEncendido = ['amigdala', 'occipital', 'hipocampo', 'parietal', 'broca', 'prefrontal'];
    let t = 700;
    const dtRegion = 250;
    for (const id of ordenEncendido) {
      this.time.delayedCall(t, () => {
        const n = nodes[id];
        n.circle.setFillStyle(n.color, 1).setStrokeStyle(3, 0xfbfaf7, 1);
        // glow halo
        const halo = this.add.circle(n.x, n.y, 16, n.color, 0.6).setDepth(7);
        this.tweens.add({
          targets: halo, scale: 3, alpha: 0, duration: 700,
          ease: 'Cubic.easeOut', onComplete: () => halo.destroy(),
        });
        this.tweens.add({ targets: n.label, alpha: 1, duration: 220 });
        if (this.sm) this.sm.playSting();
      });
      t += dtRegion;
    }

    // Mensaje "conectando"
    this.time.delayedCall(t + 200, () => {
      head.setText('El cerebro se conecta');
      this.tweens.add({
        targets: head, scale: { from: 0.95, to: 1.05 },
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    // Dibujar conexiones con "impulso" recorriéndolas
    const ids = Object.keys(nodes);
    const conexiones = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        conexiones.push([ids[i], ids[j]]);
      }
    }
    Phaser.Utils.Array.Shuffle(conexiones);

    const linesG = this.add.graphics().setDepth(7);
    const dtConex = 120;
    let connStart = t + 500;
    for (let i = 0; i < conexiones.length; i++) {
      const [a, b] = conexiones[i];
      this.time.delayedCall(connStart + i * dtConex, () => {
        this._dibujarSinapsis(linesG, nodes[a], nodes[b]);
      });
    }

    // Flash final + transición
    const totalConex = conexiones.length * dtConex;
    this.time.delayedCall(connStart + totalConex + 600, () => {
      // Sting + resolution
      if (this.sm) { this.sm.playSting(); this.sm.playResolution(); }
      // Flash blanco
      const flash = this.add.rectangle(0, 0, L.brainAreaW, L.brainAreaH, 0xffffff, 0)
        .setOrigin(0, 0).setDepth(20);
      this.tweens.add({
        targets: flash, alpha: { from: 0, to: 0.9 },
        duration: 250, yoyo: true,
      });
      this.cameras.main.shake(280, 0.005);
      // Marcar prefrontal resuelta
      GameState.marcarResuelta(this.regionId);
    });

    this.time.delayedCall(connStart + totalConex + 1700, () => {
      // Fade out + EndScene
      this.cameras.main.fadeOut(450, 31, 56, 100);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.stop();
        this.scene.stop('HudScene');
        this.scene.start('EndScene', { porTiempo: false });
      });
    });
  }

  // Una conexión = línea estable + un "impulso" (punto brillante) recorriéndola.
  _dibujarSinapsis(linesG, a, b) {
    // Línea base
    linesG.lineStyle(1.5, 0xfbfaf7, 0.35);
    linesG.lineBetween(a.x, a.y, b.x, b.y);
    // Impulso viajando de a a b
    const dot = this.add.circle(a.x, a.y, 4, 0xfff7c2, 1)
      .setStrokeStyle(2, 0xffe27a, 1).setDepth(9);
    this.tweens.add({
      targets: dot, x: b.x, y: b.y,
      duration: 380, ease: 'Cubic.easeInOut',
      onComplete: () => {
        // pulso en destino
        const pulse = this.add.circle(b.x, b.y, 8, 0xfff7c2, 0.8).setDepth(9);
        this.tweens.add({
          targets: pulse, scale: 2.5, alpha: 0, duration: 350,
          onComplete: () => pulse.destroy(),
        });
        dot.destroy();
      },
    });
  }
}
