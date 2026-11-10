import Icon from "@/components/Icon"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { getFormattedTime, getMinimalistFormattedTime } from "@/utils/time"
import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Alert, Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import IconButton from "@/components/IconButton"
import Svg, { Circle } from "react-native-svg"
import { BlurView } from "expo-blur"

import type { OfficialTrainingPlanExercise } from "./CopyTrainingPlan"
import type { BasicResponse } from "../community/Feed"
import { API_URL } from "@/constants/general"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface OfficialTrainingPlanItemProps {
    onTrainingPlansExercisesUpdate:(training_plans_exercises:OfficialTrainingPlanExercise[]) => void,
    ordered_exercises:OfficialTrainingPlanExercise[],
    training_plan_key:string
}

export const OfficialTrainingPlanItem = ({ 
    onTrainingPlansExercisesUpdate, 
    ordered_exercises, 
    training_plan_key
}:OfficialTrainingPlanItemProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const [active_exercise_index, setActiveExerciseIndex] = useState<number>(0) // Stores The Active Exercise Index

    const [bar_container_width, setBarContainerWidth] = useState<number>(0) // Stores The Bar Container Width

    const translateX = useState(() => new Animated.Value(0))[0] // Translate X Animation

    // Gets The Active Training Plan Exercises
    const active_training_plan_exercises:OfficialTrainingPlanExercise[] = useMemo(() => {
        return ordered_exercises.filter(one_exercise => 
            one_exercise.training_plan_key === training_plan_key
        )
    }, [ordered_exercises, training_plan_key])

    const active_exercise:OfficialTrainingPlanExercise = active_training_plan_exercises[active_exercise_index] // Gets The Active Exercise

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
                                    <View className="exercise" style={styles.exercise}>
                                        <Text 
                                            className="title" 

                                            style={{
                                                maxWidth: 350,
                                                marginBottom: 15,
                                                textAlign: "center",
                                                color: SECONDARY_COLOR,
                                                fontSize: 30,
                                            }}
                                        >
                                            {active_exercise.exercise}
                                        </Text> 

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
                                    </View>
                                )}
                            </>
                        </Animated.View>

                        <View 
                            className="bar_container" 
                            style={styles.bar_container}
                            onLayout={(event) => {setBarContainerWidth(event.nativeEvent.layout.width)}}
                        >
                            <DraggableFlatList
                                horizontal
                                data={active_training_plan_exercises}
                                keyExtractor={(one_exercise) => String(one_exercise.id)}
                                renderItem={renderBar}
                                activationDistance={5}
                                scrollEnabled={false} 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ justifyContent: "center" }}

                                onDragEnd={({ data, from, to }) => {
                                    if(from === to) return
                                
                                    const dragged_exercise:OfficialTrainingPlanExercise = active_training_plan_exercises[from]
                                    const dropped_exercise:OfficialTrainingPlanExercise = active_training_plan_exercises[to]

                                    if (
                                        dragged_exercise.exercise === "Warm Up" ||
                                        dropped_exercise.exercise === "Warm Up"
                                    ) {
                                        return
                                    }
                                
                                    // Gets The Updated Exercises
                                    const updated_exercises:OfficialTrainingPlanExercise[] = data.map((one_exercise:OfficialTrainingPlanExercise, index:number) => ({
                                        ...one_exercise,
                                        order: index + 1
                                    }))
                                
                                    onTrainingPlansExercisesUpdate(updated_exercises) // Sets The Training Plan Exercises
                                }}
                            />
                        </View>
                    </View>
                </GestureDetector>
            </>
        )
    }

    // Function For Generate Period Selections
    const generatePeriodSelections = (periods_data:number[], amount:number[], unit:string) => {
        return amount.map((one_unit:number, index:number) => {
            return (
                <View key={index} className="period_selection" style={styles.period_selection}>
                    <View className="reps_container" style={styles.reps_sets_container}>
                        <View className="decrease_reps" style={{ flexShrink: 0, paddingHorizontal: 5 }}>
                            <Icon 
                                icon_name="minus"
                                onPress={() => changeReps(active_exercise, index, "decrease")}
                                size={18}
                            />
                        </View>
                
                        {/* Shows To Failure Text */}
                        {compressConsecutiveNumbers(active_exercise.periods)[index] === 0 ? (
                            <Text 
                                className="to_failure" 

                                style={[
                                    styles.reps_sets_input,

                                    { 
                                        lineHeight: 45, 
                                        fontSize: 14,
                                    }
                                ]}
                            >
                                {t("Do zlyhania")}
                            </Text>
                        ) : (
                            <>
                                {/* Checks Exercise Unit Type */}
                                {(active_exercise.unit === "reps" || active_exercise.unit === "steps") && (
                                    <TextInput
                                        className="reps"
                                        keyboardType="number-pad"
                                        textAlignVertical="top" 
                                        value={String(compressConsecutiveNumbers(active_exercise.periods)[index])}
                                        onChangeText={(text:string) => changeRepsWithInput(active_exercise, index, text)}
                                        maxLength={4}

                                        style={[
                                            styles.reps_sets_input,
                                            { outlineStyle: "none" } as any
                                        ]}
                                    />
                                )}

                                {active_exercise.unit === "seconds" && (
                                    <Text 
                                        className="time" 

                                        style={[
                                            styles.reps_sets_input,
                                            { color: SECONDARY_COLOR }
                                        ]}
                                    >
                                        {compressConsecutiveNumbers(active_exercise.periods)[index] ? getMinimalistFormattedTime(compressConsecutiveNumbers(active_exercise.periods)[index] as number).trim() : "0s"}
                                    </Text>
                                )}
                            </>
                        )}

                        <View className="increase_reps" style={{ flexShrink: 0, paddingHorizontal: 5 }}>
                            <Icon 
                                icon_name="plus"
                                onPress={() => changeReps(active_exercise, index, "increase")}
                                size={18}
                            />
                        </View>
                    </View>
                    
                    <View className="sets_container" style={styles.reps_sets_container}>
                        <View className="decrease_sets" style={{ flexShrink: 0, paddingHorizontal: 5 }}>
                            <Icon 
                                icon_name="minus"
                                onPress={() => changeSets(active_exercise, index, "decrease")}
                                size={18}
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
                                styles.reps_sets_input,
                                { outlineStyle: "none" } as any
                            ]}
                        />

                        <View className="increase_sets" style={{ flexShrink: 0, paddingHorizontal: 5 }}>
                            <Icon 
                                icon_name="plus"
                                onPress={() => changeSets(active_exercise, index, "increase")}
                                size={18}
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

    // Function For Render The Bar
    const renderBar = ({ item, getIndex, drag, isActive }: RenderItemParams<OfficialTrainingPlanExercise>) => {
        const index:number = getIndex() ?? 0 // Gets The Index
        const is_last_item:boolean = index === active_training_plan_exercises.length - 1 // Checks If The Item Is Last
        
        const bar_width:number = bar_container_width > 0 ? (bar_container_width - (10 * (active_training_plan_exercises.length - 1))) / active_training_plan_exercises.length : 0 // Gets The Bar Width
        
        return (
            <ScaleDecorator>
                <Pressable
                    className={index === active_exercise_index ? "bar active" : "bar"} // Adds Active Class For Bar Of Active Training Plan
                    onLongPress={drag}
                    onPress={() => changeExercises(index)}
                    disabled={isActive}
                    
                    hitSlop={{
                        top: 20,
                        right: 5,
                        bottom: 20,
                        left: 5,
                    }}

                    style={{
                        justifyContent: "center",
                        marginRight: is_last_item ? 0 : 10,
                        paddingBottom: 15,
                    }}
                >
                    <View
                        style={[
                            { 
                                width: bar_width,
                                height: 10,
                                borderWidth: 1,
                                borderColor: transparentize(BLUE_COLOR, 0.5),
                                borderRadius: 5,
                            },

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
    const addPeriod = (exercise:OfficialTrainingPlanExercise):void => {
        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:OfficialTrainingPlanExercise[] = ordered_exercises.map((one_exercise:OfficialTrainingPlanExercise) => {
            if(one_exercise.id === exercise.id && one_exercise.training_plan_key === exercise.training_plan_key) {
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
    const changeReps = (exercise:OfficialTrainingPlanExercise, period_index:number, operation:"decrease"|"increase"):void => {
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
        const updated_training_plans_exercises:OfficialTrainingPlanExercise[] = ordered_exercises.map((one_exercise:OfficialTrainingPlanExercise) => {
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
    const changeRepsWithInput = (exercise:OfficialTrainingPlanExercise, period_index:number, new_value:string):void => {
        const clean_value:string = new_value.replace(/[^0-9]/g, "") // Cleans The New Entered Value
        const reps_number:number = clean_value === "" ? 0 : parseInt(clean_value, 10) // Gets Current Reps Amount

        if(reps_number > 100) return // Do Nothing

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:OfficialTrainingPlanExercise[] = ordered_exercises.map((one_exercise:OfficialTrainingPlanExercise) => {
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
    const changeSets = (exercise: OfficialTrainingPlanExercise, period_index: number, operation: "decrease" | "increase"): void => {
        let sets_number:number = getConsecutiveNumbersCount(exercise.periods)[period_index] // Gets Current Sets Amount
        const reps_number:number = compressConsecutiveNumbers(exercise.periods)[period_index] // Gets Current Reps Amount

        if(operation === "decrease") sets_number -= 1 // Decreases Sets Amount By 1
        if(operation === "increase") sets_number += 1 // Increases Sets Amount By 1

        if(sets_number < 0 || sets_number > 100) return // Do Nothing
        if(sets_number === 0 && exercise.periods.length === 1) return // Do Nothing

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:OfficialTrainingPlanExercise[] = ordered_exercises.map((one_exercise:OfficialTrainingPlanExercise) => {
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
    const changeSetsWithInput = (exercise:OfficialTrainingPlanExercise, period_index:number, new_value:string):void => {
        const clean_value:string = new_value.replace(/[^0-9]/g, "") // Cleans The New Entered Value
        const sets_number:number = clean_value === "" ? 1 : parseInt(clean_value, 10) // Gets Current Sets Amount

        if(sets_number < 1 || sets_number > 100) return // Do Nothing

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:OfficialTrainingPlanExercise[] = ordered_exercises.map((one_exercise:OfficialTrainingPlanExercise) => {
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
    const changeWarmUpTime = (warm_up:OfficialTrainingPlanExercise, operation:"subtract"|"add"):void => {
        let elapsed_seconds:number = warm_up.periods[0] // Gets Elapsed Seconds From Timer Value

        if(elapsed_seconds <= 30 && operation === "subtract") return // Stop Subtracting When On Timer Is 30 Seconds
        if(elapsed_seconds === 3600 && operation === "add") return // Stop Adding When On Timer Is 1 Hour

        if(operation === "subtract") elapsed_seconds -= 30 // Subtracts 30 Seconds
        if(operation === "add") elapsed_seconds += 30 // Adds 30 Seconds

        // Stores The New State Of Updated Training Plans Exercises
        const updated_training_plans_exercises:OfficialTrainingPlanExercise[] = ordered_exercises.map((one_exercise:OfficialTrainingPlanExercise) => {
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

    // Function For Copy The Training Plan
    const copyTrainingPlan = async ():Promise<void> => {
        // Stores All New Saved Training Plan Data
        const training_plan_data:{
            training_plan_key:string,
            type:string,
            exercise:string,
            periods:number[],
            unit:string,
            order:number,
            is_warm_up:boolean
        }[] = []

        // Gets Info From Every Exercise
        active_training_plan_exercises.forEach(function(one_exercise:OfficialTrainingPlanExercise, index:number) {
            // Creates And Fills Data For Object Of One Exercise For Saved Training Plan
            const training_plan_object:{
                training_plan_key:string,
                type:string,
                exercise:string,
                periods:number[],
                unit:string,
                order:number,
                is_warm_up:boolean
            } = {
                training_plan_key: one_exercise.training_plan_key,
                type: one_exercise.type,
                exercise: one_exercise.exercise,
                periods: one_exercise.periods,
                unit: one_exercise.unit,
                order: index + 1,
                is_warm_up: one_exercise.is_warm_up
            }

            training_plan_data.push(training_plan_object) // Fills Training Plan Data Array With Objects Of Exercises
        })

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const copy_training_plan_response:Response = await fetch(`${API_URL}/copy-training-plan/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify(training_plan_data)
            })

            // If The Response Isn't Success
            if(!copy_training_plan_response.ok) {
                Alert.alert(t("Chyba"), t("Pri kopírovaní tréningového plánu došlo k chybe.")) // Shows The Alert
                return
            }

            const copy_training_plan_data:BasicResponse = await copy_training_plan_response.json() // Gets The Copy Training Plan Data

            // If The Response Isn't Success
            if(!copy_training_plan_data.success) {
                Alert.alert(t("Chyba"), copy_training_plan_data.message) // Shows The Alert
                return
            }

            Alert.alert(t("Úspech"), t("Tréningového plán bol úspešne skopírovaný.")) // Shows The Alert
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri kopírovaní tréningového plánu došlo k chybe.")) // Shows The Alert
        } 
    }

    return (
        <>
            {generateTrainingPlan()} {/* Generates The Training Plan */}

            <View className="buttons" style={styles.buttons}>
                <Pressable
                    className="copy"
                    onPress={copyTrainingPlan}
                    accessibilityLabel={t("Kopírovať")}
                    style={styles.copy}
                >
                    <BlurView 
                        intensity={10} 
                        
                        style={[
                            StyleSheet.absoluteFill,
                            { borderRadius: BIG_BORDER_RADIUS },
                        ]} 
                    />

                    <Text style={{ color: SECONDARY_COLOR }}>{t("Kopírovať")}</Text>
                </Pressable>
            </View>
        </>
    )
}

const styles = StyleSheet.create({
    training_plan: {
        position: "relative",
        width: "100%",
        height: 400,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderRadius: BIG_BORDER_RADIUS,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        overflow: "hidden",
    },

    exercise: {
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        height: "100%",
        paddingTop: 30,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },

    timer_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 50,
        width: "100%",
        marginVertical: "auto",
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

    labels: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: 10,
        paddingHorizontal: 20,
    },

    label: {
        flex: 1,
        textAlign: "center",
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1,
        color: LIGHT_BLUE_COLOR,
        opacity: 0.8,
    },

    add_period: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: 45,
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: transparentize(BLUE_COLOR, 0.1),
        borderRadius: BIG_BORDER_RADIUS,
    },

    periods_container: {
        flex: 1,
        width: "100%",
        maxHeight: 45 * 2 + 10 * 2 + 45 / 2, // 2 And A Half Period Selections
        marginTop: 5,
    },

    period_selection: {
        flexDirection: "row",
        gap: 15,
        width: "100%",
        justifyContent: "space-between",
        marginBottom: 10,
    },

    reps_sets_container: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flex: 1,
        height: 45,
        paddingHorizontal: 5,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.5),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.2),
        borderRadius: BIG_BORDER_RADIUS,
    },

    reps_sets_input: {
        flex: 1,
        height: "100%",
        textAlign: "center",
        fontWeight: "bold",
        color: SECONDARY_COLOR,
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

    bar_container: {
        marginTop: "auto",
        marginHorizontal: 10,
        marginBottom: 10,
        zIndex: 100,
    },

    buttons: {
        flexDirection: "row",
        gap: 20,
        width: "100%",
        marginTop: 10,
    },

    copy: {
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
})