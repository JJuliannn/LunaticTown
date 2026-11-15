import { defineConfig } from 'vite';

export default defineConfig({
  // Static files (logo, sprites, sounds) live in assets/ and are served from the site root:
  // assets/logo.png -> /logo.png
  publicDir: 'assets',
  base: './',
});
