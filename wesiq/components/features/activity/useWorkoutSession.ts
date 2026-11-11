// Guided Workout Through One Training Plan (Exercise → Sets → Break → Next Exercise → Finish)

import { useReducer } from "react"

import type { ActivitySummaryExercise, TrainingPlanExercise } from "@/types/models"
import { calculateGainedXp } from "./xp"

export const BREAK_SECONDS:number = 180 // Rest Between Exercises (Same As Before)

export type SessionStep = "start"|"exercise"|"break"|"finish"

export interface ExerciseDuration {
    exercise_index:number,
    start_time:number,
    elapsed_ms:number
}

export interface SessionState {
    step:SessionStep,
    exercise_index:number,
    set_index:number, // 0-Based
    exercise_started_at:number|null,
    durations:ExerciseDuration[]
}

type SessionAction =
    | { type:"start", now:number }
    | { type:"next_set", now:number, exercises:readonly TrainingPlanExercise[] }
    | { type:"finish_exercise", now:number, exercises:readonly TrainingPlanExercise[] }
    | { type:"end_break", now:number }
    | { type:"reset" }

const INITIAL_STATE:SessionState = { step: "start", exercise_index: 0, set_index: 0, exercise_started_at: null, durations: [] }

// Function For Leave The Current Exercise (Saves Its Duration, Then Break, Next Exercise Or Finish)
const finishExercise = (state:SessionState, now:number, exercises:readonly TrainingPlanExercise[]):SessionState => {
    const durations:ExerciseDuration[] = state.exercise_started_at !== null
        ? [...state.durations, { exercise_index: state.exercise_index, start_time: state.exercise_started_at, elapsed_ms: now - state.exercise_started_at }]
        : state.durations

    const current:TrainingPlanExercise|undefined = exercises[state.exercise_index]
    const has_next:boolean = state.exercise_index < exercises.length - 1

    if(!has_next) return { ...state, step: "finish", exercise_started_at: null, durations }
    if(current && !current.is_warm_up) return { ...state, step: "break", exercise_started_at: null, durations } // No Rest After The Warm Up

    return { step: "exercise", exercise_index: state.exercise_index + 1, set_index: 0, exercise_started_at: now, durations }
}

function reducer(state:SessionState, action:SessionAction):SessionState {
    switch(action.type) {
        case "start":
            return { ...INITIAL_STATE, step: "exercise", exercise_started_at: action.now }

        case "next_set": {
            const sets:number = Math.max(1, action.exercises[state.exercise_index]?.periods.length ?? 1)
            if(state.set_index < sets - 1) return { ...state, set_index: state.set_index + 1 }
            return finishExercise(state, action.now, action.exercises)
        }

        case "finish_exercise":
            return finishExercise(state, action.now, action.exercises)

        case "end_break":
            return { ...state, step: "exercise", exercise_index: state.exercise_index + 1, set_index: 0, exercise_started_at: action.now }

        case "reset":
            return INITIAL_STATE
    }
}

export function useWorkoutSession(exercises:readonly TrainingPlanExercise[]) {
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

    return {
        state,
        start: ():void => dispatch({ type: "start", now: Date.now() }),
        nextSet: ():void => dispatch({ type: "next_set", now: Date.now(), exercises }),
        finishExercise: ():void => dispatch({ type: "finish_exercise", now: Date.now(), exercises }),
        endBreak: ():void => dispatch({ type: "end_break", now: Date.now() }),
        reset: ():void => dispatch({ type: "reset" }),
    }
}

const SUMMARY_COLORS:readonly string[] = ["#5b8cff", "#3dd68c", "#f0c14a", "#ff7a59", "#b07cff", "#2ec5d3", "#ff5c8a"]

// Function For Build The Per-Exercise Summary Saved With The Activity (Seconds, Like The Server Expects)
export const buildSessionSummary = (durations:readonly ExerciseDuration[], exercises:readonly TrainingPlanExercise[], xp_boost_expiration_time:string|null):ActivitySummaryExercise[] => {
    return durations.map((duration:ExerciseDuration, index:number) => ({
        exercise: exercises[duration.exercise_index]?.exercise ?? "",
        elapsed_time: Math.round(duration.elapsed_ms / 1000),
        gained_xp: calculateGainedXp(duration.elapsed_ms, xp_boost_expiration_time, duration.start_time, duration.start_time + duration.elapsed_ms),
        color: SUMMARY_COLORS[index % SUMMARY_COLORS.length] ?? "#5b8cff",
    }))
}
