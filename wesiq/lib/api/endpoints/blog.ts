// Blog Endpoints

import * as Crypto from "expo-crypto"
import { DOMAIN } from "@/constants/general"
import { apiGet, apiPost } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isBoolean, isNumber, isRecord, isString } from "@/lib/api/guards"
import { getStoredString, setStoredString } from "@/lib/storage"

import type { ApiEnvelope, ApiResult } from "@/types/api"
import type { Article, PostComment } from "@/types/models"
import type { AddedComment, CommentsPage, ReportReason } from "./posts"

export type ArticleSort = "latest"|"popular"|"best"|"a-z"|"z-a" // Same Values As The Server

export interface ArticleDetail extends Article {
    difficulty:number|null, // 0 - 100
    time_to_learn:number|null,
    time_to_learn_text:string|null,
    rarity:number|null, // 0 - 100
    strength:number|null,
    technique:number|null,
    given_rating:number|null, // The Viewer's Own Rating
    comments_amount:number
}

// Function For Get The Website Link Of An Article
export const getArticleWebLink = (article:Pick<Article, "link">):string => `${DOMAIN}/sk/blog/${encodeURIComponent(article.link)}`

// Function For Get The Image URL Of An Article
export const getArticleImageUrl = (image_name:string|null):string|null => image_name ? `${DOMAIN}/static/images/articles/${encodeURIComponent(image_name)}` : null

const isArticle = (value:unknown):value is Article => isRecord(value) && isNumber(value.id) && isString(value.title) && isString(value.link)

export const getArticles = (sort:ArticleSort, category:string, signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { articles:Article[] }>> => {
    return apiGet("get-articles/", { query: { sort, category }, signal, is_authenticated: false, guard: envelopeWith({ articles: (value:unknown):value is Article[] => isArrayOf(value, isArticle) }) })
}

// Function For Get A Stable Anonymous Device ID (Counts Unique Article Visitors)
const getDeviceId = async ():Promise<string> => {
    const stored:string|null = await getStoredString("device_id") // Gets The Stored ID
    if(stored) return stored

    const created:string = Crypto.randomUUID() // Creates A New ID
    await setStoredString("device_id", created)
    return created
}

export const getArticle = async (link:string, signal?:AbortSignal):Promise<ApiResult<ApiEnvelope & { article?:ArticleDetail, not_found:boolean }>> => {
    const device_id:string = await getDeviceId() // Gets The Device ID

    return apiGet(`get-article/${encodeURIComponent(link)}/`, {
        signal,
        headers: { "X-Device-ID": device_id },
        guard: envelopeWith({ not_found: isBoolean }) as (value:unknown) => value is ApiEnvelope & { article?:ArticleDetail, not_found:boolean },
    })
}

export const rateArticle = (article_id:number, rating:number) => apiPost("add-article-rating/", { article_id, rating })

// ---------- Comments (Same Shape As Post Comments) ----------

export const getArticleComments = (article_id:number, page:number, signal?:AbortSignal):Promise<ApiResult<CommentsPage>> => {
    return apiGet("get-article-comments/", {
        query: { article_id, page },
        signal,
        guard: envelopeWith<{ visible_comments:PostComment[], has_next:boolean }>({ visible_comments: (value:unknown):value is PostComment[] => Array.isArray(value), has_next: isBoolean }),
    })
}

export const addArticleComment = (article_id:number, comment:string, parent_id:number|null):Promise<ApiResult<ApiEnvelope & { comment:AddedComment }>> => {
    return apiPost("add-article-comment/", { article_id, comment, parent_id })
}

export const toggleArticleCommentLike = (comment_id:number) => apiPost("toggle-article-comment-like/", { comment_id })
export const reportArticleComment = (comment_id:number, reason:ReportReason) => apiPost("report-article-comment/", { comment_id, reason })
export const deleteArticleComment = (comment_id:number) => apiPost("delete-article-comment/", { comment_id })
