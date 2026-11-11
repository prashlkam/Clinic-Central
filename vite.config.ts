import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// The packaged UI may only load its own files: no remote scripts, styles, fonts or network calls.
// (Applied to production builds only; the dev server needs inline scripts for hot reload.)
const localOnlyCsp = {
  name: 'local-only-csp',
  apply: 'build' as const,
  transformIndexHtml(html: string) {
    const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'";
    return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
  },
};

export default defineConfig({
  plugins: [react(), localOnlyCsp],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
