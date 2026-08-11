// Colors

export const MAIN_COLOR:string = "#060b18" // Defines The Main Color
export const SECONDARY_COLOR:string = "#f2f5ff" // Defines The Secondary Color

export const BLUE_COLOR:string = "#5b8cff" // Defines The Blue Color
export const DARK_BLUE_COLOR:string = "#3d6ef5" // Defines The Dark Blue Color
export const LIGHT_BLUE_COLOR:string = "#c2e0fa" // Defines The Light Blue Color

export const GREEN_COLOR:string = "#3dd68c" // Defines The Green Color
export const RED_COLOR:string = "#ff5c6a" // Defines The Red Color

// Function For Adding The Transparency
export function transparentize(hex_color:string, amount:number):string {
    const clamped_amount:number = Math.min(1, Math.max(0, amount))
    const alpha_value:number = Math.round((1 - clamped_amount) * 255)
    const alpha_hex:string = alpha_value.toString(16).padStart(2, "0")
    const cleanHex:string = hex_color.startsWith("#") ? hex_color.slice(0, 7) : `#${hex_color.slice(0, 6)}`
  
    return `${cleanHex}${alpha_hex}` // Returns The Color
}