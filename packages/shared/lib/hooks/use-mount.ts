import { useEffect, useRef } from 'react';

export const useMount = (callback: () => void) => {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      callback();
    }
  }, []);
};
