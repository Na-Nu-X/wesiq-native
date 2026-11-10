// Haptic Feedback (No-Op On Web, Errors Are Ignored Because Haptics Are Never Critical)

import { Platform } from "react-native"
import * as Haptics from "expo-haptics"

const IS_SUPPORTED:boolean = Platform.OS === "ios" || Platform.OS === "android"

export const haptics = {
    // Light Tap For Selections (Chips, Steppers, Toggles)
    selection: ():void => {
        if(IS_SUPPORTED) Haptics.selectionAsync().catch(() => {})
    },

    // Button Presses
    light: ():void => {
        if(IS_SUPPORTED) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    },

    // Completed Actions (Saved, Sent, Task Done)
    success: ():void => {
        if(IS_SUPPORTED) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    },

    // Failed Actions
    error: ():void => {
        if(IS_SUPPORTED) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    },

    // Destructive Confirmations, Drag Start
    warning: ():void => {
        if(IS_SUPPORTED) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {})
    },
}
