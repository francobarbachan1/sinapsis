// ============================================================================
// Estación 1 — Amígdala (Emoción)
// 4 fragmentos musicales ↔ 4 etiquetas (Calma, Tensión, Alegría, Tristeza).
// El jugador escucha cada fragmento y arrastra (o clic-clic) la etiqueta sobre
// el fragmento. Si acierta, queda fijado. Si no, vuelve. Sin penalización.
// ============================================================================

import { CONFIG } from '../../config.js';
import { GameState } from '../../state.js';
import { StationBase } from './StationBase.js';

const FRAGMENTOS = [
  { id: 'calma',    audioKey: 'emotionCalma',    etiqueta: 'Calma' },
  { id: 'tension',  audioKey: 'emotionTension',  etiqueta: 'Tensión' },
  { id: 'alegria',  audioKey: 'emotionAlegria',  etiqueta: 'Alegría' },
  { id: 'tristeza', audioKey: 'emotionTristeza', etiqueta: 'Tristeza' },
];

// Distractor: una etiqueta sobra. No corresponde a ningún fragmento.
// (Sube la dificultad cognitiva — sección 6.0.)

export class AmigdalaStation extends StationBase {
  constructor() {
    super('AmigdalaStation', 'amigdala');
  }

  consignaTexto() {
    return 'Escuchá cada fragmento (clic en el ▶) y arrastrá la etiqueta de la emoción que le corresponde. Hay una etiqueta que sobra — no pertenece a ningún fragmento. Si te equivocás, la etiqueta vuelve a su lugar.';
  }

  construirContenido() {
    const L = CONFIG.layout;

    this.add.text(L.brainAreaW / 2, 80,
      'Asociá cada fragmento a la emoción que lo describe',
      {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#5F5E5A',
      }
    ).setOrigin(0.5);

    // 4 fragmentos en fila
    const fragY = 200;
    const fragW = 130, fragH = 130;
    const gap = 30;
    const totalW = 4 * fragW + 3 * gap;
    const startX = (L.brainAreaW - totalW) / 2;

    // Orden visual al azar (los IDs internos se mantienen)
    const ordenVisual = Phaser.Utils.Array.Shuffle([...FRAGMENTOS]);

    this.fragmentos = ordenVisual.map((f, i) => {
      const cx = startX + fragW / 2 + i * (fragW + gap);
      return this._crearFragmento(f, cx, fragY, fragW, fragH, i + 1);
    });

    // Etiquetas (drag) — 5 en fila: las 4 correctas + 1 distractora.
    // El distractor no asocia a ningún fragmento (Sección 6.0).
    const distractorNombre = CONFIG.dificultad.amigdala.emocionDistractora;
    const distractor = { id: '__distractor__', audioKey: null, etiqueta: distractorNombre };

    const lblY = 460;
    const lblW = 116, lblH = 48;
    const lblGap = 22;
    const todasEtiquetas = Phaser.Utils.Array.Shuffle([...FRAGMENTOS, distractor]);
    const totalLblW = todasEtiquetas.length * lblW + (todasEtiquetas.length - 1) * lblGap;
    const startLblX = (L.brainAreaW - totalLblW) / 2;

    this.etiquetas = todasEtiquetas.map((f, i) => {
      const cx = startLblX + lblW / 2 + i * (lblW + lblGap);
      return this._crearEtiqueta(f, cx, lblY, lblW, lblH);
    });

    this.add.text(L.brainAreaW / 2, 530,
      'Arrastrá cada etiqueta a su fragmento. Una sobra.',
      {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#5F5E5A',
      }
    ).setOrigin(0.5);

    this._fijos = new Set();
  }

