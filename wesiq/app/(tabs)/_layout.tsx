import { useEffect } from "react"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useFonts } from "expo-font"
import { Bungee_400Regular } from "@expo-google-fonts/bungee"
import { Poppins_400Regular } from "@expo-google-fonts/poppins"
import { BalsamiqSans_400Regular } from "@expo-google-fonts/balsamiq-sans"
import { Orbitron_400Regular } from "@expo-google-fonts/orbitron"

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

  return <Stack screenOptions={{ headerShown: false }} />
}