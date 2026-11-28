// Activity Endpoints (Recorded Workouts, Statistics, XP Boost, Daily Challenges And Custom Tasks)

import { apiGet, apiPost } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isBoolean, isNumber, isRecord, isString } from "@/lib/api/guards"

import type { ApiEnvelope, ApiResult } from "@/types/api"
import type { Activity, ActivitySummaryExercise, CustomTask, OfficialTask } from "@/types/models"

// ---------- Statistics And History ----------

export interface ActivityStats {
    latest_activity:Activity|null,
    longest_activity:Activity|null,
    average_activity_time:number, // Seconds, Last 7 Days
    average_activity_time_formatted:string,
    activities_amount:number // Last 7 Days
}

// Function For Check If Activity
const isActivity = (value:unknown):value is Activity => isRecord(value) && isString(value.end_time) && isNumber(value.elapsed_time) && isNumber(value.gained_xp)

// Function For Get The Activity Stats
export const getActivityStats = (signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { activity:ActivityStats }>> => {
    return apiGet("get-activity/", { signal, guard: envelopeWith({ activity: (value:unknown):value is ActivityStats => isRecord(value) && isNumber(value.activities_amount) }) })
}

// Function For Get The Activity History
export const getActivityHistory = (signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { activity_history:Activity[] }>> => {
    return apiGet("get-activity-history/", { signal, guard: envelopeWith({ activity_history: (value:unknown):value is Activity[] => isArrayOf(value, isActivity) }) })
}

export interface NewActivity {
    elapsed_time:number, // Milliseconds (The Server Converts To Seconds)
    gained_xp:number,
    type:string|null, // Plan Title
    day:number|null,
    training_plan_summary:ActivitySummaryExercise[]|null // Elapsed Time In Seconds Per Exercise
}

// Function For Record The Activity
export const recordActivity = (new_activity_data:NewActivity):Promise<ApiResult<ApiEnvelope>> => apiPost("new-activity/", { new_activity_data })

// ---------- XP Boost (30 Minutes Of Double XP, Once A Day) ----------

export interface XpBoostState {
    xp_boost_expiration_time:string|null,
    is_xp_boost_available:boolean,
    is_xp_boost_active:boolean
}

// Function For Get The XP Boost
export const getXpBoost = (signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & XpBoostState>> => {
    return apiGet("get-xp-boost/", { signal, guard: envelopeWith({ is_xp_boost_available: isBoolean, is_xp_boost_active: isBoolean }) as (value:unknown) => value is ApiEnvelope & XpBoostState })
}

// The Server Uses GET For Activating The Boost
// Function For Activate XP Boost
export const activateXpBoost = ():Promise<ApiResult<ApiEnvelope & { xp_boost_expiration_time:string }>> => {
    return apiGet("use-xp-boost/", { guard: envelopeWith({ xp_boost_expiration_time: isString }) })
}

// ---------- Daily Challenges ----------

// Function For Get The Official Tasks
export const getOfficialTasks = (signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { official_tasks:OfficialTask[], official_tasks_remaining_hours:number }>> => {
    return apiGet("get-official-tasks/", {
        signal,
        guard: envelopeWith({ official_tasks: (value:unknown):value is OfficialTask[] => isArrayOf(value, (task:unknown):task is OfficialTask => isRecord(task) && isString(task.data)), official_tasks_remaining_hours: isNumber }),
    })
}

export interface CompletedOfficialTask {
    progress_percentage:number,
    is_completed:boolean,
    first_completion:boolean,
    gained_xp:number
}

// Function For Complete Official Task
export const completeOfficialTask = (task_data:string):Promise<ApiResult<ApiEnvelope & { task:CompletedOfficialTask }>> => {
    return apiPost("complete-official-task/", { task_data }, { guard: envelopeWith({ task: (value:unknown):value is CompletedOfficialTask => isRecord(value) && isNumber(value.progress_percentage) }) })
}

// ---------- Custom Tasks ----------

// Function For Check If Custom Task
const isCustomTask = (value:unknown):value is CustomTask => isRecord(value) && isNumber(value.id) && isString(value.title)

// Function For Get The Custom Tasks
export const getCustomTasks = (signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { custom_tasks:CustomTask[] }>> => {
    return apiGet("get-custom-tasks/", { signal, guard: envelopeWith({ custom_tasks: (value:unknown):value is CustomTask[] => isArrayOf(value, isCustomTask) }) })
}

// Function For Add The Custom Task
export const addCustomTask = (custom_task_title:string):Promise<ApiResult<ApiEnvelope & { custom_task:CustomTask }>> => {
    return apiPost("add-custom-task/", { custom_task_title }, { guard: envelopeWith({ custom_task: isCustomTask }) })
}

// Function For Toggle The Custom Task
export const toggleCustomTask = (task_id:number) => apiPost("toggle-complete-custom-task/", { task_id })
// Function For Delete The Custom Task
export const deleteCustomTask = (task_id:number) => apiPost("delete-custom-task/", { task_id })
// Function For Delete The Completed Custom Tasks
export const deleteCompletedCustomTasks = (completed_custom_tasks_ids:number[]) => apiPost("delete-completed-custom-tasks/", { completed_custom_tasks_ids })
// Function For Reorder Custom Tasks
export const reorderCustomTasks = (tasks_ids:number[]) => apiPost("change-custom-tasks-order/", { tasks_ids })
