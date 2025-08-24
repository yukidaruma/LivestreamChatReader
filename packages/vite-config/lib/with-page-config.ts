import env, { IS_DEV, IS_E2E_TEST, IS_PROD } from '@extension/env';
import { watchRebuildPlugin } from '@extension/hmr';
import react from '@vitejs/plugin-react-swc';
import deepmerge from 'deepmerge';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import type { UserConfig } from 'vite';

const definedValues: Record<string, string> = {};
if (!IS_E2E_TEST) {
  definedValues['navigator.webdriver'] = 'false';
}

export const watchOption = IS_DEV
  ? {
      chokidar: {
        awaitWriteFinish: true,
      },
    }
  : undefined;

export const withPageConfig = (config: UserConfig) =>
  defineConfig(
    deepmerge(
      {
        define: {
          'process.env': env,
          ...definedValues,
        },
        base: '',
        plugins: [react(), IS_DEV && watchRebuildPlugin({ refresh: true }), nodePolyfills()],
        build: {
          sourcemap: IS_DEV,
          minify: IS_PROD,
          reportCompressedSize: IS_PROD,
          emptyOutDir: IS_PROD,
          watch: watchOption,
          rollupOptions: {
            external: ['chrome'],
          },
        },
      },
      config,
    ),
  );
