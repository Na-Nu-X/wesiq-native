// Training Plan Editor Model (Draft Shape, Conversion From / To Server Rows, Validation)
//
// The Server Stores A Plan As One Row Per Exercise Sharing "training_plan_key"; "type" Holds The Plan Title
// And "periods" Holds The Value Of Every Set (E.g. [12, 12, 10] = 2 Sets Of 12 And 1 Set Of 10).
// The Editor Works With Grouped Sets ({ value:12, count:2 }, { value:10, count:1 }) Which Are Easier To Edit.

import { generateKey } from "@/utils/generateKey"

import type { Day, ExerciseUnit, OfficialTrainingPlanExercise, TrainingPlanExercise } from "@/types/models"

export type EditorMode = "new"|"edit"|"copy"

export interface SetGroup {
    value:number, // Reps, Seconds Or Steps Per Set
    count:number // Number Of Sets With This Value
}

export interface DraftExercise {
    local_id:string, // Stable Key For Lists And Drag & Drop
    library_id:number|null, // Exercise Library ID (Null For Custom Exercises)
    name:string,
    unit:ExerciseUnit,
    is_custom:boolean,
    sets:SetGroup[]
}

export interface PlanDraft {
    key:string|null, // Existing Plan Key (Edit Mode), Null For New Plans
    title:string,
    day:Day|null,
    warm_up_seconds:number|null, // Null = No Warm Up
    exercises:DraftExercise[]
}

// Limits
export const MAX_TITLE_LENGTH:number = 50 // Same As The Server Column
export const MAX_EXERCISE_NAME_LENGTH:number = 50
export const MAX_EXERCISES:number = 30
export const MAX_SETS_PER_EXERCISE:number = 20
export const DEFAULT_WARM_UP_SECONDS:number = 300
export const WARM_UP_NAME:string = "Warm Up" // Stored Name Of The Warm Up Row (Kept Identical To Existing Data)

// Value Steps And Ranges Per Unit
export const UNIT_RULES:Record<ExerciseUnit, { min:number, max:number, step:number, default_value:number, default_sets:number }> = {
    reps: { min: 1, max: 500, step: 1, default_value: 10, default_sets: 3 },
    seconds: { min: 5, max: 3600, step: 5, default_value: 30, default_sets: 3 },
    steps: { min: 100, max: 50000, step: 100, default_value: 1000, default_sets: 1 },
}

export const EMPTY_DRAFT:PlanDraft = { key: null, title: "", day: null, warm_up_seconds: null, exercises: [] }

// Function For Create A Local ID
export const createLocalId = ():string => `local_${generateKey(12)}`

// ---------- Sets ----------

// Function For Group Consecutive Equal Values ([12, 12, 10] → [{ 12 × 2 }, { 10 × 1 }])
export const groupSets = (periods:number[]):SetGroup[] => {
    return periods.reduce<SetGroup[]>((groups:SetGroup[], value:number) => {
        const last:SetGroup|undefined = groups[groups.length - 1] // Gets The Last Group

        if(last && last.value === value) last.count += 1
        else groups.push({ value, count: 1 })

        return groups
    }, [])
}

// Function For Expand Groups To Periods
export const expandSets = (groups:SetGroup[]):number[] => groups.flatMap((group:SetGroup) => Array.from({ length: group.count }, () => group.value))

// Function For Count All Sets Of An Exercise
export const countSets = (groups:SetGroup[]):number => groups.reduce((total:number, group:SetGroup) => total + group.count, 0)

// Function For Clamp A Value Into The Unit's Range (Also Fixes Invalid Server Data Like 0 Reps)
export const clampValue = (value:number, unit:ExerciseUnit):number => {
    const rules = UNIT_RULES[unit] // Gets The Rules
    return Math.min(rules.max, Math.max(rules.min, Number.isFinite(value) ? Math.round(value) : rules.default_value))
}

// Function For Create Default Sets For A Unit
export const createDefaultSets = (unit:ExerciseUnit):SetGroup[] => [{ value: UNIT_RULES[unit].default_value, count: UNIT_RULES[unit].default_sets }]

// ---------- Conversion ----------

type PlanRow = Pick<TrainingPlanExercise, "exercise"|"periods"|"unit"|"order"|"is_warm_up"> & { id?:number, day?:Day|null, type:string|null, training_plan_key:string, is_custom_exercise?:boolean }

// Function For Build A Draft From Server Rows Of One Plan
export const draftFromRows = (rows:readonly PlanRow[], mode:EditorMode, library_ids:ReadonlyMap<string, number> = new Map()):PlanDraft => {
    const ordered:PlanRow[] = [...rows].sort((a:PlanRow, b:PlanRow) => a.order - b.order) // Orders The Rows
    const warm_up:PlanRow|undefined = ordered.find((row:PlanRow) => row.is_warm_up) // Gets The Warm Up
    const first:PlanRow|undefined = ordered[0] // Gets The First Row

    return {
        key: mode === "edit" ? (first?.training_plan_key ?? null) : null,
        title: first?.type ?? "",
        day: mode === "edit" ? (first?.day ?? null) : null,
        warm_up_seconds: warm_up ? clampValue(warm_up.periods[0] ?? DEFAULT_WARM_UP_SECONDS, "seconds") : null,

        exercises: ordered.filter((row:PlanRow) => !row.is_warm_up).map((row:PlanRow):DraftExercise => {
            const sets:SetGroup[] = groupSets(row.periods.map((value:number) => clampValue(value, row.unit))) // Groups The Sets

            return {
                local_id: createLocalId(),
                library_id: row.is_custom_exercise ? null : (library_ids.get(row.exercise.toLowerCase()) ?? null),
                name: row.exercise,
                unit: row.unit,
                is_custom: row.is_custom_exercise === true,
                sets: sets.length > 0 ? sets : createDefaultSets(row.unit),
            }
        }),
    }
}

