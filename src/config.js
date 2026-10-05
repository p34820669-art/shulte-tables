export const W = 720;
// Height adapts to the screen: 1280 on desktop and shorter phones, up to 1600 on tall phones, so no
// plain bars show above and below the game. Layouts anchor to the top and bottom and use H.
const aspect = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerHeight / window.innerWidth : 16 / 9;
export const H = Math.round(Math.min(1600, Math.max(1280, W * aspect)));
// Layout grid: 40-unit side margins, gaps of 16, 24 or 40.
export const M = 40;
// Neuronus is the show's brand font; it has no "×", so Nunito covers that glyph.
export const FONT = 'Neuronus, Nunito, system-ui, sans-serif';

// Colour tokens used by text and drawn shapes.
export const C = {
  ink: '#2b2f7a',
  inkNum: 0x2b2f7a,
  white: '#ffffff',
  gold: '#ffe45c',
  stroke: '#3a3fb4',
  red: 0xff5d6c,
  green: 0x59d98e,
  glow: 0x9ff6ee,
  // Two-colour levels: blue and orange stay apart for most kinds of colour blindness.
  pair: ['#1f5fe0', '#f26a1b'],
  pairLight: ['#3a86ff', '#ff8a2d'],
};

// Neurons brand identity (Brand Identity deck, July 2024). Rubik is the brand's text face.
export const BRAND = {
  cyan: 0x2aa3e7, green: 0x2ce186, purple: 0xae86d2, navy: 0x11132c, orange: 0xff7f47, violet: 0x614dec, red: 0xff5345,
  gray: 0xf2f2f2, ink: '#11132c', cyanText: '#2aa3e7', muted: '#6b6f8a',
};
export const FONT_TEXT = 'Rubik, system-ui, sans-serif';

const rep = (size, mode, n = 1) => Array.from({ length: n }, () => ({ size, mode }));

// Six levels per world. Early levels teach, 4x4 arrives at level 5, then each world adds one new twist.
export const WORLDS = [
  {
    id: 'start', title: 'Запуск системы', tint: 0xffffff,
    intro: 'Привет, я Винч! Нажимай числа по порядку, и мы запустим систему!',
    levels: [...rep(3, 'asc', 3), ...rep(3, 'desc'), ...rep(4, 'asc'), ...rep(3, 'desc')],
  },
  {
    id: 'letters', title: 'Секретный алфавит', tint: 0xe3fff0,
    intro: 'Теперь вместо чисел буквы! Ищи их по алфавиту: А, Б, В...',
    levels: [...rep(3, 'letters', 2), ...rep(4, 'letters'), ...rep(3, 'lettersDesc'), ...rep(4, 'letters'), ...rep(4, 'lettersDesc')],
  },
  {
    id: 'parity', title: 'Чётные и нечётные', tint: 0xfff0dc,
    intro: 'Тут есть ловушки! Нажимай только чётные числа: 2, 4, 6... А потом только нечётные!',
    levels: [...rep(3, 'even'), ...rep(4, 'even'), ...rep(3, 'odd'), ...rep(4, 'odd'), ...rep(5, 'even'), ...rep(5, 'odd')],
  },
  {
    id: 'colors', title: 'Два цвета', tint: 0xf3e6ff,
    intro: 'Числа двух цветов! Ищи по очереди: синее, оранжевое, снова синее, снова оранжевое...',
    levels: [...rep(4, 'twocolor', 3), ...rep(4, 'twocolorRev', 3)],
  },
  {
    id: 'masters', title: 'Мастер Нейронов', tint: 0xdcf0ff,
    intro: 'Последнее испытание! Большие таблицы. Я в тебя верю!',
    levels: [...rep(4, 'desc'), ...rep(5, 'asc'), ...rep(5, 'desc'), ...rep(5, 'letters'), ...rep(5, 'lettersDesc'), ...rep(5, 'asc')],
  },
];

export const LEVELS = [];
WORLDS.forEach((w, wi) => w.levels.forEach((l, i) => LEVELS.push({ ...l, world: wi, index: i })));
export const TOTAL_LEVELS = LEVELS.length;

export function levelInfo(n) {
  const l = LEVELS[n - 1];
  return { n, size: l.size, mode: l.mode, count: l.size * l.size, index: l.index, worldIndex: l.world, world: WORLDS[l.world] };
}

export function worldLevels(wi) {
  const first = LEVELS.findIndex((l) => l.world === wi) + 1;
  return { from: first, to: first + WORLDS[wi].levels.length - 1 };
}

// Cyrillic alphabet without the look-alike and rare letters, 25 in a row.
const ALPHA = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭ'.split('');

/**
 * Builds the cells and the ordered list of cell ids the player must tap.
 * label: the word in the task banner; arrow: 'up' | 'down' | null.
 */
export function buildPuzzle({ mode, size }) {
  const n = size * size;
  const nums = Array.from({ length: n }, (_, i) => i + 1);
  const numCell = (v, c = 0, id = v) => ({ id, label: String(v), color: c });
  let cells; let targets; let label = 'Найди'; let arrow = 'up';

  switch (mode) {
    case 'asc':
      cells = nums.map((v) => numCell(v));
      targets = nums.slice();
      break;
    case 'desc':
      cells = nums.map((v) => numCell(v));
      targets = nums.slice().reverse();
      arrow = 'down';
      break;
    case 'letters':
    case 'lettersDesc':
      cells = nums.map((v) => ({ id: v, label: ALPHA[v - 1], color: 0 }));
      targets = nums.slice();
      if (mode === 'lettersDesc') { targets.reverse(); arrow = 'down'; }
      break;
    case 'even':
    case 'odd':
      cells = nums.map((v) => numCell(v));
      targets = nums.filter((v) => (mode === 'even' ? v % 2 === 0 : v % 2 === 1));
      label = mode === 'even' ? 'Чётное' : 'Нечётное';
      break;
    case 'twocolor':
    case 'twocolorRev': {
      const half = n / 2;
      cells = [];
      for (let c = 0; c < 2; c++) for (let v = 1; v <= half; v++) cells.push(numCell(v, c, c * half + v));
      const idOf = (c, v) => c * half + v;
      targets = [];
      for (let i = 0; i < half; i++) {
        targets.push(idOf(0, i + 1));
        // Reverse mode: blue counts up while orange counts down.
        targets.push(idOf(1, mode === 'twocolor' ? i + 1 : half - i));
      }
      arrow = null;
      break;
    }
    default:
      throw new Error('Unknown mode ' + mode);
  }
  return { cells, targets, label, arrow };
}

// Seconds per target for 3 and 2 stars, from the GDD norms (3x3 25/35 s, 4x4 45/60 s, 5x5 60/90 s).
export const PACE = { 3: [25 / 9, 35 / 9], 4: [45 / 16, 60 / 16], 5: [60 / 25, 90 / 25] };
// Harder variants get more time per target.
export const EFFORT = { asc: 1, desc: 1.1, letters: 1.15, lettersDesc: 1.25, even: 1.5, odd: 1.5, twocolor: 1.5, twocolorRev: 1.8 };

export function calcStars(info, targetCount, time, errors) {
  const [p3, p2] = PACE[info.size];
  const k = targetCount * EFFORT[info.mode];
  let stars = time <= p3 * k ? 3 : time <= p2 * k ? 2 : 1;
  // Many mistakes cap the result so a fast but careless run is not a perfect one.
  if (errors > info.size * 2) stars = 1;
  else if (errors > info.size - 1) stars = Math.min(stars, 2);
  return stars;
}

export function fmtTime(t) {
  return t.toFixed(t < 100 ? 2 : 1).replace('.', ',');
}
