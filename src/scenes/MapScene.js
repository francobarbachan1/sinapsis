// ============================================================================
// MapScene — el cerebro como dungeon (Sección 5 v2)
// ----------------------------------------------------------------------------
// El cerebro se recorre como un conjunto de salas conectadas por puertas
// (tipo Binding of Isaac, simplificado y sin combate). Cada sala es una
// pantalla; al cruzar una puerta se transiciona a la sala vecina.
//   - 6 salas-región: contienen la "entrada a la estación".
//   - 3 salas conector: contienen pulsos de estrés que ralentizan al avatar
//     si lo tocan (sin daño, sin vidas; Sección 5.3 + Sección 16).
// El avatar es una neurona controlada con WASD/flechas, con física de
// aceleración suave y colisión real (Sección 5.2).
// ============================================================================

import { CONFIG } from '../config.js';
import { GameState } from '../state.js';
import { getSoundManager } from '../soundManager.js';

const STATION_SCENE = {
  amigdala: 'AmigdalaStation',
  occipital: 'OccipitalStation',
  hipocampo: 'HipocampoStation',
  parietal: 'ParietalStation',
  broca: 'BrocaStation',
  prefrontal: 'PrefrontalStation',
};

const OPPOSITE = { north: 'south', south: 'north', east: 'west', west: 'east' };

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create() {
    const L = CONFIG.layout;

    this.cameras.main.setBackgroundColor(CONFIG.ui.fondoHex);

    // Sonido
    this.sm = getSoundManager(this);

    // Grupos (la física se asigna por elemento; el group es solo contenedor)
    this.wallsGroup = this.add.group();
    this.pulsesGroup = this.physics.add.group();
    // Bloqueadores de puerta: invisibles, sólo colisionan con pulsos para
    // evitar que se escapen por los huecos. El avatar los ignora.
    this.pulseDoorBlockersGroup = this.add.group();
    this.haloGroup = this.add.group();
    this._colliders = [];

    // Avatar (persistente entre salas, dentro de MapScene)
    this._crearAvatar();

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Partículas de ambiente (impulsos nerviosos lentos)
    this._crearParticulasFondo();

    // Cargar sala inicial
    this._cargarSala(GameState.currentRoomId, GameState.spawnFromDoor);

    // HUD
    if (!this.scene.isActive('HudScene')) this.scene.launch('HudScene');
    this.scene.bringToTop('HudScene');

    // Eventos
    this.events.off('wake');
    this.events.on('wake', () => {
      // Defensivo: limpiar cualquier flag de transición que haya quedado pegado.
      this._transitioning = false;
      this.cameras.main.resetFX();
      // Al volver de una estación: recargar la sala actual (regiones iluminadas).
      this._cargarSala(GameState.currentRoomId, null /* no respawn */);
      this.scene.bringToTop('HudScene');
      this.cameras.main.fadeIn(300, 251, 250, 247);
    });

    // Fade-in inicial
    this.cameras.main.fadeIn(350, 251, 250, 247);

    // Anti re-disparo de estación si reentras a la misma celda
    this._stationCooldownUntil = 0;
  }

  // --------------------------------------------------------------------------
  // Avatar (neurona)
  // --------------------------------------------------------------------------
  _crearAvatar() {
    const v = CONFIG.velocidadAvatar;
    const L = CONFIG.layout;

    // Glow detrás (subtle, pulsa)
    this.avatarGlow = this.add.image(L.brainAreaW / 2, L.brainAreaH / 2, 'neuronaGlow')
      .setDepth(8).setAlpha(0.7);
    this.tweens.add({
      targets: this.avatarGlow,
      scale: { from: 0.85, to: 1.05 },
      alpha:  { from: 0.55, to: 0.85 },
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.avatar = this.physics.add.sprite(L.brainAreaW / 2, L.brainAreaH / 2, 'neurona');
    this.avatar.setDepth(10);
    this.avatar.body.setCircle(v.radio, this.avatar.width / 2 - v.radio, this.avatar.height / 2 - v.radio);
    this.avatar.setDrag(v.drag, v.drag);
    this.avatar.setMaxVelocity(v.maxSpeed, v.maxSpeed);

    // Heartbeat sutil
    this.tweens.add({
      targets: this.avatar,
      scale: { from: 1.0, to: 1.06 },
      duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.avatar.stunUntil = 0;
    this.avatar.lastHitTime = -9999;
  }

  // --------------------------------------------------------------------------
  // Carga de sala (rebuild walls + doors + pulses + acceso a estación)
  // --------------------------------------------------------------------------
  _cargarSala(roomId, spawnFromDoor) {
    const M = CONFIG.mapa;
    const room = M.rooms[roomId];
    if (!room) {
      console.warn('[Sinapsis] Sala desconocida:', roomId);
      return;
    }
    GameState.currentRoomId = roomId;

    // Limpiar contenedores y colliders previos
    this._colliders.forEach((c) => { if (c && c.destroy) c.destroy(); });
    this._colliders = [];
    if (this.roomLayer) this.roomLayer.destroy(true);
    if (this.doorsGroup) { this.doorsGroup.clear(true, true); this.doorsGroup.destroy(true); }
    if (this.stationZone) { this.stationZone.destroy(); this.stationZone = null; }
    this.wallsGroup.clear(true, true);
    this.pulsesGroup.clear(true, true);
    this.pulseDoorBlockersGroup.clear(true, true);
    this.haloGroup.clear(true, true);

    this.roomLayer = this.add.container(0, 0).setDepth(0);
    this.doorsGroup = this.add.group();

    // Fondo de sala (tinte suave según región)
    const tint = room.regionId ? CONFIG.regiones[room.regionId].fondoSuave : 0xf2efe6;
    const floor = this.add.rectangle(0, 0, M.salaW, M.salaH, tint, 1).setOrigin(0, 0);
    this.roomLayer.add(floor);

    // Decoración: trama sutil de "tejido cerebral"
    this._dibujarTramaCelular(M.salaW, M.salaH, room);

    // Etiqueta de sala
    this._etiquetaSala(room);

    // Si es región: el acceso a la estación al centro
    if (room.regionId) {
      this._dibujarAccesoEstacion(room);
    }

    // Paredes con huecos para puertas
    this._construirParedes(room);

    // Pulsos de estrés (sólo en conectores)
    if (room.pulsos && room.pulsos > 0 && !GameState.juegoBloqueadoPorTiempo) {
      this._crearPulsos(room.pulsos);
    }

    // Spawn del avatar
    this._posicionarAvatarEnSpawn(room, spawnFromDoor);

    // Colisiones / overlaps (los referenciamos para poder destruirlos al recargar)
    this._colliders.push(this.physics.add.collider(this.avatar, this.wallsGroup));
    this._colliders.push(this.physics.add.collider(this.pulsesGroup, this.wallsGroup));
    this._colliders.push(this.physics.add.collider(this.pulsesGroup, this.pulseDoorBlockersGroup));
    this._colliders.push(this.physics.add.overlap(this.avatar, this.pulsesGroup, this._onPulsoHit, null, this));

    // Notificar HUD que la sala cambió (para el minimapa)
    this.game.events.emit('sinapsis:cambioSala', roomId);
  }

  _dibujarTramaCelular(w, h, room) {
    const rand = mulberry32(roomSeed(room));

    // Capa 1: viñeta sutil de oscuridad en los bordes para dar profundidad
    const vig = this.add.graphics();
    const tinte = room.regionId
      ? CONFIG.regiones[room.regionId].color
      : 0x4a3a3a;
    vig.fillStyle(tinte, 0.05);
    vig.fillRect(0, 0, w, h);
    this.roomLayer.add(vig);

    // Capa 2: círculos (células) con varias densidades y opacidades
    const g = this.add.graphics();
    for (let i = 0; i < 28; i++) {
      const x = 50 + rand() * (w - 100);
      const y = 50 + rand() * (h - 100);
      const r = 8 + rand() * 16;
      const a = 0.12 + rand() * 0.10;
      g.lineStyle(1.2, 0xc9a8a3, a);
      g.strokeCircle(x, y, r);
      // núcleo
      if (rand() > 0.3) {
        g.fillStyle(0xb88a85, a * 0.8);
        g.fillCircle(x, y, r * 0.25);
      }
    }
    // Capilares: líneas suaves serpenteantes
    g.lineStyle(1, 0xb88a85, 0.12);
    for (let i = 0; i < 5; i++) {
      const x0 = 30 + rand() * (w - 60);
      const y0 = 30 + rand() * (h - 60);
      let x = x0, y = y0;
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        x += (rand() - 0.5) * 80;
        y += (rand() - 0.5) * 80;
        g.lineTo(x, y);
      }
      g.strokePath();
    }
    this.roomLayer.add(g);
  }

  _etiquetaSala(room) {
    const M = CONFIG.mapa;
    const txt = this.add.text(M.salaW / 2, M.grosorPared + 14, room.nombre.toUpperCase(), {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#5F5E5A',
      fontStyle: 'bold',
      letterSpacing: 3,
    }).setOrigin(0.5, 0).setAlpha(0.55);
    this.roomLayer.add(txt);
  }

  _dibujarAccesoEstacion(room) {
    const M = CONFIG.mapa;
    const cx = M.salaW / 2;
    const cy = M.salaH / 2;
    const r = CONFIG.regiones[room.regionId];
    const resuelta = GameState.esRegionResuelta(room.regionId);
    const activa = GameState.regionActiva() === room.regionId;

    const grupo = this.add.container(cx, cy);

    // Halo / pad de acceso — más grande
    const haloRadio = 92;
    const halo = this.add.circle(0, 0, haloRadio, r.color, resuelta ? 0.32 : (activa ? 0.22 : 0.12))
      .setStrokeStyle(3, r.color, resuelta ? 1 : (activa ? 0.85 : 0.5));
    grupo.add(halo);

    // Forma blob orgánica (varios círculos solapados con leve offset)
    const seed = (r.color & 0xffff) >>> 0;
    const rand = mulberry32(seed);
    const blob = this.add.graphics();
    const blobFillAlpha = resuelta ? 1 : 0.32;
    blob.fillStyle(r.color, blobFillAlpha);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const ox = Math.cos(a) * 14;
      const oy = Math.sin(a) * 14;
      blob.fillCircle(ox, oy, 28 + rand() * 6);
    }
    blob.fillStyle(r.color, blobFillAlpha);
    blob.fillCircle(0, 0, 32);
    grupo.add(blob);

    if (resuelta) {
      // Pulso encendido (glow que crece y vuelve)
      this.tweens.add({
        targets: halo, scale: { from: 1, to: 1.08 }, alpha: { from: 0.32, to: 0.5 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      // Brillo central
      const shine = this.add.circle(-12, -12, 14, 0xffffff, 0.55);
      grupo.add(shine);
      // Partículas brillantes ocasionales
      this.time.addEvent({
        delay: 900, loop: true,
        callback: () => {
          if (!grupo.scene) return;
          const a = Math.random() * Math.PI * 2;
          const dot = this.add.circle(cx, cy, 3, 0xffffff, 0.85);
          this.tweens.add({
            targets: dot,
            x: cx + Math.cos(a) * 70,
            y: cy + Math.sin(a) * 70,
            alpha: 0, duration: 900, ease: 'Cubic.easeOut',
            onComplete: () => dot.destroy(),
          });
        },
      });
    } else {
      if (activa) {
        // Anillos pulsantes hacia afuera para invitar a entrar
        this.tweens.add({
          targets: halo, scale: { from: 1, to: 1.18 }, alpha: { from: 0.22, to: 0 },
          duration: 1200, yoyo: false, repeat: -1, ease: 'Cubic.easeOut',
        });
      }
    }

    const label = this.add.text(0, haloRadio + 22,
      resuelta ? 'región encendida' : (activa ? 'Acercate y entrá' : 'Esperá la pista correcta'),
      {
        fontFamily: 'sans-serif', fontSize: '13px',
        color: resuelta ? r.colorHex : '#5F5E5A',
        fontStyle: resuelta ? 'bold' : 'normal',
      }).setOrigin(0.5);
    grupo.add(label);

    this.roomLayer.add(grupo);

    // Zona overlap (si la región es la activa y no está resuelta)
    if (activa && !resuelta) {
      const zone = this.add.zone(cx, cy, 80, 80);
      this.physics.add.existing(zone, false);
      zone.body.setAllowGravity(false);
      zone.body.setImmovable(true);
      this.stationZone = zone;
      this._colliders.push(this.physics.add.overlap(this.avatar, zone, () => {
        if (this.time.now < this._stationCooldownUntil) return;
        if (this._transitioning) return;
        if (!zone.body || !zone.body.enable) return;
        zone.body.enable = false; // one-shot: bloquear re-disparo
        this._entrarEstacion(room.regionId);
      }));
    }
  }

  _construirParedes(room) {
    const M = CONFIG.mapa;
    const t = M.grosorPared;
    const w = M.salaW, h = M.salaH;
    const dw = M.anchoPuerta;
    const cx = w / 2, cy = h / 2;

    // Para cada lado: si NO hay puerta, una pared completa; si hay, dos paredes con hueco.
    const lados = [
      // norte
      { has: !!room.doors.north, dir: 'north',
        full: [w / 2, t / 2, w, t],
        gaps: [
          [(cx - dw / 2) / 2, t / 2, (cx - dw / 2), t],          // izquierda
          [cx + dw / 2 + (cx - dw / 2) / 2, t / 2, (cx - dw / 2), t], // derecha
        ],
        doorRect: { x: cx, y: t / 2 + 6, w: dw, h: t + 12 } },
      // sur
      { has: !!room.doors.south, dir: 'south',
        full: [w / 2, h - t / 2, w, t],
        gaps: [
          [(cx - dw / 2) / 2, h - t / 2, (cx - dw / 2), t],
          [cx + dw / 2 + (cx - dw / 2) / 2, h - t / 2, (cx - dw / 2), t],
        ],
        doorRect: { x: cx, y: h - t / 2 - 6, w: dw, h: t + 12 } },
      // oeste
      { has: !!room.doors.west, dir: 'west',
        full: [t / 2, h / 2, t, h],
        gaps: [
          [t / 2, (cy - dw / 2) / 2, t, (cy - dw / 2)],
          [t / 2, cy + dw / 2 + (cy - dw / 2) / 2, t, (cy - dw / 2)],
        ],
        doorRect: { x: t / 2 + 6, y: cy, w: t + 12, h: dw } },
      // este
      { has: !!room.doors.east, dir: 'east',
        full: [w - t / 2, h / 2, t, h],
        gaps: [
          [w - t / 2, (cy - dw / 2) / 2, t, (cy - dw / 2)],
          [w - t / 2, cy + dw / 2 + (cy - dw / 2) / 2, t, (cy - dw / 2)],
        ],
        doorRect: { x: w - t / 2 - 6, y: cy, w: t + 12, h: dw } },
    ];

    for (const l of lados) {
      if (!l.has) {
        this._wall(l.full[0], l.full[1], l.full[2], l.full[3]);
      } else {
        for (const g of l.gaps) {
          if (g[2] > 0 && g[3] > 0) this._wall(g[0], g[1], g[2], g[3]);
        }
        this._puerta(room, l);
      }
    }
  }

  _wall(cx, cy, w, h) {
    // Cuerpo físico invisible (mantiene la colisión rectangular limpia)
    const phys = this.add.rectangle(cx, cy, w, h, 0x000000, 0);
    this.physics.add.existing(phys, true);
    this.wallsGroup.add(phys);

    // Visual: pared de "tejido cerebral" — rosa apagado en lugar de marrón.
    const wallFill = 0xc9a8a3;
    const wallStroke = 0x8e645e;
    const r = this.add.rectangle(cx, cy, w, h, wallFill, 1).setStrokeStyle(2, wallStroke, 1);
    r.setDepth(2);
    this.roomLayer.add(r);

    // Textura de "membrana": puntos pequeños distribuidos
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x8e645e, 0.35);
    const cols = Math.max(3, Math.floor(w / 18));
    const rows = Math.max(2, Math.floor(h / 18));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = cx - w / 2 + (i + 0.5) * (w / cols);
        const y = cy - h / 2 + (j + 0.5) * (h / rows);
        g.fillCircle(x, y, 1.3);
      }
    }

    // Bumps orgánicos en la cara interior — pequeños semicírculos que dan
    // la sensación de tejido pulsante. Detectamos qué lado es "interior"
    // según la posición de la pared respecto al centro de la sala.
    const M = CONFIG.mapa;
    const isHorizontal = w > h;
    if (isHorizontal) {
      const isTop = cy < M.salaH / 2;
      const yInner = isTop ? cy + h / 2 : cy - h / 2;
      const dirY = isTop ? 1 : -1;
      const spacing = 36;
      for (let x = cx - w / 2 + spacing; x < cx + w / 2 - spacing; x += spacing) {
        g.fillStyle(wallFill, 1);
        g.fillCircle(x, yInner + dirY * 0, 4);
        g.lineStyle(2, wallStroke, 1);
        g.strokeCircle(x, yInner + dirY * 0, 4);
      }
    } else {
      const isLeft = cx < M.salaW / 2;
      const xInner = isLeft ? cx + w / 2 : cx - w / 2;
      const dirX = isLeft ? 1 : -1;
      const spacing = 36;
      for (let y = cy - h / 2 + spacing; y < cy + h / 2 - spacing; y += spacing) {
        g.fillStyle(wallFill, 1);
        g.fillCircle(xInner + dirX * 0, y, 4);
        g.lineStyle(2, wallStroke, 1);
        g.strokeCircle(xInner + dirX * 0, y, 4);
      }
    }

    this.roomLayer.add(g);
  }

  _puerta(room, lado) {
    const destRoomId = room.doors[lado.dir];
    const dest = CONFIG.mapa.rooms[destRoomId];
    const tintColor = dest && dest.regionId
      ? CONFIG.regiones[dest.regionId].color
      : 0x2e5fa3;
    const tintHex = dest && dest.regionId
      ? CONFIG.regiones[dest.regionId].colorHex
      : '#2E5FA3';

    // Marco visual de la puerta (rectángulo coloreado más sólido que en v2)
    const dr = lado.doorRect;
    const door = this.add.rectangle(dr.x, dr.y, dr.w, dr.h, tintColor, 0.55)
      .setStrokeStyle(3, tintColor, 1)
      .setDepth(1);
    this.roomLayer.add(door);
    this.tweens.add({
      targets: door, alpha: { from: 0.45, to: 0.75 },
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Flecha apuntando hacia afuera (el sentido de la puerta)
    const arrow = this._dibujarFlechaPuerta(dr, lado.dir, 0xffffff);
    this.roomLayer.add(arrow);

    // Etiqueta con el nombre del destino, fuera de la zona de paso
    const lblPos = this._posLabelPuerta(dr, lado.dir);
    const label = this.add.text(lblPos.x, lblPos.y, dest ? dest.nombre : '', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: tintHex,
      fontStyle: 'bold',
      backgroundColor: '#fbfaf7cc',
      padding: { x: 6, y: 2 },
    }).setOrigin(lblPos.ox, lblPos.oy).setDepth(2);
    this.roomLayer.add(label);

    // Zona overlap para trigger
    const zone = this.add.zone(dr.x, dr.y, dr.w, dr.h);
    this.physics.add.existing(zone, false);
    zone.body.setAllowGravity(false);
    zone.body.setImmovable(true);
    this._colliders.push(this.physics.add.overlap(this.avatar, zone, () => {
      if (this._transitioning) return;
      if (!zone.body || !zone.body.enable) return;
      zone.body.enable = false; // one-shot: no re-disparar la misma puerta
      this._cambiarSala(destRoomId, lado.dir);
    }));
    this.doorsGroup.add(zone);

    // Bloqueador de puerta para pulsos: rectángulo invisible que cubre el
    // hueco. Sólo colisiona con pulsos (configurado en wallsGroup/blockers).
    // El avatar lo atraviesa porque no participa de este collider.
    const blocker = this.add.rectangle(dr.x, dr.y, dr.w, dr.h, 0x000000, 0);
    this.physics.add.existing(blocker, true);
    this.pulseDoorBlockersGroup.add(blocker);
  }

  _dibujarFlechaPuerta(dr, dir, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 0.95);
    const s = 12;
    // Triángulo apuntando hacia afuera del lado
    const cx = dr.x, cy = dr.y;
    let p;
    switch (dir) {
      case 'north': p = [cx - s, cy + s/2, cx + s, cy + s/2, cx, cy - s]; break;
      case 'south': p = [cx - s, cy - s/2, cx + s, cy - s/2, cx, cy + s]; break;
      case 'east':  p = [cx - s/2, cy - s, cx - s/2, cy + s, cx + s, cy]; break;
      case 'west':  p = [cx + s/2, cy - s, cx + s/2, cy + s, cx - s, cy]; break;
    }
    g.fillTriangle(p[0], p[1], p[2], p[3], p[4], p[5]);
    g.setDepth(2);
    return g;
  }

  _posLabelPuerta(dr, dir) {
    switch (dir) {
      case 'north': return { x: dr.x, y: dr.y + dr.h / 2 + 8, ox: 0.5, oy: 0 };
      case 'south': return { x: dr.x, y: dr.y - dr.h / 2 - 8, ox: 0.5, oy: 1 };
      case 'east':  return { x: dr.x - dr.w / 2 - 8, y: dr.y, ox: 1, oy: 0.5 };
      case 'west':  return { x: dr.x + dr.w / 2 + 8, y: dr.y, ox: 0, oy: 0.5 };
    }
    return { x: dr.x, y: dr.y, ox: 0.5, oy: 0.5 };
  }

  _posicionarAvatarEnSpawn(room, spawnFromDoor) {
    const M = CONFIG.mapa;
    const margin = M.grosorPared + 50;
    let x = M.salaW / 2, y = M.salaH / 2;

    if (!spawnFromDoor) {
      // Spawn centrado (entrada inicial o vuelta desde estación)
      x = M.salaW / 2; y = M.salaH / 2;
      // Si es región y está resuelta, alejar del acceso para no re-trigger
      if (room.regionId && GameState.esRegionResuelta(room.regionId)) {
        // Spawnear cerca de una puerta cualquiera
        const firstDoor = Object.keys(room.doors)[0];
        if (firstDoor) spawnFromDoor = firstDoor;
      }
    }
    if (spawnFromDoor) {
      switch (spawnFromDoor) {
        case 'north': x = M.salaW / 2; y = margin; break;
        case 'south': x = M.salaW / 2; y = M.salaH - margin; break;
        case 'west':  x = margin;       y = M.salaH / 2; break;
        case 'east':  x = M.salaW - margin; y = M.salaH / 2; break;
      }
    }
    this.avatar.setPosition(x, y);
    this.avatar.setVelocity(0, 0);
    // Cooldown para no re-trigger inmediato de la estación al entrar a sala
    this._stationCooldownUntil = this.time.now + 400;
  }

  // --------------------------------------------------------------------------
  // Pulsos de estrés (Sección 5.3)
  // --------------------------------------------------------------------------
  _crearPulsos(n) {
    const M = CONFIG.mapa;
    const t = M.grosorPared;
    const P = CONFIG.pulsosEstres;
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(t + 40, M.salaW - t - 40);
      const y = Phaser.Math.Between(t + 40, M.salaH - t - 40);
      const sprite = this.physics.add.sprite(x, y, 'pulsoEstres');
      sprite.setDepth(5);
      sprite.body.setCircle(P.radio, sprite.width / 2 - P.radio, sprite.height / 2 - P.radio);
      sprite.body.setBounce(1, 1);
      sprite.body.setCollideWorldBounds(false);
      // Velocidad inicial aleatoria
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const factor = 1 + (Math.random() * 2 - 1) * P.velocidadVariacion;
      const speed = P.velocidad * factor;
      sprite.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      sprite._baseSpeed = speed;
      // Wander: próximo cambio de dirección
      sprite._nextWander = this.time.now + Phaser.Math.Between(
        P.wanderIntervaloMinMs, P.wanderIntervaloMaxMs);

      // Halo decorativo (en grupo para que se destruya con la sala)
      const halo = this.add.image(x, y, 'pulsoHalo').setDepth(4);
      this.haloGroup.add(halo);
      sprite._halo = halo;
      // Sync halo con sprite cada frame se hace en update

      // Rotación visual continua
      this.tweens.add({
        targets: sprite, angle: 360,
        duration: 1800, repeat: -1, ease: 'Linear',
      });

      this.pulsesGroup.add(sprite);
    }
  }

  _onPulsoHit(avatar, pulso) {
    const P = CONFIG.pulsosEstres;
    const V = CONFIG.vida;
    if (this.time.now - avatar.lastHitTime < P.cooldownColisionMs) return;
    avatar.lastHitTime = this.time.now;

    // Vida: bajar un corazón. Nunca por debajo de 0.
    GameState.colisionesCortisol = (GameState.colisionesCortisol || 0) + 1;
    if (GameState.vida > 0) GameState.vida = Math.max(0, GameState.vida - 1);

    // Stun se hace más largo a medida que perdemos vida.
    const corazonesPerdidos = V.max - GameState.vida;
    const stunMul = 1 + corazonesPerdidos * V.factorStunPorCorazonPerdido;
    avatar.stunUntil = this.time.now + P.duracionStunMs * stunMul;

    // Feedback visual: tintar avatar + shake
    this.avatar.setTint(0xff8c66);
    this.time.delayedCall(P.duracionStunMs * stunMul, () => this.avatar && this.avatar.clearTint());
    this.cameras.main.shake(140, 0.005);

    // Empuje en dirección opuesta
    const dx = avatar.x - pulso.x;
    const dy = avatar.y - pulso.y;
    const len = Math.hypot(dx, dy) || 1;
    avatar.setVelocity((dx / len) * 90, (dy / len) * 90);

    // Aviso al HUD para que actualice la barra de vida
    this.game.events.emit('sinapsis:vidaCambio', GameState.vida);
  }

  // --------------------------------------------------------------------------
  // Transición entre salas
  // --------------------------------------------------------------------------
  _cambiarSala(destRoomId, exitDir) {
    if (this._transitioning) return;
    this._transitioning = true;
    const spawnDir = OPPOSITE[exitDir];

    this.cameras.main.fadeOut(220, 251, 250, 247);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this._cargarSala(destRoomId, spawnDir);
      this.cameras.main.fadeIn(220, 251, 250, 247);
      this.cameras.main.once('camerafadeincomplete', () => {
        this._transitioning = false;
      });
    });
  }

  _entrarEstacion(regionId) {
    if (this._transitioning) return;
    const key = STATION_SCENE[regionId];
    if (!key) return;
    this._transitioning = true;
    this.cameras.main.fadeOut(280, 251, 250, 247);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.sleep('MapScene');
      this.scene.run(key);
      this.scene.bringToTop('HudScene');
      this._transitioning = false;
    });
  }

  // --------------------------------------------------------------------------
  // Partículas ambiente
  // --------------------------------------------------------------------------
  _crearParticulasFondo() {
    const M = CONFIG.mapa;
    // Partículas lentas como impulsos nerviosos. Phaser 3.60+ usa add.particles.
    try {
      this.particulas = this.add.particles(0, 0, 'particula', {
        x: { min: 0, max: M.salaW }, y: { min: 0, max: M.salaH },
        lifespan: 6000, quantity: 1, frequency: 700,
        scale: { start: 0.6, end: 0 }, alpha: { start: 0.35, end: 0 },
        speed: { min: 6, max: 18 },
        blendMode: 'ADD',
      }).setDepth(1).setAlpha(0.6);
    } catch (e) {
      // Si la API difiere, ignorar — son decorativas.
    }
  }

  // --------------------------------------------------------------------------
  // Update
  // --------------------------------------------------------------------------
  update(time, delta) {
    if (GameState.juegoBloqueadoPorTiempo) {
      if (this.avatar) this.avatar.setVelocity(0, 0);
      return;
    }

    const v = CONFIG.velocidadAvatar;
    const V = CONFIG.vida;
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;

    // Velocidad máx se reduce con cada corazón perdido (mínimo 70 %).
    const corazonesPerdidos = V.max - GameState.vida;
    const factorVida = Math.max(0.7, 1 - corazonesPerdidos * V.factorVelocidadPorCorazonPerdido);

    const stunned = time < this.avatar.stunUntil;
    const accel = stunned ? v.acceleration * 0.3 : v.acceleration;
    const baseMax = v.maxSpeed * factorVida;
    const maxV = stunned ? baseMax * CONFIG.pulsosEstres.factorVelocidadStun : baseMax;
    this.avatar.setMaxVelocity(maxV, maxV);

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      this.avatar.setAcceleration(dx * accel, dy * accel);
    } else {
      this.avatar.setAcceleration(0, 0);
    }

    // Sync glow with avatar
    if (this.avatarGlow) {
      this.avatarGlow.x = this.avatar.x;
      this.avatarGlow.y = this.avatar.y;
    }

    // Sync halos con pulsos + wander de dirección + anti-stuck
    const P = CONFIG.pulsosEstres;
    const now = time;
    this.pulsesGroup.children.iterate((p) => {
      if (!p) return;
      if (p._halo) { p._halo.x = p.x; p._halo.y = p.y; }
      if (!p.body) return;
      const vx = p.body.velocity.x, vy = p.body.velocity.y;
      const mag = Math.hypot(vx, vy);
      // Anti-stuck: si quedó muy lento por colisiones, pegale un empujón.
      if (mag < P.velocidadMinima) {
        const ang = Math.random() * Math.PI * 2;
        const target = p._baseSpeed || P.velocidad;
        p.body.setVelocity(Math.cos(ang) * target, Math.sin(ang) * target);
        return;
      }
      // Wander: rotación periódica de la dirección.
      if (p._nextWander && now >= p._nextWander) {
        const ang = Math.atan2(vy, vx);
        const delta = (Math.random() * 2 - 1) * P.wanderAnguloMax;
        const newAng = ang + delta;
        p.body.setVelocity(Math.cos(newAng) * mag, Math.sin(newAng) * mag);
        p._nextWander = now + Phaser.Math.Between(P.wanderIntervaloMinMs, P.wanderIntervaloMaxMs);
      }
    });

    // Audio tick: hay progreso si hay input o si está stunneado (= recién interactuó)
    const hayProgreso = (dx !== 0 || dy !== 0);
    if (this.sm) this.sm.tick(delta, hayProgreso);
  }
}

// PRNG simple para que la trama de cada sala sea estable entre cargas.
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function roomSeed(room) {
  // hash simple del nombre
  let h = 0;
  const s = room.nombre || 'sala';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
