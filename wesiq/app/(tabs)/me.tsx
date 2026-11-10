// Profile Tab (The Logged In User's Own Profile)

import { useTranslation } from "react-i18next"
import { EmptyState, Screen } from "@/components/ui"
import ProfileScreen from "@/components/features/profile/ProfileScreen"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"

export default function MyProfileTab() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User

    // The Tab Press Opens The Login Sheet When Nobody Is Logged In, This Is Only A Fallback (E.g. Deep Link)
    if(!logged_in_user) {
        return (
            <Screen>
                <EmptyState icon="user" title={t("Prihláste sa")} message={t("Po prihlásení tu nájdete svoj profil.")} />
            </Screen>
        )
    }

    return <ProfileScreen username={logged_in_user.username} />
}
