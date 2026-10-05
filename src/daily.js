import { WORLDS, LEVELS, worldLevels, levelInfo } from './config.js';
import { save } from './save.js';
import { dateKey, seeded } from './dates.js';

/**
 * Today's table. Same size and mode all day; the arrangement is shuffled on every attempt.
 * The pool only holds table types from worlds the player has already opened, so a daily
 * never asks for a rule the child has not been taught.
 */
export function dailyInfo(day = dateKey()) {
  // The pick is stored so the table cannot change mid-day if a new world opens.
  let pick = save.dailyPick?.day === day ? save.dailyPick : null;
  if (!pick) {
    pick = { ...choose(day), day };
    save.dailyPick = pick;
  }
  const base = levelInfo(pick.from);
  return {
    ...base, n: 0, size: pick.size, mode: pick.mode, count: pick.size * pick.size,
    index: 1, // index 0 would trigger the world intro
    worldIndex: pick.wi, world: WORLDS[pick.wi], daily: true, day,
  };
}

function choose(day) {
  const pool = [];
  WORLDS.forEach((w, wi) => {
    const { from } = worldLevels(wi);
    if (!save.isUnlocked(from)) return;
    const seen = new Set();
    LEVELS.filter((l) => l.world === wi).forEach((l) => {
      const k = `${l.size}-${l.mode}`;
      if (seen.has(k)) return;
      seen.add(k);
      pool.push({ size: l.size, mode: l.mode, wi, from });
    });
  });
  return pool[Math.floor(seeded(day)() * pool.length)];
}
