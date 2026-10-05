import { TOTAL_LEVELS } from './config.js';
import { dateKey, addDays } from './dates.js';

const KEY = 'shulte.v3';
const MAX_RUNS = 500;
let data = { levels: {}, sound: true, hideTimer: false, seenWorlds: {}, runs: [], daily: {}, dailyPick: null };

try {
  const raw = localStorage.getItem(KEY);
  if (raw) data = { ...data, ...JSON.parse(raw) };
} catch (e) { /* storage can be blocked, play without saving */ }

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

export const save = {
  get sound() { return data.sound; },
  set sound(v) { data.sound = v; persist(); },

  // Calm mode: hide the running clock during play (the result screen still shows the time).
  get hideTimer() { return data.hideTimer; },
  set hideTimer(v) { data.hideTimer = v; persist(); },

  seenWorld(id) { return !!data.seenWorlds[id]; },
  markWorld(id) { data.seenWorlds[id] = true; persist(); },

  level(n) { return data.levels[n] ?? null; },
  stars(n) { return data.levels[n]?.stars ?? 0; },
  bestTime(n) { return data.levels[n]?.bestTime ?? null; },
  isUnlocked(n) { return n === 1 || this.stars(n - 1) > 0; },

  // The first level that is unlocked but not yet beaten, or the last level.
  currentLevel() {
    for (let n = 1; n <= TOTAL_LEVELS; n++) if (this.stars(n) === 0) return n;
    return TOTAL_LEVELS;
  },

  totalStars() {
    return Object.values(data.levels).reduce((a, l) => a + l.stars, 0);
  },

  // Records a finished run. A record is only a strictly faster time than the saved best.
  complete(n, { time, errors, stars }) {
    const prev = data.levels[n];
    const isRecord = !prev || time < prev.bestTime;
    data.levels[n] = {
      stars: Math.max(prev?.stars ?? 0, stars),
      bestTime: prev ? Math.min(prev.bestTime, time) : time,
      bestErrors: prev ? Math.min(prev.bestErrors, errors) : errors,
    };
    persist();
    return { isRecord, prevBest: prev?.bestTime ?? null, firstClear: !prev };
  },

  // ---- Run history (feeds the parent view) ----
  // r: { day, level (0 for the daily), size, mode, targets, time, errors, stars, daily }
  logRun(r) {
    data.runs.push({ ...r, t: Date.now() });
    if (data.runs.length > MAX_RUNS) data.runs.splice(0, data.runs.length - MAX_RUNS);
    persist();
  },
  get runs() { return data.runs; },

  // ---- Daily table ----
  get dailyPick() { return data.dailyPick; },
  set dailyPick(v) { data.dailyPick = v; persist(); },
  dailyDone(day = dateKey()) { return !!data.daily[day]; },
  dailyResult(day = dateKey()) { return data.daily[day] ?? null; },

  // Only the first finish of a day counts for the streak; replays are just practice.
  completeDaily(day, { time, errors, stars }) {
    const first = !data.daily[day];
    if (first) data.daily[day] = { time, errors, stars };
    persist();
    return { first };
  },

  // Gentle streak: today not played yet does not break a streak that reaches yesterday.
  streak(today = dateKey()) {
    const done = (k) => !!data.daily[k];
    let cur = 0;
    let k = done(today) ? today : addDays(today, -1);
    while (done(k)) { cur++; k = addDays(k, -1); }
    const keys = Object.keys(data.daily).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const key of keys) {
      run = prev && addDays(prev, 1) === key ? run + 1 : 1;
      best = Math.max(best, run);
      prev = key;
    }
    return { current: cur, best, doneToday: done(today) };
  },
};
