const BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const STORAGE_KEY = 'recipyai.tokens'

let tokens = loadTokens()
let refreshPromise = null
const listeners = new Set()

function loadTokens() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveTokens(next) {
  tokens = next
  if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  else localStorage.removeItem(STORAGE_KEY)
  listeners.forEach((l) => l(tokens))
}

export function getTokens() {
  return tokens
}

export function setTokens(next) {
  saveTokens(next)
}

export function clearTokens() {
  saveTokens(null)
}

export function onTokensChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function rawFetch(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers }
  if (auth && tokens?.access_token) h.Authorization = `Bearer ${tokens.access_token}`
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return res
}

async function refreshTokens() {
  if (!tokens?.refresh_token) throw new ApiError(401, 'not authenticated')
  if (!refreshPromise) {
    refreshPromise = rawFetch('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: tokens.refresh_token },
      auth: false,
    })
      .then(async (r) => {
        if (!r.ok) {
          clearTokens()
          throw new ApiError(401, 'refresh failed')
        }
        const next = await r.json()
        saveTokens(next)
        return next
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export class ApiError extends Error {
  constructor(status, message, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function request(path, opts = {}) {
  let res = await rawFetch(path, opts)
  if (res.status === 401 && opts.auth !== false && tokens?.refresh_token) {
    try {
      await refreshTokens()
      res = await rawFetch(path, opts)
    } catch (e) {
      clearTokens()
      throw e
    }
  }
  if (!res.ok) {
    const text = await res.text()
    let detail = text
    try {
      detail = text ? JSON.parse(text) : null
    } catch {
      // keep raw text
    }
    const message = detail?.detail || detail?.message || (typeof detail === 'string' && detail) || res.statusText
    throw new ApiError(res.status, message, detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body, opts) => request(path, { method: 'POST', body, ...opts }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
}
