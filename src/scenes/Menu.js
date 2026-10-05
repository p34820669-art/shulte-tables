import Phaser from 'phaser';
import { W, H, BRAND } from '../config.js';
import { save } from '../save.js';
import { sfx, applyMute } from '../audio.js';
import { button, cover, go, fadeIn, txtR } from '../ui.js';

export default class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }

  init() { this._leaving = false; this.gate = null; }

  create() {
    applyMute(this);
    fadeIn(this);
    cover(this, 'bg_menu');

    // Twinkling stars
    for (let i = 0; i < 18; i++) {
      const s = this.add.image(Phaser.Math.Between(20, W - 20), Phaser.Math.Between(20, H - 20), 'spark')
        .setScale(Phaser.Math.FloatBetween(0.12, 0.3)).setAlpha(0.15).setTint(0xdff7ff);
      this.tweens.add({
        targets: s, alpha: 0.9, scale: s.scale * 1.5, duration: Phaser.Math.Between(900, 1800),
        yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1500), ease: 'Sine.InOut',
      });
    }

    // Drifting clouds
    [[470, 0.55], [620, 0.7], [790, 0.5]].forEach(([y, sc]) => this.drift(y, sc));

    // Hero standing on a cloud
    const cloud = this.add.image(W / 2, 845, 'cloud').setScale(0.9);
    const hero = this.add.image(W / 2, 835, 'hero').setOrigin(0.5, 1);
    hero.setScale(500 / hero.height);
    this.tweens.add({ targets: hero, y: 824, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: cloud, y: 850, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    // Logo drops in with a bounce
    const logo = this.add.image(W / 2, -220, 'logo');
    logo.setScale(600 / logo.width);
    this.tweens.add({
      targets: logo, y: 215, duration: 900, ease: 'Bounce.Out', delay: 150,
      onComplete: () => this.tweens.add({ targets: logo, scale: logo.scale * 1.03, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' }),
    });

    const start = button(this, W / 2, 965, 'СТАРТ', {
      w: 380, size: 60, sound: 'start', pulse: true,
      onClick: () => go(this, 'Levels', { focus: save.currentLevel() }),
    });
    this.reveal(start, 700, 965);

    const streak = save.streak();
    const daily = button(this, W / 2, 1110, 'Таблица дня', {
      w: 380, size: 38, icon: 'flame', sound: 'start',
      onClick: () => go(this, 'Game', { daily: true }),
    });
    this.reveal(daily, 850, 1110);
    this.dailyBadge(streak);

    const row = 1232;
    const snd = button(this, 125, row, save.sound ? 'Звук: вкл' : 'Звук: выкл', {
      w: 215, size: 25, sound: null,
      onClick: () => {
        save.sound = !save.sound;
        applyMute(this);
        snd.label.setText(save.sound ? 'Звук: вкл' : 'Звук: выкл');
        if (save.sound) sfx(this, 'click');
      },
    });
    // Calm mode hides the running clock for kids who feel rushed by it.
    const tmr = button(this, W / 2, row, save.hideTimer ? 'Таймер: выкл' : 'Таймер: вкл', {
      w: 215, size: 25,
      onClick: () => {
        save.hideTimer = !save.hideTimer;
        tmr.label.setText(save.hideTimer ? 'Таймер: выкл' : 'Таймер: вкл');
      },
    });
    button(this, W - 125, row, 'Родителям', { w: 215, size: 25, onClick: () => this.openGate() });
  }

  reveal(obj, delay, y) {
    obj.setAlpha(0);
    this.tweens.add({ targets: obj, alpha: 1, y: { from: y + 45, to: y }, duration: 500, delay, ease: 'Back.Out' });
  }

  // Streak badge on the daily button: number while a streak runs, a check once today is done.
  dailyBadge(streak) {
    const x = W / 2 + 175;
    const y = 1110 - 56;
    const done = streak.doneToday;
    if (!done && streak.current === 0) return;
    const g = this.add.graphics({ x, y }).setDepth(5);
    g.fillStyle(done ? BRAND.green : BRAND.orange, 1).fillCircle(0, 0, 30);
    g.lineStyle(5, 0xffffff, 1).strokeCircle(0, 0, 30);
    const parts = [g];
    if (done) {
      const c = this.add.graphics({ x, y }).setDepth(6);
      c.lineStyle(7, 0xffffff, 1).beginPath().moveTo(-12, 1).lineTo(-3, 11).lineTo(14, -10).strokePath();
      parts.push(c);
    } else {
      parts.push(txtR(this, x, y - 1, String(streak.current), 34, { color: '#ffffff', weight: 600 }).setDepth(6));
    }
    parts.forEach((o) => o.setAlpha(0));
    this.tweens.add({ targets: parts, alpha: 1, delay: 1100, duration: 300 });
  }

  // ---- Parent gate: a multiplication a 6 to 9 year old will not solve ----
  openGate() {
    if (this.gate || this._leaving) return;
    sfx(this, 'click');
    const a = Phaser.Math.Between(6, 9);
    const b = Phaser.Math.Between(6, 9);
    const right = a * b;
    const options = Phaser.Utils.Array.Shuffle([right, right + Phaser.Math.Between(2, 5), right - Phaser.Math.Between(2, 5)]);

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0b1040, 0.75).setDepth(300).setInteractive();
    const card = this.add.container(W / 2, 560).setDepth(301).setScale(0.6).setAlpha(0);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1).fillRoundedRect(-300, -250, 600, 500, 40);
    bg.lineStyle(6, BRAND.cyan, 1).strokeRoundedRect(-300, -250, 600, 500, 40);
    card.add([
      bg,
      txtR(this, 0, -185, 'Только для взрослых', 40, { color: BRAND.cyanText }),
      txtR(this, 0, -110, 'Решите пример, чтобы продолжить', 26, { color: BRAND.muted, weight: 400 }),
      txtR(this, 0, -30, `${a} × ${b} = ?`, 76, { color: BRAND.ink }),
    ]);
    this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 300, ease: 'Back.Out' });

    const btns = options.map((v, i) => {
      const bt = button(this, W / 2 - 190 + i * 190, 640, String(v), {
        w: 170, size: 40, sound: null,
        onClick: () => {
          if (v === right) {
            this.closeGate();
            go(this, 'Parents');
          } else {
            sfx(this, 'tap_bad');
            this.tweens.add({ targets: card, x: W / 2 + 14, duration: 50, yoyo: true, repeat: 3, onComplete: () => { card.x = W / 2; } });
            this.closeGate();
          }
        },
      });
      bt.setDepth(302);
      return bt;
    });
    const cancel = button(this, W / 2, 770, 'Назад', { w: 230, size: 32, sound: 'back', onClick: () => this.closeGate() });
    cancel.setDepth(302);
    this.gate = { dim, card, btns, cancel };
  }

  closeGate() {
    if (!this.gate) return;
    const { dim, card, btns, cancel } = this.gate;
    this.gate = null;
    this.time.delayedCall(180, () => [dim, card, cancel, ...btns].forEach((o) => o.destroy()));
    this.tweens.add({ targets: [dim, card, cancel, ...btns], alpha: 0, duration: 160 });
  }

  drift(y, sc) {
    const c = this.add.image(Phaser.Math.Between(-100, W + 100), y, 'cloud').setScale(sc).setAlpha(0.92);
    const run = (from) => this.tweens.add({
      targets: c, x: { from, to: W + 280 }, duration: (W + 280 - from) * 55, ease: 'Linear',
      onComplete: () => run(-280),
    });
    run(c.x);
  }
}
