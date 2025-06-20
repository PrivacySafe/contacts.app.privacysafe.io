import { resolve } from 'node:path';
import { UserConfig, defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

function _resolve(dir: string) {
  return resolve(__dirname, dir);
}

export const makeConfig = ({ mode }: UserConfig) => {
  const isDev = mode === 'development';
  // const isProd = mode === 'production'

  const server = {
    port: '3030',
    cors: { origin: '*' },
  };
  const define = { 'process.env': {} };

  const plugins = [vue(), vueDevTools()];

  let optimizeDeps = {};
  if (isDev) {
    optimizeDeps = {
      include: ['vue', 'vue-router', 'pinia', 'lodash'],
    };
  }

  return {
    server,
    build: {
      // reference: https://rollupjs.org/configuration-options/
      rollupOptions: {
        input: {
          main: _resolve('./index.html'),
          'main-mobile': _resolve('./index-mobile.html'),
        },
        output: [
          {
            name: 'main',
            dir: 'app',
          },
          {
            name: 'main-mobile',
            dir: 'app',
          },
        ],
      },
    },
    define,
    plugins,
    optimizeDeps,
    resolve: {
      alias: {
        vue: 'vue/dist/vue.esm-bundler.js',
        '@main': _resolve('./src'),
        '@shared': _resolve('./shared-libs'),
      },
    },
  };
}

// https://vitejs.dev/config/
// @ts-ignore
export default defineConfig(makeConfig);
