import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { colors, layout, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import Text from "./Text"
import Icon, { IconName } from "./Icon"

export interface SegmentOption<T extends string> {
    value:T,
    label:string,
    icon?:IconName,
    badge?:number
}

export interface SegmentedControlProps<T extends string> {
    options:readonly SegmentOption<T>[],
    value:T,
    onChange:(value:T) => void,
    accessibility_label?:string,
    style?:StyleProp<ViewStyle>
}

export default function SegmentedControl<T extends string>({ options, value, onChange, accessibility_label, style }:SegmentedControlProps<T>) {
    return (
        <View accessibilityRole="tablist" accessibilityLabel={accessibility_label} style={[styles.container, style]}>
            {options.map((option:SegmentOption<T>) => {
                const is_selected:boolean = option.value === value // Stores The Information If The Option Is Selected

                return (
                    <Pressable
                        key={option.value}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: is_selected }}
                        accessibilityLabel={option.badge ? `${option.label} (${option.badge})` : option.label}

                        onPress={() => {
                            if(is_selected) return

                            haptics.selection() // Plays The Haptic Feedback
                            onChange(option.value)
                        }}

                        style={[styles.segment, is_selected ? styles.segment_selected : null]}
                    >
                        {!!option.icon && <Icon name={option.icon} size={13} color={is_selected ? "text" : "text_muted"} />}
                        <Text variant="label" color={is_selected ? "text" : "text_muted"} numberOfLines={1}>{option.label}</Text>

                        {option.badge !== undefined && option.badge > 0 && (
                            <View style={styles.badge}>
                                <Text variant="caption" color="on_primary" is_tabular style={styles.badge_text}>{option.badge}</Text>
                            </View>
                        )}
                    </Pressable>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        padding: spacing.xs,
        gap: spacing.xs,
        backgroundColor: colors.background_deep,
        borderWidth: layout.hairline,
        borderColor: colors.border,
        borderRadius: radii.pill,
    },

    segment: {
        flex: 1,
        minHeight: 38,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs + 2,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.pill,
    },

    segment_selected: {
        backgroundColor: colors.surface_pressed,
    },

    badge: {
        minWidth: 18,
        paddingHorizontal: 5,
        alignItems: "center",
        backgroundColor: colors.primary_solid,
        borderRadius: radii.pill,
    },

    badge_text: {
        fontSize: 10,
        lineHeight: 16,
        fontWeight: "700",
    },
})
