// Local Notification When A Workout Break Ends (Permission Is Asked Only When A Break Starts)

import { Platform } from "react-native"
import * as Notifications from "expo-notifications"
import { AndroidImportance } from "expo-notifications"
import i18n from "@/lib/i18n"

const CHANNEL_ID:string = "break-alarm"

let is_channel_ready:boolean = false

// Function For Ask For The Permission (Returns If Notifications Are Allowed)
const ensurePermission = async ():Promise<boolean> => {
    if(Platform.OS === "web") return false

    try {
        if(Platform.OS === "android" && !is_channel_ready) {
            await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: i18n.t("Koniec prestávky"), importance: AndroidImportance.MAX, sound: "default", vibrationPattern: [0, 250, 250, 250] })
            is_channel_ready = true
        }

        const current = await Notifications.getPermissionsAsync() // Gets The Current Permission
        if(current.granted) return true
        if(!current.canAskAgain) return false

        return (await Notifications.requestPermissionsAsync()).granted
    }

    catch {
        return false
    }
}

// Function For Schedule The Alarm (Returns Its ID, Null When It Can't Be Scheduled)
export const scheduleBreakAlarm = async (seconds:number):Promise<string|null> => {
    if(seconds <= 0 || !(await ensurePermission())) return null

    try {
        return await Notifications.scheduleNotificationAsync({
            content: { title: i18n.t("Čas prestávky vypršal!"), body: i18n.t("Je čas pokračovať v tréningu. Poďme na to!"), sound: "default" },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.ceil(seconds), repeats: false, ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}) },
        })
    }

    catch {
        return null
    }
}

export const cancelBreakAlarm = (id:string|null):void => {
    if(id) Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
}
