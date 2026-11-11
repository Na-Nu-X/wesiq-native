// Guided Training Plan: Pick A Plan, Then Exercise → Sets → Break → Finish

import { ScrollView, StyleSheet, View } from "react-native"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import { Button, Card, Chip, Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { formatDuration } from "@/lib/format"
import { getDayName } from "@/lib/days"
import Countdown from "./Countdown"
import { BREAK_SECONDS, SessionState } from "./useWorkoutSession"

import type { PlanSummary } from "@/components/features/training-plan/model"
import type { TrainingPlanExercise } from "@/types/models"

interface WorkoutPlanCardProps {
    plans:PlanSummary<TrainingPlanExercise>[],
    selected_key:string,
    onSelect:(key:string) => void,
    session:SessionState,
    onStart:() => void,
    onNextSet:() => void,
    onSkipExercise:() => void,
    onEndBreak:() => void,
    onFinish:() => void, // Saves The Activity
    is_saving:boolean
}

export default function WorkoutPlanCard({ plans, selected_key, onSelect, session, onStart, onNextSet, onSkipExercise, onEndBreak, onFinish, is_saving }:WorkoutPlanCardProps) {
    const { t } = useTranslation() // Initializes The Translations

    const plan:PlanSummary<TrainingPlanExercise>|undefined = plans.find((one_plan) => one_plan.key === selected_key) ?? plans[0]
    if(!plan) return null

    const exercises:TrainingPlanExercise[] = plan.rows
    const is_active:boolean = session.step !== "start"
    const current:TrainingPlanExercise|undefined = exercises[session.exercise_index]
    const next:TrainingPlanExercise|undefined = exercises[session.exercise_index + 1]

    // Function For Get The Target Of One Set
    const getTarget = (exercise:TrainingPlanExercise, set_index:number):string => {
        const value:number = exercise.periods[set_index] ?? 0
        if(value === 0) return t("Do zlyhania")
        if(exercise.unit === "seconds") return formatDuration(value)
        if(exercise.unit === "steps") return t("{{count}} krokov", { count: value })
        return `${value}×`
    }

    const getPlanLabel = (one_plan:PlanSummary<TrainingPlanExercise>):string => one_plan.day !== null ? `${getDayName(one_plan.day)} · ${one_plan.title}` : one_plan.title

    // Function For Get How Much Of Each Exercise Is Done (0 - 1)
    const getSegmentProgress = (index:number):number => {
        if(!is_active) return 0
        if(session.step === "finish" || index < session.exercise_index) return 1
        if(index > session.exercise_index) return 0
        if(session.step === "break") return 1

        const sets:number = Math.max(1, exercises[index]?.periods.length ?? 1)
        return session.set_index / sets
    }

    const segments = (
        <View style={styles.segments} accessible accessibilityLabel={t("Cvik {{current}} z {{total}}", { current: Math.min(session.exercise_index + 1, exercises.length), total: exercises.length })}>
            {exercises.map((exercise:TrainingPlanExercise, index:number) => (
                <View key={exercise.id} style={[styles.segment, index === session.exercise_index && session.step === "exercise" ? styles.segment_current : null]}>
                    <View style={[styles.segment_fill, { width: `${getSegmentProgress(index) * 100}%` }]} />
                </View>
            ))}
        </View>
    )

    return (
        <Card padding="lg" style={styles.card}>
            <View style={styles.header}>
                <Icon name="dumbbell" size={14} color="primary" />
                <Text variant="overline" color="text_muted" style={styles.flex}>{t("Tréningový plán")}</Text>
                {is_active && session.step !== "finish" && <Button label={t("Dokončiť")} variant="ghost" size="sm" onPress={onFinish} is_disabled={is_saving} />}
            </View>

            {/* ---------- Plan Picker ---------- */}
            {!is_active && plans.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {plans.map((one_plan) => <Chip key={one_plan.key} label={getPlanLabel(one_plan)} is_selected={one_plan.key === plan.key} onPress={() => onSelect(one_plan.key)} />)}
                </ScrollView>
            )}

            {is_active && segments}

            <Animated.View key={`${session.step}:${session.exercise_index}`} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.body}>
                {/* ---------- Start ---------- */}
                {session.step === "start" && (
                    <>
                        <View style={styles.intro}>
                            <Text variant="title">{plan.title}</Text>
                            <Text variant="callout" color="text_secondary">
                                {[plan.day !== null ? getDayName(plan.day) : null, t("Cviky: {{count}}", { count: plan.exercise_count }), t("Série: {{count}}", { count: plan.set_count })].filter(Boolean).join(" · ")}
                            </Text>
                        </View>

                        <View style={styles.preview}>
                            {exercises.slice(0, 5).map((exercise:TrainingPlanExercise, index:number) => (
                                <View key={exercise.id} style={styles.preview_row}>
                                    <Text variant="caption" color="text_muted" is_tabular style={styles.preview_index}>{index + 1}</Text>
                                    <Text variant="callout" numberOfLines={1} style={styles.flex}>{exercise.exercise}</Text>
                                    <Text variant="caption" color="text_secondary">{exercise.is_warm_up ? t("Rozcvička") : `${exercise.periods.length} × ${getTarget(exercise, 0)}`}</Text>
                                </View>
                            ))}

                            {exercises.length > 5 && <Text variant="caption" color="text_muted">{t("a ďalšie: {{count}}", { count: exercises.length - 5 })}</Text>}
                        </View>

                        <Button label={t("Začať tréning")} icon="play" onPress={() => { haptics.light(); onStart() }} size="lg" is_full_width />
                    </>
                )}

                {/* ---------- Exercise / Warm Up ---------- */}
                {session.step === "exercise" && current && (current.is_warm_up ? (
                    <Countdown seconds={current.periods[0] ?? 60} title={`${t("Rozcvička")} · ${current.exercise}`} skip_label={t("Pokračovať")} onSkip={onSkipExercise} />
                ) : (
                    <>
                        <View style={styles.exercise}>
                            <Text variant="heading" align="center">{current.exercise}</Text>
                            <Text variant="timer" align="center" color="primary" style={styles.target}>{getTarget(current, session.set_index)}</Text>
                            <Text variant="label" color="text_secondary" align="center">{t("Séria {{current}} z {{total}}", { current: session.set_index + 1, total: Math.max(1, current.periods.length) })}</Text>
                        </View>

                        <View style={styles.actions}>
                            <Button label={t("Preskočiť")} icon="forward" variant="secondary" onPress={onSkipExercise} />
                            <Button
                                label={session.set_index < current.periods.length - 1 ? t("Séria hotová") : next ? t("Cvik hotový") : t("Dokončiť")}
                                icon="check"
                                onPress={() => { haptics.light(); onNextSet() }}
                                style={styles.flex}
                            />
                        </View>
                    </>
                ))}

                {/* ---------- Break ---------- */}
                {session.step === "break" && (
                    <Countdown seconds={BREAK_SECONDS} title={t("Prestávka")} skip_label={t("Ďalší cvik")} onSkip={onEndBreak} can_add_time has_alarm />
                )}

                {/* ---------- Finish ---------- */}
                {session.step === "finish" && (
                    <>
                        <View style={styles.intro_center}>
                            <View style={styles.finish_icon}><Icon name="trophy" size={24} color="premium" /></View>
                            <Text variant="title" align="center">{t("Tréning dokončený!")}</Text>
                            <Text variant="callout" color="text_secondary" align="center">{t("Uložte aktivitu a získajte XP.")}</Text>
                        </View>

                        <Button label={t("Uložiť aktivitu")} icon="floppy-disk" onPress={onFinish} is_loading={is_saving} size="lg" is_full_width />
                    </>
                )}
            </Animated.View>

            {is_active && (session.step === "exercise" || session.step === "break") && next && (
                <View style={styles.next}>
                    <Icon name="angles-right" size={11} color="text_muted" />
                    <Text variant="caption" color="text_muted" numberOfLines={1} style={styles.flex}>{t("Ďalej: {{exercise}}", { exercise: next.exercise })}</Text>
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
        minHeight: 28,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    chips: {
        gap: spacing.sm,
        paddingRight: spacing.lg,
    },

    body: {
        gap: spacing.lg,
    },

    intro: {
        gap: spacing.xs,
    },

    intro_center: {
        alignItems: "center",
        gap: spacing.sm,
    },

    preview: {
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.surface_raised,
        borderRadius: radii.md,
    },

    preview_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    preview_index: {
        width: 16,
    },

    segments: {
        flexDirection: "row",
        gap: 4,
    },

    segment: {
        flex: 1,
        height: 6,
        overflow: "hidden",
        backgroundColor: colors.surface_strong,
        borderRadius: radii.pill,
    },

    segment_current: {
        backgroundColor: colors.primary_soft,
    },

    segment_fill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: radii.pill,
    },

    exercise: {
        alignItems: "center",
        gap: spacing.xs,
        paddingVertical: spacing.sm,
    },

    target: {
        fontSize: 48,
        lineHeight: 60,
    },

    actions: {
        flexDirection: "row",
        gap: spacing.sm,
    },

    finish_icon: {
        width: 56,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.premium_soft,
        borderRadius: radii.pill,
    },

    next: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
})
