/**
 * Country-aware retailer registry. Each entry is a list of search-URL
 * builders so `find('olive oil')` opens that retailer's search results.
 *
 * The country is auto-detected from `navigator.language` (e.g. "en-PK"
 * → "PK"); the user can override via `setCountryOverride()`.
 *
 * Adding a country: pick 3-5 retailers with public search URLs, in
 * priority order — the first one is the default highlighted option.
 */
// Query-param encoding: spaces → "+" (the form-urlencoded standard most
// retailer search engines expect; %20 sometimes matches nothing).
const Q = (s) => encodeURIComponent(s).replace(/%20/g, '+')
// Path-segment encoding: spaces → %20 (used by retailers whose search
// keyword lives in the URL path, e.g. Sainsbury's).
const P = (s) => encodeURIComponent(s)

const RETAILERS = {
  PK: [
    { id: 'daraz', name: 'Daraz', url: (q) => `https://www.daraz.pk/catalog/?q=${Q(q)}` },
    { id: 'imtiaz', name: 'Imtiaz', url: (q) => `https://imtiaz.com.pk/search?type=product&q=${Q(q)}` },
    { id: 'naheed', name: 'Naheed', url: (q) => `https://www.naheed.pk/catalogsearch/result/?q=${Q(q)}` },
    { id: 'carrefour-pk', name: 'Carrefour', url: (q) => `https://www.carrefour.pk/mafpak/en/search?keyword=${Q(q)}` },
    { id: 'metro-pk', name: 'Metro', url: (q) => `https://www.metro-online.pk/search?q=${Q(q)}` },
    { id: 'google-pk', name: 'Google Shopping', url: (q) => `https://www.google.com/search?tbm=shop&q=${Q(q)}&gl=PK` },
  ],
  AE: [
    { id: 'carrefour-ae', name: 'Carrefour', url: (q) => `https://www.carrefouruae.com/mafuae/en/search?keyword=${Q(q)}` },
    { id: 'lulu-ae', name: 'Lulu', url: (q) => `https://gcc.luluhypermarket.com/en-ae/list/?search_text=${Q(q)}` },
    { id: 'noon-ae', name: 'Noon', url: (q) => `https://www.noon.com/uae-en/search/?q=${Q(q)}` },
    { id: 'amazon-ae', name: 'Amazon', url: (q) => `https://www.amazon.ae/s?k=${Q(q)}` },
    { id: 'google-ae', name: 'Google Shopping', url: (q) => `https://www.google.com/search?tbm=shop&q=${Q(q)}&gl=AE` },
  ],
  SA: [
    { id: 'carrefour-sa', name: 'Carrefour', url: (q) => `https://www.carrefourksa.com/mafsau/en/search?keyword=${Q(q)}` },
    { id: 'lulu-sa', name: 'Lulu', url: (q) => `https://gcc.luluhypermarket.com/en-sa/list/?search_text=${Q(q)}` },
    { id: 'noon-sa', name: 'Noon', url: (q) => `https://www.noon.com/saudi-en/search/?q=${Q(q)}` },
    { id: 'amazon-sa', name: 'Amazon', url: (q) => `https://www.amazon.sa/s?k=${Q(q)}` },
    { id: 'google-sa', name: 'Google Shopping', url: (q) => `https://www.google.com/search?tbm=shop&q=${Q(q)}&gl=SA` },
  ],
  IN: [
    { id: 'bigbasket', name: 'BigBasket', url: (q) => `https://www.bigbasket.com/ps/?q=${Q(q)}` },
    { id: 'blinkit', name: 'Blinkit', url: (q) => `https://blinkit.com/s/?q=${Q(q)}` },
    { id: 'zepto', name: 'Zepto', url: (q) => `https://www.zeptonow.com/search?query=${Q(q)}` },
    { id: 'amazon-in', name: 'Amazon', url: (q) => `https://www.amazon.in/s?k=${Q(q)}` },
    { id: 'google-in', name: 'Google Shopping', url: (q) => `https://www.google.co.in/search?tbm=shop&q=${Q(q)}&gl=IN` },
  ],
  US: [
    { id: 'amazon-us', name: 'Amazon', url: (q) => `https://www.amazon.com/s?k=${Q(q)}` },
    { id: 'walmart-us', name: 'Walmart', url: (q) => `https://www.walmart.com/search?q=${Q(q)}` },
    { id: 'target-us', name: 'Target', url: (q) => `https://www.target.com/s?searchTerm=${Q(q)}` },
    { id: 'kroger-us', name: 'Kroger', url: (q) => `https://www.kroger.com/search?query=${Q(q)}` },
    { id: 'instacart-us', name: 'Instacart', url: (q) => `https://www.instacart.com/store/s?k=${Q(q)}` },
    { id: 'google-us', name: 'Google Shopping', url: (q) => `https://www.google.com/search?tbm=shop&q=${Q(q)}&gl=US` },
  ],
  UK: [
    { id: 'tesco-uk', name: 'Tesco', url: (q) => `https://www.tesco.com/groceries/en-GB/search?query=${Q(q)}` },
    { id: 'sainsburys-uk', name: "Sainsbury's", url: (q) => `https://www.sainsburys.co.uk/gol-ui/SearchResults/${P(q)}` },
    { id: 'amazon-uk', name: 'Amazon', url: (q) => `https://www.amazon.co.uk/s?k=${Q(q)}` },
    { id: 'ocado-uk', name: 'Ocado', url: (q) => `https://www.ocado.com/search?entry=${Q(q)}` },
    { id: 'google-uk', name: 'Google Shopping', url: (q) => `https://www.google.co.uk/search?tbm=shop&q=${Q(q)}&gl=UK` },
  ],
  CA: [
    { id: 'amazon-ca', name: 'Amazon', url: (q) => `https://www.amazon.ca/s?k=${Q(q)}` },
    { id: 'walmart-ca', name: 'Walmart', url: (q) => `https://www.walmart.ca/search?q=${Q(q)}` },
    { id: 'loblaws-ca', name: 'Loblaws', url: (q) => `https://www.loblaws.ca/search?search-bar=${Q(q)}` },
    { id: 'google-ca', name: 'Google Shopping', url: (q) => `https://www.google.ca/search?tbm=shop&q=${Q(q)}&gl=CA` },
  ],
  AU: [
    { id: 'woolworths-au', name: 'Woolworths', url: (q) => `https://www.woolworths.com.au/shop/search/products?searchTerm=${Q(q)}` },
    { id: 'coles-au', name: 'Coles', url: (q) => `https://www.coles.com.au/search?q=${Q(q)}` },
    { id: 'amazon-au', name: 'Amazon', url: (q) => `https://www.amazon.com.au/s?k=${Q(q)}` },
    { id: 'google-au', name: 'Google Shopping', url: (q) => `https://www.google.com.au/search?tbm=shop&q=${Q(q)}&gl=AU` },
  ],
  DEFAULT: [
    { id: 'google', name: 'Google Shopping', url: (q) => `https://www.google.com/search?tbm=shop&q=${Q(q)}` },
    { id: 'amazon', name: 'Amazon', url: (q) => `https://www.amazon.com/s?k=${Q(q)}` },
  ],
}

