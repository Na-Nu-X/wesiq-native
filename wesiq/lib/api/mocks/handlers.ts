// Mock Request Handlers (Map "native-api" Paths To Mock Responses)

import {
    MOCK_ACTIVITY_HISTORY,
    MOCK_ARTICLES,
    MOCK_CHAT_MESSAGES,
    MOCK_CHAT_PREVIEWS,
    MOCK_CHAT_RECEIVER,
    MOCK_COMMENTS,
    MOCK_CUSTOM_TASKS,
    MOCK_EXERCISES,
    MOCK_LOGGED_IN_USER,
    MOCK_OFFICIAL_TASKS,
    MOCK_OFFICIAL_TRAINING_PLANS,
    MOCK_POSTS,
    MOCK_PROFILE,
    MOCK_TRAINING_PLANS,
    MOCK_USERS,
} from "./data"

import type { Post, TrainingPlanExercise, UserListItem } from "@/types/models"

export interface MockResponse {
    status:number,
    body:Record<string, unknown>
}

interface MockRequest {
    method:string,
    path:string, // Path Without The API Prefix, E.g. "get-profile/alex.demo/"
    params:string[], // Dynamic Path Segments
    query:Record<string, string>,
    body:Record<string, unknown>, // Parsed JSON Object Body (Empty For GET, Arrays Or Non JSON Bodies)
    raw_body:unknown // Parsed JSON Body Of Any Shape
}

type MockHandler = (request:MockRequest) => MockResponse

const ok = (fields:Record<string, unknown> = {}, status:number = 200):MockResponse => ({
    status,
    body: { success: true, message: "OK (mock)", ...fields },
})

const notFound = (message:string):MockResponse => ({ status: 404, body: { success: false, message } })

