// Training Plan Endpoints

import { apiGet, apiPost } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isBoolean, isNumber, isRecord, isString } from "@/lib/api/guards"

import type { ApiEnvelope, ApiResult } from "@/types/api"
import type { Exercise, OfficialTrainingPlanExercise, TrainingPlanExercise } from "@/types/models"
import type { ManageTrainingPlanRow } from "@/components/features/training-plan/model"

const UNITS:readonly string[] = ["reps", "seconds", "steps"]

// Checks The Fields The Editor Relies On
const isPlanRowLike = (value:unknown):boolean => {
    return isRecord(value)
        && isString(value.training_plan_key)
        && isString(value.exercise)
        && isNumber(value.order)
        && typeof value.is_warm_up === "boolean"
        && typeof value.unit === "string" && UNITS.includes(value.unit)
        && isArrayOf(value.periods, isNumber)
}

const isTrainingPlanRow = (value:unknown):value is TrainingPlanExercise => isPlanRowLike(value)

// Official Rows Can Be Locked (For Subscribers Only) - The Server Then Sends The Content Fields As Null
const isOfficialRow = (value:unknown):value is OfficialTrainingPlanExercise => {
    if (!isRecord(value) || !isString(value.training_plan_key) || !isBoolean(value.is_for_subscribers) || !isBoolean(value.is_locked)) return false
    if (!value.is_locked) return isPlanRowLike(value)

    return (value.exercise === null || isString(value.exercise))
        && (value.order === null || isNumber(value.order))
        && (value.is_warm_up === null || isBoolean(value.is_warm_up))
        && (value.unit === null || (typeof value.unit === "string" && UNITS.includes(value.unit)))
        && (value.periods === null || isArrayOf(value.periods, isNumber))
}
const isExercise = (value:unknown):value is Exercise => isRecord(value) && isNumber(value.id) && isString(value.exercise) && typeof value.unit === "string" && UNITS.includes(value.unit)

export const getTrainingPlans = (signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { training_plans:TrainingPlanExercise[] }>> => {
    return apiGet("get-training-plans/", { signal, guard: envelopeWith({ training_plans: (value:unknown):value is TrainingPlanExercise[] => isArrayOf(value, isTrainingPlanRow) }) })
}

export const getOfficialTrainingPlans = (signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { official_training_plans:OfficialTrainingPlanExercise[] }>> => {
    return apiGet("get-official-training-plans/", { signal, guard: envelopeWith({ official_training_plans: (value:unknown):value is OfficialTrainingPlanExercise[] => isArrayOf(value, isOfficialRow) }) })
}

export const getExerciseLibrary = (signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { exercises:Exercise[] }>> => {
    return apiGet("get-exercises/", { signal, guard: envelopeWith({ exercises: (value:unknown):value is Exercise[] => isArrayOf(value, isExercise) }) })
}

// Creates Or Replaces A Plan ("edited_training_plan" Rows Delete The Previous Rows Of The Key First)
export const saveTrainingPlan = (rows:ManageTrainingPlanRow[]):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("manage-training-plan/", rows)
}

export const deleteTrainingPlan = (training_plan_key:string):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("manage-training-plan/", [{ action: "delete_training_plan", training_plan_key }])
}
