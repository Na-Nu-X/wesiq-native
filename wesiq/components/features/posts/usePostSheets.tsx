// The Sheets Every Post List Needs (Comments, Options, Share, Likes) Wired To The List's Update Functions

import { useCallback, useMemo, useState } from "react"
import CommentsSheet from "./CommentsSheet"
import { addComment, deletePostComment, getPostComments, reportPostComment, togglePostCommentLike } from "@/lib/api/endpoints/posts"
import PostMenuSheet from "./PostMenuSheet"
import SharePostSheet from "./SharePostSheet"
import UsersWhoLikedPostSheet from "./UsersWhoLikedPostSheet"

import type { Post, PostAuthor, UserListItem } from "@/types/models"
import type { UsersWhoLikedPostInfo } from "./UsersWhoLikedPostSheet"
import type { SharedPostInfo } from "./SharePostSheet"
import type { CommentsSource } from "./CommentsSheet"

interface PostSheetsOptions {
    updatePost:(post:Post) => void,
    removePost:(post_id:string) => void,
    updateAuthor?:(user_id:number, changes:Partial<PostAuthor>) => void, // Keeps The Author's Follow Button In Sync After A Follow From The Likes Sheet
    onRequireLogin:() => void
}

// Function For Create The Comments Source Of A Post
const getPostCommentsSource = (post:Post):CommentsSource => ({
    key: `post:${post.id}`,
    comments_count: post.comments_amount,
    allow_comments: post.allow_comments,
    load: (page:number, signal?:AbortSignal) => getPostComments(post.id, page, signal),
    add: (comment:string, parent_id:number|null) => addComment(post.id, comment, parent_id),
    like: togglePostCommentLike,
    report: reportPostComment,
    remove: deletePostComment,
})

export function usePostSheets({ updatePost, removePost, updateAuthor, onRequireLogin }:PostSheetsOptions) {
    const [comments_post, setCommentsPost] = useState<Post|null>(null)
    const [menu_post, setMenuPost] = useState<Post|null>(null)
    const [share_post, setSharePost] = useState<SharedPostInfo|null>(null)
    const [users_who_liked_post, setUsersWhoLikedPost] = useState<UsersWhoLikedPostInfo|null>(null)

    // Function For Update A Post Everywhere (List And Open Sheets)
    const handlePostChange = useCallback((post:Post):void => {
        updatePost(post)
        setMenuPost((current) => current?.id === post.id ? post : current)
        setCommentsPost((current) => current?.id === post.id ? post : current)
    }, [updatePost])

    const comments_source:CommentsSource|null = useMemo(() => comments_post ? getPostCommentsSource(comments_post) : null, [comments_post]) // Stable Between Renders

    const sheets = (
        <>
            <CommentsSheet
                source={comments_source}
                onClose={() => setCommentsPost(null)}
                onRequireLogin={onRequireLogin}
                onCommentsCountChange={(delta:number) => {
                    if(comments_post) handlePostChange({ ...comments_post, comments_amount: Math.max(0, comments_post.comments_amount + delta) })
                }}
            />

            <PostMenuSheet
                post={menu_post}
                onClose={() => setMenuPost(null)}
                onPostChange={handlePostChange}
                onPostDeleted={(post:Post) => removePost(post.id)}
            />

            <SharePostSheet post={share_post} onClose={() => setSharePost(null)} />

            <UsersWhoLikedPostSheet
                post={users_who_liked_post}
                onClose={() => setUsersWhoLikedPost(null)}
                onFollowChange={(user:UserListItem) => updateAuthor?.(user.id, { has_follow: user.has_follow, has_pending_follow_request: user.has_pending_follow_request })}
            />
        </>
    )

    return {
        sheets,
        handlePostChange,
        openComments: useCallback((post:Post) => setCommentsPost(post), []),
        openMenu: useCallback((post:Post) => setMenuPost(post), []),
        openShare: useCallback((post:Post) => setSharePost({ id: post.id, author_username: post.user.username }), []),
        openUsersWhoLikedPost: useCallback((post:Post) => setUsersWhoLikedPost({ id: post.id, author_username: post.user.username }), []),
    }
}
