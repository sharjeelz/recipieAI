/**
 * RecipyAI service worker — offline support for cook mode.
 *
 * The use case that justifies this: standing in a kitchen, phone on the
 * counter, wifi dropping out mid-recipe. Losing the step list at that
 * moment is the worst possible time to lose it.
 *
 * Strategies, chosen per request type:
 *
 *  - Navigations: network-first, falling back to the cached app shell.
 *    Never cache-first — that's how you ship an app that won't update.
 *  - /assets/*: cache-first. Vite content-hashes these filenames, so a
 *    given URL's bytes never change; a new build produces new names.
 *  - API GETs: network-first with a cache fallback, so a recipe you've
 *    opened before still renders with no connection. Only 200s are
 *    stored, and only GETs — never a POST/PATCH/DELETE.
 *
 * Auth responses are never cached. The API cache is dropped on logout
 * (the app posts CLEAR_API_CACHE), so signing out doesn't leave another
 * user's recipes readable on a shared device.
 */

const VERSION = 'v1'
const SHELL_CACHE = `recipyai-shell-${VERSION}`
const ASSET_CACHE = `recipyai-assets-${VERSION}`
const API_CACHE = `recipyai-api-${VERSION}`
const CURRENT = [SHELL_CACHE, ASSET_CACHE, API_CACHE]

const SHELL_URL = '/index.html'

// Endpoints that must never be written to disk.
const NEVER_CACHE = ['/auth/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => c.add(new Request(SHELL_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('recipyai-') && !CURRENT.includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_API_CACHE') {
    event.waitUntil(caches.delete(API_CACHE))
  }
})

function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

function isAsset(url) {
  return url.pathname.startsWith('/assets/')
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(request)
    if (res && res.status === 200) cache.put(request, res.clone())
    return res
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw err
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const res = await fetch(request)
  if (res && res.status === 200) cache.put(request, res.clone())
  return res
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Anything that changes server state must always go to the network.
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (NEVER_CACHE.some((p) => url.pathname.includes(p))) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE)
        const shell = await cache.match(SHELL_URL)
        // A client-side route with no shell cached yet is genuinely offline.
        return shell || Response.error()
      }),
    )
    return
  }

  if (isAsset(url)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE))
    return
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  // Icons, manifest, fonts served from our origin.
  event.respondWith(networkFirst(request, SHELL_CACHE))
})
