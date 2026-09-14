import React, { useMemo, useState } from "react"
import { View, StyleSheet, Pressable, Text, ScrollView, Image } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import LoginFormDialog from "@/components/LoginFormDialog"
import { SafeAreaView } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import Banner from "@/components/Banner"
import NewTrainingPlan from "@/components/pages/manage_training_plans/NewTrainingPlan"
import EditTrainingPlan from "@/components/pages/manage_training_plans/EditTrainingPlan"
import ExerciseSelection from "@/components/pages/manage_training_plans/ExerciseSelection"
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated"
import { BLUE_COLOR, DARK_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { DOMAIN } from "@/constants/general"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { Exercise } from "@/components/pages/manage_training_plans/ExerciseSelection"
import type { TrainingPlanExercise } from "@/components/pages/activity/ActivitySection"

export default function EditTrainingPlanScreen() {
  const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
  const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

  const [drop_zone, setDropZone] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [dragged_exercise, setDraggedExercise] = useState<Exercise|null>(null) // Stores The Dragged Exercise From The Exercise Selection
  const drag_x:SharedValue<number> = useSharedValue(0)
  const drag_y:SharedValue<number> = useSharedValue(0)

  const [training_plans_exercises, setTrainingPlansExercises] = useState<TrainingPlanExercise[]>([]) // Stores The Training Plans Exercises
  const [active_training_plan_day, setActiveTrainingPlanDay] = useState<number|null>(null) // Stores The Active Training Plan Day
  const [active_exercise_index, setActiveExerciseIndex] = useState<number>(0) // Stores The Active Exercise Index

  // Gets The Active Training Plan Exercises
  const active_training_plan_exercises:TrainingPlanExercise[] = useMemo(() => {
    return training_plans_exercises.filter(one_exercise => one_exercise.day === active_training_plan_day)
  }, [training_plans_exercises, active_training_plan_day])

  // Function To Handle Start Of The Exercise Drag From The Exercise Selection
  const handleDragStart = (exercise:Exercise, x:number, y:number) => {
    drag_x.value = x
    drag_y.value = y

    setDraggedExercise(exercise) // Sets The Dragged Exercise
  }

  // Function To Handle Move Of The Dragged Exercise From The Exercise Selection
  const handleDragMove = (x:number, y:number) => {
    drag_x.value = x
    drag_y.value = y
  }

  // Function To Handle The Exercise Drop From The Exercise Selection
  const handleDrop = (x:number, y:number, exercise:Exercise) => {
    // Checks If The Dropped Exercise Is Inside The Drop Zone
    const is_inside_drop_zone:boolean = 
      x >= drop_zone.x &&
      x <= drop_zone.x + drop_zone.width &&
      y >= drop_zone.y &&
      y <= drop_zone.y + drop_zone.height;

    if(is_inside_drop_zone) {
      // Creates The New Exercise
      const new_exercise:TrainingPlanExercise = {
        id: exercise.id,
        training_plan_key: active_training_plan_exercises[0].training_plan_key,
        day: active_training_plan_day,
        type: active_training_plan_exercises[0].type,
        exercise: exercise.exercise,
        periods: [0],
        unit: exercise.unit,
        order: training_plans_exercises.length,
        is_warm_up: false, //
        is_custom_exercise: false //
      }

      setTrainingPlansExercises([...training_plans_exercises, new_exercise]) // Sets The Training Plans Exercises
      setActiveExerciseIndex(active_training_plan_exercises.length) // Sets The Active Exercise Index
    }

    setDraggedExercise(null) // Sets The Dragged Exercise
  }

  // Sets The Overlay Style
  const overlay_style = useAnimatedStyle(() => ({
    transform: [
      { translateX: drag_x.value - 50 }, // 50 Under The Thumb
      { translateY: drag_y.value - 25 }
    ]
  }))

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
            onSetActiveTrainingPlanDay={(day:number|null) => setActiveTrainingPlanDay(day)}
            onActiveExerciseIndexUpdate={(active_exercise_index:number) => setActiveExerciseIndex(active_exercise_index)}
            active_exercise_index={active_exercise_index}
          />

          <ExerciseSelection 
            onDragStart={handleDragStart} 
            onDragMove={handleDragMove}
            checkDropLocation={handleDrop}
          />

          {dragged_exercise && (
            <Animated.View 
              key={dragged_exercise.id}
              className="exercise"
              pointerEvents="none"

              style={[
                styles.exercise,
                styles.floating_exercise,
                overlay_style,
              ]}
            >
              {dragged_exercise.image_filename && (
                <Image 
                  source={{ uri: `${DOMAIN}/static/images/exercises/${dragged_exercise.image_filename}`}}
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
                {dragged_exercise.exercise}
              </Text>
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

  exercise: {
    // @include scrollbar;
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexBasis: 100,
    flexGrow: 1,
    minWidth: 100,
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

  floating_exercise: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 100,
    elevation: 10,
    zIndex: 9999,
  },
})