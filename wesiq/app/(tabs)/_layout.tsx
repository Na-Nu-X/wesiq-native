// Main Tab Bar (Always Visible): Home, Chat, Activity, Blog, Profile

import { Platform, StyleSheet } from "react-native"
import { Tabs } from "expo-router"
import { useTranslation } from "react-i18next"
import { Avatar, Icon } from "@/components/ui"
import { colors, layout } from "@/theme"
import { haptics } from "@/lib/haptics"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"

import type { IconName } from "@/components/ui"

// Function For Create A Tab Icon
const tabIcon = (name:IconName) => ({ focused }:{ focused:boolean }) => (
    <Icon name={name} size={20} color={focused ? "primary" : "text_muted"} is_solid={focused} />
)

export default function TabsLayout() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet

    return (
        <>
            <Tabs
                backBehavior="history"

                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.primary,
                    tabBarInactiveTintColor: colors.text_muted,
                    tabBarStyle: styles.tab_bar,
                    tabBarLabelStyle: styles.label,
                    tabBarHideOnKeyboard: Platform.OS === "android",
                }}

                screenListeners={{
                    tabPress: () => haptics.selection(),
                }}
            >
                <Tabs.Screen name="index" options={{ title: t("Domov"), tabBarIcon: tabIcon("house") }} />
                <Tabs.Screen name="chat" options={{ title: t("Správy"), tabBarIcon: tabIcon("comment") }} />
                <Tabs.Screen name="activity" options={{ title: t("Tréningy"), tabBarIcon: tabIcon("dumbbell") }} />
                <Tabs.Screen name="blog" options={{ title: t("Blog"), tabBarIcon: tabIcon("book-open") }} />

                <Tabs.Screen
                    name="me"

                    listeners={{
                        tabPress: (event) => {
                            if(!logged_in_user) {
                                event.preventDefault() // Opens The Login Instead
                                auth_sheet.open("login_form")
                            }
                        },
                    }}

                    options={{
                        title: t("Profil"),

                        tabBarIcon: ({ focused }:{ focused:boolean }) => logged_in_user
                            ? <Avatar user={logged_in_user} size={focused ? 26 : 24} is_ring_hidden={!focused} />
                            : <Icon name="user" size={20} color={focused ? "primary" : "text_muted"} is_solid={focused} />,
                    }}
                />
            </Tabs>
        </>
    )
}

const styles = StyleSheet.create({
    tab_bar: {
        backgroundColor: colors.background_deep,
        borderTopColor: colors.divider,
        borderTopWidth: layout.hairline,
    },

    label: {
        fontSize: 11,
        fontWeight: "600",
    },
})
