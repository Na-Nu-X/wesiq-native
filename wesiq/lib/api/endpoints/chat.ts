// Chat Endpoints (Messages Themselves Go Through The WebSocket, See useChatSocket)

import { apiPost, apiRequest, apiGet } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isBoolean, isNumber, isRecord, isString } from "@/lib/api/guards"
import { toFormDataFile, UploadableFile } from "@/lib/api/upload"

import type { ApiEnvelope, ApiResult } from "@/types/api"
import type { ChatListRoom, ChatMessage, ChatReceiver, ChatRoom, SharedPost } from "@/types/models"

// Function For Get The Shared Post Of A Message (The Server Sends An Empty Object "{}" When No Post Is Shared)
export const toSharedPost = (value:unknown):SharedPost|null => {
    return isRecord(value) && isString(value.id) && isRecord(value.user) && isString(value.user.username) ? value as unknown as SharedPost : null
}

// Function For Check If Message
const isMessage = (value:unknown):value is ChatMessage => {
    return isRecord(value) && isNumber(value.id) && (isString(value.content) || value.content === null) && typeof value.is_sender === "boolean" && Array.isArray(value.attachments)
}

export interface ChatPage extends ApiEnvelope {
    receiver:ChatReceiver,
    chats:ChatMessage[], // Newest First
    has_next:boolean,
    room_id?:number|null // The DM Room (Missing On Older Servers, Then The Socket Connects By Username)
}

// Function For Get The Chat
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

// ---------- Rooms (DMs And Group Chats) ----------

// Function For Check If Chat Room
const isChatRoom = (value:unknown):value is ChatRoom => isRecord(value) && isNumber(value.id) && isBoolean(value.is_group) && isNumber(value.members_count) && isArrayOf(value.members, (member:unknown):member is Record<string, unknown> => isRecord(member) && isNumber(member.id) && isString(member.username))

// Function For Check If Chat List Room
export const isChatListRoom = (value:unknown):value is ChatListRoom => isRecord(value) && isNumber(value.room_id) && isBoolean(value.is_group) && isNumber(value.unread_count) && isString(value.updated_at) && (value.user === null || (isRecord(value.user) && isString(value.user.username)))

export interface ChatRoomPage extends ApiEnvelope {
    room:ChatRoom,
    chats:ChatMessage[], // Newest First
    has_next:boolean
}

// Function For Load One Page Of A Room's Messages (Members Only)
export const getChatRoom = (room_id:number, page:number, signal?:AbortSignal):Promise<ApiResult<ChatRoomPage>> => {
    return apiGet(`get-chat-room/${room_id}/`, {
        query: { page },
        signal,
        guard: envelopeWith<{ room:ChatRoom, chats:ChatMessage[], has_next:boolean }>({
            room: isChatRoom,
            chats: (value:unknown):value is ChatMessage[] => isArrayOf(value, isMessage),
            has_next: isBoolean,
        }),
    })
}

export interface ChangedRoomResponse extends ApiEnvelope {
    room:ChatRoom,
    system_message:ChatMessage // "Group Created" / "Members Added" Message
}

const changedRoomGuard = envelopeWith<{ room:ChatRoom, system_message:ChatMessage }>({ room: isChatRoom, system_message: isMessage }) // Defines The Changed Room Guard

// Function For Create A Group Chat (The Logged In User Becomes Its Admin)
export const createGroupChat = (name:string, member_ids:number[]):Promise<ApiResult<ChangedRoomResponse>> => {
    return apiPost("create-group-chat/", { name, member_ids }, { guard: changedRoomGuard })
}

// Function For Add People To A Group Chat (Any Member Can Add)
export const addChatRoomMembers = (room_id:number, user_ids:number[]):Promise<ApiResult<ChangedRoomResponse>> => {
    return apiPost("add-chat-room-members/", { room_id, user_ids }, { guard: changedRoomGuard })
}

// Function For Remove A Member From A Group Chat (Admins Only)
export const removeChatRoomMember = (room_id:number, user_id:number):Promise<ApiResult<ChangedRoomResponse>> => {
    return apiPost("remove-chat-room-member/", { room_id, user_id }, { guard: changedRoomGuard })
}

