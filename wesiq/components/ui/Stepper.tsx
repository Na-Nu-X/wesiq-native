// Number Stepper For Reps, Sets, Seconds (Buttons + Direct Input, Values Are Always Clamped)

import { useState } from "react"
import { StyleSheet, TextInput, View } from "react-native"
import { useTranslation } from "react-i18next"
import { colors, layout, radii, spacing, typography } from "@/theme"
import { haptics } from "@/lib/haptics"
import IconButton from "./IconButton"
import Text from "./Text"

export interface StepperProps {
    value:number,
    onChange:(value:number) => void,
    min?:number,
    max?:number,
    step?:number,
    label?:string, // Visible Caption Under The Value (E.g. "reps")
    accessibility_label:string, // E.g. "Repetitions Of Set 1"
    formatValue?:(value:number) => string, // Display Formatting (E.g. Seconds As "1:30")
    is_compact?:boolean // Smaller Buttons (Two Steppers In One Row)
}

// Function For Clamp The Value Into The Range
const clamp = (value:number, min:number, max:number):number => Math.min(max, Math.max(min, value))

export default function Stepper({ value, onChange, min = 0, max = 999, step = 1, label, accessibility_label, formatValue, is_compact = false }:StepperProps) {
    const { t } = useTranslation() // Initializes The Translations
    const [draft, setDraft] = useState<string|null>(null) // Stores The Typed Text While Editing

    // Function For Change The Value By The Step
    const changeBy = (delta:number):void => {
        const next_value:number = clamp(value + delta, min, max) // Gets The Next Value
        if(next_value === value) return

        haptics.selection() // Plays The Haptic Feedback
        onChange(next_value)
    }

    // Function For Commit The Typed Value
    const commitDraft = ():void => {
        if(draft === null) return

        const parsed:number = parseInt(draft.replace(/[^0-9]/g, ""), 10) // Parses The Number
        onChange(clamp(Number.isNaN(parsed) ? value : parsed, min, max))
        setDraft(null)
    }

    return (
        <View
            style={styles.container}
            accessible={false}
        >
            <IconButton
                icon="minus"
                accessibility_label={`${t("Znížiť")}: ${accessibility_label}`}
                onPress={() => changeBy(-step)}
                is_disabled={value <= min}
                variant="soft"
                size={is_compact ? 32 : 36}
            />

            <View style={[styles.value_container, is_compact ? styles.value_container_compact : null]}>
                <TextInput
                    value={draft ?? (formatValue ? formatValue(value) : String(value))}
                    onFocus={() => setDraft(String(value))}
                    onChangeText={(text:string) => setDraft(text.replace(/[^0-9]/g, "").slice(0, String(max).length))}
                    onBlur={commitDraft}
                    onSubmitEditing={commitDraft}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    selectTextOnFocus
                    keyboardAppearance="dark"
                    selectionColor={colors.primary}
                    accessibilityLabel={accessibility_label}
                    accessibilityValue={{ min, max, now: value }}
                    maxFontSizeMultiplier={1.3}
                    style={styles.input}
                />

                {!!label && <Text variant="caption" color="text_muted" align="center" numberOfLines={1}>{label}</Text>}
            </View>

            <IconButton
                icon="plus"
                accessibility_label={`${t("Zvýšiť")}: ${accessibility_label}`}
                onPress={() => changeBy(step)}
                is_disabled={value >= max}
                variant="soft"
                size={is_compact ? 32 : 36}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexShrink: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        padding: spacing.xs,
        backgroundColor: colors.background_deep,
        borderWidth: layout.hairline,
        borderColor: colors.border,
        borderRadius: radii.pill,
    },

    value_container: {
        width: 60, // Fixed Width (A TextInput Would Otherwise Grow To Its Default Width On Web)
        alignItems: "center",
    },

    value_container_compact: {
        width: 52,
    },

    input: {
        width: "100%",
        paddingVertical: 0,
        textAlign: "center",
        color: colors.text,
        ...typography.heading,
        fontVariant: ["tabular-nums"],
    },
})
