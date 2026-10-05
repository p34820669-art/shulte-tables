import { PACE, EFFORT } from './config.js';
import { save } from './save.js';
import { dateKey, addDays, weekday } from './dates.js';

// 100 = the pace of a 3-star run; higher is faster. Comparable across sizes and table types.
export function speedIndex(run) {
  const expected = PACE[run.size][0] * run.targets * EFFORT[run.mode];
  // Capped so one glitchy-fast run cannot stretch the chart.
  return Math.min(200, Math.round((expected / Math.max(run.time, 0.5)) * 100));
}

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

function inDays(runs, from, to) {
  return runs.filter((r) => r.day >= from && r.day <= to);
}

export function parentStats(today = dateKey()) {
  const runs = save.runs;
  const last7 = inDays(runs, addDays(today, -6), today);
  const prev7 = inDays(runs, addDays(today, -13), addDays(today, -7));

  const speed7 = avg(last7.map(speedIndex));
  const speedPrev = avg(prev7.map(speedIndex));
  const change = speed7 !== null && speedPrev !== null && last7.length >= 3 && prev7.length >= 3
    ? Math.round(((speed7 - speedPrev) / speedPrev) * 100) : null;

  // Tables per day, last 7 days, oldest first.
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    return { day, label: weekday(day), count: runs.filter((r) => r.day === day).length };
  });

  // Speed index per day over 14 days (only days with runs).
  const trend = [];
  for (let i = 13; i >= 0; i--) {
    const day = addDays(today, -i);
    const dayRuns = runs.filter((r) => r.day === day);
    trend.push({ day, label: weekday(day), value: dayRuns.length ? Math.round(avg(dayRuns.map(speedIndex))) : null });
  }

  const bySize = [3, 4, 5].map((size) => {
    const rs = runs.filter((r) => r.size === size);
    return {
      size,
      count: rs.length,
      secPerNumber: rs.length ? avg(rs.map((r) => r.time / r.targets)) : null,
      errors: rs.length ? avg(rs.map((r) => r.errors)) : null,
    };
  });

  const days = new Set(runs.map((r) => r.day));
  return {
    total: runs.length,
    activeDays: days.size,
    streak: save.streak(today),
    speed7: speed7 === null ? null : Math.round(speed7),
    change,
    errors7: last7.length ? avg(last7.map((r) => r.errors)) : null,
    week,
    trend,
    bySize,
  };
}
