import { View, Text, StyleSheet, Pressable, Alert, Animated, Dimensions } from "react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { getDayName, getFormattedDate, getFormattedTime, getMinimalistFormattedTime } from "@/utils/time"
import { AnimatedProgressBar } from "./AnimatedProgressBar"
import { Break } from "./Break"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"
import type { Activity } from "./HistorySection"

interface TrainingPlanExercise {
    training_plan_key:string,
    day:number,
    type:string,
    exercise:string,
    periods:number[],
    unit:string,
    order:number,
    is_warm_up:boolean
}

interface LoadedActivityResponse {
    success:boolean,
    activity?:ActivityData,
    message:string
}

interface ActivityData {
    latest_activity:Activity|null,
    longest_activity:Activity|null,
    average_activity_time:number,
    average_activity_time_formatted:string,
    activities_amount:number
}

interface LoadedTrainingPlansResponse {
    success:boolean,
    training_plans:TrainingPlanExercise[],
    message:string
}

type TrainingPlanSlide = "start_training"|"exercise"|"finish_training"|"break" // Types The Training Plan Slide

export default function ActivitySection() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    
    const [active_training_plan_index, setActiveTrainingPlanIndex] = useState<number>(0) // Stores The Active Training Plan Index
    const [active_exercise_index, setActiveExerciseIndex] = useState<number>(0) // Stores The Active Exercise Index
    const [training_plans_exercises, setTrainingPlansExercises] = useState<TrainingPlanExercise[]>([]) // Stores The Training Plans Exercises
    const [are_training_plans_loading, setAreTrainingPlansLoading] = useState(false) // Stores The Information If Training Plans Are Loading
    const [training_plan_slide, setTrainingPlanSlide] = useState<TrainingPlanSlide>("start_training") // Stores The Training Plan Slide
    const [current_set, setCurrentSet] = useState<number>(1) // Stores The Current Set
    const [red, setRed] = useState<number>(255) // Starting Progress Bar Color rgb(255, 207, 32)
    
    const [is_xp_boost_available, setIsXpBoostAvailable] = useState<boolean>(false) // Stores The Information If The XP Boost Is Available
    
    const [activity_data, setActivityData] = useState<ActivityData|null>(null) // Stores The Activity Data
    
    const [is_activity_running, setIsActivityRunning] = useState<boolean>(false) // Stores The Information If The Activity Is Running
    const [is_activity_started, setIsActivityStarted] = useState<boolean>(false) // Stores The Information If The Activity Is Started
    const [elapsed_time, setElapsedTime] = useState<number>(0) // Stores The Elapsed Time
    const start_time = useRef<number|null>(null) // Stores The Start Time
    const accumulated_time = useRef<number>(0) // Stores The Accumulated Time
    const interval = useRef<ReturnType<typeof setInterval>|null>(null) // Stores The Interval

    const days:(number|null)[] = [...new Set(training_plans_exercises.map((one_exercise:TrainingPlanExercise) => one_exercise.day ? one_exercise.day : null))] // Gets Ordered Days From Available Training Plans
    const selected_day:number|null = days[active_training_plan_index] || null // Selects Current Or Upcoming Day Of Training Plan

    const { width: SCREEN_WIDTH } = Dimensions.get("window") // Gets The Screen Width
    
    const translateX = useRef(new Animated.Value(0)).current // Translate X Animation

    // Orders Exercises From All Training Plans By Their Order Value
    const ordered_exercises:TrainingPlanExercise[] = useMemo(() => {
        return [...training_plans_exercises].sort(
            (a:TrainingPlanExercise, b:TrainingPlanExercise) => Number(a.order) - Number(b.order)
        )
    }, [training_plans_exercises])

    // Gets The Active Training Plan Exercises
    const active_training_plan_exercises:TrainingPlanExercise[] = useMemo(() => {
        return ordered_exercises.filter(one_exercise => one_exercise.day === selected_day)
    }, [ordered_exercises, selected_day])

    const active_exercise:TrainingPlanExercise = active_training_plan_exercises[active_exercise_index] // Gets The Active Exercise

    // Gets The All Sets From All Active Training Plan Exercises
    const all_sets:number = useMemo(() => {
        return active_training_plan_exercises.reduce((total:number, one_exercise:TrainingPlanExercise) => {
            const current_periods_length:number = one_exercise.periods ? one_exercise.periods.length : 0 // Gets The Current Periods Length (Sets)
            return total + current_periods_length // Returns The Added Value
        }, 0)
    }, [active_training_plan_exercises])

    const MIN_RED:number = 82 // Final Progress Bar Color rgb(82, 207, 32)

    // Function For Get The Logged In User
    const getLoggedInUser = async () => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const logged_in_user_response:Response = await fetch(`${API_URL}/get-logged-in-user/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })
    
            const logged_in_user_data:LoggedInUserResponse = await logged_in_user_response.json() // Gets The Logged In User Data

            if(logged_in_user_response.status === 401) {
                await AsyncStorage.removeItem("user_token") // Removes The User Token
                setLoggedInUser(null) // Removes The Logged In User
                return null
            }
    
            if(logged_in_user_data.success) {
                setLoggedInUser(logged_in_user_data.logged_in_user || null) // Sets The Logged In User
                return logged_in_user_data.logged_in_user || null
            } 
            
            else return null
    
        } 
        
        catch {
            return null
        }
    }

    // Initializes The Get Logged In User
    useEffect(() => {
        getLoggedInUser() // Gets The Logged In User
    }, [])

    // Function For Get The All Exercises From All Training Plans
    const getTrainingPlansExercises = async ():Promise<void> => {
        setAreTrainingPlansLoading(true) // Stores The Information That Training Plans Are Loading

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const loaded_training_plans_response:Response = await fetch(`${API_URL}/get-training-plans/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_training_plans_response.ok) {
                Alert.alert("Chyba", "Pri získavaní tréningových plánov došlo k chybe.") // Shows The Alert
                return
            }

            const loaded_training_plans_data:LoadedTrainingPlansResponse = await loaded_training_plans_response.json() // Gets The Loaded Training Plans Data

            // If The Response Isn't Success
            if(!loaded_training_plans_data.success) {
                Alert.alert("Chyba", loaded_training_plans_data.message) // Shows The Alert
                return
            }
            
            else {
                setTrainingPlansExercises(loaded_training_plans_data.training_plans) // Sets The Training Plans Exercises
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri získavaní tréningových plánov došlo k chybe.") // Shows The Alert
        } 
        
        finally {
            setAreTrainingPlansLoading(false) // Stores The Information That Posts Aren't Loading
        }
    }

    // Initializes The Load Of The Training Plans
    useEffect(() => {
        getTrainingPlansExercises() // Gets The Training Plans Exercises
    }, [])

    // Function For Get The Activity Data
    const getActivity = async ():Promise<void> => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const loaded_activity_response:Response = await fetch(`${API_URL}/get-activity/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_activity_response.ok) {
                Alert.alert("Chyba", "Pri získavaní dát o aktivite užívateľa došlo k chybe.") // Shows The Alert
                return
            }

            const loaded_activity_data:LoadedActivityResponse = await loaded_activity_response.json() // Gets The Loaded Activity Data

            // If The Response Isn't Success
            if(!loaded_activity_data.success || !loaded_activity_data.activity) {
                Alert.alert("Chyba", loaded_activity_data.message) // Shows The Alert
                return
            }
            
            else {
                setActivityData(loaded_activity_data.activity) // Sets The Activity Data
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri získavaní dát o aktivite užívateľa došlo k chybe.") // Shows The Alert
        }
    }

    // Initializes The Load Of The Activity Data
    useEffect(() => {
        getActivity() // Gets The Activity Data
    }, [])

    // Function For Render Exercises Of The Selected Training Plan
    const generateTrainingPlan = () => {
        return (
            <>
                <View className="training_plan" style={styles.training_plan}>
                    <Animated.View 
                        style={{ 
                            transform: [{ translateX }],
                            flex: 1,
                        }}
                    >
                        {training_plan_slide === "start_training" && (
                            <View className="start_training active" style={styles.start_training}>
                                <View className="left" style={styles.left}>
                                    <Text style={styles.text}>Tréningový plán</Text>
                                    <Text style={styles.text}>Začať tréning</Text>

                                    <Text className="title" style={styles.title}>{selected_day ? `${ordered_exercises[active_exercise_index].type || "Tréning"} - ${getDayName(selected_day)}` : ordered_exercises[active_exercise_index].type || "Tréning"}</Text> {/* Sets Training Plan Title On The Start Training Slide */}
                                </View>

                                <View className="start_training_button">
                                    <IconButton 
                                        icon_name="play" 
                                        onPress={startTraining} 
                                    />
                                </View>
                            </View>
                        )}

                        {training_plan_slide === "finish_training" && (
                            <View className="finish_training" style={styles.finish_training}>
                                <View className="left" style={styles.left}>
                                    <Text style={styles.text}>Tréningový plán</Text>
                                    <Text style={styles.text}>Dokončiť tréning</Text>

                                    <Text className="title" style={styles.title}>{ordered_exercises[active_exercise_index].type || "Tréning"}</Text> {/* Sets Training Plan Title On The Finish Training Slide */}
                                </View>

                                <View className="finish_training_button">
                                    <IconButton 
                                        icon_name="stop" 
                                        // onPress={} 
                                    />
                                </View>
                            </View>
                        )}

                        {training_plan_slide === "break" && (
                            <Break time={10} skipBreak={() => console.log("TEST")} />
                        )}

                        {training_plan_slide === "exercise" && active_exercise && (
                            <>
                                {/* Creates Warm Up */}
                                {active_exercise.is_warm_up && (
                                    <View className="exercise warm_up" style={styles.warm_up}>
                                        <Text className="title">Warm Up</Text>

                                        <View className="warm_up_timer" style={styles.warm_up_timer}>
                                            {/* <svg width="100" height="100" viewBox="0 0 100 100">
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    class="progress"
                                                />
                                            </svg>
                                            
                                            <svg width="100" height="100" viewBox="0 0 100 100">
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    class="progress_background"
                                                />
                                            </svg> */}

                                            <Text className="countdown" style={styles.warm_up_timer_text}>{`${getFormattedTime("minutes", active_exercise.periods[0])}:${getFormattedTime("seconds", active_exercise.periods[0], true)}`}</Text> {/* Stores Timer Of Warm Up */}
                                        </View>

                                        <View className="skip_warm_up_button">
                                            <IconButton 
                                                icon_name="angle-right" 
                                                onPress={nextExercise}
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Creates Exercise */}
                                {!active_exercise.is_warm_up && (
                                    <View className="exercise" style={styles.exercise}>
                                        <View className="left" style={styles.left}>
                                            {/* Sets Exercise Title */}
                                            <Text 
                                                className="title" 

                                                style={[{
                                                    maxWidth: 350,
                                                    textAlign: "center",
                                                    color: SECONDARY_COLOR,
                                                }]}
                                            >
                                                {active_exercise.exercise}
                                            </Text> 

                                            <Text 
                                                className="reps" 

                                                style={[
                                                    styles.reps,
                                                    { color: SECONDARY_COLOR },
                                                ]}
                                            >
                                                {active_exercise.periods[current_set - 1] === 0 ? "Do zlyhania" : (
                                                    <>
                                                        {active_exercise.unit === "reps" && `${active_exercise.periods[current_set - 1]}x`}
                                                        {active_exercise.unit === "seconds" && getMinimalistFormattedTime(active_exercise.periods[current_set - 1] || 0)}
                                                        {active_exercise.unit === "steps" && `${active_exercise.periods[current_set - 1]}`}
                                                    </>
                                                )}
                                            </Text>

                                            {/* Sets Exercise Total Sets */}
                                            <Text 
                                                className="sets" 

                                                style={[
                                                    styles.sets,
                                                    { color: SECONDARY_COLOR },
                                                ]}
                                            >
                                                <Text className="current" style={styles.current}>{current_set}</Text>/<Text className="total" style={styles.total}>{String(active_exercise.periods.length || 1)}</Text>
                                            </Text> 
                                        </View>

                                        <View className="next_exercise_button">
                                            <IconButton 
                                                icon_name="angle-right" 
                                                onPress={handleNextStep}
                                            />
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </Animated.View>

                    <View className="bar_container" style={styles.bar_container}>
                        {active_training_plan_exercises.map((_, index:number) => {
                            const is_active:boolean = index === active_exercise_index // Stores The Information If The Bar Is Active
                            const is_completed:boolean = index < active_exercise_index // Stores The Information If The Bar Is Completed
                            let percentage:number = 0 // Stores The Percentage

                            if(is_completed) percentage = 100 // Sets The 100% If The Bar Is Completed
                            else if(is_active && active_exercise.periods.length > 0) percentage = (current_set / active_exercise.periods.length || 1) * 100 // Sets The Percentage

                            return (
                                <View 
                                    key={index} 
                                    className={is_active ? "bar active show" : "bar show"} // Adds Active Class For Bar Of Active Exercise
                                    // draggable = true
                                    style={styles.bar}
                                >
                                    <Text style={styles.bar_label}>{active_exercise.exercise}</Text>

                                    {index <= active_exercise_index && is_activity_started && (
                                        <AnimatedProgressBar 
                                            is_active={is_active}
                                            is_completed={is_completed}
                                            percentage={percentage}
                                            red={red}
                                        />
                                    )}
                                </View>
                            )
                        })}
                    </View>

                    <View className="current_activity_info" style={styles.current_activity_info}>
                        <Text style={styles.current_activity_info_text}>{is_xp_boost_available ? "Je dostupné navýšenie XP" : "Žiadne aktívne navýšenie XP"}</Text>
                    </View>
                </View>

                {/* Creates And Renders Training Plan Bars (Only If There Are More Than One Training Plan Available) */}
                {days.length > 1 && !is_activity_started && (
                    createTrainingPlanBars(days.length)
                )}
            </>
        )
    }

    // Function For Creating Bar Container With Amount Of Bars By Training Plans Amount
    const createTrainingPlanBars = (amount:number) => {
        return (
            <View className="training_plan_bar_container" style={styles.training_plan_bar_container}>
                {/* Creates Bars By Amount Of Training Plans */}
                {Array.from({ length: amount }).map((_, index:number) => (
                    // Creates Bar
                    <View 
                        key={index} 
                        className={index === active_training_plan_index ? "bar active" : "bar"} // Adds Active Class For Bar Of Active Training Plan
                        style={styles.training_plan_bar}
                    />
                ))}
            </View>
        )
    }

    // Function For Update The Tick
    const updateTick = ():void => {
        if(!start_time.current) return
        
        const now:number = Date.now() // Gets The Current Time
        const current_elapsed_time:number = accumulated_time.current + (now - start_time.current) // Gets The Current Elapsed Time
        
        setElapsedTime(current_elapsed_time) // Sets The Elapsed Time
    }

    // Function For Start Activity
    const startActivity = ():void => {
        if(is_activity_running) return
        
        setIsActivityRunning(true) // Sets The Information That The Activity Is Running
        setIsActivityStarted(true) // Sets The Information That The Activity Is Started
        start_time.current = Date.now() // Sets The Start Time
        interval.current = setInterval(updateTick, 1000) // Sets The Interval
    }

    // Function For Pause Activity
    const pauseActivity = ():void => {
        if(!is_activity_running) return

        setIsActivityRunning(false) // Sets The Information That The Activity Isn't Running

        if(start_time.current) {
            accumulated_time.current += Date.now() - start_time.current // Updates The Accumulated Time
            start_time.current = null // Resets The Start Time
        }

        if(interval.current) {
            clearInterval(interval.current) // Clears The Interval
            interval.current = null // Resets The Interval
        }
    }

    // Initializes The Clear Of The Interval
    useEffect(() => {
        return () => {
            if(interval.current) clearInterval(interval.current) // Clears The Interval
        }
    }, [])

    // Function For Stop Activity
    const stopActivity = ():void => {
        setIsActivityRunning(false) // Sets The Information That The Activity Isn't Running
        setIsActivityStarted(false) // Sets The Information That The Activity Isn't Started
 
        if(interval.current) {
            clearInterval(interval.current) // Clears The Interval
            interval.current = null // Resets The Interval
        }

        start_time.current = null // Sets The Start Time
        accumulated_time.current = 0 // Sets The Accumulated Time
        setElapsedTime(0) // Sets The Elapsed Time
    }

    // // Function For Stop Activity
    // export async function stopActivity(container:HTMLDivElement, playback:HTMLDivElement):Promise<void> {
    //     if(activity_summary.elapsed_time > 0) {
    //         const timer:HTMLHeadingElement = playback.querySelector(".timer") as HTMLHeadingElement // Gets The Playback Timer
    //         const elapsed_time:number = activity_summary.elapsed_time // Gets Activity Elapsed Time

    //         if(!container.querySelector(".no_logged_in")) {
    //             const gained_xp:number = Math.round(activity_summary.gained_xp) // Gets Gained XP From Activity
    //             const training_plan_summary:exercise[] = activity_summary.training_plan.map((one_exercise:exercise):exercise => ({ ...one_exercise, gained_xp: Math.round(one_exercise.gained_xp) })).filter((one_exercise:exercise):boolean => one_exercise.gained_xp > 0) // Gets Training Plan Summary With Rounded Gained XP Values (Only Exercises With Gained XP)

    //             const new_activity_data:{
    //                 elapsed_time:number,
    //                 gained_xp:number,
    //                 type:string|null,
    //                 day:number|null,
    //                 training_plan_summary:exercise[]|null
    //             } = {
    //                 elapsed_time, // Stores Formatted Elapsed Time
    //                 gained_xp, // Stores Gained XP
    //                 type: null, // Stores Training Plan Title
    //                 day: null, // Stores Training Plan Day
    //                 training_plan_summary: null // Stores The Training Plan Summary
    //             }

    //             // Commits Activity
    //             if(gained_xp > 0) {
    //                 if(!container.querySelector(".no_logged_in")) {
    //                     if(training_plan_summary.length > 0) {
    //                         const training_plan:HTMLDivElement = container.querySelector(".training_plan_container .training_plan") as HTMLDivElement // Gets The Training Plan
    //                         const training_plan_title:string = training_plan.dataset["title"] || "" // Gets Training Plan Title
    //                         const training_plan_day:number|null = Number(training_plan.dataset["day"]) || null // Gets Training Plan Day

    //                         new_activity_data.type = training_plan_title // Stores Training Plan Title
    //                         new_activity_data.day = training_plan_day // Stores Training Plan Day
    //                         new_activity_data.training_plan_summary = training_plan_summary // Stores The Training Plan Summary
    //                     }

    //                     try {
    //                         const new_activity_response:response = await sendPOST(window.location.pathname, new_activity_data, "new-activity") // Sends POST Data

    //                         // If The Response Isn't Success
    //                         if(!new_activity_response.success) {
    //                             displayMessage(new_activity_response.message, "error") // Displays The Error Message
    //                             return
    //                         }
    //                     }

    //                     catch {
    //                         displayMessage(gettext("Pri zaznamenávaní aktivity došlo k chybe."), "error") // Displays The Error Message
    //                     }

    //                     finally {
    //                         const todo:HTMLDivElement = document.querySelector(".todo") as HTMLDivElement // Gets The TODO Container
    //                         const official_tasks:HTMLDivElement = todo.querySelector(".official_tasks") as HTMLDivElement // Gets The Official Tasks Container
    //                         const tasks:HTMLDivElement = official_tasks.querySelector(".tasks") as HTMLDivElement // Gets The Tasks Container

    //                         const _2_activities:HTMLDivElement|null = tasks.querySelector("[data-task='2_activities']") || null // Gets The "Complete 2 Activities" Official Task If Is Available

    //                         const success_sound:HTMLAudioElement = todo.querySelector(".success_sound") as HTMLAudioElement // Gets The Success Sound

    //                         const training_plan:HTMLDivElement|null = container.querySelector(".training_plan_container .training_plan") as HTMLDivElement || null // Gets The Training Plan
    //                         const finish_training:HTMLDivElement|null = training_plan ? training_plan.querySelector(".finish_training") as HTMLDivElement : null // Gets The Finish Training Slide

    //                         if(_2_activities) {
    //                             const checkbox:HTMLDivElement = _2_activities.querySelector(".checkbox") as HTMLDivElement // Gets The Custom Checkbox Container

    //                             // If The Task Isn't Already Completed
    //                             if(!checkbox.classList.contains("checked")) {
    //                                 completeOfficialTask("2_activities", _2_activities, success_sound) // Completes The "Complete 2 Activities" Official Task
    //                             }
    //                         }

    //                         renderActivitySummary(elapsed_time, gained_xp) // Renders Activity Summary

    //                         // If User Has Completely Finished The Training Plan Activity
    //                         if(finish_training && finish_training.classList.contains("active")) {
    //                             const complete_training_plan_activity:HTMLDivElement|null = tasks.querySelector("[data-task='complete_training_plan_activity']") || null // Gets The "Complete Training Plan Activity" Official Task If Is Available

    //                             if(complete_training_plan_activity) {
    //                                 const checkbox:HTMLDivElement = complete_training_plan_activity.querySelector(".checkbox") as HTMLDivElement // Gets The Custom Checkbox Container

    //                                 // If The Task Isn't Already Completed
    //                                 if(!checkbox.classList.contains("checked")) {
    //                                     completeOfficialTask("complete_training_plan_activity", complete_training_plan_activity, success_sound) // Completes The "Complete Training Plan Activity" Official Task
    //                                 }
    //                             }
    //                         }

    //                         if(training_plan_summary.length > 0) {
    //                             renderTrainingPlanActivitySummary(training_plan_summary) // Renders Training Plan Activity Summary
    //                         }
    //                     }
    //                 }
    //             }
    //         }

    //         else renderActivitySummary(elapsed_time, 0) // Renders Activity Summary (If The User Isn't Logged In)

    //         pauseActivity(playback) // Pauses Activity

    //         // Stops Break Timer
    //         if(break_interval.interval) {
    //             clearInterval(break_interval.interval)
    //             break_interval.interval = null
    //         }

    //         activity_summary.elapsed_time = 0 // Resets Elapsed Time
    //         activity_summary.gained_xp = 0 // Resets Gained XP
    //         activity_summary.training_plan = [] // Resets Training Plan Activity Summary

    //         updateTimer(timer) // Resets Elapsed Time On The Playback Timer
    //         if(container.querySelector(".training_plan_container")) resetTrainingPlan(container) // Resets Training Plan
    //     }
    // }

    // Function For Animate The Slide Transition
    const animateSlideTransition = (next_slide:TrainingPlanSlide, next_index:number = active_exercise_index):void => {
        Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setTrainingPlanSlide(next_slide) // Sets The Training Plan Slide
            setActiveExerciseIndex(next_index) // Sets The Active Exercise Index
            setCurrentSet(1) // Sets The Current Set

            translateX.setValue(SCREEN_WIDTH)

            Animated.timing(translateX, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start()
        })
    }

    // Function For Start Training Plan
    const startTraining = ():void => {
        if(is_activity_running) return
        
        setIsActivityRunning(true) // Sets The Information That The Activity Is Running
        setIsActivityStarted(true) // Sets The Information That The Activity Is Started
        start_time.current = Date.now() // Sets The Start Time
        interval.current = setInterval(updateTick, 1000) // Sets The Interval

        animateSlideTransition("exercise", 0) // Animates The Slide Transition To The First Exercise
    }

    // Function For Handle Next Step (Increases The Current Set Or Goes To Next Exercise)
    const handleNextStep = (): void => {
        let current_red:number = red // Redeclare The Red
        
        if(current_set < active_exercise.periods.length) {
            setCurrentSet((previous_set) => previous_set + 1) // Increases The Current Set
            setRed(current_red -= (255 - MIN_RED) / (all_sets - 1)) // Makes Color Transition For Progress Bar From rgb(255, 207, 32) To rgb(82, 207, 32)
        }

        else nextExercise() // Goes To Next Exercise
    }

    // Function For Change Exercises In The Training Plan
    const nextExercise = ():void => {
        let current_red:number = red // Redeclare The Red
        setRed(current_red -= (255 - MIN_RED) / (all_sets - 1)) // Makes Color Transition For Progress Bar From rgb(255, 207, 32) To rgb(82, 207, 32)

        const sets_amount:number = active_exercise.periods.length || 1 // Gets Total Amount Of Sets Of The Active Exercise

        const next_active_exercise_index:number = active_exercise_index + 1 // Gets The Next Active Exercise Index

        // Exercises Break Slide
        if(current_set === sets_amount && active_exercise_index < active_training_plan_exercises.length - 1) {
            animateSlideTransition("break", next_active_exercise_index) // Animates The Slide Transition To The Next Exercise
            // exercisesBreak(container)
        }

        else if(next_active_exercise_index < active_training_plan_exercises.length) {
            animateSlideTransition("exercise", next_active_exercise_index) // Animates The Slide Transition To The Next Exercise
        } 
        
        else {
            setIsActivityRunning(false) // Sets The Information That The Activity Isn't Running
            if(interval.current) clearInterval(interval.current) // Clears The Interval

            animateSlideTransition("finish_training") // Animates The Slide Transition To The Finish Training
        }
    }

    // // Function For Skip Exercises Break
    // export function skipBreak(container:HTMLDivElement):void {
    //     const exercises:NodeListOf<HTMLDivElement> = container.querySelectorAll<HTMLDivElement>(".training_plan_container .training_plan .exercise"); // Gets All Training Plan Exercises
    //     const exercises_break:HTMLDivElement = container.querySelector(".training_plan_container .training_plan .break") as HTMLDivElement // Gets The Break Slide
    //     const break_countdown:HTMLParagraphElement = exercises_break.querySelector(".break_timer p") as HTMLParagraphElement // Gets The Break Countdown

    //     // Stops Break Timer
    //     if(break_interval.interval) {
    //         clearInterval(break_interval.interval)
    //         break_interval.interval = null
    //     }

    //     break_interval.max_remaining_time = 120 // Sets Max Break Remaining Time Back To Default
    //     break_interval.remaining_time = 120 // Sets Max Break Remaining Time Back To Default

    //     break_countdown.style.color = "#ffffff" // Sets Break Countdown Color To White

    //     training_plan_state.active_exercise_index += 1; // Changes Active Exercise Index

    //     (exercises[training_plan_state.active_exercise_index] as HTMLDivElement).classList.add("active"); // Shows Active Exercise
    //     (exercises[training_plan_state.active_exercise_index] as HTMLDivElement).inert = false // Enables Focus
        
    //     nextExercise(container) // Next Exercise

    //     exercises_break.classList.remove("active") // Hides Break Between Sets Tab
    //     exercises_break.inert = true // Disables Focus
    // }

    return (
        <View 
            className="training_section activity_section" 

            style={[
                styles.training_section,
                styles.activity_section
            ]}
        >
            <View className="activity" style={styles.activity}>
                <View className="record_activity" style={styles.record_activity}>
                    <Text className="timer" style={styles.timer}><Text className="hours" style={styles.timer_part}>{getFormattedTime("hours", elapsed_time / 1000, true)}</Text>:<Text className="minutes" style={styles.timer_part}>{getFormattedTime("minutes", elapsed_time / 1000, true)}</Text>:<Text className="seconds" style={styles.timer_part}>{getFormattedTime("seconds", elapsed_time / 1000, true)}</Text></Text>

                    <View className="buttons" style={styles.buttons}>
                        <Pressable 
                            className="play" 
                            onPress={!is_activity_running ? startActivity : pauseActivity}
                            style={styles.play}
                        >
                            <FontAwesome6
                                name={is_activity_running ? "pause" : "play"}
                                size={40}
                                color={SECONDARY_COLOR}
                                style={is_activity_running ? styles.pause_icon : styles.play_icon}
                            />
                        </Pressable>

                        <Pressable 
                            className="stop" 
                            onPress={stopActivity}
                            style={styles.stop}
                        >
                            <FontAwesome6
                                name="stop"
                                size={40}
                                color={SECONDARY_COLOR}
                                style={styles.stop_icon}
                            />
                        </Pressable>
                    </View>
                </View>

                {training_plans_exercises.length === 0 && (
                    <>
                        {!logged_in_user && (
                            <View className="no_logged_in">
                                <Text>Zdá sa, že nie ste prihlásený.</Text>
                                <Text>Bez prihlásenia nie je možné ukladať vašu aktivitu.</Text>

                                <Pressable 
                                    // onPress={() => setActiveForm("login_form")}
                                    accessibilityLabel="Prihlásiť sa"
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                // styles.login,
                                                pressed && { textDecorationLine: "underline" } 
                                            ]}
                                        >
                                            Prihláste sa.
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        )}

                        {logged_in_user && (
                            <View className="no_training_plan" style={styles.no_training_plan}>
                                <Text>Zatiaľ nemáte žiaden tréningový plán.</Text>

                                <Pressable 
                                    // onPress={}
                                    accessibilityLabel="Moje tréningové plány"
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                styles.link,
                                                pressed && { textDecorationLine: "underline" } 
                                            ]}
                                        >
                                            Vytvorte si prvý.
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        )}

                        {/* <script src="{% static 'app/ts/dist/pages/training_session/components/basic_training_session.js' %}" type="module"></script> */}
                    </>
                )}

                {training_plans_exercises.length > 0 && (
                    <View className="training_plan_container" style={styles.training_plan_container}>
                        {active_training_plan_exercises && active_training_plan_exercises.length > 0 && (
                            generateTrainingPlan() // Generates The Training Plan
                        )}
                    </View>

                    // <script src="{% static 'app/ts/dist/pages/training_session/components/training_session.js' %}" type="module"></script>
                    // <script src="{% static 'app/ts/dist/pages/training_session/components/todo.js' %}" type="module"></script>
                )}

                <View className="previous_activity" style={styles.previous_activity}>
                    <View className="top" style={styles.top}>
                        <View className="average_activity_time_container" style={styles.average_activity_time_container}>
                            <Text>
                                <FontAwesome6
                                    name="clock"
                                    size={20}
                                    color={BLUE_COLOR}
                                />

                                <Text className="title" style={styles.average_activity_time_title}>priemer&nbsp;/ 7&nbsp;dní</Text>
                                {/* <Text style={styles.average_activity_time}>{average_activity_time ? average_activity_time_formatted : "0"}</Text> */}
                            </Text>
                        </View>

                        <View className="activities_amount_container" style={styles.activities_amount_container}>
                            <Text>
                                <FontAwesome6
                                    name="calendar"
                                    size={20}
                                    solid={false}
                                    color={BLUE_COLOR}
                                />

                                <Text className="title" style={styles.activities_amount_title}>počet&nbsp;/ 7&nbsp;dní</Text>
                                <Text className="activities_amount" style={styles.activities_amount}>{activity_data && activity_data.activities_amount ? activity_data.activities_amount : "0"}</Text>
                            </Text>
                        </View>
                    </View>

                    <View className="bottom" style={styles.bottom}>
                        <View className="latest_activity_container">
                            <View 
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 5,
                                }}
                            >
                                <FontAwesome6
                                    name="list"
                                    size={20}
                                    color={BLUE_COLOR}
                                />

                                {activity_data && activity_data.latest_activity && (
                                    <>
                                        <Text style={styles.latest_activity_text}>{getMinimalistFormattedTime(activity_data.latest_activity.elapsed_time)}</Text>
                                        <Text className="xp" style={styles.latest_activity_text}>{activity_data.latest_activity.gained_xp}XP</Text>
                                        <Text style={styles.latest_activity_text}>{getFormattedDate(activity_data.latest_activity.end_time)}</Text>
                                    </>
                                )}

                                {!activity_data || !activity_data.latest_activity && (
                                    <>
                                        <Text className="no_latest_activity" style={styles.no_latest_activity}>posledná aktivita: </Text>
                                        <Text className="none" style={styles.latest_activity_text}>žiadna</Text>
                                    </>
                                )}
                            </View>
                        </View>

                        <View className="longest_activity_container">
                            <View 
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 5,
                                }}
                            >
                                <FontAwesome6
                                    name="medal"
                                    size={20}
                                    color={BLUE_COLOR}
                                />

                                {activity_data && activity_data.longest_activity && (
                                    <>
                                        <Text style={styles.longest_activity_text}>{getMinimalistFormattedTime(activity_data.longest_activity.elapsed_time)}</Text>
                                        <Text className="xp" style={styles.xp}>{activity_data.longest_activity.gained_xp}XP</Text>
                                        <Text style={styles.longest_activity_text}>{getFormattedDate(activity_data.longest_activity.end_time)}</Text>
                                    </>
                                )}

                                {!activity_data || !activity_data.longest_activity && (
                                    <>
                                        <Text className="no_longest_activity" style={styles.no_latest_activity}>najdlhšia aktivita: </Text>
                                        <Text className="none" style={styles.none}>žiadna</Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    training_section: {
        position: "relative",
        marginHorizontal: "auto",
        marginBottom: 50,
        overflow: "visible",
    },

    activity_section: {
        width: "100%",
    },

    activity: {
        alignItems: "center",
        justifyContent: "center",
        maxWidth: "100%",
        width: "100%",
        minHeight: "auto",
        marginHorizontal: "auto",
    },

    record_activity: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        marginBottom: 20,
        paddingTop: 20,
        paddingHorizontal: 50,
        paddingBottom: 30,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
    },

    timer: {
        marginBottom: 20,
        // font-family: $timer-font;
        fontSize: 60,
        // font-weight: lighter;
        color: SECONDARY_COLOR,
        // white-space: nowrap;
        // text-shadow: 0 0 40px transparentize($secondary-color, 0.8);
        letterSpacing: 2,
    },

    timer_part: {
        // font-variant-numeric: tabular-nums;
        // display: inline-block;
        width: 80,
        // font-family: inherit;
        // font-size: inherit;
    },

    buttons: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        width: "100%",
    },

    play: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        color: LIGHT_BLUE_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // outline: none;
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: scale(1.05);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }
    },

    // .play {
    //     @include glow_animated_border;
    //     background: linear-gradient(135deg, transparentize($blue-color, 0.35), transparentize($dark-blue-color, 0.55));
    //     border-color: $blue-color;

    //     &:hover,
    //     &:focus-visible {
    //         background: linear-gradient(135deg, transparentize($blue-color, 0.15), transparentize($dark-blue-color, 0.45));
    //     }
    // }

    play_icon: {
        fontSize: 40,
        color: SECONDARY_COLOR,
    },

    pause_icon: {
        fontSize: 40,
        color: SECONDARY_COLOR,
    },

    stop: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        color: LIGHT_BLUE_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        // outline: none;
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
                // background-color: transparentize($dark-blue-color, 0.8);
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: scale(1.05);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }
    },

    stop_icon: {
        fontSize: 40,
        color: BLUE_COLOR,
    },

    no_training_plan: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginBottom: 40,
        paddingVertical: 20,
        paddingHorizontal: 10,
        textAlign: "center",
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
    },

    link: {
        color: SECONDARY_COLOR,
        fontStyle: "italic",
    },

    training_plan_container: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        marginBottom: 40,
    },

    training_plan: {
        // @include animated_border;
        position: "relative",
        width: "100%",
        // height: 250,
        height: 500,
        borderRadius: MEDIUM_BORDER_RADIUS,
        // shadowColor: BLUE_COLOR,
        // shadowOffset: { width: 0, height: 10 },
        // shadowOpacity: 0.2,
        // shadowRadius: 30,
        // elevation: 10,
        overflow: "hidden",

        // &.blur {
        //     animation: blur 0.3s ease-out;
        // }
    },

    start_training: {
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        paddingVertical: 50,
        paddingHorizontal: 10,
        zIndex: 100,
    },

    finish_training: {
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        paddingVertical: 50,
        paddingHorizontal: 10,
        zIndex: 100,
    },

    exercise: {
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        paddingVertical: 50,
        paddingHorizontal: 10,
        zIndex: 100,
    },

    reps: {
        // font-family: $article-heading-font;
        textAlign: "center",
        fontSize: 22,
    },

    sets: {
        // font-family: $article-heading-font;
        textAlign: "center",
        fontSize: 22,
    },

    current: {
        // font-family: $article-heading-font;
        fontSize: 22,
    },

    total: {
        // font-family: $article-heading-font;
        fontSize: 22,
    },

    left: {
        opacity: 1,
        // transition: opacity 0.5s ease;
    },

    text: {
        textAlign: "center",
        color: transparentize(SECONDARY_COLOR, 0.5),
        textTransform: "uppercase",
        letterSpacing: 1,

        // &:first-child {
        //     margin-bottom: 5px;
        // }
    },

    title: {
        // font-family: $article-heading-font;
        textAlign: "center",
        fontSize: 40,
        color: SECONDARY_COLOR,
    },

    warm_up: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 200,
        paddingTop: 10,
        paddingHorizontal: 50,
        // transition: transform 0.5s ease;
        zIndex: 100,

        // &:not(.active) {
        //     position: absolute;
        //     top: 0px;
        //     transform: translateX(100%);

        //     .left {
        //         opacity: 0;
        //     }
        // }

        // .title {
        //     width: 50px;
        // }
    },

    warm_up_timer: {
        position: "relative",
        width: 100,
        height: 100,
        borderRadius: 50,

        // svg {
        //     position: absolute;
        //     top: 50%;
        //     left: 50%;
        //     transform: rotate(-90deg) translate(50%, -50%);
    
        //     &:nth-child(1) {
        //         z-index: 10;
        //     }
    
        //     .progress {
        //         fill: none;
        //         stroke-width: 5;
        //         stroke-linecap: round;
        //         stroke-linejoin: round;
        //     }
    
        //     .progress_background {
        //         fill: none;
        //         stroke: $blue-color;
        //         stroke-width: 3;
        //         stroke-dasharray: 2 4;
        //     }
        // }
    },

    warm_up_timer_text: {
        position: "absolute",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        color: SECONDARY_COLOR,
        // font-family: $timer-font;
        fontSize: 22,

        // span {
        //     font-family: inherit;
        //     font-size: inherit;
        // }
    },

    bar_container: {
        position: "relative",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        marginTop: "auto",
        marginHorizontal: 10,
    },

    bar: {
        // --progress: 0%;
        // --progress-color: rgb(255, 207, 32);

        position: "relative",
        flex: 1,
        height: 10,
        borderWidth: 1,
        borderColor: transparentize(SECONDARY_COLOR, 0.8),
        borderRadius: 10 / 2,
    },

    bar_progress: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "0%",
        height: "100%",
        borderRadius: 10 / 2,
    },

    bar_progress_active: {
        // width: var(--progress);
        // background-color: var(--progress-color);
        // shadowColor: var(--progress-color),
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
        // transition: width 0.5s linear, background-color 0.5s ease;
    },

    bar_label: {
        pointerEvents: "none",
        opacity: 0,
        // content: attr(data-exercise);
        position: "absolute",
        top: -5,
        left: "50%",
        transform: [{ translateX: "-50%" }],
        // width: calc(100% + 10px)
        textAlign: "center",
        fontSize: 15,
        lineHeight: 15,
        color: transparentize(SECONDARY_COLOR, 0.5),
        // text-overflow: ellipsis;
        // overflow: hidden;
        // transition: opacity 0.3s ease, transform 0.3s ease;
    },

    // &.show {
    //     bar_label {
    //         opacity: 0.5;
    //         transform: translate(-50%, -100%);
    //     }
    // }

    current_activity_info: {
        // --progress: 100%;

        position: "relative",
        marginVertical: 10,
        // textAlign: "center",
        // font-family: $article-heading-font;
        zIndex: 100,
    },

    current_activity_info_progress: {
        position: "absolute",
        top: "50%",
        left: 10,
        transform: [{ translateY: "-50%" }],
        // width: calc(100% - 20px - var(--progress));
        height: 1,
        backgroundColor: transparentize(BLUE_COLOR, 0.5),
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
        zIndex: -1,
    },

    current_activity_info_text: {
        // font-family: $article-heading-font;
        textAlign: "center",
        color: transparentize(SECONDARY_COLOR, 0.5),
        opacity: 0.5,
    },

    current_activity_info_icon: {
        color: BLUE_COLOR,
        textShadowColor: BLUE_COLOR,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 5,
    },

    training_plan_bar_container: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        width: "100%",
        marginTop: 10,
    },

    training_plan_bar: {
        flex: 1,
        height: 10,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: 10 / 2,
        // transition: background-color 0.3s ease;

        // &.active,
        // &:hover {
        //     cursor: pointer;
        //     background-color: $blue-color;
        //     box-shadow: 0px 0px 10px $blue-color;
        // }
    },

    previous_activity: {
        maxWidth: "100%",
        width: "100%",
        marginTop: 10,
    },

    top: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 15,
        marginBottom: 15,
    },

    average_activity_time_container: {
        width: "100%",
        paddingVertical: 20,
        paddingHorizontal: 10,
        textAlign: "center",
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
    },

    average_activity_time_title: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        fontSize: 15,
        textAlign: "center",
        color: transparentize(SECONDARY_COLOR, 0.5)
    },

    average_activity_time: {
        marginTop: 15,
        lineHeight: 1,
        fontSize: 25,
        fontWeight: "semibold",
        color: BLUE_COLOR,
        // white-space: nowrap;
    },

    activities_amount_container: {
        width: "100%",
        paddingVertical: 20,
        paddingHorizontal: 10,
        textAlign: "center",
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
    },

    activities_amount_title: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        fontSize: 15,
        textAlign: "center",
        color: transparentize(SECONDARY_COLOR, 0.5)
    },

    activities_amount: {
        marginTop: 15,
        lineHeight: 1,
        fontSize: 25,
        fontWeight: "semibold",
        color: BLUE_COLOR,
        // white-space: nowrap;
    },

    bottom: {
        padding: 15,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
    },

    latest_activity_text: {
        textAlign: "center",
        // white-space: nowrap;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    no_latest_activity: {
        // white-space: normal;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    longest_activity_text: {
        textAlign: "center",
        // white-space: nowrap;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    no_longest_activity: {
        // white-space: normal;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    xp: {
        fontSize: 22,
        fontWeight: "semibold",
        color: BLUE_COLOR,
    },

    none: {
        fontSize: 22,
        fontWeight: "semibold",
        color: BLUE_COLOR,
    },
})

//     .training_plan_container {
//             .start_training, 
//             .exercise,
//             .finish_training,
//             .break,
//             .warm_up {
//                 .start_training_button,
//                 .next_exercise_button,
//                 .finish_training_button,
//                 .add_time,
//                 .skip_break_button,
//                 .skip_warm_up_button {
//                     @include blue_button(50px);
//                     position: relative;

//                     .fa-play,
//                     .fa-angle-right,
//                     .fa-plus,
//                     .fa-stop {
//                         @include position_center;
//                         font-size: 2em;
//                         color: $blue-color;
//                     }

//                     .fa-play {
//                         left: calc(50% + 2.5px);
//                     }
//                 }
//             }

//             .exercise {
//                 .left {
//                     .title {
//                         max-width: 350px;
//                     }

//                     .reps,
//                     .sets {
//                         font-family: $article-heading-font;
//                         font-size: 1.2em;
    
//                         .current,
//                         .total {
//                             font-family: inherit;
//                             font-size: inherit;
//                         }
//                     }
//                 }
//             }



// .activity_summary {
//     @include flex_center($direction: column);
//     display: none;
//     position: fixed;
//     top: 0px;
//     left: 0px;
//     width: 100%;
//     gap: 20px;
//     min-height: 100vh;
//     padding: 125px + 20px 20px 40px;
//     text-align: center;
//     background: transparentize($main-color, 0.85);
//     backdrop-filter: blur(10px);
//     overflow-y: auto;
//     z-index: 2500;

//     .main_summary {
//         font-family: $article-heading-font;
//         font-size: 1.5em;

//         span {
//             position: relative;
//             font-family: inherit;

//             .tooltip {
//                 @include tooltip($top: -5px)
//             }
//         }
//     }

//     .weekly_activity_chart {
//         display: none;
//         width: 500px;
//         max-width: 90vw;
//         height: 250px;
//         padding: 20px;
//         background: $training-surface;
//         border: 1px solid $training-surface-border;
//         border-radius: $medium-border-radius;

//         canvas {
//             width: 100% !important;
//             height: 100% !important;
//         }
//     }

//     .training_plan_summary {
//         display: none;
//         font-family: $article-heading-font;

//         span {
//             font-family: inherit;
//         }

//         br:nth-child(1) {
//             display: none;
//         }
//     }

//     .training_plan_summary_chart {
//         position: relative;
//         display: none;
//         width: 250px;
//         height: 250px;
//         padding: 15px;
//         background: $training-surface;
//         border: 1px solid $training-surface-border;
//         border-radius: 50%;

//         &::before {
//             @include position_center;
//             content: "%";
//             font-family: $article-heading-font;
//             font-size: 2.5em;
//             font-weight: bold;
//             color: $blue-color;
//         }

//         canvas {
//             width: 100% !important;
//             height: 100% !important;
//         }
//     }
// }