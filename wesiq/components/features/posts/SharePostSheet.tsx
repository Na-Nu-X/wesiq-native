// Share A Post: Send It To People You Follow In Chat, Copy The Link, Or Use The System Share Menu

import { useState } from "react"
import { FlatList, ListRenderItemInfo, Share, StyleSheet, View } from "react-native"
import * as Clipboard from "expo-clipboard"
import { useTranslation } from "react-i18next"
import { Button, Card, Divider, EmptyState, ErrorState, Icon, Sheet, Text, TextField, UserRow, UserRowSkeleton } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { DOMAIN } from "@/constants/general"
import { haptics } from "@/lib/haptics"
import { showAlert } from "@/lib/alert"
import { sharePostToChat, ShareResult } from "@/lib/chat"
import { apiGet } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isUserSummaryLike } from "@/lib/api/guards"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { formatUsername } from "@/lib/format"

import type { PostId, UserSummary } from "@/types/models"

export interface SharedPostInfo {
    id:PostId,
    author_username:string
}

interface SharePostSheetProps {
    post:SharedPostInfo|null, // Null = Closed
    onClose:() => void
}

type SendState = "sending"|"sent"|"failed"

const isFriendsResponse = envelopeWith<{ following:UserSummary[] }>({
    following: (value:unknown):value is UserSummary[] => isArrayOf(value, isUserSummaryLike),
})

// Function For Get The Public Link Of A Post
export const getPostLink = (post_id:PostId):string => `${DOMAIN}/sk/prispevok/${encodeURIComponent(post_id)}`

const SEARCH_THRESHOLD:number = 8

