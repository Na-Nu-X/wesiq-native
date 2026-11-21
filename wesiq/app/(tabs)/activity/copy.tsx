// Copy An Official Training Plan (List → Editor Prefilled With The Plan)

import { useState } from "react"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Card, Chip, EmptyState, ErrorState, Header, Screen, Skeleton, Text } from "@/components/ui"
import { radii } from "@/theme"
import TrainingPlanEditor from "@/components/features/training-plan/TrainingPlanEditor"
import PlanCard from "@/components/features/training-plan/PlanCard"
import SignInRequired from "@/components/features/training-plan/SignInRequired"
import { draftFromRows, PlanSummary } from "@/components/features/training-plan/model"
import { getTakenDays, useMyPlans, useOfficialPlans } from "@/components/features/training-plan/usePlans"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"

import type { OfficialTrainingPlanExercise } from "@/types/models"
import { View } from "react-native"

export default function CopyTrainingPlanScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const { state, plans, refetch, is_refreshing } = useOfficialPlans() // Loads The Official Plans
    const { plans: my_plans } = useMyPlans(logged_in_user !== null) // Loads Own Plans (For Days Already In Use)
    const [selected_key, setSelectedKey] = useState<string|null>(null) // Stores The Plan Being Copied

    const selected_plan:PlanSummary<OfficialTrainingPlanExercise>|undefined = plans.find((plan) => plan.key === selected_key) // Gets The Selected Plan

    const renderPlan = (plan:PlanSummary<OfficialTrainingPlanExercise>) => {
        const first_row:OfficialTrainingPlanExercise|undefined = plan.rows[0]
        const is_for_subscribers:boolean = first_row?.is_for_subscribers === true
        const is_locked:boolean = first_row?.is_locked === true
    
        // Locked Plan
        if(is_locked) {
            return (
                <Card
                    key={plan.key}
                    padding="lg"
                    onPress={() => router.push("/subscribe")}
                    accessibility_label={t("Prémiový plán: {{title}}", { title: plan.title })}
                    style={{ gap: 16 }}
                >
                    <View>
                        <Text variant="heading" numberOfLines={1}>{plan.title}</Text>
                        <Text variant="caption" color="text_secondary">{t("Dostupné s aktívnym predplatným")}</Text>
                    </View>

                    <View style={{ alignItems: "center" }}>
                        <Chip 
                            label={t("Prémiový plán")} 
                            icon="lock" 
                            
                            style={{ 
                                flexDirection: "column",
                                paddingVertical: 10,
                                paddingHorizontal: 20,
                            }}
                        />
                    </View>
                </Card>
            )
        }
    
        // Plan
        return (
            <PlanCard 
                key={plan.key} 
                plan={plan} 
                action_label={t("Použiť tento plán")} 
                action_icon="copy" 
                onPress={() => setSelectedKey(plan.key)} 
                is_subscriber_plan={is_for_subscribers}
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

    return (
        <Screen
            header={<Header title={t("Hotové plány")} subtitle={t("Skopírujte plán a upravte si ho podľa seba")} is_large />}
            refresh={{ is_refreshing, onRefresh: refetch }}
        >
            {state.status === "loading" && [0, 1, 2].map((index:number) => <Skeleton key={index} height={132} radius={radii.lg} />)}
            {state.status === "error" && <ErrorState error={state.error} onRetry={refetch} />}
            {state.status === "success" && plans.length === 0 && <EmptyState icon="clipboard-list" title={t("Žiadne plány")} />}

            {plans.map((plan) => (renderPlan(plan)))}
        </Screen>
    )
}
