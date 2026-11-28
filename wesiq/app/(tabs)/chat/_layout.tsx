// Native Stack Inside The Tab (Detail Screens Push With A Back Button And Swipe Back)

import { Stack } from "expo-router"
import { colors } from "@/theme"

// Defines The Unstable Settings
export const unstable_settings = {
    initialRouteName: "index",
}

export default function SectionStackLayout() {
    return <Stack screenOptions = {{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
}
