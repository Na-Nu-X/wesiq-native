// Design Tokens (The App Uses Only The Dark Theme)

import { Platform, ViewStyle } from "react-native"

// Raw Palette (Use The Semantic "colors" Below In Components)
const palette = {
    ink_950: "#03060e",
    ink_900: "#060b18",
    ink_850: "#0a1121",
    ink_800: "#0e1528",
    ink_750: "#141d36",
    ink_700: "#1a2544",
    ink_600: "#26345c",

    blue_300: "#c2e0fa",
    blue_400: "#7ea4ff",
    blue_500: "#5b8cff",
    blue_600: "#2f5fe8",
    blue_700: "#2753d4",

    slate_200: "#f2f5ff",
    slate_400: "#a9b6d6",
    slate_500: "#8190b5",

    green_500: "#3dd68c",
    red_500: "#ff5c6a",
    yellow_500: "#f0c14a",

    white: "#ffffff",
    black: "#000000",
} as const

// Semantic Colors (Text Colors Are Checked For WCAG AA Contrast On "background", "surface" And "surface_raised")
export const colors = {
    background: palette.ink_900, // Screen Background
    background_deep: palette.ink_950, // Behind Sheets, Tab Bar
    surface: palette.ink_800, // Cards, List Rows
    surface_raised: palette.ink_750, // Inputs, Nested Cards, Sheets
    surface_pressed: palette.ink_700, // Pressed State Of Surfaces
    surface_strong: palette.ink_600, // Skeletons, Disabled Fills

    border: "rgba(91, 140, 255, 0.14)", // Hairline Borders Of Cards And Inputs
    border_strong: "rgba(91, 140, 255, 0.32)", // Focused Inputs, Outlined Buttons
    divider: "rgba(169, 182, 214, 0.10)", // Separators Inside Lists

    primary: palette.blue_500, // Icons, Links, Active Tab (6.2:1 On Background)
    primary_text: palette.blue_400, // Small Accent Text (7.5:1 On Surface)
    primary_solid: palette.blue_600, // Filled Buttons Behind White Text (5.4:1)
    primary_solid_pressed: palette.blue_700, // Pressed Filled Buttons
    primary_soft: "rgba(91, 140, 255, 0.14)", // Tinted Chips, Selected Rows
    on_primary: palette.white, // Text On "primary_solid"

    text: palette.slate_200, // Main Text (16.7:1 On Surface)
    text_secondary: palette.slate_400, // Supporting Text (8.9:1 On Surface)
    text_muted: palette.slate_500, // Placeholders, Timestamps (5.7:1 On Surface)
    text_accent: palette.blue_300, // Soft Light Blue Highlights

    success: palette.green_500,
    success_soft: "rgba(61, 214, 140, 0.14)",
    danger: palette.red_500,
    danger_soft: "rgba(255, 92, 106, 0.14)",
    warning: palette.yellow_500,
    warning_soft: "rgba(240, 193, 74, 0.14)",
    premium: palette.yellow_500, // Subscriber Highlights
    premium_soft: "rgba(240, 193, 74, 0.16)",

    overlay: "rgba(3, 6, 14, 0.72)", // Backdrop Behind Dialogs And Sheets
    transparent: "transparent",
    white: palette.white,
    black: palette.black,
} as const

export type ColorToken = keyof typeof colors

// Spacing Scale (4 Point Grid)
export const spacing = {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
} as const

export type SpacingToken = keyof typeof spacing

// Corner Radii
export const radii = {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 999,
} as const

export type RadiusToken = keyof typeof radii

// Layout Constants
export const layout = {
    screen_padding: spacing.lg, // Horizontal Padding Of Screens
    max_content_width: 580, // Max Width Of Content On Tablets And Web
    max_dialog_width: 480, // Max Width Of Centered Dialogs (Web, Tablets)
    min_touch_target: 44, // Minimum Touch Target (Apple HIG 44pt, Material 48dp)
    header_height: 52, // Height Of The Screen Header (Without The Safe Area)
    hairline: 1,
} as const

// Shadows (iOS Uses Shadow Props, Android Uses Elevation, Web Uses boxShadow)
const createShadow = (elevation:number, opacity:number, radius:number, offset_y:number, color:string = palette.black):ViewStyle => Platform.select<ViewStyle>({
    ios: {
        shadowColor: color,
        shadowOffset: { width: 0, height: offset_y },
        shadowOpacity: opacity,
        shadowRadius: radius,
    },

    android: {
        elevation,
        shadowColor: color,
    },

    default: {
        boxShadow: `0px ${offset_y}px ${radius * 2}px rgba(0, 0, 0, ${opacity})`,
    },
}) ?? {}

export const shadows = {
    none: {} as ViewStyle,
    sm: createShadow(2, 0.25, 4, 2),
    md: createShadow(6, 0.35, 12, 6),
    lg: createShadow(12, 0.45, 24, 12),
    glow: createShadow(8, 0.35, 16, 4, palette.blue_500), // Highlight Of Primary Actions
} as const

// Motion Durations (MS)
export const durations = {
    fast: 150,
    normal: 250,
    slow: 400,
} as const

// Opacity Of Disabled Elements
export const DISABLED_OPACITY:number = 0.45
