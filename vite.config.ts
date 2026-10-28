import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

// Porta fixa: o tauri.conf.json aponta devUrl para http://localhost:1420
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {port: 1420, strictPort: true},
});
