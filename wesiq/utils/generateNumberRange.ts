// Function For Generate Range Of Numbers
export function generateNumberRange(from:number, to:number):number {
    return Math.floor(Math.random() * (to - from + from) + from)
}