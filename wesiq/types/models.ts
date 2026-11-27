// Domain Models (Mirror The JSON Shapes Returned By The Django "native-api", Field Names Are Kept In snake_case)

// ---------- Shared ----------

export type ISODateString = string // ISO 8601 Date String From The Server

export type PostId = string // Posts Are Identified By Their Public ID (Not The Database ID)

export type ExerciseUnit = "reps"|"seconds"|"steps"

export type Day = 0|1|2|3|4|5|6 // Sunday = 0, Monday = 1, ..., Saturday = 6 (Same As JavaScript Date.getDay)

export type SubscriptionPlan = "free"|"basic"|"premium"

export type UserRole = "user"|"admin"|"developer"

export interface SubscriptionInfo {
    plan?:SubscriptionPlan,
    is_active:boolean
}

// ---------- Users ----------

// Smallest User Reference (Avatar + Username)
export interface UserSummary {
    id:number,
    username:string,
    profile_picture_name:string|null,
    subscription?:SubscriptionInfo|null
}

// User Reference With Names (Lists, Search, Tags)
export interface UserListItem extends UserSummary {
    first_name:string|null,
    last_name:string|null,
    private_account?:boolean,
    has_follow?:boolean,
    has_pending_follow_request?:boolean
}

export interface FollowRequest {
    id:number,
    from_user:UserListItem,
    status?:string,
    created_at:ISODateString
}

export interface LoggedInUser {
    id:number,
    first_name:string|null,
    last_name:string|null,
    username:string,
    role:UserRole,
    profile_picture_name:string|null,
    friend_code:string,
    saved_posts:PostId[], // Public IDs Of Saved Posts
    private_account:boolean,
    follow_requests:FollowRequest[]|null, // Null For Public Accounts
    followers_amount:number,
    subscription:SubscriptionInfo|null,
    data_saving_mode:boolean
}

export interface FollowerRelation {
    from_user:UserListItem,
    status:string,
    created_at:ISODateString
}

export interface MutualFollower {
    id:number,
    first_name?:string,
    last_name?:string,
    username:string,
    profile_picture_name:string,
    subscription?:SubscriptionInfo|null
}

export interface FollowingRelation {
    to_user:UserListItem,
    status:string,
    created_at:ISODateString
}

export interface BioLink {
    id:number,
    url:string
}

export interface Badge {
    title:string,
    data:string
}

export interface ProfilePostPreview {
    id:PostId,
    public_visibility?:boolean,
    allow_comments?:boolean,
    hide_likes?:boolean,
    created_at:ISODateString,
    media:PostMediaPreview[]
}

export interface Profile {
    id:number,
    first_name:string|null,
    last_name:string|null,
    username:string,
    email_address:string|null, // Only For The Logged In User's Own Profile
    phone_number:string|null, // Only For The Logged In User's Own Profile
    role:UserRole,
    profile_picture_name:string|null,
    creation_time:ISODateString,
    friend_code:string,
    bio:string|null,
    bio_links:BioLink[],
    xp:number,
    activity_streak:number,
    max_activity_streak:number,
    has_already_increased_activity_streak:boolean,
    private_account:boolean,
    data_saving_mode:boolean|null,
    followers:FollowerRelation[],
    following:FollowingRelation[],
    mutual_followers:MutualFollower[],
    mutual_followers_count:number,
    has_follow:boolean,
    has_pending_follow_request:boolean,
    posts:ProfilePostPreview[],
    saved_posts:ProfilePostPreview[]|null,
    unread_messages_amount:number|null,
    subscription:SubscriptionInfo|null,
    total_transactions_amount:number,
    level:number,
    years_since_registration:number,
    total_activities:number,
    total_received_likes:number,
    post_comments:unknown[], // The Server Currently Always Sends An Empty List
    badges:Badge[]
}

// ---------- Posts ----------

export interface PostMediaPreview {
    id:number,
    file:string|null,
    thumbnail:string|null,
    is_video:boolean,
    is_muted?:boolean
}

export interface PostMedia extends PostMediaPreview {
    is_muted:boolean,
    average_watch_time:number|null, // Only For The Author
    video_views:number|null, // Only For The Author
    video_duration?:number|null,
    sprite_sheet:string|null,
    vtt_file:string|null
}

