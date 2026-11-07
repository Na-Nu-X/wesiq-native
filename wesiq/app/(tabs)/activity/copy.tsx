import { useState } from "react"
import { StyleSheet, ScrollView } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import CopyTrainingPlan from "@/components/pages/manage_training_plans/CopyTrainingPlan"

export default function CopyTrainingPlanScreen() {
    const { logged_in_user, setLoggedInUser } = useLoggedInUser() // Gets The Logged In User

    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    return (
        <BackgroundContainer>
            <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
                {/* <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                /> */}

                <ScrollView 
                    className="content" 
                    style={styles.content} 
                    contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled" 
                    keyboardDismissMode="on-drag"
                >
                    {/* <LoginFormDialog 
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
                    /> */}

                    <CopyTrainingPlan />
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