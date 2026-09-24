import { useState } from "react"
import { View, StyleSheet, Text, ScrollView, TextInput } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import LoginFormDialog from "@/components/LoginFormDialog"
import { SafeAreaView } from "react-native-safe-area-context"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import Banner from "@/components/Banner"
import { SECONDARY_COLOR } from "@/constants/colors"
import Icon from "@/components/Icon"
import { getMinimalistFormattedTime } from "@/utils/time"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { TrainingPlanExercise } from "@/components/pages/activity/ActivitySection"

export default function CopyTrainingPlanScreen() {
  const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
  const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

  const [training_plans_exercises, setTrainingPlansExercises] = useState<TrainingPlanExercise[]>([]) // Stores The Training Plans Exercises
  const [active_exercise_index, setActiveExerciseIndex] = useState<number>(0) // Stores The Active Exercise Index

  // Function For Generate Period Selections
  const generatePeriodSelections = (periods_data:number[], amount:number[], unit:string) => {
    return amount.map((one_unit:number, index:number) => {
      return (
        <View className="period_selection">
          <View className="reps_container">
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
                //   styles.to_failure,
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
                    //   styles.reps,
                      { outlineStyle: "none" } as any
                    ]}
                  />
                )}

                {unit === "seconds" && (
                  <Text 
                    className="time" 

                    style={[
                    //   styles.time,
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

          <View className="sets_container">
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
                // styles.sets,
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
})