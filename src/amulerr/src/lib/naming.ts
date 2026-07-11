export function setReleaseGroup(name: string) {
  if (/--aMulerr\.\w+$/i.test(name)) {
    return name
  }

  name = name.replace(/(.*)(\.\w+)$/, `$1--aMulerr$2`)
  return name
}

export function sanitizeUnicode(str: string) {
  const apostrophes = /[\u2018\u2019\u02BB\u02BC\u201B\u2032]/g

  // ordinal / numero markers ("n°3", "n º3", "n№3") so issue numbers stay parseable
  const ordinals = /[\u00B0\u00BA\u2116]/g

  return str
    .replace(ordinals, ' ')
    .normalize('NFKD')
    .replace(apostrophes, ' ')
    .replace(/[\u0100-\uFFFF]/g, '')
}

export function sanitizeQuery(q: string): string
export function sanitizeQuery(q: string | undefined | null): string
export function sanitizeQuery(q: string | undefined | null) {
  if (!q) {
    return q
  }

  return sanitizeUnicode(q)
    .replace(/[^\w \(\)'-]/g, ' ')
    .replace(/ +/g, ' ')
    .trim()
}

export function sanitizeFilename(str: string) {
  // remove illegal characters
  str = str.replace(/[/\\?%*:|"<>]/g, '_')
  str = sanitizeUnicode(str)

  // fix utf8 decoding artifacts
  while (true) {
    try {
      const nstr = decodeURIComponent(escape(str))
      if (nstr === str) {
        break
      }
      str = nstr
    } catch (e) {
      break
    }
  }

  return str
}
