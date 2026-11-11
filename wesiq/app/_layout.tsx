import { SplashScreen, Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import "react-native-reanimated"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import "@/lib/i18n"
import { installMockApi } from "@/lib/api/mocks/install"
import { DarkTheme, Theme, ThemeProvider } from "@react-navigation/native"
import { useFonts } from "expo-font"
import { Bungee_400Regular } from "@expo-google-fonts/bungee"
import { Orbitron_400Regular } from "@expo-google-fonts/orbitron"
import { colors } from "@/theme"
import { AuthSheetProvider } from "@/components/features/auth/AuthSheetProvider"
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet" // Older Components Still Use @gorhom Sheets
import { useEffect } from "react"
import { Platform, StyleSheet } from "react-native"
import { LoggedInUserProvider, useLoggedInUser } from "@/contexts/LoggedInUserContext"
import useNotificationSocket from "@/hooks/useNotificationSocket"
import { syncPurchasesUser } from "@/lib/purchases"

installMockApi() // Enables Mock Data In Development When EXPO_PUBLIC_USE_MOCKS=1

SplashScreen.preventAutoHideAsync()

// Navigation Theme (Dark Only) So Native Containers, Headers And Transitions Never Flash White
const NAVIGATION_THEME:Theme = {
    ...DarkTheme,

    colors: {
        ...DarkTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background_deep,
        text: colors.text,
        border: colors.divider,
        notification: colors.danger,
    },
}

// Function For Render The App Content
function AppContent() {
    const { logged_in_user, is_loading } = useLoggedInUser() // Gets The Logged In User

    const user_id:number|null = logged_in_user?.id ?? null

    useNotificationSocket(user_id) // Opens The Notification Socket For The Logged In User And Closes It On Logout

    // Initializes The Store Customer For RevenueCat (Linked To The Logged In User)
    useEffect(() => {
        if(Platform.OS === "ios") syncPurchasesUser("apple_revenuecat_api_key", user_id) // iOS
        else if(Platform.OS === "android") syncPurchasesUser("google_revenuecat_api_key", user_id) // Android
    }, [user_id])

    // Loads The Brand Fonts (UI Text Uses The System Font)
    const [are_fonts_loaded, fonts_error] = useFonts({
        Bungee_400Regular,
        Orbitron_400Regular,
    })

    const is_ready:boolean = !is_loading && (are_fonts_loaded || fonts_error !== null) // Stores The Information If The App Is Ready

    // Initializes The Hide Of The Splash Screen
    useEffect(() => {
        if(is_ready) SplashScreen.hideAsync() // Hides The Splash Screen
    }, [is_ready])

    if(!is_ready) return null

    return (
        <GestureHandlerRootView style={styles.root}>
            <ThemeProvider value={NAVIGATION_THEME}>
                <BottomSheetModalProvider>
                <AuthSheetProvider>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.background },
                    }}
                >
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="(auth)/password-reset" />
                    <Stack.Screen name="post/[post_id]" />
                    <Stack.Screen name="profile/[username]" />
                    <Stack.Screen name="users" />
                    <Stack.Screen name="subscribe" />
                </Stack>
                </AuthSheetProvider>
                </BottomSheetModalProvider>

                <StatusBar style="light" />
            </ThemeProvider>
        </GestureHandlerRootView>
    )
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.background,
    },
})

export default function RootLayout() {
    return (
        <LoggedInUserProvider>
            <AppContent />
        </LoggedInUserProvider>
    )
}
