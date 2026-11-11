// Chat Endpoints (Messages Themselves Go Through The WebSocket, See useChatSocket)

import { apiPost, apiRequest, apiGet } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isBoolean, isNumber, isRecord, isString } from "@/lib/api/guards"
import { toFormDataFile, UploadableFile } from "@/lib/api/upload"

import type { ApiEnvelope, ApiResult } from "@/types/api"
import type { ChatMessage, ChatReceiver } from "@/types/models"

const isMessage = (value:unknown):value is ChatMessage => {
    return isRecord(value) && isNumber(value.id) && isString(value.content) && typeof value.is_sender === "boolean" && Array.isArray(value.attachments)
}

export interface ChatPage extends ApiEnvelope {
    receiver:ChatReceiver,
    chats:ChatMessage[], // Newest First
    has_next:boolean
}

export const getChat = (username:string, page:number, signal?:AbortSignal):Promise<ApiResult<ChatPage>> => {
    return apiGet(`get-chat/${encodeURIComponent(username)}/`, {
        query: { page },
        signal,
        guard: envelopeWith<{ receiver:ChatReceiver, chats:ChatMessage[], has_next:boolean }>({
            receiver: (value:unknown):value is ChatReceiver => isRecord(value) && isNumber(value.id) && isString(value.username),
            chats: (value:unknown):value is ChatMessage[] => isArrayOf(value, isMessage),
            has_next: isBoolean,
        }),
    })
}

// ---------- Settings ----------

export const getChatSettings = (receiver_id:number):Promise<ApiResult<ApiEnvelope & { chat_settings:{ background_image:string|null }|null }>> => {
    return apiPost("get-chat-settings/", { receiver_id })
}

export const changeChatBackground = async (receiver_id:number, image:UploadableFile):Promise<ApiResult<ApiEnvelope>> => {
    const form_data:FormData = new FormData()
    form_data.append("receiver_id", String(receiver_id))
    form_data.append("selected_chat_background_image", await toFormDataFile(image) as Blob) // React Native Accepts { uri, name, type }

    return apiRequest("change-chat-background-image/", { method: "POST", form_data })
}

export const deleteChatBackground = (receiver_id:number, background_image:string) => apiPost("delete-chat-background-image/", { receiver_id, background_image })

// Toggles Muting (The Server Flips The Current State)
export const toggleMuteUser = (receiver_id:number) => apiPost("toggle-mute-user/", { receiver_id })

// ---------- Attachments ----------

export interface SentAttachment {
    attachment_id:number,
    attachment_url:string,
    attachment_thumbnail:string|null,
    attachment_type:string
}

// Uploads Files First; Their IDs Are Then Sent Through The Socket ("send_attachment")
export const uploadChatAttachments = async (files:UploadableFile[]):Promise<ApiResult<ApiEnvelope & { sent_attachments:SentAttachment[] }>> => {
    const form_data:FormData = new FormData()
    for(const file of files) form_data.append("selected_files", await toFormDataFile(file) as Blob)

    return apiRequest("send-chat-attachment/", {
        method: "POST",
        form_data,
        timeout_ms: 120000, // Videos Can Take A While
        guard: envelopeWith({ sent_attachments: (value:unknown):value is SentAttachment[] => isArrayOf(value, (item:unknown):item is SentAttachment => isRecord(item) && isNumber(item.attachment_id)) }),
    })
}
