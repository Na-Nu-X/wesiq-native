import { Pressable, PressableStateCallbackType, StyleProp, StyleSheet, ViewStyle } from "react-native"
import { colors, layout, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import Text from "./Text"
import Icon, { IconName } from "./Icon"

export interface ChipProps {
    label:string,
    is_selected?:boolean,
    onPress?:() => void,
    icon?:IconName,
    is_disabled?:boolean,
    tone?:"primary"|"success"|"warning"|"danger",
    style?:StyleProp<ViewStyle>
}

const TONES = {
    primary: { background: colors.primary_soft, border: colors.border_strong, text: "primary_text" },
    success: { background: colors.success_soft, border: "rgba(61, 214, 140, 0.32)", text: "success" },
    warning: { background: colors.warning_soft, border: "rgba(240, 193, 74, 0.32)", text: "warning" },
    danger: { background: colors.danger_soft, border: "rgba(255, 92, 106, 0.32)", text: "danger" },
} as const

export default function Chip({ label, is_selected = false, onPress, icon, is_disabled = false, tone = "primary", style }:ChipProps) {
    const tone_style = TONES[tone] // Gets The Tone Style

    return (
        <Pressable
            onPress={onPress ? () => {
                haptics.selection() // Plays The Haptic Feedback
                onPress()
            } : undefined}

            disabled={is_disabled || !onPress}
            hitSlop={6}
            accessibilityRole={onPress ? "button" : "text"}
            accessibilityState={{ selected: is_selected, disabled: is_disabled }}
            accessibilityLabel={label}

            style={({ pressed }:PressableStateCallbackType) => [
                styles.chip,
                is_selected
                    ? { backgroundColor: tone_style.background, borderColor: tone_style.border }
                    : { backgroundColor: pressed ? colors.surface_pressed : colors.surface_raised, borderColor: colors.border },
                is_disabled ? styles.disabled : null,
                style,
            ]}
        >
            {icon && <Icon name={icon} size={12} color={is_selected ? tone_style.text : "text_secondary"} />}
            <Text variant="label" color={is_selected ? tone_style.text : "text_secondary"} numberOfLines={1}>{label}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    chip: {
        minHeight: 34,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
        paddingHorizontal: spacing.md,
        borderWidth: layout.hairline,
        borderRadius: radii.pill,
    },

    disabled: {
        opacity: 0.45,
    },
})
