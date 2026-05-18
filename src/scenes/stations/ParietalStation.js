// ============================================================================
// Estación 4 — Lóbulo parietal (Orientación espacial)
// Grilla 6×6 con inicio, meta y 4 obstáculos. El jugador NO mueve en vivo:
// arma una cola de movimientos (↑↓←→) y luego "Ejecutar" recorre la cola
// paso a paso. Si choca, falla y replanifica.
// ============================================================================

import { CONFIG } from '../../config.js';
import { GameState } from '../../state.js';
import { StationBase } from './StationBase.js';

const DIRS = {
  up:    { dx:  0, dy: -1, label: '↑' },
  down:  { dx:  0, dy:  1, label: '↓' },
  left:  { dx: -1, dy:  0, label: '←' },
  right: { dx:  1, dy:  0, label: '→' },
};

export class ParietalStation extends StationBase {
  constructor() {
    super('ParietalStation', 'parietal');
  }

  consignaTexto() {
    return 'Tenés que llevar el cuadrado hasta la celda dorada. No movés en vivo: armá toda la secuencia de movimientos primero (↑↓←→), después pulsá Ejecutar. Si chocás un obstáculo o el borde, replanificá.';
  }

  construirContenido() {
    const L = CONFIG.layout;
    this.cfg = CONFIG.grillaParietal;
    this.cellSize = 56;
    this.gridOriginX = (L.brainAreaW - this.cfg.cols * this.cellSize) / 2;
    this.gridOriginY = 100;

    this.cola = [];
    this._ejecutando = false;

    this.add.text(L.brainAreaW / 2, 78, 'Planificá la ruta y ejecutala', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#5F5E5A',
    }).setOrigin(0.5);

