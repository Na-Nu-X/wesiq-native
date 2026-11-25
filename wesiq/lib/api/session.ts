// Session Tokens (Short-Lived JWT Access Token + Rotating Refresh Token From The Django "native-api")
// The Server Issues 15 Minute Access Tokens And 30 Day Refresh Tokens (Rotated And Blacklisted After Each Use),
// So The App Refreshes The Access Token Before It Expires And Again When A Request Returns 401.

import { API_URL } from "@/constants/general"
import { getStoredString, removeStoredValue, setStoredString } from "@/lib/storage"
import { isRecord } from "@/lib/api/guards"
import { IS_MOCK_MODE } from "@/lib/api/mocks/install"

const REFRESH_PATH:string = "token/refresh/"
const REFRESH_TIMEOUT_MS:number = 15000
const EXPIRY_MARGIN_SECONDS:number = 60 // Refreshes This Long Before The Access Token Expires

// ---------- Unauthorized Listeners (The Logged In User Context Subscribes To Clear The User) ----------

type UnauthorizedListener = () => void
const unauthorized_listeners:Set<UnauthorizedListener> = new Set()

// Function For Subscribe To Session Expiry (Returns The Unsubscribe Function)
export const onUnauthorized = (listener:UnauthorizedListener):(() => void) => {
    unauthorized_listeners.add(listener)

    return () => {
        unauthorized_listeners.delete(listener)
    }
}

// Function For Notify The Listeners
export const notifyUnauthorized = ():void => {
    unauthorized_listeners.forEach((listener:UnauthorizedListener) => listener())
}

// ---------- Storage ----------

// Function For Store Both Tokens After Login / Refresh
export const saveSession = async (access:string, refresh:string):Promise<void> => {
    await Promise.all([setStoredString("user_token", access), setStoredString("refresh_token", refresh)])
}

// Function For Remove Both Tokens
export const clearSession = async ():Promise<void> => {
    await Promise.all([removeStoredValue("user_token"), removeStoredValue("refresh_token")])
}

// Function For End The Session (Removes The Tokens And Logs The User Out)
export const endSession = async ():Promise<void> => {
    await clearSession()
    notifyUnauthorized()
}

// Function For Read The Expiry (Unix Seconds) From A JWT (Null When It Isn't A Readable JWT, E.g. The Mock Token)
const getTokenExpiry = (token:string):number|null => {
    try {
        const payload:string|undefined = token.split(".")[1]
        if(!payload) return null

        const base64:string = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=")
        const decoded:unknown = JSON.parse(atob(base64))

        return isRecord(decoded) && typeof decoded.exp === "number" ? decoded.exp : null
    }

    catch {
        return null
    }
}

const isExpiringSoon = (token:string):boolean => {
    const expiry:number|null = getTokenExpiry(token)
    return expiry !== null && expiry - EXPIRY_MARGIN_SECONDS <= Date.now() / 1000
}

// ---------- Refresh ----------

type RefreshResult = "refreshed"|"invalid"|"failed" // "invalid" = The Session Is Over, "failed" = Network / Server Problem (Keep The Session)

let refresh_in_flight:Promise<RefreshResult>|null = null // One Refresh At A Time (A Rotated Refresh Token Can Only Be Used Once)

const requestNewTokens = async ():Promise<RefreshResult> => {
    const refresh_token:string|null = await getStoredString("refresh_token")
    if(!refresh_token) return "invalid"

    const controller:AbortController = new AbortController()
    const timeout:ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS)

    try {
        const response:Response = await fetch(`${API_URL}/${REFRESH_PATH}`, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refresh_token }),
            signal: controller.signal,
        })

        if(response.status === 400 || response.status === 401) return "invalid" // Expired, Blacklisted Or Malformed Refresh Token
        if(!response.ok) return "failed"

        const json:unknown = await response.json()
        if(!isRecord(json) || typeof json.access !== "string") return "failed"

        await saveSession(json.access, typeof json.refresh === "string" ? json.refresh : refresh_token) // The Server Rotates The Refresh Token
        return "refreshed"
    }

    catch {
        return "failed"
    }

    finally {
        clearTimeout(timeout)
    }
}

// Function For Refresh The Access Token (Concurrent Callers Share One Request)
export const refreshSession = ():Promise<RefreshResult> => {
    if(!refresh_in_flight) {
        refresh_in_flight = requestNewTokens().finally(() => {
            refresh_in_flight = null
        })
    }

    return refresh_in_flight
}

// Function For Get An Access Token That Isn't About To Expire (Refreshes It First When Needed)
export const getAccessToken = async ():Promise<string|null> => {
    const access_token:string|null = await getStoredString("user_token")
    if(!access_token || IS_MOCK_MODE || !isExpiringSoon(access_token)) return access_token

    const result:RefreshResult = await refreshSession()

    if(result === "invalid") {
        await endSession()
        return null
    }

    return await getStoredString("user_token") // The New Token (Or The Old One When The Refresh Failed, The Server Decides)
}

// Function For Handle A 401 Response ("retry" = Send The Request Again With The New Token, "logged_out" = The Session Is Over, "failed" = Couldn't Refresh Right Now)
export const recoverFromUnauthorized = async (sent_token:string):Promise<"retry"|"logged_out"|"failed"> => {
    if(IS_MOCK_MODE) return "failed"

    const current_token:string|null = await getStoredString("user_token")
    if(current_token && current_token !== sent_token) return "retry" // Another Request Already Refreshed The Token

    const result:RefreshResult = await refreshSession()
    if(result === "refreshed") return "retry"
    if(result === "failed") return "failed"

    await endSession()
    return "logged_out"
}
