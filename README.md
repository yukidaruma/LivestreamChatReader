# Livestream Chat Reader

[![Chrome Web Store - Version](https://img.shields.io/chrome-web-store/v/gpnckbhgpnjciklpoehkmligeaebigaa?style=flat-square&color=%234285f4&label=Version&logo=google-chrome)](https://chromewebstore.google.com/detail/gpnckbhgpnjciklpoehkmligeaebigaa)
[![Chrome Web Store - Downloads](https://img.shields.io/chrome-web-store/users/gpnckbhgpnjciklpoehkmligeaebigaa?style=flat-square&color=%234285f4&label=Downloads&logo=googlechrome)](https://chromewebstore.google.com/detail/gpnckbhgpnjciklpoehkmligeaebigaa)

## Development

I recommend using VS Code Dev Containers for development of this extension. Start the dev container, then run `pnpm dev` to launch the development server and build the extension. Once the extension is built, install the extension to your browser by loading the unpacked extension built to the `dist` directory.  
*For detailed installation steps, you can also refer to the [Chrome extension installation guide](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite#for-chrome-).*

For production builds, use `pnpm build` to build an optimized version or `pnpm zip` to build and create a zip file for distribution.

### Note

- There is a hidden debug interface that can be used for development, only enabled in the development build by config in `chrome-extension/manifest.ts`. Click "Open side panel" from the extension menu to access it.
  <img src="docs/debug-side-panel.png" width="320" alt="Debug side panel">
  - It is included in the release version of this extension, but cannot normally be accessed through user interface. You can still open it directly via `chrome-extension://gpnckbhgpnjciklpoehkmligeaebigaa/side-panel/index.html`.
- If you are looking for a framework to start developing Chrome extensions, you should definitely check out [WXT](https://github.com/wxt-dev/wxt) as well as [Chrome Extension Boilerplate](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite), which this project is built upon.

## License

This Chrome extension is licensed under the [MIT License](LICENSE).  
The boilerplate used in this project ([Jonghakseo/chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite)) is also licensed under the [MIT License](LICENSE.boilerplate).
