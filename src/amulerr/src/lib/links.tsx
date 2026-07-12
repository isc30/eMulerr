import base32 from "hi-base32"

function normalizeEd2kHashForMagnet(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length !== 32 || !/^[0-9a-fA-F]{32}$/.test(trimmed)) {
    return null
  }
  return trimmed.toUpperCase()
}

export function toMagnetLink(hash: string, name: string, size: number) {
  const normalized = normalizeEd2kHashForMagnet(hash)
  if (!normalized) {
    throw new Error("Invalid ed2k hash")
  }

  const btih = `${normalized.toLowerCase()}00000000`
  return `magnet:?xt=urn:btih:${btih}&dn=${encodeURIComponent(name)}&xl=${size}&tr=http://amulerr`
}

export function fromMagnetLink(magnetLink: string) {
  const extractMagnetLinkInfo =
    /magnet:\?xt=urn:btih:(?<hash>.*)&dn=(?<name>.*)&xl=(?<size>[^&]+)&tr=http:\/\/amulerr/
  const {
    hash: base32Hash,
    name,
    size,
  } = extractMagnetLinkInfo.exec(magnetLink)?.groups ?? {}

  if (!base32Hash || !name || !size) {
    throw new Error("Invalid magnet link")
  }

  const hash = Buffer.from(base32.decode.asBytes(base32Hash))
    .toString("hex")
    .substring(0, 32)
    .toUpperCase()
  return { hash, name: decodeURIComponent(name), size: parseInt(size) }
}

export function toEd2kLink(hash: string, name: string, size: number) {
  return `ed2k://|file|${name}|${size}|${hash}|/`
}

export function fromEd2kLink(ed2kLink: string) {
  const extractEd2kLinkInfo =
    /ed2k:\/\/\|file\|(?<name>[^\|]+)\|(?<size>[^\|]+)\|(?<hash>[^\|]+)\|/

  const { hash, name, size } = extractEd2kLinkInfo.exec(ed2kLink)?.groups ?? {}

  if (!hash || !name || !size) {
    throw new Error("Invalid ed2k link")
  }

  return { hash, name: decodeURIComponent(name), size: parseInt(size) }
}
