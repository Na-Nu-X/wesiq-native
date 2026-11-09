import { StyleSheet, ScrollView } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useState } from "react"
import Banner from "@/components/Banner"
import { useTranslation } from "react-i18next"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import SubscriptionPlans from "@/components/pages/subscribe/SubscriptionPlans"

export default function ArticleScreen() {
    const { t } = useTranslation() // Initializes The Translations

    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
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
                    
                    contentContainerStyle={{ 
                        justifyContent: "center",
                        flexGrow: 1,
                        padding: 20, 
                    }}

                    keyboardShouldPersistTaps="handled" 
                    keyboardDismissMode="on-drag"
                >
                    <SubscriptionPlans />
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