// Notification WebSocket For The Logged In User: Opens On Login, Closes On Logout, Reconnects After Drops

import { useEffect, useRef } from "react"
import { AppState } from "react-native"
import { usePathname } from "expo-router"
import i18n from "@/lib/i18n"
import { DOMAIN } from "@/constants/general"
import { IS_MOCK_MODE } from "@/lib/api/mocks/install"
import { getAccessToken } from "@/lib/api/session"
import { toSharedPost } from "@/lib/api/endpoints/chat"
import { are_notifications_supported, cancelLocalNotification, getNotificationPermission, scheduleLocalNotification } from "@/lib/notifications"

import type { ChatSocketEvent } from "@/types/models"

const NOTIFICATION_DELAY_SECONDS:number = 10 // Same Delay As Before
const MAX_RECONNECT_DELAY_MS:number = 30_000 // Defines The Max Reconnect Delay MS

// Function For Build The Socket URL
const getSocketUrl = (user_token:string):string => {
    const protocol:"wss"|"ws" = DOMAIN.startsWith("https") ? "wss" : "ws" // Gets The Protocol
    return `${protocol}://${DOMAIN.replace(/^https?:\/\//, "")}/ws/notifications/?token=${encodeURIComponent(user_token)}`
}

// Function For The Notification Text Of A Message
const getMessagePreview = (event:ChatSocketEvent):string => {
    if(event.message?.trim()) return event.message
    if(toSharedPost(event.post)) return i18n.t("Zdieľaný príspevok") // A Plain Message Has "post": {}
    return i18n.t("Príloha")
}

// Function For The Notification Socket Hook
export default function useNotificationSocket(user_id:number|null):void {
    const pathname:string = usePathname() // Gets The Pathname
    const active_chat_username = useRef<string|null>(null) // Stores The Username Of The Open DM
    const active_room_id = useRef<number|null>(null) // Stores The Room ID Of The Open Group Chat

    // Initializes The Active Chat (No Notification For The Chat The User Is Reading)
    useEffect(() => {
        const group_match:RegExpMatchArray|null = pathname.match(/^\/chat\/group\/(\d+)/) // Gets The Group Match

        active_room_id.current = group_match ? Number(group_match[1]) : null
        active_chat_username.current = !group_match && pathname.startsWith("/chat/") ? decodeURIComponent(pathname.replace("/chat/", "")) : null
    }, [pathname])

    // Initializes The Socket For The Logged In User
    useEffect(() => {
        if(user_id === null || IS_MOCK_MODE) return

        let socket:WebSocket|null = null // Gets The Socket
        let is_closed_by_app:boolean = false // Logout / Unmount, Don't Reconnect
        let reconnect_timeout:ReturnType<typeof setTimeout>|null = null // Gets The Reconnect Timeout
        let reconnect_attempts:number = 0 // Gets The Reconnect Attempts
        let notification_id:string|null = null // Gets The Notification ID

        // Function For Show The Message Notification (Only When The User Already Allowed Notifications)
        const notifyAboutMessage = async (event:ChatSocketEvent):Promise<void> => {
            if(!are_notifications_supported || !event.sender_username) return

            const is_open:boolean = event.is_group ? event.room_id === active_room_id.current : event.sender_username === active_chat_username.current // Checks If It Is Open
            if(is_open) return
            if(await getNotificationPermission() !== "granted") return

            // Group Chats: The Group Name As The Title, "username: message" As The Text
            const title:string = event.is_group ? event.room_name || i18n.t("Skupina") : event.sender_username // Gets The Title
            const body:string = event.is_group ? `${event.sender_username}: ${getMessagePreview(event)}` : getMessagePreview(event) // Gets The Body

            cancelLocalNotification(notification_id) // Keeps Only The Latest Message
            notification_id = await scheduleLocalNotification("messages", { title, body }, NOTIFICATION_DELAY_SECONDS)
        }

        // Function For Open The Socket
        const connect = async ():Promise<void> => {
            const user_token:string|null = await getAccessToken() // Gets The User Token (Refreshed When It's About To Expire)
            if(!user_token || is_closed_by_app) return

            socket = new WebSocket(getSocketUrl(user_token))

            socket.onopen = () => { reconnect_attempts = 0 }

            socket.onmessage = (message:WebSocketMessageEvent) => {
                try {
                    const event:ChatSocketEvent = JSON.parse(String(message.data)) // Gets The Data
                    if(event.action === "new_message_notification") notifyAboutMessage(event)
                }

                catch {
                    // Ignores Malformed Messages
                }
            }

            socket.onclose = () => {
                socket = null
                if(is_closed_by_app) return

                const delay_ms:number = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** reconnect_attempts) // 1s, 2s, 4s … 30s
                reconnect_attempts += 1
                reconnect_timeout = setTimeout(connect, delay_ms)
            }
        }

        connect() // Opens The Socket

        // Reconnects Right Away When The App Comes Back To The Foreground
        const app_state_subscription = AppState.addEventListener("change", (state) => {
            if(state !== "active" || socket !== null || is_closed_by_app) return

            if(reconnect_timeout) clearTimeout(reconnect_timeout)
            reconnect_attempts = 0
            connect()
        })

        return () => {
            is_closed_by_app = true
            app_state_subscription.remove()
            if(reconnect_timeout) clearTimeout(reconnect_timeout)
            cancelLocalNotification(notification_id) // No Message Alerts After Logout
            socket?.close() // Closes The Socket
        }
    }, [user_id])
}
