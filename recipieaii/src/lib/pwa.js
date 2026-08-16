/**
 * Service worker registration.
 *
 * Dev is deliberately excluded: a service worker caching Vite's module
 * graph fights HMR and produces baffling stale-module bugs. It also
 * actively unregisters any worker left over from a previous production
 * build on the same origin (localhost), which is exactly where that
 * confusion tends to come from.
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister())
    })
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is a bonus, never a requirement — if registration
      // fails (private mode, unsupported context) the app works as normal.
    })
  })
}

/** Drop cached API responses — called on logout so a signed-out device
 *  doesn't keep another user's recipes readable. */
export function clearApiCache() {
  navigator.serviceWorker?.controller?.postMessage('CLEAR_API_CACHE')
}
