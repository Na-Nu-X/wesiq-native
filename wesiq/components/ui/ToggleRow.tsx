import { Platform, Pressable, StyleSheet, Switch, View } from "react-native"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import Text from "./Text"
import Icon, { IconName } from "./Icon"

// React Native Web Uses Its Own Prop For The Thumb Color Of An Enabled Switch
const WEB_SWITCH_PROPS:object = Platform.OS === "web" ? { activeThumbColor: colors.white } : {}

export interface ToggleRowProps {
    label:string,
    description?:string,
    icon?:IconName,
    value:boolean,
    onChange:(value:boolean) => void,
    is_disabled?:boolean
}

export default function ToggleRow({ label, description, icon, value, onChange, is_disabled = false }:ToggleRowProps) {
    // Function For Toggle The Value
    const toggle = ():void => {
        if(is_disabled) return

        haptics.selection() // Plays The Haptic Feedback
        onChange(!value)
    }

    return (
        <Pressable
            onPress={toggle}
            disabled={is_disabled}
            accessibilityRole="switch"
            accessibilityLabel={label}
            accessibilityHint={description}
            accessibilityState={{ checked: value, disabled: is_disabled }}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null, is_disabled ? styles.disabled : null]}
        >
            {!!icon && (
                <View style={styles.icon}>
                    <Icon name={icon} size={15} color={value ? "primary" : "text_muted"} />
                </View>
            )}

            <View style={styles.text}>
                <Text variant="body_strong">{label}</Text>
                {!!description && <Text variant="caption" color="text_secondary">{description}</Text>}
            </View>

            <Switch
                value={value}
                onValueChange={toggle}
                disabled={is_disabled}
                trackColor={{ false: colors.surface_strong, true: colors.primary_solid }}
                thumbColor={Platform.OS === "ios" ? undefined : (value ? colors.white : colors.text_secondary)} // iOS Keeps Its Native White Thumb
                ios_backgroundColor={colors.surface_strong}
                {...WEB_SWITCH_PROPS}
                importantForAccessibility="no-hide-descendants" // The Row Is The Accessible Element
                accessibilityElementsHidden
            />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    row: {
        minHeight: 60,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
    },

    pressed: {
        backgroundColor: colors.surface_pressed,
    },

    disabled: {
        opacity: 0.5,
    },

    icon: {
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    text: {
        flex: 1,
        gap: 2,
    },
})
