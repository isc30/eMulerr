export function setReleaseGroup(name: string) {
  if (/--eMulerr\.\w+$/i.test(name)) {
    return name
  }

  name = name.replace(/(.*)(\.\w+)$/, `$1--eMulerr$2`)
  return name
}

export function sanitizeFilename(str: string) {
  // remove illegal characters
  str = str.replace(/[/\\?%*:|"<>]/g, "")

  // replace unicode chars with their ascii equivalent
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // fix utf8 decoding artifacts
  while (true) {
    try {
      const nstr = decodeURIComponent(escape(str));
      if (nstr === str) {
        break
      }
      str = nstr
    } catch (e) {
      break;
    }
  }

  return str
}
