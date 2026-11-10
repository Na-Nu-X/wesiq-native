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

import type { Post, UserListItem } from "@/types/models"

export interface MockResponse {
    status:number,
    body:Record<string, unknown>
}

interface MockRequest {
    method:string,
    path:string, // Path Without The API Prefix, E.g. "get-profile/alex.demo/"
    params:string[], // Dynamic Path Segments
    query:Record<string, string>,
    body:Record<string, unknown> // Parsed JSON Body (Empty For GET Or Non JSON Bodies)
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
    { method: "GET", pattern: "get-logged-in-user/", handler: () => ok({ logged_in_user: MOCK_LOGGED_IN_USER }) },

    { method: "GET", pattern: "load-first-users/", handler: () => ok({ users: MOCK_USERS.map(withFollowers) }) },

    {
        method: "POST",
        pattern: "search-users/",
        handler: ({ body }) => {
            const searched_text:string = (typeof body.searched_text === "string" ? body.searched_text : "").toLowerCase() // Gets The Searched Text
            return ok({ users: MOCK_USERS.filter((user:UserListItem) => user.username.includes(searched_text)).map(withFollowers) })
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

    { method: "GET", pattern: "get-post-comments/", handler: () => ok({ comments: MOCK_COMMENTS, has_next: false, visible_comments: MOCK_COMMENTS.length }) },
    { method: "POST", pattern: "get-post-comments/", handler: () => ok({ comments: MOCK_COMMENTS, has_next: false, visible_comments: MOCK_COMMENTS.length }) },
    { method: "GET", pattern: "get-processing-posts/", handler: () => ok({ processing_posts: [] }) },
    { method: "GET", pattern: "get-friends/", handler: () => ok({ following: MOCK_USERS.filter((user:UserListItem) => user.has_follow) }) },

    { method: "GET", pattern: "get-training-plans/", handler: () => ok({ training_plans: MOCK_TRAINING_PLANS }) },
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
            return article ? ok({ article, not_found: false }) : ok({ not_found: true })
        }
    },

    { method: "GET", pattern: "get-article-comments/", handler: () => ok({ comments: [], has_next: false, visible_comments: 0 }) },
]

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
export const resolveMockRequest = (method:string, path_with_query:string, body:Record<string, unknown> = {}):MockResponse => {
    const [path = "", query_string = ""] = path_with_query.split("?") // Splits The Path And Query
    const upper_method:string = method.toUpperCase() // Gets The Method

    for(const route of routes) {
        if(route.method !== upper_method) continue

        const params:string[]|null = matchPattern(route.pattern, path) // Matches The Route
        if(params) return route.handler({ method: upper_method, path, params, query: parseQuery(query_string), body })
    }

    if(upper_method === "GET") return notFound(`No mock for GET ${path}`)
    return ok()
}
