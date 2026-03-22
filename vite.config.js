import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

function copyAssets() {
  return {
    name: 'copy-assets',
    closeBundle() {
      const src = path.resolve(__dirname, 'assets/textures');
      const dest = path.resolve(__dirname, 'dist-web/assets/textures');
      fs.mkdirSync(dest, { recursive: true });
      for (const file of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
      }
    }
  };
}

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html')
    }
  },
  plugins: [copyAssets()]
});
