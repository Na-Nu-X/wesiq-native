// Copy An Official Training Plan (List With Search, Sorting And Categories → Editor Prefilled With The Plan)

import { useState } from "react"
import { FlatList, ListRenderItemInfo, ScrollView, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Chip, EmptyState, ErrorState, Header, Screen, Skeleton, Text, TextField, ThemedRefreshControl } from "@/components/ui"
import { layout, radii, spacing } from "@/theme"
import TrainingPlanEditor from "@/components/features/training-plan/TrainingPlanEditor"
import PlanCard from "@/components/features/training-plan/PlanCard"
import LockedPlanCard from "@/components/features/training-plan/LockedPlanCard"
import SignInRequired from "@/components/features/training-plan/SignInRequired"
import OfficialPlanDetails, { getOfficialPlanDetailsLabel } from "@/components/features/training-plan/OfficialPlanDetails"
import { useOfficialPlanLabels } from "@/components/features/training-plan/useOfficialPlanLabels"
import { draftFromRows, getOfficialPlanTags, isOfficialPlanInCategory, isOfficialPlanMatchingQuery, OfficialPlanSort, PlanSummary, sortOfficialPlans } from "@/components/features/training-plan/model"
import { getTakenDays, useMyPlans, useOfficialPlans } from "@/components/features/training-plan/usePlans"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"

import type { OfficialTrainingPlanExercise } from "@/types/models"

type OfficialPlan = PlanSummary<OfficialTrainingPlanExercise>

const CATEGORIES:readonly string[] = ["all", "gym", "calisthenics", "full_body", "chest", "core", "push", "pull", "legs", "back", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "forearms", "hypertrophy", "strength"] // Matched Against The Plan's Goal And Target Muscles
const SORTS:readonly OfficialPlanSort[] = ["default", "duration", "difficulty", "for_subscribers"]

export default function CopyTrainingPlanScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const { state, plans, refetch, is_refreshing } = useOfficialPlans() // Loads The Official Plans
    const { plans: my_plans } = useMyPlans(logged_in_user !== null) // Loads Own Plans (For Days Already In Use)
    const [selected_key, setSelectedKey] = useState<string|null>(null) // Stores The Plan Being Copied
    const [sort, setSort] = useState<OfficialPlanSort>("default")
    const [category, setCategory] = useState<string>("all")
    const [search, setSearch] = useState<string>("")
    const { getTagLabel } = useOfficialPlanLabels() // Gets The Category Labels

    const selected_plan:OfficialPlan|undefined = plans.find((plan:OfficialPlan) => plan.key === selected_key) // Gets The Selected Plan

    const sort_labels:Record<OfficialPlanSort, string> = {
        default: t("Predvolené"),
        duration: t("Podľa dĺžky tréningu"),
        difficulty: t("Podľa náročnosti tréningu"),
        for_subscribers: t("Pre predplatiteľov"),
    }

    // Only Categories With At Least One Plan (Plus "All" And The Selected One, So The Selection Never Disappears)
    const used_tags:Set<string> = new Set(plans.flatMap((plan:OfficialPlan) => [...getOfficialPlanTags(plan)]))
    const visible_categories:string[] = CATEGORIES.filter((one_category:string) => one_category === "all" || one_category === category || used_tags.has(one_category))

    const query:string = search.trim().toLowerCase() // Gets The Query
    const visible_plans:OfficialPlan[] = sortOfficialPlans(plans.filter((plan:OfficialPlan) => isOfficialPlanInCategory(plan, category) && isOfficialPlanMatchingQuery(plan, query)), sort)
    const is_filtered:boolean = query !== "" || category !== "all" // Stores The Information If Any Filter Is Active

    // Function For Render One Plan (Locked Plans Lead To The Subscription Screen)
    const renderPlan = ({ item }:ListRenderItemInfo<OfficialPlan>) => {
        const first_row:OfficialTrainingPlanExercise|undefined = item.rows[0] // Gets The First Row (Every Row Of A Plan Shares The Flags)
        const details = <OfficialPlanDetails plan={item} /> // Description, Duration, Difficulty, Goal, Requirements And Muscles
        const details_label:string = getOfficialPlanDetailsLabel(item, t, getTagLabel) // Gets The Screen Reader Text Of The Details

        if(first_row?.is_locked) return <LockedPlanCard plan={item} details={details} details_label={details_label} onPress={() => router.push("/subscribe")} />

        return (
            <PlanCard
                plan={item}
                action_label={t("Použiť tento plán")}
                action_icon="copy"
                onPress={() => setSelectedKey(item.key)}
                is_subscriber_plan={first_row?.is_for_subscribers === true}
                details={details}
                details_label={details_label}
            />
        )
    }

    if(selected_plan) {
        if(!logged_in_user) return <SignInRequired />

        return (
            <TrainingPlanEditor
                key={selected_plan.key}
                mode="copy"
                initial_draft={draftFromRows(selected_plan.rows, "copy")}
                taken_days={getTakenDays(my_plans)}
                onBack={() => setSelectedKey(null)}

                onSaved={() => {
                    setSelectedKey(null)
                    router.navigate("/activity")
                }}
            />
        )
    }

    const list_header = (
        <View style={styles.list_header}>
            <TextField icon="magnifying-glass" placeholder={t("Hľadať plány")} accessibilityLabel={t("Hľadať plány")} value={search} onChangeText={setSearch} autoCorrect={false} returnKeyType="search" />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                {SORTS.map((one_sort:OfficialPlanSort) => <Chip key={one_sort} label={sort_labels[one_sort]} is_selected={sort === one_sort} onPress={() => setSort(one_sort)} />)}
            </ScrollView>

            {visible_categories.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                    {visible_categories.map((one_category:string) => <Chip key={one_category} label={getTagLabel(one_category)} is_selected={category === one_category} onPress={() => setCategory(one_category)} />)}
                </ScrollView>
            )}

            {state.status === "success" && <Text variant="caption" color="text_muted">{t("Plány: {{count}}", { count: visible_plans.length })}</Text>}
        </View>
    )

    return (
        <Screen is_scrollable={false} is_padded={false} header={<Header title={t("Hotové plány")} subtitle={t("Skopírujte plán a upravte si ho podľa seba")} is_large />}>
            <FlatList
                data={state.status === "success" ? visible_plans : []}
                keyExtractor={(plan:OfficialPlan) => plan.key}
                renderItem={renderPlan}
                ListHeaderComponent={list_header}
                refreshControl={<ThemedRefreshControl refreshing={is_refreshing} onRefresh={refetch} />}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.list_content}

                ListEmptyComponent={
                    state.status === "loading" ? <View style={styles.skeletons}>{[0, 1, 2].map((index:number) => <Skeleton key={index} height={132} radius={radii.lg} />)}</View>
                    : state.status === "error" ? <ErrorState error={state.error} onRetry={refetch} />
                    : <EmptyState icon="clipboard-list" title={is_filtered ? t("Nenašli sa žiadne plány.") : t("Žiadne plány")} message={query ? t("Skúste iné slovo.") : undefined} is_compact />
                }
            />
        </Screen>
    )
}

const styles = StyleSheet.create({
    list_content: {
        flexGrow: 1,
        gap: spacing.lg,
        paddingHorizontal: layout.screen_padding,
        paddingBottom: spacing.xxxl,
    },

    list_header: {
        gap: spacing.md,
    },

    chips: {
        gap: spacing.sm,
        paddingRight: spacing.lg,
    },

    skeletons: {
        gap: spacing.lg,
    },
})
