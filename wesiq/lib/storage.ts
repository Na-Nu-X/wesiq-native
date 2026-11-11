// Typed AsyncStorage Access (One Place For All Keys)

import AsyncStorage from "@react-native-async-storage/async-storage"

export const STORAGE_KEYS = {
    user_token: "user_token",
    app_language: "app_language",
    device_id: "device_id",
    identifier: "identifier",
    password_reset_start_time: "password_reset_start_time",
    processing_posts: "processing_posts",
    searched_users_history: "searched_users_history",
    notifications_prompt_dismissed: "notifications_prompt_dismissed",
} as const

export type StorageKey = keyof typeof STORAGE_KEYS

// Function For Get A String Value (Returns Null On Missing Value Or Storage Error)
export const getStoredString = async (key:StorageKey):Promise<string|null> => {
    try {
        return await AsyncStorage.getItem(STORAGE_KEYS[key])
    }

    catch {
        return null
    }
}

// Function For Set A String Value (Returns If It Was Saved)
export const setStoredString = async (key:StorageKey, value:string):Promise<boolean> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS[key], value)
        return true
    }

    catch {
        return false
    }
}

// Function For Remove A Value
export const removeStoredValue = async (key:StorageKey):Promise<void> => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS[key])
    }

    catch {
        // Nothing To Do, The Value Stays Stored
    }
}

// Function For Get A JSON Value Checked By A Guard (Returns The Fallback On Missing, Corrupted Or Unexpected Data)
export const getStoredJson = async <T,>(key:StorageKey, guard:(value:unknown) => value is T, fallback:T):Promise<T> => {
    const raw_value:string|null = await getStoredString(key) // Gets The Raw Value
    if(raw_value === null) return fallback

    try {
        const parsed_value:unknown = JSON.parse(raw_value) // Parses The Value
        return guard(parsed_value) ? parsed_value : fallback
    }

    catch {
        return fallback
    }
}

// Function For Set A JSON Value
export const setStoredJson = async (key:StorageKey, value:unknown):Promise<boolean> => {
    return setStoredString(key, JSON.stringify(value))
}
