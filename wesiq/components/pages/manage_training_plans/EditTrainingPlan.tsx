import { View, Text, StyleSheet, Pressable, Alert, Animated, TextInput, Platform } from "react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { getFormattedTime, getMinimalistFormattedTime } from "@/utils/time"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { BasicResponse } from "@/components/Feed"
import * as Notifications from "expo-notifications"
import Icon from "@/components/Icon"
import { generateKey } from "@/utils/generateKey"
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist"
import Svg, { Circle } from "react-native-svg"
import ReAnimated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated"
import { DaySelectMenu } from "./DaySelectMenu"
import { useTranslation } from "react-i18next"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"
import type { LoadedTrainingPlansResponse, TrainingPlanExercise } from "../activity/ActivitySection"
import type { Day } from "./DaySelectMenu"

export type TrainingPlanSlide = "drop_zone"|"exercise" // Types The Training Plan Slide

interface EditTrainingPlanProps {
    onTrainingPlansExercisesUpdate:(training_plans_exercises:TrainingPlanExercise[]) => void,
    training_plans_exercises:TrainingPlanExercise[],
    onSetDropZone:(layout:{ x:number, y:number, width:number, height:number }) => void,
    onSetActiveTrainingPlanDay:(day:Day|null) => void,
    onActiveExerciseIndexUpdate:(active_exercise_index:number) => void,
    active_exercise_index:number,
    onDragStart:(x:number, y:number, exercise:TrainingPlanExercise) => void,
    onDragMove:(x:number, y:number) => void,
    checkDropLocation:(x:number, y:number, exercise:TrainingPlanExercise) => void
}

