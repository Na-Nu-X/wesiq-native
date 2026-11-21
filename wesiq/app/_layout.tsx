import { ErrorBoundaryProps, SplashScreen, Stack } from "expo-router"
import * as NativeSplashScreen from "expo-splash-screen"
import { useTranslation } from "react-i18next"
import { EmptyState } from "@/components/ui"
import { StatusBar } from "expo-status-bar"
import "react-native-reanimated"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import "@/lib/i18n"
import { installMockApi } from "@/lib/api/mocks/install"
import { installInteractionManagerShim } from "@/lib/interactionManager"
import { DarkTheme, Theme, ThemeProvider } from "@react-navigation/native"
import { useFonts } from "expo-font"
import { Bungee_400Regular } from "@expo-google-fonts/bungee"
import { Orbitron_400Regular } from "@expo-google-fonts/orbitron"
import { colors, spacing } from "@/theme"
import { AuthSheetProvider } from "@/components/features/auth/AuthSheetProvider"
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet" // Older Components Still Use @gorhom Sheets
import { useEffect } from "react"
import { Platform, StyleSheet, View } from "react-native"
import { LoggedInUserProvider, useLoggedInUser } from "@/contexts/LoggedInUserContext"
import useNotificationSocket from "@/hooks/useNotificationSocket"
import { syncPurchasesUser } from "@/lib/purchases"
import * as ScreenOrientation from "expo-screen-orientation"

installMockApi() // Enables Mock Data In Development When EXPO_PUBLIC_USE_MOCKS=1
installInteractionManagerShim() // Lets The Draggable Lists Reset After A Drop (React Native 0.88 Removed InteractionManager)

SplashScreen.preventAutoHideAsync()
NativeSplashScreen.setOptions({ duration: 250, fade: true }) // Cross-Fades The Native Splash Into The First Screen (No Hard Cut)

// The App Is Portrait; Only A Fullscreen Landscape Video Unlocks Landscape (app.json Allows Rotation For That)
if(Platform.OS === "ios" || Platform.OS === "android") ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {})

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
        if(Platform.OS === "ios") syncPurchasesUser(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "", user_id) // iOS (Public "appl_" Key From .env.local / EAS Environment Variables)
        else if(Platform.OS === "android") syncPurchasesUser(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "", user_id) // Android (Public "goog_" Key)
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

// Function For Render The Crash Screen (Expo Router Shows It Instead Of A Screen That Threw While Rendering)
export function ErrorBoundary({ error, retry }:ErrorBoundaryProps) {
    const { t } = useTranslation() // Initializes The Translations

    // Initializes The Hide Of The Splash Screen (A Crash Before The App Was Ready Would Otherwise Keep It Up)
    useEffect(() => {
        SplashScreen.hideAsync()
    }, [])

    // Initializes The Log Of The Error (Development Only)
    useEffect(() => {
        if(__DEV__) console.error(error)
    }, [error])

    return (
        <View style={styles.error_root}>
            <StatusBar style="light" />

            <EmptyState
                icon="triangle-exclamation"
                title={t("Niečo sa pokazilo")}
                message={__DEV__ ? error.message : undefined}
                action={{ label: t("Skúsiť znova"), onPress: retry }}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.background,
    },

    error_root: {
        flex: 1,
        justifyContent: "center",
        padding: spacing.xl,
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
