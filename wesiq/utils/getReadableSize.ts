// Function For Get The Readable Size
export const getReadableSize = (bytes:number, decimals:number = 2):string => {
    console.log(bytes)
    if(bytes === 0 || !bytes) return "0 B"

    const k:number = 1024
    const dm:number = decimals < 0 ? 0 : decimals
    const sizes:string[] = ["B", "KB", "MB", "GB", "TB"]
    const i:number = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}