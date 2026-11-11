// Typed API Client For The Django "native-api" (One Place For Auth, Timeouts, Errors And Response Validation)

import { API_URL } from "@/constants/general"
import i18n from "@/lib/i18n"
import { getStoredString, removeStoredValue } from "@/lib/storage"
import { isApiEnvelope, isRecord } from "@/lib/api/guards"

import type { ApiEnvelope, ApiError, ApiErrorKind, ApiResult, HttpMethod, ResponseGuard } from "@/types/api"

const DEFAULT_TIMEOUT_MS:number = 20000 // Defines The Default Request Timeout

type QueryValue = string|number|boolean|null|undefined

export interface ApiRequestOptions<T> {
    method?:HttpMethod,
    query?:Record<string, QueryValue>,
    body?:unknown, // Sent As JSON (Use "form_data" For Files)
    form_data?:FormData,
    signal?:AbortSignal,
    timeout_ms?:number,
    is_authenticated?:boolean, // Sends The Bearer Token (Default True)
    headers?:Record<string, string>, // Extra Headers (E.g. X-Device-ID)
    guard?:ResponseGuard<T> // Validates The Response Payload
}

// ---------- Unauthorized Listeners (The Logged In User Context Subscribes To Clear The User) ----------

type UnauthorizedListener = () => void
const unauthorized_listeners:Set<UnauthorizedListener> = new Set()

// Function For Subscribe To Unauthorized Responses (Returns The Unsubscribe Function)
export const onUnauthorized = (listener:UnauthorizedListener):(() => void) => {
    unauthorized_listeners.add(listener)

    return () => {
        unauthorized_listeners.delete(listener)
    }
}

// Function For Notify The Listeners (Also Used By The Upload Helper)
export const notifyUnauthorized = ():void => {
    unauthorized_listeners.forEach((listener:UnauthorizedListener) => listener())
}

// ---------- Helpers ----------

// Function For Build The Full URL With Query Parameters
export const buildApiUrl = (path:string, query?:Record<string, QueryValue>):string => {
    const clean_path:string = path.replace(/^\/+/, "") // Removes Leading Slashes
    const url:string = `${API_URL}/${clean_path}` // Gets The URL

    if(!query) return url

    const query_string:string = Object.entries(query)
        .filter((entry):entry is [string, string|number|boolean] => entry[1] !== null && entry[1] !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join("&")

    return query_string ? `${url}${url.includes("?") ? "&" : "?"}${query_string}` : url
}

// Function For Create The Error Result
const createError = <T,>(kind:ApiErrorKind, status:number|null, message?:string):ApiResult<T> => {
    const fallback_messages:Record<ApiErrorKind, string> = {
        network: i18n.t("Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie k internetu."),
        timeout: i18n.t("Server neodpovedal včas. Skúste to znova."),
        aborted: i18n.t("Požiadavka bola zrušená."),
        unauthorized: i18n.t("Vaše prihlásenie vypršalo. Prihláste sa znova."),
        server: i18n.t("Na serveri došlo k chybe. Skúste to znova."),
        invalid_response: i18n.t("Server vrátil neočakávanú odpoveď."),
    }

    const error:ApiError = {
        kind,
        status,
        message: message && message.trim().length > 0 ? message : fallback_messages[kind],
    }

    return { ok: false, error }
}

// Function For Get The Server Message From Any JSON Body
const getMessage = (body:unknown):string|undefined => {
    return isRecord(body) && typeof body.message === "string" ? body.message : undefined
}

// ---------- Request ----------

// Function For Send The Request To The API
export async function apiRequest<T extends ApiEnvelope = ApiEnvelope>(path:string, options:ApiRequestOptions<T> = {}):Promise<ApiResult<T>> {
    const {
        method = "GET",
        query,
        body,
        form_data,
        signal,
        timeout_ms = DEFAULT_TIMEOUT_MS,
        is_authenticated = true,
        headers: extra_headers,
        guard,
    } = options

    const headers:Record<string, string> = { "Accept": "application/json", ...extra_headers } // Stores The Headers

    if(body !== undefined && !form_data) headers["Content-Type"] = "application/json"

    if(is_authenticated) {
        const user_token:string|null = await getStoredString("user_token") // Gets The User Token
        if(user_token) headers["Authorization"] = `Bearer ${user_token}`
    }

    // Combines The Caller Signal With The Timeout
    const controller:AbortController = new AbortController()
    let is_timed_out:boolean = false

    const timeout:ReturnType<typeof setTimeout> = setTimeout(() => {
        is_timed_out = true
        controller.abort()
    }, timeout_ms)

    const abortFromCaller = ():void => controller.abort()
    if(signal) {
        if(signal.aborted) controller.abort()
        else signal.addEventListener("abort", abortFromCaller)
    }

    let response:Response

    try {
        response = await fetch(buildApiUrl(path, query), {
            method,
            headers,
            body: form_data ?? (body !== undefined ? JSON.stringify(body) : undefined),
            signal: controller.signal,
        })
    }

    catch {
        if(is_timed_out) return createError<T>("timeout", null)
        if(signal?.aborted) return createError<T>("aborted", null)
        return createError<T>("network", null)
    }

    finally {
        clearTimeout(timeout)
        signal?.removeEventListener("abort", abortFromCaller)
    }

    // Parses The Body (Some Error Responses Aren't JSON)
    let json:unknown = null

    try {
        json = await response.json()
    }

    catch {
        json = null
    }

    if(response.status === 401) {
        if(is_authenticated) {
            await removeStoredValue("user_token") // Removes The Invalid Token
            notifyUnauthorized() // Notifies The Listeners
        }

        return createError<T>("unauthorized", 401, getMessage(json))
    }

    if(!isApiEnvelope(json)) {
        return createError<T>(response.ok ? "invalid_response" : "server", response.status, getMessage(json))
    }

    if(!response.ok || !json.success) {
        return createError<T>("server", response.status, json.message)
    }

    if(guard && !guard(json)) {
        if(__DEV__) console.warn(`[api] Unexpected response shape from "${path}"`, json)
        return createError<T>("invalid_response", response.status)
    }

    return { ok: true, data: json as T, message: json.message ?? "", status: response.status }
}

// Shorthands
export const apiGet = <T extends ApiEnvelope = ApiEnvelope>(path:string, options:Omit<ApiRequestOptions<T>, "method"|"body"|"form_data"> = {}) => {
    return apiRequest<T>(path, { ...options, method: "GET" })
}

export const apiPost = <T extends ApiEnvelope = ApiEnvelope>(path:string, body?:unknown, options:Omit<ApiRequestOptions<T>, "method"|"body"> = {}) => {
    return apiRequest<T>(path, { ...options, method: "POST", body })
}
