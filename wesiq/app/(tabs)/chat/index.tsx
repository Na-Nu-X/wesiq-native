// Messages: DMs And Group Chats In One List (Newest Activity First)

import { ReactNode, useCallback, useMemo, useState } from "react"
import { FlatList, ListRenderItemInfo, Pressable, StyleSheet, View } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { useTranslation } from "react-i18next"
import { Avatar, EmptyState, ErrorState, Header, IconButton, Screen, Text, TextField, UserRowSkeleton, ThemedRefreshControl } from "@/components/ui"
import { colors, layout, radii, spacing } from "@/theme"
import { apiGet } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isRecord } from "@/lib/api/guards"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import NotificationPrompt from "@/components/features/chat/NotificationPrompt"
import GroupAvatar from "@/components/features/chat/GroupAvatar"
import CreateGroupSheet from "@/components/features/chat/CreateGroupSheet"
import { isChatListRoom } from "@/lib/api/endpoints/chat"
import i18n from "@/lib/i18n"

import type { ChatListRoom, ChatPreview, ChatRoomLastMessage, UserSummary } from "@/types/models"

// One Row Of The List (A DM Or A Group Chat)
interface Conversation {
    key:string,
    title:string,
    preview:string,
    unread_count:number,
    avatar:ReactNode,
    open:() => void
}

const isChatPreview = (value:unknown):value is ChatPreview => isRecord(value) && typeof value.id === "number" && isRecord(value.sender) && typeof value.sender.username === "string" && (typeof value.content === "string" || value.content === null || value.content === undefined) // Older Servers Send Unread Chats Without "content"

// Checks If It Is Chats Response
const isChatsResponse = envelopeWith<{ unread_chats:ChatPreview[], read_chats:ChatPreview[], rooms?:ChatListRoom[] }>({
    unread_chats: (value:unknown):value is ChatPreview[] => isArrayOf(value, isChatPreview),
    read_chats: (value:unknown):value is ChatPreview[] => isArrayOf(value, isChatPreview),
    rooms: (value:unknown):value is ChatListRoom[]|undefined => value === undefined || isArrayOf(value, isChatListRoom), // Missing On Servers Without Rooms
})

// Function For Open A DM
const openDirectChat = (username:string):void => {
    router.push({ pathname: "/chat/[username]", params: { username } })
}

// Function For The Preview Text Of The Last Message
const getMessagePreview = (message:ChatRoomLastMessage|null):string => {
    if(!message) return ""

    switch(message.message_type) {
        case "system": return message.content ?? ""
        case "post": return i18n.t("Zdieľaný príspevok")
        case "article": return i18n.t("Zdieľaný článok")
        case "voice": return i18n.t("Hlasová správa")
        default: return message.content || (message.has_attachments ? i18n.t("Príloha") : "")
    }
}

// Function For Turn The Server's Rooms Into Rows (Group Previews Start With Who Wrote The Message)
const toConversations = (rooms:ChatListRoom[]):Conversation[] => rooms.flatMap((room:ChatListRoom):Conversation[] => {
    const preview:string = getMessagePreview(room.last_message) // Gets The Preview

    if(room.is_group) {
        const author:string|null = room.last_message && room.last_message.message_type !== "system" ? (room.last_message.is_sender ? i18n.t("Vy") : room.last_message.sender?.username ?? null) : null // Gets The Author
        const title:string = room.name || i18n.t("Skupina") // Gets The Title

        return [{
            key: `room:${room.room_id}`,
            title,
            preview: author && preview ? `${author}: ${preview}` : preview || i18n.t("Členovia: {{count}}", { count: room.members_count }),
            unread_count: room.unread_count,
            avatar: <GroupAvatar
                avatar = {room.avatar}
                name = {title}
                size = {50}
            />,
            open: () => router.push({ pathname: "/chat/group/[room_id]", params: { room_id: String(room.room_id) } }),
        }]
    }

    const user:UserSummary|null = room.user // Gets The User
    if(!user) return []

    return [{
        key: `room:${room.room_id}`,
        title: user.username,
        preview: room.last_message?.is_sender && preview ? `${i18n.t("Vy")}: ${preview}` : preview,
        unread_count: room.unread_count,
        avatar: <Avatar user = {user} size = {50} />,
        open: () => openDirectChat(user.username),
    }]
})

