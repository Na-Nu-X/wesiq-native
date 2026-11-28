// Details Of An Official Training Plan (Description, Duration, Difficulty, Goal, Requirements, Target Muscles)

import { StyleSheet, View } from "react-native"
import { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { useOfficialPlanLabels } from "./useOfficialPlanLabels"

import type { ColorToken } from "@/theme"
import type { OfficialTrainingPlanExercise } from "@/types/models"
import type { PlanSummary } from "./model"

interface OfficialPlanDetailsProps {
    plan:PlanSummary<OfficialTrainingPlanExercise>
}

const METER_SEGMENTS:number = 5 // Number Of Segments In The Difficulty Meter

// Function For Get The Difficulty Level (0 - 100 → Easy / Medium / Hard)
const getDifficultyLevel = (difficulty:number, t:TFunction):{ label:string, color:ColorToken } => {
    if(difficulty <= 33) return { label: t("Ľahký"), color: "success" }
    if(difficulty <= 66) return { label: t("Stredne náročný"), color: "warning" }
    return { label: t("Náročný"), color: "danger" }
}

// Function For Build The Screen Reader Text Of The Details (The Card's Label Hides Its Children)
export const getOfficialPlanDetailsLabel = (plan:PlanSummary<OfficialTrainingPlanExercise>, t:TFunction, getTagLabel:(tag:string) => string):string => {
    const first:OfficialTrainingPlanExercise|undefined = plan.rows[0] // Gets The First Row (Every Row Of A Plan Shares The Details)
    if(!first) return ""

    return [
        first.description,
        first.duration !== null ? t("{{count}} min", { count: first.duration }) : null,
        first.difficulty !== null ? `${t("Náročnosť")}: ${getDifficultyLevel(first.difficulty, t).label}` : null,
        first.goal ? `${t("Cieľ")}: ${getTagLabel(first.goal)}` : null,
        first.requirements ? `${t("Vybavenie")}: ${first.requirements}` : null,
        first.target_muscles.length > 0 ? `${t("Svaly")}: ${first.target_muscles.map(getTagLabel).join(", ")}` : null,
    ].filter(Boolean).join(". ")
}

export default function OfficialPlanDetails({ plan }:OfficialPlanDetailsProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { getTagLabel } = useOfficialPlanLabels() // Gets The Tag Labels
    const first:OfficialTrainingPlanExercise|undefined = plan.rows[0] // Gets The First Row (Every Row Of A Plan Shares The Details)
    if(!first) return null

    const difficulty = first.difficulty !== null ? getDifficultyLevel(first.difficulty, t) : null // Gets The Difficulty Level
    const filled_segments:number = first.difficulty !== null ? Math.max(1, Math.ceil(first.difficulty / (100 / METER_SEGMENTS))) : 0 // At Least One Segment, So An Easy Plan Doesn't Look Empty
    const has_stats:boolean = first.duration !== null || difficulty !== null || !!first.goal // Stores The Information If The Stats Row Has Anything To Show

    return (
        <View
            style = {styles.details}
            importantForAccessibility = "no-hide-descendants"
            accessibilityElementsHidden
        >
            {!!first.description &&
                <Text
                    variant = "callout"
                    color = "text_secondary"
                    numberOfLines = {3}
                >
                    {first.description}
                </Text>
            }

            {has_stats && (
                <View style = {styles.stats}>
                    {first.duration !== null && (
                        <View style = {styles.stat}>
                            <Icon
                                name = "clock"
                                size = {12}
                                color = "text_muted"
                                is_solid = {false}
                            />
                            <Text
                                variant = "caption"
                                color = "text_secondary"
                                is_tabular
                            >
                                {t("{{count}} min", { count: first.duration })}
                            </Text>
                        </View>
                    )}

                    {difficulty !== null && (
                        <View style = {styles.stat}>
                            <View style = {styles.meter}>
                                {Array.from({ length: METER_SEGMENTS }, (_, index:number) => (
                                    <View key = {index} style = {[styles.segment, { backgroundColor: index < filled_segments ? colors[difficulty.color] : colors.surface_strong }]} />
                                ))}
                            </View>

                            <Text variant = "caption" color = "text_secondary">{difficulty.label}</Text>
                        </View>
                    )}

                    {!!first.goal && (
                        <View style = {styles.stat}>
                            <Icon
                                name = "bullseye"
                                size = {12}
                                color = "text_muted"
                            />
                            <Text variant = "caption" color = "text_secondary">{getTagLabel(first.goal)}</Text>
                        </View>
                    )}
                </View>
            )}

            {!!first.requirements && (
                <View style = {styles.stat}>
                    <Icon
                        name = "dumbbell"
                        size = {12}
                        color = "text_muted"
                    />
                    <Text
                        variant = "caption"
                        color = "text_secondary"
                        numberOfLines = {1}
                        style = {styles.flex}
                    >
                        {first.requirements}
                    </Text>
                </View>
            )}

            {first.target_muscles.length > 0 && (
                <View style = {styles.tags}>
                    {first.target_muscles.map((muscle:string) => (
                        <View key = {muscle} style = {styles.tag}>
                            <Text variant = "caption" color = "text_accent">{getTagLabel(muscle)}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    details: {
        gap: spacing.sm,
    },

    stats: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: spacing.lg,
        rowGap: spacing.xs,
    },

    stat: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
    },

    meter: {
        flexDirection: "row",
        gap: 2,
    },

    segment: {
        width: 6,
        height: 10,
        borderRadius: 2,
    },

    tags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.xs + 2,
    },

    tag: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },
})
