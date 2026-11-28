// One-Time Code Input: One Real Text Field Under Separate Digit Boxes (Paste And SMS / Email Autofill Work Natively)

import { useRef, useState } from "react"
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native"
import { Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"

import type { ComponentRef } from "react"

interface CodeInputProps {
    value:string,
    onChange:(value:string) => void,
    length?:number,
    has_error?:boolean,
    accessibility_label:string
}

export default function CodeInput({ value, onChange, length = 6, has_error = false, accessibility_label }:CodeInputProps) {
    const input_reference = useRef<ComponentRef<typeof TextInput>>(null) // Stores The Input Reference
    const [is_focused, setIsFocused] = useState<boolean>(false) // Stores If It Is Focused

    const active_index:number = Math.min(value.length, length - 1) // Gets The Box With The Caret

    return (
        <Pressable
            onPress = {() => input_reference.current?.focus()}
            accessible = {false}
            style = {styles.root}
        >
            <View style = {styles.boxes} pointerEvents = "none">
                {Array.from({ length }, (_, index:number) => {
                    const is_active:boolean = is_focused && index === active_index // Checks If It Is Active
                    const digit:string|undefined = value[index] // Gets The Digit

                    return (
                        <View key = {index} style = {[styles.box, digit ? styles.box_filled : null, is_active ? styles.box_active : null, has_error ? styles.box_error : null]}>
                            {digit ? (
                                <Text
                                    variant = "title"
                                    is_tabular
                                    style = {styles.digit}
                                >
                                    {digit}
                                </Text>
                            ) : is_active ? (
                                <View style = {styles.caret} />
                            ) : (
                                <View style = {styles.placeholder_dot} />
                            )}
                        </View>
                    )
                })}
            </View>

            <TextInput
                ref = {input_reference}
                value = {value}
                onChangeText = {(text:string) => onChange(text.replace(/\D/g, "").slice(0, length))}
                onFocus = {() => setIsFocused(true)}
                onBlur = {() => setIsFocused(false)}
                maxLength = {length}
                keyboardType = "number-pad"
                textContentType = "oneTimeCode"
                autoComplete = {Platform.OS === "android" ? "sms-otp" : "one-time-code"}
                accessibilityLabel = {accessibility_label}
                caretHidden
                style = {styles.input}
            />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    root: {
        position: "relative",
    },

    boxes: {
        flexDirection: "row",
        justifyContent: "center",
        gap: spacing.sm,
    },

    box: {
        flex: 1,
        maxWidth: 54,
        aspectRatio: 0.85, // Slightly Taller Than Wide, Scales Down On Narrow Phones
        maxHeight: 64,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface_raised, // Lighter Than The Screen, So Empty Boxes Stay Visible
        borderWidth: 1.5,
        borderColor: colors.border_strong,
        borderRadius: radii.md,
    },

    box_filled: {
        borderColor: colors.primary_text,
        backgroundColor: colors.surface_pressed,
    },

    box_active: {
        borderWidth: 2,
        borderColor: colors.primary,
        backgroundColor: colors.surface_pressed,
    },

    box_error: {
        borderColor: colors.danger,
        backgroundColor: colors.danger_soft,
    },

    digit: {
        fontSize: 26,
        lineHeight: 32,
        color: colors.text,
    },

    caret: {
        width: 2,
        height: 26,
        backgroundColor: colors.primary,
        borderRadius: 1,
    },

    placeholder_dot: {
        width: 8,
        height: 8,
        backgroundColor: colors.text_muted,
        borderRadius: 4,
        opacity: 0.5,
    },

    input: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.011, // Stays Focusable And Tappable (Fully Transparent Inputs Lose Autofill On Some Platforms)
        color: "transparent",
        fontSize: 1,
    },
})
