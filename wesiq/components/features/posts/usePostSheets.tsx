// The Sheets Every Post List Needs (Comments, Options, Share) Wired To The List's Update Functions

import { useCallback, useState } from "react"
import CommentsSheet from "./CommentsSheet"
import PostMenuSheet from "./PostMenuSheet"
import SharePostSheet, { SharedPostInfo } from "./SharePostSheet"

import type { Post } from "@/types/models"

interface PostSheetsOptions {
    updatePost:(post:Post) => void,
    removePost:(post_id:string) => void,
    onRequireLogin:() => void
}

export function usePostSheets({ updatePost, removePost, onRequireLogin }:PostSheetsOptions) {
    const [comments_post, setCommentsPost] = useState<Post|null>(null)
    const [menu_post, setMenuPost] = useState<Post|null>(null)
    const [share_post, setSharePost] = useState<SharedPostInfo|null>(null)

    // Function For Update A Post Everywhere (List And Open Sheets)
    const handlePostChange = useCallback((post:Post):void => {
        updatePost(post)
        setMenuPost((current) => current?.id === post.id ? post : current)
        setCommentsPost((current) => current?.id === post.id ? post : current)
    }, [updatePost])

    const sheets = (
        <>
            <CommentsSheet
                post={comments_post}
                onClose={() => setCommentsPost(null)}
                onRequireLogin={onRequireLogin}
                onCommentsCountChange={(post:Post, delta:number) => handlePostChange({ ...post, comments_amount: Math.max(0, post.comments_amount + delta) })}
            />

            <PostMenuSheet
                post={menu_post}
                onClose={() => setMenuPost(null)}
                onPostChange={handlePostChange}
                onPostDeleted={(post:Post) => removePost(post.id)}
            />

            <SharePostSheet post={share_post} onClose={() => setSharePost(null)} />
        </>
    )

    return {
        sheets,
        handlePostChange,
        openComments: useCallback((post:Post) => setCommentsPost(post), []),
        openMenu: useCallback((post:Post) => setMenuPost(post), []),
        openShare: useCallback((post:Post) => setSharePost({ id: post.id, author_username: post.user.username }), []),
    }
}
