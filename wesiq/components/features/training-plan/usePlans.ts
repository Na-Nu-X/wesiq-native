// Hooks For Loading Training Plans (Reload Automatically When A Plan Is Saved Or Deleted Anywhere)

import { useEffect, useMemo } from "react"
import { useApiQuery } from "@/hooks/useApiQuery"
import { onAppEvent } from "@/lib/events"
import { getOfficialTrainingPlans, getTrainingPlans } from "@/lib/api/endpoints/trainingPlans"
import { groupPlans, PlanSummary, sortPlans } from "./model"

import type { Day, OfficialTrainingPlanExercise, TrainingPlanExercise } from "@/types/models"

// Hook For The Logged In User's Plans
export function useMyPlans(is_enabled:boolean = true) {
    const query = useApiQuery("my_training_plans", (signal:AbortSignal) => getTrainingPlans(signal), { is_enabled })
    const { refetch } = query

    // Initializes The Reload When Plans Change
    useEffect(() => onAppEvent("training_plans_changed", () => { refetch() }), [refetch])

    const plans:PlanSummary<TrainingPlanExercise>[] = useMemo(() => sortPlans(groupPlans(query.state.data?.training_plans ?? [])), [query.state.data])
    return { ...query, plans }
}

// Hook For The Official Plans
export function useOfficialPlans() {
    const query = useApiQuery("official_training_plans", (signal:AbortSignal) => getOfficialTrainingPlans(signal))
    const plans:PlanSummary<OfficialTrainingPlanExercise>[] = useMemo(() => groupPlans(query.state.data?.official_training_plans ?? []), [query.state.data])
    return { ...query, plans }
}

// Function For Get The Days Used By Plans (Optionally Ignoring One Plan, E.g. The One Being Edited)
export const getTakenDays = (plans:readonly PlanSummary[], except_key:string|null = null):Map<Day, string> => {
    const taken:Map<Day, string> = new Map()

    plans.forEach((plan:PlanSummary) => {
        if(plan.day !== null && plan.key !== except_key && !taken.has(plan.day)) taken.set(plan.day, plan.title)
    })

    return taken
}
