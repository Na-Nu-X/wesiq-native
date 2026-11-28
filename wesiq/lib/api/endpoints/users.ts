// User Relationship Endpoints (Follow, Followers, Follow Requests)

import { apiPost } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isNumber, isRecord, isString } from "@/lib/api/guards"

import type { ApiEnvelope, ApiResult } from "@/types/api"
import type { PostId, UserListItem } from "@/types/models"

// ---------- Search ----------

export interface SearchedUser extends UserListItem {
    friend_code?:string|null,
    followers?:number // Followers Count
}

// Function For Check If Searched User
const isSearchedUser = (value:unknown):value is SearchedUser => isRecord(value) && isNumber(value.id) && isString(value.username)
const usersGuard = envelopeWith({ users: (value:unknown):value is SearchedUser[] => isArrayOf(value, isSearchedUser) }) // Defines The Users Guard

// Function For Load The Recently Opened Users (By Username, In Order) Filled Up With The Newest Users To 3
export const loadFirstUsers = (history:string[], signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { users:SearchedUser[] }>> => {
    return apiPost("load-first-users/", history, { signal, guard: usersGuard })
}

// Function For Search By Name, Username Or Friend Code
export const searchUsers = (searched_text:string, signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { users:SearchedUser[] }>> => {
    return apiPost("search-users/", { searched_text }, { signal, guard: usersGuard })
}

// Function For Follow / Unfollow / Send Or Cancel A Follow Request (The Server Decides Which By The Current Relation)
export const toggleFollow = (user_to_follow_id:number):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("toggle-follow/", { user_to_follow_id })
}

// Function For Remove A Follower From The Logged In User's Followers
export const removeFollower = (removed_follower_id:number):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("remove-follower/", { removed_follower_id })
}

// Function For Approve Follow Request
export const approveFollowRequest = (follow_request_id:number):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("approve-follow-request/", { follow_request_id })
}

// Function For Reject The Follow Request
export const rejectFollowRequest = (follow_request_id:number):Promise<ApiResult<ApiEnvelope>> => {
    return apiPost("reject-follow-request/", { follow_request_id })
}

// Function For Load The Users Who Liked A Post (With The Follow Flags Of The Logged In User)
const isLikingUser = (value:unknown):value is UserListItem => isRecord(value) && isNumber(value.id) && isString(value.username)
const likingUsersGuard = envelopeWith({ users: (value:unknown):value is UserListItem[] => isArrayOf(value, isLikingUser) }) // Defines The Liking Users Guard

// Function For Get The Users Who Liked Post
export const getUsersWhoLikedPost = (post_id:PostId, signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { users:UserListItem[] }>> => {
    return apiPost("get-users-who-liked-post/", { post_id }, { signal, guard: likingUsersGuard })
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
