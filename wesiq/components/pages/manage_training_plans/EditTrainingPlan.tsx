import { View, Text, StyleSheet, Pressable, Alert, Animated, Dimensions, Vibration, TextInput, Platform } from "react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import { getDayName, getFormattedDate, getFormattedTime, getMinimalistFormattedTime, getRemainingSecondsFromDate } from "@/utils/time"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { randomColor } from "@/utils/randomColor"
import { BasicResponse } from "@/components/Feed"
import * as Notifications from "expo-notifications"
import Icon from "@/components/Icon"
import { generateKey } from "@/utils/generateKey"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"
import type { LoadedTrainingPlansResponse, TrainingPlanExercise } from "../activity/ActivitySection"

type TrainingPlanSlide = "drop_zone"|"exercise" // Types The Training Plan Slide

export default function EditTrainingPlan() {
    const notification_id = useRef<string|null>(null) // Stores The Notification ID

    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const [active_training_plan_index, setActiveTrainingPlanIndex] = useState<number>(0) // Stores The Active Training Plan Index
    const [active_exercise_index, setActiveExerciseIndex] = useState<number>(0) // Stores The Active Exercise Index
    const [training_plans_exercises, setTrainingPlansExercises] = useState<TrainingPlanExercise[]>([]) // Stores The Training Plans Exercises
    const [are_training_plans_loading, setAreTrainingPlansLoading] = useState(false) // Stores The Information If Training Plans Are Loading
    const [training_plan_slide, setTrainingPlanSlide] = useState<TrainingPlanSlide>("drop_zone") // Stores The Training Plan Slide

    const [training_plan_title, setTrainingPlanTitle] = useState<string>("") // Stores The Training Plan Slide

    // Initializes The Notification Permission Request
    useEffect(() => {
        // Function For Request The Notification Permissions
        const requestNotificationPermissions = async ():Promise<void> => {
            if(Platform.OS === "android") {
                await Notifications.setNotificationChannelAsync("break-alarm", {
                    name: "Break alarm",
                    importance: Notifications.AndroidImportance.MAX,
                    sound: "default",
                    vibrationPattern: [0, 250, 250, 250]
                })
            }
    
            const { status } = await Notifications.requestPermissionsAsync() // Gets The Permission Status
    
            if(status !== "granted") console.error("Notifikácie neboli povolené.")
        }
    
        requestNotificationPermissions() // Requests The Notification Permissions
    }, [])

    const days:(number|null)[] = [...new Set(training_plans_exercises.map((one_exercise:TrainingPlanExercise) => one_exercise.day ? one_exercise.day : null))] // Gets Ordered Days From Available Training Plans
    const selected_day:number|null = days[active_training_plan_index] || null // Selects Current Or Upcoming Day Of Training Plan

    const { width: SCREEN_WIDTH } = Dimensions.get("window") // Gets The Screen Width
    
    const translateX = useRef(new Animated.Value(0)).current // Translate X Animation

    // Orders Exercises From All Turaining Plans By Their Order Value
    const ordered_exercises:TrainingPlanExercise[] = useMemo(() => {
        return [...training_plans_exercises].sort(
            (a:TrainingPlanExercise, b:TrainingPlanExercise) => Number(a.order) - Number(b.order)
        )
    }, [training_plans_exercises])

    // Gets The Active Training Plan Exercises
    const active_training_plan_exercises:TrainingPlanExercise[] = useMemo(() => {
        return ordered_exercises.filter(one_exercise => one_exercise.day === selected_day)
    }, [ordered_exercises, selected_day])

    // Initializes The Training Plan Slide
    useEffect(() => {
        if(active_training_plan_exercises.length > 0) setTrainingPlanSlide("exercise") // Sets The Training Plan Slide
        else setTrainingPlanSlide("drop_zone") // Sets The Training Plan Slide
    }, [active_training_plan_exercises])
    
    const active_exercise:TrainingPlanExercise = active_training_plan_exercises[active_exercise_index] // Gets The Active Exercise
    
    // Initializes The Training Plan Title
    useEffect(() => {
        setTrainingPlanTitle(active_exercise ? active_exercise.type : "") // Sets The Training Plan Title
    }, [active_exercise])

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

    // Function For Schedule The Notification
    const scheduleNotification = async (seconds:number):Promise<void> => {
        try {
            if(notification_id.current) {
                await Notifications.cancelScheduledNotificationAsync(notification_id.current) // Cancels The Previous Notification
                notification_id.current = null // Removes The Notification ID
            }
    
            if (seconds <= 0) return
    
            // Setup The Notification And Gets Its ID
            const id:string = await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Tréningový plán",
                    body: `Tréningový plán bol úspešne upravený.`,
                    sound: "default"
                },

                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: Math.ceil(seconds),
                    repeats: false,

                    ...(Platform.OS === "android" && {
                        channelId: "break-alarm"
                    })
                }
            })
    
            notification_id.current = id // Sets The Notification ID
        } 
        
        catch {
            console.error("Pri plánovaní notifikácie došlo k chybe.")
        }
    }

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
            setAreTrainingPlansLoading(false) // Stores The Information That Training Plans Aren't Loading
        }
    }

    // Initializes The Load Of The Training Plans
    useEffect(() => {
        getTrainingPlansExercises() // Gets The Training Plans Exercises
    }, [])

    // Function For Render Exercises Of The Selected Training Plan
    const generateTrainingPlan = () => {
        return (
            <>
                <GestureDetector gesture={swipe_gesture}>
                    <View className="training_plan" style={styles.training_plan}>
                        <Animated.View 
                            style={{ 
                                transform: [{ translateX }],
                                flex: 1,
                            }}
                        >
                            {training_plan_slide === "drop_zone" && (
                                <View className="drop_zone" style={styles.drop_zone}>
                                    <FontAwesome6
                                        name="compress"
                                        size={20}
                                        color={BLUE_COLOR}
                                    />
                                </View>
                            )}

                            {training_plan_slide === "exercise" && active_exercise && (
                                <>
                                    {/* Creates Warm Up */}
                                    {active_exercise.is_warm_up && (
                                        <View className="exercise warm_up" style={styles.warm_up}>
                                            <Text className="title">Warm Up</Text>

                                            <View className="timer_container" style={styles.timer_container}>
                                                <View className="subtract_time">
                                                    <IconButton icon_name="minus" />
                                                </View>

                                                <View className="timer" style={styles.warm_up_timer}>
                                                    {/* <svg width="100" height="100" viewBox="0 0 100 100">
                                                        <circle
                                                            cx="50"
                                                            cy="50"
                                                            r="40"
                                                            class="progress_background"
                                                        />
                                                    </svg> */}

                                                    <Text className="countdown" style={styles.warm_up_timer_text}>`${getFormattedTime("minutes", active_exercise.periods[0])}:${getFormattedTime("seconds", active_exercise.periods[0], true)}`</Text> {/* Stores Timer Of Warm Up */}
                                                </View>

                                                <View className="add_time">
                                                    <IconButton icon_name="plus" />
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    {/* Creates Exercise */}
                                    {!active_exercise.is_warm_up && (
                                        <View className="exercise" style={styles.exercise}>
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

                                            <View className="labels" style={styles.labels}>
                                                <Text className="unit_amount" style={styles.label}>
                                                    {active_exercise.unit === "reps" && ("Počet opakovaní")}
                                                    {active_exercise.unit === "seconds" && ("Počet sekúnd")}
                                                    {active_exercise.unit === "steps" && ("Počet krokov")}
                                                </Text>

                                                <Text style={styles.label}>Série</Text>
                                            </View>

                                            <Pressable 
                                                className="add_period"
                                                onPress={() => addPeriod(active_exercise)}
                                                accessibilityLabel="Pridať sériu"
                                                style={styles.add_period}
                                            >
                                                <Text style={{ color: SECONDARY_COLOR }}>Pridať sériu</Text>
                                            </Pressable>

                                            <View className="periods_container" style={styles.periods_container}>
                                                {/* Generates Exact Amount Of Period Selections For Exercise */}
                                                {generatePeriodSelections(
                                                    active_exercise.periods,
                                                    getConsecutiveNumbersCount(active_exercise.periods),
                                                    active_exercise.unit
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </>
                            )}
                        </Animated.View>

                        <View className="bar_container" style={styles.bar_container}>
                            {active_training_plan_exercises.map((one_exercise:TrainingPlanExercise, index:number) => (
                                // Creates Bar
                                <Pressable 
                                    key={index} 
                                    className={index === active_exercise_index ? "bar active" : "bar"} // Adds Active Class For Bar Of Active Training Plan
                                    onPress={() => changeExercises(index)} // Changes Training Plans

                                    style={[
                                        styles.bar,

                                        index === active_exercise_index ? { 
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
                    </View>
                </GestureDetector>

                {days.length > 1 && (createTrainingPlanBars(days.length))} {/* Creates And Renders Training Plan Bars (Only If There Are More Than One Training Plan Available) */}
            </>
        )
    }

    // Function For Generate Period Selections
    const generatePeriodSelections = (periods_data:number[], amount:number[], unit:string) => {
        return amount.map((one_unit:number, index:number) => {
            return (
                <View className="period_selection" style={styles.period_selection}>
                    <View className="reps_container" style={styles.reps_container}>
                        <View className="decrease_reps">
                            <Icon 
                                icon_name="minus"
                                onPress={() => changeReps(active_exercise, index, "decrease")}
                                size={20}
                            />
                        </View>

                        {/* Shows To Failure Text */}
                        {compressConsecutiveNumbers(periods_data)[index] === 0 ? (
                            <Text 
                                className="to_failure" 

                                style={[
                                    styles.to_failure,
                                    { color: SECONDARY_COLOR }
                                ]}
                            >
                                Do zlyhania
                            </Text>
                        ) : (
                            <>
                                {/* Checks Exercise Unit Type */}
                                {(unit === "reps" || unit === "steps") && (
                                    <TextInput
                                        className="reps"
                                        keyboardType="number-pad"
                                        textAlignVertical="top" 
                                        value={String(compressConsecutiveNumbers(periods_data)[index])}
                                        // onChangeText={}
                                        maxLength={4}

                                        style={[
                                            styles.reps,
                                            { outlineStyle: "none" } as any
                                        ]}
                                    />
                                )}

                                {unit === "seconds" && (
                                    <Text 
                                        className="time" 

                                        style={[
                                            styles.time,
                                            { color: SECONDARY_COLOR }
                                        ]}
                                    >
                                        {compressConsecutiveNumbers(periods_data)[index] ? getMinimalistFormattedTime(compressConsecutiveNumbers(periods_data)[index] as number).trim() : "0s"}
                                    </Text>
                                )}
                            </>
                        )}

                        <View className="increase_reps">
                            <Icon 
                                icon_name="plus"
                                onPress={() => changeReps(active_exercise, index, "increase")}
                                size={20}
                            />
                        </View>
                    </View>

                    <View className="sets_container" style={styles.sets_container}>
                        <View className="decrease_sets">
                            <Icon 
                                icon_name="minus"
                                onPress={() => changeSets(active_exercise, index, "decrease")}
                                size={20}
                            />
                        </View>

                        <TextInput
                            className="sets"
                            keyboardType="number-pad"
                            textAlignVertical="top" 
                            value={String(one_unit)}
                            // onChangeText={}
                            maxLength={4}

                            style={[
                                styles.sets,
                                { outlineStyle: "none" } as any
                            ]}
                        />

                        <View className="increase_sets">
                            <Icon 
                                icon_name="plus"
                                onPress={() => changeSets(active_exercise, index, "increase")}
                                size={20}
                            />
                        </View>
                    </View>
                </View>
            )
        })
    }

    // Function For Count Consecutive Numbers In An Array (For Example From [1, 1, 2, 2, 3] To [2, 2, 1])
    const getConsecutiveNumbersCount = (array:number[]):number[] => {
        if(array.length === 0) return []

        const result:number[] = []
        let counter:number = 1

        for(let i:number = 1; i <= array.length; i++) {
            if(array[i] === array[i - 1]) counter += 1 // Increments The Counter

            else {
                result.push(counter) // Stores Previous Counter Value
                counter = 1 // Resets The Counter
            }
        }

        return result
    }

    // Function For Reduce An Array Of Repeating Numbers (For Example From [1, 1, 2, 2, 3] To [1, 2, 3])
    const compressConsecutiveNumbers = (array:number[]):number[] => {
        if(array.length === 0) return []

        const result:number[] = [array[0] as number] // Stores The First Number

        for(let i:number = 1; i < array.length; i++) {
            if(array[i] !== array[i - 1]) {
                result.push(array[i] as number) // Stores The Number
            }
        }

        return result
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
        setActiveExerciseIndex(0) // Sets The Active Exercise Index
        setActiveTrainingPlanIndex(new_index) // Sets The Active Training Plan Index
    }

    // Function For Change Exercises In The Training Plan
    const changeExercises = (new_index:number, max_index?:number):void => {
        // Swipe
        if(max_index !== undefined) {
            if(new_index >= 0 && new_index <= max_index) setActiveExerciseIndex(new_index) // Sets The Active Exercise Index
            else if(new_index > max_index) setActiveExerciseIndex(0) // Sets The Active Exercise Index
            else if(new_index < 0) setActiveExerciseIndex(max_index) // Sets The Active Exercise Index
        } 
    
        // Click
        else setActiveExerciseIndex(new_index) // Sets The Active Exercise Index
    }

    // Creates The Swipe Gesture
    const swipe_gesture = useMemo(() => {
        const max_index:number = active_training_plan_exercises.length - 1 // Gets The Max Index

        return Gesture.Pan()
            .runOnJS(true)
            .onEnd((event) => {
                if(event.translationX < -50) changeExercises(active_exercise_index + 1, max_index) // Shows The Next Post Media
                else if(event.translationX > 50) changeExercises(active_exercise_index - 1, max_index) // Shows The Previous Post Media
            })
    }, [active_exercise_index, active_training_plan_exercises.length])

    // Function Add Period To The Exercise
    const addPeriod = (exercise:TrainingPlanExercise):void => {
        // Sets The Training Plans Exercises
        setTrainingPlansExercises(previous_exercises => previous_exercises.map((one_exercise:TrainingPlanExercise) => {
            if(one_exercise.id === exercise.id) {
                return {
                    ...one_exercise,
                    periods: [...one_exercise.periods, 0] // Adds New Period To The Exercise In The Training Plan
                }
            }

            return one_exercise // Returns The Unchanged Exercise
        }))
    }

    // Function For Change The Reps Value
    const changeReps = (exercise:TrainingPlanExercise, period_index:number, operation:"decrease"|"increase"):void => {
        let reps_number:number = compressConsecutiveNumbers(exercise.periods)[period_index] // Gets Current Reps Amount

        if(operation === "decrease") reps_number -= 1 // Decreases Reps Amount By 1
        if(operation === "increase") reps_number += 1 // Increases Reps Amount By 1

        if(reps_number < 0) return // Do Nothing

        else {
            if(exercise.unit === "reps" && reps_number > 100) return // Do Nothing
            if(exercise.unit === "seconds" && reps_number > 3600) return // Do Nothing
            if(exercise.unit === "steps" && reps_number > 1000) return // Do Nothing
        }

        // Sets The Training Plans Exercises
        setTrainingPlansExercises(previous_exercises => previous_exercises.map((one_exercise:TrainingPlanExercise) => {
            if(one_exercise.id === exercise.id) {
                const counts:number[] = getConsecutiveNumbersCount(one_exercise.periods) // Counts Consecutive Numbers

                let start_index:number = 0 // Stores The Period Start Index

                // Updates The Period Start Index
                for(let i = 0; i < period_index; i++) {
                    start_index += counts[i]
                }
                
                const end_index:number = start_index + counts[period_index] // Gets The Period End Index

                return {
                    ...one_exercise,

                    // Updates Exercise Reps Amount
                    periods: one_exercise.periods.map((one_period:number, index:number) => 
                        (index >= start_index && index < end_index) ? reps_number : one_period
                    )
                }
            }

            return one_exercise // Returns The Unchanged Exercise
        }))
    }

    // Function For Change The Sets Value
    const changeSets = (exercise: TrainingPlanExercise, period_index: number, operation: "decrease" | "increase"): void => {
        let sets_number:number = getConsecutiveNumbersCount(exercise.periods)[period_index] // Gets Current Sets Amount
        const reps_number:number = compressConsecutiveNumbers(exercise.periods)[period_index] // Gets Current Reps Amount

        if(operation === "decrease") sets_number -= 1 // Decreases Sets Amount By 1
        if(operation === "increase") sets_number += 1 // Increases Sets Amount By 1

        if(sets_number < 0 || sets_number > 100) return // Do Nothing
        if(sets_number === 0 && exercise.periods.length === 1) return // Do Nothing

        // Sets The Training Plans Exercises
        setTrainingPlansExercises(previous_exercises => previous_exercises.map((one_exercise:TrainingPlanExercise) => {
            if(one_exercise.id === exercise.id) {
                const counts:number[] = getConsecutiveNumbersCount(one_exercise.periods) // Counts Consecutive Numbers

                let start_index:number = 0 // Stores The Period Start Index

                // Updates The Period Start Index
                for(let i = 0; i < period_index; i++) {
                    start_index += counts[i]
                }

                const updated_periods:number[] = [...one_exercise.periods] // Gets The Updated Periods

                if(operation === "increase") updated_periods.splice(start_index, 0, reps_number) // Updates Exercise Sets Amount
                else if(operation === "decrease") updated_periods.splice(start_index, 1) // Updates Exercise Sets Amount Or Deletes The Period

                return {
                    ...one_exercise,
                    periods: updated_periods
                }
            }

            return one_exercise // Returns The Unchanged Exercise
        }))
    }

    // Function For Save The Training Plan
    const saveTrainingPlan = async ():Promise<void> => {
        if(!training_plan_title.trim()) {
            Alert.alert("Chyba", "Pridajte názov pre tréningový plán.") // Shows The Alert
            return
        }

        if(active_training_plan_exercises.length === 0) {
            Alert.alert("Chyba", "Pridajte aspoň nejaký cvik pre tréningový plán.") // Shows The Alert
            return
        }

        const custom_exercises_without_name:TrainingPlanExercise[] = [] // TEST

        // // Checks For Empty Exercise Title Inputs In Custom Exercises In The Training Plan
        // const custom_exercises_without_name:HTMLDivElement[] = [...exercises].filter(function(one_exercise) {
        //     return (one_exercise?.querySelector(".title_input") as HTMLInputElement)?.value?.trim() === ""
        // })

        // if(custom_exercises_without_name.length > 0) {
        //     const first_custom_exercise_without_name_index:number = [...exercises].indexOf(custom_exercises_without_name[0] as HTMLDivElement) // Gets Index Of The First Custom Exercise Without Filled Title Input

        //     changeExercises(first_custom_exercise_without_name_index, training_plan, state) // Shows The Exercise Of The First Custom Exercise Without Filled Title Input Index
        // }

        // Only Saves If Everything Required Is Filled
        if(training_plan_title.trim() && active_training_plan_exercises.length > 0 && custom_exercises_without_name.length === 0) {
            const fallback_new_training_plan_key:string = generateKey(50) // Gets Random 50 Characters Long Generated Key

            const training_plan_data:{}[] = [] // Stores All New Saved Training Plan Data

            const existing_exercise:TrainingPlanExercise|null = training_plans_exercises.find(one_exercise => one_exercise.training_plan_key) || null // Gets The Existing Exercise

            // Gets Info From Every Exercise
            training_plans_exercises.forEach(function(one_exercise:TrainingPlanExercise, index:number) {
                const previous_training_plan_key:string|null = one_exercise.training_plan_key || null // Gets Previous Training Plan Key If POST Is From Edited Training Plan
                const current_training_plan_key:string = previous_training_plan_key ? previous_training_plan_key : fallback_new_training_plan_key // Gets The Current Training Plan Key

                // Creates And Fills Data For Object Of One Exercise For Saved Training Plan
                const training_plan_object:{
                    previous_training_plan_key:string|null,
                    training_plan_key:string,
                    action:string,
                    day:number|null,
                    type:string,
                    exercise:string,
                    periods:number[],
                    unit:string,
                    order:number
                } = {
                    previous_training_plan_key,
                    training_plan_key: current_training_plan_key,
                    action: existing_exercise ? "edited_training_plan" : "new_training_plan",
                    day: previous_training_plan_key && one_exercise.day !== undefined ? one_exercise.day : selected_day,
                    type: previous_training_plan_key && one_exercise.type ? one_exercise.type : training_plan_title,
                    exercise: one_exercise.exercise,
                    periods: one_exercise.periods,
                    unit: one_exercise.unit,
                    order: index + 1
                }

                training_plan_data.push(training_plan_object) // Fills Training Plan Data Array With Objects Of Exercises
            })

            try {
                if(!logged_in_user) {
                    Alert.alert("Chyba", "Zmeny v tréningovom pláne nie je možné vykonať bez prihlásenia.") // Shows The Alert
                    return
                }

                const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
                // Sends The POST Request To The Server
                const manage_training_plan_response:Response = await fetch(`${API_URL}/manage-training-plan/`, {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Authorization": `Bearer ${user_token}`
                    },

                    body: JSON.stringify(training_plan_data)
                })

                // If The Response Isn't Success
                if(!manage_training_plan_response.ok) {
                    Alert.alert("Chyba", "Pri vykonávaní zmien v tréningovom pláne došlo k chybe.") // Shows The Alert
                    return
                }

                const manage_training_plan_data:BasicResponse = await manage_training_plan_response.json() // Gets The Loaded Training Plans Data

                // If The Response Isn't Success
                if(!manage_training_plan_data.success) {
                    Alert.alert("Chyba", manage_training_plan_data.message) // Shows The Alert
                    return
                }

                console.log(manage_training_plan_data)

                scheduleNotification(10) // Schedules The Notification (After 10 Seconds)
            }

            catch {
                Alert.alert("Chyba", "Pri vykonávaní zmien v tréningovom pláne došlo k chybe.") // Shows The Alert
            }
        }
    }

    return (
        <>
            {training_plans_exercises.length > 0 && (
                <View className="edit_training_plan hidden" style={styles.edit_training_plan}>
                    <View className="additional_info" style={styles.additional_info}>
                        <TextInput
                            className="title"
                            keyboardType="default"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textAlignVertical="top" 
                            placeholder="Názov" 
                            placeholderTextColor={LIGHT_BLUE_COLOR}
                            accessibilityLabel="Názov" 
                            value={training_plan_title}
                            onChangeText={setTrainingPlanTitle}
                            maxLength={50}
        
                            style={[
                                styles.title, 
                                { outlineStyle: "none" } as any
                            ]}
                        />
        
                        <View className="day_select_menu" style={styles.day_select_menu}>
                            <View className="select" style={styles.select}>
                                <Text>Nepriradiť deň</Text>
        
                                <Icon
                                    icon_name="angle-down"
                                    // onPress={}
                                    size={20}
                                />
                            </View>
        
                            <View className="options_list" style={styles.options_list}>
                                <Pressable 
                                    className="option"
                                    // onPress={() => setDay("not_selected"}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />
        
                                    <Text style={{ color: SECONDARY_COLOR }}>Nepriradiť deň</Text>
                                </Pressable>
        
                                <Pressable 
                                    className="option"
                                    // onPress={() => setDay(1}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="eye"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />
        
                                    <Text style={{ color: SECONDARY_COLOR }}>Pondelok</Text>
                                </Pressable>
        
                                <Pressable 
                                    className="option"
                                    // onPress={() => setDay(2}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />
        
                                    <Text style={{ color: SECONDARY_COLOR }}>Utorok</Text>
                                </Pressable>
        
                                <Pressable 
                                    className="option"
                                    // onPress={() => setDay(3}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />
        
                                    <Text style={{ color: SECONDARY_COLOR }}>Streda</Text>
                                </Pressable>
        
                                <Pressable 
                                    className="option"
                                    // onPress={() => setDay(4}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />
        
                                    <Text style={{ color: SECONDARY_COLOR }}>Štvrtok</Text>
                                </Pressable>
        
                                <Pressable 
                                    className="option"
                                    // onPress={() => setDay(5}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />
        
                                    <Text style={{ color: SECONDARY_COLOR }}>Piatok</Text>
                                </Pressable>
        
                                <Pressable 
                                    className="option"
                                    // onPress={() => setDay(6}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />
        
                                    <Text style={{ color: SECONDARY_COLOR }}>Sobota</Text>
                                </Pressable>
        
                                <Pressable 
                                    className="option"
                                    // onPress={() => setDay(0}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />
        
                                    <Text style={{ color: SECONDARY_COLOR }}>Nedeľa</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    {active_training_plan_exercises && active_training_plan_exercises.length > 0 && (generateTrainingPlan())} {/* Generates The Training Plan */}
        
                    <View className="buttons" style={styles.buttons}>
                        <Pressable
                            className="save"
                            onPress={saveTrainingPlan}
                            accessibilityLabel="Uložiť zmeny"
                            style={styles.save}
                        >
                            <Text style={{ color: SECONDARY_COLOR }}>Uložiť zmeny</Text>
                        </Pressable>

                        <Pressable
                            className="delete"
                            // onPress={}
                            accessibilityLabel="Vymazať"
                            style={styles.delete}
                        >
                            <Text style={{ color: SECONDARY_COLOR }}>Vymazať</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </>
    )
}

const styles = StyleSheet.create({
    edit_training_plan: {
        alignItems: "center",
        justifyContent: "center",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginHorizontal: "auto",
        marginBottom: 50,

        // &.hidden {
        //     display: none;
        // }
    },

    additional_info: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 20,
        width: "100%",
        marginBottom: 20,
    },

    title: {
        width: "100%",
        height: 50,
        // flex: 1 1 0px; 
        flex: 1,
        minWidth: 0,
        maxWidth: "50%",
        // max-width: calc(50% - 10px);
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;

        // &::-webkit-calendar-picker-indicator {
        //     display: none !important;
        // }

        // &.error_animation {
        //     animation: trainingTitleError 0.2s linear 3;
        // }
    },

    day_select_menu: {
        position: "relative",
        cursor: "pointer",
    },

    select: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 5,
        width: "100%",
        height: 50,
        paddingHorizontal: 8.5,
        color: LIGHT_BLUE_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border 0.3s ease, box-shadow 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &:has(.fa-angle-down:hover),
        // &:has(.fa-angle-up:hover) {
        //     border-color: $blue-color !important;
        // }

        // span {
        //     @include crop_text;
        // }
    },

    options_list: {
        // @include scrollbar;
        // interpolate-size: allow-keywords;
        position: "absolute",
        flex: 1,
        width: "100%",
        minWidth: 0,
        height: 0,
        marginTop: 10,
        color: SECONDARY_COLOR,
        backgroundColor: transparentize(MAIN_COLOR, 0.2),
        borderRadius: SMALL_BORDER_RADIUS,
        // overflow-y: $scrollbar;
        // transition: height 0.3s ease;
        zIndex: 500,

        // &::-webkit-scrollbar {
        //     width: 3px;
        // }

        // &.active {
            // height: 33 * 4,
        // }
    },

    option: {
        // @include crop_text;
        paddingVertical: 5,
        paddingHorizontal: 8.5,
        // transition: background-color 0.3s ease, color 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &.selected {
        //     background-color: transparentize($blue-color, 0.9);
        //     color: $light-blue-color;
        // }

        // &:focus-visible {
        //     outline: none !important;
        // }
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

        // &.animate {
        //     animation: trainingPlanDrag 1s infinite alternate;
        // }

        // &.blur {
        //     animation: blur 0.3s ease-out;
        // }
    },

    drop_zone: {
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: "100%",
        color: BLUE_COLOR,
        zIndex: 100,

        // &:not(.active) {
        //     display: none;
        // }

        // &:hover {
        //     cursor: pointer;

        //     .fa-compress {
        //         transform: scale(1.1);
        //         color: $dark-blue-color;
        //     }
        // }

        // .fa-compress {
        //     transition: transform 0.2s ease, color 0.3s ease;

        //     &.error_animation {
        //         animation: trainingPlanError 0.2s linear 3;
        //     }
        // }
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

    // exercise: {
    //     alignItems: "center",
    //     justifyContent: "flex-start",
    //     gap: 10,
    //     width: "100%",
    //     height: "100%",
    //     paddingVertical: 20,
    //     paddingHorizontal: 50,
    //     cursor: "move",
    //     zIndex: 100,
    //     // transition: transform 0.5s ease;

    //     // &:not(.active) {
    //     //     position: absolute;
    //     //     top: 0px;
    //     //     transform: translateX(100%);
    //     // }
    // },

    title_input: {
        width: "100%",
        textAlign: "center",
        color: SECONDARY_COLOR,
        // font-family: $article-heading-font;
        fontSize: 30,
    },

    // h3 {
    //     font-family: $article-heading-font;
    //     font-size: 2em;
    //     color: $secondary-color;
    // }

    labels: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: 400,
        width: "100%",
        marginTop: 10,
        marginBottom: 0,
        paddingHorizontal: 10,
    },

    unit_select_menu: {
        position: "relative",
        maxWidth: "90%",
        marginHorizontal: "auto",
        cursor: "pointer",
    },

    unit_select_menu_select: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 5,
        width: "100%",
        height: 50,
        paddingHorizontal: 8.5,
        color: LIGHT_BLUE_COLOR,
        // transition: border 0.3s ease, box-shadow 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &:has(.fa-angle-down:hover),
        // &:has(.fa-angle-up:hover) {
        //     border-color: $blue-color !important;
        // }

        // span {
        //     @include crop_text;
        // }
    },

    unit_select_menu_option: {
        // @include crop_text;
        position: "relative",
        paddingVertical: 5,
        paddingHorizontal: 8.5,
        textAlign: "center",
        // transition: background-color 0.3s ease, color 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &.selected {
        //     background-color: transparentize($blue-color, 0.9);
        //     color: $light-blue-color;
        // }

        // &:focus-visible {
        //     outline: none !important;
        // }

        // i {
        //     position: absolute;
        //     top: 50%;
        //     left: 10px;
        //     transform: translateY(-50%);
        // }
    },

    label: {
        width: "100%",
        textAlign: "center",
        lineHeight: 1,
        color: LIGHT_BLUE_COLOR,
    },

    add_period: {
        alignItems: "center",
        justifyContent: "center",
        width: "90%",
        height: 40,
        marginBottom: 10,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
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

    periods_container: {
        // @include scrollbar;
        gap: 5,
        width: "100%",
        maxHeight: 100,
        paddingHorizontal: 5,
    },

    period_selection: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "space-between",
        gap: 10,
    },

    reps_container: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        // width: "100%",
        flex: 1,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.2s ease;

        // &:hover,
        // &:focus-within {
        //     border-color: $blue-color;
        // }
    },

    sets_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        // width: "100%",
        flex: 1,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.2s ease;

        // &:hover,
        // &:focus-within {
        //     border-color: $blue-color;
        // }
    },

    reps: {
        // visibility: "hidden",
        // width: calc(100% - 30px - 30px);
        width: "100%",
        height: 40,
        textAlign: "center",
        color: SECONDARY_COLOR,
    },

    sets: {
        // width: calc(100% - 30px - 30px);
        width: "100%",
        height: 40,
        textAlign: "center",
        color: SECONDARY_COLOR,
    },

    to_failure: {
        width: "100%",
        height: 40,
        lineHeight: 40,
        textAlign: "center",
        color: SECONDARY_COLOR,

        // position: "absolute",
        // top: 0,
        // left: 0,

        // transform: [
        //     { translateX: "-100%" },
        //     { translateY: "-50%" }
        // ],

        // // width: calc(100% - 30px - 30px);
        // width: "100%",
        // height: "100%",
        // lineHeight: 40,
        // textAlign: "center",
        // // text-overflow: ellipsis;
        // // overflow: hidden;
    },

    time: {
        width: "100%",
        height: 40,
        lineHeight: 40,
        textAlign: "center",
        color: SECONDARY_COLOR,
        
        // visibility: "hidden",
        // position: "absolute",
        // top: 0,
        // left: 0,

        // transform: [
        //     { translateX: "-100%" },
        //     { translateY: "-50%" }
        // ],

        // // width: calc(100% - 30px - 30px);
        // width: "100%",
        // height: "100%",
        // lineHeight: 40,
        // textAlign: "center",
        // // text-overflow: ellipsis;
        // // overflow: hidden;
    },

    timer_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        marginTop: 29,
        paddingHorizontal: 40,
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
        marginBottom: 10,
        zIndex: 100,
    },

    bar: {
        position: "relative",
        flex: 1,
        height: 10,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: 10 / 2,

        // &.animate:not(&.active) {
        //     animation: barDrag 1s infinite alternate;
        // }

        // &:before {
        //     content: "";
        //     position: absolute;
        //     top: 0px;
        //     left: 0px;
        //     width: 100%;
        //     height: 100%;
        //     border-radius: inherit;
        //     transition: background-color 0.3s ease;
        // }

        // &.active,
        // &:hover {
        //     cursor: pointer;

        //     &.animate {
        //         &:before {
        //             animation: barDrag 1s infinite alternate;
        //         }
        //     }

        //     &:before {
        //         width: 100%;
        //         background-color: $green-color;
        //         box-shadow: 0px 0px 10px $green-color;
        //     }
        // }
    },

    buttons: {
        flexDirection: "row",
        gap: 20,
        width: "100%",
        marginTop: 10,
    },

    save: {
        // @include crop_text;
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
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

    delete: {
        // @include crop_text;
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        backgroundColor: transparentize(RED_COLOR, 0.9),
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(RED_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // outline: none;
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
        //     border-color: $red-color;
        //     background: transparentize($red-color, 0.75);
        //     box-shadow: 0 6px 20px transparentize($red-color, 0.8);
        //     transform: scale(1.05);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }
    },

    training_plan_bar_container: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        width: "100%",
        marginVertical: 10,
    },

    training_plan_bar: {
        flex: 1,
        height: 10,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: 10 / 2,
        // transition: background-color 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;

        // &.active,
        // &:hover {
        //     cursor: pointer;
        //     background-color: $blue-color;
        //     border-color: transparentize($blue-color, 0.2);
        //     box-shadow: 0px 0px 12px $plans-glow;
        // }
    },
})