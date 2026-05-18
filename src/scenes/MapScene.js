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
    this._colliders.push(this.physics.add.overlap(this.avatar, this.pulsesGroup, this._onPulsoHit, null, this));

    // Notificar HUD que la sala cambió (para el minimapa)
    this.game.events.emit('sinapsis:cambioSala', roomId);
  }

  _dibujarTramaCelular(w, h, room) {
    const g = this.add.graphics();
    g.lineStyle(1, 0xc9a8a3, 0.18);
    // Puntos dispersos como "células"
    const rand = mulberry32(roomSeed(room));
    for (let i = 0; i < 35; i++) {
      const x = 40 + rand() * (w - 80);
      const y = 40 + rand() * (h - 80);
      const r = 6 + rand() * 12;
      g.strokeCircle(x, y, r);
    }
    g.setAlpha(0.6);
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

    // Halo / pad de acceso
    const haloRadio = 84;
    const halo = this.add.circle(0, 0, haloRadio, r.color, resuelta ? 0.35 : (activa ? 0.22 : 0.12))
      .setStrokeStyle(3, r.color, resuelta ? 1 : (activa ? 0.85 : 0.5));
    grupo.add(halo);

    if (resuelta) {
      // Pulso encendido (glow que crece y vuelve)
      this.tweens.add({
        targets: halo, scale: { from: 1, to: 1.08 }, alpha: { from: 0.35, to: 0.5 },
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      // Núcleo brillante
      const inner = this.add.circle(0, 0, 36, r.color, 1);
      grupo.add(inner);
      const shine = this.add.circle(-10, -10, 12, 0xffffff, 0.5);
      grupo.add(shine);
    } else {
      // Núcleo apagado
      const inner = this.add.circle(0, 0, 36, r.color, 0.3).setStrokeStyle(2, r.color, 0.7);
      grupo.add(inner);
      if (activa) {
        // Anillos pulsantes para indicar "entrar acá"
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
      this.stationZone = this.add.zone(cx, cy, 80, 80);
      this.physics.add.existing(this.stationZone, false);
      this.stationZone.body.setAllowGravity(false);
      this.stationZone.body.setImmovable(true);
      this._colliders.push(this.physics.add.overlap(this.avatar, this.stationZone, () => {
        if (this.time.now < this._stationCooldownUntil) return;
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
    const wallColor = 0x6e4d4a;
    const r = this.add.rectangle(cx, cy, w, h, wallColor, 1).setStrokeStyle(2, 0x4a302d, 1);
    r.setDepth(2);
    this.physics.add.existing(r, true); // static body
    this.wallsGroup.add(r);
  }

  _puerta(room, lado) {
    const destRoomId = room.doors[lado.dir];
    const dest = CONFIG.mapa.rooms[destRoomId];
    const tintColor = dest && dest.regionId
      ? CONFIG.regiones[dest.regionId].color
      : 0x2e5fa3;

    // Marco visual de la puerta (arco)
    const dr = lado.doorRect;
    const door = this.add.rectangle(dr.x, dr.y, dr.w, dr.h, tintColor, 0.35)
      .setStrokeStyle(2, tintColor, 0.85)
      .setDepth(1);
    this.roomLayer.add(door);
    // Pulsación suave para indicar "esto es una puerta"
    this.tweens.add({
      targets: door, alpha: { from: 0.25, to: 0.55 },
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Zona overlap para trigger
    const zone = this.add.zone(dr.x, dr.y, dr.w, dr.h);
    this.physics.add.existing(zone, false);
    zone.body.setAllowGravity(false);
    zone.body.setImmovable(true);
    this._colliders.push(this.physics.add.overlap(this.avatar, zone, () => {
      if (this._transitioning) return;
      this._cambiarSala(destRoomId, lado.dir);
    }));
    this.doorsGroup.add(zone);
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
      // Velocidad aleatoria
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const factor = 1 + (Math.random() * 2 - 1) * P.velocidadVariacion;
      const v = P.velocidad * factor;
      sprite.body.setVelocity(Math.cos(angle) * v, Math.sin(angle) * v);

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
    if (this.time.now - avatar.lastHitTime < P.cooldownColisionMs) return;
    avatar.lastHitTime = this.time.now;
    avatar.stunUntil = this.time.now + P.duracionStunMs;

    // Feedback visual: tintar avatar y empujar
    this.avatar.setTint(0xff8c66);
    this.time.delayedCall(P.duracionStunMs, () => this.avatar && this.avatar.clearTint());
    // Pequeño shake de cámara
    this.cameras.main.shake(120, 0.004);

    // Empuje sutil en dirección opuesta al pulso
    const dx = avatar.x - pulso.x;
    const dy = avatar.y - pulso.y;
    const len = Math.hypot(dx, dy) || 1;
    avatar.setVelocity((dx / len) * 80, (dy / len) * 80);
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
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) dy += 1;

    const stunned = time < this.avatar.stunUntil;
    const accel = stunned ? v.acceleration * 0.3 : v.acceleration;
    const maxV = stunned ? v.maxSpeed * CONFIG.pulsosEstres.factorVelocidadStun : v.maxSpeed;
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

    // Sync halos with pulses
    this.pulsesGroup.children.iterate((p) => {
      if (p && p._halo) {
        p._halo.x = p.x;
        p._halo.y = p.y;
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
