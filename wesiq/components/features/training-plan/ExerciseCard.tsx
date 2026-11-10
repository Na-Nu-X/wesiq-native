// One Exercise In The Training Plan Editor (Name, Unit, Set Groups, Reorder, Remove)

import { memo } from "react"
import { AccessibilityActionEvent, Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Button, Card, Icon, IconButton, SegmentedControl, Stepper, Text, TextField } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { formatDuration } from "@/lib/format"
import { countSets, DraftExercise, MAX_EXERCISE_NAME_LENGTH, MAX_SETS_PER_EXERCISE, SetGroup, UNIT_RULES } from "./model"

import type { EditorAction } from "./useTrainingPlanEditor"
import type { ExerciseUnit } from "@/types/models"

interface ExerciseCardProps {
    exercise:DraftExercise,
    index:number,
    count:number,
    dispatch:(action:EditorAction) => void,
    onDragStart?:() => void, // Provided By The Draggable List
    is_dragging?:boolean,
    has_name_error?:boolean
}

// Function For Format A Value With Its Unit (Used For Labels And Totals)
export const useUnitLabels = () => {
    const { t } = useTranslation() // Initializes The Translations

    return {
        short: (unit:ExerciseUnit):string => unit === "reps" ? t("opak.") : unit === "seconds" ? t("sek.") : t("krokov"),
        name: (unit:ExerciseUnit):string => unit === "reps" ? t("Opakovania") : unit === "seconds" ? t("Čas") : t("Kroky"),
        format: (value:number, unit:ExerciseUnit):string => unit === "seconds" ? formatDuration(value) : String(value),
    }
}

