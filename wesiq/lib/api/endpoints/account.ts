// Account Endpoints (edit-account Handles Profile Edits, Privacy Settings And Account Deletion)

import { apiRequest } from "@/lib/api/client"
import { toFormDataFile, UploadableFile } from "@/lib/api/upload"

import type { ApiEnvelope, ApiResult } from "@/types/api"

export interface AccountChanges {
    first_name:string,
    last_name:string,
    bio:string,
    bio_links:string[], // The Server Expects Plain URL Strings
    email_address:string,
    phone_number:string,
    private_account:boolean,
    data_saving_mode:boolean,
    new_profile_picture:UploadableFile|null,
    delete_profile_picture:boolean
}

const toFlag = (value:boolean):string => value ? "True" : "False"

// Function For Save Account Changes (The Server Applies Profile Details At Most Once Every 7 Days)
export const saveAccount = async (changes:AccountChanges):Promise<ApiResult<ApiEnvelope>> => {
    const form_data:FormData = new FormData()

    form_data.append("delete_account", toFlag(false))
    form_data.append("delete_profile_picture", toFlag(changes.delete_profile_picture))
    form_data.append("data_saving_mode", toFlag(changes.data_saving_mode))
    form_data.append("private_account", toFlag(changes.private_account))
    form_data.append("bio", changes.bio)
    form_data.append("bio_links", JSON.stringify(changes.bio_links))
    form_data.append("first_name", changes.first_name)
    form_data.append("last_name", changes.last_name)
    form_data.append("email_address", changes.email_address)
    form_data.append("phone_number", changes.phone_number)

    // React Native's FormData Accepts { uri, name, type } Objects, Which TypeScript's DOM Types Don't Know
    if(changes.new_profile_picture) form_data.append("selected_profile_picture", await toFormDataFile(changes.new_profile_picture) as Blob)

    return apiRequest("edit-account/", { method: "POST", form_data })
}

// Function For Request Account Deletion (The Server Suspends The Account, Logging In Within 30 Days Restores It)
export const requestAccountDeletion = ():Promise<ApiResult<ApiEnvelope>> => {
    const form_data:FormData = new FormData()
    form_data.append("delete_account", toFlag(true))

    return apiRequest("edit-account/", { method: "POST", form_data })
}