export interface PostAuthor extends UserListItem {
    following:number[],
    followers:number[],
    private_account:boolean,
    has_follow:boolean,
    has_pending_follow_request:boolean
}

export interface TaggedUser {
    id:number,
    first_name:string|null,
    last_name:string|null,
    username:string
}

export interface Coordinates {
    latitude:string,
    longitude:string
}

export interface Post {
    id:PostId,
    user:PostAuthor,
    description:string|null,
    tagged_users:TaggedUser[],
    added_hashtags:string[],
    location:string|null,
    coordinates:Coordinates|null,
    public_visibility:boolean,
    allow_comments:boolean,
    hide_likes:boolean,
    likes:number,
    likes_from_users:number[],
    created_at:ISODateString,
    media:PostMedia[],
    views:number,
    comments_amount:number
}

export interface PostComment {
    id:number,
    user:UserListItem,
    comment:string,
    likes:number,
    likes_from_users:number[],
    creation_time:ISODateString,
    parent_id:number|null,
    reports_from_users?:number[],
    level:number
}

export interface ProcessingMedia {
    id:number,
    file:string|null,
    thumbnail:string|null,
    is_video:boolean,
    original_filename:string,
    original_size:number
}

export interface ProcessingPost extends Omit<Post, "media"|"likes"|"likes_from_users"|"views"|"comments_amount"> {
    media:ProcessingMedia[]
}

// Post Shared Into A Chat Message
export interface SharedPost {
    id:PostId,
    user:UserSummary,
    description:string|null,
    public_visibility:boolean,
    allow_comments:boolean,
    hide_likes:boolean,
    likes:number,
    comments:number,
    created_at:ISODateString,
    media:PostMediaPreview|null
}

// ---------- Chat ----------

export type AttachmentType = "image"|"video"|"audio"|"pdf"|"doc"|"excel"|"powerpoint"|"archive"|"text"|"file"

export interface Attachment {
    attachment_url:string,
    attachment_thumbnail:string|null,
    attachment_type:AttachmentType,
    original_filename:string,
    original_size:number,
    compressed_size:number
}

export interface VoiceMessage {
    id:number,
    file:string,
    duration:number,
    waveform:number[]
}

export interface MessageReaction {
    user:{ username:string },
    emoji:string
}

export type ChatMessageType = "text"|"post"|"article"|"voice"|"system"

export interface ChatMessage {
    id:number,
    room_id?:number|null, // Missing On Older Servers
    message_type?:ChatMessageType, // "text" When Missing (Older Servers)
    sender:UserSummary,
    content:string|null, // Null For A Shared Post Or Attachments Only
    attachments:Attachment[],
    post:SharedPost|null,
    voice_message:VoiceMessage|null,
    article:Article|null,
    is_read:boolean,
    is_edited:boolean,
    formatted_time:string,
    is_sender:boolean,
    message_reactions:MessageReaction[],
    is_older_than_15_minutes:boolean,
    is_older_than_1_day:boolean
}

export interface ChatReceiver extends UserListItem {
    private_account:boolean,
    has_follow:boolean,
    is_muted:boolean
}

// One Conversation In The Chat List
export interface ChatPreview {
    id:number,
    sender:UserSummary,
    content?:string|null // Null For A Shared Post, Missing In Unread Chats From Older Servers
}

// ---------- Chat Rooms (DMs And Group Chats) ----------

export type ChatRoomRole = "admin"|"member"

export interface ChatRoomMember extends UserSummary {
    first_name:string|null,
    last_name:string|null,
    role:ChatRoomRole
}

// Room Of A Conversation (Header, Group Info)
export interface ChatRoom {
    id:number,
    is_group:boolean,
    name:string|null,
    avatar:string|null, // Media Path Of The Group Photo
    created_by_id:number|null,
    my_role:ChatRoomRole|null,
    members_count:number,
    members:ChatRoomMember[]
}

// Last Message Shown In The Chat List
export interface ChatRoomLastMessage {
    id:number,
    message_type:ChatMessageType,
    content:string|null,
    has_attachments:boolean,
    is_sender:boolean,
    sender:{ id:number, username:string }|null,
    created_at:ISODateString
}

