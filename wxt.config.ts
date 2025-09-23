import packageJson from './package.json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/auto-icons', '@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  autoIcons: {
    baseIconPath: 'public/speaker-icon.svg',
    developmentIndicator: 'overlay',
  },
  manifest: {
    default_locale: 'en',
    version: packageJson.version,
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    commands: {
      'toggle-activation': {
        description: '__MSG_toggleActivationCommandDescription__',
        suggested_key: {
          default: 'Alt+M',
        },
      },
    },
    host_permissions: [
      'https://www.youtube.com/live_chat*',
      'https://studio.youtube.com/live_chat*',
      'https://www.twitch.tv/*',
      'https://dashboard.twitch.tv/*',
    ],
    permissions: [
      'storage',
      'tts', // This permission is required for using TTS without user interaction
    ],
    background: {
      service_worker: 'background.js',
      type: 'module',
    },
    web_accessible_resources: [
      {
        resources: ['*.js', '*.css', '*.svg', '*.png'],
        matches: [
          // The exact same pattern with `content_scripts` does not work
          'https://www.youtube.com/*',
          'https://studio.youtube.com/*',
          'https://www.twitch.tv/*',
          'https://dashboard.twitch.tv/*',
        ],
      },
    ],
  },
  webExt: {
    disabled: true,
  },
  dev: {
    server: {
      host: '0.0.0.0',
    },
  },
});
