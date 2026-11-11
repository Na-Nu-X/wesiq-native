import { ComponentRef, forwardRef, useState } from "react"
import { Platform, StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from "react-native"
import { useTranslation } from "react-i18next"
import { colors, layout, radii, spacing, typography } from "@/theme"
import Text from "./Text"
import Icon, { IconName } from "./Icon"
import IconButton from "./IconButton"

export interface TextFieldProps extends Omit<TextInputProps, "style"|"placeholderTextColor"|"editable"> {
    label?:string,
    helper?:string,
    error?:string|null,
    icon?:IconName,
    is_password?:boolean, // Adds The Show / Hide Toggle
    is_disabled?:boolean,
    is_counter_visible?:boolean, // Shows "length / maxLength"
    multiline_min_height?:number, // Starting Height Of A Multiline Field (Grows With The Text)
    container_style?:StyleProp<ViewStyle>
}

const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(function TextField({
    label,
    helper,
    error,
    icon,
    is_password = false,
    is_disabled = false,
    is_counter_visible = false,
    multiline_min_height,
    container_style,
    multiline,
    maxLength,
    value,
    onFocus,
    onBlur,
    accessibilityLabel,
    ...props
}, ref) {
    const { t } = useTranslation() // Initializes The Translations
    const [is_focused, setIsFocused] = useState<boolean>(false) // Stores The Information If The Input Is Focused
    const [is_secure, setIsSecure] = useState<boolean>(is_password) // Stores The Information If The Password Is Hidden

    const has_error:boolean = Boolean(error) // Stores The Information If There Is An Error
    const border_color:string = has_error ? colors.danger : is_focused ? colors.primary : colors.border // Gets The Border Color

    return (
        <View style={[styles.container, container_style]}>
            {(label || (is_counter_visible && maxLength)) && (
                <View style={styles.label_row}>
                    {label ? <Text variant="label" color="text_secondary">{label}</Text> : <View />}

                    {is_counter_visible && maxLength !== undefined && (
                        <Text variant="caption" color={(value?.length ?? 0) >= maxLength ? "danger" : "text_muted"} is_tabular>
                            {value?.length ?? 0}/{maxLength}
                        </Text>
                    )}
                </View>
            )}

            <View
                style={[
                    styles.field,
                    multiline ? styles.field_multiline : null,
                    { borderColor: border_color },
                    is_focused ? styles.field_focused : null,
                    is_disabled ? styles.field_disabled : null,
                ]}
            >
                {!!icon && (
                    <View style={[styles.icon, multiline ? styles.icon_multiline : null]}>
                        <Icon name={icon} size={15} color={is_focused ? "primary" : "text_muted"} />
                    </View>
                )}

                <TextInput
                    ref={ref}
                    value={value}
                    editable={!is_disabled}
                    multiline={multiline}
                    maxLength={maxLength}
                    secureTextEntry={is_secure}
                    placeholderTextColor={colors.text_muted}
                    selectionColor={colors.primary}
                    cursorColor={colors.primary}
                    keyboardAppearance="dark"
                    accessibilityLabel={accessibilityLabel ?? label}
                    accessibilityHint={error ?? helper}
                    textAlignVertical={multiline ? "top" : "center"}
                    maxFontSizeMultiplier={1.5}

                    onFocus={(event) => {
                        setIsFocused(true)
                        onFocus?.(event)
                    }}

                    onBlur={(event) => {
                        setIsFocused(false)
                        onBlur?.(event)
                    }}

                    style={[styles.input, multiline ? styles.input_multiline : null, multiline && multiline_min_height !== undefined ? { minHeight: multiline_min_height } : null, Platform.OS === "web" ? styles.input_web : null]}
                    {...props}
                />

                {is_password && (
                    <IconButton
                        icon={is_secure ? "eye" : "eye-slash"}
                        accessibility_label={is_secure ? t("Zobraziť heslo") : t("Skryť heslo")}
                        onPress={() => setIsSecure((previous:boolean) => !previous)}
                        size={36}
                        icon_color="text_muted"
                    />
                )}
            </View>

            {(error || helper) && (
                <View style={styles.message_row}>
                    {!!error && <Icon name="circle-exclamation" size={12} color="danger" />}
                    <Text variant="caption" color={error ? "danger" : "text_muted"} style={styles.message}>{error ?? helper}</Text>
                </View>
            )}
        </View>
    )
})

export default TextField

const styles = StyleSheet.create({
    container: {
        gap: spacing.xs + 2,
    },

    label_row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.xs,
    },

    field: {
        minHeight: layout.min_touch_target + 6,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface_raised,
        borderWidth: layout.hairline,
        borderRadius: radii.md,
    },

    field_multiline: {
        alignItems: "flex-start",
        paddingVertical: spacing.sm,
    },

    field_focused: {
        backgroundColor: colors.surface,
    },

    field_disabled: {
        opacity: 0.6,
    },

    icon: {
        width: 24,
        alignItems: "center",
        marginRight: spacing.xs,
    },

    icon_multiline: {
        paddingTop: spacing.xs + 2,
    },

    input: {
        flex: 1,
        minHeight: layout.min_touch_target,
        paddingVertical: spacing.sm,
        color: colors.text,
        ...typography.body,
        lineHeight: undefined, // A Fixed Line Height Misaligns The Caret On iOS
    },

    input_web: {
        outlineWidth: 0, // The Field Border Already Shows Focus
    },

    input_multiline: {
        minHeight: 96,
        maxHeight: 220,
        lineHeight: typography.body.lineHeight,
    },

    message_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
        paddingHorizontal: spacing.xs,
    },

    message: {
        flex: 1,
    },
})
