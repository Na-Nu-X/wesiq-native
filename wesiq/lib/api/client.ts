// Typed API Client For The Django "native-api" (One Place For Auth, Timeouts, Errors And Response Validation)

import { Platform } from "react-native"
import { API_URL } from "@/constants/general"
import i18n from "@/lib/i18n"
import { endSession, getAccessToken, recoverFromUnauthorized } from "@/lib/api/session"
import { isApiEnvelope, isRecord } from "@/lib/api/guards"
import { IS_MOCK_MODE } from "@/lib/api/mocks/install"

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

// Unauthorized Listeners Live In The Session Module (Re-Exported For Existing Imports)
export { notifyUnauthorized, onUnauthorized } from "@/lib/api/session"

// ---------- Helpers ----------

// Function For Build The Full URL With Query Parameters
export const buildApiUrl = (path:string, query?:Record<string, QueryValue>):string => {
    const clean_path:string = path.replace(/^\/+/, "") // Removes Leading Slashes
    const url:string = `${API_URL}/${clean_path}` // Gets The URL

    if(!query) return url

    // Gets The Query String
    const query_string:string = Object.entries(query)
        .filter((entry):entry is [string, string|number|boolean] => entry[1] !== null && entry[1] !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join("&")

    return query_string ? `${url}${url.includes("?") ? "&" : "?"}${query_string}` : url
}

// Function For Create The Error Result
const createError = <T,>(kind:ApiErrorKind, status:number|null, message?:string):ApiResult<T> => {
    // Gets The Fallback Messages
    const fallback_messages:Record<ApiErrorKind, string> = {
        network: i18n.t("Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie k internetu."),
        timeout: i18n.t("Server neodpovedal včas. Skúste to znova."),
        aborted: i18n.t("Požiadavka bola zrušená."),
        unauthorized: i18n.t("Vaše prihlásenie vypršalo. Prihláste sa znova."),
        server: i18n.t("Na serveri došlo k chybe. Skúste to znova."),
        invalid_response: i18n.t("Server vrátil neočakávanú odpoveď."),
    }

    // Gets The Error
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

// The Part Of A Response The Client Reads (fetch's Response And The XMLHttpRequest Result Both Match It)
interface HttpResponse {
    status:number,
    ok:boolean,
    json:() => Promise<unknown>
}

// Function For Send FormData Through React Native's Networking (XMLHttpRequest)
// Expo Replaces The Global fetch With expo/fetch, Which Rejects React Native File Parts ({ uri, name, type }) With "Unsupported FormDataPart implementation".
// XMLHttpRequest Still Uses React Native's Networking, Which Reads The File From Disk (Also Fine For Large Videos)
// Function For Send The Form Data With XHR
const sendFormDataWithXhr = (url:string, method:HttpMethod, headers:Record<string, string>, form_data:FormData, signal:AbortSignal):Promise<HttpResponse> => {
    return new Promise<HttpResponse>((resolve, reject) => {
        const xhr:XMLHttpRequest = new XMLHttpRequest() // Gets The XHR
        xhr.open(method, url)
        Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value)) // No Content-Type: The Boundary Is Added Automatically

        // Function For Abort
        const abort = ():void => xhr.abort()

        xhr.onload = () => {
            signal.removeEventListener("abort", abort)
            const response_text:string = xhr.responseText // Gets The Response Text

            resolve({
                status: xhr.status,
                ok: xhr.status >= 200 && xhr.status < 300,
                json: async ():Promise<unknown> => JSON.parse(response_text) as unknown,
            })
        }

        xhr.onerror = () => {
            signal.removeEventListener("abort", abort)
            reject(new TypeError("Network request failed"))
        }

        xhr.onabort = () => {
            signal.removeEventListener("abort", abort)
            reject(new DOMException("Aborted", "AbortError"))
        }

        if(signal.aborted) {
            reject(new DOMException("Aborted", "AbortError"))
            return
        }

        signal.addEventListener("abort", abort)
        xhr.send(form_data)
    })
}

// ---------- Request ----------

// Function For Send The Request To The API
export async function apiRequest<T extends ApiEnvelope = ApiEnvelope>(path:string, options:ApiRequestOptions<T> = {}, is_retry:boolean = false):Promise<ApiResult<T>> {
    // Gets The Method, Query, Body, Form Data, Signal, Timeout MS, Is Authenticated, Extra Headers And Guard
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

    const user_token:string|null = is_authenticated ? await getAccessToken() : null // Gets The User Token (Refreshed When It's About To Expire)
    if(user_token) headers["Authorization"] = `Bearer ${user_token}`

    // Combines The Caller Signal With The Timeout
    const controller:AbortController = new AbortController() // Gets The Controller
    let is_timed_out:boolean = false // Checks If It Is Timed Out

    // Gets The Timeout
    const timeout:ReturnType<typeof setTimeout> = setTimeout(() => {
        is_timed_out = true
        controller.abort()
    }, timeout_ms)

    // Function For Abort From Caller
    const abortFromCaller = ():void => controller.abort()
    if(signal) {
        if(signal.aborted) controller.abort()
        else signal.addEventListener("abort", abortFromCaller)
    }

    let response:HttpResponse // Gets The Response
    const url:string = buildApiUrl(path, query) // Gets The URL
    const is_native_upload:boolean = form_data !== undefined && Platform.OS !== "web" && !IS_MOCK_MODE // The Mock API Patches fetch, So Mock Uploads Stay On fetch

    try {
        response = is_native_upload && form_data
            ? await sendFormDataWithXhr(url, method, headers, form_data, controller.signal)
            : await fetch(url, {
                method,
                headers,
                body: form_data ?? (body !== undefined ? JSON.stringify(body) : undefined),
                signal: controller.signal,
            })
    }

    catch(error) {
        if(is_timed_out) return createError<T>("timeout", null)
        if(signal?.aborted) return createError<T>("aborted", null)
        if(__DEV__) console.warn(`[api] Request to "${path}" failed before a response`, error) // Shows The Real Reason In Development (The User Sees The Generic Network Message)
        return createError<T>("network", null)
    }

    finally {
        clearTimeout(timeout)
        signal?.removeEventListener("abort", abortFromCaller)
    }

    // Parses The Body (Some Error Responses Aren't JSON)
    let json:unknown = null // Gets The JSON

    try {
        json = await response.json()
    }

    catch {
        json = null
    }

    if(response.status === 401) {
        if(is_authenticated && user_token) {
            if(is_retry) {
                await endSession() // Rejected Even With A Fresh Token, The Session Is Over
            }

            else {
                const recovery:"retry"|"logged_out"|"failed" = await recoverFromUnauthorized(user_token) // Refreshes The Token (Logs Out Only When The Session Is Over)

                if(recovery === "retry") return apiRequest<T>(path, options, true) // Sends The Request Again With The New Token
                if(recovery === "failed") return createError<T>("network", null) // Couldn't Refresh Right Now, Keeps The User Logged In
            }
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

    console.log(json)

    return { ok: true, data: json as T, message: json.message ?? "", status: response.status }
}

// Shorthands
// Function For API Get
export const apiGet = <T extends ApiEnvelope = ApiEnvelope>(path:string, options:Omit<ApiRequestOptions<T>, "method"|"body"|"form_data"> = {}) => {
    return apiRequest<T>(path, { ...options, method: "GET" })
}

// Function For API Post
export const apiPost = <T extends ApiEnvelope = ApiEnvelope>(path:string, body?:unknown, options:Omit<ApiRequestOptions<T>, "method"|"body"> = {}) => {
    return apiRequest<T>(path, { ...options, method: "POST", body })
}
