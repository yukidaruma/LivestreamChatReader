import { extensionEnabledStorage } from '@extension/storage';
import { useEffect } from 'react';

export const updateIcon = async () => {
  const { enabled } = await extensionEnabledStorage.get();
  const icon = enabled ? '128.png' : 'mute-128.png';

  browser.action.setIcon({
    path: `/icons/${icon}`,
  });
};

/**
 * Calling this hook in different components simultaneously creates redundant subscriptions;
 * however, it is functionally safe.
 */
export const useSubscribeIcon = () => {
  useEffect(() => {
    const unsubscribe = extensionEnabledStorage.subscribe(updateIcon);

    return unsubscribe;
  }, []);
};
