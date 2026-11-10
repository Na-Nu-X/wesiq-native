// Exercise Library: Search, Filter By Category And Add Exercises With One Tap (The Sheet Stays Open)

import { useMemo, useState } from "react"
import { FlatList, ListRenderItemInfo, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"
import { Button, Chip, Divider, EmptyState, ErrorState, Icon, Sheet, Skeleton, Text, TextField } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { getExerciseImageUrl } from "@/lib/media"
import { useApiQuery } from "@/hooks/useApiQuery"
import { getExerciseLibrary } from "@/lib/api/endpoints/trainingPlans"
import { useUnitLabels } from "./ExerciseCard"

import type { Exercise } from "@/types/models"

interface ExerciseLibrarySheetProps {
    visible:boolean,
    onClose:() => void,
    onAddExercise:(exercise:Exercise) => void,
    onAddCustom:() => void,
    onAddWarmUp:(() => void)|null, // Null When The Plan Already Has A Warm Up
    added_counts:ReadonlyMap<number, number>, // Library ID → How Many Times It's In The Plan
    can_add:boolean // False When The Plan Is Full
}

export default function ExerciseLibrarySheet({ visible, onClose, onAddExercise, onAddCustom, onAddWarmUp, added_counts, can_add }:ExerciseLibrarySheetProps) {
    const { t } = useTranslation() // Initializes The Translations
    const unit_labels = useUnitLabels() // Gets The Unit Labels
    const [query, setQuery] = useState<string>("") // Stores The Search Query
    const [category, setCategory] = useState<string|null>(null) // Stores The Category Filter
    const [added_in_session, setAddedInSession] = useState<number>(0) // Counts Exercises Added Since Opening

    // Resets The Session Counter Every Time The Sheet Opens (Adjusted During Render)
    const [was_visible, setWasVisible] = useState<boolean>(visible)

    if(visible !== was_visible) {
        setWasVisible(visible)
        if(visible) setAddedInSession(0)
    }

    const { state, refetch } = useApiQuery("exercise_library", (signal:AbortSignal) => getExerciseLibrary(signal), { is_enabled: visible })
    const exercises:Exercise[] = useMemo(() => state.data?.exercises ?? [], [state.data])

    const categories:string[] = useMemo(() => [...new Set(exercises.flatMap((exercise:Exercise) => exercise.categories))].sort(), [exercises]) // Gets All Categories
    const normalized_query:string = query.trim().toLowerCase() // Gets The Query

    const filtered:Exercise[] = exercises.filter((exercise:Exercise) =>
        (!category || exercise.categories.includes(category)) &&
        (!normalized_query || exercise.exercise.toLowerCase().includes(normalized_query))
    )

    // Function For Add And Count
    const add = (callback:() => void):void => {
        if(!can_add) return

        haptics.selection()
        callback()
        setAddedInSession((previous:number) => previous + 1)
    }

    // Function For Render One Exercise
    const renderExercise = ({ item }:ListRenderItemInfo<Exercise>) => {
        const added:number = added_counts.get(item.id) ?? 0 // Gets How Many Times It's Added
        const image_url:string|null = getExerciseImageUrl(item.image_filename) // Gets The Image

        return (
            <Pressable
                onPress={() => add(() => onAddExercise(item))}
                disabled={!can_add}
                accessibilityRole="button"
                accessibilityLabel={`${t("Pridať")}: ${item.exercise}`}
                accessibilityHint={added > 0 ? t("V pláne: {{count}}×", { count: added }) : undefined}
                style={({ pressed }) => [styles.row, pressed ? styles.row_pressed : null]}
            >
                <View style={styles.thumbnail}>
                    {image_url ? <Image source={{ uri: image_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name="dumbbell" size={14} color="primary" />}
                </View>

                <View style={styles.flex}>
                    <Text variant="body_strong" numberOfLines={1}>{item.exercise}</Text>
                    <Text variant="caption" color="text_muted" numberOfLines={1}>{[unit_labels.name(item.unit), ...item.categories].join(" · ")}</Text>
                </View>

                {added > 0 ? (
                    <View style={styles.added_badge}>
                        <Icon name="check" size={10} color="success" />
                        <Text variant="caption" color="success" is_tabular>{added}×</Text>
                    </View>
                ) : (
                    <Icon name="plus" size={16} color="primary" />
                )}
            </Pressable>
        )
    }

    // Function For Render The List Content When It Has No Rows
    const renderEmpty = () => {
        if(state.status === "loading") return <View style={styles.skeletons}>{[0, 1, 2, 3].map((index:number) => <Skeleton key={index} height={44} radius={radii.md} />)}</View>
        if(state.status === "error") return <ErrorState error={state.error} onRetry={refetch} is_compact />
        return <EmptyState icon="magnifying-glass" title={t("Žiadny cvik sa nenašiel")} message={t("Pridajte ho ako vlastný cvik.")} action={{ label: t("Vlastný cvik"), onPress: () => add(onAddCustom) }} is_compact />
    }

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            title={t("Pridať cvik")}
            subtitle={can_add ? undefined : t("Plán má maximálny počet cvikov.")}
            size="large"
            is_scrollable={false}
            footer={<Button label={added_in_session > 0 ? t("Hotovo ({{count}} pridané)", { count: added_in_session }) : t("Hotovo")} onPress={onClose} is_full_width />}
        >
            <View style={styles.top}>
                <View style={styles.quick_row}>
                    <Pressable onPress={() => add(onAddCustom)} disabled={!can_add} accessibilityRole="button" style={({ pressed }) => [styles.quick, pressed ? styles.row_pressed : null]}>
                        <Icon name="pen" size={14} color="primary" />
                        <Text variant="label">{t("Vlastný cvik")}</Text>
                    </Pressable>

                    {onAddWarmUp && (
                        <Pressable onPress={() => add(onAddWarmUp)} accessibilityRole="button" style={({ pressed }) => [styles.quick, pressed ? styles.row_pressed : null]}>
                            <Icon name="fire" size={14} color="warning" />
                            <Text variant="label">{t("Rozcvička")}</Text>
                        </Pressable>
                    )}
                </View>

                <TextField
                    icon="magnifying-glass"
                    placeholder={t("Hľadať cvik")}
                    accessibilityLabel={t("Hľadať cvik")}
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                    returnKeyType="search"
                />

                {categories.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories} keyboardShouldPersistTaps="handled">
                        <Chip label={t("Všetky")} is_selected={category === null} onPress={() => setCategory(null)} />
                        {categories.map((one_category:string) => (
                            <Chip key={one_category} label={t(one_category)} is_selected={category === one_category} onPress={() => setCategory(category === one_category ? null : one_category)} />
                        ))}
                    </ScrollView>
                )}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={(exercise:Exercise) => String(exercise.id)}
                renderItem={renderExercise}
                ItemSeparatorComponent={() => <Divider inset={56} />}
                ListEmptyComponent={renderEmpty}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                style={styles.flex}
                contentContainerStyle={styles.list_content}
                initialNumToRender={16}
            />
        </Sheet>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    top: {
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.sm,
    },

    quick_row: {
        flexDirection: "row",
        gap: spacing.sm,
    },

    quick: {
        flex: 1,
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        backgroundColor: colors.surface_raised,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
    },

    categories: {
        gap: spacing.sm,
        paddingRight: spacing.xl,
    },

    list_content: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
    },

    skeletons: {
        gap: spacing.sm,
        paddingTop: spacing.sm,
    },

    row: {
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
        marginHorizontal: -spacing.xs,
        borderRadius: radii.md,
    },

    row_pressed: {
        backgroundColor: colors.surface_pressed,
    },

    thumbnail: {
        width: 40,
        height: 40,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary_soft,
        borderRadius: radii.sm,
    },

    added_badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        backgroundColor: colors.success_soft,
        borderRadius: radii.pill,
    },
})
