// Local Notification When A Workout Break Ends (Permission Is Asked Only When A Break Starts)

import i18n from "@/lib/i18n"
import { cancelLocalNotification, requestNotificationPermission, scheduleLocalNotification } from "@/lib/notifications"

// Function For Schedule The Alarm (Returns Its ID, Null When It Can't Be Scheduled)
export const scheduleBreakAlarm = async (seconds:number):Promise<string|null> => {
    if(seconds <= 0 || !(await requestNotificationPermission("break-alarm"))) return null

    return await scheduleLocalNotification("break-alarm", { title: i18n.t("Čas prestávky vypršal!"), body: i18n.t("Je čas pokračovať v tréningu. Poďme na to!") }, seconds)
}

export const cancelBreakAlarm = (id:string|null):void => cancelLocalNotification(id)