export type ManageTrainingPlanRow = {
    action:"new_training_plan"|"edited_training_plan",
    previous_training_plan_key:string|null,
    training_plan_key:string,
    day:Day|null,
    type:string,
    exercise:string,
    periods:number[],
    unit:ExerciseUnit,
    order:number,
    is_warm_up:boolean,
    is_custom_exercise:boolean
}

// Function For Convert A Draft To The Rows For "manage-training-plan" (Edit Keeps The Key, So The Server Replaces The Plan)
export const draftToRows = (draft:PlanDraft):ManageTrainingPlanRow[] => {
    const is_edit:boolean = draft.key !== null // Stores The Information If An Existing Plan Is Edited
    const key:string = draft.key ?? generateKey(50) // Gets The Plan Key
    const title:string = draft.title.trim() // Gets The Title

    const base = {
        action: is_edit ? "edited_training_plan" as const : "new_training_plan" as const,
        previous_training_plan_key: is_edit ? key : null,
        training_plan_key: key,
        day: draft.day,
        type: title,
    }

    const rows:ManageTrainingPlanRow[] = []

    if(draft.warm_up_seconds !== null) {
        rows.push({ ...base, exercise: WARM_UP_NAME, periods: [clampValue(draft.warm_up_seconds, "seconds")], unit: "seconds", order: 1, is_warm_up: true, is_custom_exercise: false })
    }

    draft.exercises.forEach((exercise:DraftExercise) => {
        rows.push({
            ...base,
            exercise: exercise.name.trim(),
            periods: expandSets(exercise.sets.map((group:SetGroup) => ({ value: clampValue(group.value, exercise.unit), count: group.count }))),
            unit: exercise.unit,
            order: rows.length + 1,
            is_warm_up: false,
            is_custom_exercise: exercise.is_custom,
        })
    })

    return rows
}

// ---------- Validation ----------

export type DraftIssue =
    | { kind:"missing_title" }
    | { kind:"no_exercises" }
    | { kind:"missing_exercise_name", local_id:string }
    | { kind:"no_sets", local_id:string }

// Function For Validate A Draft (Empty List = Ready To Save)
export const validateDraft = (draft:PlanDraft):DraftIssue[] => {
    const issues:DraftIssue[] = []

    if(!draft.title.trim()) issues.push({ kind: "missing_title" })
    if(draft.exercises.length === 0) issues.push({ kind: "no_exercises" })

    draft.exercises.forEach((exercise:DraftExercise) => {
        if(!exercise.name.trim()) issues.push({ kind: "missing_exercise_name", local_id: exercise.local_id })
        if(countSets(exercise.sets) === 0) issues.push({ kind: "no_sets", local_id: exercise.local_id })
    })

    return issues
}

// ---------- Grouping Plans ----------

export interface PlanSummary<T extends PlanRow = PlanRow> {
    key:string,
    title:string,
    day:Day|null,
    rows:T[], // Ordered
    exercise_count:number, // Without The Warm Up
    set_count:number
}

// Function For Group Server Rows Into Plans By Key (Plans Sharing A Day Stay Separate)
export function groupPlans<T extends PlanRow>(rows:readonly T[]):PlanSummary<T>[] {
    const by_key:Map<string, T[]> = new Map()

    rows.forEach((row:T) => {
        const group:T[] = by_key.get(row.training_plan_key) ?? []
        group.push(row)
        by_key.set(row.training_plan_key, group)
    })

    return [...by_key.entries()].map(([key, plan_rows]) => {
        const ordered:T[] = [...plan_rows].sort((a:T, b:T) => a.order - b.order) // Orders The Rows
        const exercises:T[] = ordered.filter((row:T) => !row.is_warm_up) // Gets The Exercises

        return {
            key,
            title: ordered.find((row:T) => row.type)?.type ?? "",
            day: ordered[0]?.day ?? null,
            rows: ordered,
            exercise_count: exercises.length,
            set_count: exercises.reduce((total:number, row:T) => total + row.periods.length, 0),
        }
    })
}

// Days In Display Order (Monday First)
export const WEEK_DAYS:readonly Day[] = [1, 2, 3, 4, 5, 6, 0]

// Function For Sort Plans (Days Mon → Sun First, Then Plans Without A Day By Title)
export const sortPlans = <T extends PlanRow>(plans:PlanSummary<T>[]):PlanSummary<T>[] => {
    const day_rank = (day:Day|null):number => day === null ? 99 : WEEK_DAYS.indexOf(day)
    return [...plans].sort((a, b) => day_rank(a.day) - day_rank(b.day) || a.title.localeCompare(b.title))
}

export type { OfficialTrainingPlanExercise }