// Routes (":param" Matches One Path Segment)
const routes:{ method:string, pattern:string, handler:MockHandler }[] = [
    { method: "POST", pattern: "login/", handler: () => ok({ access: "mock-access-token", refresh: "mock-refresh-token" }) },
    { method: "POST", pattern: "get-password-reset-code/", handler: () => ok({ message: "Overovací kód bol odoslaný na váš e-mail. (mock)" }) },

    {
        method: "POST",
        pattern: "password-reset/",
        handler: ({ body }) => body.password_reset_code === "123456" ? ok({ message: "Heslo bolo úspešne zmenené. (mock)" }) : { status: 400, body: { success: false, message: "Overovací kód sa nezhoduje. (mock: 123456)" } },
    },

    { method: "GET", pattern: "get-logged-in-user/", handler: () => ok({ logged_in_user: MOCK_LOGGED_IN_USER }) },

    {
        method: "POST",
        pattern: "load-first-users/",
        handler: ({ raw_body }) => {
            const history:string[] = Array.isArray(raw_body) ? raw_body.filter((item):item is string => typeof item === "string") : [] // Gets The History
            const from_history:UserListItem[] = history.map((username:string) => MOCK_USERS.find((user:UserListItem) => user.username === username)).filter((user):user is UserListItem => Boolean(user))
            const newest:UserListItem[] = [...MOCK_USERS].reverse().filter((user:UserListItem) => !from_history.includes(user)).slice(0, Math.max(0, 3 - from_history.length))
            return ok({ users: [...from_history, ...newest].map(withFollowers) })
        }
    },

    {
        method: "POST",
        pattern: "search-users/",
        handler: ({ body }) => {
            const searched_text:string = (typeof body.searched_text === "string" ? body.searched_text : "").toLowerCase() // Gets The Searched Text
            return ok({ users: MOCK_USERS.filter((user:UserListItem) => `${user.first_name ?? ""} ${user.last_name ?? ""} ${user.username}`.toLowerCase().includes(searched_text)).map(withFollowers) })
        }
    },

    {
        method: "GET",
        pattern: "get-posts/",
        handler: ({ query }) => {
            const page:number = Number(query.page ?? "1") // Gets The Page
            return ok({ posts: page <= 1 ? MOCK_POSTS : [], has_next: false })
        }
    },

    {
        method: "GET",
        pattern: "get-post/:post_id/",
        handler: ({ params }) => {
            const post:Post|undefined = MOCK_POSTS.find((one_post:Post) => one_post.id === params[0]) // Finds The Post
            return post ? ok({ post: { ...post, comments: MOCK_COMMENTS } }) : notFound("Post not found (mock)")
        }
    },

    { method: "GET", pattern: "get-post-comments/", handler: () => ok({ visible_comments: MOCK_COMMENTS, has_next: false }) },
    { method: "POST", pattern: "get-post-comments/", handler: () => ok({ visible_comments: MOCK_COMMENTS, has_next: false }) },
    { method: "GET", pattern: "get-processing-posts/", handler: () => ok({ processing_posts: [] }) },
    { method: "GET", pattern: "get-friends/", handler: () => ok({ following: MOCK_USERS.filter((user:UserListItem) => user.has_follow) }) },

    { method: "GET", pattern: "get-training-plans/", handler: () => ok({ training_plans: training_plans_state }) },
    { method: "POST", pattern: "manage-training-plan/", handler: ({ raw_body }) => manageTrainingPlans(raw_body) },
    { method: "GET", pattern: "get-exercises/", handler: () => ok({ exercises: MOCK_EXERCISES }) },
    { method: "GET", pattern: "get-official-training-plans/", handler: () => ok({ official_training_plans: MOCK_OFFICIAL_TRAINING_PLANS }) },

    {
        method: "GET",
        pattern: "get-activity/",
        handler: () => ok({
            activity: {
                latest_activity: MOCK_ACTIVITY_HISTORY[0] ?? null,
                longest_activity: MOCK_ACTIVITY_HISTORY[1] ?? null,
                average_activity_time: 2950,
                average_activity_time_formatted: "49:10",
                activities_amount: 186,
            }
        })
    },

    {
        method: "GET",
        pattern: "get-weekly-activity/",
        handler: () => ok({
            weekly_activity: JSON.stringify(["PO", "UT", "ST", "ŠT", "PI", "SO", "NE"].map((day:string, index:number) => ({ day, total_elapsed_time: [2100, 0, 2780, 1450, 0, 3310, 900][index] ?? 0 })))
        })
    },

    { method: "GET", pattern: "get-activity-history/", handler: () => ok({ activity_history: MOCK_ACTIVITY_HISTORY }) },
    { method: "GET", pattern: "get-official-tasks/", handler: () => ok({ official_tasks: MOCK_OFFICIAL_TASKS, official_tasks_remaining_hours: 7 }) },
    { method: "GET", pattern: "get-custom-tasks/", handler: () => ok({ custom_tasks: MOCK_CUSTOM_TASKS }) },
    { method: "POST", pattern: "add-custom-task/", handler: () => ok({ custom_task: { id: Date.now(), title: "New task", is_completed: false, order: MOCK_CUSTOM_TASKS.length, created_at: new Date().toISOString() } }, 201) },
    { method: "GET", pattern: "get-xp-boost/", handler: () => ok({ xp_boost_expiration_time: null, is_xp_boost_available: true, is_xp_boost_active: false }) },
    { method: "POST", pattern: "use-xp-boost/", handler: () => ok({ xp_boost_expiration_time: new Date(Date.now() + 30 * 60 * 1000).toISOString() }) },

    {
        method: "GET",
        pattern: "get-profile/:username/",
        handler: ({ params }) => {
            const username:string = params[0] ?? "" // Gets The Username
            if(username === MOCK_PROFILE.username) return ok({ is_found: true, user: MOCK_PROFILE })

            const user:UserListItem|undefined = MOCK_USERS.find((one_user:UserListItem) => one_user.username === username) // Finds The User
            if(!user) return ok({ is_found: false })

            return ok({
                is_found: true,
                user: {
                    ...MOCK_PROFILE,
                    ...user,
                    email_address: null,
                    phone_number: null,
                    bio: "Training every day, one rep at a time.",
                    private_account: user.private_account ?? false,
                    has_follow: user.has_follow ?? false,
                    has_pending_follow_request: user.has_pending_follow_request ?? false,
                    saved_posts: null,
                    unread_messages_amount: null,
                    subscription: null,
                }
            })
        }
    },

    { method: "GET", pattern: "get-chats/", handler: () => ok(MOCK_CHAT_PREVIEWS) },
    { method: "GET", pattern: "get-chat/:username/", handler: () => ok({ receiver: MOCK_CHAT_RECEIVER, chats: MOCK_CHAT_MESSAGES, has_next: false }) },
    { method: "GET", pattern: "get-chat-settings/", handler: () => ok({ chat_settings: { background_image: null } }) },

    { method: "GET", pattern: "get-articles/", handler: () => ok({ articles: MOCK_ARTICLES, no_articles: false, articles_amount: MOCK_ARTICLES.length }) },
    { method: "POST", pattern: "get-articles/", handler: () => ok({ articles: MOCK_ARTICLES, no_articles: false, articles_amount: MOCK_ARTICLES.length }) },

    {
        method: "GET",
        pattern: "get-article/:theme/",
        handler: ({ params }) => {
            const article = MOCK_ARTICLES.find((one_article) => one_article.link === params[0]) // Finds The Article
            return article ? ok({ article: { ...article, difficulty: 75, time_to_learn: 60, time_to_learn_text: "2 - 6 months", rarity: 80, strength: 85, technique: 70, given_rating: null, comments_amount: MOCK_COMMENTS.length }, not_found: false }) : ok({ not_found: true })
        }
    },

    { method: "GET", pattern: "get-article-comments/", handler: () => ok({ visible_comments: MOCK_COMMENTS, has_next: false }) },
]

