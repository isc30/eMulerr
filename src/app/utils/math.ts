export function roundToDecimals(value: number, decimals: number) {
    if (isNaN(value)) {
        value = 0
    }

    return Math.ceil(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

export function readableSize(bytes: number, decimals = 1) {
    if (isNaN(bytes)) {
        bytes = 0
    }

    if (bytes / 1024 < 1) return `${roundToDecimals(bytes, decimals)}B`
    bytes /= 1024
    if (bytes / 1024 < 1) return `${roundToDecimals(bytes, decimals)}KB`
    bytes /= 1024
    if (bytes / 1024 < 1) return `${roundToDecimals(bytes, decimals)}MB`
    bytes /= 1024
    if (bytes / 1024 < 1) return `${roundToDecimals(bytes, decimals)}GB`
    bytes /= 1024
    return `${roundToDecimals(bytes, decimals)}TB`
}
