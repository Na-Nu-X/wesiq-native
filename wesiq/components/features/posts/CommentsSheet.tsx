// Comments Of A Post: Threaded Replies, Likes, Reply, Report / Delete And A Composer

import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, FlatList, ListRenderItemInfo, Pressable, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Avatar, Button, Card, Divider, EmptyState, ErrorState, Icon, IconButton, Sheet, Text, TextField, UserRowSkeleton } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { getTimeAgo } from "@/utils/time"
import { REPORT_REASONS, ReportReason } from "@/lib/api/endpoints/posts"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { MenuRow, useReportReasonLabels } from "./PostMenuSheet"

import type { ApiEnvelope, ApiError, ApiResult } from "@/types/api"
import type { PostComment } from "@/types/models"
import type { AddedComment, CommentsPage } from "@/lib/api/endpoints/posts"

// What The Sheet Needs From A Commented Item (A Post Or A Blog Article)
export interface CommentsSource {
    key:string, // Changes When Another Item Is Opened
    comments_count:number,
    allow_comments:boolean,
    load:(page:number, signal?:AbortSignal) => Promise<ApiResult<CommentsPage>>,
    add:(comment:string, parent_id:number|null) => Promise<ApiResult<ApiEnvelope & { comment:AddedComment }>>,
    like:(comment_id:number) => Promise<ApiResult<ApiEnvelope>>,
    report:(comment_id:number, reason:ReportReason) => Promise<ApiResult<ApiEnvelope>>,
    remove:(comment_id:number) => Promise<ApiResult<ApiEnvelope>>
}

const MAX_COMMENT_LENGTH:number = 100 // Same As Before
const MAX_INDENT_LEVEL:number = 3 // Deeper Replies Stay At This Indentation
const MAX_REPLY_LEVEL:number = 5 // The Server Rejects Replies Deeper Than Level 5 (Top Level Is 1)

interface CommentsSheetProps {
    source:CommentsSource|null, // Null = Closed
    onClose:() => void,
    onCommentsCountChange:(delta:number) => void,
    onRequireLogin:() => void
}

interface CommentsState {
    post_id:string,
    comments:PostComment[],
    page:number,
    has_next:boolean,
    is_loading_more:boolean,
    error:ApiError|null,
    is_loaded:boolean
}

// Function For Collect A Comment And All Its Replies (For Deleting And Counting)
const collectThread = (comments:PostComment[], root_id:number):Set<number> => {
    const ids:Set<number> = new Set([root_id])
    let has_added:boolean = true

    while(has_added) {
        has_added = false

        comments.forEach((comment:PostComment) => {
            if(comment.parent_id !== null && ids.has(comment.parent_id) && !ids.has(comment.id)) {
                ids.add(comment.id)
                has_added = true
            }
        })
    }

    return ids
}

