import { Pressable, PressableStateCallbackType, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { colors, DISABLED_OPACITY, layout, radii } from "@/theme"
import { haptics } from "@/lib/haptics"
import Icon, { IconName } from "./Icon"
import Text from "./Text"

import type { ColorToken } from "@/theme"

export type IconButtonVariant = "plain"|"soft"|"solid"|"danger"

export interface IconButtonProps {
    icon:IconName,
    accessibility_label:string, // Required Because The Button Has No Visible Text
    onPress:() => void,
    variant?:IconButtonVariant,
    size?:number, // Visual Size Of The Circle (The Touch Target Is Always At Least 44)
    icon_color?:ColorToken,
    is_solid_icon?:boolean,
    is_disabled?:boolean,
    badge_count?:number,
    style?:StyleProp<ViewStyle>
}

const BACKGROUNDS:Record<IconButtonVariant, { idle:string, pressed:string, icon:ColorToken }> = {
    plain: { idle: colors.transparent, pressed: colors.primary_soft, icon: "text" },
    soft: { idle: colors.surface_raised, pressed: colors.surface_pressed, icon: "text" },
    solid: { idle: colors.primary_solid, pressed: colors.primary_solid_pressed, icon: "on_primary" },
    danger: { idle: colors.danger_soft, pressed: "rgba(255, 92, 106, 0.24)", icon: "danger" },
}

export default function IconButton({
    icon,
    accessibility_label,
    onPress,
    variant = "plain",
    size = 40,
    icon_color,
    is_solid_icon = true,
    is_disabled = false,
    badge_count,
    style,
}:IconButtonProps) {
    const background = BACKGROUNDS[variant] // Gets The Background Colors
    const touch_slop:number = Math.max(0, (layout.min_touch_target - size) / 2) // Extends The Touch Target To 44

    return (
        <Pressable
            onPress={() => {
                haptics.light() // Plays The Haptic Feedback
                onPress()
            }}

            disabled={is_disabled}
            hitSlop={touch_slop}
            accessibilityRole="button"
            accessibilityLabel={badge_count ? `${accessibility_label} (${badge_count})` : accessibility_label}
            accessibilityState={{ disabled: is_disabled }}

            style={({ pressed }:PressableStateCallbackType) => [
                styles.button,
                {
                    width: size,
                    height: size,
                    backgroundColor: pressed ? background.pressed : background.idle,
                },
                is_disabled ? styles.disabled : null,
                style,
            ]}
        >
            <Icon name={icon} size={Math.round(size * 0.45)} color={icon_color ?? background.icon} is_solid={is_solid_icon} />

            {badge_count !== undefined && badge_count > 0 && (
                <View style={styles.badge}>
                    <Text variant="overline" color="white" style={styles.badge_text}>
                        {badge_count > 99 ? "99+" : String(badge_count)}
                    </Text>
                </View>
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.pill,
    },

    disabled: {
        opacity: DISABLED_OPACITY,
    },

    badge: {
        position: "absolute",
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.danger,
        borderRadius: radii.pill,
        borderWidth: 2,
        borderColor: colors.background,
    },

    badge_text: {
        fontSize: 9,
        lineHeight: 11,
        letterSpacing: 0,
    },
})
