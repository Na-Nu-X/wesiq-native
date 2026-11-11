// Chat Helpers

import { DOMAIN } from "@/constants/general"
import i18n from "@/lib/i18n"
import { getStoredString } from "@/lib/storage"
import { isRecord } from "@/lib/api/guards"
import { IS_MOCK_MODE } from "@/lib/api/mocks/install"

import type { PostId } from "@/types/models"

const SHARE_TIMEOUT_MS:number = 10000 // Gives Up When The Server Doesn't Confirm In Time

// Function For Get The WebSocket URL Of A Chat
export const getChatSocketUrl = (receiver_username:string, user_token:string):string => {
    const protocol:"wss"|"ws" = DOMAIN.startsWith("https") ? "wss" : "ws" // Gets The Protocol
    const host:string = DOMAIN.replace(/^https?:\/\//, "") // Gets The Host
    return `${protocol}://${host}/ws/chat/${encodeURIComponent(receiver_username)}/?token=${encodeURIComponent(user_token)}`
}

export type ShareResult = { ok:true } | { ok:false, message:string }

// Function For Send A Post To A Chat (Opens A Socket, Waits For The Server's Echo, Then Closes It)
export const sharePostToChat = async (post_id:PostId, receiver_username:string, sender_id:number):Promise<ShareResult> => {
    if(IS_MOCK_MODE) {
        await new Promise<void>((resolve) => setTimeout(resolve, 600))
        return { ok: true }
    }

    const user_token:string|null = await getStoredString("user_token") // Gets The User Token
    if(!user_token) return { ok: false, message: i18n.t("Príspevok nie je možné zdielať bez prihlásenia.") }

    return new Promise<ShareResult>((resolve) => {
        let is_settled:boolean = false
        const socket:WebSocket = new WebSocket(getChatSocketUrl(receiver_username, user_token))

        // Function For Finish Once
        const finish = (result:ShareResult):void => {
            if(is_settled) return
            is_settled = true
            clearTimeout(timeout)
            socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null

            if(socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close()
            resolve(result)
        }

        const timeout:ReturnType<typeof setTimeout> = setTimeout(() => finish({ ok: false, message: i18n.t("Server neodpovedal včas. Skúste to znova.") }), SHARE_TIMEOUT_MS)

        socket.onopen = () => {
            socket.send(JSON.stringify({ action: "share_post", post_id }))
        }

        // The Server Echoes The New Message To Everyone In The Chat, Including The Sender
        socket.onmessage = (event:WebSocketMessageEvent) => {
            try {
                const data:unknown = JSON.parse(String(event.data)) // Parses The Message
                if(isRecord(data) && data.action === "new" && data.sender_id === sender_id && isRecord(data.post)) finish({ ok: true })
            }

            catch {
                // Ignores Messages That Aren't JSON
            }
        }

        socket.onerror = () => finish({ ok: false, message: i18n.t("Pri pokuse o spojenie došlo k chybe.") })
        socket.onclose = () => finish({ ok: false, message: i18n.t("Spojenie sa neočakávane prerušilo.") })
    })
}
