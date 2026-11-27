// Group Chat Conversation (See components/features/chat/Conversation)

import { useLocalSearchParams } from "expo-router"
import { useTranslation } from "react-i18next"
import { EmptyState, Screen } from "@/components/ui"
import Conversation from "@/components/features/chat/Conversation"

export default function GroupConversationScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { room_id } = useLocalSearchParams<{ room_id:string }>() // Gets The Room ID
    const parsed_room_id:number = Number(room_id) // Gets The Numeric Room ID

    if(!Number.isInteger(parsed_room_id) || parsed_room_id <= 0) {
        return (
            <Screen>
                <EmptyState icon="comments" title={t("Konverzácia sa nenašla.")} />
            </Screen>
        )
    }

    return <Conversation room_id={parsed_room_id} />
}
