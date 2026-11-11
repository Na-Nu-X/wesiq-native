// Cross Platform Alerts (React Native's Alert Does Nothing On Web, So Web Falls Back To The Browser Dialogs)

import { Alert, Platform } from "react-native"
import i18n from "@/lib/i18n"

// Function For Show A Simple Message
export const showAlert = (title:string, message?:string):void => {
    if(Platform.OS === "web") {
        window.alert(message ? `${title}\n\n${message}` : title)
        return
    }

    Alert.alert(title, message)
}

interface ConfirmOptions {
    title:string,
    message?:string,
    confirm_label:string,
    cancel_label?:string,
    is_destructive?:boolean
}

// Function For Ask The User To Confirm (Resolves To True When Confirmed)
export const confirmAction = ({ title, message, confirm_label, cancel_label, is_destructive = false }:ConfirmOptions):Promise<boolean> => {
    if(Platform.OS === "web") {
        return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title))
    }

    return new Promise<boolean>((resolve) => {
        Alert.alert(
            title,
            message,

            [
                { text: cancel_label ?? i18n.t("Zrušiť"), style: "cancel", onPress: () => resolve(false) },
                { text: confirm_label, style: is_destructive ? "destructive" : "default", onPress: () => resolve(true) },
            ],

            { cancelable: true, onDismiss: () => resolve(false) }
        )
    })
}
