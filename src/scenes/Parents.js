import Phaser from 'phaser';
import { W, H, BRAND } from '../config.js';
import { sfx, applyMute } from '../audio.js';
import { parentStats } from '../stats.js';
import { plural } from '../dates.js';
import { iconButton, txtR, blob, go, fadeIn } from '../ui.js';

const M = 32; // page margin
const CARD_W = W - M * 2;
const HEAD = 140;

const fmt1 = (v) => (v === null ? '-' : v.toFixed(1).replace('.', ','));

// Information screen for adults: brand light-grey page, Rubik text, cyan headings.
export default class Parents extends Phaser.Scene {
  constructor() { super('Parents'); }

  init() { this._leaving = false; this.vel = 0; this.drag = 0; }

  create() {
    applyMute(this);
    fadeIn(this);
    const st = parentStats();
    this.add.rectangle(W / 2, H / 2, W, H, BRAND.gray).setScrollFactor(0);
    // Brand cell shapes, fixed behind the content.
    blob(this, W - 40, 40, 150, BRAND.orange, 1.2).setScrollFactor(0).setAlpha(0.9);
    blob(this, 40, H - 30, 130, BRAND.violet, 4.1).setScrollFactor(0).setAlpha(0.18);
    blob(this, W - 70, H - 160, 70, BRAND.cyan, 2.6).setScrollFactor(0).setAlpha(0.16);

    let y = HEAD + 20;
    y = this.tiles(st, y);
    if (st.total === 0) {
      y = this.emptyCard(y);
    } else {
      y = this.weekCard(st, y);
      y = this.trendCard(st, y);
      y = this.sizeCard(st, y);
    }
    y = this.noteCard(y);

    const total = y + 20;
    this.maxScroll = Math.max(0, total - H);
    this.cameras.main.setBounds(0, 0, W, Math.max(H, total));
    this.header();
    this.setupScroll();
  }

  header() {
    const bar = this.add.rectangle(W / 2, 0, W, HEAD - 20, 0xffffff).setOrigin(0.5, 0).setScrollFactor(0).setDepth(90);
    const line = this.add.rectangle(W / 2, HEAD - 20, W, 3, 0xe3e6ee).setOrigin(0.5, 0).setScrollFactor(0).setDepth(90);
    const back = iconButton(this, 66, 60, 'back', 84, () => go(this, 'Menu'), 'back');
    back.setScrollFactor(0).setDepth(100);
    txtR(this, W / 2 + 30, 48, 'Для родителей', 44, { color: BRAND.cyanText }).setScrollFactor(0).setDepth(100);
    txtR(this, W / 2 + 30, 92, 'Как ребёнок тренирует внимание', 24, { color: BRAND.muted, weight: 400 }).setScrollFactor(0).setDepth(100);
    return [bar, line];
  }

