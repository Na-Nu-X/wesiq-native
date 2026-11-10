// Typed FontAwesome 6 Icon (Wraps @expo/vector-icons So Icon Names Are Checked By TypeScript)

import { ComponentProps } from "react"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { colors } from "@/theme"

import type { ColorToken } from "@/theme"

export type IconName = ComponentProps<typeof FontAwesome6>["name"]

export interface IconProps {
    name:IconName,
    size?:number,
    color?:ColorToken,
    is_solid?:boolean
}

export default function Icon({ name, size = 18, color = "text", is_solid = true }:IconProps) {
    return (
        <FontAwesome6
            name={name}
            size={size}
            color={colors[color]}
            solid={is_solid}
            accessibilityElementsHidden // Icons Are Decorative, The Parent Carries The Label
            importantForAccessibility="no-hide-descendants"
        />
    )
}
