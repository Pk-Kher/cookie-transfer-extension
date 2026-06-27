export function isValidUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export function isSecureUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}
