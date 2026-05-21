// ============================================================================
// Sinapsis — Gestor de audio dinámico (Sección 8 del spec)
// ----------------------------------------------------------------------------
// Tres capas + sting:
//   - ambient: bucle base, siempre sonando en el mapa. Se desvanece al entrar
//     a una estación (para hacer la prueba en silencio) y vuelve al salir.
//   - tension: se sube cuando hay >umbral segundos sin progreso, se baja al
//     resolver una estación o salir.
//   - resolution: fragmento corto al resolver una estación.
//   - sting: sonido corto al iluminar una región.
//
// Además ofrece `playExclusive(grupo, key, vol)`: detiene cualquier sonido
// anterior del mismo "grupo" (ej. fragmentos de Amígdala) antes de tocar el
// nuevo, para evitar superposiciones.
//
// El SoundManager se monta sobre la game.registry para sobrevivir cambios de
// escena.
// ============================================================================

import { CONFIG } from './config.js';

const KEY = '__sinapsisSoundManager';

export function getSoundManager(scene) {
  let sm = scene.game.registry.get(KEY);
  if (!sm) {
    sm = new SoundManager(scene.game);
    scene.game.registry.set(KEY, sm);
  }
  sm.attachScene(scene);
  return sm;
}

class SoundManager {
  constructor(game) {
    this.game = game;
    this.sounds = {};
    this.tensionTimer = 0;
    this._ambientFadeTween = null;
    this._exclusivePlaying = {};   // { grupo: soundInstance }
    this._ambientTargetVol = CONFIG.audio.volumenAmbient;
  }

  attachScene(scene) {
    this.scene = scene;
    const sound = scene.sound;

    const ensure = (key, opts) => {
      if (this.sounds[key] && this.sounds[key].manager && !this.sounds[key].manager.destroyed) return;
      try {
        this.sounds[key] = sound.add(key, opts);
      } catch (e) {
        this.sounds[key] = { play: () => {}, stop: () => {}, setVolume: () => {}, isPlaying: false };
      }
    };

    ensure('ambient', { loop: true, volume: this._ambientTargetVol });
    ensure('tension', { loop: true, volume: 0 });
    ensure('resolution', { loop: false, volume: CONFIG.audio.volumenResolution });
    ensure('stingLogro', { loop: false, volume: CONFIG.audio.volumenSting });

    // Aseguramos que ambient esté en loop infinito y sonando.
    this._asegurarAmbient();
    if (!this.sounds.tension.isPlaying) {
      try { this.sounds.tension.play(); } catch (e) {}
    }
  }

  // Watchdog: si por cualquier motivo ambient se detuvo, lo reiniciamos.
  // Phaser con `loop: true` debería reproducir indefinidamente, pero en algunos
  // edge cases (cambio de contexto, end de buffer mp3) puede quedar detenido.
  // Esta función se llama desde tick() en cada update.
  _asegurarAmbient() {
    const s = this.sounds.ambient;
    if (!s || !s.manager || s.manager.destroyed) return;
    if (typeof s.setLoop === 'function') s.setLoop(true);
    else if ('loop' in s) s.loop = true;
    if (!s.isPlaying) {
      try { s.play(); } catch (e) {}
    }
  }

  // --------------------------------------------------------------------------
  // Tick general (llamado desde update de cada escena)
  // --------------------------------------------------------------------------
  tick(deltaMs, hayProgreso) {
    this._asegurarAmbient();
    if (hayProgreso) {
      this.tensionTimer = 0;
      this._fadeTension(0, 0.15);
      return;
    }
    this.tensionTimer += deltaMs;
    if (this.tensionTimer >= CONFIG.audio.umbralTensionSegundos * 1000) {
      this._fadeTension(CONFIG.audio.volumenTensionMax, 0.01);
    }
  }

  _fadeTension(target, step) {
    const s = this.sounds.tension;
    if (!s || typeof s.volume !== 'number') return;
    const cur = s.volume;
    let next = cur;
    if (cur < target) next = Math.min(target, cur + step);
    else if (cur > target) next = Math.max(target, cur - step);
    if (next !== cur) s.setVolume(next);
  }

  resetTensionTimer() {
    this.tensionTimer = 0;
    this._fadeTension(0, 1);
  }

