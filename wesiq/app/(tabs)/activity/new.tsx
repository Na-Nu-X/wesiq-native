// New Training Plan

import { useState } from "react"
import { router } from "expo-router"
import TrainingPlanEditor from "@/components/features/training-plan/TrainingPlanEditor"
import { EMPTY_DRAFT } from "@/components/features/training-plan/model"
import { getTakenDays, useMyPlans } from "@/components/features/training-plan/usePlans"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import SignInRequired from "@/components/features/training-plan/SignInRequired"

export default function NewTrainingPlanScreen() {
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const { plans } = useMyPlans(logged_in_user !== null) // Loads The Plans (For Days Already In Use)
    const [editor_instance, setEditorInstance] = useState<number>(0) // Remounts The Editor After Saving (The Tab Stays Mounted)

    if(!logged_in_user) return <SignInRequired />

    return (
        <TrainingPlanEditor
            key={editor_instance}
            mode="new"
            initial_draft={EMPTY_DRAFT}
            taken_days={getTakenDays(plans)}
            onBack={() => router.navigate("/activity")}

            onSaved={() => {
                setEditorInstance((previous:number) => previous + 1)
                router.navigate("/activity")
            }}
        />
    )
}
