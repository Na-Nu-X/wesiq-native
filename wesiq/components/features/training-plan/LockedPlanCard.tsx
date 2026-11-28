// Locked Official Training Plan Card (For Subscribers Only - The Server Hides The Exercises)

import { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Card, Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"

import type { PlanSummary } from "./model"

interface LockedPlanCardProps {
    plan:PlanSummary,
    onPress:() => void, // Opens The Subscription Screen
    details?:ReactNode, // Extra Content Under The Header (E.g. Official Plan Details)
    details_label?:string // Screen Reader Text Of The Details
}

const PLACEHOLDER_WIDTHS:readonly `${number}%`[] = ["78%", "56%", "68%"] // Widths Of The Hidden Exercise Lines

export default function LockedPlanCard({ plan, onPress, details, details_label }:LockedPlanCardProps) {
    const { t } = useTranslation() // Initializes The Translations
    const title:string = plan.title || t("Tréningový plán") // Gets The Title
    const placeholder_count:number = Math.max(2, Math.min(PLACEHOLDER_WIDTHS.length, plan.rows.length)) // One Line Per Hidden Row (2 - 3)

    return (
        <Card
            onPress = {onPress}
            accessibility_label = {`${t("Prémiový plán: {{title}}", { title })}. ${t("Dostupné s aktívnym predplatným")}${details_label ? `. ${details_label}` : ""}`}
            style = {styles.card}
        >
            <View style = {styles.header}>
                <View style = {styles.flex}>
                    <Text variant = "heading" numberOfLines = {2}>{title}</Text>
                    <Text variant = "caption" color = "text_secondary">{t("Dostupné s aktívnym predplatným")}</Text>
                </View>

                <View style = {styles.badge}>
                    <Icon
                        name = "crown"
                        size = {11}
                        color = "premium"
                    />
                    <Text variant = "label" color = "premium">{t("Prémiový plán")}</Text>
                </View>
            </View>

            {details}

            <View
                style = {styles.preview}
                importantForAccessibility = "no-hide-descendants"
                accessibilityElementsHidden
            >
                <View style = {styles.lines}>
                    {PLACEHOLDER_WIDTHS.slice(0, placeholder_count).map((width) => (
                        <View key = {width} style = {[styles.line, { width }]} />
                    ))}
                </View>

                <View style = {styles.lock}>
                    <Icon
                        name = "lock"
                        size = {16}
                        color = "premium"
                    />
                </View>
            </View>

            <View style = {styles.action}>
                <Icon
                    name = "unlock"
                    size = {12}
                    color = "premium"
                />
                <Text variant = "label" color = "premium">{t("Odomknúť s predplatným")}</Text>
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
        borderColor: "rgba(240, 193, 74, 0.24)",
    },

    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.md,
    },

    badge: {
        minHeight: 28,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
        paddingHorizontal: spacing.sm + 2,
        backgroundColor: colors.premium_soft,
        borderRadius: radii.pill,
    },

    preview: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.surface_raised,
        borderRadius: radii.md,
    },

    lines: {
        flex: 1,
        gap: spacing.sm,
    },

    line: {
        height: 8,
        backgroundColor: colors.surface_strong,
        borderRadius: radii.pill,
    },

    lock: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.premium_soft,
        borderRadius: radii.pill,
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
