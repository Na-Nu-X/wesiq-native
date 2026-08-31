// Function For Generate Random Color In The Specific Range
export function randomColor(from:number=0, to:number=255):string {
    return `rgb(${Math.floor(Math.random() * ((to + 1) - from) + from)},${Math.floor(Math.random() * ((to + 1) - from) + from)},${Math.floor(Math.random() * ((to + 1) - from) + from)})`
}