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
    this.add.text(L.hudX + L.hudW / 2, 58, 'TIEMPO', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#A8B8D8',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.timerText = this.add.text(L.hudX + L.hudW / 2, 78, '15:00', {
      fontFamily: 'monospace',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#FBFAF7',
    }).setOrigin(0.5, 0);

    // Vida
    this.add.text(L.hudX + 24, 128, 'VIDA', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#A8B8D8',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    this._dibujarVida(L.hudX + 24, 146);

    // Separador
    this.add.rectangle(L.hudX + 24, 175, L.hudW - 48, 1, 0xfbfaf7, 0.2).setOrigin(0, 0);

    // Etiqueta pista
    this.pistaLabel = this.add.text(L.hudX + 24, 188, 'PISTA 1 DE 6', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#A8B8D8',
      fontStyle: 'bold',
    });

    // Cuerpo de la pista (limitamos el wrap a un ancho legible aunque el HUD
    // sea más grande, para que las líneas no queden demasiado largas).
    this.pistaText = this.add.text(L.hudX + 24, 212, '', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#FBFAF7',
      wordWrap: { width: Math.min(L.hudW - 48, 460) },
      lineSpacing: 5,
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
    const onVida = (v) => this._actualizarVida(v);

    this.game.events.off('sinapsis:regionResuelta');
    this.game.events.off('sinapsis:pausarTiempo');
    this.game.events.off('sinapsis:reanudarTiempo');
    this.game.events.off('sinapsis:refrescarHud');
    this.game.events.off('sinapsis:cambioSala');
    this.game.events.off('sinapsis:vidaCambio');

    this.game.events.on('sinapsis:regionResuelta', onRegion);
    this.game.events.on('sinapsis:pausarTiempo', onPausa);
    this.game.events.on('sinapsis:reanudarTiempo', onReanudar);
    this.game.events.on('sinapsis:refrescarHud', onRefresh);
    this.game.events.on('sinapsis:cambioSala', onSala);
    this.game.events.on('sinapsis:vidaCambio', onVida);

    this.events.once('shutdown', () => {
      this.game.events.off('sinapsis:regionResuelta', onRegion);
      this.game.events.off('sinapsis:pausarTiempo', onPausa);
      this.game.events.off('sinapsis:reanudarTiempo', onReanudar);
      this.game.events.off('sinapsis:refrescarHud', onRefresh);
      this.game.events.off('sinapsis:cambioSala', onSala);
      this.game.events.off('sinapsis:vidaCambio', onVida);
    });
  }

  // --------------------------------------------------------------------------
  // Barra de vida (corazones)
  // --------------------------------------------------------------------------
  _dibujarVida(x, y) {
    const max = GameState.vidaMax || 5;
    const slotW = 22, gap = 4;
    this.vidaSlots = [];
    for (let i = 0; i < max; i++) {
      const cx = x + i * (slotW + gap) + slotW / 2;
      const cy = y + slotW / 2;
      const heart = this.add.graphics();
      this._pintarCorazon(heart, cx, cy, i < GameState.vida);
      this.vidaSlots.push({ heart, cx, cy });
    }
  }

  _pintarCorazon(g, cx, cy, lleno) {
    g.clear();
    const colorRelleno = lleno ? 0xff6480 : 0x3a4a6a;
    const colorBorde = lleno ? 0xc94360 : 0x5a6a8a;
    g.lineStyle(2, colorBorde, 1);
    g.fillStyle(colorRelleno, lleno ? 1 : 0.4);
    // Corazón aproximado: dos círculos superiores + triángulo inferior
    const r = 6;
    g.fillCircle(cx - r * 0.55, cy - r * 0.2, r);
    g.fillCircle(cx + r * 0.55, cy - r * 0.2, r);
    g.fillTriangle(
      cx - r * 1.1, cy + r * 0.05,
      cx + r * 1.1, cy + r * 0.05,
      cx, cy + r * 1.35,
    );
    g.strokeCircle(cx - r * 0.55, cy - r * 0.2, r);
    g.strokeCircle(cx + r * 0.55, cy - r * 0.2, r);
    g.strokeTriangle(
      cx - r * 1.1, cy + r * 0.05,
      cx + r * 1.1, cy + r * 0.05,
      cx, cy + r * 1.35,
    );
  }

  _actualizarVida(v) {
    if (!this.vidaSlots) return;
    this.vidaSlots.forEach((slot, i) => {
      this._pintarCorazon(slot.heart, slot.cx, slot.cy, i < v);
    });
    // Pequeño "tilt" si se perdió un corazón
    const idx = v;
    if (idx >= 0 && idx < this.vidaSlots.length) {
      const lost = this.vidaSlots[idx];
      if (lost) {
        this.tweens.add({
          targets: lost.heart,
          scale: { from: 1.6, to: 1 },
          alpha: { from: 0.4, to: 1 },
          duration: 350, ease: 'Cubic.easeOut',
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Minimapa (Sección 5.4)
  // --------------------------------------------------------------------------
  _dibujarMinimapa(hudX, baseY) {
    const L = CONFIG.layout;
    const rooms = CONFIG.mapa.rooms;

    // Centro y dimensiones del minimapa-cerebro
    const mapW = 230, mapH = 240;
    const startX = hudX + (L.hudW - mapW) / 2;
    const startY = baseY;
    const cx = startX + mapW / 2;
    const cy = startY + mapH / 2;

    // Silueta de cerebro como fondo (rosado pálido sobre el azul del HUD)
    const silueta = this.add.image(cx, cy, 'cerebroSilueta').setAlpha(0.85);
    // Escalar para entrar bien en el minimapa
    const targetW = mapW + 10;
    const scale = targetW / 260;
    silueta.setScale(scale);
    silueta.setTint(0xffe5e0);

    // Posiciones anatómicas aproximadas para cada sala dentro de la silueta.
    // Pixeles relativos al centro (cx, cy) en una caja ~190x240.
    const POS = {
      prefrontal:     { dx:   0, dy: -98 },
      broca:          { dx: -68, dy: -52 },
      parietal:       { dx:  62, dy: -45 },
      hub_central:    { dx:   0, dy: -28 },
      amigdala:       { dx: -54, dy:  20 },
      hipocampo:      { dx:  56, dy:  22 },
      hub_inferior:   { dx:   0, dy:  20 },
      hub_posterior:  { dx:   0, dy:  62 },
      occipital:      { dx:   0, dy: 100 },
    };

    // Conexiones (líneas neuronales tenues)
    const linesG = this.add.graphics();
    for (const [id, room] of Object.entries(rooms)) {
      const p = POS[id];
      if (!p) continue;
      for (const dir of Object.keys(room.doors || {})) {
        const dest = rooms[room.doors[dir]];
        if (!dest) continue;
        const pd = POS[room.doors[dir]];
        if (!pd) continue;
        linesG.lineStyle(2, 0xfbfaf7, 0.25);
        linesG.lineBetween(cx + p.dx, cy + p.dy, cx + pd.dx, cy + pd.dy);
      }
    }

    this.minimapCells = {};
    for (const [id, room] of Object.entries(rooms)) {
      const p = POS[id];
      if (!p) continue;
      const x = cx + p.dx;
      const y = cy + p.dy;

      const baseColor = room.regionId
        ? CONFIG.regiones[room.regionId].color
        : 0x88a4dd;
      const radio = room.regionId ? 9 : 6;

      const cell = this.add.circle(x, y, radio, baseColor, 0.5)
        .setStrokeStyle(2, baseColor, 0.85);

      // Marcador de "tu sala" — anillo blanco pulsante
      const youRing = this.add.circle(x, y, radio + 6, 0xfbfaf7, 0)
        .setStrokeStyle(2, 0xfbfaf7, 0);

      this.minimapCells[id] = { cell, youRing, baseColor, regionId: room.regionId, x, y, radio };
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
        c.cell.setFillStyle(c.baseColor, 0.45);
        c.cell.setStrokeStyle(2, c.baseColor, 0.85);
      }
      const isCurrent = id === currentRoomId;
      c.youRing.setStrokeStyle(2, 0xfff7c2, isCurrent ? 1 : 0);

      // Pulse del marcador "tu sala"
      if (isCurrent) {
        if (!c._pulseTween) {
          c._pulseTween = this.tweens.add({
            targets: c.youRing, scale: { from: 1, to: 1.45 }, alpha: { from: 1, to: 0 },
            duration: 1200, repeat: -1, ease: 'Cubic.easeOut',
          });
        }
      } else {
        if (c._pulseTween) { c._pulseTween.stop(); c._pulseTween = null; }
        c.youRing.setScale(1).setAlpha(0);
      }
    }
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
