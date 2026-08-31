import { View, Text, StyleSheet, ScrollView } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useState } from "react"
import Banner from "@/components/Banner"
import LoginFormDialog from "@/components/LoginFormDialog"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import ActivitySection from "@/components/pages/activity/ActivitySection"
import TasksSection from "@/components/pages/activity/TasksSection"
import HistorySection from "@/components/pages/activity/HistorySection"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import { MAIN_WIDTH } from "@/constants/dimensions"

export default function ActivityScreen() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
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

                        <View className="training_page" style={styles.training_page}>
                            <ActivitySection />
                            {/* <TasksSection /> */}
                            {/* <HistorySection /> */}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </BackgroundContainer>
        </GestureHandlerRootView>
    )
}

const styles = StyleSheet.create({
    safe_area: {
        flex: 1,
    },
  
    content: {
        flex: 1,
    },

    training_page: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginHorizontal: "auto",
    },
})