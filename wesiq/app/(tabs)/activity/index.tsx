// Activity: Stopwatch, Guided Training Plan, Weekly Stats, Daily Challenges, My Tasks And History

import { useEffect, useRef, useState } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Button, Card, Chip, Header, Icon, Screen, Skeleton, Text, ThemedRefreshControl } from "@/components/ui"
import { colors, layout, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import { useMyPlans } from "@/components/features/training-plan/usePlans"
import { activateXpBoost, completeOfficialTask, getActivityHistory, getActivityStats, getOfficialTasks, getXpBoost, recordActivity } from "@/lib/api/endpoints/activity"
import { getMinimalistFormattedTime } from "@/utils/time"
import TimerCard from "@/components/features/activity/TimerCard"
import WorkoutPlanCard from "@/components/features/activity/WorkoutPlanCard"
import StatsGrid from "@/components/features/activity/StatsGrid"
import ChallengesCard from "@/components/features/activity/ChallengesCard"
import CustomTasksCard from "@/components/features/activity/CustomTasksCard"
import HistoryCard from "@/components/features/activity/HistoryCard"
import ActivityScroll from "@/components/features/activity/ActivityScroll"
import { useActivityTimer } from "@/components/features/activity/useActivityTimer"
import { buildSessionSummary, useWorkoutSession } from "@/components/features/activity/useWorkoutSession"
import { useXpToast } from "@/components/features/activity/useXpToast"
import { calculateGainedXp, getChallengeRule, LiveProgressInput } from "@/components/features/activity/xp"

import type { PlanSummary } from "@/components/features/training-plan/model"
import type { OfficialTask, TrainingPlanExercise } from "@/types/models"

export default function ActivityScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet
    const is_logged_in:boolean = Boolean(logged_in_user) // Checks If It Is Logged In

    const timer = useActivityTimer() // Gets The Timer
    const xp_toast = useXpToast() // Gets The XP Toast
    const [is_saving, setIsSaving] = useState<boolean>(false) // Stores If It Is Saving
    const [now, setNow] = useState<number>(() => Date.now()) // Stores The Current Time

    // ---------- Data ----------

    const plans_query = useMyPlans(is_logged_in) // Gets The Plans Query
    const stats_query = useApiQuery("activity_stats", (signal:AbortSignal) => getActivityStats(signal), { is_enabled: is_logged_in }) // Gets The Stats Query
    const history_query = useApiQuery("activity_history", (signal:AbortSignal) => getActivityHistory(signal), { is_enabled: is_logged_in }) // Gets The History Query
    const boost_query = useApiQuery("xp_boost", (signal:AbortSignal) => getXpBoost(signal), { is_enabled: is_logged_in }) // Gets The Boost Query
    const challenges_query = useApiQuery("official_tasks", (signal:AbortSignal) => getOfficialTasks(signal), { is_enabled: is_logged_in }) // Gets The Challenges Query

    const plans:PlanSummary<TrainingPlanExercise>[] = plans_query.plans // Gets The Plans
    const [selected_key, setSelectedKey] = useState<string|null>(null) // Stores The Selected Key
    const today:number = new Date().getDay() // 0 = Sunday, Like The Server
    const selected_plan:PlanSummary<TrainingPlanExercise>|undefined = plans.find((plan) => plan.key === selected_key) ?? plans.find((plan) => plan.day === today) ?? plans[0] // Gets The Selected Plan
    const session = useWorkoutSession(selected_plan?.rows ?? []) // Gets The Session

    const boost_expiration:string|null = boost_query.state.data?.xp_boost_expiration_time ?? null // Gets The Boost Expiration
    const boost_expires_at:number|null = boost_expiration ? new Date(boost_expiration).getTime() : null // Gets The Boost Expires At
    const gained_xp:number = calculateGainedXp(timer.elapsed_ms, boost_expiration) // Gets The Gained XP
    const tasks:OfficialTask[] = challenges_query.state.data?.official_tasks ?? [] // Gets The Tasks

    const live_input:LiveProgressInput|null = timer.is_started ? { elapsed_seconds: timer.elapsed_ms / 1000, gained_xp, average_seconds: stats_query.state.data?.activity.average_activity_time ?? 0 } : null // Gets The Live Input

    // Initializes The Clock For The Boost Countdown
    useEffect(() => {
        if(boost_expires_at === null || boost_expires_at <= Date.now()) return

        const interval:ReturnType<typeof setInterval> = setInterval(() => setNow(Date.now()), 1000) // Gets The Interval
        return () => clearInterval(interval)
    }, [boost_expires_at])

    // ---------- Daily Challenges ----------

    const requested_challenges = useRef<Set<string>>(new Set()) // Prevents Completing One Challenge Twice
    const tasks_reference = useRef<OfficialTask[]>(tasks) // Stores The Tasks Reference

    // Initializes The Latest Tasks Reference
    useEffect(() => {
        tasks_reference.current = tasks
    })

    // Function For Complete A Challenge On The Server
    const completeChallenge = async (data:string):Promise<void> => {
        const task:OfficialTask|undefined = tasks_reference.current.find((one_task:OfficialTask) => one_task.data === data) // Gets The Task
        if(!task || task.is_completed || requested_challenges.current.has(data)) return

        requested_challenges.current.add(data)
        const response = await completeOfficialTask(data) // Sends The Request

        if(!response.ok) {
            requested_challenges.current.delete(data) // Allows A Retry
            return
        }

        const result = response.data.task // Gets The Result
        if(!result.is_completed) requested_challenges.current.delete(data) // Partial Progress (E.g. 1 Of 2 Activities)

        const updated:OfficialTask[] = tasks_reference.current.map((one_task:OfficialTask) => one_task.data === data ? { ...one_task, progress_percentage: result.progress_percentage, is_completed: result.is_completed } : one_task) // Gets The Updated
        tasks_reference.current = updated
        challenges_query.setData((previous) => previous ? { ...previous, official_tasks: updated } : previous)

        if(!result.first_completion || !result.is_completed) return

        xp_toast.show(result.gained_xp, getChallengeRule(data).label)

        // Completes "All Challenges" When Every Other One Is Done
        const others:OfficialTask[] = updated.filter((one_task:OfficialTask) => one_task.data !== "complete_all_official_tasks") // Gets The Others
        if(others.length > 0 && others.every((one_task:OfficialTask) => one_task.is_completed)) completeChallenge("complete_all_official_tasks")
    }

    // Initializes The Completion Of Time And XP Challenges While Recording
    useEffect(() => {
        if(!live_input || !is_logged_in) return

        tasks_reference.current.forEach((task:OfficialTask) => {
            const live_progress = getChallengeRule(task.data).live_progress // Gets The Live Progress
            if(!task.is_completed && live_progress && live_progress(live_input) >= 100) completeChallenge(task.data)
        })
    })

    // ---------- Timer ----------

    // Function For Start Or Resume (The Daily XP Boost Starts With The First Activity)
    const startTimer = ():void => {
        if(timer.is_running) return

        timer.start()

        if(is_logged_in && boost_query.state.data?.is_xp_boost_available && !boost_query.state.data.is_xp_boost_active) {
            boost_query.setData((previous) => previous ? { ...previous, is_xp_boost_available: false } : previous) // Prevents A Second Request

            activateXpBoost().then((response) => {
                if(!response.ok) {
                    boost_query.refetch()
                    return
                }

                setNow(Date.now()) // Sets The Now
                boost_query.setData((previous) => previous ? { ...previous, xp_boost_expiration_time: response.data.xp_boost_expiration_time, is_xp_boost_active: true, is_xp_boost_available: false } : previous)
            })
        }
    }

    // Function For Toggle The Timer
    const toggleTimer = ():void => {
        haptics.light()
        if(timer.is_running) timer.pause()
        else startTimer()
    }

    // Function For Stop And Save The Activity
    const finishActivity = async ():Promise<void> => {
        const was_running:boolean = timer.is_running // Checks If It Was Running
        timer.pause() // Keeps The Time If Saving Fails

        const elapsed_ms:number = timer.elapsed_ms > 0 ? timer.elapsed_ms : 0 // Gets The Elapsed MS
        const final_xp:number = calculateGainedXp(elapsed_ms, boost_expiration) // Gets The Final XP

        // Checks If It Is Confirmed
        const is_confirmed:boolean = await confirmAction({
            title: t("Ukončiť aktivitu?"),
            message: is_logged_in ? t("Čas: {{time}} · {{xp}} XP", { time: getMinimalistFormattedTime(Math.round(elapsed_ms / 1000)), xp: final_xp }) : t("Bez prihlásenia sa aktivita neuloží."),
            confirm_label: is_logged_in ? t("Ukončiť a uložiť") : t("Ukončiť"),
        })

        if(!is_confirmed) {
            if(was_running) startTimer()
            return
        }

        const is_plan_session:boolean = session.state.step !== "start" // Checks If It Is Plan Session
        const is_plan_finished:boolean = session.state.step === "finish" // Checks If It Is Plan Finished

        // Function For Reset
        const reset = ():void => {
            timer.reset()
            session.reset()
        }

        if(!is_logged_in) {
            reset()
            auth_sheet.open("login_form")
            return
        }

        if(final_xp <= 0) {
            reset()
            showAlert(t("Aktivita sa neuložila"), t("Aktivita bola príliš krátka na získanie XP."))
            return
        }

        setIsSaving(true) // Sets The Saving State

        // Gets The Response
        const response = await recordActivity({
            elapsed_time: Math.round(elapsed_ms),
            gained_xp: final_xp,
            type: is_plan_session && selected_plan ? selected_plan.title : null,
            day: is_plan_session && selected_plan ? selected_plan.day : null,
            training_plan_summary: is_plan_session && selected_plan ? buildSessionSummary(session.state.durations, selected_plan.rows, boost_expiration) : null,
        })

        setIsSaving(false) // Sets The Saving State

        if(!response.ok) {
            showAlert(t("Aktivita sa neuložila"), `${response.error.message}\n${t("Čas zostal zachovaný, skúste to znova.")}`)
            return
        }

        reset()
        haptics.success()
        xp_toast.show(final_xp, t("Aktivita uložená"))

        completeChallenge("2_activities")
        if(is_plan_finished) completeChallenge("complete_training_plan_activity")

        stats_query.reload() // Silent Reloads (refetch Would Scroll The Screen To The Top On iOS)
        history_query.reload()
    }

    // Function For Keep The Stopwatch Running While Moving Through The Plan
    const withRunningTimer = (action:() => void) => ():void => {
        startTimer()
        action()
    }

    // Function For Refresh
    const refresh = ():void => {
        plans_query.refetch()
        stats_query.refetch()
        history_query.refetch()
        boost_query.refetch()
        challenges_query.refetch()
    }

    const is_refreshing:boolean = stats_query.is_refreshing || history_query.is_refreshing || challenges_query.is_refreshing // Checks If It Is Refreshing

    return (
        <Screen
            is_scrollable = {false}
            is_padded = {false}
            header = {<Header
                title = {t("Aktivita")}
                subtitle = {t("Trénujte, plňte výzvy a zbierajte XP")}
                is_large
            />}
        >
            <ActivityScroll
                contentContainerStyle = {styles.content}
                keyboardShouldPersistTaps = "handled"
                showsVerticalScrollIndicator = {false}
                refreshControl = {is_logged_in ? <ThemedRefreshControl refreshing = {is_refreshing} onRefresh = {refresh} /> : undefined}
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator = {false}
                    contentContainerStyle = {styles.chips}
                >
                    <Chip
                        label = {t("Nový plán")}
                        icon = "plus"
                        onPress = {() => router.push("/activity/new")}
                    />
                    <Chip
                        label = {t("Moje plány")}
                        icon = "pen"
                        onPress = {() => router.push("/activity/edit")}
                    />
                    <Chip
                        label = {t("Hotové plány")}
                        icon = "copy"
                        onPress = {() => router.push("/activity/copy")}
                    />
                </ScrollView>

                {!is_logged_in && (
                    <Card
                        variant = "highlighted"
                        padding = "md"
                        style = {styles.sign_in}
                    >
                        <Icon
                            name = "circle-info"
                            size = {18}
                            color = "primary"
                        />
                        <Text variant = "callout" style = {styles.flex}>{t("Prihláste sa, aby sa vaše aktivity ukladali a mohli ste plniť výzvy.")}</Text>
                        <Button
                            label = {t("Prihlásiť sa")}
                            size = "sm"
                            onPress = {() => auth_sheet.open("login_form")}
                        />
                    </Card>
                )}

                <TimerCard
                    elapsed_ms = {timer.elapsed_ms}
                    gained_xp = {gained_xp}
                    is_running = {timer.is_running}
                    is_started = {timer.is_started}
                    is_saving = {is_saving}
                    boost = {{ is_available: Boolean(boost_query.state.data?.is_xp_boost_available), expires_at: boost_expires_at }}
                    now = {now}
                    onToggle = {toggleTimer}
                    onStop = {finishActivity}
                />

                {/* ---------- Training Plan ---------- */}
                {is_logged_in && (plans_query.state.status === "loading" && plans.length === 0 ? (
                    <Skeleton height = {220} radius = {radii.lg} />
                ) : selected_plan ? (
                    <WorkoutPlanCard
                        plans = {plans}
                        selected_key = {selected_plan.key}
                        onSelect = {setSelectedKey}
                        session = {session.state}
                        onStart = {withRunningTimer(session.start)}
                        onNextSet = {withRunningTimer(session.nextSet)}
                        onSkipExercise = {withRunningTimer(session.finishExercise)}
                        onEndBreak = {withRunningTimer(session.endBreak)}
                        onFinish = {finishActivity}
                        is_saving = {is_saving}
                    />
                ) : (
                    <Card padding = "lg" style = {styles.no_plan}>
                        <View style = {styles.no_plan_icon}><Icon
                            name = "dumbbell"
                            size = {20}
                            color = "primary"
                        /></View>
                        <Text variant = "heading" align = "center">{t("Zatiaľ nemáte tréningový plán")}</Text>
                        <Text
                            variant = "callout"
                            color = "text_secondary"
                            align = "center"
                        >
                            {t("Vytvorte si vlastný alebo začnite s hotovým plánom. Aplikácia vás prevedie sériami aj prestávkami.")}
                        </Text>

                        <View style = {styles.no_plan_actions}>
                            <Button
                                label = {t("Vytvoriť plán")}
                                icon = "plus"
                                onPress = {() => router.push("/activity/new")}
                            />
                            <Button
                                label = {t("Hotové plány")}
                                icon = "copy"
                                variant = "secondary"
                                onPress = {() => router.push("/activity/copy")}
                            />
                        </View>
                    </Card>
                ))}

                {is_logged_in && (
                    <>
                        <Text
                            variant = "overline"
                            color = "text_muted"
                            style = {styles.section_title}
                        >
                            {t("Posledných 7 dní")}
                        </Text>
                        <StatsGrid stats = {stats_query.state.data?.activity ?? null} is_loading = {stats_query.state.status === "loading"} />

                        <ChallengesCard
                            tasks = {tasks}
                            remaining_hours = {challenges_query.state.data?.official_tasks_remaining_hours ?? null}
                            live_input = {live_input}
                            is_loading = {challenges_query.state.status === "loading"}
                        />
                        <CustomTasksCard onTaskAdded = {() => completeChallenge("add_custom_task")} />
                        <HistoryCard
                            activities = {history_query.state.data?.activity_history ?? []}
                            is_loading = {history_query.state.status === "loading"}
                            error = {history_query.state.error}
                            onRetry = {history_query.refetch}
                        />
                    </>
                )}
            </ActivityScroll>

            {xp_toast.element}
        </Screen>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    content: {
        width: "100%",
        maxWidth: layout.max_content_width,
        alignSelf: "center",
        gap: spacing.lg,
        paddingHorizontal: layout.screen_padding,
        paddingBottom: spacing.xxxl,
    },

    chips: {
        flexGrow: 1, // Fills The Row, So The Chips Are Centered When They Fit (Longer Translations Still Scroll)
        justifyContent: "center",
        gap: spacing.sm,
    },

    sign_in: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },

    section_title: {
        marginBottom: -spacing.sm,
    },

    no_plan: {
        alignItems: "center",
        gap: spacing.sm,
    },

    no_plan_icon: {
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.xs,
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    no_plan_actions: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: spacing.sm,
        paddingTop: spacing.sm,
    },
})
