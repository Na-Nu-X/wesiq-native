// Day Picker For A Training Plan (Days Used By Other Plans Are Shown As Taken)

import { ScrollView, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Chip, Text } from "@/components/ui"
import { spacing } from "@/theme"
import { getDayName, getShortDayName } from "@/lib/days"
import { WEEK_DAYS } from "./model"

import type { Day } from "@/types/models"

interface DayPickerProps {
    value:Day|null,
    onChange:(day:Day|null) => void,
    taken_days:ReadonlyMap<Day, string> // Day → Title Of The Plan That Uses It
}

export default function DayPicker({ value, onChange, taken_days }:DayPickerProps) {
    const { t } = useTranslation() // Initializes The Translations
    const taken_title:string|undefined = value !== null ? taken_days.get(value) : undefined // Gets The Conflicting Plan

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t("Deň tréningu")}>
                <Chip label={t("Žiadny deň")} is_selected={value === null} onPress={() => onChange(null)} />

                {WEEK_DAYS.map((day:Day) => {
                    const other_plan:string|undefined = taken_days.get(day) // Gets The Plan Using The Day

                    return (
                        <Chip
                            key={day}
                            label={getShortDayName(day)}
                            icon={other_plan && value !== day ? "lock" : undefined}
                            is_selected={value === day}
                            is_disabled={other_plan !== undefined && value !== day}
                            onPress={() => onChange(day)}
                        />
                    )
                })}
            </ScrollView>

            <Text variant="caption" color={taken_title ? "warning" : "text_muted"} style={styles.hint}>
                {taken_title
                    ? t("{{day}} už patrí plánu {{title}}.", { day: getDayName(value as Day), title: taken_title })
                    : value === null
                        ? t("Plán nebude priradený k žiadnemu dňu.")
                        : t("Tréningový deň: {{day}}", { day: getDayName(value) })}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.sm,
    },

    chips: {
        gap: spacing.sm,
        paddingRight: spacing.lg,
    },

    hint: {
        paddingHorizontal: spacing.xs,
    },
})
