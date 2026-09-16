import { useMemo, useState } from "react"
import { View, StyleSheet, Pressable, Text, ScrollView, Image, TextInput } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import LoginFormDialog from "@/components/LoginFormDialog"
import { SafeAreaView } from "react-native-safe-area-context"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import Banner from "@/components/Banner"
import EditTrainingPlan from "@/components/pages/manage_training_plans/EditTrainingPlan"
import ExerciseSelection from "@/components/pages/manage_training_plans/ExerciseSelection"
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { DOMAIN } from "@/constants/general"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { getMinimalistFormattedTime } from "@/utils/time"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { FontAwesome6 } from "@expo/vector-icons"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { Exercise } from "@/components/pages/manage_training_plans/ExerciseSelection"
import type { TrainingPlanExercise } from "@/components/pages/activity/ActivitySection"
import type { Day } from "@/components/pages/manage_training_plans/DaySelectMenu"

export default function EditTrainingPlanScreen() {
  const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
  const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

  const [drop_zone, setDropZone] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [exercise_selection_dragged_exercise, setExerciseSelectionDraggedExercise] = useState<Exercise|"custom_exercise"|"warm_up"|null>(null) // Stores The Dragged Exercise From The Exercise Selection
  const [training_plan_dragged_exercise, setTrainingPlanDraggedExercise] = useState<TrainingPlanExercise|null>(null) // Stores The Dragged Exercise From The Training Plan
  const drag_x:SharedValue<number> = useSharedValue(0)
  const drag_y:SharedValue<number> = useSharedValue(0)

  const [training_plans_exercises, setTrainingPlansExercises] = useState<TrainingPlanExercise[]>([]) // Stores The Training Plans Exercises
  const [active_training_plan_day, setActiveTrainingPlanDay] = useState<Day|null>(null) // Stores The Active Training Plan Day
  const [active_exercise_index, setActiveExerciseIndex] = useState<number>(0) // Stores The Active Exercise Index

  // Gets The Active Training Plan Exercises
  const active_training_plan_exercises:TrainingPlanExercise[] = useMemo(() => {
    return training_plans_exercises.filter(one_exercise => one_exercise.day === active_training_plan_day)
  }, [training_plans_exercises, active_training_plan_day])

  // Function To Handle Start Of The Exercise Drag From The Exercise Selection
  const handleDragStart = (x:number, y:number, dragged_exercise:Exercise|TrainingPlanExercise|"custom_exercise"|"warm_up"):void => {
    drag_x.value = x
    drag_y.value = y

    // Exercise Selection Custom Exercise Drag & Drop
    if(dragged_exercise === "custom_exercise") {
      setExerciseSelectionDraggedExercise("custom_exercise") // Sets The Dragged Exercise From The Exercise Selection
      return
    }

    // Exercise Selection Warm Up Drag & Drop
    if(dragged_exercise === "warm_up") {
      setExerciseSelectionDraggedExercise("warm_up") // Sets The Dragged Exercise From The Exercise Selection
      return
    }

    // Training Plan Drag & Drop
    if("training_plan_key" in dragged_exercise) {
      setTrainingPlanDraggedExercise(dragged_exercise) // Sets The Dragged Exercise From The Training Plan
    }

    // Exercise Selection Drag & Drop
    else {
      setExerciseSelectionDraggedExercise(dragged_exercise) // Sets The Dragged Exercise From The Exercise Selection
    }
  }

  // Function To Handle Move Of The Dragged Exercise From The Exercise Selection
  const handleDragMove = (x:number, y:number):void => {
    drag_x.value = x
    drag_y.value = y
  }

  // Function To Handle The Exercise Drop From The Exercise Selection
  const handleDrop = (x:number, y:number, dragged_exercise:Exercise|TrainingPlanExercise|"custom_exercise"|"warm_up"):void => {
    // Checks If The Dropped Exercise Is Inside The Drop Zone (Training Plan)
    const is_inside_drop_zone:boolean = 
      x >= drop_zone.x &&
      x <= drop_zone.x + drop_zone.width &&
      y >= drop_zone.y &&
      y <= drop_zone.y + drop_zone.height

    // Exercise Selection Custom Exercise Drag & Drop
    if(dragged_exercise === "custom_exercise") {
      // Creates The New Exercise
      const new_exercise:TrainingPlanExercise = {
        id: -1,
        training_plan_key: active_training_plan_exercises[0].training_plan_key,
        day: active_training_plan_day,
        type: active_training_plan_exercises[0].type,
        exercise: "",
        periods: [0],
        unit: "reps",
        // order: active_training_plan_exercises.length,
        order: training_plans_exercises.length,
        is_warm_up: false,
        is_custom_exercise: true
      }

      setTrainingPlansExercises([...training_plans_exercises, new_exercise]) // Sets The Training Plans Exercises
      setActiveExerciseIndex(active_training_plan_exercises.length) // Sets The Active Exercise Index
      setExerciseSelectionDraggedExercise(null) // Sets The Dragged Exercise From The Exercise Selection

      return
    }

    // Exercise Selection Warm Up Drag & Drop
    if(dragged_exercise === "warm_up") {
      // Creates The New Exercise
      const new_exercise:TrainingPlanExercise = {
        id: -1,
        training_plan_key: active_training_plan_exercises[0].training_plan_key,
        day: active_training_plan_day,
        type: active_training_plan_exercises[0].type,
        exercise: "Warm Up",
        periods: [300], // 5 Minutes
        unit: "seconds",
        order: 1,
        is_warm_up: true,
        is_custom_exercise: false
      }

      setTrainingPlansExercises([new_exercise, ...training_plans_exercises]) // Sets The Training Plans Exercises
      setActiveExerciseIndex(0) // Sets The Active Exercise Index
      setExerciseSelectionDraggedExercise(null) // Sets The Dragged Exercise From The Exercise Selection

      return
    }

    // Training Plan Drag & Drop
    if("training_plan_key" in dragged_exercise) {
      if(!is_inside_drop_zone) {
        setTrainingPlansExercises(previous_exercises => previous_exercises.filter((one_exercise:TrainingPlanExercise) => one_exercise.id !== dragged_exercise.id)) // Sets The Training Plans Exercises
        setActiveExerciseIndex(0) // Sets The Active Exercise Index
      }

      setTrainingPlanDraggedExercise(null) // Sets The Dragged Exercise From The Training Plan
    }

    // Exercise Selection Drag & Drop
    else {
      if(is_inside_drop_zone) {
        // If The Exercise Is Already In The Active Training Plan
        if(active_training_plan_exercises.some((one_exercise:TrainingPlanExercise) => one_exercise.id === dragged_exercise.id)) {
          const existing_exercise_index:number|null = active_training_plan_exercises.findIndex((one_exercise:TrainingPlanExercise) => one_exercise.id === dragged_exercise.id) || null // Gets The Existing Exercise
          if(existing_exercise_index) setActiveExerciseIndex(existing_exercise_index) // Sets The Active Exercise Index
        }

        else {
          // Creates The New Exercise
          const new_exercise:TrainingPlanExercise = {
            id: dragged_exercise.id,
            training_plan_key: active_training_plan_exercises[0].training_plan_key,
            day: active_training_plan_day,
            type: active_training_plan_exercises[0].type,
            exercise: dragged_exercise.exercise,
            periods: [0],
            unit: dragged_exercise.unit,
            // order: active_training_plan_exercises.length,
            order: training_plans_exercises.length,
            is_warm_up: false,
            is_custom_exercise: false
          }
  
          setTrainingPlansExercises([...training_plans_exercises, new_exercise]) // Sets The Training Plans Exercises
          setActiveExerciseIndex(active_training_plan_exercises.length) // Sets The Active Exercise Index
        }
      }

      setExerciseSelectionDraggedExercise(null) // Sets The Dragged Exercise From The Exercise Selection
    }
  }

  // Sets The Overlay Style
  const overlay_style = useAnimatedStyle(() => ({
    transform: [
      { translateX: drag_x.value - 50 }, // 50 Under The Thumb
      { translateY: drag_y.value - 25 }
    ]
  }))

  // Function For Generate Period Selections
  const generatePeriodSelections = (periods_data:number[], amount:number[], unit:string) => {
    return amount.map((one_unit:number, index:number) => {
      return (
        <View className="period_selection" style={styles.period_selection}>
          <View className="reps_container" style={styles.reps_container}>
            <View className="decrease_reps">
              <Icon 
                icon_name="minus"
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
                    size={20}
                />
            </View>
          </View>

          <View className="sets_container" style={styles.sets_container}>
            <View className="decrease_sets">
              <Icon 
                icon_name="minus"
                size={20}
              />
            </View>

            <TextInput
              className="sets"
              keyboardType="number-pad"
              textAlignVertical="top" 
              value={String(one_unit)}
              maxLength={4}

              style={[
                styles.sets,
                { outlineStyle: "none" } as any
              ]}
            />

            <View className="increase_sets">
              <Icon 
                icon_name="plus"
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

  return (
    <BackgroundContainer>
      <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
        <Banner 
          logged_in_user={logged_in_user} 
          setActiveForm={setActiveForm} 
        />

        <ScrollView 
          className="content" 
          style={styles.content} 
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled" 
          keyboardDismissMode="on-drag"
        >
          <LoginFormDialog 
            visible={active_form==="login_form"}
            onChangeActiveForm={() => setActiveForm("registration_form")}
            onClose={() => setActiveForm(null)}
            onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
          />

          <RegistrationFormDialog
            visible={active_form==="registration_form"}
            onChangeActiveForm={() => setActiveForm("login_form")}
            onClose={() => setActiveForm(null)}
            onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
          />

          <EditTrainingPlan 
            onTrainingPlansExercisesUpdate={(training_plans_exercises:TrainingPlanExercise[]) => setTrainingPlansExercises(training_plans_exercises)}
            training_plans_exercises={training_plans_exercises}
            onSetDropZone={(layout) => setDropZone(layout)} 
            onSetActiveTrainingPlanDay={(day:Day|null) => setActiveTrainingPlanDay(day)}
            onActiveExerciseIndexUpdate={(active_exercise_index:number) => setActiveExerciseIndex(active_exercise_index)}
            active_exercise_index={active_exercise_index}
            onDragStart={handleDragStart} 
            onDragMove={handleDragMove}
            checkDropLocation={handleDrop}
          />

          <ExerciseSelection 
            onDragStart={handleDragStart} 
            onDragMove={handleDragMove}
            checkDropLocation={handleDrop}
          />

          {exercise_selection_dragged_exercise && (
            <>
              {exercise_selection_dragged_exercise === "custom_exercise" && (
                <Animated.View 
                  className="custom_exercise exercise"
                  pointerEvents="none"

                  style={[
                    styles.exercise_selection_exercise,
                    styles.floating_exercise,
                    overlay_style,
                  ]}
                >
                  <FontAwesome6
                    name="plus"
                    size={40}
                    color={BLUE_COLOR}
                  />
                </Animated.View>
              )}

              {exercise_selection_dragged_exercise === "warm_up" && (
                <Animated.View 
                  className="warm_up exercise"
                  pointerEvents="none"

                  style={[
                    styles.exercise_selection_exercise,
                    styles.floating_exercise,
                    overlay_style,
                  ]}
                >
                  <FontAwesome6
                    name="dumbbell"
                    size={40}
                    color={BLUE_COLOR}
                  />
                </Animated.View>
              )}

              {exercise_selection_dragged_exercise !== "custom_exercise" && exercise_selection_dragged_exercise !== "warm_up" && (
                <Animated.View 
                  className="exercise"
                  pointerEvents="none"

                  style={[
                    styles.exercise_selection_exercise,
                    styles.floating_exercise,
                    overlay_style,
                  ]}
                >
                  {exercise_selection_dragged_exercise.image_filename && (
                    <Image 
                      source={{ uri: `${DOMAIN}/static/images/exercises/${exercise_selection_dragged_exercise.image_filename}`}}
                      resizeMode="cover"

                      style={[
                        StyleSheet.absoluteFill,
                        { opacity: 0.2 },
                      ]}
                    />
                  )}

                  <Text 
                    className="name" 

                    style={[{
                      textAlign: "center", 
                      color: SECONDARY_COLOR,
                      pointerEvents: "none",
                      userSelect: "none",
                    }]}
                  >
                    {exercise_selection_dragged_exercise.exercise}
                  </Text>
                </Animated.View>
              )}
            </>
          )}

          {training_plan_dragged_exercise && (
            <Animated.View 
              className="exercise" 

              style={[
                styles.training_plan_exercise,
                styles.floating_exercise,
                overlay_style,
              ]}
            >
              <Text 
                className="title" 

                style={{
                  maxWidth: 350,
                  textAlign: "center",
                  color: SECONDARY_COLOR,
                  fontSize: 30,
                }}
              >
                {training_plan_dragged_exercise.exercise}
              </Text> 

              <View className="labels" style={styles.labels}>
                <Text className="unit_amount" style={styles.label}>
                  {training_plan_dragged_exercise.unit === "reps" && ("Počet opakovaní")}
                  {training_plan_dragged_exercise.unit === "seconds" && ("Počet sekúnd")}
                  {training_plan_dragged_exercise.unit === "steps" && ("Počet krokov")}
                </Text>

                <Text style={styles.label}>Série</Text>
              </View>

              <Pressable 
                className="add_period"
                accessibilityLabel="Pridať sériu"
                style={styles.add_period}
              >
                <Text style={{ color: SECONDARY_COLOR }}>Pridať sériu</Text>
              </Pressable>

              <View className="periods_container" style={styles.periods_container}>
                {/* Generates Exact Amount Of Period Selections For Exercise */}
                {generatePeriodSelections(
                  training_plan_dragged_exercise.periods,
                  getConsecutiveNumbersCount(training_plan_dragged_exercise.periods),
                  training_plan_dragged_exercise.unit
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </BackgroundContainer>
  )
}

const styles = StyleSheet.create({
  safe_area: {
    flex: 1,
  },

  content: {
    flex: 1,
  },

  floating_exercise: {
    position: "absolute",
    top: 0,
    left: 0,
    elevation: 10,
    zIndex: 9999,
  },

  exercise_selection_exercise: {
    // @include scrollbar;
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexBasis: 100,
    flexGrow: 1,
    width: 100,
    gap: 5,
    aspectRatio: 1 / 1,
    padding: 10,
    backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
    borderWidth: 1,
    borderColor: transparentize(BLUE_COLOR, 0.5),
    borderRadius: MEDIUM_BORDER_RADIUS,
    // backdrop-filter: blur(5px);
    // cursor: move;
    overflow: "hidden",
    // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

    // &.hidden {
    //     display: none !important;
    // }

    // &:hover, 
    // &:focus-visible {
    //     transform: translateY(-2px);
    //     background: transparent;
    //     border-color: transparentize($blue-color, 0.25);
    //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);

    //     .name {
    //         filter: blur(2px);
    //     }
    // }
  },

  training_plan_exercise: {
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: MAIN_WIDTH,
    width: "100%",
    maxHeight: 450,
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
})