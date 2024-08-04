export function toImdbId(imdbid: string): string
export function toImdbId(imdbid: string | undefined): string | undefined
export function toImdbId(imdbid: string | undefined) {
    if (!imdbid) return undefined
    return imdbid.startsWith("tt") ? imdbid : `tt${imdbid}`
}

export function toTvdbId(tvdbId: number | string): string
export function toTvdbId(tvdbId: number | string | undefined): string | undefined
export function toTvdbId(tvdbId: number | string | undefined) {
    if (!tvdbId) return undefined
    return `tv${tvdbId}`
}
