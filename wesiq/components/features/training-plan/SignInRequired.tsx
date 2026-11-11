// Shown Instead Of The Plan Screens When Nobody Is Logged In

import { useTranslation } from "react-i18next"
import { EmptyState, Screen } from "@/components/ui"

export default function SignInRequired() {
    const { t } = useTranslation() // Initializes The Translations

    return (
        <Screen>
            <EmptyState icon="lock" title={t("Prihláste sa")} message={t("Tréningové plány sú dostupné po prihlásení.")} />
        </Screen>
    )
}
