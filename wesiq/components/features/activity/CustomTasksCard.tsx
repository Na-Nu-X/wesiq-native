// My Tasks: Personal Checklist (Add, Check Off, Drag To Reorder, Delete)

import { useState } from "react"
import { Pressable, PressableStateCallbackType, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Button, Card, EmptyState, ErrorState, Icon, IconButton, Sheet, Skeleton, Text, TextField } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { useApiQuery } from "@/hooks/useApiQuery"
import { addCustomTask, deleteCompletedCustomTasks, deleteCustomTask, getCustomTasks, reorderCustomTasks, toggleCustomTask } from "@/lib/api/endpoints/activity"
import { MenuRow } from "@/components/features/posts/PostMenuSheet"
import TaskList from "./TaskList"

import type { CustomTask } from "@/types/models"

const MAX_TITLE_LENGTH:number = 100

interface CustomTasksCardProps {
    onTaskAdded:() => void // Completes The "Add A Custom Task" Challenge
}

export default function CustomTasksCard({ onTaskAdded }:CustomTasksCardProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { state, refetch, setData } = useApiQuery("custom_tasks", (signal:AbortSignal) => getCustomTasks(signal))
    const [new_title, setNewTitle] = useState<string>("")
    const [is_adding, setIsAdding] = useState<boolean>(false)
    const [menu_task, setMenuTask] = useState<CustomTask|null>(null)

    const tasks:CustomTask[] = state.data?.custom_tasks ?? []
    const completed_ids:number[] = tasks.filter((task:CustomTask) => task.is_completed).map((task:CustomTask) => task.id)

    const setTasks = (updater:(previous:CustomTask[]) => CustomTask[]):void => setData((previous) => previous ? { ...previous, custom_tasks: updater(previous.custom_tasks) } : previous)

    // Function For Add A Task
    const add = async ():Promise<void> => {
        const title:string = new_title.trim() // Gets The Title
        if(!title) return

        setIsAdding(true)
        const response = await addCustomTask(title) // Sends The Request
        setIsAdding(false)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.light()
        setNewTitle("")
        setTasks((previous:CustomTask[]) => [response.data.custom_task, ...previous])
        onTaskAdded()
    }

    // Function For Check / Uncheck (Optimistic)
    const toggle = async (task:CustomTask):Promise<void> => {
        haptics.selection()
        setTasks((previous:CustomTask[]) => previous.map((one_task:CustomTask) => one_task.id === task.id ? { ...one_task, is_completed: !task.is_completed } : one_task))

        const response = await toggleCustomTask(task.id) // Sends The Request

        if(!response.ok) {
            setTasks((previous:CustomTask[]) => previous.map((one_task:CustomTask) => one_task.id === task.id ? { ...one_task, is_completed: task.is_completed } : one_task))
            showAlert(t("Chyba"), response.error.message)
        }
    }

    // Function For Save A New Order (Optimistic)
    const saveOrder = async (ordered:CustomTask[]):Promise<void> => {
        const previous_tasks:CustomTask[] = tasks // Stores The Order For Rollback
        setTasks(() => ordered.map((task:CustomTask, index:number) => ({ ...task, order: index })))

        const response = await reorderCustomTasks(ordered.map((task:CustomTask) => task.id)) // Sends The Request

        if(!response.ok) {
            setTasks(() => previous_tasks)
            showAlert(t("Chyba"), response.error.message)
        }
    }

    // Function For Move A Task One Place Up Or Down
    const move = (task:CustomTask, direction:-1|1):void => {
        const index:number = tasks.findIndex((one_task:CustomTask) => one_task.id === task.id)
        const target:number = index + direction
        if(index < 0 || target < 0 || target >= tasks.length) return

        const ordered:CustomTask[] = [...tasks]
        const [moved] = ordered.splice(index, 1)
        if(moved) ordered.splice(target, 0, moved)
        saveOrder(ordered)
    }

    // Function For Delete One Task
    const remove = async (task:CustomTask):Promise<void> => {
        setMenuTask(null)
        const response = await deleteCustomTask(task.id) // Sends The Request

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        setTasks((previous:CustomTask[]) => previous.filter((one_task:CustomTask) => one_task.id !== task.id))
    }

    // Function For Delete All Checked Tasks
    const removeCompleted = async ():Promise<void> => {
        const is_confirmed:boolean = await confirmAction({ title: t("Vymazať dokončené úlohy?"), message: t("Počet: {{count}}", { count: completed_ids.length }), confirm_label: t("Vymazať"), is_destructive: true })
        if(!is_confirmed) return

        const response = await deleteCompletedCustomTasks(completed_ids) // Sends The Request

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.light()
        setTasks((previous:CustomTask[]) => previous.filter((task:CustomTask) => !completed_ids.includes(task.id)))
    }

    // Function For Render One Task
    const renderTask = ({ item, index, drag, is_dragging }:{ item:CustomTask, index:number, drag?:() => void, is_dragging:boolean }) => {
        return (
                <View style={[styles.task, is_dragging ? styles.task_dragging : null]}>
                    <Pressable
                        onPress={() => toggle(item)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.is_completed }}
                        accessibilityLabel={item.title}
                        accessibilityActions={[...(index > 0 ? [{ name: "move_up", label: t("Posunúť vyššie") }] : []), ...(index < tasks.length - 1 ? [{ name: "move_down", label: t("Posunúť nižšie") }] : [])]}
                        onAccessibilityAction={(event) => move(item, event.nativeEvent.actionName === "move_up" ? -1 : 1)}
                        style={({ pressed }:PressableStateCallbackType) => [styles.task_main, pressed ? styles.pressed : null]}
                    >
                        <View style={[styles.checkbox, item.is_completed ? styles.checkbox_checked : null]}>
                            {item.is_completed && <Icon name="check" size={11} color="on_primary" />}
                        </View>

                        <Text variant="body" color={item.is_completed ? "text_muted" : "text"} style={[styles.flex, item.is_completed ? styles.strike : null]}>{item.title}</Text>
                    </Pressable>

                    {tasks.length > 1 && drag && (
                        <Pressable onLongPress={drag} delayLongPress={120} disabled={is_dragging} hitSlop={6} accessibilityElementsHidden importantForAccessibility="no" style={styles.handle}>
                            <Icon name="grip-vertical" size={13} color="text_muted" />
                        </Pressable>
                    )}

                    <IconButton icon="ellipsis" accessibility_label={t("Možnosti úlohy")} onPress={() => setMenuTask(item)} variant="plain" size={32} />
                </View>
        )
    }

    const menu_index:number = menu_task ? tasks.findIndex((task:CustomTask) => task.id === menu_task.id) : -1

    return (
        <Card padding="lg" style={styles.card}>
            <View style={styles.header}>
                <Text variant="heading" accessibilityRole="header" style={styles.flex}>{t("Moje úlohy")}</Text>
                {completed_ids.length > 0 && <Button label={t("Vymazať dokončené")} variant="ghost" size="sm" onPress={removeCompleted} />}
            </View>

            <View style={styles.add_row}>
                <TextField
                    placeholder={t("Pridať úlohu")}
                    accessibilityLabel={t("Nová úloha")}
                    value={new_title}
                    onChangeText={setNewTitle}
                    maxLength={MAX_TITLE_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={add}
                    submitBehavior="submit"
                    container_style={styles.flex}
                />

                <IconButton icon="plus" accessibility_label={t("Pridať úlohu")} onPress={add} variant="solid" size={48} is_disabled={!new_title.trim() || is_adding} />
            </View>

            {state.status === "loading" ? (
                <View style={styles.skeletons}>{[0, 1].map((index:number) => <Skeleton key={index} height={44} radius={radii.md} />)}</View>
            ) : state.status === "error" && tasks.length === 0 ? (
                <ErrorState error={state.error} onRetry={refetch} />
            ) : tasks.length === 0 ? (
                <EmptyState icon="list-check" title={t("Žiadne úlohy")} message={t("Pridajte si napríklad pitný režim alebo strečing.")} is_compact />
            ) : (
                <TaskList tasks={tasks} renderTask={renderTask} onReorder={saveOrder} />
            )}

            <Sheet visible={menu_task !== null} onClose={() => setMenuTask(null)} title={menu_task?.title ?? ""}>
                {menu_task && (
                    <View style={styles.menu}>
                        <MenuRow icon={menu_task.is_completed ? "rotate-left" : "check"} label={menu_task.is_completed ? t("Označiť ako nesplnené") : t("Označiť ako splnené")} onPress={() => { toggle(menu_task); setMenuTask(null) }} />
                        {menu_index > 0 && <MenuRow icon="arrow-up" label={t("Posunúť vyššie")} onPress={() => { move(menu_task, -1); setMenuTask(null) }} />}
                        {menu_index >= 0 && menu_index < tasks.length - 1 && <MenuRow icon="arrow-down" label={t("Posunúť nižšie")} onPress={() => { move(menu_task, 1); setMenuTask(null) }} />}
                        <MenuRow icon="trash-can" label={t("Odstrániť")} onPress={() => remove(menu_task)} is_danger />
                    </View>
                )}
            </Sheet>
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
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    add_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    skeletons: {
        gap: spacing.sm,
    },

    task: {
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
    },

    task_dragging: {
        backgroundColor: colors.surface_raised,
        borderWidth: 1,
        borderColor: colors.border_strong,
    },

    task_main: {
        flex: 1,
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.xs,
    },

    pressed: {
        opacity: 0.7,
    },

    checkbox: {
        width: 22,
        height: 22,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: colors.border_strong,
        borderRadius: radii.sm,
    },

    checkbox_checked: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },

    strike: {
        textDecorationLine: "line-through",
    },

    handle: {
        width: 28,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },

    menu: {
        gap: spacing.xs,
    },
})
