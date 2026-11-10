import { ReactNode } from "react"
import { Pressable, PressableStateCallbackType, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { colors, layout, radii, shadows, spacing } from "@/theme"

import type { SpacingToken } from "@/theme"

export interface CardProps {
    children:ReactNode,
    padding?:SpacingToken,
    variant?:"default"|"raised"|"outlined"|"highlighted",
    onPress?:() => void, // Makes The Whole Card Pressable
    accessibility_label?:string,
    style?:StyleProp<ViewStyle>
}

const VARIANT_STYLES = {
    default: { backgroundColor: colors.surface, borderColor: colors.border },
    raised: { backgroundColor: colors.surface_raised, borderColor: colors.border },
    outlined: { backgroundColor: colors.transparent, borderColor: colors.border_strong },
    highlighted: { backgroundColor: colors.primary_soft, borderColor: colors.border_strong },
} as const

export default function Card({ children, padding = "lg", variant = "default", onPress, accessibility_label, style }:CardProps) {
    const card_style:StyleProp<ViewStyle> = [
        styles.card,
        VARIANT_STYLES[variant],
        { padding: spacing[padding] },
        variant === "raised" ? shadows.md : null,
        style,
    ]

    if(!onPress) return <View style={card_style}>{children}</View>

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibility_label}
            style={({ pressed }:PressableStateCallbackType) => [card_style, pressed ? styles.pressed : null]}
        >
            {children}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    card: {
        borderWidth: layout.hairline,
        borderRadius: radii.lg, // No "overflow: hidden" Because It Would Clip The iOS Shadow Of Raised Cards
    },

    pressed: {
        backgroundColor: colors.surface_pressed,
    },
})
