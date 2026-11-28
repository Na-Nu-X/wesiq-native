// Training Plan Summary Card (Used By The Edit And Copy Lists)

import { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Card, Chip, Icon, Text } from "@/components/ui"
import { colors, spacing } from "@/theme"
import { getDayName, getShortDayName } from "@/lib/days"
import { formatDuration } from "@/lib/format"

import type { PlanSummary } from "./model"

interface PlanCardProps {
    plan:PlanSummary,
    action_label:string, // E.g. "Edit", "Use This Plan"
    action_icon:"pen"|"copy",
    onPress:() => void,
    is_subscriber_plan?:boolean, // Official Plan For Subscribers (Shows The Premium Badge)
    details?:ReactNode, // Extra Content Under The Header (E.g. Official Plan Details)
    details_label?:string // Screen Reader Text Of The Details
}

export default function PlanCard({ plan, action_label, action_icon, onPress, is_subscriber_plan = false, details, details_label }:PlanCardProps) {
    const { t } = useTranslation() // Initializes The Translations
    const warm_up_seconds:number|undefined = plan.rows.find((row) => row.is_warm_up)?.periods?.[0] // Gets The Warm Up
    const exercise_names:string[] = plan.rows.filter((row) => !row.is_warm_up).flatMap((row) => row.exercise !== null ? [row.exercise] : []) // Gets The Exercise Names (Locked Rows Have No Name)
    const title:string = plan.title || t("Tréningový plán") // Gets The Title

    return (
        <Card
            onPress = {onPress}
            accessibility_label = {`${title}${is_subscriber_plan ? `, ${t("Prémiový plán")}` : ""}${plan.day !== null ? `, ${getDayName(plan.day)}` : ""}, ${t("Cviky")}: ${plan.exercise_count}. ${details_label ? `${details_label}. ` : ""}${action_label}`}
            style = {styles.card}
        >
            <View style = {styles.header}>
                <View style = {styles.flex}>
                    <Text variant = "heading" numberOfLines = {2}>{title}</Text>

                    <Text variant = "caption" color = "text_secondary">
                        {t("Cviky")}: {plan.exercise_count} · {t("Série")}: {plan.set_count}
                        {warm_up_seconds !== undefined ? ` · ${t("Rozcvička")} ${formatDuration(warm_up_seconds)}` : ""}
                    </Text>
                </View>

                {is_subscriber_plan &&
                    <Chip
                        label = {t("Prémiový plán")}
                        icon = "crown"
                        tone = "premium"
                        is_selected
                    />
                }
                {plan.day !== null &&
                    <Chip
                        label = {getShortDayName(plan.day)}
                        icon = "calendar-day"
                        is_selected
                    />
                }
            </View>

            {details}

            {exercise_names.length > 0 && (
                <Text
                    variant = "callout"
                    color = "text_secondary"
                    numberOfLines = {2}
                >
                    {exercise_names.join(" · ")}
                </Text>
            )}

            <View style = {styles.action}>
                <Icon
                    name = {action_icon}
                    size = {12}
                    color = "primary_text"
                />
                <Text variant = "label" color = "primary_text">{action_label}</Text>
                <View style = {styles.flex} />
                <Icon
                    name = "chevron-right"
                    size = {12}
                    color = "text_muted"
                />
            </View>
        </Card>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    card: {
        gap: spacing.md,
    },

    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.md,
    },

    action: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
    },
})
