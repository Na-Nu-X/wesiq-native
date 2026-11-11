// Messages: Conversations (Unread First)

import { useCallback, useMemo, useState } from "react"
import { FlatList, ListRenderItemInfo, Pressable, StyleSheet, View } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { useTranslation } from "react-i18next"
import { Avatar, EmptyState, ErrorState, Header, IconButton, Screen, Text, TextField, UserRowSkeleton } from "@/components/ui"
import { colors, layout, radii, spacing } from "@/theme"
import { apiGet } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isRecord } from "@/lib/api/guards"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"

import type { ChatPreview, UserSummary } from "@/types/models"

interface Conversation {
    user:UserSummary,
    preview:string,
    unread_count:number
}

const isChatPreview = (value:unknown):value is ChatPreview => isRecord(value) && typeof value.id === "number" && isRecord(value.sender) && typeof value.sender.username === "string" && typeof value.content === "string"

const isChatsResponse = envelopeWith<{ unread_chats:ChatPreview[], read_chats:ChatPreview[] }>({
    unread_chats: (value:unknown):value is ChatPreview[] => isArrayOf(value, isChatPreview),
    read_chats: (value:unknown):value is ChatPreview[] => isArrayOf(value, isChatPreview),
})

// Function For Group Messages Into One Row Per Person (Unread First, Then Read)
const groupConversations = (unread:ChatPreview[], read:ChatPreview[]):Conversation[] => {
    const by_user:Map<number, Conversation> = new Map()

    unread.forEach((message:ChatPreview) => {
        const existing:Conversation|undefined = by_user.get(message.sender.id)
        by_user.set(message.sender.id, { user: message.sender, preview: message.content, unread_count: (existing?.unread_count ?? 0) + 1 })
    })

    read.forEach((message:ChatPreview) => {
        if(by_user.has(message.sender.id)) return
        by_user.set(message.sender.id, { user: message.sender, preview: message.content, unread_count: 0 })
    })

    return [...by_user.values()].sort((a:Conversation, b:Conversation) => Number(b.unread_count > 0) - Number(a.unread_count > 0))
}

export default function ChatsScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet
    const [search, setSearch] = useState<string>("") // Stores The Search

    const { state, refetch, is_refreshing } = useApiQuery("chats", (signal:AbortSignal) => apiGet("get-chats/", { signal, guard: isChatsResponse }), { is_enabled: logged_in_user !== null })

    // Initializes The Reload When The Tab Gets Focus Again (Returning From A Conversation Marks It As Read)
    useFocusEffect(useCallback(() => {
        if(logged_in_user) refetch()
    }, [logged_in_user, refetch]))

    const conversations:Conversation[] = useMemo(() => state.data ? groupConversations(state.data.unread_chats, state.data.read_chats) : [], [state.data])
    const query:string = search.trim().toLowerCase() // Gets The Query
    const visible:Conversation[] = conversations.filter((conversation:Conversation) => conversation.user.username.toLowerCase().includes(query))

    // Function For Render One Conversation
    const renderConversation = ({ item }:ListRenderItemInfo<Conversation>) => {
        const is_unread:boolean = item.unread_count > 0

        return (
            <Pressable
                onPress={() => router.push({ pathname: "/chat/[username]", params: { username: item.user.username } })}
                accessibilityRole="button"
                accessibilityLabel={is_unread ? `${item.user.username}, ${t("Neprečítané")}: ${item.unread_count}. ${item.preview}` : `${item.user.username}. ${item.preview}`}
                style={({ pressed }) => [styles.row, pressed ? styles.row_pressed : null]}
            >
                <Avatar user={item.user} size={50} />

                <View style={styles.row_text}>
                    <Text variant="body_strong" numberOfLines={1}>{item.user.username}</Text>
                    <Text variant="callout" color={is_unread ? "text" : "text_secondary"} numberOfLines={1} style={is_unread ? styles.unread_preview : null}>
                        {item.preview || t("Príloha")}
                    </Text>
                </View>

                {is_unread && (
                    <View style={styles.badge}>
                        <Text variant="caption" color="on_primary" is_tabular style={styles.badge_text}>{item.unread_count > 99 ? "99+" : item.unread_count}</Text>
                    </View>
                )}
            </Pressable>
        )
    }

    if(!logged_in_user) {
        return (
            <Screen header={<Header title={t("Správy")} is_large />}>
                <EmptyState icon="comments" title={t("Prihláste sa")} message={t("Po prihlásení si môžete písať s ľuďmi, ktorých sledujete.")} action={{ label: t("Prihlásiť sa"), onPress: () => auth_sheet.open("login_form") }} />
            </Screen>
        )
    }

    return (
        <Screen
            is_scrollable={false}
            is_padded={false}
            header={<Header title={t("Správy")} is_large right={<IconButton icon="user-plus" accessibility_label={t("Hľadať ľudí")} onPress={() => router.push("/users")} variant="soft" size={38} />} />}
        >
            <FlatList
                data={visible}
                keyExtractor={(conversation:Conversation) => String(conversation.user.id)}
                renderItem={renderConversation}
                refreshing={is_refreshing}
                onRefresh={refetch}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.list_content}

                ListHeaderComponent={conversations.length > 0 || search ? (
                    <TextField
                        icon="magnifying-glass"
                        placeholder={t("Hľadať v správach")}
                        accessibilityLabel={t("Hľadať v správach")}
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                        autoCorrect={false}
                        container_style={styles.search}
                    />
                ) : undefined}

                ListEmptyComponent={
                    state.status === "loading" ? <View>{[0, 1, 2, 3].map((index:number) => <UserRowSkeleton key={index} />)}</View>
                    : state.status === "error" ? <ErrorState error={state.error} onRetry={refetch} />
                    : query ? <EmptyState icon="magnifying-glass" title={t("Nikto sa nenašiel")} is_compact />
                    : <EmptyState icon="comments" title={t("Zatiaľ žiadne správy")} message={t("Napíšte niekomu z jeho profilu tlačidlom Správa.")} action={{ label: t("Hľadať ľudí"), onPress: () => router.push("/users") }} />
                }
            />
        </Screen>
    )
}

const styles = StyleSheet.create({
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
