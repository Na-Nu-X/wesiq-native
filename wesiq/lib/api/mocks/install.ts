// Mock Mode (Development Builds Only): Intercepts fetch() Calls To The API And Answers With Mock Data

import { API_URL } from "@/constants/general"
import { setStoredString } from "@/lib/storage"
import { resolveMockRequest, MockResponse } from "./handlers"

const MOCK_LATENCY_MS:number = 350 // Simulates A Realistic Network Delay

// Mock Mode Is Never Enabled In Production Builds, Even If The Variable Is Set
export const IS_MOCK_MODE:boolean = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === "1"

let is_installed:boolean = false

// Function For Parse A JSON Request Body (FormData And Other Bodies Are Ignored)
const parseJsonBody = (body:RequestInit["body"]|undefined):Record<string, unknown> => {
    if(typeof body !== "string") return {}

    try {
        const parsed:unknown = JSON.parse(body) // Parses The Body
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
    }

    catch {
        return {}
    }
}

// Function For Install The Mock Fetch
export const installMockApi = ():void => {
    if(!IS_MOCK_MODE || is_installed) return
    is_installed = true

    const original_fetch:typeof fetch = globalThis.fetch.bind(globalThis) // Stores The Original Fetch

    globalThis.fetch = async (input:RequestInfo|URL, init?:RequestInit):Promise<Response> => {
        const url:string = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url // Gets The URL

        if(!url.startsWith(`${API_URL}/`)) return original_fetch(input, init) // Passes Through Non API Requests

        const method:string = init?.method ?? "GET" // Gets The Method
        const path_with_query:string = url.slice(API_URL.length + 1) // Gets The Path
        const mock_response:MockResponse = resolveMockRequest(method, path_with_query, parseJsonBody(init?.body)) // Resolves The Mock

        await new Promise<void>((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

        if(init?.signal?.aborted) throw new Error("Aborted")

        return new Response(JSON.stringify(mock_response.body), {
            status: mock_response.status,
            headers: { "Content-Type": "application/json" },
        })
    }

    setStoredString("user_token", "mock-access-token") // Stores A Token So Every Screen Behaves As Logged In

    console.info("[mock] Mock API is enabled (EXPO_PUBLIC_USE_MOCKS=1). Requests to the API return mock data.")
}
