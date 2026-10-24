import "@testing-library/jest-dom/vitest"
import { configure } from "@testing-library/react"

// The views and the layouts are loaded on demand, and the first one to be drawn
// in a test file is transformed by vitest on the way: longer than a second when
// the files run side by side.
configure({ asyncUtilTimeout: 5000 })

// jsdom implements neither of these, and the responsive components call them
// on mount.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

if (!globalThis.EventSource) {
  globalThis.EventSource = class {
    close() {}
    addEventListener() {}
    removeEventListener() {}
  } as never
}
