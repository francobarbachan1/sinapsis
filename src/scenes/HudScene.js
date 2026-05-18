// ============================================================================
// HudScene — cronómetro + panel de pista activa + confirmaciones
// Corre en paralelo a MapScene y a las estaciones.
// ============================================================================

import { CONFIG } from '../config.js';
import { GameState } from '../state.js';

export class HudScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HudScene', active: false });
  }

  create() {
    const L = CONFIG.layout;
    const W = CONFIG.ancho;
    const H = CONFIG.alto;

    // Panel lateral
    this.add.rectangle(L.hudX, 0, L.hudW, H, 0x1f3864, 1).setOrigin(0, 0);
    this.add.rectangle(L.hudX, 0, 2, H, 0xfbfaf7, 0.15).setOrigin(0, 0);

    // Título
    this.add.text(L.hudX + L.hudW / 2, 24, 'SINAPSIS', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FBFAF7',
      letterSpacing: 2,
    }).setOrigin(0.5, 0);

    // Cronómetro
    this.add.text(L.hudX + L.hudW / 2, 70, 'TIEMPO', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#A8B8D8',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.timerText = this.add.text(L.hudX + L.hudW / 2, 92, '15:00', {
      fontFamily: 'monospace',
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#FBFAF7',
    }).setOrigin(0.5, 0);

    // Separador
    this.add.rectangle(L.hudX + 24, 158, L.hudW - 48, 1, 0xfbfaf7, 0.2).setOrigin(0, 0);

    // Etiqueta pista
    this.pistaLabel = this.add.text(L.hudX + 24, 172, 'PISTA 1 DE 6', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#A8B8D8',
      fontStyle: 'bold',
    });

    // Cuerpo de la pista
    this.pistaText = this.add.text(L.hudX + 24, 196, '', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#FBFAF7',
      wordWrap: { width: L.hudW - 48 },
      lineSpacing: 4,
    });

    // Minimapa
    const miniY = 380;
    this.add.rectangle(L.hudX + 24, miniY - 16, L.hudW - 48, 1, 0xfbfaf7, 0.2).setOrigin(0, 0);
    this.add.text(L.hudX + 24, miniY, 'MAPA DEL CEREBRO', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#A8B8D8',
      fontStyle: 'bold',
      letterSpacing: 2,
    });

    this._dibujarMinimapa(L.hudX, miniY + 24);

    // Indicador "tu sala" pequeño
    this.salaActualLabel = this.add.text(L.hudX + L.hudW / 2, miniY + 240, '', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#FBFAF7',
      fontStyle: 'italic',
    }).setOrigin(0.5, 0);

    // Marcador de regiones (al fondo, compacto)
    this.progresoY = H - 78;
    this.add.rectangle(L.hudX + 24, this.progresoY - 14, L.hudW - 48, 1, 0xfbfaf7, 0.2).setOrigin(0, 0);
    this.add.text(L.hudX + 24, this.progresoY, 'REGIONES', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#A8B8D8',
      fontStyle: 'bold',
      letterSpacing: 2,
    });

    this.regionMarkers = {};
    const ids = ['amigdala', 'occipital', 'hipocampo', 'parietal', 'broca', 'prefrontal'];
    const slotW = (L.hudW - 60) / 6;
    ids.forEach((id, i) => {
      const r = CONFIG.regiones[id];
      const cx = L.hudX + 30 + slotW * i + slotW / 2;
      const cy = this.progresoY + 30;
      const dot = this.add.circle(cx, cy, 9, r.color, 0.25).setStrokeStyle(2, r.color, 0.7);
      this.regionMarkers[id] = dot;
    });

    // Cartel flotante para confirmaciones
    this.confirmCard = null;

    // Estado del cronómetro
    this._tiempoMs = CONFIG.tiempoTotalSegundos * 1000;
    this._corre = true;

    this.refresh();

    // Eventos globales — limpiamos antes de re-suscribir para que no se
    // acumulen handlers entre partidas (scene.start vuelve a llamar create).
    const onRegion = (id) => this._onRegionResuelta(id);
    const onPausa = () => { this._corre = false; };
    const onReanudar = () => { this._corre = true; };
    const onRefresh = () => this.refresh();
    const onSala = (id) => this._actualizarMinimapa(id);

    this.game.events.off('sinapsis:regionResuelta');
    this.game.events.off('sinapsis:pausarTiempo');
    this.game.events.off('sinapsis:reanudarTiempo');
    this.game.events.off('sinapsis:refrescarHud');
    this.game.events.off('sinapsis:cambioSala');

    this.game.events.on('sinapsis:regionResuelta', onRegion);
    this.game.events.on('sinapsis:pausarTiempo', onPausa);
    this.game.events.on('sinapsis:reanudarTiempo', onReanudar);
    this.game.events.on('sinapsis:refrescarHud', onRefresh);
    this.game.events.on('sinapsis:cambioSala', onSala);

    this.events.once('shutdown', () => {
      this.game.events.off('sinapsis:regionResuelta', onRegion);
      this.game.events.off('sinapsis:pausarTiempo', onPausa);
      this.game.events.off('sinapsis:reanudarTiempo', onReanudar);
      this.game.events.off('sinapsis:refrescarHud', onRefresh);
      this.game.events.off('sinapsis:cambioSala', onSala);
    });
  }

  // --------------------------------------------------------------------------
  // Minimapa (Sección 5.4)
  // --------------------------------------------------------------------------
  _dibujarMinimapa(hudX, baseY) {
    const L = CONFIG.layout;
    const rooms = CONFIG.mapa.rooms;
    const cells = Object.entries(rooms);

    // Determinar bounds del grid
    let maxCol = 0, maxRow = 0;
    for (const [, r] of cells) {
      if (r.minimap.col > maxCol) maxCol = r.minimap.col;
      if (r.minimap.row > maxRow) maxRow = r.minimap.row;
    }
    const cellSize = 30, gap = 5;
    const gridW = (maxCol + 1) * cellSize + maxCol * gap;
    const gridH = (maxRow + 1) * cellSize + maxRow * gap;
    const startX = hudX + (L.hudW - gridW) / 2;
    const startY = baseY;

    // Conectores entre puertas (líneas tenues)
    const linesG = this.add.graphics();
    linesG.lineStyle(2, 0xfbfaf7, 0.18);
    for (const [id, room] of cells) {
      const c = room.minimap;
      const cx = startX + c.col * (cellSize + gap) + cellSize / 2;
      const cy = startY + c.row * (cellSize + gap) + cellSize / 2;
      for (const dir of Object.keys(room.doors || {})) {
        const dest = rooms[room.doors[dir]];
        if (!dest) continue;
        const dx = startX + dest.minimap.col * (cellSize + gap) + cellSize / 2;
        const dy = startY + dest.minimap.row * (cellSize + gap) + cellSize / 2;
        linesG.lineBetween(cx, cy, dx, dy);
      }
    }

    this.minimapCells = {};
    for (const [id, room] of cells) {
      const c = room.minimap;
      const x = startX + c.col * (cellSize + gap);
      const y = startY + c.row * (cellSize + gap);

      const baseColor = room.regionId
        ? CONFIG.regiones[room.regionId].color
        : 0xa8b8d8;

      const cell = this.add.rectangle(x + cellSize / 2, y + cellSize / 2, cellSize, cellSize, baseColor, 0.25)
        .setStrokeStyle(2, baseColor, 0.7);

      // Marcador de "tu sala" — anillo blanco más grande detrás
      const youRing = this.add.circle(x + cellSize / 2, y + cellSize / 2, cellSize / 2 + 5, 0xfbfaf7, 0)
        .setStrokeStyle(2, 0xfbfaf7, 0);

      this.minimapCells[id] = { cell, youRing, baseColor, regionId: room.regionId };
    }

    this._actualizarMinimapa(GameState.currentRoomId || CONFIG.mapa.startRoomId);
  }

  _actualizarMinimapa(currentRoomId) {
    if (!this.minimapCells) return;
    for (const [id, c] of Object.entries(this.minimapCells)) {
      const resuelta = c.regionId && this._regionResueltaEnEstado(c.regionId);
      if (resuelta) {
        c.cell.setFillStyle(c.baseColor, 1);
        c.cell.setStrokeStyle(2, 0xfbfaf7, 1);
      } else {
        c.cell.setFillStyle(c.baseColor, 0.25);
        c.cell.setStrokeStyle(2, c.baseColor, 0.7);
      }
      const isCurrent = id === currentRoomId;
      c.youRing.setStrokeStyle(2, 0xfbfaf7, isCurrent ? 1 : 0);
    }
    // Etiqueta de sala actual
    const room = CONFIG.mapa.rooms[currentRoomId];
    if (room && this.salaActualLabel) {
      this.salaActualLabel.setText('Estás en: ' + room.nombre);
    }
  }

  _regionResueltaEnEstado(regionId) {
    return GameState.esRegionResuelta(regionId);
  }

  update(_time, delta) {
    if (!this._corre) return;
    if (GameState.juegoBloqueadoPorTiempo) return;
    if (GameState.juegoCompleto()) return;

    this._tiempoMs -= delta;
    if (this._tiempoMs <= 0) {
      this._tiempoMs = 0;
      this._corre = false;
      GameState.tiempoRestante = 0;
      GameState.juegoBloqueadoPorTiempo = true;
      this._mostrarFinDeTiempo();
    } else {
      GameState.tiempoRestante = Math.ceil(this._tiempoMs / 1000);
    }
    this._renderTimer();
  }

  _renderTimer() {
    const s = Math.max(0, Math.ceil(this._tiempoMs / 1000));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const txt = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    this.timerText.setText(txt);
    // Cambiar color cuando queda poco
    if (s <= 60) this.timerText.setColor('#FFB4B4');
    else if (s <= 180) this.timerText.setColor('#FFE3A8');
    else this.timerText.setColor('#FBFAF7');
  }

  refresh() {
    // Pista activa
    const pista = GameState.pistaActiva();
    if (pista) {
      const idx = GameState.indicePistaActiva + 1;
      this.pistaLabel.setText(`PISTA ${idx} DE 6`);
      this.pistaText.setText(pista.pista);
    } else {
      this.pistaLabel.setText('CEREBRO COMPLETO');
      this.pistaText.setText('Las seis regiones están encendidas.');
    }

    // Marcadores
    for (const [id, dot] of Object.entries(this.regionMarkers)) {
      const r = CONFIG.regiones[id];
      if (GameState.esRegionResuelta(id)) {
        dot.setFillStyle(r.color, 1);
        dot.setStrokeStyle(2, 0xfbfaf7, 1);
      } else {
        dot.setFillStyle(r.color, 0.25);
        dot.setStrokeStyle(2, r.color, 0.7);
      }
    }

    // Refrescar minimapa también (regiones resueltas, sala actual)
    this._actualizarMinimapa(GameState.currentRoomId);
  }

  _onRegionResuelta(regionId) {
    // Mostrar confirmación, después avanzar pista.
    const pista = CONFIG.pistas.find((p) => p.regionId === regionId);
    if (!pista) return;
    this._mostrarConfirmacion(pista.confirmacion, () => {
      this.refresh();
    });
  }

  _mostrarConfirmacion(texto, onClose) {
    if (this.confirmCard) {
      this.confirmCard.destroy();
      this.confirmCard = null;
    }

    const W = CONFIG.ancho;
    const H = CONFIG.alto;
    const cardW = 620;
    const cardH = 200;
    const cx = W / 2;
    const cy = H / 2;

    const cont = this.add.container(0, 0);

    // Veil
    const veil = this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0, 0).setInteractive();
    cont.add(veil);

    // Card
    const g = this.add.graphics();
    g.fillStyle(0xfbfaf7, 1);
    g.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 14);
    g.lineStyle(3, 0x2e5fa3, 1);
    g.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 14);
    cont.add(g);

    const head = this.add.text(cx, cy - cardH / 2 + 28, 'Región encendida', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#2E5FA3',
      letterSpacing: 2,
    }).setOrigin(0.5);
    cont.add(head);

    const body = this.add.text(cx, cy - 10, texto, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#1F3864',
      wordWrap: { width: cardW - 60 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    cont.add(body);

    const btnY = cy + cardH / 2 - 36;
    const btn = this.add.rectangle(cx, btnY, 160, 40, 0x2e5fa3, 1).setStrokeStyle(2, 0x1f3864);
    const btnTxt = this.add.text(cx, btnY, 'Continuar', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    cont.add([btn, btnTxt]);

    const close = () => {
      cont.destroy();
      this.confirmCard = null;
      if (onClose) onClose();
    };
    btn.on('pointerdown', close);
    veil.on('pointerdown', close);

    this.confirmCard = cont;
  }

  _mostrarFinDeTiempo() {
    const W = CONFIG.ancho;
    const H = CONFIG.alto;
    const cardW = 720;
    const cardH = 320;
    const cx = W / 2;
    const cy = H / 2;

    const cont = this.add.container(0, 0);
    const veil = this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0, 0).setInteractive();
    cont.add(veil);

    const g = this.add.graphics();
    g.fillStyle(0xfbfaf7, 1);
    g.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 14);
    g.lineStyle(3, 0x2e5fa3, 1);
    g.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 14);
    cont.add(g);

    const head = this.add.text(cx, cy - cardH / 2 + 36, 'El tiempo terminó', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#1F3864',
    }).setOrigin(0.5);
    cont.add(head);

    const body = this.add.text(cx, cy - 10, CONFIG.textoFinDeTiempo, {
      fontFamily: 'sans-serif',
      fontSize: '17px',
      color: '#1F3864',
      wordWrap: { width: cardW - 80 },
      align: 'center',
      lineSpacing: 5,
    }).setOrigin(0.5);
    cont.add(body);

    const btnY = cy + cardH / 2 - 44;
    const btn = this.add.rectangle(cx, btnY, 220, 44, 0x2e5fa3, 1).setStrokeStyle(2, 0x1f3864);
    const btnTxt = this.add.text(cx, btnY, 'Ver cierre', {
      fontFamily: 'sans-serif',
      fontSize: '17px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    cont.add([btn, btnTxt]);

    btn.on('pointerdown', () => {
      cont.destroy();
      // detener cualquier escena en curso y ir a End
      ['MapScene', 'AmigdalaStation', 'OccipitalStation', 'HipocampoStation',
       'ParietalStation', 'BrocaStation', 'PrefrontalStation'].forEach((k) => {
        if (this.scene.isActive(k) || this.scene.isSleeping(k)) this.scene.stop(k);
      });
      this.scene.stop('HudScene');
      this.scene.start('EndScene', { porTiempo: true });
    });
  }
}
