import Phaser from 'phaser';
import { FONT, FONT_TEXT, C, W, H } from './config.js';
import { sfx } from './audio.js';

// Neuronus is a light hand-drawn face, so sizes are scaled up and strokes thickened to read as bold.
const FONT_SCALE = 1.22;

export function txt(scene, x, y, str, size, o = {}) {
  size = Math.round(size * FONT_SCALE);
  const color = o.color ?? C.white;
  // sw: 0 means "no outline"; a thin same-colour stroke fakes weight on dark-on-light text.
  const flat = o.sw === 0;
  const sw = flat ? Math.round(size * 0.07) : o.sw ?? Math.round(size / 5.5);
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: size + 'px',
    color,
    stroke: flat ? color : o.stroke ?? C.stroke,
    strokeThickness: sw,
    align: 'center',
    resolution: 2,
    ...(o.style ?? {}),
  }).setOrigin(0.5);
  if (o.shadow !== false && !flat) t.setShadow(0, Math.max(2, size / 14), 'rgba(25,25,100,0.35)', 0, true, true);
  return t;
}

export function cover(scene, key) {
  const bg = scene.add.image(W / 2, H / 2, key);
  bg.setScale(Math.max(W / bg.width, H / bg.height));
  return bg;
}

export function pill(scene, x, y, w, h) {
  const p = scene.add.image(x, y, 'pill');
  p.setDisplaySize(w, h);
  return p;
}

// Shared press feedback: squash on press, springy release.
function pressFx(scene, target, hit, onClick, sound) {
  let down = false;
  const release = () => {
    if (!down) return;
    down = false;
    scene.tweens.add({ targets: target, scale: 1, duration: 150, ease: 'Back.Out' });
  };
  hit.on('pointerdown', () => {
    down = true;
    scene.tweens.add({ targets: target, scale: 0.92, duration: 70, ease: 'Sine.Out' });
  });
  hit.on('pointerout', release);
  hit.on('pointerup', () => {
    if (!down) return;
    release();
    if (target.disabled) return;
    if (sound) sfx(scene, sound);
    onClick?.();
  });
}

export function button(scene, x, y, label, { w = 300, size = 40, onClick, sound = 'click', icon = null, pulse = false } = {}) {
  const img = scene.add.image(0, 0, 'btn');
  img.setScale(w / img.width);
  const h = img.displayHeight;
  const parts = [img];
  let tx = 0;
  if (icon) {
    const ic = scene.add.image(-w / 2 + h * 0.55, -h * 0.04, icon);
    ic.setScale((h * 0.6) / ic.height);
    parts.push(ic);
    tx = h * 0.42;
  }
  const t = txt(scene, tx, -h * 0.05, label, size);
  parts.push(t);
  const inner = scene.add.container(0, 0, parts);
  const outer = scene.add.container(x, y, [inner]);
  img.setInteractive({ useHandCursor: true });
  pressFx(scene, outer, img, onClick, sound);
  if (pulse) {
    scene.tweens.add({ targets: inner, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
  outer.label = t;
  outer.btnH = h;
  return outer;
}

export function iconButton(scene, x, y, key, size, onClick, sound = 'click') {
  const img = scene.add.image(0, 0, key);
  img.setScale(size / Math.max(img.width, img.height));
  const zone = scene.add.zone(0, 0, size + 36, size + 36).setInteractive({ useHandCursor: true });
  const c = scene.add.container(x, y, [img, zone]);
  pressFx(scene, c, zone, onClick, sound);
  return c;
}

// One-shot particle burst; cleans itself up.
export function burst(scene, x, y, { n = 10, key = 'spark', scale = 0.5, speed = [120, 320], tint, life = 600, depth = 30 } = {}) {
  const p = scene.add.particles(x, y, key, {
    speed: { min: speed[0], max: speed[1] },
    angle: { min: 0, max: 360 },
    scale: { start: scale, end: 0 },
    rotate: { start: 0, end: 220 },
    alpha: { start: 1, end: 0 },
    lifespan: life,
    tint: tint ?? [0xffe45c, 0xffffff, 0x9ff6ee, 0xffb3f0],
    emitting: false,
  });
  p.setDepth(depth);
  p.explode(n);
  scene.time.delayedCall(life + 100, () => p.destroy());
  return p;
}

// Fade out then switch scene; ignores repeat taps while leaving.
export function go(scene, key, data) {
  if (scene._leaving) return;
  scene._leaving = true;
  scene.cameras.main.fadeOut(170, 22, 28, 100);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

export function fadeIn(scene) {
  scene.cameras.main.fadeIn(220, 22, 28, 100);
}

// Speech bubble sized to its text. side: which edge the tail points from ('left' or 'right').
export function speech(scene, x, y, text, { w = 420, size = 34, side = 'left' } = {}) {
  const t = txt(scene, 0, 0, text, size, { color: C.ink, sw: 0, shadow: false, style: { wordWrap: { width: w - 70 } } });
  const h = t.height + 56;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 0.98).fillRoundedRect(-w / 2, -h / 2, w, h, 34);
  g.lineStyle(6, 0x9ab6ff, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 34);
  const dir = side === 'left' ? -1 : 1;
  const tail = [dir * (w / 2 - 6), h / 2 - 34, dir * (w / 2 - 6), h / 2 - 8, dir * (w / 2 + 34), h / 2 + 22];
  g.fillStyle(0xffffff, 0.98).fillTriangle(...tail);
  g.lineStyle(6, 0x9ab6ff, 1).beginPath().moveTo(tail[0], tail[1]).lineTo(tail[4], tail[5]).lineTo(tail[2], tail[3]).strokePath();
  const c = scene.add.container(x, y, [g, t]);
  c.bubbleH = h;
  return c;
}

// Plain Rubik text for information screens (the brand's text face), no outline.
export function txtR(scene, x, y, str, size, o = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT_TEXT,
    fontStyle: String(o.weight ?? 600),
    fontSize: size + 'px',
    color: o.color ?? '#11132c',
    align: o.align ?? 'center',
    resolution: 2,
    ...(o.style ?? {}),
  }).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
}

// Soft organic blob in the style of the brand's cell shapes. seed makes each one different.
export function blob(scene, x, y, r, color, seed = 1, alpha = 1) {
  const g = scene.add.graphics({ x, y });
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const k = 1 + 0.16 * Math.sin(2 * a + seed) + 0.1 * Math.sin(3 * a + seed * 2.3) + 0.06 * Math.sin(5 * a + seed * 0.7);
    pts.push({ x: Math.cos(a) * r * k, y: Math.sin(a) * r * k });
  }
  g.fillStyle(color, alpha).fillPoints(pts, true);
  return g;
}
