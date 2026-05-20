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

    // Botón toggle de pantalla completa, en la esquina superior derecha del HUD
    this._botonFullscreen(L.hudX + L.hudW - 30, 28);

    // Atajo tecla F para toggle fullscreen
    this.input.keyboard.off('keydown-F');
    this.input.keyboard.on('keydown-F', () => {
      try {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      } catch (e) {}
    });

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

    // Estrés (barra horizontal con color gradiente verde→amarillo→rojo)
    this.add.text(L.hudX + 24, 128, 'ESTRÉS', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#A8B8D8',
      fontStyle: 'bold',
      letterSpacing: 2,
    });
    this._dibujarEstres(L.hudX + 24, 146, L.hudW - 48, 18);

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
    const onEstres = (v) => this._actualizarEstres(v);

    this.game.events.off('sinapsis:regionResuelta');
    this.game.events.off('sinapsis:pausarTiempo');
    this.game.events.off('sinapsis:reanudarTiempo');
    this.game.events.off('sinapsis:refrescarHud');
    this.game.events.off('sinapsis:cambioSala');
    this.game.events.off('sinapsis:estresCambio');

    this.game.events.on('sinapsis:regionResuelta', onRegion);
    this.game.events.on('sinapsis:pausarTiempo', onPausa);
    this.game.events.on('sinapsis:reanudarTiempo', onReanudar);
    this.game.events.on('sinapsis:refrescarHud', onRefresh);
    this.game.events.on('sinapsis:cambioSala', onSala);
    this.game.events.on('sinapsis:estresCambio', onEstres);

    this.events.once('shutdown', () => {
      this.game.events.off('sinapsis:regionResuelta', onRegion);
      this.game.events.off('sinapsis:pausarTiempo', onPausa);
      this.game.events.off('sinapsis:reanudarTiempo', onReanudar);
      this.game.events.off('sinapsis:refrescarHud', onRefresh);
      this.game.events.off('sinapsis:cambioSala', onSala);
      this.game.events.off('sinapsis:estresCambio', onEstres);
    });
  }

  // --------------------------------------------------------------------------
  // Botón toggle pantalla completa
  // --------------------------------------------------------------------------
  _botonFullscreen(x, y) {
    const w = 24, h = 24;
    const bg = this.add.graphics();
    const draw = (highlight) => {
      bg.clear();
      bg.fillStyle(highlight ? 0xffffff : 0xffffff, highlight ? 0.2 : 0.08);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
      bg.lineStyle(1, 0xffffff, highlight ? 0.8 : 0.4);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 4);
      // Ícono: 4 esquinitas tipo "expandir"
      bg.lineStyle(2, 0xffffff, highlight ? 1 : 0.85);
      const m = 5, len = 5;
      // top-left
      bg.lineBetween(x - w / 2 + m, y - h / 2 + m, x - w / 2 + m + len, y - h / 2 + m);
      bg.lineBetween(x - w / 2 + m, y - h / 2 + m, x - w / 2 + m, y - h / 2 + m + len);
      // top-right
      bg.lineBetween(x + w / 2 - m, y - h / 2 + m, x + w / 2 - m - len, y - h / 2 + m);
      bg.lineBetween(x + w / 2 - m, y - h / 2 + m, x + w / 2 - m, y - h / 2 + m + len);
      // bottom-left
      bg.lineBetween(x - w / 2 + m, y + h / 2 - m, x - w / 2 + m + len, y + h / 2 - m);
      bg.lineBetween(x - w / 2 + m, y + h / 2 - m, x - w / 2 + m, y + h / 2 - m - len);
      // bottom-right
      bg.lineBetween(x + w / 2 - m, y + h / 2 - m, x + w / 2 - m - len, y + h / 2 - m);
      bg.lineBetween(x + w / 2 - m, y + h / 2 - m, x + w / 2 - m, y + h / 2 - m - len);
    };
    draw(false);
    const hit = this.add.zone(x, y, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerdown', () => {
      try {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
      } catch (e) {}
    });
  }

  // --------------------------------------------------------------------------
  // Barra de estrés (horizontal con color gradiente verde→amarillo→rojo)
  // --------------------------------------------------------------------------
  _dibujarEstres(x, y, w, h) {
    this._estresPos = { x, y, w, h };
    // Fondo (track)
    this._estresTrack = this.add.graphics();
    this._estresTrack.fillStyle(0xffffff, 0.10);
    this._estresTrack.fillRoundedRect(x, y, w, h, 4);
    this._estresTrack.lineStyle(1, 0xffffff, 0.25);
    this._estresTrack.strokeRoundedRect(x, y, w, h, 4);

    // Fill animado
    this._estresFill = this.add.graphics();

    // Texto valor (%)
    this._estresTxt = this.add.text(x + w + 6, y + h / 2, '0%', {
      fontFamily: 'sans-serif', fontSize: '10px',
      color: '#a8b8d8', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this._actualizarEstres(GameState.estres || 0);
  }

  _actualizarEstres(valor) {
    if (!this._estresPos) return;
    const E = CONFIG.estres;
    const { x, y, w, h } = this._estresPos;
    const pct = Math.max(0, Math.min(1, valor / E.max));
    const color = this._colorPorEstres(valor);

    this._estresFill.clear();
    if (pct > 0) {
      // Gradiente sutil dentro de la barra
      this._estresFill.fillStyle(color, 1);
      this._estresFill.fillRoundedRect(x + 1, y + 1, Math.max(2, (w - 2) * pct), h - 2, 3);
      // Brillo arriba
      this._estresFill.fillStyle(0xffffff, 0.18);
      this._estresFill.fillRoundedRect(x + 1, y + 1, Math.max(2, (w - 2) * pct), Math.max(3, (h - 2) / 3), 2);
    }
    if (this._estresTxt) {
      this._estresTxt.setText(Math.round(valor) + '%');
      const colorHex = '#' + color.toString(16).padStart(6, '0');
      this._estresTxt.setColor(colorHex);
    }
  }

  _colorPorEstres(valor) {
    const E = CONFIG.estres;
    const pct = (valor / E.max) * 100;
    // Interpolación verde → amarillo → rojo según umbrales.
    if (pct <= E.umbralAmarillo) {
      // verde sólido (puede interpolar de verde claro a verde si querés)
      return E.colorVerde;
    }
    if (pct <= E.umbralRojo) {
      // verde → amarillo
      const t = (pct - E.umbralAmarillo) / (E.umbralRojo - E.umbralAmarillo);
      return lerpColor(E.colorVerde, E.colorAmarillo, t);
    }
    // amarillo → rojo
    const t = Math.min(1, (pct - E.umbralRojo) / (100 - E.umbralRojo));
    return lerpColor(E.colorAmarillo, E.colorRojo, t);
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

// Interpolación lineal entre dos colores 0xRRGGBB. Usado para el gradiente
// verde → amarillo → rojo de la barra de estrés.
function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
