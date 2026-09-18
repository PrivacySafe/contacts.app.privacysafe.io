/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type UserConfig, type ConfigEnv, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

function _resolve(dir: string) {
  return resolve(import.meta.dirname, dir);
}

/**
 * Asset file names are intentionally kept stable (no content hash), so an
 * updated app package serves new JS and CSS under the URLs the previous version
 * already used. The platform's webview may then answer with a cached copy of an
 * asset while taking another one from the new package, which shows up as new JS
 * running against stale CSS. Appending the app version to the asset links in
 * generated html keeps the file names intact while making the URLs change on
 * every release. The w3n-app protocol handler routes by url.pathname, so the
 * query is ignored when the file is read.
 *
 * A query is not inherited by relative imports, so chunk-to-chunk imports inside
 * the generated JS have to be rewritten as well - otherwise a preloaded
 * `useAppView.js?v=N` and the `./useAppView.js` the entry actually imports are
 * two different URLs, and only the latter decides what runs.
 */
function assetVersionQuery(): Plugin {
  const { version } = JSON.parse(readFileSync(_resolve('./package.json'), 'utf8'));
  const query = `?v=${version}`;
  return {
    name: 'asset-version-query',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html: string) => html.replace(/(href|src)="(\/assets\/[^"?]+)"/g, `$1="$2${query}"`),
    },
    generateBundle(_options: any, bundle: Record<string, any>) {
      const chunkFiles = Object.keys(bundle).filter(file => bundle[file].type === 'chunk');
      const importedAs = chunkFiles.map(file => `./${file.split('/').pop()}`);
      for (const file of chunkFiles) {
        const chunk = bundle[file];
        for (const specifier of importedAs) {
          chunk.code = chunk.code.split(`"${specifier}"`).join(`"${specifier}${query}"`);
        }
      }
    },
  };
}

export const makeConfig = ({ mode }: ConfigEnv): UserConfig => {
  const isDev = mode === 'development';
  // const isProd = mode === 'production'

  const server = {
    port: 3030,
    cors: { origin: '*' },
  };

  const css = {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      } as any,
    },
  };

  const define = {
    'process.env.NODE_ENV': JSON.stringify(mode),
    global: 'globalThis',
  };

  const plugins = [vue(), isDev && vueDevTools(), assetVersionQuery()].filter(Boolean);

  const build = {
    outDir: 'app',
    // Keeps all the css in a single file with a stable name, instead of letting
    // the chunk layout decide where the library's tokens end up.
    cssCodeSplit: false,
    rolldownOptions: {
      input: {
        main: _resolve('./index.html'),
        'main-mobile': _resolve('./index-mobile.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
      treeshake: {
        manualPureFunctions: ['console.log'],
      },
    },
  };

  return {
    server,
    css,
    build,
    define,
    plugins,
    resolve: {
      alias: {
        vue: 'vue/dist/vue.esm-bundler.js',
        '@main': _resolve('./src'),
        '@shared': _resolve('./shared-libs'),
        '@deno': _resolve('./src-deno'),
      },
    },
  };
};

export default defineConfig(makeConfig);
