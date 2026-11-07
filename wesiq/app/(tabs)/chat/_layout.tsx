import { router, Tabs } from "expo-router"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR } from "@/constants/colors"

export const unstable_settings = {
    anchor: "index"
}

export default function ChatLayout() {
    return (
        <Tabs
            backBehavior="history"

            screenOptions={{
                tabBarActiveTintColor: DARK_BLUE_COLOR,
                tabBarInactiveTintColor: BLUE_COLOR,
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="[username]"

                options={{
                    tabBarButton: () => null
                }}
            />

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
                name="index"

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
        </Tabs>
    )
}