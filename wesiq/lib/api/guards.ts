// Runtime Type Guards For Server Data (The Server Is Never Trusted Blindly)

import type { ApiEnvelope } from "@/types/api"

// Function For Check If Record
export const isRecord = (value:unknown):value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Function For Check If String
export const isString = (value:unknown):value is string => typeof value === "string"

// Function For Check If Number
export const isNumber = (value:unknown):value is number => typeof value === "number" && Number.isFinite(value)

// Function For Check If Boolean
export const isBoolean = (value:unknown):value is boolean => typeof value === "boolean"

// Function For Check If Nullable String
export const isNullableString = (value:unknown):value is string|null => value === null || typeof value === "string"

// Function For Check If Array Of
export const isArrayOf = <T,>(value:unknown, item_guard:(item:unknown) => item is T):value is T[] => {
    return Array.isArray(value) && value.every(item_guard)
}

// Function For Check The Common "success" + "message" Envelope
export const isApiEnvelope = (value:unknown):value is ApiEnvelope => {
    return isRecord(value) && isBoolean(value.success) && (value.message === undefined || isString(value.message))
}

// Function For Create A Guard For An Envelope That Must Contain The Given Keys Checked By Their Guards
export const envelopeWith = <T extends Record<string, unknown>>(
    field_guards:{ [K in keyof T]:(value:unknown) => value is T[K] }
) => {
    return (value:unknown):value is ApiEnvelope & T => {
        if(!isApiEnvelope(value) || !isRecord(value)) return false

        return (Object.keys(field_guards) as (keyof T)[]).every((key) => {
            const guard = field_guards[key] // Gets The Guard Of The Field
            return guard((value as Record<keyof T, unknown>)[key])
        })
    }
}

// ---------- Model Guards (Check The Fields The UI Relies On) ----------

// Function For Check If ID
export const hasId = (value:unknown):value is { id:number } => isRecord(value) && isNumber(value.id)

// Function For Check If User Summary Like
export const isUserSummaryLike = (value:unknown):value is { id:number, username:string } => {
    return isRecord(value) && isNumber(value.id) && isString(value.username)
}
