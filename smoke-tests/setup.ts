import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

configure({ asyncUtilTimeout: 15000 });

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error jsdom polyfill
global.ResizeObserver = ResizeObserverMock;
window.scrollTo = () => {};

const originalGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (element: Element, pseudoElt?: string | null) => {
  if (pseudoElt) {
    return originalGetComputedStyle(element);
  }

  return originalGetComputedStyle(element, pseudoElt);
};

Object.defineProperties(HTMLElement.prototype, {
  clientWidth: {
    configurable: true,
    value: 1024,
  },
  clientHeight: {
    configurable: true,
    value: 360,
  },
});

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  return {
    width: 1024,
    height: 360,
    top: 0,
    left: 0,
    right: 1024,
    bottom: 360,
    x: 0,
    y: 0,
    toJSON: () => {},
  };
};
