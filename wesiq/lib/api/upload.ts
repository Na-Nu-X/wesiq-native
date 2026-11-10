// Multipart Upload With Progress (fetch Has No Upload Progress, So This Uses XMLHttpRequest)

import { Platform } from "react-native"
import i18n from "@/lib/i18n"
import { buildApiUrl, notifyUnauthorized } from "@/lib/api/client"
import { isApiEnvelope, isRecord } from "@/lib/api/guards"
import { getStoredString, removeStoredValue } from "@/lib/storage"
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
export const uploadWithProgress = async <T extends ApiEnvelope>(path:string, form_data:FormData, { onProgress, signal }:UploadOptions):Promise<ApiResult<T>> => {
    if(IS_MOCK_MODE) return simulateUpload<T>(onProgress, signal)

    const user_token:string|null = await getStoredString("user_token") // Gets The User Token

    return new Promise<ApiResult<T>>((resolve) => {
        const xhr:XMLHttpRequest = new XMLHttpRequest()

        const fail = (kind:"network"|"aborted"|"server"|"invalid_response"|"unauthorized", status:number|null, message?:string):void => {
            const fallback:string = kind === "aborted" ? i18n.t("Požiadavka bola zrušená.") : kind === "network" ? i18n.t("Nepodarilo sa pripojiť k serveru. Skontrolujte pripojenie k internetu.") : i18n.t("Na serveri došlo k chybe. Skúste to znova.")
            resolve({ ok: false, error: { kind, status, message: message || fallback } })
        }

        xhr.upload.onprogress = (event:ProgressEvent) => {
            if(event.lengthComputable && event.total > 0) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
        }

        xhr.onload = () => {
            let body:unknown = null

            try {
                body = JSON.parse(xhr.responseText)
            }

            catch {
                body = null
            }

            const message:string|undefined = isRecord(body) && typeof body.message === "string" ? body.message : undefined // Gets The Server Message

            if(xhr.status === 401) {
                removeStoredValue("user_token").then(notifyUnauthorized)
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
        let progress:number = 0

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
