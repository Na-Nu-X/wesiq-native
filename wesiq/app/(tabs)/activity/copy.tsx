// Copy An Official Training Plan (List → Editor Prefilled With The Plan)

import { useState } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { EmptyState, ErrorState, Header, Screen, Skeleton } from "@/components/ui"
import { radii } from "@/theme"
import TrainingPlanEditor from "@/components/features/training-plan/TrainingPlanEditor"
import PlanCard from "@/components/features/training-plan/PlanCard"
import SignInRequired from "@/components/features/training-plan/SignInRequired"
import { draftFromRows, PlanSummary } from "@/components/features/training-plan/model"
import { getTakenDays, useMyPlans, useOfficialPlans } from "@/components/features/training-plan/usePlans"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"

import type { OfficialTrainingPlanExercise } from "@/types/models"

export default function CopyTrainingPlanScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const { state, plans, refetch, is_refreshing } = useOfficialPlans() // Loads The Official Plans
    const { plans: my_plans } = useMyPlans(logged_in_user !== null) // Loads Own Plans (For Days Already In Use)
    const [selected_key, setSelectedKey] = useState<string|null>(null) // Stores The Plan Being Copied

    const selected_plan:PlanSummary<OfficialTrainingPlanExercise>|undefined = plans.find((plan) => plan.key === selected_key) // Gets The Selected Plan

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

    return (
        <Screen
            header={<Header title={t("Hotové plány")} subtitle={t("Skopírujte plán a upravte si ho podľa seba")} is_large />}
            refresh={{ is_refreshing, onRefresh: refetch }}
        >
            {state.status === "loading" && [0, 1, 2].map((index:number) => <Skeleton key={index} height={132} radius={radii.lg} />)}
            {state.status === "error" && <ErrorState error={state.error} onRetry={refetch} />}
            {state.status === "success" && plans.length === 0 && <EmptyState icon="clipboard-list" title={t("Žiadne plány")} />}

            {plans.map((plan) => (
                <PlanCard key={plan.key} plan={plan} action_label={t("Použiť tento plán")} action_icon="copy" onPress={() => setSelectedKey(plan.key)} />
            ))}
        </Screen>
    )
}