  // --------------------------------------------------------------------------
  // Fade del ambient — usado al entrar/salir de estaciones
  // --------------------------------------------------------------------------
  fadeAmbient(targetVol, durationMs = 500) {
    const s = this.sounds.ambient;
    if (!s || typeof s.volume !== 'number') return;
    // Cancelar tween anterior
    if (this._ambientFadeTween) { this._ambientFadeTween.stop(); this._ambientFadeTween = null; }
    if (!this.scene || !this.scene.tweens) {
      s.setVolume(targetVol);
      return;
    }
    this._ambientFadeTween = this.scene.tweens.add({
      targets: s, volume: targetVol, duration: durationMs,
      onComplete: () => { this._ambientFadeTween = null; },
    });
  }

  silenciarAmbient(durationMs = 500) {
    this.fadeAmbient(0, durationMs);
  }

  restaurarAmbient(durationMs = 600) {
    this.fadeAmbient(this._ambientTargetVol, durationMs);
    // Si quedó detenido por cualquier motivo, reiniciar.
    this._asegurarAmbient();
  }

  // --------------------------------------------------------------------------
  // Stings + one-shots
  // --------------------------------------------------------------------------
  playResolution() {
    try { this.sounds.resolution.play(); } catch (e) {}
  }

  playSting() {
    try { this.sounds.stingLogro.play(); } catch (e) {}
  }

  // Reproducir un sample por key arbitrario.
  playOneShot(key, volume) {
    try {
      const s = this.scene.sound.add(key, { loop: false, volume: volume ?? 0.7 });
      s.once('complete', () => s.destroy());
      s.play();
      return s;
    } catch (e) {
      return null;
    }
  }

  // Como playOneShot pero si ya hay un sonido del mismo "grupo" sonando, lo
  // detiene primero. Pensado para los fragmentos de Amígdala: no se superponen.
  // También recorre game.sound.sounds y mata cualquier sonido residual de
  // la misma key — esto cubre casos donde se reprodujo via playOneShot
  // antes de que existiera playExclusive, o donde el tracking falló.
  playExclusive(grupo, key, volume) {
    // 1) Parar el "previous" tracked si existe.
    const prev = this._exclusivePlaying[grupo];
    if (prev) {
      this._silenciarYDestruir(prev);
      this._exclusivePlaying[grupo] = null;
    }
    // 2) Defensa extra: por si el tracking falló o hay sonidos huérfanos de
    //    cualquier emoción del mismo grupo, los matamos también.
    if (grupo === 'emocion') {
      const claves = ['emotionCalma', 'emotionTension', 'emotionAlegria', 'emotionTristeza'];
      try {
        for (const k of claves) {
          const restantes = this.scene.sound.sounds.filter(
            (sd) => sd && sd.key === k && sd.isPlaying,
          );
          for (const sd of restantes) this._silenciarYDestruir(sd);
        }
      } catch (e) {}
    }
    // 3) Tocar el nuevo
    const s = this.playOneShot(key, volume);
    if (s) {
      this._exclusivePlaying[grupo] = s;
      s.once('complete', () => {
        if (this._exclusivePlaying[grupo] === s) this._exclusivePlaying[grupo] = null;
      });
    }
    return s;
  }

  stopExclusive(grupo) {
    const prev = this._exclusivePlaying[grupo];
    if (prev) {
      this._silenciarYDestruir(prev);
      this._exclusivePlaying[grupo] = null;
    }
    // Defensa adicional: matar cualquier sonido emocional huérfano.
    if (grupo === 'emocion') {
      const claves = ['emotionCalma', 'emotionTension', 'emotionAlegria', 'emotionTristeza'];
      try {
        for (const k of claves) {
          const restantes = this.scene.sound.sounds.filter(
            (sd) => sd && sd.key === k && sd.isPlaying,
          );
          for (const sd of restantes) this._silenciarYDestruir(sd);
        }
      } catch (e) {}
    }
  }

  _silenciarYDestruir(s) {
    if (!s) return;
    try { if (typeof s.setVolume === 'function') s.setVolume(0); } catch (e) {}
    try { if (typeof s.stop === 'function') s.stop(); } catch (e) {}
    try { if (typeof s.destroy === 'function') s.destroy(); } catch (e) {}
  }
}
