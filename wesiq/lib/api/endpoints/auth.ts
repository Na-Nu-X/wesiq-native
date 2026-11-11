// Authentication Endpoints (Login, Registration, Password Reset)

import { apiPost } from "@/lib/api/client"
import { envelopeWith, isString } from "@/lib/api/guards"
import { setStoredString } from "@/lib/storage"

import type { ApiEnvelope, ApiResult } from "@/types/api"

interface LoginResponse extends ApiEnvelope {
    access:string,
    refresh:string
}

const isLoginResponse = envelopeWith<{ access:string, refresh:string }>({ access: isString, refresh: isString })

// Function For Log In (Stores The Token On Success)
export const login = async (identifier:string, password:string):Promise<ApiResult<LoginResponse>> => {
    const response:ApiResult<LoginResponse> = await apiPost<LoginResponse>("login/", { identifier, password }, { is_authenticated: false, guard: isLoginResponse })

    if(response.ok) await setStoredString("user_token", response.data.access)
    return response
}

export interface RegistrationData {
    first_name:string,
    last_name:string,
    username:string,
    email_address:string,
    phone_number:string, // Optional (Empty String When Not Entered)
    password:string,
    password_check:string,
    language:string // Language Of The Confirmation E-mail ("sk", "cs", "en", "es", "fr", "uk", "ru", "pt-br", "zh-hans")
}

// Function For Register (The Server Sends A Confirmation E-mail)
export const register = (data:RegistrationData):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("register/", data, { is_authenticated: false })
}

// Function For Request A Password Reset Code
export const requestPasswordResetCode = (identifier:string):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("get-password-reset-code/", { identifier }, { is_authenticated: false })
}

// Function For Map The App Language To The Server's Language Codes
// Sets A New Password With The Emailed 6-Digit Code (The Identifier Tells The Server Whose Code It Is, The User Isn't Logged In)
export const resetPassword = (identifier:string|null, password_reset_code:string, new_password:string):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("password-reset/", { identifier, password_reset_code, new_password }, { is_authenticated: false })
}

export const toServerLanguage = (app_language:string):string => {
    const normalized:string = app_language.toLowerCase().replace("_", "-") // Normalizes The Code
    const supported:string[] = ["sk", "cs", "en", "es", "fr", "uk", "ru", "pt-br", "zh-hans"]

    if(supported.includes(normalized)) return normalized
    if(normalized.startsWith("pt")) return "pt-br"
    if(normalized.startsWith("zh")) return "zh-hans"

    const base:string = normalized.split("-")[0] ?? "en" // Gets The Base Language
    return supported.includes(base) ? base : "en"
}