export const COUNTRY_LABELS = {
  PK: '🇵🇰 Pakistan',
  AE: '🇦🇪 UAE',
  SA: '🇸🇦 Saudi Arabia',
  IN: '🇮🇳 India',
  US: '🇺🇸 United States',
  UK: '🇬🇧 United Kingdom',
  CA: '🇨🇦 Canada',
  AU: '🇦🇺 Australia',
  DEFAULT: '🌍 Other',
}

const STORAGE_KEY = 'recipyai.country.v1'

export function detectCountry() {
  // 1. User override (set via Settings)
  try {
    const override = localStorage.getItem(STORAGE_KEY)
    if (override && (RETAILERS[override.toUpperCase()] || override === 'DEFAULT')) {
      return override.toUpperCase()
    }
  } catch {
    /* localStorage unavailable */
  }

  // 2. Browser language: "en-PK" → "PK"
  const candidates = []
  if (navigator.language) candidates.push(navigator.language)
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages)
  for (const lang of candidates) {
    const m = String(lang).match(/-([A-Z]{2})\b/i)
    if (m) {
      const code = m[1].toUpperCase()
      if (RETAILERS[code]) return code
    }
  }

  return 'DEFAULT'
}

export function getRetailers(country) {
  return RETAILERS[country] || RETAILERS.DEFAULT
}

export function getKnownCountries() {
  return Object.keys(RETAILERS).filter((k) => k !== 'DEFAULT')
}

export function setCountryOverride(code) {
  try {
    if (code) localStorage.setItem(STORAGE_KEY, code.toUpperCase())
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}
