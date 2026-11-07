import { ImperativeRouter, router, Tabs, useRouter } from "expo-router"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR } from "@/constants/colors"
import { Image, StyleSheet } from "react-native"
import ProfilePicture from "@/components/ProfilePicture"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useState } from "react"

export const unstable_settings = {
    initialRouteName: "[username]"
}

export default function ProfileLayout() {
    const { logged_in_user, setLoggedInUser } = useLoggedInUser() // Gets The Logged In User
    const router:ImperativeRouter = useRouter() // Gets The Router
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    return (
        <Tabs
            backBehavior="history"

            screenOptions={{
                tabBarActiveTintColor: DARK_BLUE_COLOR,
                tabBarInactiveTintColor: BLUE_COLOR,
                headerShown: false,
            }}
        >
            {/* <Tabs.Screen
                name="[username]"

                options={{
                    title: "",

                    tabBarItemStyle: { 
                        display: "none" 
                    },
            
                    tabBarIcon: () => null
                }}
            /> */}

            <Tabs.Screen
                name="homepage_dummy"
                
                listeners={{
                    tabPress: (event) => {
                        event.preventDefault() // Prevents The Default Behaviour
                        router.navigate("/") // Redirects To The Homepage
                    }
                }}
                
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
                name="[username]"

                listeners={{
                    tabPress: (event) => {
                        event.preventDefault() // Prevents The Default Behavior
                        if(!logged_in_user) setActiveForm("login_form") // Sets The Active Form
                        else router.navigate(`/profile/${logged_in_user.username}`) // Goes To The Profile Page
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
    )
}

const styles = StyleSheet.create({
    profile_picture: {
        width: 32,
        height: 32,
        borderRadius: 100,
    },
})