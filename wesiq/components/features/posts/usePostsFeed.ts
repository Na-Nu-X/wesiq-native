// Paged Posts Feed (First Page, Load More, Pull To Refresh, Search, Local Updates)

import { useCallback, useEffect, useRef, useState } from "react"
import { getPosts } from "@/lib/api/endpoints/posts"
import { onAppEvent } from "@/lib/events"

import type { ApiError } from "@/types/api"
import type { Post, PostAuthor } from "@/types/models"

interface FeedState {
    query:string, // Search The Posts Belong To
    posts:Post[],
    page:number,
    has_next:boolean,
    error:ApiError|null
}

export function usePostsFeed(search_query:string) {
    const [state, setState] = useState<FeedState|null>(null) // Null Until The First Page Loads
    const [is_refreshing, setIsRefreshing] = useState<boolean>(false)
    const [is_loading_more, setIsLoadingMore] = useState<boolean>(false)
    const request_id = useRef<number>(0) // Ignores Responses Of Outdated Requests

    // Function For Load The First Page
    const loadFirstPage = useCallback(async (query:string):Promise<void> => {
        const id:number = ++request_id.current
        const response = await getPosts(1, query) // Sends The Request
        if(id !== request_id.current) return

        setState(response.ok
            ? { query, posts: response.data.posts, page: 1, has_next: response.data.has_next, error: null }
            : { query, posts: [], page: 1, has_next: false, error: response.error })
    }, [])

    // Initializes The Load When The Search Changes (State Is Set Only After The Response)
    useEffect(() => {
        loadFirstPage(search_query)
    }, [search_query, loadFirstPage])

    // Function For Pull To Refresh
    const refresh = useCallback(async ():Promise<void> => {
        setIsRefreshing(true)
        await loadFirstPage(search_query)
        setIsRefreshing(false)
    }, [search_query, loadFirstPage])

    // Initializes The Refresh When A Post Is Uploaded, Processed Or Deleted
    useEffect(() => onAppEvent("posts_changed", () => { refresh() }), [refresh])

    // Function For Load The Next Page
    const loadMore = useCallback(async ():Promise<void> => {
        if(!state || !state.has_next || is_loading_more || state.query !== search_query) return

        setIsLoadingMore(true)
        const id:number = request_id.current
        const response = await getPosts(state.page + 1, search_query) // Sends The Request
        setIsLoadingMore(false)

        if(id !== request_id.current || !response.ok) return

        setState((previous:FeedState|null) => {
            if(!previous) return previous
            const known:Set<string> = new Set(previous.posts.map((post:Post) => post.id))
            return { ...previous, posts: [...previous.posts, ...response.data.posts.filter((post:Post) => !known.has(post.id))], page: previous.page + 1, has_next: response.data.has_next }
        })
    }, [state, is_loading_more, search_query])

    // Function For Replace One Post
    const updatePost = useCallback((post:Post):void => {
        setState((previous) => previous ? { ...previous, posts: previous.posts.map((other:Post) => other.id === post.id ? post : other) } : previous)
    }, [])

    // Function For Update The Author On All Their Posts (Follow State)
    const updateAuthor = useCallback((user_id:number, changes:Partial<PostAuthor>):void => {
        setState((previous) => previous ? { ...previous, posts: previous.posts.map((post:Post) => post.user.id === user_id ? { ...post, user: { ...post.user, ...changes } } : post) } : previous)
    }, [])

    // Function For Remove A Post
    const removePost = useCallback((post_id:string):void => {
        setState((previous) => previous ? { ...previous, posts: previous.posts.filter((post:Post) => post.id !== post_id) } : previous)
    }, [])

    const is_loading:boolean = state === null || state.query !== search_query // Stores The Information If The First Page Is Loading

    return { posts: is_loading || !state ? [] : state.posts, error: state?.error ?? null, has_next: state?.has_next ?? false, is_loading, is_refreshing, is_loading_more, refresh, loadMore, updatePost, updateAuthor, removePost }
}
