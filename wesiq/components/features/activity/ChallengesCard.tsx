// Today's Challenges (Official Daily Tasks With Progress And XP)

import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Card, Icon, Skeleton, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { getChallengeProgress, getChallengeRule, LiveProgressInput } from "./xp"

import type { OfficialTask } from "@/types/models"

interface ChallengesCardProps {
    tasks:OfficialTask[],
    remaining_hours:number|null,
    live_input:LiveProgressInput|null, // While The Timer Runs
    is_loading:boolean
}

export default function ChallengesCard({ tasks, remaining_hours, live_input, is_loading }:ChallengesCardProps) {
    const { t } = useTranslation() // Initializes The Translations
    const completed:number = tasks.filter((task:OfficialTask) => task.is_completed).length

    return (
        <Card padding="lg" style={styles.card}>
            <View style={styles.header}>
                <View style={styles.flex}>
                    <Text variant="heading" accessibilityRole="header">{t("Dnešné výzvy")}</Text>
                    <Text variant="caption" color="text_muted">{t("Splnené: {{completed}} z {{total}}", { completed, total: tasks.length })}</Text>
                </View>

                {remaining_hours !== null && (
                    <View style={styles.remaining} accessible accessibilityLabel={t("Nové výzvy o {{count}} h", { count: remaining_hours })}>
                        <Icon name="clock" size={11} color="text_secondary" is_solid={false} />
                        <Text variant="caption" color="text_secondary">{t("{{count}} h", { count: remaining_hours })}</Text>
                    </View>
                )}
            </View>

            {is_loading && tasks.length === 0 ? (
                <View style={styles.list}>{[0, 1, 2].map((index:number) => <Skeleton key={index} height={44} radius={radii.md} />)}</View>
            ) : (
                <View style={styles.list}>
                    {tasks.map((task:OfficialTask) => {
                        const rule = getChallengeRule(task.data) // Gets The Label And Icon
                        const progress:number = getChallengeProgress(task, live_input)

                        return (
                            <View key={task.data} style={styles.task} accessible accessibilityLabel={`${rule.label} ${task.is_completed ? t("Splnené") : `${Math.floor(progress)} %`}, ${task.xp} XP`}>
                                <View style={[styles.icon, task.is_completed ? styles.icon_done : null]}>
                                    <Icon name={task.is_completed ? "check" : rule.icon} size={13} color={task.is_completed ? "success" : "primary"} />
                                </View>

                                <View style={styles.task_body}>
                                    <View style={styles.task_top}>
                                        <Text variant="callout" color={task.is_completed ? "text_secondary" : "text"} numberOfLines={2} style={styles.flex}>{rule.label}</Text>
                                        <Text variant="label" color={task.is_completed ? "success" : "premium"}>+{task.xp} XP</Text>
                                    </View>

                                    {!task.is_completed && (
                                        <View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View>
                                    )}
                                </View>
                            </View>
                        )
                    })}
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

    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    remaining: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        backgroundColor: colors.surface_raised,
        borderRadius: radii.pill,
    },

    list: {
        gap: spacing.md,
    },

    task: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },

    icon: {
        width: 32,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    icon_done: {
        backgroundColor: colors.success_soft,
    },

    task_body: {
        flex: 1,
        gap: spacing.xs + 2,
    },

    task_top: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.sm,
    },

    track: {
        height: 5,
        overflow: "hidden",
        backgroundColor: colors.surface_strong,
        borderRadius: radii.pill,
    },

    fill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: radii.pill,
    },
})