    this._dibujarGrilla();
    this._dibujarAvatar(this.cfg.inicio);
    this._dibujarColaUI();
    this._dibujarBotones();
  }

  // --------------------------------------------------------------------------
  // Grilla
  // --------------------------------------------------------------------------
  _dibujarGrilla() {
    const { cols, rows, inicio, meta, obstaculos } = this.cfg;
    const s = this.cellSize;
    const g = this.add.graphics();

    // Fondo grilla
    g.fillStyle(0xffffff, 1);
    g.fillRect(this.gridOriginX, this.gridOriginY, cols * s, rows * s);

    // Líneas
    g.lineStyle(1, 0xd6d4ca, 1);
    for (let i = 0; i <= cols; i++) {
      g.moveTo(this.gridOriginX + i * s, this.gridOriginY);
      g.lineTo(this.gridOriginX + i * s, this.gridOriginY + rows * s);
    }
    for (let j = 0; j <= rows; j++) {
      g.moveTo(this.gridOriginX, this.gridOriginY + j * s);
      g.lineTo(this.gridOriginX + cols * s, this.gridOriginY + j * s);
    }
    g.strokePath();
    g.lineStyle(2, this.region.color, 0.8);
    g.strokeRect(this.gridOriginX, this.gridOriginY, cols * s, rows * s);

    // Obstáculos
    for (const o of obstaculos) {
      const x = this.gridOriginX + o.x * s + s / 2;
      const y = this.gridOriginY + o.y * s + s / 2;
      this.add.rectangle(x, y, s - 6, s - 6, 0x5f5e5a, 0.85).setStrokeStyle(2, 0x1f1f1f, 1);
      this.add.text(x, y, '✕', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#FFFFFF',
      }).setOrigin(0.5);
    }

    // Inicio
    const ix = this.gridOriginX + inicio.x * s + s / 2;
    const iy = this.gridOriginY + inicio.y * s + s / 2;
    this.add.rectangle(ix, iy, s - 6, s - 6, this.region.color, 0.15)
      .setStrokeStyle(2, this.region.color, 0.7);
    this.add.text(ix, iy + s / 2 - 10, 'inicio', {
      fontFamily: 'sans-serif', fontSize: '9px', color: this.region.colorHex, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Meta
    const mx = this.gridOriginX + meta.x * s + s / 2;
    const my = this.gridOriginY + meta.y * s + s / 2;
    this.add.rectangle(mx, my, s - 6, s - 6, 0xf2c649, 0.85).setStrokeStyle(2, 0xb38600, 1);
    this.add.text(mx, my, '★', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#FFFFFF',
    }).setOrigin(0.5);
  }

  _dibujarAvatar(pos) {
    if (this.avatar) this.avatar.destroy();
    const s = this.cellSize;
    const x = this.gridOriginX + pos.x * s + s / 2;
    const y = this.gridOriginY + pos.y * s + s / 2;
    this.avatar = this.add.circle(x, y, s * 0.32, this.region.color, 1)
      .setStrokeStyle(3, 0xfbfaf7, 1);
    this.avatarPos = { x: pos.x, y: pos.y };
  }

  _moverAvatarA(pos, dur = 220) {
    const s = this.cellSize;
    const x = this.gridOriginX + pos.x * s + s / 2;
    const y = this.gridOriginY + pos.y * s + s / 2;
    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.avatar, x, y, duration: dur, ease: 'Cubic.easeInOut',
        onComplete: () => { this.avatarPos = { ...pos }; resolve(); },
      });
    });
  }

  // --------------------------------------------------------------------------
  // Cola de movimientos
  // --------------------------------------------------------------------------
  _dibujarColaUI() {
    const L = CONFIG.layout;
    const y = this.gridOriginY + this.cfg.rows * this.cellSize + 30;
    this.add.text(L.brainAreaW / 2, y, 'COLA DE MOVIMIENTOS', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);

    this.colaY = y + 24;
    this.colaContainer = this.add.container(L.brainAreaW / 2, this.colaY);
    this._refrescarCola();
  }

  _refrescarCola() {
    this.colaContainer.removeAll(true);
    if (this.cola.length === 0) {
      const t = this.add.text(0, 0, '(vacía)', {
        fontFamily: 'sans-serif', fontSize: '13px', color: '#9b988f', fontStyle: 'italic',
      }).setOrigin(0.5);
      this.colaContainer.add(t);
      return;
    }
    const sz = 24, gap = 4;
    const totalW = this.cola.length * sz + (this.cola.length - 1) * gap;
    const startX = -totalW / 2;
    this.cola.forEach((dir, i) => {
      const x = startX + i * (sz + gap) + sz / 2;
      const bg = this.add.rectangle(x, 0, sz, sz, this.region.color, 0.85).setStrokeStyle(1, 0x1f3864, 0.6);
      const t = this.add.text(x, 0, DIRS[dir].label, {
        fontFamily: 'sans-serif', fontSize: '16px', color: '#FFFFFF', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.colaContainer.add([bg, t]);
    });
  }

  // --------------------------------------------------------------------------
  // Botonera
  // --------------------------------------------------------------------------
  _dibujarBotones() {
    const L = CONFIG.layout;
    const y = this.colaY + 50;
    const btns = [
      { dir: 'up',    x: L.brainAreaW / 2 - 130 },
      { dir: 'down',  x: L.brainAreaW / 2 - 80 },
      { dir: 'left',  x: L.brainAreaW / 2 - 30 },
      { dir: 'right', x: L.brainAreaW / 2 + 20 },
    ];
    for (const b of btns) {
      const r = this.add.rectangle(b.x, y, 44, 44, this.region.color, 1).setStrokeStyle(2, 0x1f3864, 0.5);
      this.add.text(b.x, y, DIRS[b.dir].label, {
        fontFamily: 'sans-serif', fontSize: '22px', color: '#FFFFFF', fontStyle: 'bold',
      }).setOrigin(0.5);
      r.setInteractive({ useHandCursor: true });
      r.on('pointerdown', () => {
        if (this._ejecutando) return;
        this.cola.push(b.dir);
        this._refrescarCola();
        this.marcarProgreso();
      });
    }

    // Eliminar último
    const elimX = L.brainAreaW / 2 + 90;
    const elim = this.add.rectangle(elimX, y, 70, 44, 0xffffff, 1).setStrokeStyle(2, 0x5f5e5a, 0.8);
    this.add.text(elimX, y, '←', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#5F5E5A',
    }).setOrigin(0.5);
    elim.setInteractive({ useHandCursor: true });
    elim.on('pointerdown', () => {
      if (this._ejecutando) return;
      this.cola.pop();
      this._refrescarCola();
    });

    // Limpiar
    const limpX = L.brainAreaW / 2 + 170;
    const limp = this.add.rectangle(limpX, y, 80, 44, 0xffffff, 1).setStrokeStyle(2, 0x5f5e5a, 0.8);
    this.add.text(limpX, y, 'Limpiar', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#5F5E5A', fontStyle: 'bold',
    }).setOrigin(0.5);
    limp.setInteractive({ useHandCursor: true });
    limp.on('pointerdown', () => {
      if (this._ejecutando) return;
      this.cola = [];
      this._refrescarCola();
      this._dibujarAvatar(this.cfg.inicio);
    });

    // Ejecutar
    const ejecY = y + 60;
    const ejec = this.add.rectangle(L.brainAreaW / 2, ejecY, 200, 42, this.region.color, 1).setStrokeStyle(2, 0x1f3864, 0.6);
    this.add.text(L.brainAreaW / 2, ejecY, 'Ejecutar', {
      fontFamily: 'sans-serif', fontSize: '17px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);
    ejec.setInteractive({ useHandCursor: true });
    ejec.on('pointerdown', () => this._ejecutar());

    // Mensaje de estado
    this.mensaje = this.add.text(L.brainAreaW / 2, ejecY + 36, '', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#5F5E5A',
    }).setOrigin(0.5);
  }

  // --------------------------------------------------------------------------
  // Ejecución
  // --------------------------------------------------------------------------
  async _ejecutar() {
    if (this._ejecutando) return;
    if (this.cola.length === 0) {
      this.mensaje.setText('La cola está vacía.');
      return;
    }
    this.mensaje.setText('');
    this._ejecutando = true;
    this.marcarProgreso();
    // Reset visual del avatar al inicio
    this._dibujarAvatar(this.cfg.inicio);

    let pos = { ...this.cfg.inicio };
    const { cols, rows, obstaculos, meta } = this.cfg;
    const esObst = (p) => obstaculos.some((o) => o.x === p.x && o.y === p.y);

    for (let i = 0; i < this.cola.length; i++) {
      const dir = DIRS[this.cola[i]];
      const next = { x: pos.x + dir.dx, y: pos.y + dir.dy };
      // Validar borde
      if (next.x < 0 || next.x >= cols || next.y < 0 || next.y >= rows) {
        await this._chocar(pos, dir, 'el borde');
        this._ejecutando = false;
        return;
      }
      // Validar obstáculo
      if (esObst(next)) {
        await this._chocar(pos, dir, 'un obstáculo');
        this._ejecutando = false;
        return;
      }
      await this._moverAvatarA(next);
      pos = next;
    }

    if (pos.x === meta.x && pos.y === meta.y) {
      this.mensaje.setText('¡Llegaste a la meta!');
      this.time.delayedCall(700, () => this.resolverEstacion());
    } else {
      this.mensaje.setText('Te quedaste a mitad de camino. Replanificá.');
      this._ejecutando = false;
    }
  }

  async _chocar(pos, dir, contra) {
    // Mover medio paso y "rebotar" suavemente
    const s = this.cellSize;
    const nx = this.gridOriginX + (pos.x + dir.dx * 0.4) * s + s / 2;
    const ny = this.gridOriginY + (pos.y + dir.dy * 0.4) * s + s / 2;
    await new Promise((res) => {
      this.tweens.add({
        targets: this.avatar, x: nx, y: ny, duration: 180,
        yoyo: true, ease: 'Cubic.easeOut', onComplete: res,
      });
    });
    this.mensaje.setText(`Chocaste contra ${contra}. Replanificá la ruta.`);
    GameState.errores.parietal = (GameState.errores.parietal || 0) + 1;
  }
}
