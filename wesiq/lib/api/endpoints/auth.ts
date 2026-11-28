// Authentication Endpoints (Login, Registration, Password Reset)

import { apiPost } from "@/lib/api/client"
import { envelopeWith, isString } from "@/lib/api/guards"
import { saveSession } from "@/lib/api/session"

import type { ApiEnvelope, ApiResult } from "@/types/api"

interface LoginResponse extends ApiEnvelope {
    access:string,
    refresh:string
}

const isLoginResponse = envelopeWith<{ access:string, refresh:string }>({ access: isString, refresh: isString }) // Checks If It Is Login Response

// Function For Clean A Login Identifier (E-mail, Username Or @username; Removes Spaces And Invisible Characters Mobile Keyboards Insert)
export const normalizeLoginIdentifier = (identifier:string):string => identifier.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim()

// Function For Log In (Stores The Tokens On Success; The Server Accepts An E-mail, A Username Or An @username)
export const login = async (identifier:string, password:string):Promise<ApiResult<LoginResponse>> => {
    const response:ApiResult<LoginResponse> = await apiPost<LoginResponse>("login/", { identifier: normalizeLoginIdentifier(identifier), password }, { is_authenticated: false, guard: isLoginResponse }) // Gets The Response

    if(response.ok) await saveSession(response.data.access, response.data.refresh) // Keeps The Refresh Token, The Access Token Expires After 15 Minutes
    return response
}

// Function For Log In With Google (The Server Verifies The ID Token, Then Finds Or Creates The Account; Stores The Tokens On Success)
export const googleLogin = async (id_token:string, language:string):Promise<ApiResult<LoginResponse>> => {
    const response:ApiResult<LoginResponse> = await apiPost<LoginResponse>("auth/google/", { id_token, language },{ is_authenticated: false, guard: isLoginResponse }) // Gets The Response

    if(response.ok) await saveSession(response.data.access, response.data.refresh)
    return response
}

// Function For Log In With Apple (Apple Only Gives The Name On The First Sign-In, So It Is Sent Along With The Identity Token)
export const appleLogin = async (identity_token:string, first_name:string, last_name:string, language:string):Promise<ApiResult<LoginResponse>> => {
    const response:ApiResult<LoginResponse> = await apiPost<LoginResponse>("auth/apple/", { identity_token, first_name, last_name, language },{ is_authenticated: false, guard: isLoginResponse }) // Gets The Response

    if(response.ok) await saveSession(response.data.access, response.data.refresh)
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
    language:string, // Language Of The Confirmation E-mail ("sk", "cs", "en", "es", "fr", "uk", "ru", "pt-br", "zh-hans")
    age_confirmation:boolean // The User Confirmed Being At Least 13 Years Old (Required By The Server And The Privacy Policy)
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
// Function For Set A New Password With The Emailed 6-Digit Code (The Identifier Tells The Server Whose Code It Is, The User Isn't Logged In)
export const resetPassword = (identifier:string|null, password_reset_code:string, new_password:string):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("password-reset/", { identifier, password_reset_code, new_password }, { is_authenticated: false })
}

// Function For Convert To Server Language
export const toServerLanguage = (app_language:string):string => {
    const normalized:string = app_language.toLowerCase().replace("_", "-") // Normalizes The Code
    const supported:string[] = ["sk", "cs", "en", "es", "fr", "uk", "ru", "pt-br", "zh-hans"] // Gets The Supported

    if(supported.includes(normalized)) return normalized
    if(normalized.startsWith("pt")) return "pt-br"
    if(normalized.startsWith("zh")) return "zh-hans"

    const base:string = normalized.split("-")[0] ?? "en" // Gets The Base Language
    return supported.includes(base) ? base : "en"
}
