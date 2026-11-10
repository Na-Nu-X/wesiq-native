// Upload Limits Per Subscription Plan (Same As The Server In upload_post)

import type { SubscriptionPlan } from "@/types/models"

export const MAX_MEDIA_COUNT:number = 5
export const MAX_CAPTION_LENGTH:number = 500
export const MIN_VIDEO_SECONDS:number = 1

export interface MediaLimits {
    max_image_bytes:number,
    max_video_bytes:number,
    max_video_seconds:number
}

export const getMediaLimits = (plan:SubscriptionPlan):MediaLimits => ({
    max_image_bytes: plan === "free" ? 2_000_000 : 10_000_000,
    max_video_bytes: plan === "free" ? 25_000_000 : plan === "basic" ? 50_000_000 : 100_000_000,
    max_video_seconds: plan === "free" ? 60 : plan === "basic" ? 120 : 180,
})

// Selected Media Item In The Upload Flow
export interface DraftMedia {
    key:string, // Stable Key For Lists (Picker Asset IDs Can Be Missing On Web)
    uri:string,
    type:"image"|"video",
    file_name:string,
    mime_type:string,
    file_size:number|null,
    duration_seconds:number|null, // The Picker Reports Milliseconds, Converted When Picked
    width:number,
    height:number,
    web_file:File|null,
    is_muted:boolean,
    cover:{ uri:string, file_name:string, mime_type:string, web_file:File|null }|null // Custom Video Cover
}

export type MediaIssue =
    | { kind:"image_too_large", limit_bytes:number }
    | { kind:"video_too_large", limit_bytes:number }
    | { kind:"video_too_long", limit_seconds:number }
    | { kind:"video_too_short" }

// Function For Validate One Media Item (Null When It Can Be Uploaded)
export const getMediaIssue = (media:DraftMedia, limits:MediaLimits):MediaIssue|null => {
    if(media.type === "image") {
        if(media.file_size !== null && media.file_size > limits.max_image_bytes) return { kind: "image_too_large", limit_bytes: limits.max_image_bytes }
        return null
    }

    if(media.file_size !== null && media.file_size > limits.max_video_bytes) return { kind: "video_too_large", limit_bytes: limits.max_video_bytes }
    if(media.duration_seconds !== null && media.duration_seconds > limits.max_video_seconds) return { kind: "video_too_long", limit_seconds: limits.max_video_seconds }
    if(media.duration_seconds !== null && media.duration_seconds < MIN_VIDEO_SECONDS) return { kind: "video_too_short" }
    return null
}

export { formatDuration, formatMegabytes } from "@/lib/format"
