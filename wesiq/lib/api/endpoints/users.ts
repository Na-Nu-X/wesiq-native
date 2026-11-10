// User Relationship Endpoints (Follow, Followers, Follow Requests)

import { apiPost } from "@/lib/api/client"

import type { ApiEnvelope, ApiResult } from "@/types/api"

// Follows / Unfollows / Sends Or Cancels A Follow Request (The Server Decides Which By The Current Relation)
export const toggleFollow = (user_to_follow_id:number):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("toggle-follow/", { user_to_follow_id })
}

// Removes A Follower From The Logged In User's Followers
export const removeFollower = (removed_follower_id:number):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("remove-follower/", { removed_follower_id })
}

export const approveFollowRequest = (follow_request_id:number):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("approve-follow-request/", { follow_request_id })
}

export const rejectFollowRequest = (follow_request_id:number):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("reject-follow-request/", { follow_request_id })
}

// ---------- Follow State ----------

export type FollowState = "not_following"|"following"|"requested"

export interface FollowRelationFlags {
    private_account?:boolean,
    has_follow?:boolean,
    has_pending_follow_request?:boolean
}

// Function For Get The Follow State Of A User
export const getFollowState = (user:FollowRelationFlags):FollowState => {
    if(user.has_follow) return "following"
    if(user.has_pending_follow_request) return "requested"
    return "not_following"
}

// Function For Get The Flags After A Successful toggle-follow (Mirrors The Server Logic)
export const getToggledFollowFlags = (user:FollowRelationFlags):Required<Pick<FollowRelationFlags, "has_follow"|"has_pending_follow_request">> => {
    const state:FollowState = getFollowState(user) // Gets The Current State

    if(state === "following" || state === "requested") return { has_follow: false, has_pending_follow_request: false }
    if(user.private_account) return { has_follow: false, has_pending_follow_request: true }
    return { has_follow: true, has_pending_follow_request: false }
}
