import { Text as NativeText, TextProps as NativeTextProps, StyleSheet, TextStyle } from "react-native"
import { colors, typography } from "@/theme"

import type { ColorToken, TypographyVariant } from "@/theme"

export interface TextProps extends NativeTextProps {
    variant?:TypographyVariant,
    color?:ColorToken,
    align?:TextStyle["textAlign"],
    is_tabular?:boolean // Equal Width Digits (Counters, Timers)
}

export default function Text({
    variant = "body",
    color = "text",
    align,
    is_tabular = false,
    style,
    maxFontSizeMultiplier = 1.6, // Supports Dynamic Type Without Breaking Layouts
    ...props
}:TextProps) {
    return (
        <NativeText
            maxFontSizeMultiplier={maxFontSizeMultiplier}

            style={[
                styles.base,
                typography[variant],
                { color: colors[color] },
                align ? { textAlign: align } : null,
                is_tabular ? styles.tabular : null,
                style,
            ]}

            {...props}
        />
    )
}

const styles = StyleSheet.create({
    base: {
        includeFontPadding: false,
    },

    tabular: {
        fontVariant: ["tabular-nums"],
    },
})
