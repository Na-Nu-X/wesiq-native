import Icon from "@/components/Icon"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { getFormattedTime, getMinimalistFormattedTime } from "@/utils/time"
import { useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import IconButton from "@/components/IconButton"
import Svg, { Circle } from "react-native-svg"
import { BlurView } from "expo-blur"

import type { TrainingPlanExercise } from "../activity/ActivitySection"

interface CopyTrainingPlanProps {
    onTrainingPlansExercisesUpdate:(training_plans_exercises:TrainingPlanExercise[]) => void,
    training_plans_exercises:TrainingPlanExercise[],
    onActiveExerciseIndexUpdate:(active_exercise_index:number) => void,
    active_exercise_index:number
}

export default function CopyTrainingPlan({ 
    onTrainingPlansExercisesUpdate, 
    training_plans_exercises, 
    onActiveExerciseIndexUpdate, 
    active_exercise_index
}:CopyTrainingPlanProps) {
    const { t } = useTranslation() // Initializes The Translations

    const translateX = useRef(new Animated.Value(0)).current // Translate X Animation

    // Orders Exercises From All Training Plans By Their Order Value
    const ordered_exercises:TrainingPlanExercise[] = useMemo(() => {
        return [...training_plans_exercises].sort(
            (a:TrainingPlanExercise, b:TrainingPlanExercise) => Number(a.order) - Number(b.order)
        )
    }, [training_plans_exercises])
    
    const active_exercise:TrainingPlanExercise = ordered_exercises[active_exercise_index] // Gets The Active Exercise
    
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
                                    </View>
                                )}
                            </>
                        </Animated.View>

                        <View className="bar_container" style={{ width: "100%" }}>
                            <DraggableFlatList
                                horizontal
                                data={ordered_exercises}
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
                                
                                    const dragged_exercise:TrainingPlanExercise = ordered_exercises[from]
                                    const dropped_exercise:TrainingPlanExercise = ordered_exercises[to]

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
                    </View>
                </GestureDetector>
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

    const total_gaps:number = (ordered_exercises.length - 1) * 10 // Defines The Total Gaps
    const bar_width:number = (MAIN_WIDTH - 20 - total_gaps) / ordered_exercises.length // Defines The Bar Width

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
        const max_index:number = ordered_exercises.length - 1 // Gets The Max Index

        return Gesture.Pan()
            .runOnJS(true)
            .onEnd((event) => {
                if(event.translationX < -50) changeExercises(active_exercise_index + 1, max_index) // Shows The Next Post Media
                else if(event.translationX > 50) changeExercises(active_exercise_index - 1, max_index) // Shows The Previous Post Media
            })
    }, [active_exercise_index, ordered_exercises.length])

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

    // Function For Copy The Training Plan
    const copyTrainingPlan = async ():Promise<void> => {
        console.log("TEST")
    }

    return (
        <View className="copy_training_plan hidden" style={styles.copy_training_plan}>
            {ordered_exercises && ordered_exercises.length > 0 && (generateTrainingPlan())} {/* Generates The Training Plan */}
            
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
        </View>

        // {/* <View style={styles.training_plan}>
        //     <View>
        //         <Text 
        //             style={{ 
        //                 color: SECONDARY_COLOR,
        //                 fontSize: 40,
        //             }}
        //         >
        //             Pull
        //         </Text>

        //         <View 
        //             style={{ 
        //                 flexDirection: "row",
        //                 alignItems: "center",
        //                 gap: 5,
        //             }}
        //         >
        //             <FontAwesome6
        //                 name="clock"
        //                 size={20}
        //                 solid={false}
        //                 color={LIGHT_BLUE_COLOR}
        //             />

        //             <Text style={{ color: SECONDARY_COLOR }}>1h</Text>
        //         </View>

        //         <Text style={{ color: SECONDARY_COLOR }}>Advanced</Text>

        //         <Text style={{ color: SECONDARY_COLOR }}>Building strength and muscles.</Text>
        //     </View>

        //     <View>
        //         <Text 
        //             style={{ 
        //                 color: SECONDARY_COLOR,
        //                 fontSize: 40,
        //             }}
        //         >
        //             Front Lever
        //         </Text>

        //         <View>
        //             <FontAwesome6
        //                 name="clock"
        //                 size={20}
        //                 solid={false}
        //                 color={LIGHT_BLUE_COLOR}
        //             />

        //             <Text style={{ color: SECONDARY_COLOR }}>1h</Text>
        //         </View>

        //         <Text style={{ color: SECONDARY_COLOR }}>Advanced</Text>

        //         <Text style={{ color: SECONDARY_COLOR }}>Building strength and muscles.</Text>
        //     </View>
        // </View> */}
    )
}

const styles = StyleSheet.create({
    copy_training_plan: {
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

    exercise: {
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        paddingVertical: 50,
        paddingHorizontal: 10,
        zIndex: 100,
    },

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