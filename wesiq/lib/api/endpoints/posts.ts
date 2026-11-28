// Post And Comment Endpoints

import { apiGet, apiPost } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isBoolean, isNumber, isRecord, isString } from "@/lib/api/guards"

import type { ApiEnvelope, ApiResult } from "@/types/api"
import type { Post, PostComment, PostId, ProcessingPost } from "@/types/models"

// ---------- Guards (Check The Fields The UI Relies On) ----------

// Function For Check If Post
const isPost = (value:unknown):value is Post => {
    return isRecord(value) && isString(value.id) && isRecord(value.user) && isNumber(value.user.id) && isString(value.user.username) && Array.isArray(value.media) && isNumber(value.likes)
}

// Function For Check If Comment
const isComment = (value:unknown):value is PostComment => {
    return isRecord(value) && isNumber(value.id) && isString(value.comment) && isRecord(value.user) && isString(value.user.username) && isNumber(value.level)
}

// Function For Check If Processing Post
const isProcessingPost = (value:unknown):value is ProcessingPost => isRecord(value) && isString(value.id) && Array.isArray(value.media)

// ---------- Feed ----------

export interface PostsPage extends ApiEnvelope {
    posts:Post[],
    has_next:boolean
}

// Checks If It Is Posts Page
const isPostsPage = envelopeWith<{ posts:Post[], has_next:boolean }>({
    posts: (value:unknown):value is Post[] => isArrayOf(value, isPost),
    has_next: isBoolean,
})

// Function For Get The Posts
export const getPosts = (page:number, searched_text:string, signal?:AbortSignal):Promise<ApiResult<PostsPage>> => {
    return apiGet("get-posts/", { query: { page, searched_text }, signal, guard: isPostsPage })
}

// Function For Get The Post
export const getPost = (post_id:PostId, signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { post:Post }>> => {
    return apiGet(`get-post/${encodeURIComponent(post_id)}/`, { signal, guard: envelopeWith({ post: isPost }) })
}

// Function For Get The Processing Posts
export const getProcessingPosts = (signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { processing_posts:ProcessingPost[] }>> => {
    return apiGet("get-processing-posts/", { signal, guard: envelopeWith({ processing_posts: (value:unknown):value is ProcessingPost[] => isArrayOf(value, isProcessingPost) }) })
}

// ---------- Post Actions ----------

// Function For Toggle The Post Like
export const togglePostLike = (post_id:PostId) => apiPost("toggle-post-like/", { post_id })
// Function For Toggle The Post Save
export const togglePostSave = (post_id:PostId) => apiPost("toggle-post-save/", { post_id })
// Function For Delete The Post
export const deletePost = (post_id:PostId) => apiPost("delete-post/", { post_id })

export type ReportReason = "spam"|"harassment"|"hate_speech"|"misinformation"|"explicit_content"|"other"
export const REPORT_REASONS:readonly ReportReason[] = ["spam", "harassment", "hate_speech", "misinformation", "explicit_content", "other"] // Defines The Report Reasons

// Function For Report The Post
export const reportPost = (post_id:PostId, reason:ReportReason) => apiPost("report-post/", { post_id, reason })

// Only These Settings Are Sent (The Server Accepts Any Column Name, So The Client Must Not)
export type PostSetting = "public_visibility"|"allow_comments"|"hide_likes"

// Function For Edit The Post Setting
export const editPostSetting = (post_id:PostId, setting:PostSetting, value:boolean) => apiPost("edit-post-settings/", { post_id, setting, action: value })

// ---------- Comments ----------

export interface CommentsPage extends ApiEnvelope {
    visible_comments:PostComment[], // Root Comments Of The Page Plus Their Replies (Up To Level 5)
    has_next:boolean
}

// Function For Get The Post Comments
export const getPostComments = (post_id:PostId, page:number, signal?:AbortSignal):Promise<ApiResult<CommentsPage>> => {
    return apiGet("get-post-comments/", {
        query: { post_id, page },
        signal,
        guard: envelopeWith<{ visible_comments:PostComment[], has_next:boolean }>({ visible_comments: (value:unknown):value is PostComment[] => isArrayOf(value, isComment), has_next: isBoolean }),
    })
}

export interface AddedComment {
    id:number,
    user:{ id:number, username:string, profile_picture_name:string|null, subscription?:{ is_active:boolean }|null },
    creation_time:string,
    level:number
}

// Function For Add The Comment
export const addComment = (post_id:PostId, comment:string, parent_id:number|null):Promise<ApiResult<ApiEnvelope & { comment:AddedComment }>> => {
    return apiPost("add-comment/", { post_id, comment, parent_id }, {
        guard: envelopeWith({ comment: (value:unknown):value is AddedComment => isRecord(value) && isNumber(value.id) && isRecord(value.user) && isNumber(value.level) }),
    })
}

// Function For Toggle The Post Comment Like
export const togglePostCommentLike = (comment_id:number) => apiPost("toggle-post-comment-like/", { comment_id })
// Function For Report The Post Comment
export const reportPostComment = (comment_id:number, reason:ReportReason) => apiPost("report-post-comment/", { comment_id, reason })
// Function For Delete The Post Comment
export const deletePostComment = (comment_id:number) => apiPost("delete-post-comment/", { comment_id })

export type { ApiResult }
