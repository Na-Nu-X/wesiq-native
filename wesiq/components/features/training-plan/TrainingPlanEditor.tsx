// Training Plan Editor (Shared By The New, Edit And Copy Screens)

import { useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist"
import { useTranslation } from "react-i18next"
import { Button, Card, Header, Icon, Screen, Stepper, Text, TextField, ToggleRow } from "@/components/ui"
import { colors, layout, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { emitAppEvent } from "@/lib/events"
import { formatDuration } from "@/lib/format"
import { deleteTrainingPlan, saveTrainingPlan } from "@/lib/api/endpoints/trainingPlans"
import ExerciseCard from "./ExerciseCard"
import ExerciseLibrarySheet from "./ExerciseLibrarySheet"
import DayPicker from "./DayPicker"
import { DEFAULT_WARM_UP_SECONDS, DraftExercise, DraftIssue, draftToRows, EditorMode, MAX_EXERCISES, MAX_TITLE_LENGTH, PlanDraft, UNIT_RULES } from "./model"
import { useTrainingPlanEditor } from "./useTrainingPlanEditor"

import type { Day } from "@/types/models"

interface TrainingPlanEditorProps {
    mode:EditorMode,
    initial_draft:PlanDraft,
    taken_days:ReadonlyMap<Day, string>, // Days Used By Other Plans
    onSaved:(draft:PlanDraft) => void,
    onDeleted?:() => void,
    onBack:() => void
}

export default function TrainingPlanEditor({ mode, initial_draft, taken_days, onSaved, onDeleted, onBack }:TrainingPlanEditorProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { draft, dispatch, issues, is_dirty } = useTrainingPlanEditor(initial_draft) // Stores The Draft

    const [is_library_open, setIsLibraryOpen] = useState<boolean>(false) // Stores The Information If The Exercise Library Is Open
    const [is_saving, setIsSaving] = useState<boolean>(false) // Stores The Information If The Plan Is Being Saved
    const [is_deleting, setIsDeleting] = useState<boolean>(false) // Stores The Information If The Plan Is Being Deleted
    const [has_tried_saving, setHasTriedSaving] = useState<boolean>(false) // Shows Validation Errors After The First Save Attempt
    const [dragging_id, setDraggingId] = useState<string|null>(null) // Stores The Exercise Being Dragged

    // Counts How Many Times Each Library Exercise Is In The Plan (Shown In The Library)
    const added_counts:Map<number, number> = useMemo(() => {
        const counts:Map<number, number> = new Map()
        draft.exercises.forEach((exercise:DraftExercise) => {
            if(exercise.library_id !== null) counts.set(exercise.library_id, (counts.get(exercise.library_id) ?? 0) + 1)
        })
        return counts
    }, [draft.exercises])

    const visible_issues:DraftIssue[] = has_tried_saving ? issues : [] // Gets The Issues To Show
    const has_title_error:boolean = visible_issues.some((issue:DraftIssue) => issue.kind === "missing_title")
    const unnamed_ids:Set<string> = new Set(visible_issues.flatMap((issue:DraftIssue) => issue.kind === "missing_exercise_name" ? [issue.local_id] : []))
    const is_busy:boolean = is_saving || is_deleting

    // Function For Go Back (Asks Before Throwing Away Changes)
    const goBack = async ():Promise<void> => {
        if(is_busy) return

        if(is_dirty) {
            const is_confirmed:boolean = await confirmAction({
                title: t("Zahodiť zmeny?"),
                message: t("Neuložené zmeny sa stratia."),
                confirm_label: t("Zahodiť"),
                cancel_label: t("Pokračovať v úpravách"),
                is_destructive: true,
            })

            if(!is_confirmed) return
            dispatch({ type: "reset", draft: initial_draft })
        }

        onBack()
    }

    // Function For Save The Plan
    const save = async ():Promise<void> => {
        setHasTriedSaving(true)

        if(issues.length > 0) {
            haptics.error()
            return
        }

        setIsSaving(true)
        const response = await saveTrainingPlan(draftToRows(draft)) // Sends The Plan
        setIsSaving(false)

        if(!response.ok) {
            haptics.error()
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        emitAppEvent("training_plans_changed")
        setHasTriedSaving(false)
        dispatch({ type: "reset", draft })
        onSaved(draft)
    }

    // Function For Delete The Plan (Edit Mode)
    const remove = async ():Promise<void> => {
        if(!draft.key) return

        const is_confirmed:boolean = await confirmAction({
            title: t("Odstrániť plán {{title}}?", { title: initial_draft.title || t("Tréningový plán") }),
            message: t("Plán sa natrvalo odstráni. História aktivít zostane zachovaná."),
            confirm_label: t("Odstrániť"),
            is_destructive: true,
        })

        if(!is_confirmed) return

        setIsDeleting(true)
        const response = await deleteTrainingPlan(draft.key) // Sends The Request
        setIsDeleting(false)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        emitAppEvent("training_plans_changed")
        onDeleted?.()
    }

    // Gets The Footer Message
    const issue_message:string|null = visible_issues.length === 0 ? null
        : visible_issues.some((issue:DraftIssue) => issue.kind === "missing_title") ? t("Pridajte názov pre tréningový plán.")
        : visible_issues.some((issue:DraftIssue) => issue.kind === "no_exercises") ? t("Pridajte aspoň nejaký cvik pre tréningový plán.")
        : t("Pomenujte všetky vlastné cviky.")

    const titles:Record<EditorMode, string> = {
        new: t("Nový plán"),
        edit: t("Upraviť plán"),
        copy: t("Kopírovať plán"),
    }

    // ---------- List Parts ----------

    const list_header = (
        <View style={styles.list_header}>
            <Card padding="lg" style={styles.settings_card}>
                <TextField
                    label={t("Názov")}
                    placeholder={t("Napríklad Horná časť tela")}
                    value={draft.title}
                    onChangeText={(title:string) => dispatch({ type: "set_title", title })}
                    maxLength={MAX_TITLE_LENGTH}
                    is_counter_visible
                    error={has_title_error ? t("Pridajte názov pre tréningový plán.") : null}
                    autoCapitalize="sentences"
                    returnKeyType="done"
                />

                <View style={styles.field_group}>
                    <Text variant="label" color="text_secondary" style={styles.label}>{t("Deň")}</Text>
                    <DayPicker value={draft.day} onChange={(day:Day|null) => dispatch({ type: "set_day", day })} taken_days={taken_days} />
                </View>
            </Card>

            <Card padding="xs">
                <ToggleRow
                    icon="fire"
                    label={t("Rozcvička")}
                    description={draft.warm_up_seconds !== null ? t("Spustí sa pred prvým cvikom.") : t("Odporúčame 5 minút rozcvičky.")}
                    value={draft.warm_up_seconds !== null}
                    onChange={(is_enabled:boolean) => dispatch({ type: "set_warm_up", seconds: is_enabled ? DEFAULT_WARM_UP_SECONDS : null })}
                />

                {draft.warm_up_seconds !== null && (
                    <View style={styles.warm_up_row}>
                        <Text variant="callout" color="text_secondary">{t("Dĺžka")}</Text>

                        <Stepper
                            value={draft.warm_up_seconds}
                            onChange={(seconds:number) => dispatch({ type: "set_warm_up", seconds })}
                            min={UNIT_RULES.seconds.min}
                            max={1800}
                            step={30}
                            formatValue={formatDuration}
                            accessibility_label={t("Dĺžka rozcvičky")}
                        />
                    </View>
                )}
            </Card>

            <View style={styles.section_row}>
                <Text variant="overline" color="text_muted" accessibilityRole="header">{t("Cviky")} ({draft.exercises.length})</Text>
                {draft.exercises.length > 1 && <Text variant="caption" color="text_muted">{t("Poradie zmeníte potiahnutím")}</Text>}
            </View>
        </View>
    )

    const list_footer = (
        <View style={styles.list_footer}>
            {draft.exercises.length === 0 && (
                <Card variant="outlined" padding="xl" style={styles.empty}>
                    <View style={styles.empty_icon}>
                        <Icon name="dumbbell" size={22} color="primary" />
                    </View>

                    <Text variant="body_strong" align="center">{t("Zatiaľ žiadne cviky")}</Text>
                    <Text variant="callout" color="text_secondary" align="center">{t("Pridajte cviky z knižnice alebo vytvorte vlastné.")}</Text>
                </Card>
            )}

            {draft.exercises.length < MAX_EXERCISES && (
                <Button label={t("Pridať cvik")} icon="plus" variant="outline" onPress={() => setIsLibraryOpen(true)} is_full_width />
            )}

            {mode === "edit" && draft.key && (
                <Button label={is_deleting ? t("Odstraňuje sa...") : t("Odstrániť plán")} icon="trash" variant="danger" onPress={remove} is_disabled={is_busy} is_full_width style={styles.delete_button} />
            )}
        </View>
    )

    // Function For Render One Exercise
    const renderItem = ({ item, getIndex, drag, isActive }:RenderItemParams<DraftExercise>) => (
        <View style={styles.item}>
            <ExerciseCard
                exercise={item}
                index={getIndex() ?? 0}
                count={draft.exercises.length}
                dispatch={dispatch}
                onDragStart={draft.exercises.length > 1 ? drag : undefined}
                is_dragging={isActive || dragging_id === item.local_id}
                has_name_error={unnamed_ids.has(item.local_id)}
            />
        </View>
    )

    return (
        <Screen
            is_scrollable={false}
            is_padded={false}
            is_keyboard_aware
            header={
                <Header
                    title={titles[mode]}
                    subtitle={is_dirty ? t("Neuložené zmeny") : undefined}
                    has_back_button
                    onBack={goBack}
                />
            }
            footer={
                <View style={styles.footer}>
                    {issue_message && (
                        <View style={styles.issue_row} accessibilityLiveRegion="polite">
                            <Icon name="circle-exclamation" size={13} color="danger" />
                            <Text variant="caption" color="danger" style={styles.flex}>{issue_message}</Text>
                        </View>
                    )}

                    <Button
                        label={mode === "edit" ? t("Uložiť zmeny") : t("Uložiť plán")}
                        icon="check"
                        onPress={save}
                        is_loading={is_saving}
                        is_disabled={is_deleting || (mode === "edit" && !is_dirty)}
                        is_full_width
                    />
                </View>
            }
        >
            <DraggableFlatList
                data={draft.exercises}
                keyExtractor={(exercise:DraftExercise) => exercise.local_id}
                renderItem={renderItem}
                onDragBegin={(index:number) => {
                    haptics.light()
                    setDraggingId(draft.exercises[index]?.local_id ?? null)
                }}
                onDragEnd={({ data }:{ data:DraftExercise[] }) => {
                    setDraggingId(null)
                    dispatch({ type: "reorder_exercises", exercises: data })
                }}
                ListHeaderComponent={list_header}
                ListFooterComponent={list_footer}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                containerStyle={styles.flex}
                contentContainerStyle={styles.list_content}
                activationDistance={8}
            />

            <ExerciseLibrarySheet
                visible={is_library_open}
                onClose={() => setIsLibraryOpen(false)}
                onAddExercise={(exercise) => dispatch({ type: "add_library_exercise", exercise })}
                onAddCustom={() => {
                    dispatch({ type: "add_custom_exercise" })
                    setIsLibraryOpen(false) // Closes So The Name Can Be Typed Right Away
                }}
                onAddWarmUp={draft.warm_up_seconds === null ? () => dispatch({ type: "set_warm_up", seconds: DEFAULT_WARM_UP_SECONDS }) : null}
                added_counts={added_counts}
                can_add={draft.exercises.length < MAX_EXERCISES}
            />
        </Screen>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    list_content: {
        paddingHorizontal: layout.screen_padding,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xxxl,
    },

    list_header: {
        gap: spacing.md,
        paddingBottom: spacing.sm,
    },

    settings_card: {
        gap: spacing.lg,
    },

    field_group: {
        gap: spacing.sm,
    },

    label: {
        paddingHorizontal: spacing.xs,
    },

    warm_up_row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },

    section_row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: spacing.sm,
        paddingHorizontal: spacing.xs,
    },

    item: {
        paddingVertical: spacing.xs + 2,
    },

    list_footer: {
        gap: spacing.md,
        paddingTop: spacing.sm,
    },

    empty: {
        alignItems: "center",
        gap: spacing.sm,
        borderStyle: "dashed",
    },

    empty_icon: {
        width: 52,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.xs,
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    delete_button: {
        marginTop: spacing.lg,
    },

    footer: {
        gap: spacing.sm,
    },

    issue_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
    },
})
