// Recorded Activities (Tap One To See How The Time Was Split Between Exercises)

import { useState } from "react"
import { Pressable, PressableStateCallbackType, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Button, Card, EmptyState, ErrorState, Icon, Skeleton, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { getFormattedDate, getMinimalistFormattedTime } from "@/utils/time"

import type { ApiError } from "@/types/api"
import type { Activity, ActivitySummaryExercise } from "@/types/models"

const COLLAPSED_COUNT:number = 5

interface HistoryCardProps {
    activities:Activity[],
    is_loading:boolean,
    error:ApiError|null,
    onRetry:() => void
}

export default function HistoryCard({ activities, is_loading, error, onRetry }:HistoryCardProps) {
    const { t } = useTranslation() // Initializes The Translations
    const [expanded_key, setExpandedKey] = useState<string|null>(null)
    const [is_showing_all, setIsShowingAll] = useState<boolean>(false)

    const shown:Activity[] = is_showing_all ? activities : activities.slice(0, COLLAPSED_COUNT)

    return (
        <Card padding="lg" style={styles.card}>
            <Text variant="heading" accessibilityRole="header">{t("História")}</Text>

            {is_loading && activities.length === 0 ? (
                <View style={styles.list}>{[0, 1, 2].map((index:number) => <Skeleton key={index} height={52} radius={radii.md} />)}</View>
            ) : error && activities.length === 0 ? (
                <ErrorState error={error} onRetry={onRetry} />
            ) : activities.length === 0 ? (
                <EmptyState icon="person-running" title={t("Zatiaľ žiadne aktivity")} message={t("Spustite stopky a vaša prvá aktivita sa objaví tu.")} is_compact />
            ) : (
                <View style={styles.list}>
                    {shown.map((activity:Activity) => {
                        const key:string = `${activity.end_time}:${activity.elapsed_time}`
                        const summary:ActivitySummaryExercise[] = activity.training_plan_summary ?? []
                        const total:number = summary.reduce((sum:number, item:ActivitySummaryExercise) => sum + item.elapsed_time, 0)
                        const is_expanded:boolean = expanded_key === key

                        return (
                            <View key={key} style={styles.item}>
                                <Pressable
                                    onPress={summary.length > 0 ? () => setExpandedKey(is_expanded ? null : key) : undefined}
                                    disabled={summary.length === 0}
                                    accessibilityRole={summary.length > 0 ? "button" : undefined}
                                    accessibilityState={summary.length > 0 ? { expanded: is_expanded } : undefined}
                                    accessibilityLabel={`${activity.type || t("Aktivita")}, ${getMinimalistFormattedTime(activity.elapsed_time)}, ${activity.gained_xp} XP, ${getFormattedDate(activity.end_time, false)}`}
                                    style={({ pressed }:PressableStateCallbackType) => [styles.row, pressed ? styles.pressed : null]}
                                >
                                    <View style={styles.icon}><Icon name={summary.length > 0 ? "dumbbell" : "stopwatch"} size={13} color="primary" /></View>

                                    <View style={styles.flex}>
                                        <Text variant="body_strong" numberOfLines={1}>{activity.type || t("Aktivita")}</Text>
                                        <Text variant="caption" color="text_muted">{getFormattedDate(activity.end_time, false)}</Text>
                                    </View>

                                    <View style={styles.values}>
                                        <Text variant="label" is_tabular>{getMinimalistFormattedTime(activity.elapsed_time)}</Text>
                                        <Text variant="caption" color="premium" is_tabular>{activity.gained_xp} XP</Text>
                                    </View>

                                    {summary.length > 0 && <Icon name={is_expanded ? "chevron-up" : "chevron-down"} size={11} color="text_muted" />}
                                </Pressable>

                                {is_expanded && (
                                    <View style={styles.summary}>
                                        <View style={styles.bar}>
                                            {summary.map((item:ActivitySummaryExercise, index:number) => <View key={`${item.exercise}:${index}`} style={{ flex: Math.max(item.elapsed_time, 1) / Math.max(total, 1), backgroundColor: item.color }} />)}
                                        </View>

                                        {summary.map((item:ActivitySummaryExercise, index:number) => (
                                            <View key={`${item.exercise}:${index}`} style={styles.summary_row}>
                                                <View style={[styles.swatch, { backgroundColor: item.color }]} />
                                                <Text variant="callout" numberOfLines={1} style={styles.flex}>{item.exercise}</Text>
                                                <Text variant="caption" color="text_secondary" is_tabular>{getMinimalistFormattedTime(item.elapsed_time)}</Text>
                                                <Text variant="caption" color="premium" is_tabular style={styles.summary_xp}>{item.gained_xp} XP</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )
                    })}

                    {activities.length > COLLAPSED_COUNT && (
                        <Button label={is_showing_all ? t("Zobraziť menej") : t("Zobraziť všetko ({{count}})", { count: activities.length })} variant="ghost" size="sm" onPress={() => setIsShowingAll((previous:boolean) => !previous)} />
                    )}
                </View>
            )}
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

    list: {
        gap: spacing.xs,
    },

    item: {
        gap: spacing.sm,
    },

    row: {
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        borderRadius: radii.md,
    },

    pressed: {
        opacity: 0.75,
    },

    icon: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    values: {
        alignItems: "flex-end",
    },

    summary: {
        gap: spacing.sm,
        marginLeft: 32 + spacing.md,
        marginBottom: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.surface_raised,
        borderRadius: radii.md,
    },

    bar: {
        height: 8,
        flexDirection: "row",
        gap: 2,
        overflow: "hidden",
        borderRadius: radii.pill,
    },

    summary_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    swatch: {
        width: 8,
        height: 8,
        borderRadius: radii.pill,
    },

    summary_xp: {
        minWidth: 44,
        textAlign: "right",
    },
})
