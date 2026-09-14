import { useState } from "react"
import { StyleSheet, ScrollView } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import LoginFormDialog from "@/components/LoginFormDialog"
import { SafeAreaView } from "react-native-safe-area-context"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import Banner from "@/components/Banner"
import NewTrainingPlan from "@/components/pages/manage_training_plans/NewTrainingPlan"
import ExerciseSelection from "@/components/pages/manage_training_plans/ExerciseSelection"

import type { LoggedInUser } from "@/components/LoginFormDialog"

export default function NewTrainingPlanScreen() {
  const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
  const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

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

          <NewTrainingPlan />
          <ExerciseSelection />
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