export default function EditTrainingPlan({ 
    onTrainingPlansExercisesUpdate, 
    training_plans_exercises, 
    onSetDropZone, 
    onSetActiveTrainingPlanDay, 
    onActiveExerciseIndexUpdate, 
    active_exercise_index,
    onDragStart, 
    onDragMove, 
    checkDropLocation
}:EditTrainingPlanProps) {
    const { t } = useTranslation() // Initializes The Translations

    const notification_id = useRef<string|null>(null) // Stores The Notification ID

    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const [active_training_plan_index, setActiveTrainingPlanIndex] = useState<number>(0) // Stores The Active Training Plan Index
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
    
            if(status !== "granted") console.error(t("Notifikácie neboli povolené."))
        }
    
        requestNotificationPermissions() // Requests The Notification Permissions
    }, [])

    // Gets The Grouped Training Plans Exercises
    const grouped_training_plans_exercises:(Day|string)[] = [...new Set(
        training_plans_exercises.map((one_exercise:TrainingPlanExercise) => 
            one_exercise.day !== null ? one_exercise.day : one_exercise.training_plan_key
        )
    )]

    const selected_day_or_training_plan_key:Day|string|null = grouped_training_plans_exercises[active_training_plan_index] || null // Selects Current Or Upcoming Day Of Training Plan

    // Initializes The Active Training Plan Day
    useEffect(() => {
        if(typeof selected_day_or_training_plan_key === "number") onSetActiveTrainingPlanDay(selected_day_or_training_plan_key) // Sets The Active Training Plan Day
    }, [selected_day_or_training_plan_key])
    
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

    const exercise_translateX = useSharedValue(0) // Stores The X Transform
    const exercise_translateY = useSharedValue(0) // Stores The Y Transform
    const exercise_scale = useSharedValue(1) // Stores The Scale

    // Function For Initialize The Drag Gesture
    const initializeDragGesture = (exercise:TrainingPlanExercise) => {
        // Creates The Drag Gesture (Starts After 250MS Hold)
        const drag = Gesture.Pan()
            .activateAfterLongPress(250)
            .onStart((event) => {
                exercise_scale.value = withSpring(0.95) // Shrinks The Item
                runOnJS(onDragStart)(event.absoluteX, event.absoluteY, exercise)
            })
            .onChange((event) => {
                runOnJS(onDragMove)(event.absoluteX, event.absoluteY);
            })
            .onFinalize((event) => {
                exercise_scale.value = withSpring(1) // Scales The Item
                runOnJS(checkDropLocation)(event.absoluteX, event.absoluteY, exercise)
                exercise_translateX.value = withSpring(0)
                exercise_translateY.value = withSpring(0)
            })

        return drag
    }

    // Animates The Exercise
    const animated_exercise = useAnimatedStyle(() => ({
        transform: [
            { translateX: exercise_translateX.value },
            { translateY: exercise_translateY.value },
            { scale: exercise_scale.value },
        ],

        zIndex: exercise_scale.value > 1 ? 100 : 1, 

        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: exercise_scale.value > 1 ? 0.2 : 0,
        shadowRadius: 30,
        elevation: exercise_scale.value > 1 ? 10 : 0,
    }))

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
                    title: t("Tréningový plán"),
                    body: t("Tréningový plán bol úspešne upravený."),
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
            console.error(t("Pri plánovaní notifikácie došlo k chybe."))
        }
    }

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
                onTrainingPlansExercisesUpdate(loaded_training_plans_data.training_plans) // Sets The Training Plans Exercises
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

    // Function For Render Exercises Of The Selected Training Plan
    const generateTrainingPlan = () => {
        return (
            <>
                <GestureDetector gesture={swipe_gesture}>
                    <View 
                        className="training_plan" 
                        onLayout={(event) => {onSetDropZone(event.nativeEvent.layout)}}
                        style={styles.training_plan}
                    >
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
                                        size={40}
                                        color={BLUE_COLOR}
                                    />
                                </View>
                            )}

                            {training_plan_slide === "exercise" && active_exercise && (
                                <>
                                    {/* Creates Warm Up */}
                                    {active_exercise.is_warm_up && (
                                        <View className="exercise warm_up" style={styles.warm_up}>
                                            <Text 
                                                className="title" 

                                                style={{ 
                                                    color: SECONDARY_COLOR,
                                                    fontSize: 30,
                                                }}
                                            >
                                                {t("Warm Up")}
                                            </Text>

                                            <View className="timer_container" style={styles.timer_container}>
                                                <View className="subtract_time">
                                                    <IconButton 
                                                        icon_name="minus" 
                                                        onPress={() => changeWarmUpTime(active_exercise, "subtract")}
                                                    />
                                                </View>

                                                <View className="timer" style={styles.warm_up_timer}>
                                                    <Svg width="100" height="100" viewBox="0 0 100 100">
                                                        <Circle
                                                            cx="50"
                                                            cy="50"
                                                            r={40}
                                                            fill="transparent"
                                                            stroke={BLUE_COLOR}
                                                            strokeWidth="3"
                                                        />
                                                    </Svg>

                                                    <Text className="countdown" style={styles.warm_up_timer_text}>{`${getFormattedTime("minutes", active_exercise.periods[0])}:${getFormattedTime("seconds", active_exercise.periods[0], true)}`}</Text> {/* Stores Timer Of Warm Up */}
                                                </View>

                                                <View className="add_time">
                                                    <IconButton 
                                                        icon_name="plus" 
                                                        onPress={() => changeWarmUpTime(active_exercise, "add")}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    {/* Creates Exercise */}
                                    {!active_exercise.is_warm_up && (
                                        <GestureDetector gesture={initializeDragGesture(active_exercise)}>
                                            <ReAnimated.View 
                                                className="exercise" 

                                                style={[
                                                    animated_exercise,
                                                    styles.exercise,
                                                ]}
                                            >
                                                {active_exercise.is_custom_exercise ? (
                                                    // Sets Exercise Title
                                                    <TextInput 
                                                        className="title" 
                                                        keyboardType="default"
                                                        textAlignVertical="top"
                                                        placeholder={t("Názov cviku")} 
                                                        placeholderTextColor={LIGHT_BLUE_COLOR}
                                                        accessibilityLabel={t("Názov cviku")} 
                                                        value={active_exercise.exercise}
                                                        onChangeText={(text) => changeExerciseTitle(active_exercise, text)}
                                                        maxLength={50}

                                                        style={[{
                                                            maxWidth: 350,
                                                            textAlign: "center",
                                                            color: SECONDARY_COLOR,
                                                            fontSize: 30,
                                                            outlineStyle: "none" as any
                                                        }]}
                                                    /> 
                                                ) : (
                                                    // Sets Exercise Title
                                                    <Text 
                                                        className="title" 

                                                        style={{
                                                            maxWidth: 350,
                                                            textAlign: "center",
                                                            color: SECONDARY_COLOR,
                                                            fontSize: 30,
                                                        }}
                                                    >
                                                        {active_exercise.exercise}
                                                    </Text> 
                                                )}

                                                <View className="labels" style={styles.labels}>
                                                    <Text className="unit_amount" style={styles.label}>
                                                        {active_exercise.unit === "reps" && t("Počet opakovaní")}
                                                        {active_exercise.unit === "seconds" && t("Počet sekúnd")}
                                                        {active_exercise.unit === "steps" && t("Počet krokov")}
                                                    </Text>

                                                    <Text style={styles.label}>{t("Série")}</Text>
                                                </View>

                                                <Pressable 
                                                    className="add_period"
                                                    onPress={() => addPeriod(active_exercise)}
                                                    accessibilityLabel={t("Pridať sériu")}
                                                    style={styles.add_period}
                                                >
                                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Pridať sériu")}</Text>
                                                </Pressable>

                                                <View className="periods_container" style={styles.periods_container}>
                                                    {/* Generates Exact Amount Of Period Selections For Exercise */}
                                                    {generatePeriodSelections(
                                                        active_exercise.periods,
                                                        getConsecutiveNumbersCount(active_exercise.periods),
                                                        active_exercise.unit
                                                    )}
                                                </View>
                                            </ReAnimated.View>
                                        </GestureDetector>
                                    )}
                                </>
                            )}
                        </Animated.View>

                        <View className="bar_container" style={{ width: "100%" }}>
                            <DraggableFlatList
                                horizontal
                                data={active_training_plan_exercises}
                                keyExtractor={(one_exercise) => String(one_exercise.id)}
                                renderItem={renderBar}
                                activationDistance={5}

                                contentContainerStyle={[
                                    styles.bar_container,

                                    {
                                        justifyContent: "center",
                                        flexGrow: 1,
                                        gap: 10,
                                    },
                                ]}

                                onDragEnd={({ data, from, to }) => {
                                    if(from === to) return
                                
                                    const dragged_exercise:TrainingPlanExercise = active_training_plan_exercises[from]
                                    const dropped_exercise:TrainingPlanExercise = active_training_plan_exercises[to]

                                    if (
                                        dragged_exercise.exercise === "Warm Up" ||
                                        dropped_exercise.exercise === "Warm Up"
                                    ) {
                                        return
                                    }
                                
                                    // Gets The Updated Exercises
                                    const updated_exercises:TrainingPlanExercise[] = data.map((one_exercise:TrainingPlanExercise, index:number) => ({
                                        ...one_exercise,
                                        order: index + 1
                                    }))
                                
                                    onTrainingPlansExercisesUpdate(updated_exercises) // Sets The Training Plan Exercises
                                }}
                            />
                        </View>

                        {/* <View className="bar_container" style={styles.bar_container}>
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
                        </View> */}
                    </View>
                </GestureDetector>

                {grouped_training_plans_exercises.length > 1 && (createTrainingPlanBars(grouped_training_plans_exercises.length))} {/* Creates And Renders Training Plan Bars (Only If There Are More Than One Training Plan Available) */}
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
                                        onChangeText={(text:string) => changeRepsWithInput(active_exercise, index, text)}
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
                            onChangeText={(text:string) => changeSetsWithInput(active_exercise, index, text)}
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

    const total_gaps:number = (active_training_plan_exercises.length - 1) * 10 // Defines The Total Gaps
    const bar_width:number = (MAIN_WIDTH - 20 - total_gaps) / active_training_plan_exercises.length // Defines The Bar Width

    const renderBar = ({ item, getIndex, drag, isActive }:RenderItemParams<TrainingPlanExercise>) => {
        const index = getIndex()
        
        return (
            <ScaleDecorator>
                <Pressable
                    className={index === active_exercise_index ? "bar active" : "bar"} // Adds Active Class For Bar Of Active Training Plan
                    onLongPress={drag}
                    onPress={() => changeExercises(index as number)} // Changes Training Plans
                    disabled={isActive}

                    hitSlop={{
                        top: 20,
                        right: 10,
                        bottom: 20,
                        left: 10,
                    }}

                    style={{
                        justifyContent: "center",
                        width: Math.max(bar_width, 10),
                        paddingVertical: 15,
                    }}
                >
                    <View
                        style={[
                            styles.bar,
                            { width: "100%" },

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
                </Pressable>
            </ScaleDecorator>
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
        onActiveExerciseIndexUpdate(0) // Sets The Active Exercise Index
        setActiveTrainingPlanIndex(new_index) // Sets The Active Training Plan Index
    }

    // Function For Change Exercises In The Training Plan
    const changeExercises = (new_index:number, max_index?:number):void => {
        // Swipe
        if(max_index !== undefined) {
            if(new_index >= 0 && new_index <= max_index) onActiveExerciseIndexUpdate(new_index) // Sets The Active Exercise Index
            else if(new_index > max_index) onActiveExerciseIndexUpdate(0) // Sets The Active Exercise Index
            else if(new_index < 0) onActiveExerciseIndexUpdate(max_index) // Sets The Active Exercise Index
        } 
    
        // Click
        else onActiveExerciseIndexUpdate(new_index) // Sets The Active Exercise Index
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

    // Function For Handle The Title Change
    const handleTitleChange = (new_title:string):void => {
        setTrainingPlanTitle(new_title) // Sets The Training Plan Title

        // Gets The Active Training Plan IDs
        const active_ids:Set<number> = new Set(
            active_training_plan_exercises.map((active_exercise:TrainingPlanExercise) => active_exercise.id)
        )

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:TrainingPlanExercise[] = training_plans_exercises.map((one_exercise:TrainingPlanExercise) => {
            if(active_ids.has(one_exercise.id)) {
                return {
                    ...one_exercise,
                    type: new_title // Updates The Title
                }
            }

            return one_exercise // Returns The Unchanged Exercise
        })

        onTrainingPlansExercisesUpdate(updated_training_plans_exercises) // Sets The Training Plans Exercises
    }

    // Function For Change Training Plan Day
    const changeTrainingPlanDay = (new_day:Day|null):void => {
        if(active_training_plan_exercises.length === 0) return

        const previous_day:Day|null = active_training_plan_exercises[0].day // Gets The Previous Day

        // Gets The Active Training Plan IDs
        const active_ids:Set<number> = new Set(
            active_training_plan_exercises.map((active_exercise:TrainingPlanExercise) => active_exercise.id)
        )

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:TrainingPlanExercise[] = training_plans_exercises.map((one_exercise:TrainingPlanExercise) => {
            if(active_ids.has(one_exercise.id)) {
                return {
                    ...one_exercise,
                    day: new_day // Updates The Day
                }
            }

            // If The New Day Is Already Used
            if(new_day !== null && one_exercise.day === new_day) {
                return {
                    ...one_exercise,
                    day: previous_day // Swaps Days
                }
            }

            return one_exercise // Returns The Unchanged Exercise
        })

        onTrainingPlansExercisesUpdate(updated_training_plans_exercises) // Sets The Training Plans Exercises
    }

    // Function For Change The Exercise Title
    const changeExerciseTitle = (exercise:TrainingPlanExercise, new_title:string):void => {
        if(new_title.length > 50) return // Do Nothing

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:TrainingPlanExercise[] = training_plans_exercises.map((one_exercise:TrainingPlanExercise) => {
            if(one_exercise.id === exercise.id) {
                return {
                    ...one_exercise,
                    exercise: new_title
                }
            }

            return one_exercise // Returns The Unchanged Exercise
        })

        onTrainingPlansExercisesUpdate(updated_training_plans_exercises) // Sets The Training Plans Exercises
    }

    // Function Add Period To The Exercise
    const addPeriod = (exercise:TrainingPlanExercise):void => {
        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:TrainingPlanExercise[] = training_plans_exercises.map((one_exercise:TrainingPlanExercise) => {
            if(one_exercise.id === exercise.id) {
                return {
                    ...one_exercise,
                    periods: [...one_exercise.periods, 0] // Adds New Period To The Exercise In The Training Plan
                }
            }

            return one_exercise // Returns The Unchanged Exercise
        })

        onTrainingPlansExercisesUpdate(updated_training_plans_exercises) // Sets The Training Plans Exercises
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

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:TrainingPlanExercise[] = training_plans_exercises.map((one_exercise:TrainingPlanExercise) => {
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
        })

        onTrainingPlansExercisesUpdate(updated_training_plans_exercises) // Sets The Training Plans Exercises
    }

    // Function For Change The Reps Value Via Text Input
    const changeRepsWithInput = (exercise:TrainingPlanExercise, period_index:number, new_value:string):void => {
        const clean_value:string = new_value.replace(/[^0-9]/g, "") // Cleans The New Entered Value
        const reps_number:number = clean_value === "" ? 0 : parseInt(clean_value, 10) // Gets Current Reps Amount

        if(reps_number > 100) return // Do Nothing

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:TrainingPlanExercise[] = training_plans_exercises.map((one_exercise:TrainingPlanExercise) => {
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
        })

        onTrainingPlansExercisesUpdate(updated_training_plans_exercises) // Sets The Training Plans Exercises
    }

    // Function For Change The Sets Value
    const changeSets = (exercise: TrainingPlanExercise, period_index: number, operation: "decrease" | "increase"): void => {
        let sets_number:number = getConsecutiveNumbersCount(exercise.periods)[period_index] // Gets Current Sets Amount
        const reps_number:number = compressConsecutiveNumbers(exercise.periods)[period_index] // Gets Current Reps Amount

        if(operation === "decrease") sets_number -= 1 // Decreases Sets Amount By 1
        if(operation === "increase") sets_number += 1 // Increases Sets Amount By 1

        if(sets_number < 0 || sets_number > 100) return // Do Nothing
        if(sets_number === 0 && exercise.periods.length === 1) return // Do Nothing

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:TrainingPlanExercise[] = training_plans_exercises.map((one_exercise:TrainingPlanExercise) => {
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
        })

        onTrainingPlansExercisesUpdate(updated_training_plans_exercises) // Sets The Training Plans Exercises
    }

    // Function For Change The Sets Value Via Text Input
    const changeSetsWithInput = (exercise:TrainingPlanExercise, period_index:number, new_value:string):void => {
        const clean_value:string = new_value.replace(/[^0-9]/g, "") // Cleans The New Entered Value
        const sets_number:number = clean_value === "" ? 1 : parseInt(clean_value, 10) // Gets Current Sets Amount

        if(sets_number < 1 || sets_number > 100) return // Do Nothing

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:TrainingPlanExercise[] = training_plans_exercises.map((one_exercise:TrainingPlanExercise) => {
            if(one_exercise.id === exercise.id) {
                const counts:number[] = getConsecutiveNumbersCount(one_exercise.periods) // Counts Consecutive Numbers
                const reps_number:number = compressConsecutiveNumbers(one_exercise.periods)[period_index] // Gets Current Reps Amount

                let start_index:number = 0 // Stores The Period Start Index

                // Updates The Period Start Index
                for(let i = 0; i < period_index; i++) {
                    start_index += counts[i]
                }
                
                const current_sets_amount: number = counts[period_index] // Gets The Current Sets Amount
            
                const updated_periods:number[] = [...one_exercise.periods] // Gets The Updated Periods

                updated_periods.splice(
                    start_index, 
                    current_sets_amount, 
                    ...Array(sets_number).fill(reps_number)
                )

                return {
                    ...one_exercise,
                    periods: updated_periods
                }
            }

            return one_exercise // Returns The Unchanged Exercise
        })

        onTrainingPlansExercisesUpdate(updated_training_plans_exercises) // Sets The Training Plans Exercises
    }

    // Function For Changing Warm Up Time
    const changeWarmUpTime = (warm_up:TrainingPlanExercise, operation:"subtract"|"add"):void => {
        let elapsed_seconds:number = warm_up.periods[0] // Gets Elapsed Seconds From Timer Value

        if(elapsed_seconds <= 30 && operation === "subtract") return // Stop Subtracting When On Timer Is 30 Seconds
        if(elapsed_seconds === 3600 && operation === "add") return // Stop Adding When On Timer Is 1 Hour

        if(operation === "subtract") elapsed_seconds -= 30 // Subtracts 30 Seconds
        if(operation === "add") elapsed_seconds += 30 // Adds 30 Seconds

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:TrainingPlanExercise[] = training_plans_exercises.map((one_exercise:TrainingPlanExercise) => {
            if(one_exercise.id === warm_up.id) {
                return {
                    ...one_exercise,
                    periods: warm_up.periods = [elapsed_seconds] // Sets New Timer Value
                }
            }

            return one_exercise // Returns The Unchanged Exercise
        })

        onTrainingPlansExercisesUpdate(updated_training_plans_exercises) // Sets The Training Plans Exercises
    }

    // Function For Save The Training Plan
    const saveTrainingPlan = async ():Promise<void> => {
        if(!training_plan_title.trim()) {
            Alert.alert(t("Chyba"), t("Pridajte názov pre tréningový plán.")) // Shows The Alert
            return
        }

        if(active_training_plan_exercises.length === 0) {
            Alert.alert(t("Chyba"), t("Pridajte aspoň nejaký cvik pre tréningový plán.")) // Shows The Alert
            return
        }

        // Checks For Empty Exercise Title Inputs In Custom Exercises In The Training Plan
        const custom_exercises_without_name:TrainingPlanExercise[] = [...active_training_plan_exercises].filter((one_exercise:TrainingPlanExercise) => one_exercise.exercise.trim() === "") // Gets The Custom Exercises Without Name

        if(custom_exercises_without_name.length > 0) {
            const first_custom_exercise_without_name_index:number = [...active_training_plan_exercises].indexOf(custom_exercises_without_name[0]) // Gets Index Of The First Custom Exercise Without Filled Title Input
            changeExercises(first_custom_exercise_without_name_index) // Shows The Exercise Of The First Custom Exercise Without Filled Title Input Index
        }

        // Only Saves If Everything Required Is Filled
        if(training_plan_title.trim() && active_training_plan_exercises.length > 0 && custom_exercises_without_name.length === 0) {
            const fallback_new_training_plan_key:string = generateKey(50) // Gets Random 50 Characters Long Generated Key

            // Stores All New Saved Training Plan Data
            const training_plan_data:{
                previous_training_plan_key:string|null,
                training_plan_key:string,
                action:string,
                day:number|null,
                type:string,
                exercise:string,
                periods:number[],
                unit:string,
                order:number,
                is_warm_up:boolean,
                is_custom_exercise:boolean
            }[] = []

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
                    order:number,
                    is_warm_up:boolean,
                    is_custom_exercise:boolean
                } = {
                    previous_training_plan_key,
                    training_plan_key: current_training_plan_key,
                    action: existing_exercise ? "edited_training_plan" : "new_training_plan",
                    day: previous_training_plan_key && one_exercise.day !== undefined ? one_exercise.day : typeof selected_day_or_training_plan_key === "number" ? selected_day_or_training_plan_key : null, // Stores Training Plan Day
                    type: previous_training_plan_key && one_exercise.type ? one_exercise.type : training_plan_title,
                    exercise: one_exercise.exercise,
                    periods: one_exercise.periods,
                    unit: one_exercise.unit,
                    order: index + 1,
                    is_warm_up: one_exercise.is_warm_up,
                    is_custom_exercise: one_exercise.is_custom_exercise
                }

                training_plan_data.push(training_plan_object) // Fills Training Plan Data Array With Objects Of Exercises
            })

            try {
                if(!logged_in_user) {
                    Alert.alert(t("Chyba"), t("Zmeny v tréningovom pláne nie je možné vykonať bez prihlásenia.")) // Shows The Alert
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
                    Alert.alert(t("Chyba"), t("Pri vykonávaní zmien v tréningovom pláne došlo k chybe.")) // Shows The Alert
                    return
                }

                const manage_training_plan_data:BasicResponse = await manage_training_plan_response.json() // Gets The Loaded Training Plans Data

                // If The Response Isn't Success
                if(!manage_training_plan_data.success) {
                    Alert.alert(t("Chyba"), manage_training_plan_data.message) // Shows The Alert
                    return
                }

                scheduleNotification(10) // Schedules The Notification (After 10 Seconds)
            }

            catch {
                Alert.alert(t("Chyba"), t("Pri vykonávaní zmien v tréningovom pláne došlo k chybe.")) // Shows The Alert
            }
        }
    }

    // Function For Delete The Training Plan
    const deleteTrainingPlan = async ():Promise<void> => {
        // Stores All Delete Training Plan Data
        const training_plan_data:{
            training_plan_key:string,
            action:string
        }[] = []

        // Gets Info From Every Exercise
        active_training_plan_exercises.forEach(function(one_exercise:TrainingPlanExercise, index:number) {
            const training_plan_key:string|null = one_exercise.training_plan_key || null // Gets Training Plan Key

            if(!training_plan_key) return

            // Creates And Fills The Object Of One Exercise For Delete Training Plan
            const delete_training_plan_object:{
                training_plan_key:string,
                action:string
            } = {
                training_plan_key: training_plan_key,
                action: "delete_training_plan"
            }

            training_plan_data.push(delete_training_plan_object) // Fills Training Plan Data Array With Objects Of Exercises
        })

        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Zmeny v tréningovom pláne nie je možné vykonať bez prihlásenia.")) // Shows The Alert
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
                Alert.alert(t("Chyba"), t("Pri odstraňovaní tréningového plánu došlo k chybe.")) // Shows The Alert
                return
            }

            const manage_training_plan_data:BasicResponse = await manage_training_plan_response.json() // Gets The Loaded Training Plans Data

            // If The Response Isn't Success
            if(!manage_training_plan_data.success) {
                Alert.alert(t("Chyba"), manage_training_plan_data.message) // Shows The Alert
                return
            }

            onActiveExerciseIndexUpdate(0) // Sets The Active Exercise Index
            setActiveTrainingPlanIndex(0) // Sets The Active Training Plan Index

            // Removes Deleted Exercises
            const training_plan_key:string = training_plan_data[0].training_plan_key // Gets The Training Plan Key

            // Stores The New State Of Updated Training Plans Exercises
            const updated_training_plans_exercises:TrainingPlanExercise[] = training_plans_exercises.filter(
                (one_exercise:TrainingPlanExercise) => one_exercise.training_plan_key !== training_plan_key
            )

            onTrainingPlansExercisesUpdate(updated_training_plans_exercises) // Sets The Training Plans Exercises
            
            scheduleNotification(10) // Schedules The Notification (After 10 Seconds)
        }

        catch {
            Alert.alert(t("Chyba"), t("Pri odstraňovaní tréningového plánu došlo k chybe.")) // Shows The Alert
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
                            placeholder={t("Názov")} 
                            placeholderTextColor={LIGHT_BLUE_COLOR}
                            accessibilityLabel={t("Názov")} 
                            value={training_plan_title}
                            onChangeText={handleTitleChange}
                            maxLength={50}
        
                            style={[
                                styles.title, 
                                { outlineStyle: "none" } as any
                            ]}
                        />
        
                        <DaySelectMenu 
                            used_days={typeof grouped_training_plans_exercises === "number" ? grouped_training_plans_exercises : []}
                            onDayUpdate={(selected_day) => changeTrainingPlanDay(selected_day)} // Changes The Training Plan Day
                            day={typeof selected_day_or_training_plan_key === "number" ? selected_day_or_training_plan_key : null}
                        />
                    </View>

                    {active_training_plan_exercises && active_training_plan_exercises.length > 0 && (generateTrainingPlan())} {/* Generates The Training Plan */}
        
                    <View className="buttons" style={styles.buttons}>
                        <Pressable
                            className="save"
                            onPress={saveTrainingPlan}
                            accessibilityLabel={t("Uložiť zmeny")}
                            style={styles.save}
                        >
                            <Text style={{ color: SECONDARY_COLOR }}>{t("Uložiť zmeny")}</Text>
                        </Pressable>

                        <Pressable
                            className="delete"
                            onPress={deleteTrainingPlan}
                            accessibilityLabel={t("Vymazať")}
                            style={styles.delete}
                        >
                            <Text style={{ color: SECONDARY_COLOR }}>{t("Vymazať")}</Text>
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
        marginVertical: "auto",
        paddingHorizontal: 40,
        paddingBottom: 34,
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
        marginBottom: 10,
        zIndex: 100,
    },

    bar: {
        position: "relative",
        // flex: 1,
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