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
    const input_reference = useRef<ComponentRef<typeof TextInput>>(null)
    const [is_focused, setIsFocused] = useState<boolean>(false)

    const active_index:number = Math.min(value.length, length - 1) // Gets The Box With The Caret

    return (
        <Pressable onPress={() => input_reference.current?.focus()} accessible={false} style={styles.root}>
            <View style={styles.boxes} pointerEvents="none">
                {Array.from({ length }, (_, index:number) => {
                    const is_active:boolean = is_focused && index === active_index

                    return (
                        <View key={index} style={[styles.box, value[index] ? styles.box_filled : null, is_active ? styles.box_active : null, has_error ? styles.box_error : null]}>
                            <Text variant="title" is_tabular>{value[index] ?? ""}</Text>
                        </View>
                    )
                })}
            </View>

            <TextInput
                ref={input_reference}
                value={value}
                onChangeText={(text:string) => onChange(text.replace(/\D/g, "").slice(0, length))}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                maxLength={length}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
                accessibilityLabel={accessibility_label}
                caretHidden
                style={styles.input}
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
        justifyContent: "space-between",
        gap: spacing.sm,
    },

    box: {
        flex: 1,
        maxWidth: 56,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radii.md,
    },

    box_filled: {
        borderColor: colors.border_strong,
    },

    box_active: {
        borderColor: colors.primary,
        backgroundColor: colors.primary_soft,
    },

    box_error: {
        borderColor: colors.danger,
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
