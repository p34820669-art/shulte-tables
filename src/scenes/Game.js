import Phaser from 'phaser';
import { W, H, M, C, TOTAL_LEVELS, levelInfo, buildPuzzle, calcStars, fmtTime } from '../config.js';
import { save } from '../save.js';
import { dailyInfo } from '../daily.js';
import { dateKey, plural } from '../dates.js';
import { sfx, applyMute, buzz } from '../audio.js';
import { txt, button, iconButton, pill, burst, cover, go, fadeIn, speech } from '../ui.js';

const IDLE_HINT_MS = 9000;

// What the hero says after a run, by star count.
const SAY = {
  3: ['Класс! Ты супер-быстрый!', 'Вот это скорость!', 'Отлично! Так держать!'],
  2: ['Хорошо! Совсем чуть-чуть до трёх звёзд!', 'Неплохо! Попробуем ещё быстрее?'],
  1: ['Ничего страшного! Давай ещё раз, получится!', 'Смотри внимательно, и всё выйдет!'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.isDaily = !!data.daily;
    this.level = this.isDaily ? 0 : data.level ?? save.currentLevel();
    this.info = this.isDaily ? dailyInfo() : levelInfo(this.level);
    this.puzzle = buildPuzzle(this.info);
    this.targets = this.puzzle.targets;
    this.pcell = new Map(this.puzzle.cells.map((c) => [c.id, c]));
    this.twoColor = this.puzzle.cells.some((c) => c.color === 1);
    this.calm = save.hideTimer;
    this._leaving = false;
    this.running = false;
    this.finished = false;
    this.elapsed = 0;
    this.errors = 0;
    this.idx = 0;
    this.idle = 0;
    this.shownTenths = -1;
    this.hintObjs = null;
    this.cells = [];
  }

  create() {
    applyMute(this);
    fadeIn(this);
    cover(this, 'bg_game').setTint(this.info.world.tint);

    this.layout();
    this.buildHud();
    this.buildBottom();
    this.setTarget(this.targets[0], false);

    const world = this.info.world;
    if (!this.isDaily && this.info.index === 0 && !save.seenWorld(world.id)) {
      save.markWorld(world.id);
      this.showIntro(world, () => this.buildField());
    } else {
      this.buildField();
    }
  }

  // ---------- Layout ----------

  // Layout on a 40-unit margin grid: header and banner stack from the top, the hint button is
  // anchored to the bottom, and the grid frame is centred in the space between them.
  layout() {
    const hintH = 124;
    const hintY = H - 64 - hintH / 2;
    const top = 262 + 24;                      // below the banner
    const bottom = hintY - hintH / 2 - 24;     // above the hint button
    const frameH = 660;
    const chipHalf = 34;                       // status chips are docked on the frame's top edge
    const frameTop = top + chipHalf + (bottom - top - chipHalf - frameH) / 2;
    this.L = { hintY, frameTop, frameH };
  }

  buildHud() {
    iconButton(this, M + 42, 72, 'back', 84, () => (this.isDaily ? go(this, 'Menu') : go(this, 'Levels', { focus: this.level })), 'back');
    pill(this, W / 2, 72, 340, 84);
    txt(this, W / 2, 70, this.isDaily ? 'Таблица дня' : `Уровень ${this.level}`, 36);
    iconButton(this, W - M - 42, 72, 'restart', 84, () => go(this, 'Game', { level: this.level, daily: this.isDaily }), 'restart');

    // Task banner: label, target and arrow form one centred group right under the header.
    this.banner = this.add.container(W / 2, 200);
    const bp = pill(this, 0, 0, W - 2 * M, 124);
    const lab = txt(this, 0, 4, this.puzzle.label, 40).setOrigin(0, 0.5);
    this.numText = txt(this, 0, 0, '1', 100, { color: C.gold, stroke: '#2d3a9e', sw: 12 });
    this.banner.add([bp, lab, this.numText]);
    const hasArrow = !!this.puzzle.arrow;
    const slot = 150; // fixed-width slot so the group does not shift when the target changes
    const arrowW = 56;
    const total = lab.width + 24 + slot + (hasArrow ? 24 + arrowW : 0);
    const x0 = -total / 2;
    lab.x = x0;
    this.numText.x = x0 + lab.width + 24 + slot / 2;
    if (hasArrow) {
      const arrow = this.add.graphics();
      const up = this.puzzle.arrow === 'up';
      const pts = up ? [0, -28, 28, 16, -28, 16] : [0, 28, 28, -16, -28, -16];
      arrow.fillStyle(0xffffff, 1).lineStyle(6, 0x2d3a9e, 1);
      arrow.fillTriangle(...pts).strokeTriangle(...pts);
      arrow.setPosition(x0 + lab.width + 24 + slot + 24 + arrowW / 2, 4);
      this.banner.add(arrow);
    }

    // Status chips dock on the grid frame's top edge. Calm mode swaps the clock for a progress
    // counter and hides the record.
    const best = this.isDaily ? null : save.bestTime(this.level);
    const showBest = best !== null && !this.calm;
    const cy = this.L.frameTop;
    const cw = showBest ? 250 : 280;
    const cx = showBest ? M + 24 + cw / 2 : W / 2;
    pill(this, cx, cy, cw, 68).setDepth(4);
    if (this.calm) {
      const s = this.add.image(cx - cw / 2 + 38, cy - 1, 'star').setDepth(5);
      s.setScale(42 / s.width);
      this.statText = txt(this, cx + 18, cy - 2, `0/${this.targets.length}`, 36).setDepth(5);
    } else {
      const sw = this.add.image(cx - cw / 2 + 36, cy - 1, 'stopwatch').setDepth(5);
      sw.setScale(46 / sw.height);
      this.statText = txt(this, cx + 22, cy - 2, '0,0', 36).setDepth(5);
    }
    if (showBest) {
      const rx = W - M - 24 - cw / 2;
      pill(this, rx, cy, cw, 68).setDepth(4);
      const s = this.add.image(rx - cw / 2 + 38, cy - 1, 'star').setDepth(5);
      s.setScale(42 / s.width);
      txt(this, rx + 22, cy - 2, `Рекорд ${fmtTime(best).replace(/\d$/, '')}`, 28).setDepth(5);
    }
  }

  buildField() {
    const { size } = this.info;
    const FW = W - 2 * M;
    const { frameTop: T, frameH: FH } = this.L;

    // Darker translucent frame so clouds behind the grid do not compete with the numbers.
    const g = this.add.graphics().setDepth(1);
    [[34, 0.07], [22, 0.12], [12, 0.22], [6, 0.9]].forEach(([lw, a]) => {
      g.lineStyle(lw, C.glow, a).strokeRoundedRect(M, T, FW, FH, 56);
    });
    g.fillStyle(0x16286f, 0.32).fillRoundedRect(M, T, FW, FH, 56);

    const padX = 28;
    const inner = FW - 2 * padX;
    const gap = size === 3 ? 20 : size === 4 ? 16 : 12;
    const cell = (inner - gap * (size - 1)) / size;
    const gridLeft = M + padX;
    const gridTop = T + 46; // clears the docked chips
    const order = Phaser.Utils.Array.Shuffle(this.puzzle.cells.slice());
    const last = order.length - 1;

    order.forEach((pc, i) => {
      const x = gridLeft + cell / 2 + (i % size) * (cell + gap);
      const y = gridTop + cell / 2 + Math.floor(i / size) * (cell + gap);
      const bg = this.add.image(0, 0, 'tile').setDisplaySize(cell, cell);
      const label = txt(this, 0, -cell * 0.03, pc.label, Math.round(cell * 0.52), { color: this.twoColor ? C.pair[pc.color] : C.ink, sw: 0, shadow: false });
      const c = this.add.container(x, y, [bg, label]).setDepth(2);
      c.setScale(0);
      const cellObj = { id: pc.id, x, y, c, bg, size: cell };
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onTap(cellObj));
      bg.on('pointerover', () => { if (this.running) c.setScale(1.04); });
      bg.on('pointerout', () => { c.setScale(1); });
      this.cells.push(cellObj);

      this.tweens.add({
        targets: c, scale: 1, duration: 320, delay: 150 + i * 28, ease: 'Back.Out',
        onComplete: () => { if (i === last) this.startRun(); },
      });
    });
  }

  buildBottom() {
    button(this, W / 2, this.L.hintY, 'ПОДСКАЗКА', {
      w: 340, size: 32, icon: 'bulb', sound: 'hint',
      onClick: () => { if (this.running) this.showHint(2600, false); },
    });
  }

  // ---------- World intro ----------

  showIntro(world, done) {
    const wi = this.info.worldIndex;
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0b1040, 0).setDepth(300).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.88, duration: 300 });
    const title = txt(this, W / 2, 230, `Мир ${wi + 1}`, 34).setDepth(301).setAlpha(0);
    const name = txt(this, W / 2, 310, world.title, 62).setDepth(301).setAlpha(0);
    this.tweens.add({ targets: [title, name], alpha: 1, duration: 400, delay: 200 });

    const hero = this.add.image(170, H + 280, 'hero').setOrigin(0.5, 1).setDepth(301);
    hero.setScale(780 / hero.height);
    this.tweens.add({ targets: hero, y: H + 50, duration: 520, ease: 'Back.Out', delay: 150 });
    this.tweens.add({ targets: hero, angle: { from: -1.5, to: 1.5 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 700 });

    const bubble = speech(this, 470, H * 0.5, world.intro, { w: 400, size: 34 }).setDepth(302).setScale(0);
    this.tweens.add({ targets: bubble, scale: 1, duration: 380, ease: 'Back.Out', delay: 550, onStart: () => sfx(this, 'pointer') });

    const go1 = button(this, 470, H - 270, 'Поехали!', {
      w: 380, size: 50, sound: 'start', pulse: true,
      onClick: () => {
        go1.disabled = true;
        this.tweens.add({ targets: [dim, title, name, hero, bubble, go1], alpha: 0, duration: 260, onComplete: () => {
          [dim, title, name, hero, bubble, go1].forEach((o) => o.destroy());
          done();
        } });
      },
    });
    go1.setDepth(302).setAlpha(0);
    this.tweens.add({ targets: go1, alpha: 1, duration: 300, delay: 900 });
  }

  // ---------- Run loop ----------

  startRun() {
    this.running = true;
    // Tutorial: the first two targets of levels 1 and 2 are pointed out.
    if (this.level >= 1 && this.level <= 2) this.showHint(null, true);
  }

  update(time, delta) {
    if (!this.running) return;
    const dt = Math.min(delta, 100);
    this.elapsed += dt;
    this.idle += dt;
    if (!this.calm) {
      const tenths = Math.floor(this.elapsed / 100);
      if (tenths !== this.shownTenths) {
        this.shownTenths = tenths;
        this.statText.setText(fmtTime(this.elapsed / 1000).replace(/\d$/, ''));
      }
    }
    if (this.idle > IDLE_HINT_MS && !this.hintObjs) this.showHint(3000, true);
  }

  setTarget(id, pop = true) {
    const pc = this.pcell.get(id);
    this.numText.setText(pc.label);
    if (this.twoColor) {
      this.numText.setColor(C.pairLight[pc.color]).setStroke('#ffffff', 12);
    }
    if (pop) {
      this.numText.setScale(1.5);
      this.tweens.add({ targets: this.numText, scale: 1, duration: 260, ease: 'Back.Out' });
    }
  }

  onTap(cell) {
    if (!this.running) return;
    if (cell.id === this.targets[this.idx]) this.hit(cell);
    else this.miss(cell);
  }

  hit(cell) {
    this.idx++;
    this.idle = 0;
    this.clearHint();
    sfx(this, 'tap_ok', { detune: Math.min(this.idx * 30, 600) });
    buzz(12);
    if (this.calm) this.statText.setText(`${this.idx}/${this.targets.length}`);

    // Brief highlight only: the tile goes back to normal so the search stays hard.
    cell.bg.setTint(0x7dffb4);
    this.tweens.add({ targets: cell.c, scale: { from: 1, to: 1.14 }, duration: 110, yoyo: true, ease: 'Sine.Out' });
    burst(this, cell.x, cell.y, { n: 7, scale: 0.3, speed: [90, 220], life: 450 });
    this.time.delayedCall(300, () => cell.bg.clearTint());

    if (this.idx >= this.targets.length) {
      this.finish();
      return;
    }
    this.setTarget(this.targets[this.idx]);
    if (this.level >= 1 && this.level <= 2 && this.idx < 2) this.showHint(null, true);
  }

  // Mistakes are counted quietly and only shown on the result screen.
  miss(cell) {
    this.errors++;
    sfx(this, 'tap_bad');
    buzz(35);
    cell.bg.setTint(0xff9aa8);
    this.time.delayedCall(280, () => cell.bg.clearTint());
    this.tweens.killTweensOf(cell.c);
    cell.c.setScale(1);
    this.tweens.add({
      targets: cell.c, x: cell.x + 11, duration: 45, yoyo: true, repeat: 3,
      onComplete: () => { cell.c.x = cell.x; },
    });
  }

  // ---------- Hints ----------

  showHint(duration, quiet) {
    this.clearHint();
    const cell = this.cells.find((c) => c.id === this.targets[this.idx]);
    if (!cell) return;
    const ring = this.add.image(cell.x, cell.y, 'ring').setDisplaySize(cell.size + 14, cell.size + 14).setDepth(5).setTint(0xffe45c);
    const hand = this.add.image(cell.x + cell.size * 0.12, cell.y + cell.size * 0.12, 'pointer').setOrigin(0.3, 0.03).setDepth(6);
    hand.setScale(Math.min(0.75, cell.size / 150));
    const t1 = this.tweens.add({ targets: ring, scale: ring.scale * 1.12, alpha: 0.45, duration: 480, yoyo: true, repeat: -1 });
    const t2 = this.tweens.add({ targets: hand, y: hand.y + 18, x: hand.x + 8, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.hintObjs = { ring, hand, tweens: [t1, t2] };
    if (!quiet) buzz(10);
    if (quiet) sfx(this, 'pointer', { volume: 0.5 });
    if (duration) this.hintTimer = this.time.delayedCall(duration, () => this.clearHint());
    this.idle = 0;
  }

  clearHint() {
    if (this.hintTimer) { this.hintTimer.remove(false); this.hintTimer = null; }
    if (!this.hintObjs) return;
    this.hintObjs.tweens.forEach((t) => t.stop());
    this.hintObjs.ring.destroy();
    this.hintObjs.hand.destroy();
    this.hintObjs = null;
  }

  // ---------- Result ----------

  finish() {
    this.running = false;
    this.finished = true;
    const time = this.elapsed / 1000;
    const stars = calcStars(this.info, this.targets.length, time, this.errors);
    const day = dateKey();
    save.logRun({
      day, level: this.level, size: this.info.size, mode: this.info.mode, targets: this.targets.length,
      time, errors: this.errors, stars, daily: this.isDaily,
    });
    let rec;
    let streak = null;
    if (this.isDaily) {
      const { first } = save.completeDaily(day, { time, errors: this.errors, stars });
      streak = { ...save.streak(day), first };
      rec = { isRecord: false, prevBest: null, firstClear: false };
    } else {
      rec = save.complete(this.level, { time, errors: this.errors, stars });
    }
    this.time.delayedCall(550, () => this.showResult({ time, stars, errors: this.errors, streak, ...rec }));
  }

  showResult({ time, stars, errors, isRecord, prevBest, firstClear, streak }) {
    const hasNext = this.level < TOTAL_LEVELS;
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0b1040, 0).setDepth(200).setInteractive();
    this.tweens.add({ targets: dim, fillAlpha: 0.62, duration: 280 });
    sfx(this, 'panel');

    const PY = Math.round(H * 0.37);
    const pc = this.add.container(W / 2, PY).setDepth(201).setScale(0.4).setAlpha(0);
    const panel = this.add.image(0, 0, 'panel');
    panel.setDisplaySize(680, 500);
    const ph = 500;

    const title = stars === 3 ? 'Отлично!' : stars === 2 ? 'Хорошо!' : 'Попробуй ещё!';
    const tcol = stars === 3 ? '#e8890c' : stars === 2 ? '#3a7be0' : '#7a63d6';
    const t1 = txt(this, 0, -95, title, 54, { color: tcol, sw: 0, shadow: false });
    const t2 = txt(this, 0, -8, fmtTime(time) + ' с', 84, { color: C.ink, sw: 0, shadow: false });
    const t3 = errors === 0
      ? txt(this, 0, 75, 'Без ошибок!', 42, { color: '#1fa463', sw: 0, shadow: false })
      : txt(this, 0, 75, `Ошибок: ${errors}`, 42, { color: '#e0475a', sw: 0, shadow: false });
    let best;
    if (this.isDaily) {
      best = streak.first
        ? `Серия: ${streak.current} ${plural(streak.current, 'день', 'дня', 'дней')}`
        : 'Тренировка! Серия не меняется';
    } else {
      best = isRecord
        ? (prevBest === null ? 'Первое прохождение!' : 'Новый рекорд!')
        : `Лучшее время: ${fmtTime(prevBest)} с`;
    }
    const t4 = txt(this, 0, 138, best, 36, { color: isRecord || (this.isDaily && streak.first) ? '#e8890c' : '#6a6fb5', sw: 0, shadow: false });
    pc.add([panel, t1, t2, t3, t4]);
    if (this.isDaily && streak.first) {
      const fl = this.add.image(-t4.width / 2 - 34, 134, 'flame');
      fl.setScale(54 / fl.height);
      pc.add(fl);
    }

    // Stars sit across the top edge of the panel; the middle one is larger.
    const slots = [{ x: -175, y: -ph / 2 + 8, s: 150, r: -14 }, { x: 0, y: -ph / 2 - 28, s: 190, r: 0 }, { x: 175, y: -ph / 2 + 8, s: 150, r: 14 }];
    slots.forEach((sl) => {
      const e = this.add.image(sl.x, sl.y, 'star_empty');
      e.setScale(sl.s / e.width).setAngle(sl.r);
      pc.add(e);
    });

    this.tweens.add({ targets: pc, scale: 1, alpha: 1, duration: 420, ease: 'Back.Out', delay: 120 });

    for (let i = 0; i < stars; i++) {
      const sl = slots[i];
      const s = this.add.image(W / 2 + sl.x, PY + sl.y, 'star').setDepth(205).setScale(0).setAngle(sl.r - 40);
      const target = sl.s / s.width;
      this.tweens.add({
        targets: s, scale: { from: target * 2.4, to: target }, angle: sl.r, alpha: { from: 0, to: 1 },
        duration: 380, delay: 650 + i * 380, ease: 'Back.Out',
        onStart: () => {
          sfx(this, 'star', { detune: i * 180 });
          buzz(20);
        },
        onComplete: () => burst(this, s.x, s.y, { n: 14, scale: 0.55, speed: [160, 420], life: 700, depth: 206 }),
      });
    }
    const endAt = 650 + stars * 380 + 200;
    if (stars < 3) this.time.delayedCall(650 + stars * 380, () => sfx(this, 'star_empty'));
    if (stars === 3) this.time.delayedCall(endAt - 150, () => { sfx(this, 'three_star'); this.confetti(); });
    if (isRecord && prevBest !== null) this.time.delayedCall(endAt, () => sfx(this, 'record'));

    // One big primary button, with the secondary action smaller underneath (all gaps 24).
    const primaryY = PY + ph / 2 + 24 + 80;
    const secondY = primaryY + 80 + 24 + 37;
    this.heroTop = secondY + 37 + 16;
    const mk = (x, y, label, w, fn, o = {}) => {
      const b = button(this, x, y, label, { w, size: 34, onClick: fn, ...o });
      b.setDepth(202).setAlpha(0);
      this.tweens.add({ targets: b, alpha: 1, y: { from: y + 40, to: y }, duration: 360, delay: 500, ease: 'Back.Out' });
      return b;
    };
    if (this.isDaily) {
      mk(W / 2, primaryY, 'В МЕНЮ', 440, () => go(this, 'Menu'), { sound: 'next', pulse: true, size: 44 });
      mk(W / 2, secondY, 'ЕЩЁ РАЗ', 200, () => go(this, 'Game', { level: 0, daily: true }), { sound: 'restart', size: 30 });
    } else {
      mk(W / 2, primaryY, 'ДАЛЬШЕ', 440, () => (hasNext ? go(this, 'Game', { level: this.level + 1 }) : go(this, 'Levels', { focus: this.level })), { sound: 'next', pulse: true, size: 44 });
      mk(W / 2 - 110, secondY, 'ЗАНОВО', 200, () => go(this, 'Game', { level: this.level }), { sound: 'restart', size: 30 });
      mk(W / 2 + 110, secondY, 'УРОВНИ', 200, () => go(this, 'Levels', { focus: this.level, pop: hasNext && firstClear ? this.level + 1 : null }), { sound: 'back', size: 30 });
    }

    this.heroReacts({ stars, errors, isRecord: isRecord && prevBest !== null, streakUp: this.isDaily && streak.first });
  }

  // The hero peeks in at the bottom and reacts to the result.
  heroReacts({ stars, errors, isRecord, streakUp }) {
    let line = pick(SAY[stars]);
    if (errors > this.info.size * 2) line = 'Не торопись, смотри внимательно!';
    else if (streakUp) line = 'Серия продолжается! Жду тебя завтра!';
    else if (errors === 0 && stars === 3) line = 'Ни одной ошибки! Ты мастер!';
    else if (isRecord) line = 'Новый рекорд! Ура!';

    const heroH = 520;
    const baseY = this.heroTop + heroH;
    const hero = this.add.image(125, baseY + 220, 'hero').setOrigin(0.5, 1).setDepth(203);
    hero.setScale(heroH / hero.height);
    this.tweens.add({ targets: hero, y: baseY, duration: 480, ease: 'Back.Out', delay: 900 });
    this.time.delayedCall(1500, () => {
      if (stars === 3) {
        this.tweens.add({ targets: hero, y: baseY - 36, duration: 260, yoyo: true, repeat: -1, repeatDelay: 140, ease: 'Quad.Out' });
      } else if (stars === 2) {
        this.tweens.add({ targets: hero, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      } else {
        this.tweens.add({ targets: hero, angle: { from: -1, to: 1 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    });

    const bubble = speech(this, 450, this.heroTop + 100, line, { w: 440, size: 32, side: 'left' }).setDepth(204).setScale(0);
    this.tweens.add({ targets: bubble, scale: 1, duration: 360, ease: 'Back.Out', delay: 1350 });
  }

  confetti() {
    const p = this.add.particles(0, 0, 'spark', {
      x: { min: 0, max: W }, y: -30,
      speedY: { min: 260, max: 520 }, speedX: { min: -70, max: 70 },
      lifespan: 2800, scale: { start: 0.55, end: 0.35 }, rotate: { start: 0, end: 540 },
      tint: [0xffe45c, 0x9ff6ee, 0xffb3f0, 0xffffff, 0x8fb3ff],
      frequency: 35, quantity: 2,
    });
    p.setDepth(250);
    this.time.delayedCall(1700, () => p.stop());
    this.time.delayedCall(4700, () => p.destroy());
  }
}
