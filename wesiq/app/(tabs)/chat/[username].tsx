// Conversation With One User (See components/features/chat/Conversation)

import { useLocalSearchParams } from "expo-router"
import Conversation from "@/components/features/chat/Conversation"

export default function DirectConversationScreen() {
    const { username } = useLocalSearchParams<{ username:string }>() // Gets The Username
    return <Conversation username={username ?? ""} />
}
