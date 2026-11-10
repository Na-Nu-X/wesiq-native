// Typography (System Fonts For UI Text, Brand Fonts Only For The Logo And Timers)

import { Platform, TextStyle } from "react-native"

// Font Families
export const fonts = {
    brand: "Bungee_400Regular", // Logo / Wordmark Only (Latin Characters Only)
    timer: "Orbitron_400Regular", // Workout Timers And Counters (Digits Only)
    mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
} as const

// Text Variants
export const typography = {
    display: { fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -0.5 },
    title: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3 },
    heading: { fontSize: 19, lineHeight: 25, fontWeight: "700", letterSpacing: -0.2 },
    subheading: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
    body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
    body_strong: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
    callout: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
    label: { fontSize: 13, lineHeight: 18, fontWeight: "600", letterSpacing: 0.1 },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
    overline: { fontSize: 11, lineHeight: 14, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
    timer: { fontSize: 44, lineHeight: 52, fontFamily: fonts.timer, fontVariant: ["tabular-nums"] },
    timer_small: { fontSize: 22, lineHeight: 28, fontFamily: fonts.timer, fontVariant: ["tabular-nums"] },
} as const satisfies Record<string, TextStyle>

export type TypographyVariant = keyof typeof typography