function ExerciseCard({ exercise, index, count, dispatch, onDragStart, is_dragging = false, has_name_error = false }:ExerciseCardProps) {
    const { t } = useTranslation() // Initializes The Translations
    const unit_labels = useUnitLabels() // Gets The Unit Labels
    const rules = UNIT_RULES[exercise.unit] // Gets The Value Rules
    const total_sets:number = countSets(exercise.sets) // Counts The Sets
    const display_name:string = exercise.name.trim() || t("Vlastný cvik") // Gets The Name For Labels

    // Function For Handle Screen Reader Actions (Drag & Drop Isn't Usable With A Screen Reader)
    const handleAccessibilityAction = (event:AccessibilityActionEvent):void => {
        if(event.nativeEvent.actionName === "move_up") dispatch({ type: "move_exercise", local_id: exercise.local_id, direction: -1 })
        if(event.nativeEvent.actionName === "move_down") dispatch({ type: "move_exercise", local_id: exercise.local_id, direction: 1 })
        if(event.nativeEvent.actionName === "remove") dispatch({ type: "remove_exercise", local_id: exercise.local_id })
    }

    return (
        <Card
            padding="md"
            variant={is_dragging ? "highlighted" : "default"}
            style={[styles.card, is_dragging ? styles.card_dragging : null]}
        >
            <View
                style={styles.header}
                accessible
                accessibilityLabel={`${index + 1}. ${display_name}, ${t("Série")}: ${total_sets}`}
                accessibilityActions={[
                    ...(index > 0 ? [{ name: "move_up", label: t("Posunúť vyššie") }] : []),
                    ...(index < count - 1 ? [{ name: "move_down", label: t("Posunúť nižšie") }] : []),
                    { name: "remove", label: t("Odstrániť cvik") },
                ]}
                onAccessibilityAction={handleAccessibilityAction}
            >
                {onDragStart && (
                    <Pressable
                        onPressIn={onDragStart} // Dragging Starts Immediately From The Handle
                        hitSlop={10}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        style={styles.handle}
                    >
                        <Icon name="grip-vertical" size={15} color="text_muted" />
                    </Pressable>
                )}

                <View style={styles.number}>
                    <Text variant="label" color="primary_text" is_tabular>{index + 1}</Text>
                </View>

                <View style={styles.flex}>
                    {exercise.is_custom ? (
                        <Text variant="caption" color="text_muted">{t("Vlastný cvik")}</Text>
                    ) : (
                        <Text variant="body_strong" numberOfLines={2}>{exercise.name}</Text>
                    )}

                    <Text variant="caption" color="text_secondary">
                        {t("Série")}: {total_sets} · {unit_labels.name(exercise.unit)}
                    </Text>
                </View>

                <IconButton
                    icon="trash"
                    accessibility_label={`${t("Odstrániť cvik")}: ${display_name}`}
                    onPress={() => dispatch({ type: "remove_exercise", local_id: exercise.local_id })}
                    size={34}
                    icon_color="text_muted"
                    is_solid_icon={false}
                />
            </View>

            {exercise.is_custom && (
                <View style={styles.custom}>
                    <TextField
                        placeholder={t("Názov cviku")}
                        accessibilityLabel={t("Názov cviku")}
                        value={exercise.name}
                        onChangeText={(name:string) => dispatch({ type: "rename_exercise", local_id: exercise.local_id, name })}
                        maxLength={MAX_EXERCISE_NAME_LENGTH}
                        error={has_name_error ? t("Zadajte názov cviku.") : null}
                    />

                    <SegmentedControl<ExerciseUnit>
                        value={exercise.unit}
                        onChange={(unit:ExerciseUnit) => dispatch({ type: "set_unit", local_id: exercise.local_id, unit })}
                        accessibility_label={t("Jednotka")}
                        options={[
                            { value: "reps", label: unit_labels.name("reps") },
                            { value: "seconds", label: unit_labels.name("seconds") },
                            { value: "steps", label: unit_labels.name("steps") },
                        ]}
                    />
                </View>
            )}

            <View style={styles.groups}>
                {exercise.sets.map((group:SetGroup, group_index:number) => (
                    <View key={group_index} style={styles.group_row}>
                        <Stepper
                            value={group.value}
                            onChange={(value:number) => dispatch({ type: "update_set_group", local_id: exercise.local_id, group_index, changes: { value } })}
                            min={rules.min}
                            max={rules.max}
                            step={rules.step}
                            label={exercise.unit === "seconds" ? "min:s" : unit_labels.short(exercise.unit)}
                            formatValue={exercise.unit === "seconds" ? formatDuration : undefined}
                            accessibility_label={`${unit_labels.name(exercise.unit)}, ${display_name}`}
                            is_compact
                        />

                        <Text variant="body_strong" color="text_muted" accessibilityElementsHidden>×</Text>

                        <Stepper
                            value={group.count}
                            onChange={(count:number) => dispatch({ type: "update_set_group", local_id: exercise.local_id, group_index, changes: { count } })}
                            min={1}
                            max={MAX_SETS_PER_EXERCISE - (total_sets - group.count)}
                            label={t("sérií")}
                            accessibility_label={`${t("Série")}, ${display_name}`}
                            is_compact
                        />

                        {exercise.sets.length > 1 && (
                            <IconButton
                                icon="xmark"
                                accessibility_label={t("Odstrániť riadok sérií")}
                                onPress={() => dispatch({ type: "remove_set_group", local_id: exercise.local_id, group_index })}
                                size={28}
                                icon_color="text_muted"
                            />
                        )}
                    </View>
                ))}
            </View>

            {total_sets < MAX_SETS_PER_EXERCISE && (
                <Button
                    label={t("Pridať sériu s inou hodnotou")}
                    icon="plus"
                    variant="ghost"
                    size="sm"
                    onPress={() => dispatch({ type: "add_set_group", local_id: exercise.local_id })}
                />
            )}
        </Card>
    )
}

export default memo(ExerciseCard)

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    card: {
        gap: spacing.md,
    },

    card_dragging: {
        transform: [{ scale: 1.02 }],
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    handle: {
        width: 24,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: -spacing.xs,
    },

    number: {
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    custom: {
        gap: spacing.sm,
    },

    groups: {
        gap: spacing.sm,
    },

    group_row: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: spacing.sm,
    },
})
