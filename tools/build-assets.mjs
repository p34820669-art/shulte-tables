// Resizes and converts the Unity source art into small WebP files for the web build.
import sharp from 'sharp';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const G = 'D:/claudeProjects/games.Shulte/Assets/Graphics/';
const S = 'D:/claudeProjects/games.Shulte/Assets/SFX/new/';
const OUT = 'public/img/';

// [output name, source, max width, max height, trim transparent edges]
const images = [
  ['bg_menu', 'StartScreen/StartScreen_Background2.png', 784, 1372, false],
  ['bg_game', 'GameScreen/GameScreen_background.png', 784, 1372, false],
  ['logo', 'StartScreen/ready/StartScreen_LotoTop.png', 640, 310, true],
  ['hero', 'vinch new_color 3.png', 330, 1100, true],
  ['cloud', 'StartScreen/ready/StartScreen_cloud.png', 420, 190, true],
  ['btn', 'StartScreen/buttonEmpty.png', 560, 250, true],
  ['panel', 'WinScreen/Panel.png', 900, 700, true],
  ['tile', 'ChooseLevelScreen/btn_level.png', 300, 300, true],
  ['tile_done', 'ChooseLevelScreen/btn_level_complete.png', 300, 300, true],
  ['tile_lock', 'ChooseLevelScreen/btn_level_locked.png', 300, 300, true],
  ['star', 'WinScreen/star.png', 280, 280, true],
  ['star_empty', 'WinScreen/star_empty.png', 280, 280, true],
  ['pill', 'ChooseLevelScreen/textPanel.png', 700, 180, true],
  ['stopwatch', 'GameScreen/Stopwatch.png', 120, 140, true],
  ['bulb', 'GameScreen/button_hint.png', 140, 200, true],
  ['restart', 'GameScreen/button_restart.png', 150, 150, true],
  ['back', 'ChooseLevelScreen/button_back.png', 160, 160, true],
  ['pointer', 'ChooseLevelScreen/pointer.png', 150, 210, true],
];

fs.mkdirSync(OUT, { recursive: true });
for (const [name, src, w, h, trim] of images) {
  let img = sharp(G + src);
  if (trim) img = img.trim({ threshold: 8 });
  const buf = await img.resize(w, h, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toBuffer({ resolveWithObject: true });
  fs.writeFileSync(OUT + name + '.webp', buf.data);
  console.log(name.padEnd(12), buf.info.width + 'x' + buf.info.height, Math.round(buf.data.length / 1024) + 'KB');
}

const sfx = {
  tap_ok: 'Correct number tap', tap_bad: 'Wrong number tap', click: 'Generic UI button click',
  start: 'Main menu button click', back: 'Back button', restart: 'Restart button', next: 'Next level button',
  hint: 'Hint activate', pointer: 'Onboarding pointer appear', locked: 'Locked level tap', unlock: 'Level unlock',
  panel: 'Victory panel appear', star: 'Star appear', star_empty: 'Empty Star Appear', record: 'New record',
  three_star: '3-star full celebration accent', whoosh: 'Scene transition whoosh',
};
fs.mkdirSync('public/sfx', { recursive: true });
// Sounds are trimmed of leading and trailing silence (less latency, smaller files), mono, 56 kbps.
const trim = 'silenceremove=start_periods=1:start_threshold=-55dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse';
let total = 0;
for (const [k, v] of Object.entries(sfx)) {
  const out = `public/sfx/${k}.mp3`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', S + v + '.mp3', '-vn', '-map_metadata', '-1', '-af', trim, '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '56k', out]);
  total += fs.statSync(out).size;
}
console.log('sfx total', Math.round(total / 1024) + 'KB');
