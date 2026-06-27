export interface CopyResult {
  success: boolean
  copiedCookies: string[]
  notFoundCookies: string[]
  errors: string[]
}

export interface StoredSettings {
  sourceUrl: string
  cookieNames: string[]
}