  _crearFragmento(f, cx, cy, w, h, numero) {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);
    g.lineStyle(2, this.region.color, 0.6);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 10);

    // Icono play
    const play = this.add.triangle(cx, cy - 18, 0, -18, 0, 18, 22, 0, this.region.color)
      .setOrigin(0.5);

    const txt = this.add.text(cx, cy + 32, `Fragmento ${numero}`, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#5F5E5A',
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const hit = this.add.zone(cx, cy, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      // Defensa total: matar cualquier sound de emoción que esté sonando
      // ANTES de tocar el nuevo. No confiamos sólo en playExclusive — acá
      // recorremos directamente game.sound.sounds.
      try {
        const claves = ['emotionCalma', 'emotionTension', 'emotionAlegria', 'emotionTristeza'];
        for (const sd of this.sound.sounds.slice()) {
          if (sd && claves.includes(sd.key)) {
            try { if (sd.setVolume) sd.setVolume(0); } catch (e) {}
            try { sd.stop(); } catch (e) {}
            try { sd.destroy(); } catch (e) {}
          }
        }
      } catch (e) {}
      // Tocar el nuevo (playExclusive además limpia el tracking interno).
      if (this.sm) this.sm.playExclusive('emocion', f.audioKey, CONFIG.audio.volumenEmocion);
      this.tweens.add({ targets: play, scale: { from: 1, to: 1.3 }, duration: 150, yoyo: true });
      this.marcarProgreso();
    });

    // Slot para etiqueta correcta
    const slot = { f, cx, cy, w, h, g, play, txt, hit, etiquetaPuesta: null };
    return slot;
  }

  _crearEtiqueta(f, cx, cy, w, h) {
    const cont = this.add.container(cx, cy);
    const bg = this.add.graphics();
    bg.fillStyle(this.region.color, 0.9);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, this.region.color, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    const txt = this.add.text(0, 0, f.etiqueta, {
      fontFamily: 'sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    cont.add([bg, txt]);

    cont.setSize(w, h);
    cont.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(cont);

    const home = { x: cx, y: cy };
    cont._home = home;
    cont._f = f;

    cont.on('drag', (_p, dx, dy) => {
      cont.x = dx;
      cont.y = dy;
    });

    cont.on('dragend', () => {
      // ¿Cayó sobre algún fragmento?
      const slot = this._slotEnPosicion(cont.x, cont.y);
      if (slot && !this._fijos.has(slot.f.id) && !slot.etiquetaPuesta) {
        if (slot.f.id === f.id) {
          // Acertó: lock-in
          cont.x = slot.cx;
          cont.y = slot.cy + slot.h / 2 - 22;
          cont.disableInteractive();
          this._fijos.add(slot.f.id);
          slot.etiquetaPuesta = cont;
          // marcar slot como resuelto
          slot.g.lineStyle(3, 0x0f6e56, 1);
          slot.g.strokeRoundedRect(slot.cx - slot.w / 2, slot.cy - slot.h / 2, slot.w, slot.h, 10);
          this.marcarProgreso();
          this._chequearFin();
          return;
        }
        // Incorrecta: vuelve a su casa con feedback suave
        this._flashRojo(slot);
        GameState.errores.amigdala = (GameState.errores.amigdala || 0) + 1;
      }
      // En cualquier otro caso: volver a casa
      this.tweens.add({
        targets: cont, x: home.x, y: home.y, duration: 220, ease: 'Cubic.easeOut',
      });
    });

    return cont;
  }

  _slotEnPosicion(x, y) {
    for (const s of this.fragmentos) {
      if (
        x >= s.cx - s.w / 2 && x <= s.cx + s.w / 2 &&
        y >= s.cy - s.h / 2 && y <= s.cy + s.h / 2
      ) return s;
    }
    return null;
  }

  _flashRojo(slot) {
    const ring = this.add.graphics();
    ring.lineStyle(3, 0xc14a4a, 1);
    ring.strokeRoundedRect(slot.cx - slot.w / 2 - 2, slot.cy - slot.h / 2 - 2, slot.w + 4, slot.h + 4, 12);
    this.tweens.add({
      targets: ring,
      alpha: { from: 1, to: 0 },
      duration: 500,
      onComplete: () => ring.destroy(),
    });
  }

  _chequearFin() {
    if (this._fijos.size === FRAGMENTOS.length) {
      this.time.delayedCall(500, () => this.resolverEstacion());
    }
  }
}
