const ED2K_HASH_RE = /^[0-9A-F]{32}$/
const AMULERR_BTIH_RE = /^[0-9a-f]{40}$/

export function isValidEd2kHash(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length !== 32) {
    return false
  }
  return ED2K_HASH_RE.test(trimmed.toUpperCase())
}

export function isAmulerrBtih(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return AMULERR_BTIH_RE.test(normalized) && normalized.endsWith('00000000')
}

/** Internal ed2k hash: exactly 32 hex, uppercase. Accepts 32-hex or padded 40-hex aMulerr btih input. */
export function normalizeEd2kHash(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null
  }

  const trimmed = value.trim()

  if (trimmed.length === 32 && /^[0-9a-fA-F]{32}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  if (trimmed.length === 40 && /^[0-9a-fA-F]{40}$/.test(trimmed)) {
    if (!isAmulerrBtih(trimmed)) {
      return null
    }
    return fromQbittorrentHashStrict(trimmed)
  }

  return null
}

export function sameEd2kHash(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeEd2kHash(a)
  const right = normalizeEd2kHash(b)
  return left !== null && right !== null && left === right
}

/** API qBittorrent hash: exactly 40 hex lowercase with trailing 00000000. */
export function toQbittorrentHashStrict(ed2kHash: string): string | null {
  const normalized = normalizeEd2kHash(ed2kHash)
  if (!normalized) {
    return null
  }
  return `${normalized.toLowerCase()}00000000`
}

export function fromQbittorrentHashStrict(
  qbittorrentHash: string,
): string | null {
  const trimmed = qbittorrentHash.trim()
  if (trimmed.length !== 40 || !/^[0-9a-fA-F]{40}$/.test(trimmed)) {
    return null
  }
  if (!isAmulerrBtih(trimmed)) {
    return null
  }
  const ed2k = trimmed.slice(0, 32).toUpperCase()
  return isValidEd2kHash(ed2k) ? ed2k : null
}

/** Stable API output for a known ed2k hash; returns "" when invalid. */
export function toQbittorrentHash(ed2kHash: string): string {
  return toQbittorrentHashStrict(ed2kHash) ?? ''
}

export function toMagnetLink(hash: string, name: string, size: number) {
  const btih = toQbittorrentHashStrict(hash)
  if (!btih) {
    throw new Error('Invalid ed2k hash')
  }

  return `magnet:?xt=urn:btih:${btih}&dn=${encodeURIComponent(name)}&xl=${size}&tr=http://amulerr`
}

export function fromMagnetLink(magnetLink: string) {
  if (!magnetLink.startsWith('magnet:?')) {
    throw new Error('Invalid magnet link')
  }

  const params = new URLSearchParams(magnetLink.slice('magnet:?'.length))
  const xt = params.get('xt')
  if (!xt?.startsWith('urn:btih:')) {
    throw new Error('Invalid magnet link')
  }

  const btih = xt.slice('urn:btih:'.length)
  const name = params.get('dn')
  const size = params.get('xl')
  const tracker = params.get('tr')

  if (!btih || !name || !size || tracker !== 'http://amulerr') {
    throw new Error('Invalid magnet link')
  }

  if (!isAmulerrBtih(btih)) {
    throw new Error('Invalid magnet link')
  }

  const hash = fromQbittorrentHashStrict(btih)
  if (!hash) {
    throw new Error('Invalid magnet link')
  }

  if (!/^\d+$/.test(size)) {
    throw new Error('Invalid magnet link')
  }

  const parsedSize = Number(size)
  if (!Number.isSafeInteger(parsedSize) || String(parsedSize) !== size) {
    throw new Error('Invalid magnet link')
  }

  return { hash, name, size: parsedSize }
}

export function toEd2kLink(hash: string, name: string, size: number) {
  const normalized = normalizeEd2kHash(hash)
  if (!normalized) {
    throw new Error('Invalid ed2k hash')
  }
  return `ed2k://|file|${name}|${size}|${normalized}|/`
}

export function fromEd2kLink(ed2kLink: string) {
  const match =
    /^ed2k:\/\/\|file\|(?<name>[^|]+)\|(?<size>\d+)\|(?<hash>[0-9a-fA-F]{32})\|\/?$/.exec(
      ed2kLink,
    )

  const { hash, name, size } = match?.groups ?? {}
  if (!hash || !name || !size) {
    throw new Error('Invalid ed2k link')
  }

  const normalizedHash = normalizeEd2kHash(hash)
  if (!normalizedHash) {
    throw new Error('Invalid ed2k link')
  }

  const parsedSize = Number(size)
  if (!Number.isSafeInteger(parsedSize) || String(parsedSize) !== size) {
    throw new Error('Invalid ed2k link')
  }

  let decodedName: string
  try {
    decodedName = decodeURIComponent(name)
  } catch {
    throw new Error('Invalid ed2k link')
  }

  return { hash: normalizedHash, name: decodedName, size: parsedSize }
}
