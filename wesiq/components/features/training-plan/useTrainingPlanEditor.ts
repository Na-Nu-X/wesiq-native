// Training Plan Editor State (Reducer, So Every Change Is One Typed Action)

import { useMemo, useReducer } from "react"
import {
    clampValue,
    createDefaultSets,
    createLocalId,
    DEFAULT_WARM_UP_SECONDS,
    DraftExercise,
    DraftIssue,
    MAX_EXERCISES,
    MAX_SETS_PER_EXERCISE,
    PlanDraft,
    SetGroup,
    validateDraft,
    countSets,
} from "./model"

import type { Day, Exercise, ExerciseUnit } from "@/types/models"

export type EditorAction =
    | { type:"reset", draft:PlanDraft }
    | { type:"set_title", title:string }
    | { type:"set_day", day:Day|null }
    | { type:"set_warm_up", seconds:number|null }
    | { type:"add_library_exercise", exercise:Exercise }
    | { type:"add_custom_exercise" }
    | { type:"remove_exercise", local_id:string }
    | { type:"reorder_exercises", exercises:DraftExercise[] }
    | { type:"move_exercise", local_id:string, direction:-1|1 }
    | { type:"rename_exercise", local_id:string, name:string }
    | { type:"set_unit", local_id:string, unit:ExerciseUnit }
    | { type:"update_set_group", local_id:string, group_index:number, changes:Partial<SetGroup> }
    | { type:"add_set_group", local_id:string }
    | { type:"remove_set_group", local_id:string, group_index:number }

interface EditorState {
    draft:PlanDraft,
    saved_snapshot:string // Last Saved / Loaded Draft (For Unsaved Changes Detection)
}

// Function For Serialize A Draft Without Local IDs (They Change On Every Load)
const snapshot = (draft:PlanDraft):string => JSON.stringify({ ...draft, exercises: draft.exercises.map(({ local_id: _local_id, ...rest }) => rest) })

// Function For Update One Exercise
const updateExercise = (draft:PlanDraft, local_id:string, update:(exercise:DraftExercise) => DraftExercise):PlanDraft => ({
    ...draft,
    exercises: draft.exercises.map((exercise:DraftExercise) => exercise.local_id === local_id ? update(exercise) : exercise),
})

// Function For Apply An Action To The Draft
export function draftReducer(draft:PlanDraft, action:EditorAction):PlanDraft {
    switch(action.type) {
        case "reset": return action.draft
        case "set_title": return { ...draft, title: action.title }
        case "set_day": return { ...draft, day: action.day }
        case "set_warm_up": return { ...draft, warm_up_seconds: action.seconds === null ? null : clampValue(action.seconds, "seconds") }

        case "add_library_exercise": {
            if(draft.exercises.length >= MAX_EXERCISES) return draft

            return {
                ...draft,
                exercises: [...draft.exercises, {
                    local_id: createLocalId(),
                    library_id: action.exercise.id,
                    name: action.exercise.exercise,
                    unit: action.exercise.unit,
                    is_custom: false,
                    sets: createDefaultSets(action.exercise.unit),
                }],
            }
        }

        case "add_custom_exercise": {
            if(draft.exercises.length >= MAX_EXERCISES) return draft
            return { ...draft, exercises: [...draft.exercises, { local_id: createLocalId(), library_id: null, name: "", unit: "reps", is_custom: true, sets: createDefaultSets("reps") }] }
        }

        case "remove_exercise": return { ...draft, exercises: draft.exercises.filter((exercise:DraftExercise) => exercise.local_id !== action.local_id) }
        case "reorder_exercises": return { ...draft, exercises: action.exercises }

        case "move_exercise": {
            const index:number = draft.exercises.findIndex((exercise:DraftExercise) => exercise.local_id === action.local_id) // Gets The Index
            const target:number = index + action.direction // Gets The Target Index
            if(index === -1 || target < 0 || target >= draft.exercises.length) return draft

            const exercises:DraftExercise[] = [...draft.exercises]
            const [moved] = exercises.splice(index, 1)
            if(moved) exercises.splice(target, 0, moved)
            return { ...draft, exercises }
        }

        case "rename_exercise": return updateExercise(draft, action.local_id, (exercise) => ({ ...exercise, name: action.name }))

        // Changing The Unit Resets The Values To The New Unit's Defaults (12 Reps Make No Sense As 12 Steps)
        case "set_unit": return updateExercise(draft, action.local_id, (exercise) => exercise.unit === action.unit ? exercise : { ...exercise, unit: action.unit, sets: createDefaultSets(action.unit) })

        case "update_set_group": return updateExercise(draft, action.local_id, (exercise) => {
            const total_without_group:number = countSets(exercise.sets) - (exercise.sets[action.group_index]?.count ?? 0) // Gets The Sets Of Other Groups

            return {
                ...exercise,
                sets: exercise.sets.map((group:SetGroup, index:number) => index !== action.group_index ? group : {
                    value: action.changes.value !== undefined ? clampValue(action.changes.value, exercise.unit) : group.value,
                    count: action.changes.count !== undefined ? Math.max(1, Math.min(MAX_SETS_PER_EXERCISE - total_without_group, Math.round(action.changes.count))) : group.count,
                }),
            }
        })

        case "add_set_group": return updateExercise(draft, action.local_id, (exercise) => {
            if(countSets(exercise.sets) >= MAX_SETS_PER_EXERCISE) return exercise

            const last:SetGroup|undefined = exercise.sets[exercise.sets.length - 1] // Copies The Last Value (Pyramid Sets Start From It)
            return { ...exercise, sets: [...exercise.sets, { value: last?.value ?? createDefaultSets(exercise.unit)[0]?.value ?? 1, count: 1 }] }
        })

        case "remove_set_group": return updateExercise(draft, action.local_id, (exercise) => exercise.sets.length <= 1 ? exercise : { ...exercise, sets: exercise.sets.filter((_group, index:number) => index !== action.group_index) })
    }
}

function editorReducer(state:EditorState, action:EditorAction):EditorState {
    if(action.type === "reset") return { draft: action.draft, saved_snapshot: snapshot(action.draft) }
    return { ...state, draft: draftReducer(state.draft, action) }
}

export interface TrainingPlanEditor {
    draft:PlanDraft,
    dispatch:(action:EditorAction) => void,
    issues:DraftIssue[],
    is_dirty:boolean
}

// Hook For The Editor State
export function useTrainingPlanEditor(initial_draft:PlanDraft):TrainingPlanEditor {
    const [state, dispatch] = useReducer(editorReducer, initial_draft, (draft:PlanDraft):EditorState => ({ draft, saved_snapshot: snapshot(draft) }))
    const issues:DraftIssue[] = useMemo(() => validateDraft(state.draft), [state.draft]) // Validates The Draft

    return {
        draft: state.draft,
        dispatch,
        issues,
        is_dirty: snapshot(state.draft) !== state.saved_snapshot,
    }
}

export { DEFAULT_WARM_UP_SECONDS }
