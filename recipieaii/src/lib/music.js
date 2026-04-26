/**
 * Curated stations for the cook-mode background player.
 * All streams are free, royalty-friendly, and serve direct HTTPS MP3 — so a
 * plain <audio src="..."> just works.
 */
export const STATIONS = [
  {
    id: 'off',
    label: 'Off',
    blurb: 'Cook in silence.',
    url: null,
  },
  {
    id: 'groovesalad',
    label: 'Groove Salad',
    blurb: 'Chilled, ambient electronica. The classic kitchen station.',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
    via: 'SomaFM',
  },
  {
    id: 'dronezone',
    label: 'Drone Zone',
    blurb: 'Atmospheric ambient. Long, slow, cinematic.',
    url: 'https://ice1.somafm.com/dronezone-128-mp3',
    via: 'SomaFM',
  },
  {
    id: 'lush',
    label: 'Lush',
    blurb: 'Sensuous downtempo with vocals.',
    url: 'https://ice1.somafm.com/lush-128-mp3',
    via: 'SomaFM',
  },
  {
    id: 'folkfwd',
    label: 'Folk Forward',
    blurb: 'Acoustic folk and indie singer-songwriters.',
    url: 'https://ice1.somafm.com/folkfwd-128-mp3',
    via: 'SomaFM',
  },
  {
    id: 'indiepop',
    label: 'Indie Pop Rocks',
    blurb: 'Upbeat indie pop. For when the dish needs a kick.',
    url: 'https://ice1.somafm.com/indiepop-128-mp3',
    via: 'SomaFM',
  },
  {
    id: 'beatblender',
    label: 'Beat Blender',
    blurb: 'Deep mixed house and downtempo grooves.',
    url: 'https://ice1.somafm.com/beatblender-128-mp3',
    via: 'SomaFM',
  },
  {
    id: 'kitchenhustle',
    label: 'Kitchen Hustle',
    blurb: 'Adventurous jazz — the sound of a working kitchen.',
    url: 'https://ice1.somafm.com/sonicuniverse-128-mp3',
    via: 'SomaFM Sonic Universe',
  },
  {
    id: 'custom',
    label: 'Custom stream',
    blurb: 'Your own MP3 stream URL.',
    url: null,
  },
]

const KEY = 'recipyai.music.v1'
const DEFAULT = { stationId: 'groovesalad', customUrl: '', volume: 0.5 }

export function loadMusicPrefs() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT, ...parsed }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveMusicPrefs(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable — fail silently */
  }
}

export function resolveStreamUrl(prefs) {
  if (!prefs?.stationId || prefs.stationId === 'off') return null
  if (prefs.stationId === 'custom') {
    const u = (prefs.customUrl || '').trim()
    return u || null
  }
  const s = STATIONS.find((x) => x.id === prefs.stationId)
  return s?.url || null
}

export function findStation(id) {
  return STATIONS.find((s) => s.id === id) || STATIONS[0]
}
