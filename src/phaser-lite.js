// A trimmed Phaser build: the core plus only the game objects this game uses
// (Image, Text, Graphics, Container, Zone, Rectangle, Particles) and no physics,
// tilemaps, curves, DOM elements, Spine, video or other unused systems.
import Phaser from 'phaser-src/phaser-core.js';
import 'phaser-src/gameobjects/container/ContainerFactory.js';
import 'phaser-src/gameobjects/zone/ZoneFactory.js';
import 'phaser-src/gameobjects/shape/rectangle/RectangleFactory.js';
import 'phaser-src/gameobjects/particles/ParticleEmitterFactory.js';
import Clamp from 'phaser-src/math/Clamp.js';
import Shuffle from 'phaser-src/utils/array/Shuffle.js';

Phaser.Math.Clamp = Clamp;
Phaser.Utils = { Array: { Shuffle } };

export default Phaser;
