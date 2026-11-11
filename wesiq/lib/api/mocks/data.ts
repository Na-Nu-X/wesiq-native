// Realistic Mock Data For Development Previews (Only Used When EXPO_PUBLIC_USE_MOCKS=1 In A Development Build)

import type {
    Activity,
    Article,
    ChatMessage,
    ChatPreview,
    ChatReceiver,
    CustomTask,
    Exercise,
    LoggedInUser,
    OfficialTask,
    OfficialTrainingPlanExercise,
    Post,
    PostComment,
    Profile,
    TrainingPlanExercise,
    UserListItem,
} from "@/types/models"

const now:number = Date.now() // Stores The Current Time
const hoursAgo = (hours:number):string => new Date(now - hours * 3600 * 1000).toISOString()
const daysAgo = (days:number):string => hoursAgo(days * 24)

// ---------- Users ----------

export const MOCK_USERS:UserListItem[] = [
    { id: 2, first_name: "Lucia", last_name: "Novak", username: "@lucia.lifts", profile_picture_name: null, private_account: false, subscription: { plan: "premium", is_active: true }, has_follow: true, has_pending_follow_request: false },
    { id: 3, first_name: "Martin", last_name: "Kral", username: "@martin_runs", profile_picture_name: null, private_account: false, subscription: null, has_follow: true, has_pending_follow_request: false },
    { id: 4, first_name: "Eva", last_name: "Horvath", username: "@eva.calisthenics", profile_picture_name: null, private_account: true, subscription: { plan: "basic", is_active: true }, has_follow: false, has_pending_follow_request: true },
    { id: 5, first_name: "Tomas", last_name: "Varga", username: "@tomas.v", profile_picture_name: null, private_account: false, subscription: null, has_follow: false, has_pending_follow_request: false },
    { id: 6, first_name: "Sofia", last_name: "Bianchi", username: "@sofia_mobility", profile_picture_name: null, private_account: false, subscription: null, has_follow: true, has_pending_follow_request: false },
    { id: 7, first_name: "Jakub", last_name: "Mraz", username: "@jakub.strength", profile_picture_name: null, private_account: false, subscription: { plan: "premium", is_active: true }, has_follow: false, has_pending_follow_request: false },
]

const [lucia, martin, eva, tomas, sofia, jakub] = MOCK_USERS as [UserListItem, UserListItem, UserListItem, UserListItem, UserListItem, UserListItem]

export const MOCK_LOGGED_IN_USER:LoggedInUser = {
    id: 1,
    first_name: "Alex",
    last_name: "Demo",
    username: "@alex.demo",
    role: "user",
    profile_picture_name: null,
    friend_code: "WSQ-4821",
    saved_posts: ["p3k9x2m1"],
    private_account: true,
    follow_requests: [
        { id: 31, from_user: eva, status: "pending", created_at: hoursAgo(5) },
        { id: 32, from_user: tomas, status: "pending", created_at: daysAgo(1) },
    ],
    followers_amount: 4,
    subscription: { plan: "premium", is_active: true },
    data_saving_mode: false,
}

// ---------- Posts ----------

const author = (user:UserListItem) => ({
    ...user,
    following: [1],
    followers: [1, 3],
    private_account: user.private_account ?? false,
    has_follow: user.has_follow ?? false,
    has_pending_follow_request: user.has_pending_follow_request ?? false,
})

const media = (id:number, is_video:boolean = false) => ({
    id,
    file: `mock/${id}.${is_video ? "mp4" : "jpg"}`,
    thumbnail: `mock/${id}_thumbnail.jpg`,
    is_video,
    is_muted: false,
    average_watch_time: null,
    video_views: null,
    video_duration: is_video ? 34 : null,
    sprite_sheet: null,
    vtt_file: null,
})

