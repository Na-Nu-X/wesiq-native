import { useEffect, useState } from "react"
import { View, StyleSheet, Text, ScrollView, TextInput, Alert } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import LoginFormDialog from "@/components/LoginFormDialog"
import { SafeAreaView } from "react-native-safe-area-context"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import Banner from "@/components/Banner"
import { SECONDARY_COLOR } from "@/constants/colors"
import Icon from "@/components/Icon"
import { getMinimalistFormattedTime } from "@/utils/time"
import PasswordResetForm from "@/components/pages/password_reset/PasswordResetForm"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTranslation } from "react-i18next"

import type { LoggedInUser } from "@/components/LoginFormDialog"

export default function PasswordResetScreen() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [is_remaining_time_loaded, setIsRemainingTimeLoaded] = useState<boolean>(false) // Stores The Information If The Remaining Time Is Loaded
    
    const MAX_REMAINING_TIME:number = 300 // Stores The Maximum Remaining Time In Seconds
    const [remaining_time, setRemainingTime] = useState<number>(0) // Stores The Remaining Time

    // Function For Get The Remaining Time
    const getRemainingTime = async ():Promise<void> => {
        const current_time:number = Date.now() // Gets The Current Time
        const password_reset_start_time:number = Number(await AsyncStorage.getItem("password_reset_start_time")) || 0 // Gets The Password Reset Start Time
        const current_remaining_time:number = Math.max(Math.floor(MAX_REMAINING_TIME - (current_time - password_reset_start_time) / 1000), 0) // Gets The Current Remaining Time
        if(password_reset_start_time) setRemainingTime(current_remaining_time) // Sets The Remaining Time
        setIsRemainingTimeLoaded(true) // Sets The Information That The Remaining Time Is Loaded
    }

    // Initializes The Load Of The Remaining Time
    useEffect(() => {
        getRemainingTime() // Gets The Remaining Time
    }, [])

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

                    {is_remaining_time_loaded && (
                        <PasswordResetForm 
                            time={remaining_time} 
                            max_remaining_time={MAX_REMAINING_TIME} 
                            onShowLoginForm={() => setActiveForm("login_form")} 
                        />
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
})