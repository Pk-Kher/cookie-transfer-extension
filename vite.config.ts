import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig(({ mode }): UserConfig => {
  if (mode === 'background') {
    return {
      build: {
        rollupOptions: {
          input: { background: resolve(__dirname, 'src/background/service-worker.ts') },
          output: {
            entryFileNames: '[name].js',
            format: 'es',
          },
        },
        outDir: 'dist',
        emptyOutDir: false,
        minify: true,
      },
    }
  }
  return {
    plugins: [react()],
    server: { open: '/options.html' },
    build: {
      rollupOptions: {
        input: {
          options: resolve(__dirname, 'options.html'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
      outDir: 'dist',
      emptyOutDir: true,
      minify: true,
    },
  }
})