export default function CommentsSheet({ source, onClose, onCommentsCountChange, onRequireLogin }:CommentsSheetProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const getReasonLabel = useReportReasonLabels() // Gets The Reason Labels

    const [shown_source, setShownSource] = useState<CommentsSource|null>(source) // Keeps The Source While The Sheet Animates Closed
    const [state, setState] = useState<CommentsState|null>(null)
    const [draft, setDraft] = useState<string>("") // Stores The Comment Being Written
    const [reply_to, setReplyTo] = useState<PostComment|null>(null) // Stores The Comment Being Replied To
    const [expanded_roots, setExpandedRoots] = useState<ReadonlySet<number>>(new Set()) // Stores The Root Comments With Visible Replies
    const [is_sending, setIsSending] = useState<boolean>(false)
    const [menu_comment, setMenuComment] = useState<PostComment|null>(null) // Stores The Comment With An Open Menu
    const [menu_view, setMenuView] = useState<"main"|"report">("main")

    // Resets Everything For Another Post (Adjusted During Render)
    if(source && source.key !== shown_source?.key) {
        setShownSource(source)
        setState(null)
        setDraft("")
        setReplyTo(null)
        setExpandedRoots(new Set())
    }

    else if(source && source !== shown_source) setShownSource(source)

    const source_key:string|null = source?.key ?? null // Gets The Open Item
    const load_first_page = source?.load // Gets The Loader

    // Initializes The Load Of The First Page (State Is Only Set After The Request)
    useEffect(() => {
        if(!source_key || !load_first_page) return

        const controller:AbortController = new AbortController()
        const post_id:string = source_key

        load_first_page(1, controller.signal).then((response) => {
            if(controller.signal.aborted) return

            setState(response.ok
                ? { post_id, comments: response.data.visible_comments, page: 1, has_next: response.data.has_next, is_loading_more: false, error: null, is_loaded: true }
                : { post_id, comments: [], page: 1, has_next: false, is_loading_more: false, error: response.error, is_loaded: true })
        })

        return () => controller.abort()
    }, [source_key]) // eslint-disable-line react-hooks/exhaustive-deps -- Reloads Only For Another Item

    // Function For Load The Next Page
    const loadMore = async ():Promise<void> => {
        if(!state || !state.has_next || state.is_loading_more || !shown_source) return

        setState({ ...state, is_loading_more: true })
        const response = await shown_source.load(state.page + 1) // Sends The Request

        setState((previous:CommentsState|null) => {
            if(!previous || previous.post_id !== shown_source.key) return previous
            if(!response.ok) return { ...previous, is_loading_more: false }

            const known:Set<number> = new Set(previous.comments.map((comment:PostComment) => comment.id))
            return { ...previous, comments: [...previous.comments, ...response.data.visible_comments.filter((comment:PostComment) => !known.has(comment.id))], page: previous.page + 1, has_next: response.data.has_next, is_loading_more: false }
        })
    }

    // Builds The Visible List (Roots In Server Order, Replies Under Their Root When Expanded)
    const rows:PostComment[] = useMemo(() => {
        if(!state) return []

        const children:Map<number, PostComment[]> = new Map()
        state.comments.forEach((comment:PostComment) => {
            if(comment.parent_id === null) return
            children.set(comment.parent_id, [...(children.get(comment.parent_id) ?? []), comment])
        })

        const result:PostComment[] = []
        const addWithReplies = (comment:PostComment):void => {
            result.push(comment)
            ;(children.get(comment.id) ?? []).forEach(addWithReplies)
        }

        state.comments.filter((comment:PostComment) => comment.parent_id === null).forEach((root:PostComment) => {
            result.push(root)
            if(expanded_roots.has(root.id)) (children.get(root.id) ?? []).forEach(addWithReplies)
        })

        return result
    }, [state, expanded_roots])

    // Counts Replies Per Root
    const reply_counts:Map<number, number> = useMemo(() => {
        const counts:Map<number, number> = new Map()
        state?.comments.filter((comment:PostComment) => comment.parent_id === null).forEach((root:PostComment) => counts.set(root.id, collectThread(state.comments, root.id).size - 1))
        return counts
    }, [state])

    // Function For Find The Root Of A Comment
    const findRootId = (comment:PostComment):number => {
        let current:PostComment|undefined = comment

        while(current && current.parent_id !== null) {
            const parent_id:number = current.parent_id
            current = state?.comments.find((other:PostComment) => other.id === parent_id)
        }

        return current?.id ?? comment.id
    }

    // ---------- Actions ----------

    // Function For Like A Comment (Optimistic)
    const toggleLike = async (comment:PostComment):Promise<void> => {
        if(!logged_in_user) {
            onRequireLogin()
            return
        }

        const is_liked:boolean = comment.likes_from_users.includes(logged_in_user.id)
        const updateComment = (changes:Partial<PostComment>):void => setState((previous) => previous ? { ...previous, comments: previous.comments.map((other:PostComment) => other.id === comment.id ? { ...other, ...changes } : other) } : previous)

        haptics.light()
        updateComment({ likes: Math.max(0, comment.likes + (is_liked ? -1 : 1)), likes_from_users: is_liked ? comment.likes_from_users.filter((id:number) => id !== logged_in_user.id) : [...comment.likes_from_users, logged_in_user.id] })

        if(!shown_source) return
        const response = await shown_source.like(comment.id) // Sends The Request
        if(!response.ok) updateComment({ likes: comment.likes, likes_from_users: comment.likes_from_users })
    }

    // Function For Send The Comment
    const send = async ():Promise<void> => {
        if(!logged_in_user) {
            onRequireLogin()
            return
        }

        const text:string = draft.trim() // Gets The Text
        if(!text || !shown_source || is_sending) return

        setIsSending(true)
        const response = await shown_source.add(text, reply_to?.id ?? null) // Sends The Request
        setIsSending(false)

        if(!response.ok) {
            haptics.error()
            showAlert(t("Chyba"), response.error.message)
            return
        }

        const added:PostComment = {
            id: response.data.comment.id,
            user: { id: logged_in_user.id, username: logged_in_user.username, first_name: logged_in_user.first_name, last_name: logged_in_user.last_name, profile_picture_name: logged_in_user.profile_picture_name, subscription: logged_in_user.subscription },
            comment: text,
            likes: 0,
            likes_from_users: [],
            creation_time: String(response.data.comment.creation_time),
            parent_id: reply_to?.id ?? null,
            level: response.data.comment.level,
        }

        haptics.success()
        setState((previous) => previous ? { ...previous, comments: added.parent_id === null ? [added, ...previous.comments] : [...previous.comments, added] } : previous)
        if(reply_to) setExpandedRoots((previous) => new Set(previous).add(findRootId(reply_to)))
        setDraft("")
        setReplyTo(null)
        onCommentsCountChange(1)
    }

    // Function For Delete A Comment (Removes Its Replies Too)
    const remove = async (comment:PostComment):Promise<void> => {
        setMenuComment(null)

        const is_confirmed:boolean = await confirmAction({ title: t("Odstrániť komentár?"), message: t("Odstránia sa aj odpovede na tento komentár."), confirm_label: t("Odstrániť"), is_destructive: true })
        if(!is_confirmed || !state || !shown_source) return

        const response = await shown_source.remove(comment.id) // Sends The Request

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        const removed:Set<number> = collectThread(state.comments, comment.id) // Gets The Removed Comments
        setState((previous) => previous ? { ...previous, comments: previous.comments.filter((other:PostComment) => !removed.has(other.id)) } : previous)
        onCommentsCountChange(-removed.size)
    }

    // Function For Report A Comment
    const report = async (comment:PostComment, reason:ReportReason):Promise<void> => {
        setMenuComment(null)
        if(!shown_source) return
        const response = await shown_source.report(comment.id, reason) // Sends The Request

        if(!response.ok) showAlert(t("Chyba"), response.error.message)
        else showAlert(t("Ďakujeme za nahlásenie"), t("Komentár skontrolujeme. Nahlasovateľ zostáva anonymný."))
    }

    // ---------- Rendering ----------

    // Function For Render One Comment
    const renderComment = ({ item }:ListRenderItemInfo<PostComment>) => {
        const is_liked:boolean = logged_in_user ? item.likes_from_users.includes(logged_in_user.id) : false
        const indent:number = Math.min(Math.max(item.level - 1, 0), MAX_INDENT_LEVEL) // Gets The Indentation
        const replies:number = item.parent_id === null ? (reply_counts.get(item.id) ?? 0) : 0

        return (
            <View style={[styles.comment, { paddingLeft: indent * spacing.xxl }]}>
                <Pressable onPress={() => {
                    onClose()
                    router.push({ pathname: "/profile/[username]", params: { username: item.user.username } })
                }} accessibilityLabel={item.user.username}>
                    <Avatar user={item.user} size={indent > 0 ? 28 : 34} is_ring_hidden />
                </Pressable>

                <View style={styles.comment_body}>
                    <Text variant="callout">
                        <Text variant="body_strong">{item.user.username} </Text>
                        {item.comment}
                    </Text>

                    <View style={styles.comment_meta}>
                        <Text variant="caption" color="text_muted">{getTimeAgo(item.creation_time)}</Text>
                        {item.level < MAX_REPLY_LEVEL && (
                            <Pressable onPress={() => setReplyTo(item)} hitSlop={8} accessibilityRole="button">
                                <Text variant="label" color="text_secondary">{t("Odpovedať")}</Text>
                            </Pressable>
                        )}

                        {replies > 0 && (
                            <Pressable
                                hitSlop={8}
                                accessibilityRole="button"
                                onPress={() => setExpandedRoots((previous) => {
                                    const next:Set<number> = new Set(previous)
                                    if(next.has(item.id)) next.delete(item.id)
                                    else next.add(item.id)
                                    return next
                                })}
                            >
                                <Text variant="label" color="primary_text">
                                    {expanded_roots.has(item.id) ? t("Skryť odpovede") : t("Zobraziť odpovede ({{count}})", { count: replies })}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                <View style={styles.comment_side}>
                    <Pressable onPress={() => toggleLike(item)} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: is_liked }} accessibilityLabel={`${t("Páči sa mi to")}: ${item.likes}`} style={styles.like}>
                        <Icon name="heart" size={13} color={is_liked ? "danger" : "text_muted"} is_solid={is_liked} />
                        {item.likes > 0 && <Text variant="caption" color="text_muted" is_tabular>{item.likes}</Text>}
                    </Pressable>

                    {!!logged_in_user && (
                        <IconButton icon="ellipsis" accessibility_label={t("Možnosti komentára")} onPress={() => {
                            setMenuView("main")
                            setMenuComment(item)
                        }} size={26} icon_color="text_muted" />
                    )}
                </View>
            </View>
        )
    }

    if(!shown_source) return null

    const is_own_menu_comment:boolean = menu_comment !== null && logged_in_user?.id === menu_comment.user.id
    const can_delete_menu_comment:boolean = is_own_menu_comment || logged_in_user?.role === "admin" || logged_in_user?.role === "developer" // Same Rule As The Server

    return (
        <Sheet
            visible={source !== null}
            onClose={onClose}
            title={t("Komentáre")}
            subtitle={shown_source.comments_count > 0 ? `${shown_source.comments_count}` : undefined}
            size="large"
            is_scrollable={false}

            footer={shown_source.allow_comments ? (
                <View style={styles.composer}>
                    {!!reply_to && (
                        <View style={styles.reply_to}>
                            <Icon name="reply" size={11} color="text_muted" />
                            <Text variant="caption" color="text_secondary" style={styles.flex} numberOfLines={1}>{t("Odpoveď používateľovi {{username}}", { username: reply_to.user.username })}</Text>
                            <IconButton icon="xmark" accessibility_label={t("Zrušiť odpoveď")} onPress={() => setReplyTo(null)} size={24} icon_color="text_muted" />
                        </View>
                    )}

                    <View style={styles.composer_row}>
                        <TextField
                            placeholder={logged_in_user ? t("Pridať komentár...") : t("Prihláste sa a pridajte komentár")}
                            accessibilityLabel={t("Pridať komentár...")}
                            value={draft}
                            onChangeText={setDraft}
                            maxLength={MAX_COMMENT_LENGTH}
                            onFocus={() => { if(!logged_in_user) onRequireLogin() }}
                            onSubmitEditing={send}
                            returnKeyType="send"
                            container_style={styles.flex}
                        />

                        <IconButton icon="paper-plane" accessibility_label={t("Odoslať")} onPress={send} is_disabled={!draft.trim() || is_sending} variant="solid" size={46} />
                    </View>
                </View>
            ) : undefined}
        >
            <FlatList
                data={rows}
                keyExtractor={(comment:PostComment) => String(comment.id)}
                renderItem={renderComment}
                style={styles.flex}
                contentContainerStyle={styles.list_content}
                keyboardShouldPersistTaps="handled"
                onEndReached={loadMore}
                onEndReachedThreshold={0.4}

                ListEmptyComponent={
                    !state ? <View>{[0, 1, 2].map((index:number) => <UserRowSkeleton key={index} />)}</View>
                    : state.error ? <ErrorState error={state.error} is_compact />
                    : shown_source.allow_comments ? <EmptyState icon="comments" title={t("Zatiaľ žiadne komentáre")} message={t("Buďte prvý, kto pridá komentár.")} is_compact />
                    : <EmptyState icon="comment-slash" title={t("Komentáre sú vypnuté")} is_compact />
                }

                ListFooterComponent={state?.is_loading_more ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : undefined}
            />

            <Sheet
                visible={menu_comment !== null}
                onClose={() => menu_view === "report" ? setMenuView("main") : setMenuComment(null)}
                title={menu_view === "report" ? t("Nahlásiť komentár") : t("Možnosti komentára")}
            >
                {!!menu_comment && (
                    <Card padding="xs">
                        {menu_view === "report" ? REPORT_REASONS.map((reason:ReportReason, index:number) => (
                            <View key={reason}>
                                {index > 0 && <Divider inset={spacing.md} />}
                                <MenuRow icon="flag" label={getReasonLabel(reason)} onPress={() => report(menu_comment, reason)} />
                            </View>
                        )) : (
                            <>
                                {menu_comment.level < MAX_REPLY_LEVEL && (
                                    <MenuRow icon="reply" label={t("Odpovedať")} onPress={() => {
                                        setReplyTo(menu_comment)
                                        setMenuComment(null)
                                    }} />
                                )}

                                {!is_own_menu_comment && (
                                    <>
                                        <Divider inset={spacing.md} />
                                        <MenuRow icon="flag" label={t("Nahlásiť")} onPress={() => setMenuView("report")} is_danger />
                                    </>
                                )}

                                {can_delete_menu_comment && (
                                    <>
                                        <Divider inset={spacing.md} />
                                        <MenuRow icon="trash" label={t("Odstrániť komentár")} onPress={() => remove(menu_comment)} is_danger />
                                    </>
                                )}
                            </>
                        )}
                    </Card>
                )}
            </Sheet>

            {state?.has_next && !state.is_loading_more && rows.length > 0 && (
                <View style={styles.more}>
                    <Button label={t("Načítať ďalšie komentáre")} variant="ghost" size="sm" onPress={loadMore} />
                </View>
            )}
        </Sheet>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    list_content: {
        flexGrow: 1,
        gap: spacing.lg,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
    },

    comment: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.md,
    },

    comment_body: {
        flex: 1,
        gap: spacing.xs,
    },

    comment_meta: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: spacing.md,
    },

    comment_side: {
        alignItems: "center",
        gap: 2,
    },

    like: {
        minHeight: 28,
        alignItems: "center",
        justifyContent: "center",
    },

    composer: {
        gap: spacing.xs,
    },

    reply_to: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.sm,
        backgroundColor: colors.surface_raised,
        borderRadius: radii.sm,
    },

    composer_row: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.sm,
    },

    loader: {
        paddingVertical: spacing.lg,
    },

    more: {
        alignItems: "center",
        paddingBottom: spacing.sm,
    },
})
