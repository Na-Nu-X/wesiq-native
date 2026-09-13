import React, { useState } from "react"
import { View, StyleSheet, Pressable, Text, ScrollView } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import LoginFormDialog from "@/components/LoginFormDialog"
import { SafeAreaView } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import Banner from "@/components/Banner"
import NewTrainingPlan from "@/components/pages/manage_training_plans/NewTrainingPlan"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import ExerciseSelection from "@/components/pages/manage_training_plans/ExerciseSelection"

export default function HomeScreen() {
  const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
  const [is_upload_post_form_dialog_open, setIsUploadPostFormDialogOpen] = useState<boolean>(false) // Stores The Information If The Upload Post Form Dialog Is Open
  const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

  return (
    <BackgroundContainer>
      <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
        <Banner 
          logged_in_user={logged_in_user} 
          setActiveForm={setActiveForm} 
          setIsUploadPostFormDialogOpen={setIsUploadPostFormDialogOpen} 
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