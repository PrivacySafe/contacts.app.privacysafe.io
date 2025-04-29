import { resolve } from 'node:path';
import { UserConfig, defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

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
          main: resolve(__dirname, './index.html')
        },
        output: [
          {
            name: 'main',
            dir: 'app'
          }
        ]
      },
    },
    define,
    plugins,
    optimizeDeps,
    resolve: {
      alias: {
        vue: 'vue/dist/vue.esm-bundler.js',
        '@main': resolve(__dirname, './src'),
        '@shared': resolve(__dirname, './shared-libs'),
      },
    },
  };
}

// https://vitejs.dev/config/
// @ts-ignore
export default defineConfig(makeConfig);
