import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 룰 엔진은 game/src를 그대로 import한다 (룰 로직 재구현 금지 — docs/game-design.md 11절)
const engineDir = fileURLToPath(new URL('../src', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@engine': engineDir },
  },
  server: {
    port: 5178,
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), engineDir] },
  },
});
