// Profile Endpoints

import { apiGet, apiPost } from "@/lib/api/client"
import { isApiEnvelope, isRecord } from "@/lib/api/guards"

import type { ApiEnvelope, ApiResult } from "@/types/api"
import type { Profile } from "@/types/models"
import type { ReportReason } from "./posts"

export interface ProfileResponse extends ApiEnvelope {
    is_found:boolean,
    user?:Profile // Missing When The User Doesn't Exist
}

// Function For Check If Profile Response
const isProfileResponse = (value:unknown):value is ProfileResponse => {
    if(!isApiEnvelope(value) || !isRecord(value) || typeof value.is_found !== "boolean") return false
    if(!value.is_found) return true

    const user:unknown = value.user // Gets The User
    return isRecord(user) && typeof user.id === "number" && typeof user.username === "string" && Array.isArray(user.followers) && Array.isArray(user.following) && Array.isArray(user.posts)
}

// Function For Get The Profile
export const getProfile = (username:string, signal?:AbortSignal):Promise<ApiResult<ProfileResponse>> => {
    return apiGet(`get-profile/${encodeURIComponent(username)}/`, { signal, guard: isProfileResponse })
}

// Function For Report The User
export const reportUser = (reported_user_id:number, reason:ReportReason) => apiPost("report-user/", { reported_user_id, reason })

// Admins And Developers Only (The Server Checks The Role)
// Function For Suspend User
export const suspendUser = (user_id:number) => apiPost("suspend-user/", { user_id })
