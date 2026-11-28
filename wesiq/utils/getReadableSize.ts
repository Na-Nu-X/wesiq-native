// Function For Get The Readable Size
export const getReadableSize = (bytes:number, decimals:number = 2):string => {
    if(bytes === 0 || !bytes) return "0 B"

    const k:number = 1024 // Gets The K
    const dm:number = decimals < 0 ? 0 : decimals // Gets The Dm
    const sizes:string[] = ["B", "KB", "MB", "GB", "TB"] // Gets The Sizes
    const i:number = Math.floor(Math.log(bytes) / Math.log(k)) // Gets The I

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}