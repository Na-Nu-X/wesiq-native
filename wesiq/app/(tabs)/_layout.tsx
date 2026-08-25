import { useEffect } from "react"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useFonts } from "expo-font"
import { Bungee_400Regular } from "@expo-google-fonts/bungee"
import { Poppins_400Regular } from "@expo-google-fonts/poppins"
import { BalsamiqSans_400Regular } from "@expo-google-fonts/balsamiq-sans"
import { Orbitron_400Regular } from "@expo-google-fonts/orbitron"
import React from "react"
import { Tabs } from "expo-router"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { BLUE_COLOR, DARK_BLUE_COLOR } from "@/constants/colors"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Bungee_400Regular,
    Poppins_400Regular,
    BalsamiqSans_400Regular,
    Orbitron_400Regular,
  })

  useEffect(() => {
    if(loaded || error) {
      SplashScreen.hideAsync()
    }
  }, [loaded, error])

  if(!loaded && !error) {
    return null
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: DARK_BLUE_COLOR,
        tabBarInactiveTintColor: BLUE_COLOR,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"

        options={{
          title: "Domov",

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
          title: "Chat",

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
          title: "Aktivita",

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
    </Tabs>
  )
}