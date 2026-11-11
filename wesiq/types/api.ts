// API Types (Every "native-api" Response Is An Envelope With "success" And "message" Plus Endpoint Specific Fields)

export interface ApiEnvelope {
    success:boolean,
    message:string
}

export type ApiErrorKind =
    | "network" // No Connection / DNS / Request Failed Before A Response
    | "timeout" // The Request Took Longer Than The Timeout
    | "aborted" // The Request Was Cancelled By The Caller
    | "unauthorized" // 401 (The Token Was Cleared)
    | "server" // The Server Responded With "success: false" Or A Non 2xx Status
    | "invalid_response" // The Response Isn't Valid JSON Or Doesn't Match The Expected Shape

export interface ApiError {
    kind:ApiErrorKind,
    status:number|null,
    message:string // Server Message When Available, Otherwise A Translated Fallback
}

export type ApiResult<T> =
    | { ok:true, data:T, message:string, status:number }
    | { ok:false, error:ApiError }

export type HttpMethod = "GET"|"POST"|"PUT"|"PATCH"|"DELETE"

// Runtime Check Of The Response Payload
export type ResponseGuard<T> = (value:unknown) => value is T