export const MOCK_POSTS:Post[] = [
    {
        id: "p3k9x2m1",
        user: author(lucia),
        description: "New deadlift PR today, 140 kg for a clean single 💪 Six months of consistent training finally paying off. #strength #deadlift",
        tagged_users: [],
        added_hashtags: ["strength", "deadlift"],
        location: "Bratislava, Slovakia",
        coordinates: { latitude: "48.1486", longitude: "17.1077" },
        public_visibility: true,
        allow_comments: true,
        hide_likes: false,
        likes: 128,
        likes_from_users: [3, 6],
        created_at: hoursAgo(2),
        media: [media(101), media(102)],
        views: 1840,
        comments_amount: 14,
    },
    {
        id: "q7n2v8c4",
        user: author(martin),
        description: "Sunday long run along the Danube. 21 km at an easy pace, legs feel fresh. Who's joining next week?",
        tagged_users: [{ id: 6, first_name: "Sofia", last_name: "Bianchi", username: "@sofia_mobility" }],
        added_hashtags: ["running"],
        location: "Danube Embankment",
        coordinates: null,
        public_visibility: true,
        allow_comments: true,
        hide_likes: false,
        likes: 64,
        likes_from_users: [1],
        created_at: hoursAgo(9),
        media: [media(103, true)],
        views: 920,
        comments_amount: 6,
    },
    {
        id: "r1b5t6z9",
        user: author(jakub),
        description: "Push day template I've been running for 8 weeks. Bench, overhead press, dips, lateral raises. Copy it from the activity page!",
        tagged_users: [],
        added_hashtags: ["pushday", "hypertrophy"],
        location: null,
        coordinates: null,
        public_visibility: true,
        allow_comments: false,
        hide_likes: true,
        likes: 210,
        likes_from_users: [],
        created_at: daysAgo(1),
        media: [media(104)],
        views: 3120,
        comments_amount: 0,
    },
    {
        id: "s8d3w4k7",
        user: author(sofia),
        description: "10 minute mobility flow before every session. Your hips will thank you.",
        tagged_users: [],
        added_hashtags: ["mobility"],
        location: null,
        coordinates: null,
        public_visibility: true,
        allow_comments: true,
        hide_likes: false,
        likes: 89,
        likes_from_users: [1, 2],
        created_at: daysAgo(3),
        media: [media(105, true), media(106)],
        views: 1410,
        comments_amount: 9,
    },
]

export const MOCK_COMMENTS:PostComment[] = [
    { id: 501, user: martin, comment: "Huge! Form looks super solid 🔥", likes: 4, likes_from_users: [1], creation_time: hoursAgo(1), parent_id: null, level: 1 },
    { id: 502, user: lucia, comment: "Thanks Martin! Next goal is 150.", likes: 2, likes_from_users: [], creation_time: hoursAgo(1), parent_id: 501, level: 2 },
    { id: 503, user: sofia, comment: "What does your warm up look like?", likes: 1, likes_from_users: [], creation_time: hoursAgo(0.5), parent_id: null, level: 1 },
]

// ---------- Profile ----------

export const MOCK_PROFILE:Profile = {
    id: MOCK_LOGGED_IN_USER.id,
    first_name: MOCK_LOGGED_IN_USER.first_name,
    last_name: MOCK_LOGGED_IN_USER.last_name,
    username: MOCK_LOGGED_IN_USER.username,
    email_address: "alex.demo@example.com",
    phone_number: null,
    role: "user",
    profile_picture_name: null,
    creation_time: daysAgo(420),
    friend_code: MOCK_LOGGED_IN_USER.friend_code,
    bio: "Hybrid athlete. Lifting 4x a week, running on weekends. Always learning.",
    bio_links: [{ id: 1, url: "https://example.com/alex" }],
    xp: 12840,
    activity_streak: 12,
    max_activity_streak: 31,
    has_already_increased_activity_streak: true,
    private_account: true,
    data_saving_mode: false,
    followers: [lucia, martin, sofia, jakub].map((user:UserListItem, index:number) => ({ from_user: user, status: "accepted", created_at: daysAgo(10 + index * 7) })),
    following: [lucia, martin, sofia].map((user:UserListItem, index:number) => ({ to_user: { ...user, has_follow: true }, status: "accepted", created_at: daysAgo(12 + index * 5) })),
    has_follow: false,
    has_pending_follow_request: false,
    posts: MOCK_POSTS.slice(0, 3).map((post:Post) => ({ id: post.id, public_visibility: post.public_visibility, allow_comments: post.allow_comments, hide_likes: post.hide_likes, created_at: post.created_at, media: post.media })),
    saved_posts: [],
    unread_messages_amount: 2,
    subscription: { plan: "premium", is_active: true },
    total_transactions_amount: 2,
    level: 14,
    years_since_registration: 1,
    total_activities: 186,
    total_received_likes: 1294,
    post_comments: [],
    badges: [
        { title: "streak", data: "31" },
        { title: "activities", data: "150" },
    ],
}

// ---------- Chat ----------

export const MOCK_CHAT_PREVIEWS:{ unread_chats:ChatPreview[], read_chats:ChatPreview[] } = {
    unread_chats: [
        { id: 901, sender: lucia, content: "Are we still on for leg day at 6?" },
        { id: 902, sender: jakub, content: "Sent you the push day template 👊" },
    ],
    read_chats: [
        { id: 903, sender: martin, content: "Great run today!" },
        { id: 904, sender: sofia, content: null },
    ],
}

export const MOCK_CHAT_RECEIVER:ChatReceiver = { ...lucia, private_account: false, has_follow: true, is_muted: false }

