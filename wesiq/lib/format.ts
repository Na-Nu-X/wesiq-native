// Formatting Helpers

// Function For Format Seconds As m:ss
export const formatDuration = (seconds:number):string => {
    const safe_seconds:number = Math.max(0, Math.round(seconds)) // Gets The Rounded Seconds
    return `${Math.floor(safe_seconds / 60)}:${String(safe_seconds % 60).padStart(2, "0")}`
}

// Function For Format Bytes As Megabytes
export const formatMegabytes = (bytes:number):string => `${Math.round(bytes / 1_000_000)} MB`
