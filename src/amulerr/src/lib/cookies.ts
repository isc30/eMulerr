export function isSecureRequest(request: Request) {
  if (new URL(request.url).protocol === 'https:') {
    return true
  }
  const forwarded = request.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase()
  return forwarded === 'https'
}

export function secureCookieSuffix(request: Request) {
  return isSecureRequest(request) ? '; Secure' : ''
}