export const MOCK_CHAT_MESSAGES:ChatMessage[] = [
    { id: 1201, sender: lucia, content: "Are we still on for leg day at 6?", attachments: [], is_read: false, is_edited: false, formatted_time: "17:42", is_sender: false, message_reactions: [], is_older_than_15_minutes: true, is_older_than_1_day: false, post: null },
    { id: 1200, sender: { id: 1, username: "@alex.demo", profile_picture_name: null, subscription: { is_active: true } }, content: "Yes! I'll bring the bands for warm up.", attachments: [], is_read: true, is_edited: false, formatted_time: "17:30", is_sender: true, message_reactions: [{ user: { username: "@lucia.lifts" }, emoji: "👍" }], is_older_than_15_minutes: true, is_older_than_1_day: false, post: null },
    { id: 1199, sender: lucia, content: "Check out my new PR", attachments: [], is_read: true, is_edited: false, formatted_time: "15:02", is_sender: false, message_reactions: [], is_older_than_15_minutes: true, is_older_than_1_day: false, post: { id: "p3k9x2m1", user: lucia, description: MOCK_POSTS[0]?.description ?? null, public_visibility: true, allow_comments: true, hide_likes: false, likes: 128, comments: 14, created_at: hoursAgo(2), media: { id: 101, file: "mock/101.jpg", thumbnail: "mock/101_thumbnail.jpg", is_video: false } } },
]

// ---------- Training Plans ----------

export const MOCK_EXERCISES:Exercise[] = [
    { id: 1, exercise: "Push-ups", unit: "reps", categories: ["chest", "triceps"], requires_weight: false, image_filename: null },
    { id: 2, exercise: "Pull-ups", unit: "reps", categories: ["back", "biceps"], requires_weight: false, image_filename: null },
    { id: 3, exercise: "Squats", unit: "reps", categories: ["legs"], requires_weight: false, image_filename: null },
    { id: 4, exercise: "Plank", unit: "seconds", categories: ["core"], requires_weight: false, image_filename: null },
    { id: 5, exercise: "Bench press", unit: "reps", categories: ["chest"], requires_weight: true, image_filename: null },
    { id: 6, exercise: "Deadlift", unit: "reps", categories: ["back", "legs"], requires_weight: true, image_filename: null },
    { id: 7, exercise: "Lunges", unit: "reps", categories: ["legs"], requires_weight: false, image_filename: null },
    { id: 8, exercise: "Dips", unit: "reps", categories: ["chest", "triceps"], requires_weight: false, image_filename: null },
    { id: 9, exercise: "Mountain climbers", unit: "seconds", categories: ["core", "cardio"], requires_weight: false, image_filename: null },
    { id: 10, exercise: "Walking", unit: "steps", categories: ["cardio"], requires_weight: false, image_filename: null },
    { id: 11, exercise: "Overhead press", unit: "reps", categories: ["shoulders"], requires_weight: true, image_filename: null },
    { id: 12, exercise: "Hanging leg raises", unit: "reps", categories: ["core"], requires_weight: false, image_filename: null },
]

const planRow = (id:number, key:string, title:string, day:TrainingPlanExercise["day"], order:number, exercise:string, periods:number[], unit:TrainingPlanExercise["unit"] = "reps", is_warm_up:boolean = false):TrainingPlanExercise => ({
    id, training_plan_key: key, day, type: title, exercise, periods, unit, order, is_warm_up, is_custom_exercise: false,
})

export const MOCK_TRAINING_PLANS:TrainingPlanExercise[] = [
    planRow(1, "plan_upper", "Upper body", 1, 0, "Warm up", [300], "seconds", true),
    planRow(2, "plan_upper", "Upper body", 1, 1, "Push-ups", [15, 15, 12]),
    planRow(3, "plan_upper", "Upper body", 1, 2, "Pull-ups", [8, 8, 6]),
    planRow(4, "plan_upper", "Upper body", 1, 3, "Dips", [10, 10, 10]),
    planRow(5, "plan_lower", "Leg day", 3, 0, "Warm up", [240], "seconds", true),
    planRow(6, "plan_lower", "Leg day", 3, 1, "Squats", [20, 20, 15, 15]),
    planRow(7, "plan_lower", "Leg day", 3, 2, "Lunges", [12, 12, 12]),
    planRow(8, "plan_lower", "Leg day", 3, 3, "Plank", [60, 45], "seconds"),
    planRow(9, "plan_core", "Core finisher", null, 0, "Hanging leg raises", [12, 10]),
    planRow(10, "plan_core", "Core finisher", null, 1, "Mountain climbers", [45, 45], "seconds"),
]

