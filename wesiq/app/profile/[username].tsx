// Profile Of Any User (Pushed On The Root Stack Over The Tabs)

import { useLocalSearchParams } from "expo-router"
import ProfileScreen from "@/components/features/profile/ProfileScreen"

export default function UserProfileRoute() {
    const { username } = useLocalSearchParams<{ username:string }>() // Gets The Username
    return <ProfileScreen username={username} />
}
