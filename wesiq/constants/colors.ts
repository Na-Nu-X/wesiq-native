// Legacy Colors (Kept While Screens Move To The Design Tokens In "@/theme", Don't Use In New Code)

import { colors } from "@/theme"

export const MAIN_COLOR:string = colors.background // Defines The Main Color
export const SECONDARY_COLOR:string = colors.text // Defines The Secondary Color

export const BLUE_COLOR:string = colors.primary // Defines The Blue Color
export const DARK_BLUE_COLOR:string = "#3d6ef5" // Defines The Dark Blue Color
export const LIGHT_BLUE_COLOR:string = colors.text_accent // Defines The Light Blue Color

export const GREEN_COLOR:string = colors.success // Defines The Green Color
export const RED_COLOR:string = colors.danger // Defines The Red Color

export const YELLOW_COLOR:string = colors.warning // Defines The Yellow Color

// Function For Adding The Transparency (Amount 0 = Opaque, 1 = Fully Transparent)
export function transparentize(hex_color:string, amount:number):string {
    const clamped_amount:number = Math.min(1, Math.max(0, amount)) // Clamps The Amount Between 0 And 1
    const alpha_value:number = Math.round((1 - clamped_amount) * 255) // Gets The Alpha Value
    const alpha_hex:string = alpha_value.toString(16).padStart(2, "0") // Gets The Alpha Hex
    const clean_hex:string = hex_color.startsWith("#") ? hex_color.slice(0, 7) : `#${hex_color.slice(0, 6)}` // Gets The Hex Without Alpha

    return `${clean_hex}${alpha_hex}` // Returns The Color
}