  card(y, h) {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x11132c, 0.06).fillRoundedRect(M, y + 6, CARD_W, h, 30);
    g.fillStyle(0xffffff, 1).fillRoundedRect(M, y, CARD_W, h, 30);
    return g;
  }

  title(y, text) {
    return txtR(this, M + 36, y + 44, text, 32, { color: BRAND.cyanText, ox: 0 }).setDepth(3);
  }

  // ---- 2x2 summary tiles ----
  tiles(st, y) {
    const w = (CARD_W - 24) / 2;
    const h = 170;
    const speedSub = st.change === null
      ? 'выше 100 = быстрее нормы'
      : `${st.change >= 0 ? '+' : '-'}${Math.abs(st.change)}% к прошлой неделе`;
    const speedCol = st.change === null ? BRAND.muted : st.change >= 0 ? '#12a860' : '#e0475a';
    const items = [
      { v: String(st.total), label: 'Таблиц решено', sub: `${st.activeDays} ${plural(st.activeDays, 'день', 'дня', 'дней')} занятий`, col: BRAND.muted },
      { v: String(st.streak.current), label: 'Серия дней', sub: `рекорд: ${st.streak.best}`, col: BRAND.muted },
      { v: st.speed7 === null ? '-' : String(st.speed7), label: 'Скорость за 7 дней', sub: speedSub, col: speedCol },
      { v: fmt1(st.errors7), label: 'Ошибок на таблицу', sub: 'за 7 дней', col: BRAND.muted },
    ];
    items.forEach((it, i) => {
      const x = M + (i % 2) * (w + 24);
      const ty = y + Math.floor(i / 2) * (h + 24);
      const g = this.add.graphics().setDepth(2);
      g.fillStyle(0x11132c, 0.06).fillRoundedRect(x, ty + 6, w, h, 28);
      g.fillStyle(0xffffff, 1).fillRoundedRect(x, ty, w, h, 28);
      g.fillStyle([BRAND.cyan, BRAND.orange, BRAND.green, BRAND.violet][i], 1).fillRoundedRect(x + 22, ty + 24, 8, 44, 4);
      txtR(this, x + 44, ty + 48, it.v, 60, { color: BRAND.ink, ox: 0 }).setDepth(3);
      txtR(this, x + 24, ty + 102, it.label, 25, { color: BRAND.ink, ox: 0, weight: 600 }).setDepth(3);
      txtR(this, x + 24, ty + 136, it.sub, 21, { color: it.col, ox: 0, weight: 400 }).setDepth(3);
    });
    return y + 2 * h + 24 + 28;
  }

  emptyCard(y) {
    const h = 230;
    this.card(y, h);
    this.title(y, 'Пока нет данных');
    txtR(this, W / 2, y + 140, 'Сыграйте несколько таблиц, и здесь появятся\nграфики скорости и внимательности.', 26, {
      color: BRAND.muted, weight: 400, style: { lineSpacing: 8 },
    }).setDepth(3);
    return y + h + 28;
  }

  // ---- Tables per day, last 7 days ----
  weekCard(st, y) {
    const h = 360;
    this.card(y, h);
    this.title(y, 'Занятия за 7 дней');
    const left = M + 50;
    const width = CARD_W - 100;
    const base = y + h - 70;
    const maxH = 190;
    const max = Math.max(3, ...st.week.map((d) => d.count));
    const slot = width / 7;
    const g = this.add.graphics().setDepth(3);
    g.lineStyle(3, 0xe3e6ee, 1).lineBetween(left - 10, base, left + width + 10, base);
    st.week.forEach((d, i) => {
      const cx = left + slot * i + slot / 2;
      const bh = d.count === 0 ? 8 : Math.max(18, (d.count / max) * maxH);
      const last = i === 6;
      g.fillStyle(d.count === 0 ? 0xe3e6ee : last ? BRAND.orange : BRAND.cyan, 1)
        .fillRoundedRect(cx - 24, base - bh, 48, bh, { tl: 14, tr: 14, bl: 4, br: 4 });
      if (d.count > 0) txtR(this, cx, base - bh - 22, String(d.count), 26, { color: BRAND.ink }).setDepth(3);
      txtR(this, cx, base + 28, d.label, 24, { color: last ? BRAND.ink : BRAND.muted, weight: last ? 600 : 400 }).setDepth(3);
    });
    return y + h + 28;
  }

  // ---- Speed index per day, last 14 days ----
  trendCard(st, y) {
    const h = 420;
    this.card(y, h);
    this.title(y, 'Скорость за 14 дней');
    txtR(this, M + 36, y + 84, '100 = результат на три звезды', 22, { color: BRAND.muted, ox: 0, weight: 400 }).setDepth(3);

    const left = M + 90;
    const width = CARD_W - 130;
    const top = y + 130;
    const bottom = y + h - 70;
    const vals = st.trend.map((d) => d.value).filter((v) => v !== null);
    const lo = Math.min(60, Math.floor((Math.min(...vals, 100) - 10) / 10) * 10);
    const hi = Math.max(140, Math.ceil((Math.max(...vals, 100) + 10) / 10) * 10);
    const yOf = (v) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
    const xOf = (i) => left + (width / 13) * i;
    const g = this.add.graphics().setDepth(3);

    [lo, 100, hi].forEach((v) => {
      txtR(this, left - 18, yOf(v), String(v), 22, { color: BRAND.muted, ox: 1, weight: 400 }).setDepth(3);
    });
    g.lineStyle(2, 0xe3e6ee, 1).lineBetween(left, yOf(lo), left + width, yOf(lo));
    // Dashed norm line at 100.
    g.lineStyle(3, BRAND.green, 0.9);
    for (let x = left; x < left + width; x += 22) g.lineBetween(x, yOf(100), Math.min(x + 12, left + width), yOf(100));

    const pts = st.trend.map((d, i) => (d.value === null ? null : { x: xOf(i), y: yOf(d.value), d }));
    const real = pts.filter(Boolean);
    if (real.length > 1) {
      g.lineStyle(6, BRAND.cyan, 1).beginPath().moveTo(real[0].x, real[0].y);
      real.slice(1).forEach((p) => g.lineTo(p.x, p.y));
      g.strokePath();
    }
    real.forEach((p) => {
      g.fillStyle(0xffffff, 1).fillCircle(p.x, p.y, 11);
      g.fillStyle(BRAND.cyan, 1).fillCircle(p.x, p.y, 7);
    });
    st.trend.forEach((d, i) => {
      if (i % 3 !== 1 && i !== 13) return;
      const [, m, dd] = d.day.split('-');
      txtR(this, xOf(i), bottom + 30, `${dd}.${m}`, 21, { color: BRAND.muted, weight: 400 }).setDepth(3);
    });
    return y + h + 28;
  }

  // ---- By table size ----
  sizeCard(st, y) {
    const h = 420;
    this.card(y, h);
    this.title(y, 'По размеру таблицы');
    const cols = [M + 36, M + 190, M + 360, M + 520];
    ['Размер', 'Таблиц', 'Сек. на число', 'Ошибок'].forEach((t, i) => {
      txtR(this, cols[i], y + 112, t, 21, { color: BRAND.muted, ox: 0, weight: 400 }).setDepth(3);
    });
    const g = this.add.graphics().setDepth(3);
    g.lineStyle(2, 0xe3e6ee, 1).lineBetween(M + 30, y + 136, M + CARD_W - 30, y + 136);
    st.bySize.forEach((r, i) => {
      const ry = y + 190 + i * 90;
      txtR(this, cols[0], ry, `${r.size}×${r.size}`, 36, { color: BRAND.ink, ox: 0 }).setDepth(3);
      const dash = r.count === 0;
      txtR(this, cols[1], ry, String(r.count), 32, { color: BRAND.ink, ox: 0, weight: 400 }).setDepth(3);
      txtR(this, cols[2], ry, dash ? '-' : fmt1(r.secPerNumber), 32, { color: BRAND.ink, ox: 0, weight: 400 }).setDepth(3);
      txtR(this, cols[3], ry, dash ? '-' : fmt1(r.errors), 32, { color: BRAND.ink, ox: 0, weight: 400 }).setDepth(3);
      if (i < 2) g.lineStyle(2, 0xf0f1f6, 1).lineBetween(M + 30, ry + 44, M + CARD_W - 30, ry + 44);
    });
    return y + h + 28;
  }

  noteCard(y) {
    const h = 300;
    this.card(y, h);
    this.title(y, 'Как читать');
    txtR(this, M + 36, y + 92,
      'Скорость 100 равна результату на три звезды. Чем число выше, тем быстрее ребёнок находит цифры.\n\nПолезнее заниматься понемногу каждый день: одна таблица в день важнее одной рекордной попытки.', 24,
      { color: BRAND.ink, ox: 0, oy: 0, weight: 400, align: 'left', style: { lineSpacing: 8, wordWrap: { width: CARD_W - 72 } } }).setDepth(3);
    return y + h + 28;
  }

  setupScroll() {
    const cam = this.cameras.main;
    this.input.on('pointermove', (p) => {
      if (!p.isDown) return;
      const dy = p.y - p.prevPosition.y;
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY - dy, 0, this.maxScroll);
      this.vel = -dy;
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
