// Local Notifications: Permission, Android Channels And Chat Message Alerts (Permission Is Never Asked At App Launch)

import { Platform } from "react-native"
import * as Notifications from "expo-notifications"
import { AndroidImportance } from "expo-notifications"
import i18n from "@/lib/i18n"

export const are_notifications_supported:boolean = Platform.OS === "ios" || Platform.OS === "android"

export type NotificationChannel = "messages"|"break-alarm"

export type NotificationPermission = "granted"|"undetermined"|"denied" // Undetermined = Can Still Be Asked

const ready_channels:Set<NotificationChannel> = new Set()

// Function For Create The Android Channel (Must Exist Before Asking For The Permission On Android 13+)
const ensureChannel = async (channel:NotificationChannel):Promise<void> => {
    if(Platform.OS !== "android" || ready_channels.has(channel)) return

    if(channel === "messages") await Notifications.setNotificationChannelAsync(channel, { name: i18n.t("Správy"), importance: AndroidImportance.HIGH, sound: "default" })
    else await Notifications.setNotificationChannelAsync(channel, { name: i18n.t("Koniec prestávky"), importance: AndroidImportance.MAX, sound: "default", vibrationPattern: [0, 250, 250, 250] })

    ready_channels.add(channel)
}

// Function For Get The Permission Without Asking
export const getNotificationPermission = async ():Promise<NotificationPermission> => {
    if(!are_notifications_supported) return "denied"

    try {
        const current = await Notifications.getPermissionsAsync() // Gets The Current Permission
        if(current.granted) return "granted"
        return current.canAskAgain ? "undetermined" : "denied"
    }

    catch {
        return "denied"
    }
}

// Function For Ask For The Permission When The User Needs It (Returns If Notifications Are Allowed)
export const requestNotificationPermission = async (channel:NotificationChannel):Promise<boolean> => {
    if(!are_notifications_supported) return false

    try {
        await ensureChannel(channel)

        const permission:NotificationPermission = await getNotificationPermission()
        if(permission !== "undetermined") return permission === "granted"

        return (await Notifications.requestPermissionsAsync()).granted
    }

    catch {
        return false
    }
}

// Function For Schedule A Notification On A Channel (Returns Its ID, Null When It Can't Be Scheduled)
export const scheduleLocalNotification = async (channel:NotificationChannel, content:{ title:string, body:string }, seconds:number):Promise<string|null> => {
    if(!are_notifications_supported || seconds <= 0) return null

    try {
        await ensureChannel(channel)

        return await Notifications.scheduleNotificationAsync({
            content: { ...content, sound: "default" },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.ceil(seconds), repeats: false, ...(Platform.OS === "android" ? { channelId: channel } : {}) },
        })
    }

    catch {
        return null
    }
}

export const cancelLocalNotification = (id:string|null):void => {
    if(id && are_notifications_supported) Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
}

// Shows Notifications As Banners Even While The App Is Open (Otherwise iOS Drops Them In The Foreground)
if(are_notifications_supported) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    })
}
