// ============================================================================
// Sinapsis — Gestor de audio dinámico (Sección 8 del spec)
// ----------------------------------------------------------------------------
// Tres capas + sting:
//   - ambient: bucle base, siempre sonando durante el desarrollo.
//   - tension: se sube cuando hay >umbral segundos sin progreso, se baja al
//     resolver una estación o salir de la estación.
//   - resolution: fragmento corto al resolver una estación.
//   - sting:    sonido corto al iluminar una región.
//
// El SoundManager se monta sobre la game.registry para sobrevivir cambios de
// escena. Reemplazar los .wav placeholder en assets/audio/ no requiere tocar
// nada de este archivo.
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
    this.tensionRaising = false;
    this.tensionTimer = 0; // ms acumulados sin progreso
    this._lastUpdate = 0;
  }

  attachScene(scene) {
    // Cada escena nueva: re-creamos los handles para no perder referencias al
    // sound manager subyacente entre transiciones.
    this.scene = scene;
    const sound = scene.sound;

    const ensure = (key, opts) => {
      if (this.sounds[key] && this.sounds[key].manager && !this.sounds[key].manager.destroyed) return;
      try {
        this.sounds[key] = sound.add(key, opts);
      } catch (e) {
        // Si el asset no cargó, dejamos un stub no-op
        this.sounds[key] = { play: () => {}, stop: () => {}, setVolume: () => {}, isPlaying: false };
      }
    };

    ensure('ambient', { loop: true, volume: CONFIG.audio.volumenAmbient });
    ensure('tension', { loop: true, volume: 0 });
    ensure('resolution', { loop: false, volume: CONFIG.audio.volumenResolution });
    ensure('stingLogro', { loop: false, volume: CONFIG.audio.volumenSting });

    if (!this.sounds.ambient.isPlaying) {
      try { this.sounds.ambient.play(); } catch (e) {}
    }
    if (!this.sounds.tension.isPlaying) {
      try { this.sounds.tension.play(); } catch (e) {}
    }
  }

  // Llamar desde update() de la escena.
  tick(deltaMs, hayProgreso) {
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

  playResolution() {
    try { this.sounds.resolution.play(); } catch (e) {}
  }

  playSting() {
    try { this.sounds.stingLogro.play(); } catch (e) {}
  }

  // Reproducir un sample por key arbitrario (rhythm-1, emotion-calma, etc.)
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
}
