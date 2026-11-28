// The People Who Liked A Post (Opened By A Long Press On The Like Button) With Follow Buttons

import { useState } from "react"
import { FlatList, ListRenderItemInfo, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Button, Divider, EmptyState, ErrorState, Sheet, UserRow, UserRowSkeleton } from "@/components/ui"
import { spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { FollowState, getFollowState, getToggledFollowFlags, getUsersWhoLikedPost, toggleFollow } from "@/lib/api/endpoints/users"
import { formatUsername } from "@/lib/format"

import type { ApiEnvelope, ApiResult } from "@/types/api"
import type { PostId, UserListItem } from "@/types/models"

export interface UsersWhoLikedPostInfo {
    id:PostId,
    author_username:string
}

interface UsersWhoLikedPostSheetProps {
    post:UsersWhoLikedPostInfo|null, // Null = Closed
    onClose:() => void,
    onFollowChange?:(user:UserListItem) => void // Lets The Feed Update The Author's Follow Button
}

export default function UsersWhoLikedPostSheet({ post, onClose, onFollowChange }:UsersWhoLikedPostSheetProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User

    const [busy_ids, setBusyIds] = useState<ReadonlySet<number>>(new Set()) // Stores The Users With A Running Request

    // Keeps The Last Post While The Sheet Animates Closed (Adjusted During Render) And Resets State For A New Post
    const [shown_post, setShownPost] = useState<UsersWhoLikedPostInfo|null>(post) // Stores The Shown Post

    if(post && post.id !== shown_post?.id) {
        setShownPost(post) // Sets The Shown Post
        setBusyIds(new Set()) // Sets The Busy IDs
    }

    // Loads The Users Who Liked The Post (Only While The Sheet Is Open)
    const { state, refetch, setData } = useApiQuery(
        `post_likes:${post?.id ?? ""}`,
        async (signal:AbortSignal) => {
            const response = await getUsersWhoLikedPost(post?.id ?? "", signal) // Gets The Response
            return response.ok ? { ...response, data: response.data.users } : response
        },
        { is_enabled: post !== null }
    )

    if(!shown_post) return null

    const users:UserListItem[] = state.data ?? [] // Gets The Loaded Users

    // Function For Open A Profile From The List
    const openProfile = (username:string):void => {
        onClose() // Closes The Sheet
        router.push({ pathname: "/profile/[username]", params: { username } })
    }

    // Function For Follow / Unfollow / Request / Cancel Request
    const handleToggleFollow = async (user:UserListItem):Promise<void> => {
        if(busy_ids.has(user.id)) return

        const state_before:FollowState = getFollowState(user) // Gets The Current State

        if(state_before === "following") {
            // Checks If It Is Confirmed
            const is_confirmed:boolean = await confirmAction({
                title: t("Prestať sledovať {{username}}?", { username: user.username }),
                message: user.private_account ? t("Ak je účet súkromný, budete musieť znova požiadať o sledovanie.") : undefined,
                confirm_label: t("Prestať sledovať"),
                is_destructive: true,
            })

            if(!is_confirmed) return
        }

        setBusyIds((previous:ReadonlySet<number>) => new Set(previous).add(user.id)) // Sets The Busy IDs

        const response:ApiResult<ApiEnvelope> = await toggleFollow(user.id) // Sends The Request

        setBusyIds((previous:ReadonlySet<number>) => {
            const next:Set<number> = new Set(previous) // Gets The Next
            next.delete(user.id)
            return next
        })

        if(!response.ok) {
            haptics.error() // Plays The Error Haptic Feedback
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success() // Plays The Success Haptic Feedback

        const updated_user:UserListItem = { ...user, ...getToggledFollowFlags(user) } // Gets The User With The New Flags

        setData((previous:UserListItem[]|null) => previous?.map((one_user:UserListItem) => one_user.id === user.id ? updated_user : one_user) ?? previous) // Sets The Data
        onFollowChange?.(updated_user)
    }

    // Function For Render The Follow Button Of A Row
    const renderActions = (user:UserListItem) => {
        if(!logged_in_user || user.id === logged_in_user.id) return null

        const is_busy:boolean = busy_ids.has(user.id) // Stores The Information If A Request Runs
        const follow_state:FollowState = getFollowState(user) // Gets The Follow State

        if(follow_state === "following") {
            return (
                <Button
                    label = {t("Sledujete")}
                    size = "sm"
                    variant = "secondary"
                    icon = "check"
                    onPress = {() => handleToggleFollow(user)}
                    is_loading = {is_busy}
                />
            )
        }
        if(follow_state === "requested") {
            return (
                <Button
                    label = {t("Požiadané")}
                    size = "sm"
                    variant = "secondary"
                    icon = "clock"
                    onPress = {() => handleToggleFollow(user)}
                    is_loading = {is_busy}
                    accessibility_hint = {t("Zrušiť žiadosť")}
                />
            )
        }
        return (
            <Button
                label = {t("Sledovať")}
                size = "sm"
                onPress = {() => handleToggleFollow(user)}
                is_loading = {is_busy}
            />
        )
    }

    // Function For Render The List Content When It Has No Rows
    const renderEmpty = () => {
        if(state.status === "loading") return <View>{[0, 1, 2].map((index:number) => <UserRowSkeleton key = {index} />)}</View>
        if(state.status === "error") {
            return (
                <ErrorState
                    error = {state.error}
                    onRetry = {refetch}
                    is_compact
                />
            )
        }
        return (
            <EmptyState
                icon = "heart"
                title = {t("Zatiaľ žiadne označenia páči sa mi to")}
                is_compact
            />
        )
    }

    return (
        <Sheet
            visible = {post !== null}
            onClose = {onClose}
            title = {t("Označenia páči sa mi to")}
            subtitle = {formatUsername(shown_post.author_username)}
            size = "large"
            is_scrollable = {false}
        >
            <FlatList
                data = {users}
                keyExtractor = {(user:UserListItem) => String(user.id)}
                style = {styles.list}
                contentContainerStyle = {styles.list_content}
                ItemSeparatorComponent = {() => <Divider inset = {56} />}
                ListEmptyComponent = {renderEmpty}
                initialNumToRender = {14}

                renderItem = {({ item }:ListRenderItemInfo<UserListItem>) => (
                    <UserRow
                        user = {item}
                        onPress = {() => openProfile(item.username)}
                        accessibility_hint = {t("Zobraziť užívateľa")}
                        trailing = {renderActions(item)}
                    />
                )}
            />
        </Sheet>
    )
}

const styles = StyleSheet.create({
    list: {
        flex: 1,
    },

    list_content: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
    },
})
