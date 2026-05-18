// ============================================================================
// Estación 5 — Área de Broca (Lenguaje)
// Frase clave desordenada + distractores. El jugador arma la frase haciendo
// clic en las fichas (clic en pool = agregar a la línea; clic en la línea =
// devolver al pool). Distractores quedan afuera.
// ============================================================================

import { CONFIG } from '../../config.js';
import { GameState } from '../../state.js';
import { StationBase } from './StationBase.js';

export class BrocaStation extends StationBase {
  constructor() {
    super('BrocaStation', 'broca');
  }

  consignaTexto() {
    return 'Reconstruí la frase haciendo clic en las palabras en el orden correcto. Hay palabras de más (distractoras): tienen que quedar afuera.';
  }

  construirContenido() {
    const L = CONFIG.layout;

    this.fraseObjetivo = CONFIG.fraseBroca.trim();
    this.palabrasObjetivo = this.fraseObjetivo.split(/\s+/);
    this.distractores = CONFIG.distractoresBroca.slice();

    // Pool: palabras objetivo + distractores, shuffled
    const pool = [
      ...this.palabrasObjetivo.map((p) => ({ texto: p, esDistractor: false })),
      ...this.distractores.map((p) => ({ texto: p, esDistractor: true })),
    ];
    this.pool = Phaser.Utils.Array.Shuffle(pool);
    this.linea = []; // {texto, esDistractor, refIdxPool}

    this.add.text(L.brainAreaW / 2, 80, 'Armá una frase con sentido', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#5F5E5A',
    }).setOrigin(0.5);

    // Línea de construcción
    this.add.text(L.brainAreaW / 2, 130, 'TU FRASE', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.lineaBgY = 175;
    this.lineaBg = this.add.rectangle(L.brainAreaW / 2, this.lineaBgY, L.brainAreaW - 80, 80, 0xffffff, 1)
      .setStrokeStyle(2, this.region.color, 0.6);

    this.lineaContainer = this.add.container(L.brainAreaW / 2, this.lineaBgY);

    // Pool
    this.add.text(L.brainAreaW / 2, 290, 'PALABRAS DISPONIBLES', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.poolContainer = this.add.container(L.brainAreaW / 2, 350);

    // Mensaje
    this.mensaje = this.add.text(L.brainAreaW / 2, 580, '', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: this.region.colorHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Botón limpiar
    const btnY = 620;
    const btn = this.add.rectangle(L.brainAreaW / 2, btnY, 160, 32, 0xffffff, 1)
      .setStrokeStyle(2, this.region.color, 1).setInteractive({ useHandCursor: true });
    this.add.text(L.brainAreaW / 2, btnY, 'Limpiar línea', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: this.region.colorHex,
    }).setOrigin(0.5);
    btn.on('pointerdown', () => {
      this.linea.forEach((item) => this.pool.push(item));
      this.linea = [];
      this._render();
    });

    this._render();
  }

  _render() {
    this.lineaContainer.removeAll(true);
    this.poolContainer.removeAll(true);

    // Línea (centrada)
    const renderRow = (items, container, isLinea) => {
      if (items.length === 0 && isLinea) {
        const t = this.add.text(0, 0, '(vacía — tocá una palabra abajo)', {
          fontFamily: 'sans-serif', fontSize: '13px', color: '#9b988f', fontStyle: 'italic',
        }).setOrigin(0.5);
        container.add(t);
        return;
      }

      const padding = 12;
      const lineHeight = 38;
      const maxWidth = CONFIG.layout.brainAreaW - 120;

      // Pre-medir cada palabra
      const tokens = items.map((item) => {
        const txt = this.add.text(0, 0, item.texto, {
          fontFamily: 'sans-serif',
          fontSize: '17px',
          color: '#FFFFFF',
          fontStyle: 'bold',
        }).setOrigin(0.5);
        const w = Math.max(50, txt.width + padding * 2);
        return { item, txt, w };
      });

      // Multi-line layout
      const lines = [[]];
      let curW = 0;
      for (const tk of tokens) {
        if (curW + tk.w + 6 > maxWidth && lines[lines.length - 1].length > 0) {
          lines.push([]);
          curW = 0;
        }
        lines[lines.length - 1].push(tk);
        curW += tk.w + 6;
      }

      const totalLines = lines.length;
      const startY = -((totalLines - 1) * lineHeight) / 2;

      lines.forEach((line, lineIdx) => {
        const lineW = line.reduce((s, tk) => s + tk.w, 0) + (line.length - 1) * 6;
        let x = -lineW / 2;
        for (const tk of line) {
          const cx = x + tk.w / 2;
          const cy = startY + lineIdx * lineHeight;
          const bg = this.add.rectangle(cx, cy, tk.w, 30, this.region.color, isLinea ? 1 : 0.85)
            .setStrokeStyle(2, this.region.color, 1);
          tk.txt.setPosition(cx, cy);
          container.add([bg, tk.txt]);

          bg.setInteractive({ useHandCursor: true });
          bg.on('pointerdown', () => {
            this.marcarProgreso();
            if (isLinea) {
              // Devolver al pool
              const idx = this.linea.indexOf(tk.item);
              if (idx >= 0) {
                this.linea.splice(idx, 1);
                this.pool.push(tk.item);
              }
            } else {
              // Mover a la línea
              const idx = this.pool.indexOf(tk.item);
              if (idx >= 0) {
                this.pool.splice(idx, 1);
                this.linea.push(tk.item);
              }
            }
            this._render();
            this._evaluar();
          });

          x += tk.w + 6;
        }
      });
    };

    renderRow(this.linea, this.lineaContainer, true);
    renderRow(this.pool, this.poolContainer, false);
  }

  _evaluar() {
    // Comparamos solo por texto (ignoramos el flag esDistractor): cuando la
    // frase tiene palabras que también figuran como distractores —ej. "puede",
    // "siente"— da lo mismo qué ficha eligieron, si la frase queda armada
    // correctamente la validamos.
    if (this.linea.length !== this.palabrasObjetivo.length) {
      this.mensaje.setText('');
      return;
    }
    const armada = this.linea.map((i) => i.texto).join(' ').toLowerCase();
    const objetivo = this.palabrasObjetivo.join(' ').toLowerCase();
    if (armada === objetivo) {
      this.mensaje.setText('Frase reconstruida.');
      this.time.delayedCall(700, () => this.resolverEstacion());
    } else {
      this.mensaje.setText('Esa no es. Probá otro orden.');
      if (!this._errorRegistrado) {
        // Contamos un error por intento fallido distinto, no por cada click
        this._errorRegistrado = true;
        GameState.errores.broca = (GameState.errores.broca || 0) + 1;
        this.time.delayedCall(800, () => { this._errorRegistrado = false; });
      }
    }
  }
}
