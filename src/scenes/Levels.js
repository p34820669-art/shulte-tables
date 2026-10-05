import Phaser from 'phaser';
import { W, H, M, C, WORLDS, worldLevels } from '../config.js';
import { save } from '../save.js';
import { sfx, applyMute } from '../audio.js';
import { txt, pill, iconButton, burst, cover, go, fadeIn } from '../ui.js';

const TILE = 170;
const GAP = 36;
const COLS = 3;
const TOP = 215;
const ROW = TILE + 64; // row pitch leaves room for the stars under each tile

export default class Levels extends Phaser.Scene {
  constructor() { super('Levels'); }

  init(data) {
    this._leaving = false;
    this.focus = data.focus ?? save.currentLevel();
    this.pop = data.pop ?? null;
    this.dragDist = 0;
    this.vel = 0;
    this.tiles = {};
  }

  create() {
    applyMute(this);
    fadeIn(this);
    cover(this, 'bg_game').setScrollFactor(0);
    const cam = this.cameras.main;

    let y = TOP;
    const x0 = (W - (COLS * TILE + (COLS - 1) * GAP)) / 2 + TILE / 2;
    WORLDS.forEach((world, wi) => {
      const { from, to } = worldLevels(wi);
      txt(this, W / 2, y, `Мир ${wi + 1}`, 30).setDepth(2).setAlpha(0.85);
      txt(this, W / 2, y + 52, world.title, 50).setDepth(2);
      let earned = 0;
      for (let n = from; n <= to; n++) earned += save.stars(n);
      txt(this, W / 2, y + 112, `${earned} / ${(to - from + 1) * 3} звёзд`, 28, { color: C.gold }).setDepth(2);
      y += 170;
      for (let n = from; n <= to; n++) {
        const i = n - from;
        const tx = x0 + (i % COLS) * (TILE + GAP);
        const ty = y + Math.floor(i / COLS) * ROW + TILE / 2;
        this.makeTile(n, tx, ty);
      }
      const rows = Math.ceil((to - from + 1) / COLS);
      y += rows * ROW + 50;
    });
    this.maxScroll = Math.max(0, y + 20 - H);
    cam.setBounds(0, 0, W, Math.max(H, y + 20));

    this.buildHeader();
    this.setupScroll();

    // Start with the current level in view.
    const f = this.tiles[this.focus];
    if (f) cam.scrollY = Phaser.Math.Clamp(f.y - H * 0.45, 0, this.maxScroll);

    if (this.pop && this.tiles[this.pop]) this.popTile(this.tiles[this.pop]);
  }

  buildHeader() {
    const g = this.add.graphics().setScrollFactor(0).setDepth(90);
    // Soft fade so scrolling tiles slide under the header.
    for (let i = 0; i < 28; i++) {
      g.fillStyle(0x2f4fb5, 0.9 * (1 - i / 28)).fillRect(0, 130 + i * 3, W, 3);
    }
    g.fillStyle(0x2f4fb5, 0.9).fillRect(0, 0, W, 130);

    const back = iconButton(this, M + 42, 70, 'back', 84, () => go(this, 'Menu'), 'back');
    back.setScrollFactor(0).setDepth(100);
    const title = pill(this, W / 2, 70, 330, 84).setScrollFactor(0).setDepth(100);
    const tt = txt(this, W / 2, 68, 'Выбери уровень', 33).setScrollFactor(0).setDepth(101);

    const sp = pill(this, W - M - 75, 70, 150, 72).setScrollFactor(0).setDepth(100);
    const star = this.add.image(W - M - 75 - 42, 68, 'star').setScale(46 / 280).setScrollFactor(0).setDepth(101);
    const st = txt(this, W - M - 75 + 14, 68, String(save.totalStars()), 34).setScrollFactor(0).setDepth(101);
    this.headerParts = [title, tt, sp, star, st];
  }

  makeTile(n, x, y) {
    const unlocked = save.isUnlocked(n);
    const stars = save.stars(n);
    const current = unlocked && stars === 0;
    const bg = this.add.image(0, 0, unlocked ? 'tile' : 'tile_lock').setDisplaySize(TILE, TILE);
    // Beaten levels get a mint tint, the next level a warm gold one.
    if (stars > 0) bg.setTint(0xb4f1d2);
    else if (current) bg.setTint(0xfff0a6);
    const parts = [bg];
    if (unlocked) {
      parts.push(txt(this, 0, -14, String(n), 64, { color: C.ink, sw: 0, shadow: false }));
    }
    // Three small stars under each tile.
    for (let i = 0; i < 3; i++) {
      const k = i < stars ? 'star' : 'star_empty';
      const s = this.add.image((i - 1) * 40, TILE / 2 + 26, k);
      s.setScale(36 / s.width);
      parts.push(s);
    }
    const c = this.add.container(x, y, parts).setDepth(3);
    c.n = n;
    c.bg = bg;
    c.setSize(TILE, TILE);
    bg.setInteractive({ useHandCursor: unlocked });
    bg.on('pointerdown', () => { this.dragDist = 0; });
    bg.on('pointerup', () => {
      if (this.dragDist > 14) return;
      this.pick(c);
    });
    bg.on('pointerover', () => { if (unlocked) this.tweens.add({ targets: c, scale: 1.06, duration: 100 }); });
    bg.on('pointerout', () => { this.tweens.add({ targets: c, scale: 1, duration: 120 }); });
    if (current) {
      this.tweens.add({ targets: c, scale: 1.09, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
    this.tiles[n] = c;
    return c;
  }

  pick(c) {
    if (this._leaving) return;
    if (!save.isUnlocked(c.n)) {
      sfx(this, 'locked');
      this.tweens.add({ targets: c, x: { from: c.x - 8, to: c.x + 8 }, duration: 55, yoyo: true, repeat: 3, onComplete: () => { c.x = Math.round(c.x); } });
      return;
    }
    sfx(this, 'start');
    go(this, 'Game', { level: c.n });
  }

  popTile(c) {
    c.setScale(0.2);
    sfx(this, 'unlock');
    this.tweens.add({
      targets: c, scale: 1, duration: 500, ease: 'Back.Out', delay: 250,
      onStart: () => burst(this, c.x, c.y, { n: 16, scale: 0.6, speed: [140, 380], life: 800, depth: 20 }),
    });
  }

  setupScroll() {
    const cam = this.cameras.main;
    this.input.on('pointermove', (p) => {
      if (!p.isDown) return;
      const dy = p.y - p.prevPosition.y;
      this.dragDist += Math.abs(dy);
      if (this.dragDist > 6) {
        cam.scrollY = Phaser.Math.Clamp(cam.scrollY - dy, 0, this.maxScroll);
        this.vel = -dy;
      }
    });
    this.input.on('wheel', (p, o, dx, dy) => {
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy * 0.8, 0, this.maxScroll);
    });
  }

  update() {
    const cam = this.cameras.main;
    if (!this.input.activePointer.isDown && Math.abs(this.vel) > 0.3) {
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY + this.vel, 0, this.maxScroll);
      this.vel *= 0.94;
    }
  }
}
