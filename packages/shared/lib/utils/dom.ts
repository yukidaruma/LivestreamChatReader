export const waitForElementAppearance = async (selector: string) =>
  new Promise<Element>(resolve => {
    // Check if element already exists
    const existingElement = document.querySelector(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Check if the added element matches the selector
              if (element.matches(selector)) {
                resolve(element);
                observer.disconnect();
                return;
              }

              // Check if the added element contains a matching element
              const foundElement = element.querySelector(selector);
              if (foundElement) {
                resolve(foundElement);
                observer.disconnect();
                return;
              }
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });

export const waitForElementRemoval = async (element: Element) =>
  new Promise<void>(resolve => {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (let i = 0; i < mutation.removedNodes.length; i++) {
            const node = mutation.removedNodes[i];
            if (node === element || node.contains(element)) {
              resolve();
              observer.disconnect();
              break;
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