export default function SharePostSheet({ post, onClose }:SharePostSheetProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const [send_states, setSendStates] = useState<Record<number, SendState>>({}) // Stores The Send State Per Person
    const [search_query, setSearchQuery] = useState<string>("") // Stores The Search Query
    const [is_link_copied, setIsLinkCopied] = useState<boolean>(false) // Stores The Information If The Link Was Copied

    // Keeps The Last Post While The Sheet Animates Closed (Adjusted During Render) And Resets State For A New Post
    const [shown_post, setShownPost] = useState<SharedPostInfo|null>(post)

    if(post && post.id !== shown_post?.id) {
        setShownPost(post)
        setSendStates({})
        setSearchQuery("")
        setIsLinkCopied(false)
    }

    // Loads The People The User Follows (Only While The Sheet Is Open)
    const { state: friends_state, refetch } = useApiQuery(
        "share_post_friends",
        async (signal:AbortSignal) => {
            const response = await apiGet("get-friends/", { signal, guard: isFriendsResponse })
            return response.ok ? { ...response, data: response.data.following } : response
        },
        { is_enabled: post !== null && logged_in_user !== null }
    )

    if(!shown_post) return null

    const link:string = getPostLink(shown_post.id) // Gets The Link
    const normalized_query:string = search_query.trim().toLowerCase() // Gets The Query
    const friends:UserSummary[] = (friends_state.data ?? []).filter((friend:UserSummary) => friend.username.toLowerCase().includes(normalized_query)) // Gets The Filtered Friends

    // Function For Send The Post To One Person
    const sendTo = async (friend:UserSummary):Promise<void> => {
        if(!logged_in_user || send_states[friend.id] === "sending" || send_states[friend.id] === "sent") return

        setSendStates((previous) => ({ ...previous, [friend.id]: "sending" }))
        const result:ShareResult = await sharePostToChat(shown_post.id, friend.username, logged_in_user.id) // Sends The Post

        setSendStates((previous) => ({ ...previous, [friend.id]: result.ok ? "sent" : "failed" }))

        if(result.ok) haptics.success()

        else {
            haptics.error()
            showAlert(t("Chyba"), result.message)
        }
    }

    // Function For Copy The Link
    const copyLink = async ():Promise<void> => {
        try {
            await Clipboard.setStringAsync(link)
            haptics.success()
            setIsLinkCopied(true)
        }

        catch {
            showAlert(t("Chyba"), t("Odkaz sa nepodarilo skopírovať."))
        }
    }

    // Function For Open The System Share Menu (Falls Back To Copying On Browsers Without Web Share)
    const shareElsewhere = async ():Promise<void> => {
        const title:string = `Wesiq - ${t("Príspevok užívateľa")} ${shown_post.author_username}` // Gets The Title

        try {
            await Share.share({ title, message: `${title}\n${link}`, url: link })
        }

        catch {
            await copyLink()
        }
    }

    // Function For Render The Send Button
    const renderSendButton = (friend:UserSummary) => {
        const state:SendState|undefined = send_states[friend.id] // Gets The State

        if(state === "sent") return <Button label={t("Odoslané")} icon="check" size="sm" variant="secondary" onPress={() => {}} is_disabled />
        if(state === "failed") return <Button label={t("Skúsiť znova")} size="sm" variant="danger" onPress={() => sendTo(friend)} />
        return <Button label={t("Odoslať")} size="sm" onPress={() => sendTo(friend)} is_loading={state === "sending"} />
    }

    // Function For Render The People List Content When It Has No Rows
    const renderEmpty = () => {
        if(friends_state.status === "loading") return <View>{[0, 1, 2].map((index:number) => <UserRowSkeleton key={index} />)}</View>
        if(friends_state.status === "error") return <ErrorState error={friends_state.error} onRetry={refetch} is_compact />
        if(normalized_query) return <EmptyState icon="magnifying-glass" title={t("Nikto sa nenašiel")} is_compact />
        return <EmptyState icon="user-plus" title={t("Zatiaľ nikoho nesledujete")} message={t("Príspevok môžete poslať ľuďom, ktorých sledujete.")} is_compact />
    }

    return (
        <Sheet
            visible={post !== null}
            onClose={onClose}
            title={t("Zdieľať príspevok")}
            subtitle={formatUsername(shown_post.author_username)}
            size="large"
            is_scrollable={false}
        >
            <View style={styles.top}>
                <View style={styles.quick_actions}>
                    <Card padding="md" onPress={copyLink} accessibility_label={is_link_copied ? t("Odkaz skopírovaný") : t("Kopírovať odkaz")} style={styles.quick_action}>
                        <View style={[styles.quick_icon, is_link_copied ? styles.quick_icon_done : null]}>
                            <Icon name={is_link_copied ? "check" : "link"} size={16} color={is_link_copied ? "success" : "primary"} />
                        </View>

                        <Text variant="label" align="center">{is_link_copied ? t("Odkaz skopírovaný") : t("Kopírovať odkaz")}</Text>
                    </Card>

                    <Card padding="md" onPress={shareElsewhere} accessibility_label={t("Zdielať inde")} style={styles.quick_action}>
                        <View style={styles.quick_icon}>
                            <Icon name="share-nodes" size={16} color="primary" />
                        </View>

                        <Text variant="label" align="center">{t("Zdielať inde")}</Text>
                    </Card>
                </View>

                {!!logged_in_user && <Text variant="overline" color="text_muted">{t("Poslať v správe")}</Text>}

                {!!logged_in_user && (friends_state.data?.length ?? 0) >= SEARCH_THRESHOLD && (
                    <TextField
                        icon="magnifying-glass"
                        placeholder={t("Hľadať")}
                        accessibilityLabel={t("Hľadať")}
                        value={search_query}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                )}
            </View>

            {logged_in_user ? (
                <FlatList
                    data={friends}
                    keyExtractor={(friend:UserSummary) => String(friend.id)}
                    style={styles.list}
                    contentContainerStyle={styles.list_content}
                    keyboardShouldPersistTaps="handled"
                    ItemSeparatorComponent={() => <Divider inset={56} />}
                    ListEmptyComponent={renderEmpty}
                    renderItem={({ item }:ListRenderItemInfo<UserSummary>) => <UserRow user={item} trailing={renderSendButton(item)} />}
                />
            ) : (
                <View style={styles.list_content}>
                    <EmptyState icon="paper-plane" title={t("Prihláste sa")} message={t("Po prihlásení môžete príspevky posielať v správach.")} is_compact />
                </View>
            )}
        </Sheet>
    )
}

const styles = StyleSheet.create({
    top: {
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.sm,
    },

    quick_actions: {
        flexDirection: "row",
        gap: spacing.sm,
    },

    quick_action: {
        flex: 1,
        alignItems: "center",
        gap: spacing.sm,
    },

    quick_icon: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    quick_icon_done: {
        backgroundColor: colors.success_soft,
    },

    list: {
        flex: 1,
    },

    list_content: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
    },
})