// Function For Set The Group Photo, Or Remove It When No Image Is Given (Admins Only; The Server Resizes It)
export const changeChatRoomAvatar = async (room_id:number, image:UploadableFile|null):Promise<ApiResult<ChangedRoomResponse>> => {
    const form_data:FormData = new FormData() // Gets The Form Data
    form_data.append("room_id", String(room_id))

    if(image) form_data.append("avatar", await toFormDataFile(image) as Blob) // React Native Accepts { uri, name, type }
    else form_data.append("remove", "true")

    return apiRequest("change-chat-room-avatar/", { method: "POST", form_data, timeout_ms: 60000, guard: changedRoomGuard })
}

// ---------- Settings ----------

// Function For Get The Chat Settings
export const getChatSettings = (receiver_id:number):Promise<ApiResult<ApiEnvelope & { chat_settings:{ background_image:string|null }|null }>> => {
    return apiPost("get-chat-settings/", { receiver_id })
}

// Function For Change The Chat Background
export const changeChatBackground = async (receiver_id:number, image:UploadableFile):Promise<ApiResult<ApiEnvelope>> => {
    const form_data:FormData = new FormData() // Gets The Form Data
    form_data.append("receiver_id", String(receiver_id))
    form_data.append("selected_chat_background_image", await toFormDataFile(image) as Blob) // React Native Accepts { uri, name, type }

    return apiRequest("change-chat-background-image/", { method: "POST", form_data })
}

// Function For Delete The Chat Background
export const deleteChatBackground = (receiver_id:number, background_image:string) => apiPost("delete-chat-background-image/", { receiver_id, background_image })

// Function For Toggle Muting (The Server Flips The Current State)
export const toggleMuteUser = (receiver_id:number) => apiPost("toggle-mute-user/", { receiver_id })

// ---------- Attachments ----------

export interface SentAttachment {
    attachment_id:number,
    attachment_url:string,
    attachment_thumbnail:string|null,
    attachment_type:string
}

// Function For Upload Files First; Their IDs Are Then Sent Through The Socket ("send_attachment")
export const uploadChatAttachments = async (files:UploadableFile[]):Promise<ApiResult<ApiEnvelope & { sent_attachments:SentAttachment[] }>> => {
    const form_data:FormData = new FormData() // Gets The Form Data
    for(const file of files) form_data.append("selected_files", await toFormDataFile(file) as Blob)

    return apiRequest("send-chat-attachment/", {
        method: "POST",
        form_data,
        timeout_ms: 120000, // Videos Can Take A While
        guard: envelopeWith({ sent_attachments: (value:unknown):value is SentAttachment[] => isArrayOf(value, (item:unknown):item is SentAttachment => isRecord(item) && isNumber(item.attachment_id)) }),
    })
}

export interface SentVoiceMessage {
    voice_message_id:number,
    voice_message_url:string,
    duration:number,
    waveform:number[]
}

export interface SendVoiceMessagePayload {
    file:UploadableFile,
    duration:number,
    waveform:number[]
}

// Function For Send The Voice Message
export const sendVoiceMessage = async ({ file, duration, waveform }:SendVoiceMessagePayload):Promise<ApiResult<ApiEnvelope & { sent_voice_message:SentVoiceMessage }>> => {
    const form_data:FormData = new FormData() // Creates The Form Data

    form_data.append("voice_message_file", await toFormDataFile(file) as Blob) // Appends The Voice Message File To The Form Data
    form_data.append("voice_message_duration", String(Math.round(duration))) // Appends Duration To The Form Data
    form_data.append("voice_message_waveform", JSON.stringify(waveform)) // Appends Waveform To The Form Data

    return apiRequest("send-voice-message/", {
        method: "POST",
        form_data,
        timeout_ms: 15000,

        guard: envelopeWith({
            sent_voice_message:(value:unknown):value is SentVoiceMessage =>
                isRecord(value) &&
                isNumber(value.voice_message_id) &&
                typeof value.voice_message_url === "string" &&
                isNumber(value.duration) &&
                Array.isArray(value.waveform)
        })
    })
}