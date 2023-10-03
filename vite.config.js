/* eslint-disable @typescript-eslint/no-unused-vars */
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  // const isProd = mode === 'production'

  const server = {
    port: '3030',
    cors: {
      origin: '*',
    },
  }
  const define = {
    'process.env': {},
  }

  const plugins = [vue()]

  let optimizeDeps = {}
  if (isDev) {
    optimizeDeps = {
      include: [
        'vue',
        'vue-router',
        'lodash',
      ]
    }
  }

  const build = {
    outDir: 'app',
  }

  return {
    server,
    build,
    define,
    plugins,
    optimizeDeps,
    resolve: {
      alias: {
        'vue': 'vue/dist/vue.esm-bundler.js',
        '@': resolve(__dirname, './src'),
      }
    }
  }
})
