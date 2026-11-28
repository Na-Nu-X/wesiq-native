// Multipart Upload With Progress (fetch Has No Upload Progress, So This Uses XMLHttpRequest)

import { Platform } from "react-native"
import i18n from "@/lib/i18n"
import { buildApiUrl } from "@/lib/api/client"
import { isApiEnvelope, isRecord } from "@/lib/api/guards"
import { endSession, getAccessToken, recoverFromUnauthorized } from "@/lib/api/session"
import { IS_MOCK_MODE } from "@/lib/api/mocks/install"

import type { ApiEnvelope, ApiResult } from "@/types/api"

// File Picked On The Device (Image Picker Asset Shape)
export interface UploadableFile {
    uri:string,
    name:string,
    mime_type:string,
    web_file?:File|Blob|null // The Browser File Object On Web
}

// Function For Convert A Picked File To A FormData Value
export const toFormDataFile = async (file:UploadableFile):Promise<Blob|{ uri:string, name:string, type:string }> => {
    if(Platform.OS === "web") {
        if(file.web_file) return new File([file.web_file], file.name, { type: file.mime_type })

        const response:Response = await fetch(file.uri) // Reads The Blob URL
        const blob:Blob = await response.blob() // Gets The Blob
        return new File([blob], file.name, { type: file.mime_type })
    }

    // React Native's FormData Accepts This Shape For Files
    return { uri: file.uri, name: file.name, type: file.mime_type }
}

interface UploadOptions {
    onProgress:(progress:number) => void, // 0 - 100
    signal?:AbortSignal
}

// Function For Upload FormData With Progress
export const uploadWithProgress = async <T extends ApiEnvelope>(path:string, form_data:FormData, { onProgress, signal }:UploadOptions, is_retry:boolean = false):Promise<ApiResult<T>> => {
    if(IS_MOCK_MODE) return simulateUpload<T>(onProgress, signal)

    const user_token:string|null = await getAccessToken() // Gets The User Token (Refreshed When It's About To Expire)

    return new Promise<ApiResult<T>>((resolve) => {
        const xhr:XMLHttpRequest = new XMLHttpRequest() // Gets The XHR

        // Function For Fail
        const fail = (kind:"network"|"aborted"|"server"|"invalid_response"|"unauthorized", status:number|null, message?:string):void => {
            const fallback:string = kind === "aborted" ? i18n.t("Požiadavka bola zrušená.") : kind === "network" ? i18n.t("Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie k internetu.") : i18n.t("Na serveri došlo k chybe. Skúste to znova.") // Gets The Fallback
            resolve({ ok: false, error: { kind, status, message: message || fallback } })
        }

        xhr.upload.onprogress = (event:ProgressEvent) => {
            if(event.lengthComputable && event.total > 0) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
        }

        xhr.onload = () => {
            let body:unknown = null // Gets The Body

            try {
                body = JSON.parse(xhr.responseText)
            }

            catch {
                body = null
            }

            const message:string|undefined = isRecord(body) && typeof body.message === "string" ? body.message : undefined // Gets The Server Message

            if(xhr.status === 401) {
                if(user_token && !is_retry) {
                    // Refreshes The Token And Uploads Again (Logs Out Only When The Session Is Over)
                    recoverFromUnauthorized(user_token).then((recovery:"retry"|"logged_out"|"failed") => {
                        if(recovery === "retry") resolve(uploadWithProgress<T>(path, form_data, { onProgress, signal }, true))
                        else if(recovery === "failed") fail("network", null)
                        else fail("unauthorized", 401, message)
                    })

                    return
                }

                if(user_token) endSession() // Rejected Even With A Fresh Token, The Session Is Over
                fail("unauthorized", 401, message)
                return
            }

            if(!isApiEnvelope(body)) {
                fail(xhr.status >= 200 && xhr.status < 300 ? "invalid_response" : "server", xhr.status, message)
                return
            }

            if(xhr.status < 200 || xhr.status >= 300 || !body.success) {
                fail("server", xhr.status, body.message)
                return
            }

            onProgress(100)
            resolve({ ok: true, data: body as T, message: body.message ?? "", status: xhr.status })
        }

        xhr.onerror = () => fail("network", null)
        xhr.onabort = () => fail("aborted", null)

        signal?.addEventListener("abort", () => xhr.abort())

        xhr.open("POST", buildApiUrl(path))
        xhr.setRequestHeader("Accept", "application/json")
        if(user_token) xhr.setRequestHeader("Authorization", `Bearer ${user_token}`)
        xhr.send(form_data)
    })
}

// Function For Simulate An Upload In Mock Mode (Development Only)
const simulateUpload = <T extends ApiEnvelope>(onProgress:(progress:number) => void, signal?:AbortSignal):Promise<ApiResult<T>> => {
    return new Promise((resolve) => {
        let progress:number = 0 // Gets The Progress

        // Gets The Interval
        const interval:ReturnType<typeof setInterval> = setInterval(() => {
            if(signal?.aborted) {
                clearInterval(interval)
                resolve({ ok: false, error: { kind: "aborted", status: null, message: i18n.t("Požiadavka bola zrušená.") } })
                return
            }

            progress = Math.min(100, progress + 8)
            onProgress(progress)

            if(progress >= 100) {
                clearInterval(interval)
                resolve({ ok: true, data: { success: true, message: "OK (mock)", compress_tasks: [] } as unknown as T, message: "OK (mock)", status: 201 })
            }
        }, 120)
    })
}
