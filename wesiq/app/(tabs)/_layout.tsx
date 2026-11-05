import { useEffect, useState } from "react"
import * as SplashScreen from "expo-splash-screen"
import { useFonts } from "expo-font"
import { Bungee_400Regular } from "@expo-google-fonts/bungee"
import { Poppins_400Regular } from "@expo-google-fonts/poppins"
import { BalsamiqSans_400Regular } from "@expo-google-fonts/balsamiq-sans"
import { Orbitron_400Regular } from "@expo-google-fonts/orbitron"
import { ImperativeRouter, Tabs, useRouter } from "expo-router"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { BLUE_COLOR, DARK_BLUE_COLOR } from "@/constants/colors"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { Image, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import ProfilePictureLink from "@/components/ProfilePictureLink"
import ProfilePicture from "@/components/ProfilePicture"
import LoginFormDialog from "@/components/LoginFormDialog"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
    // Stores The Fonts
    const [loaded, error] = useFonts({
        Bungee_400Regular,
        Poppins_400Regular,
        BalsamiqSans_400Regular,
        Orbitron_400Regular,
    })

    const { logged_in_user, setLoggedInUser } = useLoggedInUser() // Gets The Logged In User
    const router:ImperativeRouter = useRouter() // Gets The Router
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    // Initializes The Hide Of The Splash Screen
    useEffect(() => {
        if(loaded || error) SplashScreen.hideAsync() // Hides The Splash Screen
    }, [loaded, error])

    if(!loaded && !error) {
        return null
    }

    return (
        <>
            <Tabs
                backBehavior="history"

                screenOptions={{
                    tabBarActiveTintColor: DARK_BLUE_COLOR,
                    tabBarInactiveTintColor: BLUE_COLOR,
                    headerShown: false,
                }}
            >
                <Tabs.Screen
                    name="index"

                    options={{
                        title: "",

                        tabBarIcon: ({ color, focused, size }) => (
                            <FontAwesome6
                                name="house"
                                size={size}
                                solid={focused}
                                color={color}
                            />
                        )
                    }}
                />
                
                <Tabs.Screen
                    name="chat"

                    options={{
                        title: "",

                        tabBarIcon: ({ color, focused, size }) => (
                            <FontAwesome6
                                name="comment"
                                size={size}
                                solid={focused}
                                color={color}
                            />
                        )
                    }}
                />

                <Tabs.Screen
                    name="activity"

                    options={{
                        title: "",

                        tabBarIcon: ({ color, focused, size }) => (
                            <FontAwesome6
                                name="dumbbell"
                                size={size}
                                solid={focused}
                                color={color}
                            />
                        )
                    }}
                />

                {/* <Tabs.Screen
                    name="blog"

                    options={{
                        title: "",

                        tabBarIcon: ({ color, focused, size }) => (
                            <FontAwesome6
                                name="book"
                                size={size}
                                solid={focused}
                                color={color}
                            />
                        )
                    }}
                /> */}

                <Tabs.Screen
                    name="users"

                    options={{
                        title: "",

                        tabBarIcon: ({ color, focused, size }) => (
                            <FontAwesome6
                                name="users"
                                size={size}
                                solid={focused}
                                color={color}
                            />
                        )
                    }}
                />

                <Tabs.Screen
                    name="profile"

                    listeners={{
                        tabPress: (event) => {
                            event.preventDefault() // Prevents The Default Behavior
                            if(!logged_in_user) setActiveForm("login_form") // Sets The Active Form
                            else router.push(`/profile/${logged_in_user.username}`) // Goes To The Profile Page
                        }
                    }}

                    options={{
                        title: "",

                        tabBarIcon: () => {
                            if(logged_in_user) {
                                return (
                                    <ProfilePicture
                                        user_id={logged_in_user.id}
                                        user_profile_picture_name={logged_in_user.profile_picture_name || null} 
                                        user_subscription={logged_in_user.subscription?.is_active || false} 
                                    />
                                )
                            }
                        
                            return (
                                <Image 
                                    source={require("@/assets/images/profile_picture.png")} // https://www.flaticon.com/free-icon/user_3177440
                                    style={styles.profile_picture}
                                />
                            )
                        }
                    }}
                />
            </Tabs>

            <LoginFormDialog 
                visible={active_form==="login_form"}
                onChangeActiveForm={() => setActiveForm("registration_form")}
                onClose={() => setActiveForm(null)}
                onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
            />

            <RegistrationFormDialog
                visible={active_form==="registration_form"}
                onChangeActiveForm={() => setActiveForm("login_form")}
                onClose={() => setActiveForm(null)}
                onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
            />
        </>
    )
}

const styles = StyleSheet.create({
    profile_picture: {
        width: 32,
        height: 32,
        borderRadius: 100,
    },
})