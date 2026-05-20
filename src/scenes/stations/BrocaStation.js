// ============================================================================
// Estación 5 — Área de Broca (Lenguaje)
// Reconstruir una frase del curso. Hay varias variantes válidas (config:
// dificultad.broca.frasesValidas) — la validación ignora tildes, mayúsculas
// y signos de puntuación. Pistas progresivas aparecen con el tiempo si el
// equipo no resuelve.
// ============================================================================

import { CONFIG } from '../../config.js';
import { GameState } from '../../state.js';
import { StationBase } from './StationBase.js';

// Normaliza una frase para compararla: minúsculas, sin tildes, sin signos.
function normalizar(s) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip diacríticos
    .replace(/[¿?¡!,.;:"'()\-—–]/g, '')      // strip puntuación
    .replace(/\s+/g, ' ')
    .trim();
}

export class BrocaStation extends StationBase {
  constructor() {
    super('BrocaStation', 'broca');
  }

  consignaTexto() {
    return 'Hay una frase del curso que conecta emoción y aprendizaje. Pueden armarla con varias formulaciones equivalentes — el sistema acepta cualquiera que conserve el sentido. Hay palabras de más (distractoras): quedan afuera. Si se traban, van a ir apareciendo pistas con el paso del tiempo.';
  }

  construirContenido() {
    const L = CONFIG.layout;

    const cfgBroca = CONFIG.dificultad.broca;
    this.frasesValidas = cfgBroca.frasesValidas.map(normalizar);
    this.pistasProgresivas = cfgBroca.pistasProgresivas.slice();
    this._pistasMostradas = 0;
    this._tInicioMs = null; // se setea en iniciarJuego()

    // Pool: palabras del pool + distractores (en objetos distintos para
    // permitir duplicados, ej. dos "no" y dos "se").
    const palabras = cfgBroca.palabrasPool.map((p) => ({ texto: p, esDistractor: false }));
    const distractores = cfgBroca.distractores.map((p) => ({ texto: p, esDistractor: true }));
    this.pool = Phaser.Utils.Array.Shuffle([...palabras, ...distractores]);
    this.linea = [];

    this.add.text(L.brainAreaW / 2, 80, 'Armá una frase con sentido', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#5F5E5A',
    }).setOrigin(0.5);

    // Pista inicial (sin chivar la frase exacta): cuántas variantes hay + tema.
    this.add.text(L.brainAreaW / 2, 106,
      `${this.frasesValidas.length} formas válidas  ·  todas dicen lo mismo sobre emoción y aprendizaje`,
      {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        fontStyle: 'italic',
        color: this.region.colorHex,
      }).setOrigin(0.5);

    // Línea de construcción
    this.add.text(L.brainAreaW / 2, 132, 'TU FRASE', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.lineaBgY = 195;
    this.lineaBg = this.add.rectangle(L.brainAreaW / 2, this.lineaBgY, L.brainAreaW - 80, 100, 0xffffff, 1)
      .setStrokeStyle(2, this.region.color, 0.6);

    this.lineaContainer = this.add.container(L.brainAreaW / 2, this.lineaBgY);

    // Pool
    this.add.text(L.brainAreaW / 2, 275, 'PALABRAS DISPONIBLES', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.poolContainer = this.add.container(L.brainAreaW / 2, 365);

    // Mensaje
    this.mensaje = this.add.text(L.brainAreaW / 2, 510, '', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: this.region.colorHex,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Panel de pistas progresivas (debajo del mensaje, va creciendo)
    this.pistasContainer = this.add.container(L.brainAreaW / 2, 540);

    // Botón limpiar
    const btnY = 645;
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

  iniciarJuego() {
    // Empezar a contar el tiempo desde acá, no desde la apertura de la consigna.
    this._tInicioMs = this.time.now;
  }

  update(time, delta) {
    super.update(time, delta);
    if (this._resuelto || this._tInicioMs === null) return;
    const transcurridoMs = time - this._tInicioMs;
    // Mostrar siguiente pista progresiva si corresponde
    while (this._pistasMostradas < this.pistasProgresivas.length) {
      const p = this.pistasProgresivas[this._pistasMostradas];
      if (transcurridoMs >= p.tSegundos * 1000) {
        this._agregarPistaProgresiva(p, this._pistasMostradas + 1);
        this._pistasMostradas++;
      } else {
        break;
      }
    }
  }

  _agregarPistaProgresiva(p, n) {
    // Cada pista se apila en pistasContainer, una debajo de otra.
    const y = (n - 1) * 24;
    const txt = this.add.text(0, y,
      `Pista ${n}  ·  ${p.texto}`,
      {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#1F3864',
        fontStyle: 'italic',
        wordWrap: { width: CONFIG.layout.brainAreaW - 80 },
        align: 'center',
      }).setOrigin(0.5, 0).setAlpha(0);
    this.pistasContainer.add(txt);
    this.tweens.add({
      targets: txt, alpha: 1, y: { from: y - 8, to: y },
      duration: 350, ease: 'Cubic.easeOut',
    });
    // Pequeño "ding" de feedback
    if (this.sm) this.sm.playOneShot('note' + Math.min(7, 3 + n), 0.4);
  }

  _render() {
    this.lineaContainer.removeAll(true);
    this.poolContainer.removeAll(true);

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
              const idx = this.linea.indexOf(tk.item);
              if (idx >= 0) {
                this.linea.splice(idx, 1);
                this.pool.push(tk.item);
              }
            } else {
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
    if (this.linea.length === 0) {
      this.mensaje.setText('');
      return;
    }
    const armada = normalizar(this.linea.map((i) => i.texto).join(' '));
    if (this.frasesValidas.includes(armada)) {
      this.mensaje.setText('Frase reconstruida.');
      this.time.delayedCall(700, () => this.resolverEstacion());
      return;
    }
    // Si la línea tiene un largo razonable y no matchea, contamos un error
    // (sólo cuenta un error por "intento estable", no por cada click).
    const longitudMinima = Math.min(...this.frasesValidas.map((f) => f.split(' ').length));
    if (this.linea.length >= longitudMinima) {
      this.mensaje.setText('Esa no es. Probá otro orden o variante.');
      if (!this._errorRegistrado) {
        this._errorRegistrado = true;
        GameState.errores.broca = (GameState.errores.broca || 0) + 1;
        this.time.delayedCall(800, () => { this._errorRegistrado = false; });
      }
    } else {
      this.mensaje.setText('');
    }
  }
}