// One Row Of The Chat List (A DM Has "user", A Group Has "name")
export interface ChatListRoom {
    room_id:number,
    is_group:boolean,
    name:string|null,
    avatar:string|null,
    members_count:number,
    unread_count:number,
    updated_at:ISODateString,
    user:UserListItem|null,
    last_message:ChatRoomLastMessage|null
}

export type ChatSocketAction = "new"|"edit"|"delete"|"add_reaction"|"remove_reaction"|"new_message_notification"|"system"|"error"

export interface ChatSocketEvent {
    action:ChatSocketAction,
    chat_id:number,
    room_id?:number|null,
    is_group?:boolean, // Notification Events
    room_name?:string|null, // Notification Events
    message_type?:ChatMessageType,
    message_id?:number, // System Events
    added_users?:UserSummary[], // System Events
    removed_user_ids?:number[], // System Events (Members Removed By An Admin)
    avatar_changed?:boolean, // System Events (The Group Photo Changed, "avatar" Holds The New One)
    avatar?:string|null, // System Events
    message:string|null,
    attachments:Attachment[],
    post:SharedPost|null,
    voice_message:VoiceMessage|null,
    article:Article,
    formatted_time?:string,
    sender_id:number,
    sender_username?:string,
    sender_profile_picture_name:string|null,
    emoji?:string,
    emoji_sender_username?:string
}

// ---------- Training Plans (Workouts) ----------

// Exercise From The Exercise Library
export interface Exercise {
    id:number,
    exercise:string,
    unit:ExerciseUnit,
    categories:string[],
    requires_weight:boolean,
    image_filename:string|null
}

// One Row Of A Training Plan (The Server Stores Every Exercise As A Separate Row Grouped By "training_plan_key")
export interface TrainingPlanExercise {
    id:number,
    training_plan_key:string,
    day:Day|null,
    type:string|null, // Title Of The Training Plan (Same For Every Row Of One Plan)
    exercise:string,
    periods:number[], // Reps / Seconds / Steps For Each Set
    unit:ExerciseUnit,
    order:number,
    is_warm_up:boolean,
    is_custom_exercise:boolean
}

export interface OfficialTrainingPlanExercise {
    id:number,
    training_plan_key:string,
    type:string|null, // Title Of The Training Plan (Same For Every Row Of One Plan)
    exercise:string|null,
    periods:number[]|null, // Reps / Seconds / Steps For Each Set
    unit:ExerciseUnit|null,
    order:number|null,
    is_warm_up:boolean|null
    is_for_subscribers:boolean,
    duration:number|null,
    difficulty:number|null,
    requirements:string|null,
    description:string|null,
    goal:string|null,
    target_muscles:string[],
    is_locked:boolean
}

// Training Plan Grouped On The Client
export interface TrainingPlan {
    key:string,
    day:Day|null,
    exercises:TrainingPlanExercise[]
}

// ---------- Activity & Tasks ----------

export interface ActivitySummaryExercise {
    color:string,
    exercise:string,
    gained_xp:number,
    elapsed_time:number
}

export interface Activity {
    end_time:ISODateString,
    elapsed_time:number,
    gained_xp:number,
    type:string,
    training_plan_day:number,
    training_plan_summary:ActivitySummaryExercise[]
}

export interface OfficialTask {
    title:string,
    data:string,
    xp:number,
    progress_percentage:number,
    is_completed:boolean
}

export interface CustomTask {
    id:number,
    title:string,
    is_completed:boolean,
    order:number,
    created_at:ISODateString
}

// ---------- Blog ----------

export interface Article {
    id:number,
    title:string,
    description:string,
    image_name:string|null,
    image_version?:number|null, // Modification Time Of The Image (Busts The Image Cache When It's Replaced)
    html_filename:string|null,
    link:string,
    categories:string[],
    visitors:number,
    creation_time:ISODateString,
    average_rating:number|null, // Null Until Someone Rates It
    user?:{ username:string } // Only In The Article List (get-article/ Doesn't Send It)
}
