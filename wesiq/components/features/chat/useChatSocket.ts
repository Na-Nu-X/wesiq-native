// Chat WebSocket: Connects, Reconnects With Backoff And Delivers Typed Events

import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, AppStateStatus } from "react-native"
import { ChatSocketTarget, getChatSocketKey, getChatSocketUrl } from "@/lib/chat"
import { getAccessToken } from "@/lib/api/session"
import { isRecord } from "@/lib/api/guards"
import { IS_MOCK_MODE } from "@/lib/api/mocks/install"

import type { ChatSocketEvent } from "@/types/models"

export type SocketStatus = "connecting"|"open"|"closed"

export type OutgoingChatAction =
    | { action:"new", message:string, reply_on?:number }
    | { action:"edit", chat_id:number, message:string }
    | { action:"delete", chat_id:number }
    | { action:"add_reaction", chat_id:number, emoji:string }
    | { action:"remove_reaction", chat_id:number, emoji:string }
    | { action:"mark_as_read" }
    | { action:"send_attachment", attachment_ids:number[], message:string|null, reply_on?:number }
    | { action:"send_voice_message", voice_message_id:number, message:string|null, reply_on?:number }

const MAX_RETRY_DELAY_MS:number = 15000 // Defines The Max Retry Delay MS

// Function For Check If Socket Event
const isSocketEvent = (value:unknown):value is ChatSocketEvent => isRecord(value) && typeof value.action === "string"

// Function For The Chat Socket Hook
export function useChatSocket(target:ChatSocketTarget|null, is_enabled:boolean, onEvent:(event:ChatSocketEvent) => void) {
    const [status, setStatus] = useState<SocketStatus>("connecting") // Stores The Status
    const socket = useRef<WebSocket|null>(null) // Stores The Socket
    const on_event = useRef(onEvent) // Always Calls The Latest Handler
    const retry_count = useRef<number>(0) // Stores The Retry Count
    const target_key:string|null = getChatSocketKey(target) // Reconnects Only When The Conversation Changes
    const target_reference = useRef<ChatSocketTarget|null>(target) // Stores The Target Reference

    // Initializes The Update Of The Handler Reference
    useEffect(() => {
        on_event.current = onEvent
        target_reference.current = target
    })

    // Initializes The Connection (Reconnects With Backoff, Reconnects When The App Returns To The Foreground)
    useEffect(() => {
        if(!target_key || !is_enabled || IS_MOCK_MODE) return

        let is_disposed:boolean = false // Checks If It Is Disposed
        let retry_timeout:ReturnType<typeof setTimeout>|null = null // Gets The Retry Timeout

        // Function For Connect
        const connect = async ():Promise<void> => {
            const token:string|null = await getAccessToken() // Gets The Token (Refreshed When It's About To Expire)
            const current_target:ChatSocketTarget|null = target_reference.current // Gets The Current Target
            if(!token || !current_target || is_disposed) return

            const ws:WebSocket = new WebSocket(getChatSocketUrl(current_target, token)) // Gets The WS
            socket.current = ws

            ws.onopen = () => {
                retry_count.current = 0
                setStatus("open") // Sets The Status
                ws.send(JSON.stringify({ action: "mark_as_read" }))
            }

            ws.onmessage = (event:{ data:unknown }) => {
                try {
                    const data:unknown = JSON.parse(String(event.data)) // Parses The Event
                    if(isSocketEvent(data)) on_event.current(data)
                }

                catch {
                    // Ignores Messages That Aren't JSON
                }
            }

            ws.onclose = () => {
                if(socket.current === ws) socket.current = null
                if(is_disposed) return

                setStatus("closed") // Sets The Status
                const delay:number = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** retry_count.current) // Waits Longer After Each Failure
                retry_count.current += 1
                retry_timeout = setTimeout(connect, delay)
            }

            ws.onerror = () => ws.close()
        }

        connect()

        // Gets The Subscription
        const subscription = AppState.addEventListener("change", (state:AppStateStatus) => {
            if(state === "active" && !socket.current) {
                if(retry_timeout) clearTimeout(retry_timeout)
                retry_count.current = 0
                connect()
            }
        })

        return () => {
            is_disposed = true
            if(retry_timeout) clearTimeout(retry_timeout)
            subscription.remove()
            socket.current?.close()
            socket.current = null
        }
    }, [target_key, is_enabled])

    // Function For Send An Action (Returns False When Not Connected)
    const send = useCallback((payload:OutgoingChatAction):boolean => {
        if(IS_MOCK_MODE) return true
        if(!socket.current || socket.current.readyState !== WebSocket.OPEN) return false

        socket.current.send(JSON.stringify(payload))
        return true
    }, [])

    return { status: IS_MOCK_MODE ? "open" as const : status, send }
}
