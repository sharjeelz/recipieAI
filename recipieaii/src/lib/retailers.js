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
const ENC = encodeURIComponent

const RETAILERS = {
  PK: [
    { id: 'daraz', name: 'Daraz', url: (q) => `https://www.daraz.pk/catalog/?q=${ENC(q)}` },
    { id: 'imtiaz', name: 'Imtiaz', url: (q) => `https://imtiaz.com.pk/search?type=product&q=${ENC(q)}` },
    { id: 'naheed', name: 'Naheed', url: (q) => `https://www.naheed.pk/catalogsearch/result/?q=${ENC(q)}` },
    { id: 'carrefour-pk', name: 'Carrefour', url: (q) => `https://www.carrefour.pk/mafpak/en/v4/search?keyword=${ENC(q)}` },
    { id: 'foodpanda-pk', name: 'Foodpanda', url: (q) => `https://www.foodpanda.pk/groceries?cuisine=174&q=${ENC(q)}` },
    { id: 'google-pk', name: 'Google Shopping', url: (q) => `https://www.google.com/search?tbm=shop&q=${ENC(q)}&gl=PK` },
  ],
  AE: [
    { id: 'carrefour-ae', name: 'Carrefour', url: (q) => `https://www.carrefouruae.com/mafuae/en/v4/search?keyword=${ENC(q)}` },
    { id: 'lulu-ae', name: 'Lulu', url: (q) => `https://gcc.luluhypermarket.com/en-ae/catalogsearch/result/?q=${ENC(q)}` },
    { id: 'noon-ae', name: 'Noon', url: (q) => `https://www.noon.com/uae-en/search/?q=${ENC(q)}` },
    { id: 'amazon-ae', name: 'Amazon', url: (q) => `https://www.amazon.ae/s?k=${ENC(q)}` },
    { id: 'google-ae', name: 'Google Shopping', url: (q) => `https://www.google.com/search?tbm=shop&q=${ENC(q)}&gl=AE` },
  ],
  SA: [
    { id: 'carrefour-sa', name: 'Carrefour', url: (q) => `https://www.carrefourksa.com/mafsau/en/v4/search?keyword=${ENC(q)}` },
    { id: 'lulu-sa', name: 'Lulu', url: (q) => `https://saudi.luluhypermarket.com/en-sa/catalogsearch/result/?q=${ENC(q)}` },
    { id: 'noon-sa', name: 'Noon', url: (q) => `https://www.noon.com/saudi-en/search/?q=${ENC(q)}` },
    { id: 'amazon-sa', name: 'Amazon', url: (q) => `https://www.amazon.sa/s?k=${ENC(q)}` },
    { id: 'google-sa', name: 'Google Shopping', url: (q) => `https://www.google.com/search?tbm=shop&q=${ENC(q)}&gl=SA` },
  ],
  IN: [
    { id: 'bigbasket', name: 'BigBasket', url: (q) => `https://www.bigbasket.com/ps/?q=${ENC(q)}` },
    { id: 'blinkit', name: 'Blinkit', url: (q) => `https://blinkit.com/s/?q=${ENC(q)}` },
    { id: 'zepto', name: 'Zepto', url: (q) => `https://www.zeptonow.com/search?query=${ENC(q)}` },
    { id: 'amazon-in', name: 'Amazon', url: (q) => `https://www.amazon.in/s?k=${ENC(q)}` },
    { id: 'google-in', name: 'Google Shopping', url: (q) => `https://www.google.co.in/search?tbm=shop&q=${ENC(q)}&gl=IN` },
  ],
  US: [
    { id: 'amazon-us', name: 'Amazon', url: (q) => `https://www.amazon.com/s?k=${ENC(q)}` },
    { id: 'walmart-us', name: 'Walmart', url: (q) => `https://www.walmart.com/search?q=${ENC(q)}` },
    { id: 'target-us', name: 'Target', url: (q) => `https://www.target.com/s?searchTerm=${ENC(q)}` },
    { id: 'kroger-us', name: 'Kroger', url: (q) => `https://www.kroger.com/search?query=${ENC(q)}` },
    { id: 'instacart-us', name: 'Instacart', url: (q) => `https://www.instacart.com/store/s?k=${ENC(q)}` },
    { id: 'google-us', name: 'Google Shopping', url: (q) => `https://www.google.com/search?tbm=shop&q=${ENC(q)}&gl=US` },
  ],
  UK: [
    { id: 'tesco-uk', name: 'Tesco', url: (q) => `https://www.tesco.com/groceries/en-GB/search?query=${ENC(q)}` },
    { id: 'sainsburys-uk', name: "Sainsbury's", url: (q) => `https://www.sainsburys.co.uk/gol-ui/SearchResults/${ENC(q)}` },
    { id: 'amazon-uk', name: 'Amazon', url: (q) => `https://www.amazon.co.uk/s?k=${ENC(q)}` },
    { id: 'ocado-uk', name: 'Ocado', url: (q) => `https://www.ocado.com/search?entry=${ENC(q)}` },
    { id: 'google-uk', name: 'Google Shopping', url: (q) => `https://www.google.co.uk/search?tbm=shop&q=${ENC(q)}&gl=UK` },
  ],
  CA: [
    { id: 'amazon-ca', name: 'Amazon', url: (q) => `https://www.amazon.ca/s?k=${ENC(q)}` },
    { id: 'walmart-ca', name: 'Walmart', url: (q) => `https://www.walmart.ca/search?q=${ENC(q)}` },
    { id: 'loblaws-ca', name: 'Loblaws', url: (q) => `https://www.loblaws.ca/search?search-bar=${ENC(q)}` },
    { id: 'google-ca', name: 'Google Shopping', url: (q) => `https://www.google.ca/search?tbm=shop&q=${ENC(q)}&gl=CA` },
  ],
  AU: [
    { id: 'woolworths-au', name: 'Woolworths', url: (q) => `https://www.woolworths.com.au/shop/search/products?searchTerm=${ENC(q)}` },
    { id: 'coles-au', name: 'Coles', url: (q) => `https://www.coles.com.au/search?q=${ENC(q)}` },
    { id: 'amazon-au', name: 'Amazon', url: (q) => `https://www.amazon.com.au/s?k=${ENC(q)}` },
    { id: 'google-au', name: 'Google Shopping', url: (q) => `https://www.google.com.au/search?tbm=shop&q=${ENC(q)}&gl=AU` },
  ],
  DEFAULT: [
    { id: 'google', name: 'Google Shopping', url: (q) => `https://www.google.com/search?tbm=shop&q=${ENC(q)}` },
    { id: 'amazon', name: 'Amazon', url: (q) => `https://www.amazon.com/s?k=${ENC(q)}` },
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
