import Phaser from 'phaser';
import { W, H } from '../config.js';
import { SFX } from '../audio.js';

const IMAGES = ['bg_menu', 'bg_game', 'logo', 'hero', 'cloud', 'btn', 'panel', 'tile', 'tile_done', 'tile_lock',
  'star', 'star_empty', 'pill', 'stopwatch', 'bulb', 'restart', 'back', 'pointer'];

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const bar = this.add.graphics();
    const track = { x: W / 2 - 210, y: H / 2, w: 420, h: 26 };
    const draw = (p) => {
      bar.clear();
      bar.fillStyle(0xffffff, 0.25).fillRoundedRect(track.x, track.y, track.w, track.h, 13);
      if (p > 0) bar.fillStyle(0xffe45c, 1).fillRoundedRect(track.x, track.y, Math.max(26, track.w * p), track.h, 13);
    };
    draw(0);
    this.load.on('progress', draw);
    this.load.setPath('./');
    IMAGES.forEach((k) => this.load.image(k, `img/${k}.webp`));
    SFX.forEach((k) => this.load.audio('sfx_' + k, `sfx/${k}.mp3`));
  }

  create() {
    // Small generated textures shared by several scenes.
    const g = this.make.graphics({ add: false });
    g.lineStyle(10, 0xffffff, 1).strokeRoundedRect(6, 6, 116, 116, 28);
    g.generateTexture('ring', 128, 128);
    g.clear();
    // Plain white five-point star, tinted per use for sparkles and confetti.
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 30 : 13;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push({ x: 32 + Math.cos(a) * r, y: 33 + Math.sin(a) * r });
    }
    g.clear();
    g.fillStyle(0xffffff, 1).fillPoints(pts, true);
    g.generateTexture('spark', 64, 64);

    // Streak flame: orange teardrop with a yellow core (round base, pointed tip).
    const drop = (cx, cy, h, w) => {
      const out = [];
      for (let i = 0; i < 64; i++) {
        const t = (i / 64) * Math.PI * 2;
        out.push({ x: cx + w * Math.sin(t) * Math.pow(Math.sin(t / 2), 1.4), y: cy - (h / 2) * Math.cos(t) });
      }
      return out;
    };
    g.clear();
    g.fillStyle(0xff7f47, 1).fillPoints(drop(40, 50, 92, 36), true);
    g.fillStyle(0xffd23f, 1).fillPoints(drop(40, 64, 52, 20), true);
    g.generateTexture('flame', 80, 96);
    g.destroy();

    const fonts = Promise.all([
      document.fonts.load('40px Neuronus', 'Абв123'),
      document.fonts.load('900 40px Nunito', '×'),
    ]);
    const timeout = new Promise((r) => setTimeout(r, 2500));
    Promise.race([fonts, timeout]).then(() => this.scene.start('Menu'));
  }
}
