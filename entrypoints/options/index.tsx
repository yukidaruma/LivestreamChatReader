import Options from './Options';
import { ConfirmProvider } from '@extension/ui';
import { createRoot } from 'react-dom/client';

const init = () => {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);
  root.render(
    <ConfirmProvider>
      <Options />
    </ConfirmProvider>,
  );
};

init();
