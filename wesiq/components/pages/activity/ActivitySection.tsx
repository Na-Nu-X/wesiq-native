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
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { randomColor } from "@/utils/randomColor"
import { BasicResponse } from "@/components/Feed"
import { WarmUp } from "./WarmUp"
import { useTranslation } from "react-i18next"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"
import type { Activity } from "./HistorySection"
import type { OfficialTask } from "./TasksSection"
import type { Day } from "../manage_training_plans/DaySelectMenu"

export interface TrainingPlanExercise {
    id:number,
    training_plan_key:string,
    day:Day|null,
    type:string,
    exercise:string,
    periods:number[],
    unit:"reps"|"seconds"|"steps",
    order:number,
    is_warm_up:boolean,
    is_custom_exercise:boolean
}

interface XpBoostResponse {
    success:boolean,
    xp_boost_expiration_time:string|null,
    is_xp_boost_available:boolean,
    is_xp_boost_active:boolean,
    message:string
}

interface UsedXpBoostResponse {
    success:boolean,
    xp_boost_expiration_time:string,
    message:string
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

export interface LoadedTrainingPlansResponse {
    success:boolean,
    training_plans:TrainingPlanExercise[],
    message:string
}

interface TrainingPlanSummaryExercise {
    exercise:string,
    elapsed_time:number,
    gained_xp:number,
    color:string
}

type TrainingPlanSlide = "start_training"|"exercise"|"finish_training"|"break" // Types The Training Plan Slide

interface ActivitySectionProps {
    onElapsedTimeUpdate:(elapsed_time:number) => void,
    elapsed_time:number,
    onAverageActivityTimeLoad:(average_activity_time:number) => void,
    official_tasks:OfficialTask[],
    onCompleteOfficialTask:(task_data:string) => void
}

export default function ActivitySection({ onElapsedTimeUpdate, elapsed_time, onAverageActivityTimeLoad, official_tasks, onCompleteOfficialTask }:ActivitySectionProps) {
    const { t } = useTranslation() // Initializes The Translations

    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    
    const [active_training_plan_index, setActiveTrainingPlanIndex] = useState<number>(0) // Stores The Active Training Plan Index
    const [active_exercise_index, setActiveExerciseIndex] = useState<number>(0) // Stores The Active Exercise Index
    const [training_plans_exercises, setTrainingPlansExercises] = useState<TrainingPlanExercise[]>([]) // Stores The Training Plans Exercises
    const [are_training_plans_loading, setAreTrainingPlansLoading] = useState(false) // Stores The Information If Training Plans Are Loading
    const [training_plan_slide, setTrainingPlanSlide] = useState<TrainingPlanSlide>("start_training") // Stores The Training Plan Slide
    const [current_set, setCurrentSet] = useState<number>(1) // Stores The Current Set
    const [red, setRed] = useState<number>(255) // Starting Progress Bar Color rgb(255, 207, 32)
    const [reset_bar_index, setResetBarIndex] = useState<number|null>(null) // Stores The Reset Bar Index

    const [current_exercise_start_time, setCurrentExerciseStartTime] = useState<number|null>(null) // Stores The Start Time Of The Current Exercise
    const [exercises_duration, setExercisesDuration] = useState<{ exercise_index:number, elapsed_time:number, start_time:number }[]>([]) // Stores The Spent Time In Each Exercise
    
    const [is_xp_boost_available, setIsXpBoostAvailable] = useState<boolean>(false) // Stores The Information If The XP Boost Is Available
    const [is_xp_boost_active, setIsXpBoostActive] = useState<boolean>(false) // Stores The Information If The XP Boost Is Active
    const [xp_boost_amount, setXpBoostAmount] = useState<number>(2) // Stores The XP Boost Amount
    const [xp_boost_progress, setXpBoostProgress] = useState<number>(100) // Stores The XP Boost Progress (Remaining Time)
    const [xp_boost_expiration_time, setXpBoostExpirationTime] = useState<string|null>() // Stores The XP Boost Expiration Time
    
    const [activity_data, setActivityData] = useState<ActivityData|null>(null) // Stores The Activity Data
    
    const [is_activity_running, setIsActivityRunning] = useState<boolean>(false) // Stores The Information If The Activity Is Running
    const [is_activity_started, setIsActivityStarted] = useState<boolean>(false) // Stores The Information If The Activity Is Started
    const [is_basic_activity_started, setIsBasicActivityStarted] = useState<boolean>(false) // Stores The Information If The Basic Activity Is Started (Without The Training Plan)

    const start_time = useRef<number|null>(null) // Stores The Start Time
    const accumulated_time = useRef<number>(0) // Stores The Accumulated Time
    const interval = useRef<ReturnType<typeof setInterval>|null>(null) // Stores The Interval

    // Gets The Grouped Training Plans Exercises
    const grouped_training_plans_exercises:(Day|string)[] = [...new Set(
        training_plans_exercises.map((one_exercise:TrainingPlanExercise) => 
            one_exercise.day !== null ? one_exercise.day : one_exercise.training_plan_key
        )
    )]

    const selected_day_or_training_plan_key:Day|string|null = grouped_training_plans_exercises[active_training_plan_index] || null // Selects Current Or Upcoming Day Of Training Plan

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
        return ordered_exercises.filter(one_exercise => 
            typeof selected_day_or_training_plan_key === "number" 
                ? one_exercise.day === selected_day_or_training_plan_key // If The Day Is Selected
                : one_exercise.training_plan_key === selected_day_or_training_plan_key // If The Day Isn't Selected
        )
    }, [ordered_exercises, selected_day_or_training_plan_key])

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
    
            // Sends The GET Request To The Server
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
    
            // Sends The GET Request To The Server
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
                Alert.alert(t("Chyba"), t("Pri získavaní tréningových plánov došlo k chybe.")) // Shows The Alert
                return
            }

            const loaded_training_plans_data:LoadedTrainingPlansResponse = await loaded_training_plans_response.json() // Gets The Loaded Training Plans Data

            // If The Response Isn't Success
            if(!loaded_training_plans_data.success) {
                Alert.alert(t("Chyba"), loaded_training_plans_data.message) // Shows The Alert
                return
            }
            
            else {
                setTrainingPlansExercises(loaded_training_plans_data.training_plans) // Sets The Training Plans Exercises
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri získavaní tréningových plánov došlo k chybe.")) // Shows The Alert
        } 
        
        finally {
            setAreTrainingPlansLoading(false) // Stores The Information That Training Plans Aren't Loading
        }
    }

    // Initializes The Load Of The Training Plans
    useEffect(() => {
        getTrainingPlansExercises() // Gets The Training Plans Exercises
    }, [])

    // Function For Get The XP Boost
    const getXpBoost = async ():Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Informácie o dostupnom navýšení XP nie je možné získať bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const xp_boost_response:Response = await fetch(`${API_URL}/get-xp-boost/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!xp_boost_response.ok) {
                Alert.alert(t("Chyba"), t("Pri získavaní informácie o dostupnom navýšení XP došlo k chybe.")) // Shows The Alert
                return
            }

            const xp_boost_data:XpBoostResponse = await xp_boost_response.json() // Gets The Loaded XP Boost Data

            // If The Response Isn't Success
            if(!xp_boost_data.success) {
                Alert.alert(t("Chyba"), xp_boost_data.message) // Shows The Alert
                return
            }
            
            else {
                setXpBoostExpirationTime(xp_boost_data.xp_boost_expiration_time || null) // Sets The XP Boost Expiration Time
                setIsXpBoostAvailable(xp_boost_data.is_xp_boost_available) // Sets The Information If The XP Boost Is Available
                setIsXpBoostActive(xp_boost_data.is_xp_boost_active) // Sets The Information If The XP Boost Is Active
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri získavaní informácie o dostupnom navýšení XP došlo k chybe.")) // Shows The Alert
        }
    }

    // Initializes The Load Of The XP Boost
    useEffect(() => {
        getXpBoost() // Gets The XP Boost
    }, [])

    // Function For Use The XP Boost
    const useXpBoost = async ():Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Navýšenie XP nie je možné uplatniť bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const used_xp_boost_response:Response = await fetch(`${API_URL}/use-xp-boost/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!used_xp_boost_response.ok) {
                Alert.alert(t("Chyba"), t("Pri uplatňovaní navýšenia XP došlo k chybe.")) // Shows The Alert
                return
            }

            const used_xp_boost_data:UsedXpBoostResponse = await used_xp_boost_response.json() // Gets The Loaded XP Boost Data

            // If The Response Isn't Success
            if(!used_xp_boost_data.success) {
                Alert.alert(t("Chyba"), used_xp_boost_data.message) // Shows The Alert
                return
            }
            
            else {
                setXpBoostExpirationTime(used_xp_boost_data.xp_boost_expiration_time) // Sets The XP Boost Expiration Time
                setIsXpBoostAvailable(false) // Sets The Information If The XP Boost Isn't Available
                setIsXpBoostActive(true) // Sets The Information If The XP Boost Is Active
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri uplatňovaní navýšenia XP došlo k chybe.")) // Shows The Alert
        }
    }

    // Initializes The Use Of The Available XP Boost
    useEffect(() => {
        if(is_activity_started && is_xp_boost_available) useXpBoost() // Uses The XP Boost
    }, [is_activity_started])

    // Initializes The XP Boost Timer
    useEffect(() => {
        let xp_boost_interval:ReturnType<typeof setInterval>|null = null // Stores The XP Boost Interval
    
        if(is_activity_started && xp_boost_expiration_time) {
            const xp_boost_expiration_time_ms:number = new Date(xp_boost_expiration_time).getTime() // Gets The XP Boost Expiration Time In MS
            const MAX_REMAINING_TIME:number = 60 * 30 * 1000 // Defines The Maximum Remaining Time (30 Minutes)
    
            if(xp_boost_expiration_time_ms > Date.now()) {
                const initial_remaining_time:number = xp_boost_expiration_time_ms - Date.now() // Gets The Initial Remaining Time
                setXpBoostProgress((initial_remaining_time / MAX_REMAINING_TIME) * 100) // Sets XP Boost Progress
                
                xp_boost_interval = setInterval(() => {
                    const current_time:number = Date.now() // Gets The Current Time
                    const remaining_time:number = xp_boost_expiration_time_ms - current_time // Gets The Remaining Time
    
                    // Stops XP Boost Timer When Remaining Time Pass
                    if(remaining_time <= 0) {
                        setIsXpBoostAvailable(false) // Sets The Information That The XP Boost Isn't Available
                        setIsXpBoostActive(false) // Sets The Information That The XP Boost Isn't Active
                        setXpBoostAmount(1) // Resets XP Boost Amount
                        setXpBoostProgress(0) // Sets XP Boost Progress
                        if(xp_boost_interval) clearInterval(xp_boost_interval) // Clears The XP Boost Interval
                    } 
                    
                    else {
                        const current_progress:number = (remaining_time / MAX_REMAINING_TIME) * 100 // Gets The Current Progress
                        setXpBoostProgress(current_progress) // Sets The XP Boost Progress
                    }
                }, 1000)
    
            } 

            else {
                setIsXpBoostAvailable(false) // Sets The Information That The XP Boost Isn't Available
                setIsXpBoostActive(false) // Sets The Information That The XP Boost Isn't Active
                setXpBoostProgress(0) // Sets The XP Boost Progress
            }
        }
    
        return () => {
            if(xp_boost_interval) clearInterval(xp_boost_interval) // Clears The XP Boost Interval
        }
    }, [xp_boost_expiration_time, is_activity_started])

    // Function For Get The Activity Data
    const getActivity = async ():Promise<void> => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
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
                Alert.alert(t("Chyba"), t("Pri získavaní dát o aktivite užívateľa došlo k chybe.")) // Shows The Alert
                return
            }

            const loaded_activity_data:LoadedActivityResponse = await loaded_activity_response.json() // Gets The Loaded Activity Data

            // If The Response Isn't Success
            if(!loaded_activity_data.success || !loaded_activity_data.activity) {
                Alert.alert(t("Chyba"), loaded_activity_data.message) // Shows The Alert
                return
            }
            
            else {
                setActivityData(loaded_activity_data.activity) // Sets The Activity Data
                onAverageActivityTimeLoad(loaded_activity_data.activity.average_activity_time) // Sets The Average Activity Time
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri získavaní dát o aktivite užívateľa došlo k chybe.")) // Shows The Alert
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
                                    <Text style={styles.text}>{t("Tréningový plán")}</Text>
                                    <Text style={styles.text}>{t("Začať tréning")}</Text>

                                    <Text className="title" style={styles.title}>{selected_day_or_training_plan_key && typeof selected_day_or_training_plan_key === "number" ? `${ordered_exercises[active_exercise_index].type || "Tréning"} - ${getDayName(selected_day_or_training_plan_key)}` : ordered_exercises[active_exercise_index].type || t("Tréning")}</Text> {/* Sets Training Plan Title On The Start Training Slide */}
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
                                    <Text style={styles.text}>{t("Tréningový plán")}</Text>
                                    <Text style={styles.text}>{t("Dokončiť tréning")}</Text>

                                    <Text className="title" style={styles.title}>{ordered_exercises[active_exercise_index].type || t("Tréning")}</Text> {/* Sets Training Plan Title On The Finish Training Slide */}
                                </View>

                                <View className="finish_training_button">
                                    <IconButton 
                                        icon_name="stop"
                                        onPress={stopTrainingPlanActivity}
                                    />
                                </View>
                            </View>
                        )}

                        {training_plan_slide === "break" && (<Break time={180} skipBreak={skipBreak} />)}

                        {training_plan_slide === "exercise" && active_exercise && (
                            <>
                                {active_exercise.is_warm_up && (<WarmUp time={active_exercise.periods[0]} skipWarmUp={nextExercise} />)} {/* Creates Warm Up */}

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
                                                {active_exercise.periods[current_set - 1] === 0 ? t("Do zlyhania") : (
                                                    <>
                                                        {active_exercise.unit === "reps" && `${active_exercise.periods[current_set - 1]}x`}
                                                        {active_exercise.unit === "seconds" && String(getMinimalistFormattedTime(active_exercise.periods[current_set - 1]).trim() || 0)}
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
                        {active_training_plan_exercises.map((one_exercise:TrainingPlanExercise, index:number) => {
                            const effective_active_index = reset_bar_index !== null ? reset_bar_index : active_exercise_index
                            const is_active:boolean = index === effective_active_index // Stores The Information If The Bar Is Active
                            const is_completed:boolean = index < effective_active_index // Stores The Information If The Bar Is Completed
                            const is_break_slide_active:boolean = (training_plan_slide === "break" && is_active) // Checks If Is The Break Slide Active
                            let percentage:number = 0 // Stores The Percentage

                            if(reset_bar_index !== null) {
                                if(is_completed) percentage = 100
                                else percentage = 0
                            }
                            
                            else {
                                if(is_completed || is_break_slide_active) percentage = 100 // Sets The 100% If The Bar Is Completed
                                else if(is_active && is_activity_started && one_exercise.periods.length > 0) percentage = (current_set / (one_exercise.periods.length || 1)) * 100 // Sets The Percentage
                            }

                            return (
                                <View 
                                    key={index} 
                                    className={is_active ? "bar active show" : "bar show"} // Adds Active Class For Bar Of Active Exercise
                                    // draggable = true
                                    style={styles.bar}
                                >
                                    <AnimatedProgressBar 
                                        is_active={is_active}
                                        is_completed={is_completed} 
                                        percentage={percentage}
                                        red={red}
                                    />
                                </View>
                            )
                        })}

                        <Text style={styles.bar_label}>
                            <FontAwesome6
                                name="angles-right"
                                size={15}
                                color={transparentize(SECONDARY_COLOR, 0.5)}
                            />

                            {training_plan_slide === "start_training" && (` ${active_training_plan_exercises[0].exercise}`)}
                            {(training_plan_slide === "exercise" || training_plan_slide === "break") && active_training_plan_exercises.length > active_exercise_index + 1 && (` ${active_training_plan_exercises[active_exercise_index + 1].exercise}`)}
                        </Text>
                    </View>

                    <View className="current_activity_info" style={styles.current_activity_info}>
                        <Text style={styles.current_activity_info_text}>
                            {!is_activity_started && is_xp_boost_active ? (
                                t("Navýšenie XP je aktívne")
                            ) : (
                                !is_activity_started && (is_xp_boost_available ? t("Je dostupné navýšenie XP") : t("Žiadne aktívne navýšenie XP"))
                            )}

                            {is_activity_started && (
                                <>
                                    {is_xp_boost_active ? (
                                        <>
                                            <FontAwesome6
                                                name="bolt"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />

                                            <Text> {xp_boost_amount}x</Text>
                                        </>
                                    ) : (
                                        <Text>{t("Žiadne aktívne navýšenie XP")}</Text>
                                    )}
                                </>
                            )}
                        </Text>

                        {is_activity_started && is_xp_boost_active && (
                            <View 
                                style={[
                                    styles.current_activity_info_progress,
                                    { width: `${xp_boost_progress}%` },
                                ]} 
                            />
                        )}
                    </View>
                </View>

                {grouped_training_plans_exercises.length > 1 && !is_activity_started && (createTrainingPlanBars(grouped_training_plans_exercises.length))} {/* Creates And Renders Training Plan Bars (Only If There Are More Than One Training Plan Available) */}
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
                    <Pressable 
                        key={index} 
                        className={index === active_training_plan_index ? "bar active" : "bar"} // Adds Active Class For Bar Of Active Training Plan
                        onPress={() => changeTrainingPlans(index)} // Changes Training Plans

                        style={[
                            styles.training_plan_bar,

                            index === active_training_plan_index ? { 
                                backgroundColor: BLUE_COLOR,
                                shadowColor: BLUE_COLOR,
                                shadowOffset: { width: 0, height: 0 },
                                shadowOpacity: 1,
                                shadowRadius: 10,
                                elevation: 5,
                            } : {}
                        ]}
                    />
                ))}
            </View>
        )
    }

    // Function For Change Training Plans
    const changeTrainingPlans = (new_index:number, max_index?:number):void => {
        if(!is_activity_started) {
            // Swipe
            if(max_index) {
                if(new_index >= 0 && new_index <= max_index) setActiveTrainingPlanIndex(new_index) // Sets The Active Training Plan Index
            }
    
            // Click
            else setActiveTrainingPlanIndex(new_index) // Sets The Active Training Plan Index
        }
    }

    // Creates The Swipe Gesture
    const swipe_gesture = Gesture.Pan()
        .runOnJS(true)

        .onEnd((event) => {
            if(event.translationX < -50) changeTrainingPlans(active_training_plan_index + 1, grouped_training_plans_exercises.length - 1) // Shows The Next Post Media
            else if (event.translationX > 50) changeTrainingPlans(active_training_plan_index - 1, grouped_training_plans_exercises.length - 1) // Shows The Previous Post Media
        })

    // Function For Update The Tick
    const updateTick = ():void => {
        if(!start_time.current) return
        
        const now:number = Date.now() // Gets The Current Time
        const current_elapsed_time:number = accumulated_time.current + (now - start_time.current) // Gets The Current Elapsed Time
        
        // setElapsedTime(current_elapsed_time) // Sets The Elapsed Time
        onElapsedTimeUpdate(current_elapsed_time) // Sets The Elapsed Time
    }

    // Function For Start Activity
    const startActivity = ():void => {
        if(is_activity_running) return
        
        setIsActivityRunning(true) // Sets The Information That The Activity Is Running
        if(!is_activity_started) setIsBasicActivityStarted(true) // Sets The Information That The Basic Activity Is Started (Without The Training Plan)
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
    const stopActivity = async ():Promise<void> => {
        const _2_activities:OfficialTask|null = official_tasks.find(one_task => one_task.data === "2_activities") || null // Gets The "Complete 2 Activities" Official Task If Is Available

        // Complete Training Plan Activity
        if(_2_activities && !_2_activities.is_completed) {
            onCompleteOfficialTask("2_activities") // Completes The "Complete Training Plan Activity" Official Task
        }

        setIsActivityRunning(false) // Sets The Information That The Activity Isn't Running
        setIsActivityStarted(false) // Sets The Information That The Activity Isn't Started
        setIsBasicActivityStarted(false) // Sets The Information That The Basic Activity Isn't Started (Without The Training Plan)
 
        if(interval.current) {
            clearInterval(interval.current) // Clears The Interval
            interval.current = null // Resets The Interval
        }

        const gained_xp:number = calculateGainedXp(elapsed_time, xp_boost_expiration_time || null, xp_boost_amount, 100) // Calculates The Gained XP

        // Commits Activity
        if(gained_xp > 0) {
            // Gets The New Activity Data
            const new_activity_data:{
                elapsed_time:number,
                gained_xp:number,
                type:string|null,
                day:number|null,
                training_plan_summary:TrainingPlanSummaryExercise[]|null
            } = {
                elapsed_time, // Stores Formatted Elapsed Time
                gained_xp: gained_xp, // Stores Gained XP
                type: ordered_exercises[active_exercise_index].type || t("Tréning"), // Stores Training Plan Title
                day: typeof selected_day_or_training_plan_key === "number" ? selected_day_or_training_plan_key : null, // Stores Training Plan Day
                training_plan_summary: null // Stores The Training Plan Summary
            }

            if(exercises_duration) new_activity_data.training_plan_summary = createTrainingPlanSummary() // Creates The Training Plan Summary

            console.log(new_activity_data)

            try {
                if(!logged_in_user) {
                    Alert.alert(t("Chyba"), t("Aktivitu nie je možné zaznamenať bez prihlásenia.")) // Shows The Alert
                    return
                }

                const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
        
                // Sends The POST Request To The Server
                const new_recorded_activity_response:Response = await fetch(`${API_URL}/new-activity/`, {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${user_token}`
                    },

                    body: JSON.stringify({
                        new_activity_data
                    })
                })

                // If The Response Isn't Success
                if(!new_recorded_activity_response.ok) {
                    Alert.alert(t("Chyba"), t("Pri zaznamenávaní aktivity došlo k chybe.")) // Shows The Alert
                    return
                }

                const new_recorded_activity_data:BasicResponse = await new_recorded_activity_response.json() // Gets The New Recorded Activity Data

                // If The Response Isn't Success
                if(!new_recorded_activity_data.success) {
                    Alert.alert(t("Chyba"), new_recorded_activity_data.message) // Shows The Alert
                    return
                }
            } 
            
            catch {
                Alert.alert(t("Chyba"), t("Pri zaznamenávaní aktivity došlo k chybe.")) // Shows The Alert
            } 
        }

        start_time.current = null // Sets The Start Time
        accumulated_time.current = 0 // Sets The Accumulated Time
        // setElapsedTime(0) // Sets The Elapsed Time
        onElapsedTimeUpdate(0) // Sets The Elapsed Time

        setTrainingPlanSlide("start_training") // Sets The Training Plan Slide
        setCurrentSet(1) // Sets The Current Set
        setCurrentExerciseStartTime(null) // Sets The Current Exercise Start Time
        setExercisesDuration([]) // Sets The Exercise Duration
        resetProgressBars() // Resets Progress Bar
    }

    // Function For Stop The Training Plan Activity
    const stopTrainingPlanActivity = () => {
        const complete_training_plan_activity:OfficialTask|null = official_tasks.find(one_task => one_task.data === "complete_training_plan_activity") || null // Gets The "Complete Training Plan Activity" Official Task If Is Available

        // Complete Training Plan Activity
        if(complete_training_plan_activity && !complete_training_plan_activity.is_completed) {
            onCompleteOfficialTask("complete_training_plan_activity") // Completes The "Complete Training Plan Activity" Official Task
        }

        // renderActivitySummary(elapsed_time, gained_xp) // Renders Activity Summary

        // if(training_plan_summary.length > 0) {
        //     renderTrainingPlanActivitySummary(training_plan_summary) // Renders Training Plan Activity Summary
        // }

        stopActivity() // Stops The Activity
    }

    // Function For Calculate The Gained XP
    const calculateGainedXp = (
        elapsed_time_ms:number, 
        xp_boost_expiration_time:string|null, 
        xp_boost_amount:number = 2, 
        base_xp_per_hour:number = 100, 
        start_time_ms?:number,
        end_time_ms?:number
    ):number => {
        const activity_end_time:number = end_time_ms !== undefined ? end_time_ms : Date.now() // Gets The Activity End Time Or The Current Time
        const activity_start_time: number = start_time_ms !== undefined ? start_time_ms : (activity_end_time - elapsed_time_ms) // Gets The Activity Start Time

        const xp_per_ms:number = base_xp_per_hour / (60 * 60 * 1000) // XP Amount Per 1 MS
        let boosted_time_ms:number = 0 // Stores The Boosted Time In MS
    
        if(xp_boost_expiration_time) {
            const xp_boost_expiration_time_ms:number = new Date(xp_boost_expiration_time).getTime() // Gets The XP Boost Expiration Time In MS
    
            if(xp_boost_expiration_time_ms > activity_start_time) {
                const xp_boost_end_time_during_activity:number = Math.min(xp_boost_expiration_time_ms, activity_end_time) // Gets The XP Boost End Time During Activity
                boosted_time_ms = xp_boost_end_time_during_activity - activity_start_time // Sets The Boosted Time
            }
        }
    
        boosted_time_ms = Math.max(0, Math.min(boosted_time_ms, elapsed_time_ms)) // Sets The Boosted Time
        
        const normal_time_ms:number = elapsed_time_ms - boosted_time_ms // Gets The Normal Time In MS (Without XP Boost)

        const normal_xp:number = normal_time_ms * xp_per_ms // Gets The Amount Of XP For Unboosted Activity
        const boosted_xp:number = boosted_time_ms * xp_per_ms * xp_boost_amount // Gets The Amount Of XP For Boosted Activity
    
        return Math.round(normal_xp + boosted_xp) // Returns The Amount Of Total Gained XP
    }

    // Function For Create The Training Plan Summary
    const createTrainingPlanSummary = ():TrainingPlanSummaryExercise[] => {
        const training_plan_summary:TrainingPlanSummaryExercise[] = [] // Stores The Training PLan Summary
    
        exercises_duration.forEach((one_exercise:{ exercise_index:number, elapsed_time:number, start_time:number }) => {
            const end_time:number = one_exercise.start_time + one_exercise.elapsed_time // Gets The Exercise End Time
            const gained_xp = calculateGainedXp(one_exercise.elapsed_time, xp_boost_expiration_time || null, xp_boost_amount, 100, one_exercise.start_time, end_time) // Calculates The Gained XP For Exercise
    
            // Stores The Exercise Information
            const exercise:TrainingPlanSummaryExercise = {
                exercise: active_training_plan_exercises[one_exercise.exercise_index].exercise, // Sets Title Of The Exercise In The Training Plan
                elapsed_time: Math.round(one_exercise.elapsed_time / 1000), // Sets Elapsed Time
                gained_xp: gained_xp, // Sets Gained XP
                color: randomColor(128, 255) // Generates Random Color
            }
    
            training_plan_summary.push(exercise) // Pushes The New Exercise To The Training Plan Summary
        })

        return training_plan_summary // Returns The Training Plan Summary
    }

    // Function For Reset Progress Bar Of Training Plan
    const resetProgressBars = ():void => {
        let current_index:number = active_exercise_index // Stores The Current Bar Index
        let current_red:number = red // Stores The Current Red
        const red_increasion:number = (255 - current_red) / active_training_plan_exercises.length // Gets Number Of Red Increasion
    
        setResetBarIndex(current_index) // Sets The Reset Bar Index
    
        const bar_cleaner_interval = setInterval(() => {
            // Stops Bar Cleaner
            if(current_index < 0) {
                clearInterval(bar_cleaner_interval) // Clears The Bar Cleaner Interval
                setResetBarIndex(null) // Sets The Reset Bar Index
                setActiveExerciseIndex(0) // Sets The Active Exercise Index
                return
            }
    
            current_red += red_increasion // Increases Red Color Of Progress Color
            setRed(current_red) // Sets The Red Color
            current_index -= 1 // Sets The Current Bar Index
            setResetBarIndex(current_index) // Sets The Reset Bar Index
        }, 500)
    }

    // Function For Animate The Slide Transition
    const animateSlideTransition = (next_slide:TrainingPlanSlide, next_index:number = active_exercise_index):void => {
        Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setTrainingPlanSlide(next_slide) // Sets The Training Plan Slide
            setActiveExerciseIndex(next_index) // Sets The Active Exercise Index

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
        const current_time:number = Date.now() // Gets The Current Time

        if(is_activity_running) return
        
        setIsActivityRunning(true) // Sets The Information That The Activity Is Running
        setIsActivityStarted(true) // Sets The Information That The Activity Is Started
        start_time.current = current_time // Sets The Start Time
        interval.current = setInterval(updateTick, 1000) // Sets The Interval

        animateSlideTransition("exercise", 0) // Animates The Slide Transition To The First Exercise
        setCurrentExerciseStartTime(current_time) // Sets The Current Exercise Start Time
    }

    // Function For Handle Next Step (Increases The Current Set Or Goes To Next Exercise)
    const handleNextStep = ():void => {
        // Starts The Timer If Is Paused
        if(!is_activity_running) {
            const current_time:number = Date.now() // Gets The Current Time

            setIsActivityRunning(true) // Sets The Information That The Activity Is Running
            start_time.current = current_time // Sets The Start Time
            interval.current = setInterval(updateTick, 1000) // Sets The Interval
        }

        // Increases The Set
        if(current_set < active_exercise.periods.length) {
            setRed((previous_red:number) => previous_red - ((255 - MIN_RED) / (all_sets - 1))) // Makes Color Transition For Progress Bar From rgb(255, 207, 32) To rgb(82, 207, 32)
            setCurrentSet((previous_set) => previous_set + 1) // Sets The Current Set
        }
        
        // Shows The Next Exercise
        else nextExercise() // Goes To Next Exercise
    }

    // Function For Change Exercises In The Training Plan
    const nextExercise = ():void => {
        const sets_amount:number = active_exercise.periods.length || 1 // Gets Total Amount Of Sets Of The Active Exercise
        const next_active_exercise_index:number = active_exercise_index + 1 // Gets The Next Active Exercise Index

        const current_time:number = Date.now() // Gets The Current Time

        // Stores The Spent Time In The Current Exercise
        if(current_exercise_start_time) {
            const elapsed_time_for_exercise:number = current_time - current_exercise_start_time // Gets The Elapsed Time For Exercise In MS

            // Sets The New Exercise Duration
            setExercisesDuration(previous_durations => [
                ...previous_durations, 

                { 
                    exercise_index: active_exercise_index, 
                    elapsed_time: elapsed_time_for_exercise,
                    start_time: current_exercise_start_time
                }
            ])
        }

        // Exercises Break Slide
        if(current_set === sets_amount && active_exercise_index < active_training_plan_exercises.length - 1 && !active_exercise.is_warm_up) {
            animateSlideTransition("break", active_exercise_index) // Animates The Slide Transition To The Next Exercise
        }

        // Exercise Slide
        else if(next_active_exercise_index < active_training_plan_exercises.length) {
            setRed((previous_red:number) => previous_red - ((255 - MIN_RED) / (all_sets - 1))) // Makes Color Transition For Progress Bar From rgb(255, 207, 32) To rgb(82, 207, 32)
            animateSlideTransition("exercise", next_active_exercise_index) // Animates The Slide Transition To The Next Exercise
            setCurrentExerciseStartTime(current_time) // Sets The Current Exercise Start Time
        } 
        
        // Finish Training Slide
        else {
            animateSlideTransition("finish_training") // Animates The Slide Transition To The Finish Training
        }
    }

    // Function For Skip Exercises Break
    const skipBreak = ():void => {
        const next_active_exercise_index:number = active_exercise_index + 1 // Gets The Next Active Exercise Index
        const current_time:number = Date.now() // Gets The Current Time

        // Starts The Timer If Is Paused
        if(!is_activity_running) {
            setIsActivityRunning(true) // Sets The Information That The Activity Is Running
            start_time.current = current_time // Sets The Start Time
            interval.current = setInterval(updateTick, 1000) // Sets The Interval
        }

        setRed((previous_red:number) => previous_red - ((255 - MIN_RED) / (all_sets - 1))) // Makes Color Transition For Progress Bar From rgb(255, 207, 32) To rgb(82, 207, 32)
        setCurrentSet(1) // Sets The Current Set
        animateSlideTransition("exercise", next_active_exercise_index) // Animates The Slide Transition To The Next Exercise
        setCurrentExerciseStartTime(current_time) // Sets The Current Exercise Start Time
    }

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
                                <Text style={{ color: SECONDARY_COLOR, textAlign: "center" }}>{t("Zdá sa, že nie ste prihlásený.")}</Text>
                                <Text style={{ color: SECONDARY_COLOR, textAlign: "center" }}>{t("Bez prihlásenia nie je možné ukladať vašu aktivitu.")}</Text>

                                <Pressable 
                                    // onPress={() => setActiveForm("login_form")}
                                    accessibilityLabel={t("Prihlásiť sa")}
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                // styles.login,
                                                { color: SECONDARY_COLOR, textAlign: "center" },
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
                                <Text style={{ color: SECONDARY_COLOR, textAlign: "center" }}>{t("Zatiaľ nemáte žiaden tréningový plán.")}</Text>

                                <Pressable 
                                    // onPress={}
                                    accessibilityLabel={t("Moje tréningové plány")}
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                styles.link,
                                                pressed && { textDecorationLine: "underline" } 
                                            ]}
                                        >
                                            {t("Vytvorte si prvý.")}
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        )}

                        {/* <script src="{% static 'app/ts/dist/pages/training_session/components/basic_training_session.js' %}" type="module"></script> */}
                    </>
                )}

                {training_plans_exercises.length > 0 && !is_basic_activity_started && (
                    <GestureDetector gesture={swipe_gesture}>
                        <View className="training_plan_container" style={styles.training_plan_container}>
                            {active_training_plan_exercises && active_training_plan_exercises.length > 0 && (generateTrainingPlan())} {/* Generates The Training Plan */}
                        </View>
                    </GestureDetector>
                )}

                <View className="previous_activity" style={styles.previous_activity}>
                    <View className="top" style={styles.top}>
                        <View className="average_activity_time_container" style={styles.average_activity_time_container}>
                            <View 
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 5,
                                }}
                            >
                                <FontAwesome6
                                    name="clock"
                                    size={20}
                                    color={BLUE_COLOR}
                                />

                                <Text className="title" style={styles.average_activity_time_title}>{t("priemer / 7 dní")}</Text>
                            </View>

                            <Text style={styles.average_activity_time}>{activity_data && activity_data.average_activity_time_formatted ? activity_data.average_activity_time_formatted : "0"}</Text>
                        </View>

                        <View className="activities_amount_container" style={styles.activities_amount_container}>
                            <View 
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 5,
                                }}
                            >
                                <FontAwesome6
                                    name="calendar"
                                    size={20}
                                    solid={false}
                                    color={BLUE_COLOR}
                                />

                                <Text className="title" style={styles.activities_amount_title}>{t("počet / 7 dní")}</Text>
                            </View>

                            <Text className="activities_amount" style={styles.activities_amount}>{activity_data && activity_data.activities_amount ? activity_data.activities_amount : "0"}</Text>
                        </View>
                    </View>

                    <View className="bottom" style={styles.bottom}>
                        <View className="latest_activity_container" style={styles.latest_activity_container}>
                            <FontAwesome6
                                name="list"
                                size={20}
                                color={BLUE_COLOR}
                            />

                            {activity_data && activity_data.latest_activity ? (
                                <>
                                    <Text 
                                        style={[
                                            styles.latest_activity_text, 
                                            { lineHeight: 1 },
                                        ]}
                                    >
                                        {getMinimalistFormattedTime(activity_data.latest_activity.elapsed_time)}
                                    </Text>

                                    <Text className="xp" style={styles.xp}>{activity_data.latest_activity.gained_xp}XP</Text>
                                    <Text style={styles.latest_activity_text}>{getFormattedDate(activity_data.latest_activity.end_time)}</Text>
                                </>
                            ) : (
                                <>
                                    <Text className="no_latest_activity" style={styles.no_latest_activity}>{t("posledná aktivita:")} </Text>
                                    <Text className="none" style={styles.none}>{t("žiadna")}</Text>
                                </>
                            )}
                        </View>

                        <View className="longest_activity_container" style={styles.latest_activity_container}>
                            <FontAwesome6
                                name="medal"
                                size={20}
                                color={BLUE_COLOR}
                            />

                            {activity_data && activity_data.longest_activity ? (
                                <>
                                    <Text 
                                        style={[
                                            styles.latest_activity_text, 
                                            { lineHeight: 1 },
                                        ]}
                                    >
                                        {getMinimalistFormattedTime(activity_data.longest_activity.elapsed_time)}
                                    </Text>

                                    <Text className="xp" style={styles.xp}>{activity_data.longest_activity.gained_xp}XP</Text>
                                    <Text style={styles.longest_activity_text}>{getFormattedDate(activity_data.longest_activity.end_time)}</Text>
                                </>
                            ) : (
                                <>
                                    <Text className="no_longest_activity" style={styles.no_longest_activity}>{t("najdlhšia aktivita:")} </Text>
                                    <Text className="none" style={styles.none}>{t("žiadna")}</Text>
                                </>
                            )}
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
        paddingHorizontal: 20,
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
        marginTop: 20,
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
        textAlign: "center",
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
        // flexDirection: "row",
        alignItems: "center",
        // justifyContent: "space-between",
        justifyContent: "flex-start",
        flex: 1,
        // width: "100%",
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
        flex: 1,
        height: 10,
        borderWidth: 1,
        borderColor: transparentize(SECONDARY_COLOR, 0.8),
        borderRadius: 10 / 2,
    },

    bar_label: {
        pointerEvents: "none",
        position: "absolute",
        bottom: 15,
        width: "100%",
        textAlign: "center",
        fontSize: 15,
        lineHeight: 15,
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    current_activity_info: {
        position: "relative",
        marginVertical: 10,
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
        flex: 1,
        paddingVertical: 20,
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
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
        fontSize: 15,
        color: transparentize(SECONDARY_COLOR, 0.5),
    },
    
    average_activity_time: {
        marginTop: 15,
        textAlign: "center",
        fontSize: 25,
        fontWeight: "600",
        color: BLUE_COLOR,
        // white-space: nowrap;
    },

    activities_amount_container: {
        flex: 1,
        paddingVertical: 20,
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
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
        fontSize: 15,
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    activities_amount: {
        marginTop: 15,
        textAlign: "center",
        fontSize: 25,
        fontWeight: "600",
        color: BLUE_COLOR,
        // white-space: nowrap;
    },

    bottom: {
        padding: 15,
        gap: 15,
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

    latest_activity_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },

    longest_activity_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },

    latest_activity_text: {
        // white-space: nowrap;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    no_latest_activity: {
        // white-space: normal;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    longest_activity_text: {
        // white-space: nowrap;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    no_longest_activity: {
        // white-space: normal;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    xp: {
        fontSize: 22,
        fontWeight: "600",
        color: BLUE_COLOR,
    },

    none: {
        fontSize: 22,
        fontWeight: "600",
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