export const MOCK_OFFICIAL_TRAINING_PLANS:OfficialTrainingPlanExercise[] = [
    { id: 101, training_plan_key: "official_beginner", type: "Beginner full body", exercise: "Warm up", periods: [300], unit: "seconds", order: 0, is_warm_up: true },
    { id: 102, training_plan_key: "official_beginner", type: "Beginner full body", exercise: "Squats", periods: [12, 12, 12], unit: "reps", order: 1, is_warm_up: false },
    { id: 103, training_plan_key: "official_beginner", type: "Beginner full body", exercise: "Push-ups", periods: [8, 8, 8], unit: "reps", order: 2, is_warm_up: false },
    { id: 104, training_plan_key: "official_beginner", type: "Beginner full body", exercise: "Plank", periods: [30, 30], unit: "seconds", order: 3, is_warm_up: false },
    { id: 111, training_plan_key: "official_push", type: "Push day", exercise: "Bench press", periods: [8, 8, 6, 6], unit: "reps", order: 0, is_warm_up: false },
    { id: 112, training_plan_key: "official_push", type: "Push day", exercise: "Overhead press", periods: [10, 8, 8], unit: "reps", order: 1, is_warm_up: false },
    { id: 113, training_plan_key: "official_push", type: "Push day", exercise: "Dips", periods: [12, 10, 10], unit: "reps", order: 2, is_warm_up: false },
]

// ---------- Activity & Tasks ----------

export const MOCK_ACTIVITY_HISTORY:Activity[] = [
    { end_time: hoursAgo(20), elapsed_time: 2780, gained_xp: 340, type: "Upper body", training_plan_day: 1, training_plan_summary: [{ color: "#5b8cff", exercise: "Push-ups", gained_xp: 120, elapsed_time: 900 }, { color: "#3dd68c", exercise: "Pull-ups", gained_xp: 140, elapsed_time: 1100 }, { color: "#f0c14a", exercise: "Dips", gained_xp: 80, elapsed_time: 780 }] },
    { end_time: daysAgo(3), elapsed_time: 3310, gained_xp: 410, type: "Leg day", training_plan_day: 3, training_plan_summary: [{ color: "#5b8cff", exercise: "Squats", gained_xp: 220, elapsed_time: 1700 }, { color: "#ff5c6a", exercise: "Lunges", gained_xp: 190, elapsed_time: 1610 }] },
]

export const MOCK_OFFICIAL_TASKS:OfficialTask[] = [ // "title" Is Server Text, The App Shows Its Own Label By "data"
    { title: "Pridaj vlastnú úlohu.", data: "add_custom_task", xp: 20, progress_percentage: 100, is_completed: true },
    { title: "Zaznamenaj 30 minút aktivity.", data: "30_minutes_activity", xp: 50, progress_percentage: 0, is_completed: false },
    { title: "Zaznamenaj 2 aktivity.", data: "2_activities", xp: 60, progress_percentage: 50, is_completed: false },
    { title: "Získaj 50 XP za aktivitu.", data: "50_xp_activity", xp: 80, progress_percentage: 0, is_completed: false },
]

export const MOCK_CUSTOM_TASKS:CustomTask[] = [
    { id: 1, title: "Drink 3 liters of water", is_completed: true, order: 0, created_at: hoursAgo(8) },
    { id: 2, title: "Stretch for 10 minutes", is_completed: false, order: 1, created_at: hoursAgo(8) },
    { id: 3, title: "Sleep before 23:00", is_completed: false, order: 2, created_at: hoursAgo(8) },
    { id: 4, title: "10 minutes of mobility", is_completed: false, order: 3, created_at: hoursAgo(6) },
    { id: 5, title: "Take creatine", is_completed: true, order: 4, created_at: hoursAgo(5) },
    { id: 6, title: "Walk 8 000 steps", is_completed: false, order: 5, created_at: hoursAgo(3) },
]

// ---------- Blog ----------

export const MOCK_ARTICLES:Article[] = [
    { id: 1, title: "Front lever: a complete progression guide", description: "From tuck holds to the full lever, a structured plan with the exact progressions and volume to use.", image_name: null, html_filename: "front_lever.html", link: "front-lever", categories: ["calisthenics", "strength"], visitors: 4210, creation_time: daysAgo(40), average_rating: 4.7, user: { username: "@wesiq" } },
    { id: 2, title: "How to warm up properly", description: "Why five minutes of the right warm up beats twenty minutes of the wrong one.", image_name: null, html_filename: null, link: "warm-up", categories: ["mobility"], visitors: 2980, creation_time: daysAgo(18), average_rating: null, user: { username: "@wesiq" } },
    { id: 3, title: "Sleep and recovery for lifters", description: "What the research says about sleep, muscle growth and performance.", image_name: null, html_filename: null, link: "sleep-recovery", categories: ["recovery"], visitors: 1630, creation_time: daysAgo(7), average_rating: 4.9, user: { username: "@wesiq" } },
]