// In-Memory Training Plans (Saving And Deleting Change What get-training-plans Returns Until Reload)
let training_plans_state:TrainingPlanExercise[] = [...MOCK_TRAINING_PLANS]

// Function For Apply A manage-training-plan Request (Same Rules As The Server)
function manageTrainingPlans(raw_body:unknown):MockResponse {
    if(!Array.isArray(raw_body) || raw_body.length === 0) return { status: 400, body: { success: false, message: "Missing data (mock)" } }

    const rows = raw_body as Record<string, unknown>[]
    const deleted_keys:Set<string> = new Set()

    rows.forEach((row) => {
        const key = row.action === "edited_training_plan" ? row.previous_training_plan_key : row.action === "delete_training_plan" ? row.training_plan_key : null
        if(typeof key === "string") deleted_keys.add(key)
    })

    training_plans_state = training_plans_state.filter((row:TrainingPlanExercise) => !deleted_keys.has(row.training_plan_key))

    rows.filter((row) => row.action === "new_training_plan" || row.action === "edited_training_plan").forEach((row) => {
        training_plans_state.push({ ...(row as unknown as TrainingPlanExercise), id: Math.floor(Math.random() * 1_000_000) })
    })

    return ok({}, 201)
}

// Adds The Followers Count Used By The Users List
function withFollowers(user:UserListItem) {
    return { ...user, friend_code: `WSQ-${1000 + user.id}`, followers: 10 + user.id * 7 }
}

// Function For Match A Pattern Against A Path (Returns The Dynamic Params Or Null)
const matchPattern = (pattern:string, path:string):string[]|null => {
    const pattern_parts:string[] = pattern.split("/").filter(Boolean) // Gets The Pattern Parts
    const path_parts:string[] = path.split("/").filter(Boolean) // Gets The Path Parts

    if(pattern_parts.length !== path_parts.length) return null

    const params:string[] = []

    for(let index:number = 0; index < pattern_parts.length; index++) {
        const pattern_part:string = pattern_parts[index] ?? ""
        const path_part:string = path_parts[index] ?? ""

        if(pattern_part.startsWith(":")) params.push(decodeURIComponent(path_part))
        else if(pattern_part !== path_part) return null
    }

    return params
}

// Function For Parse The Query String (URLSearchParams Isn't Fully Available In React Native)
const parseQuery = (query_string:string):Record<string, string> => {
    return query_string.split("&").filter(Boolean).reduce<Record<string, string>>((query, pair:string) => {
        const [key = "", value = ""] = pair.split("=") // Gets The Key And Value
        query[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "))
        return query
    }, {})
}

// Function For Resolve A Request (Unknown GETs Return 404 So Missing Mocks Are Visible, Unknown POSTs Succeed)
export const resolveMockRequest = (method:string, path_with_query:string, raw_body:unknown = {}):MockResponse => {
    const body:Record<string, unknown> = typeof raw_body === "object" && raw_body !== null && !Array.isArray(raw_body) ? raw_body as Record<string, unknown> : {}
    const [path = "", query_string = ""] = path_with_query.split("?") // Splits The Path And Query
    const upper_method:string = method.toUpperCase() // Gets The Method

    for(const route of routes) {
        if(route.method !== upper_method) continue

        const params:string[]|null = matchPattern(route.pattern, path) // Matches The Route
        if(params) return route.handler({ method: upper_method, path, params, query: parseQuery(query_string), body, raw_body })
    }

    if(upper_method === "GET") return notFound(`No mock for GET ${path}`)
    return ok()
}
