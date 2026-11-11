import { ActivityIndicator, Pressable, PressableStateCallbackType, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { colors, DISABLED_OPACITY, layout, radii, spacing, shadows } from "@/theme"
import { haptics } from "@/lib/haptics"
import Text from "./Text"
import Icon, { IconName } from "./Icon"

import type { ColorToken } from "@/theme"

export type ButtonVariant = "primary"|"secondary"|"outline"|"ghost"|"danger"
export type ButtonSize = "sm"|"md"|"lg"

export interface ButtonProps {
    label:string,
    onPress:() => void,
    variant?:ButtonVariant,
    size?:ButtonSize,
    icon?:IconName,
    icon_position?:"left"|"right",
    is_loading?:boolean,
    is_disabled?:boolean,
    is_full_width?:boolean,
    accessibility_hint?:string,
    style?:StyleProp<ViewStyle>
}

interface VariantStyle {
    background:string,
    background_pressed:string,
    border:string,
    content:ColorToken
}

const VARIANTS:Record<ButtonVariant, VariantStyle> = {
    primary: { background: colors.primary_solid, background_pressed: colors.primary_solid_pressed, border: colors.transparent, content: "on_primary" },
    secondary: { background: colors.surface_raised, background_pressed: colors.surface_pressed, border: colors.border, content: "text" },
    outline: { background: colors.transparent, background_pressed: colors.primary_soft, border: colors.border_strong, content: "primary_text" },
    ghost: { background: colors.transparent, background_pressed: colors.primary_soft, border: colors.transparent, content: "primary_text" },
    danger: { background: colors.danger_soft, background_pressed: "rgba(255, 92, 106, 0.24)", border: "rgba(255, 92, 106, 0.32)", content: "danger" },
}

const SIZES:Record<ButtonSize, { height:number, padding_horizontal:number, icon_size:number, text_variant:"label"|"body_strong" }> = {
    sm: { height: 36, padding_horizontal: spacing.md, icon_size: 13, text_variant: "label" },
    md: { height: layout.min_touch_target + 4, padding_horizontal: spacing.xl, icon_size: 15, text_variant: "body_strong" },
    lg: { height: 56, padding_horizontal: spacing.xxl, icon_size: 17, text_variant: "body_strong" },
}

export default function Button({
    label,
    onPress,
    variant = "primary",
    size = "md",
    icon,
    icon_position = "left",
    is_loading = false,
    is_disabled = false,
    is_full_width = false,
    accessibility_hint,
    style,
}:ButtonProps) {
    const variant_style:VariantStyle = VARIANTS[variant] // Gets The Variant Style
    const size_style = SIZES[size] // Gets The Size Style
    const is_inactive:boolean = is_disabled || is_loading // Stores The Information If The Button Can't Be Pressed

    // Function For Handle The Press
    const handlePress = ():void => {
        if(is_inactive) return

        haptics.light() // Plays The Haptic Feedback
        onPress()
    }

    const icon_element = icon ? <Icon name={icon} size={size_style.icon_size} color={variant_style.content} /> : null

    return (
        <Pressable
            onPress={handlePress}
            disabled={is_inactive}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={accessibility_hint}
            accessibilityState={{ disabled: is_inactive, busy: is_loading }}
            hitSlop={size === "sm" ? 6 : 0}

            style={({ pressed }:PressableStateCallbackType) => [
                styles.button,
                {
                    minHeight: size_style.height,
                    paddingHorizontal: size_style.padding_horizontal,
                    backgroundColor: pressed ? variant_style.background_pressed : variant_style.background,
                    borderColor: variant_style.border,
                },
                variant === "primary" && !is_inactive ? shadows.glow : null,
                is_full_width ? styles.full_width : null,
                pressed ? styles.pressed : null,
                is_disabled ? styles.disabled : null,
                style,
            ]}
        >
            {is_loading ? (
                <ActivityIndicator size="small" color={colors[variant_style.content]} />
            ) : (
                <View style={styles.content}>
                    {icon_position === "left" && icon_element}

                    <Text variant={size_style.text_variant} color={variant_style.content} numberOfLines={1}>
                        {label}
                    </Text>

                    {icon_position === "right" && icon_element}
                </View>
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "flex-start",
        borderWidth: layout.hairline,
        borderRadius: radii.pill,
    },

    content: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    full_width: {
        alignSelf: "stretch",
    },

    pressed: {
        transform: [{ scale: 0.98 }],
    },

    disabled: {
        opacity: DISABLED_OPACITY,
    },
})
