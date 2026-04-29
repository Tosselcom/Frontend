const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fitri9i-api.onrender.com'
const EXPLICIT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''
const STORAGE_KEY = 'tosselcom.api.baseUrl'

let resolvedApiBaseUrl = DEFAULT_API_BASE_URL
let discoveryPromise = null

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').trim().replace(/\/+$/, '')
}

function buildCandidates() {
  const candidates = []

  if (EXPLICIT_API_BASE_URL) {
    candidates.push(EXPLICIT_API_BASE_URL)
  }

  candidates.push('https://fitri9i-api.onrender.com')

  for (let port = 5010; port >= 5000; port -= 1) {
    candidates.push(`http://localhost:${port}`)
  }

  if (!EXPLICIT_API_BASE_URL) {
    candidates.push(DEFAULT_API_BASE_URL)
  }

  return [...new Set(candidates.map(normalizeBaseUrl).filter(Boolean))]
}

async function pingHealth(baseUrl, timeoutMs = 900) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller?.signal,
    })

    return response.ok
  } catch {
    return false
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function setResolvedBaseUrl(nextBaseUrl) {
  const normalized = normalizeBaseUrl(nextBaseUrl)
  if (!normalized) return

  resolvedApiBaseUrl = normalized

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, normalized)
  }
}

export async function discoverApiBaseUrl(options = {}) {
  const { force = false } = options

  if (typeof window === 'undefined') {
    return resolvedApiBaseUrl
  }

  const cached = normalizeBaseUrl(window.localStorage.getItem(STORAGE_KEY) || '')
  if (!force && cached) {
    const cachedHealthy = await pingHealth(cached)
    if (cachedHealthy) {
      resolvedApiBaseUrl = cached
      return resolvedApiBaseUrl
    }

    window.localStorage.removeItem(STORAGE_KEY)
  }

  if (discoveryPromise && !force) {
    return discoveryPromise
  }

  discoveryPromise = (async () => {
    const candidates = buildCandidates()

    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const healthy = await pingHealth(candidate)
      if (healthy) {
        setResolvedBaseUrl(candidate)
        return resolvedApiBaseUrl
      }
    }

    return resolvedApiBaseUrl
  })()

  try {
    return await discoveryPromise
  } finally {
    discoveryPromise = null
  }
}

if (typeof window !== 'undefined') {
  const cached = normalizeBaseUrl(window.localStorage.getItem(STORAGE_KEY) || '')
  if (cached) {
    resolvedApiBaseUrl = cached
  }

  void discoverApiBaseUrl()
}

export function getApiBaseUrl() {
  return resolvedApiBaseUrl
}

export function getApiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${resolvedApiBaseUrl}${normalizedPath}`
}
