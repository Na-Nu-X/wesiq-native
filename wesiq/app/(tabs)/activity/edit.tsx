// Edit Training Plans (List Of Own Plans → Editor)

import { useState } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { EmptyState, ErrorState, Header, Screen, Skeleton } from "@/components/ui"
import { radii } from "@/theme"
import TrainingPlanEditor from "@/components/features/training-plan/TrainingPlanEditor"
import PlanCard from "@/components/features/training-plan/PlanCard"
import SignInRequired from "@/components/features/training-plan/SignInRequired"
import { draftFromRows, PlanSummary } from "@/components/features/training-plan/model"
import { getTakenDays, useMyPlans } from "@/components/features/training-plan/usePlans"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"

import type { TrainingPlanExercise } from "@/types/models"

export default function EditTrainingPlansScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const { state, plans, refetch, is_refreshing } = useMyPlans(logged_in_user !== null) // Loads The Plans
    const [selected_key, setSelectedKey] = useState<string|null>(null) // Stores The Plan Being Edited

    if(!logged_in_user) return <SignInRequired />

    const selected_plan:PlanSummary<TrainingPlanExercise>|undefined = plans.find((plan) => plan.key === selected_key) // Gets The Selected Plan

    if(selected_plan) {
        return (
            <TrainingPlanEditor
                key={selected_plan.key}
                mode="edit"
                initial_draft={draftFromRows(selected_plan.rows, "edit")}
                taken_days={getTakenDays(plans, selected_plan.key)}
                onBack={() => setSelectedKey(null)}
                onSaved={() => setSelectedKey(null)}
                onDeleted={() => setSelectedKey(null)}
            />
        )
    }

    return (
        <Screen
            header={<Header title={t("Moje plány")} subtitle={t("Vyberte plán, ktorý chcete upraviť")} is_large />}
            refresh={{ is_refreshing, onRefresh: refetch }}
        >
            {state.status === "loading" && [0, 1, 2].map((index:number) => <Skeleton key={index} height={132} radius={radii.lg} />)}
            {state.status === "error" && <ErrorState error={state.error} onRetry={refetch} />}

            {state.status === "success" && plans.length === 0 && (
                <EmptyState
                    icon="clipboard-list"
                    title={t("Zatiaľ nemáte žiadny plán")}
                    message={t("Vytvorte si vlastný plán alebo skopírujte niektorý z našich.")}
                    action={{ label: t("Nový plán"), onPress: () => router.navigate("/activity/new") }}
                />
            )}

            {plans.map((plan) => (
                <PlanCard key={plan.key} plan={plan} action_label={t("Upraviť")} action_icon="pen" onPress={() => setSelectedKey(plan.key)} />
            ))}
        </Screen>
    )
}

