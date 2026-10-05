import Phaser from 'phaser';
import { W, H } from './config.js';
import Boot from './scenes/Boot.js';
import Menu from './scenes/Menu.js';
import Levels from './scenes/Levels.js';
import Game from './scenes/Game.js';
import Parents from './scenes/Parents.js';

document.addEventListener('contextmenu', (e) => e.preventDefault());

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#2a46a8',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  render: { antialias: true },
  scene: [Boot, Menu, Levels, Game, Parents],
});

if (import.meta.env.DEV) {
  // Dev helper: advance the game by fixed frames so it can be tested in a background tab.
  window.__game = game;
  window.__adv = (ms) => {
    const tm = Object.getPrototypeOf(game.scene.getScenes(false)[0].tweens);
    tm.getDelta = () => 16.7;
    let t = game.loop.lastTime || performance.now();
    for (let e = 0; e < ms; e += 16.7) { t += 16.7; game.step(t, 16.7); }
    game.loop.lastTime = t;
  };
}
