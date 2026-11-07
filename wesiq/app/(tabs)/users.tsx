import { StyleSheet, ScrollView } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import SearchUsers from "@/components/pages/community/SearchUsers"
import { SafeAreaView } from "react-native-safe-area-context"

export default function UsersScreen() {
    return (
        <BackgroundContainer style={{ flex: 1 }}>
            <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
                {/* <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                    setIsUploadPostFormDialogOpen={setIsUploadPostFormDialogOpen} 
                /> */}

                <ScrollView 
                    className="content" 
                    style={styles.content} 
                    
                    contentContainerStyle={{ 
                        justifyContent: "center",
                        flexGrow: 1,
                        padding: 20, 
                    }}

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

                    <SearchUsers />
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