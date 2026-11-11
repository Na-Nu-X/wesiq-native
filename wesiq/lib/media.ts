// Media URL Helpers (One Place For How Server Files Map To URLs)

import { DOMAIN } from "@/constants/general"

import type { UserSummary } from "@/types/models"

// Function For Get The Profile Picture URL (Null When The User Has No Picture)
export const getProfilePictureUrl = (user:Pick<UserSummary, "id"|"profile_picture_name">):string|null => {
    if(!user.profile_picture_name) return null
    return `${DOMAIN}/media/images/${user.id}/${encodeURIComponent(user.profile_picture_name)}`
}

// Function For Get The URL Of An Uploaded File (Post Media, Thumbnails)
export const getMediaUrl = (file_path:string|null|undefined):string|null => {
    if(!file_path) return null
    if(/^https?:\/\//.test(file_path)) return file_path

    return `${DOMAIN}/media/${file_path.replace(/^\/+/, "")}`
}

// Function For Get The URL Of A Static Exercise Image
export const getExerciseImageUrl = (image_filename:string|null|undefined):string|null => {
    if(!image_filename) return null
    return `${DOMAIN}/static/images/exercises/${encodeURIComponent(image_filename)}`
}

// Function For Get The Initials Of A User (Avatar Fallback)
export const getInitials = (user:{ first_name?:string|null, last_name?:string|null, username:string }):string => {
    const first:string = user.first_name?.trim().charAt(0) ?? "" // Gets The First Initial
    const last:string = user.last_name?.trim().charAt(0) ?? "" // Gets The Last Initial
    const initials:string = `${first}${last}`.toUpperCase() // Gets The Initials

    return initials || user.username.charAt(0).toUpperCase() || "?"
}
