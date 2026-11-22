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

// Function For Send A Article To A Chat (Opens A Socket, Waits For The Server's Echo, Then Closes It)
export const shareArticleToChat = async (article_id:number, receiver_username:string, sender_id:number):Promise<ShareResult> => {
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
            socket.send(JSON.stringify({ action: "share_article", article_id }))
        }

        // The Server Echoes The New Message To Everyone In The Chat, Including The Sender
        socket.onmessage = (event:WebSocketMessageEvent) => {
            try {
                const data:unknown = JSON.parse(String(event.data)) // Parses The Message
                if(isRecord(data) && data.action === "new" && data.sender_id === sender_id && isRecord(data.article)) finish({ ok: true })
            }

            catch {
                // Ignores Messages That Aren't JSON
            }
        }

        socket.onerror = () => finish({ ok: false, message: i18n.t("Pri pokuse o spojenie došlo k chybe.") })
        socket.onclose = () => finish({ ok: false, message: i18n.t("Spojenie sa neočakávane prerušilo.") })
    })
}

// Function For Fit Waveform Samples (0 - 1) To An Exact Number Of Bars
export const fitWaveformToBars = (samples:readonly number[], target_bars:number):number[] => {
    if(!samples || samples.length === 0) return Array(target_bars).fill(0.2)
    if(samples.length === 1) return Array(target_bars).fill(samples[0])
    if(samples.length === target_bars) return [...samples]

    // Fewer Samples Than Bars (Interpolates Between Them)
    if(samples.length < target_bars) {
        const result:number[] = []
        const max_index:number = samples.length - 1

        for(let i:number = 0; i < target_bars; i++) {
            const exact_pos:number = (i / (target_bars - 1)) * max_index
            const low:number = Math.floor(exact_pos)
            const high:number = Math.ceil(exact_pos)
            const weight:number = exact_pos - low

            const interpolated:number = samples[low] * (1 - weight) + samples[high] * weight

            result.push(Number(interpolated.toFixed(3)))
        }

        return result
    }

    // More Samples Than Bars (Averages Them)
    const step:number = samples.length / target_bars
    const result:number[] = []

    for(let i:number = 0; i < target_bars; i++) {
        const start:number = Math.floor(i * step)
        const end:number = Math.floor((i + 1) * step)
        const slice:number[] = samples.slice(start, Math.max(start + 1, end))
        const avg:number = slice.reduce((sum, val) => sum + val, 0) / slice.length

        result.push(Number(avg.toFixed(3)))
    }

    return result
}