// Function For Group Messages Into One Row Per Person (Servers Without Rooms; Unread First, Then Read)
const groupConversations = (unread:ChatPreview[], read:ChatPreview[]):Conversation[] => {
    const by_user:Map<number, { user:UserSummary, preview:string, unread_count:number }> = new Map() // Gets The By User

    unread.forEach((message:ChatPreview) => {
        const existing = by_user.get(message.sender.id) // Gets The Existing
        by_user.set(message.sender.id, { user: message.sender, preview: existing?.preview ?? message.content ?? "", unread_count: (existing?.unread_count ?? 0) + 1 }) // Keeps The First (Newest) Message As The Preview
    })

    read.forEach((message:ChatPreview) => {
        if(by_user.has(message.sender.id)) return
        by_user.set(message.sender.id, { user: message.sender, preview: message.content ?? "", unread_count: 0 })
    })

    return [...by_user.values()]
        .sort((a, b) => Number(b.unread_count > 0) - Number(a.unread_count > 0))
        .map(({ user, preview, unread_count }):Conversation => ({
            key: `user:${user.id}`,
            title: user.username,
            preview,
            unread_count,
            avatar: <Avatar user = {user} size = {50} />,
            open: () => openDirectChat(user.username),
        }))
}

export default function ChatsScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet
    const [search, setSearch] = useState<string>("") // Stores The Search
    const [is_create_group_open, setIsCreateGroupOpen] = useState<boolean>(false) // Stores If It Is Create Group Open

    const { state, refetch, reload, is_refreshing } = useApiQuery("chats", (signal:AbortSignal) => apiGet("get-chats/", { signal, guard: isChatsResponse }), { is_enabled: logged_in_user !== null }) // Gets The State, Refetch, Reload And Is Refreshing

    // Initializes The Reload When The Tab Gets Focus Again (Returning From A Conversation Marks It As Read)
    useFocusEffect(useCallback(() => {
        if(logged_in_user) reload() // Silent, So The Pull-To-Refresh Spinner Doesn't Show On Every Visit
    }, [logged_in_user, reload]))

    // Gets The Conversations
    const conversations:Conversation[] = useMemo(() => {
        if(!state.data) return []
        return state.data.rooms ? toConversations(state.data.rooms) : groupConversations(state.data.unread_chats, state.data.read_chats)
    }, [state.data])

    const query:string = search.trim().toLowerCase() // Gets The Query
    const visible:Conversation[] = conversations.filter((conversation:Conversation) => conversation.title.toLowerCase().includes(query)) // Gets The Visible

    // Function For Render One Conversation
    const renderConversation = ({ item }:ListRenderItemInfo<Conversation>) => {
        const is_unread:boolean = item.unread_count > 0 // Checks If It Is Unread

        return (
            <Pressable
                onPress = {item.open}
                accessibilityRole = "button"
                accessibilityLabel = {is_unread ? `${item.title}, ${t("Neprečítané")}: ${item.unread_count}. ${item.preview}` : `${item.title}. ${item.preview}`}
                style = {({ pressed }) => [styles.row, pressed ? styles.row_pressed : null]}
            >
                {item.avatar}

                <View style = {styles.row_text}>
                    <Text variant = "body_strong" numberOfLines = {1}>{item.title}</Text>
                    <Text
                        variant = "callout"
                        color = {is_unread ? "text" : "text_secondary"}
                        numberOfLines = {1}
                        style = {is_unread ? styles.unread_preview : null}
                    >
                        {item.preview || t("Príloha")}
                    </Text>
                </View>

                {is_unread && (
                    <View style = {styles.badge}>
                        <Text
                            variant = "caption"
                            color = "on_primary"
                            is_tabular
                            style = {styles.badge_text}
                        >
                            {item.unread_count > 99 ? "99+" : item.unread_count}
                        </Text>
                    </View>
                )}
            </Pressable>
        )
    }

    if(!logged_in_user) {
        return (
            <Screen header = {<Header title = {t("Správy")} is_large />}>
                <EmptyState
                    icon = "comments"
                    title = {t("Prihláste sa")}
                    message = {t("Po prihlásení si môžete písať s ľuďmi, ktorých sledujete.")}
                    action = {{ label: t("Prihlásiť sa"), onPress: () => auth_sheet.open("login_form") }}
                />
            </Screen>
        )
    }

    return (
        <Screen
            is_scrollable = {false}
            is_padded = {false}
            header = {
                <Header
                    title = {t("Správy")}
                    is_large

                    right = {
                        <View style = {styles.header_actions}>
                            <IconButton
                                icon = "user-group"
                                accessibility_label = {t("Nová skupina")}
                                onPress = {() => setIsCreateGroupOpen(true)}
                                variant = "soft"
                                size = {38}
                            />
                            <IconButton
                                icon = "user-plus"
                                accessibility_label = {t("Hľadať ľudí")}
                                onPress = {() => router.push("/users")}
                                variant = "soft"
                                size = {38}
                            />
                        </View>
                    }
                />
            }
        >
            <FlatList
                data = {visible}
                keyExtractor = {(conversation:Conversation) => conversation.key}
                renderItem = {renderConversation}
                refreshControl = {<ThemedRefreshControl refreshing = {is_refreshing} onRefresh = {refetch} />}
                keyboardShouldPersistTaps = "handled"
                keyboardDismissMode = "on-drag"
                contentContainerStyle = {styles.list_content}

                ListHeaderComponent = {
                    <>
                        <NotificationPrompt />

                        {(conversations.length > 0 || search) ? (
                            <TextField
                                icon = "magnifying-glass"
                                placeholder = {t("Hľadať v správach")}
                                accessibilityLabel = {t("Hľadať v správach")}
                                value = {search}
                                onChangeText = {setSearch}
                                autoCapitalize = "none"
                                autoCorrect = {false}
                                container_style = {styles.search}
                            />
                        ) : null}
                    </>
                }

                ListEmptyComponent = {
                    state.status === "loading" ? <View>{[0, 1, 2, 3].map((index:number) => <UserRowSkeleton key = {index} />)}</View>
                    : state.status === "error" ? <ErrorState error = {state.error} onRetry = {refetch} />
                    : query ? <EmptyState
                        icon = "magnifying-glass"
                        title = {t("Nikto sa nenašiel")}
                        is_compact
                    />
                    : <EmptyState
                        icon = "comments"
                        title = {t("Zatiaľ žiadne správy")}
                        message = {t("Napíšte niekomu z jeho profilu tlačidlom Správa.")}
                        action = {{ label: t("Hľadať ľudí"), onPress: () => router.push("/users") }}
                    />
                }
            />

            <CreateGroupSheet visible = {is_create_group_open} onClose = {() => setIsCreateGroupOpen(false)} />
        </Screen>
    )
}

const styles = StyleSheet.create({
    header_actions: {
        flexDirection: "row",
        gap: spacing.sm,
    },

    list_content: {
        flexGrow: 1,
        paddingHorizontal: layout.screen_padding,
        paddingBottom: spacing.xxl,
    },

    search: {
        marginBottom: spacing.sm,
    },

    row: {
        minHeight: 72,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        marginHorizontal: -spacing.sm,
        borderRadius: radii.md,
    },

    row_pressed: {
        backgroundColor: colors.surface_pressed,
    },

    row_text: {
        flex: 1,
        gap: 2,
    },

    unread_preview: {
        fontWeight: "600",
    },

    badge: {
        minWidth: 22,
        height: 22,
        paddingHorizontal: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary_solid,
        borderRadius: radii.pill,
    },

    badge_text: {
        fontWeight: "700",
    },
})
