import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// Phaser switches features with `typeof FLAG` checks that its own build replaces.
// Do the same here: no WebGL debug tooling, no 3D camera plugin, no Facebook Instant plugin.
const phaserFlags = {
  name: 'phaser-flags',
  enforce: 'pre',
  transform(code, id) {
    if (!id.split('\\').join('/').includes('/node_modules/phaser/src/')) return null;
    return code
      .replace(/typeof (WEBGL_DEBUG|PLUGIN_CAMERA3D|PLUGIN_FBINSTANT)\b/g, 'false')
      .replace(/typeof (WEBGL_RENDERER|CANVAS_RENDERER|FEATURE_SOUND)\b/g, 'true');
  },
};

export default ({ command }) => ({
  base: './',
  server: { port: 5173 },
  plugins: command === 'build' ? [phaserFlags] : [],
  // Phaser's source entry writes to `global`, which webpack supplied and browsers do not.
  define: command === 'build' ? { global: 'globalThis' } : {},
  // The production build uses a trimmed Phaser (see src/phaser-lite.js); dev keeps the full package.
  resolve: command === 'build'
    ? {
        alias: [
          { find: /^phaser$/, replacement: here('./src/phaser-lite.js') },
          // Phaser's package exports hide its source files, so reach them by path.
          { find: /^phaser-src\//, replacement: here('./node_modules/phaser/src/') },
          // Optional debug-only dependency that Phaser never needs at runtime here.
          { find: /^phaser3spectorjs$/, replacement: here('./src/stubs/empty.js') },
        ],
      }
    : {},
  build: {
    chunkSizeWarningLimit: 2000,
    // Phaser rarely changes, so keep it in its own file: later game updates re-download only the small game chunk.
    rollupOptions: {
      output: { manualChunks: (id) => (id.split('\\').join('/').includes('/node_modules/phaser/') || id.includes('/src/phaser-lite.js') ? 'phaser' : undefined) },
    },
  },
});
