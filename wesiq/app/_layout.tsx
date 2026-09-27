import { Stack, usePathname } from "expo-router"
import { StatusBar } from "expo-status-bar"
import "react-native-reanimated"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { useColorScheme } from "@/hooks/use-color-scheme"
import "./i18n"
import { useEffect, useRef } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { DOMAIN } from "@/constants/general"
import { ColorSchemeName, Platform } from "react-native"
import * as Notifications from "expo-notifications"
import { useTranslation } from "react-i18next"

import type { ChatSocketResponse } from "./(tabs)/chat/[username]"

export const unstable_settings = {
  anchor: "(tabs)"
}

export default function RootLayout() {
  const { t } = useTranslation() // Initializes The Translations

  const color_scheme:ColorSchemeName = useColorScheme()

  const notification_id = useRef<string|null>(null) // Stores The Notification ID

  // Initializes The Notification Permission Request
  useEffect(() => {
    // Function For Request The Notification Permissions
    const requestNotificationPermissions = async ():Promise<void> => {
      if(Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("break-alarm", {
          name: "Break alarm",
          importance: Notifications.AndroidImportance.MAX,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250]
        })
      }

      const { status } = await Notifications.requestPermissionsAsync() // Gets The Permission Status

      if(status !== "granted") console.error(t("Notifikácie neboli povolené."))
    }

    requestNotificationPermissions() // Requests The Notification Permissions
  }, [])

  // Function For Schedule The Notification
  const scheduleNotification = async (seconds:number, username:string, message:string):Promise<void> => {
    if(Platform.OS === "web") {
      console.warn(t("Notifikácie nie je možné spúšťať vo webovej aplikácii."))
      return
    }

    try {
      if(notification_id.current) {
        await Notifications.cancelScheduledNotificationAsync(notification_id.current) // Cancels The Previous Notification
        notification_id.current = null // Removes The Notification ID
      }

      if(seconds <= 0) return

      // Setup The Notification And Gets Its ID
      const id:string = await Notifications.scheduleNotificationAsync({
        content: {
          title: t("Nová správa"),
          body: t("Nová správa od užívateľa {{username}}: {{message}}", { username, message }),
          sound: "default"
        },

        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.ceil(seconds),
          repeats: false,

          ...(Platform.OS === "android" && {
            channelId: "break-alarm"
          })
        }
      })

      notification_id.current = id // Sets The Notification ID
    } 
    
    catch (err) {
      console.log(err)
      console.error(t("Pri plánovaní notifikácie došlo k chybe."))
    }
  }

  const pathname:string = usePathname() // Gets The Pathname
  const active_chat_username = useRef<string|null>(null) // Gets The Active Chat Username Reference

  // Initializes The Load Of The Active Chat Username
  useEffect(() => {
    // If The User Is On The Chat Page
    if(pathname.startsWith("/chat/")) {
      const current_username:string = pathname.replace("/chat/", "") // Gets The Current Username
      active_chat_username.current = current_username // Stores The Active Chat Username
    }
    
    else active_chat_username.current = null // Stores The Active Chat Username
  }, [pathname])

  const chat_socket = useRef<WebSocket|null>(null) // Stores The Chat Socket Reference

  // Initializes The Web Socket
  useEffect(() => {
    // Function For Initialize The Web Socket
    const initializeWebSocket = async ():Promise<void> => {
      const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
      if(!user_token) return // Stops The Web Socket Connection If The User Isn't Logged In

      const is_secure:boolean = DOMAIN.startsWith("https") // Stores The Information If The API Is Secure
      const clean_domain:string = DOMAIN.replace(/^https?:\/\//, "") // Gets The Clean Domain
      const web_socket_protocol:"wss"|"ws" = is_secure ? "wss" : "ws" // Gets The Web Socket Protocol
      const web_socket_url:string = `${web_socket_protocol}://${clean_domain}/ws/notifications/?token=${user_token}` // Gets The Web Socket URL

      chat_socket.current = new WebSocket(web_socket_url) // Sets The Chat Socket

      // Response From The Server
      chat_socket.current.onmessage = (event) => {
        const data:ChatSocketResponse = JSON.parse(event.data) // Gets The Data

        // New Message
        if(data.action === "new_message_notification") {
          const current_active_chat_username:string|null = active_chat_username.current // Gets The Current Active Chat Username
          
          // If The Logged In User Isn't In Chat With The Sender Of The Message
          if(current_active_chat_username !== data.sender_username) {
            if(data.sender_username) scheduleNotification(10, data.sender_username, data.message) // Schedules The Notification (After 10 Seconds)
          }
        }
      }
    }

    initializeWebSocket() // Initializes The Web Socket

    return () => {
      if(chat_socket.current) chat_socket.current.close() // Closes The Socket
    }
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: color_scheme === "dark" ? "#000000" : "#ffffff",
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      
      <StatusBar style={color_scheme === "dark" ? "light" : "dark"} />
    </GestureHandlerRootView>
  )
}