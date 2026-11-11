// XP And Daily Challenge Rules (Same Formulas As Before)

import i18n from "@/lib/i18n"

import type { OfficialTask } from "@/types/models"

export const BASE_XP_PER_HOUR:number = 100
export const XP_BOOST_MULTIPLIER:number = 2
export const XP_BOOST_DURATION_MS:number = 30 * 60 * 1000

// Function For Calculate The Gained XP (Time Inside The Boost Window Counts Multiple Times)
export const calculateGainedXp = (elapsed_ms:number, xp_boost_expiration_time:string|null, start_time_ms?:number, end_time_ms?:number):number => {
    const activity_end:number = end_time_ms ?? Date.now()
    const activity_start:number = start_time_ms ?? activity_end - elapsed_ms
    const xp_per_ms:number = BASE_XP_PER_HOUR / (60 * 60 * 1000)

    let boosted_ms:number = 0

    if(xp_boost_expiration_time) {
        const boost_end:number = new Date(xp_boost_expiration_time).getTime() // Gets The Boost End
        if(boost_end > activity_start) boosted_ms = Math.min(boost_end, activity_end) - activity_start
    }

    boosted_ms = Math.max(0, Math.min(boosted_ms, elapsed_ms))
    return Math.round((elapsed_ms - boosted_ms) * xp_per_ms + boosted_ms * xp_per_ms * XP_BOOST_MULTIPLIER)
}

// ---------- Daily Challenges ----------

export interface LiveProgressInput {
    elapsed_seconds:number,
    gained_xp:number,
    average_seconds:number
}

interface ChallengeRule {
    label:string,
    icon:"stopwatch"|"bolt"|"chart-line"|"list-check"|"dumbbell"|"trophy"|"plus",
    live_progress?:(input:LiveProgressInput) => number // Progress Measured On The Device While The Timer Runs
}

// Function For Get The Rules By The Server "data" Key
export const getChallengeRule = (data:string):ChallengeRule => {
    const rules:Record<string, ChallengeRule> = {
        "30_minutes_activity": { label: i18n.t("Zaznamenaj 30 minút aktivity."), icon: "stopwatch", live_progress: ({ elapsed_seconds }) => elapsed_seconds / 1800 * 100 },
        "1_hour_activity": { label: i18n.t("Zaznamenaj 1h aktivity."), icon: "stopwatch", live_progress: ({ elapsed_seconds }) => elapsed_seconds / 3600 * 100 },
        "2_hours_activity": { label: i18n.t("Zaznamenaj 2h aktivity."), icon: "stopwatch", live_progress: ({ elapsed_seconds }) => elapsed_seconds / 7200 * 100 },
        "3_hours_activity": { label: i18n.t("Zaznamenaj 3h aktivity."), icon: "stopwatch", live_progress: ({ elapsed_seconds }) => elapsed_seconds / 10800 * 100 },
        "beat_average_activity_time": { label: i18n.t("Prekonaj týždenný priemer času aktivity."), icon: "chart-line", live_progress: ({ elapsed_seconds, average_seconds }) => average_seconds > 0 ? elapsed_seconds / average_seconds * 100 : 0 },
        "50_xp_activity": { label: i18n.t("Získaj 50 XP za aktivitu."), icon: "bolt", live_progress: ({ gained_xp }) => gained_xp / 50 * 100 },
        "100_xp_activity": { label: i18n.t("Získaj 100 XP za aktivitu."), icon: "bolt", live_progress: ({ gained_xp }) => gained_xp / 100 * 100 },
        "150_xp_activity": { label: i18n.t("Získaj 150 XP za aktivitu."), icon: "bolt", live_progress: ({ gained_xp }) => gained_xp / 150 * 100 },
        "complete_training_plan_activity": { label: i18n.t("Dokonči aktivitu podľa tréningového plánu."), icon: "dumbbell" },
        "2_activities": { label: i18n.t("Zaznamenaj 2 aktivity."), icon: "list-check" },
        "complete_all_official_tasks": { label: i18n.t("Splň všetky dnešné výzvy."), icon: "trophy" },
        "add_custom_task": { label: i18n.t("Pridaj vlastnú úlohu."), icon: "plus" },
    }

    return rules[data] ?? { label: data, icon: "trophy" }
}

// Function For Get The Shown Progress (Server Progress, Or The Live Progress While Recording When It's Higher)
export const getChallengeProgress = (task:OfficialTask, input:LiveProgressInput|null):number => {
    if(task.is_completed) return 100

    const live:number = input ? getChallengeRule(task.data).live_progress?.(input) ?? 0 : 0
    return Math.min(100, Math.max(task.progress_percentage, live))
}
