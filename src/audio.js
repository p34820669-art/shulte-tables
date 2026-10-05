import { save } from './save.js';

export const SFX = ['tap_ok', 'tap_bad', 'click', 'start', 'back', 'restart', 'next', 'hint', 'pointer',
  'locked', 'unlock', 'panel', 'star', 'star_empty', 'record', 'three_star', 'whoosh'];

export function sfx(scene, key, cfg = {}) {
  scene.sound.play('sfx_' + key, { volume: 0.8, ...cfg });
}

export function applyMute(scene) {
  scene.sound.mute = !save.sound;
}

export function buzz(ms) {
  try { navigator.vibrate?.(ms); } catch (e) { /* not supported */ }
}
