// Conversation With One User

import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, FlatList, ListRenderItemInfo, Platform, Pressable, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { router, useLocalSearchParams } from "expo-router"
import { File as ExpoFile, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { useTranslation } from "react-i18next"
import { Avatar, EmptyState, ErrorState, IconButton, Screen, Text } from "@/components/ui"
import { colors, layout, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { getChat, getChatSettings, uploadChatAttachments } from "@/lib/api/endpoints/chat"
import { IS_MOCK_MODE } from "@/lib/api/mocks/install"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import { OutgoingChatAction, useChatSocket } from "@/components/features/chat/useChatSocket"
import MessageBubble, { getAttachmentUrl } from "@/components/features/chat/MessageBubble"
import Composer, { PendingAttachment } from "@/components/features/chat/Composer"
import MessageActionsSheet from "@/components/features/chat/MessageActionsSheet"
import ConversationMenuSheet from "@/components/features/chat/ConversationMenuSheet"
import ImageViewer from "@/components/pages/chat/ImageViewer"
import { FullscreenVideoPlayer } from "@/components/pages/chat/FullscreenVideoPlayer"

import type { ApiError } from "@/types/api"
import type { Attachment, ChatMessage, ChatReceiver, ChatSocketEvent, MessageReaction } from "@/types/models"

interface ConversationState {
    username:string,
    receiver:ChatReceiver|null,
    messages:ChatMessage[], // Newest First (The List Is Inverted)
    page:number,
    has_next:boolean,
    error:ApiError|null
}

const MAX_REACTIONS:number = 3 // The Server Keeps The Latest 3 Reactions Per Message

export default function ConversationScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { username } = useLocalSearchParams<{ username:string }>() // Gets The Username
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet

    const [state, setState] = useState<ConversationState|null>(null)
    const [is_loading_more, setIsLoadingMore] = useState<boolean>(false)
    const [background, setBackground] = useState<string|null>(null)
    const [draft, setDraft] = useState<string>("")
    const [attachments, setAttachments] = useState<PendingAttachment[]>([])
    const [editing, setEditing] = useState<ChatMessage|null>(null)
    const [is_sending, setIsSending] = useState<boolean>(false)
    const [selected, setSelected] = useState<ChatMessage|null>(null)
    const [is_menu_open, setIsMenuOpen] = useState<boolean>(false)
    const [viewed_images, setViewedImages] = useState<{ urls:string[], index:number }|null>(null)
    const [viewed_video, setViewedVideo] = useState<string|null>(null)

    const current:ConversationState|null = state && state.username === username ? state : null // The Loaded Chat If It Belongs To The Route
    const receiver:ChatReceiver|null = current?.receiver ?? null

    // Initializes The Load Of The First Page (State Is Set Only After The Response)
    useEffect(() => {
        if(!username || !logged_in_user) return

        const controller:AbortController = new AbortController()

        getChat(username, 1, controller.signal).then((response) => {
            if(controller.signal.aborted) return

            setState(response.ok
                ? { username, receiver: response.data.receiver, messages: response.data.chats, page: 1, has_next: response.data.has_next, error: null }
                : { username, receiver: null, messages: [], page: 1, has_next: false, error: response.error })
        })

        return () => controller.abort()
    }, [username, logged_in_user])

    // Function For Load The Chat Background
    const loadBackground = useCallback(async (receiver_id:number):Promise<void> => {
        const response = await getChatSettings(receiver_id) // Sends The Request
        setBackground(response.ok ? response.data.chat_settings?.background_image ?? null : null)
    }, [])

    const receiver_id:number|null = receiver?.id ?? null

    // Initializes The Load Of The Background When The Receiver Is Known
    useEffect(() => {
        if(receiver_id === null) return

        getChatSettings(receiver_id).then((response) => {
            setBackground(response.ok ? response.data.chat_settings?.background_image ?? null : null)
        })
    }, [receiver_id])

    // ---------- Socket ----------

    const send_reference = useRef<(payload:OutgoingChatAction) => boolean>(() => false) // Sends Through The Socket From The Event Handler

    // Function For Apply An Event From The Server
    const handleEvent = useCallback((event:ChatSocketEvent):void => {
        setState((previous:ConversationState|null) => {
            if(!previous || !logged_in_user) return previous

            const updateMessage = (chat_id:number, update:(message:ChatMessage) => ChatMessage):ConversationState => ({
                ...previous,
                messages: previous.messages.map((message:ChatMessage) => message.id === chat_id ? update(message) : message),
            })

            switch(event.action) {
                case "new": {
                    if(previous.messages.some((message:ChatMessage) => message.id === event.chat_id)) return previous

                    const is_sender:boolean = event.sender_id === logged_in_user.id
                    const sender = is_sender
                        ? { id: logged_in_user.id, username: logged_in_user.username, profile_picture_name: logged_in_user.profile_picture_name, subscription: logged_in_user.subscription }
                        : { id: event.sender_id, username: previous.receiver?.username ?? "", profile_picture_name: event.sender_profile_picture_name, subscription: previous.receiver?.subscription ?? null }

                    const message:ChatMessage = {
                        id: event.chat_id,
                        sender,
                        content: event.message ?? "",
                        attachments: event.attachments ?? [],
                        is_read: false,
                        is_edited: false,
                        formatted_time: event.formatted_time ?? "",
                        is_sender,
                        message_reactions: [],
                        is_older_than_15_minutes: false,
                        is_older_than_1_day: false,
                        post: event.post ?? null,
                    }

                    return { ...previous, messages: [message, ...previous.messages] }
                }

                case "edit": return updateMessage(event.chat_id, (message) => ({ ...message, content: event.message, is_edited: true }))
                case "delete": return { ...previous, messages: previous.messages.filter((message:ChatMessage) => message.id !== event.chat_id) }

                case "add_reaction": return updateMessage(event.chat_id, (message) => {
                    const emoji:string = event.emoji ?? ""
                    const reaction_username:string = event.emoji_sender_username ?? ""
                    const exists:boolean = message.message_reactions.some((reaction:MessageReaction) => reaction.emoji === emoji && reaction.user.username === reaction_username)
                    if(exists) return message

                    const next:MessageReaction[] = [...message.message_reactions, { emoji, user: { username: reaction_username } }]
                    return { ...message, message_reactions: next.slice(-MAX_REACTIONS) }
                })

                // The Server Doesn't Say Who Removed It, So Every Reaction With That Emoji Goes (Same As Before)
                case "remove_reaction": return updateMessage(event.chat_id, (message) => ({ ...message, message_reactions: message.message_reactions.filter((reaction:MessageReaction) => reaction.emoji !== event.emoji) }))

                default: return previous
            }
        })

        if(event.action === "new" && logged_in_user && event.sender_id !== logged_in_user.id) send_reference.current({ action: "mark_as_read" })
    }, [logged_in_user])

    const socket = useChatSocket(username, logged_in_user !== null && receiver !== null, handleEvent)

    // Initializes The Update Of The Send Reference (The Event Handler Is Created Before The Socket)
    useEffect(() => {
        send_reference.current = socket.send
    }, [socket.send])

    // Function For Send A Mock Echo (Mock Mode Has No Server To Echo Messages Back)
    const echoInMockMode = (event:Omit<ChatSocketEvent, "sender_id"|"sender_profile_picture_name"|"attachments"|"post"> & { attachments?:Attachment[] }):void => {
        if(!IS_MOCK_MODE || !logged_in_user) return
        handleEvent({ attachments: [], post: null, sender_id: logged_in_user.id, sender_profile_picture_name: logged_in_user.profile_picture_name, ...event } as ChatSocketEvent)
    }

    // ---------- Actions ----------

    // Function For Send, Edit Or Send Attachments
    const send = async ():Promise<void> => {
        const text:string = draft.trim() // Gets The Text

        if(editing) {
            if(!text) return
            if(socket.send({ action: "edit", chat_id: editing.id, message: text })) {
                echoInMockMode({ action: "edit", chat_id: editing.id, message: text })
                setEditing(null)
                setDraft("")
            }

            else showAlert(t("Chyba"), t("Spojenie sa neočakávane prerušilo."))
            return
        }

        if(attachments.length > 0) {
            setIsSending(true)
            const response = await uploadChatAttachments(attachments) // Uploads The Files
            setIsSending(false)

            if(!response.ok) {
                haptics.error()
                showAlert(t("Chyba"), response.error.message)
                return
            }

            socket.send({ action: "send_attachment", attachment_ids: response.data.sent_attachments.map((attachment) => attachment.attachment_id), message: text || null })
            setAttachments([])
            setDraft("")
            haptics.light()
            return
        }

        if(!text) return

        if(socket.send({ action: "new", message: text })) {
            echoInMockMode({ action: "new", chat_id: Date.now(), message: text, formatted_time: new Date().toTimeString().slice(0, 5) })
            setDraft("")
            haptics.light()
        }

        else showAlert(t("Chyba"), t("Spojenie sa neočakávane prerušilo."))
    }

    // Function For React (Tapping Your Own Reaction Again Removes It)
    const react = (message:ChatMessage, emoji:string):void => {
        const is_mine:boolean = message.message_reactions.some((reaction:MessageReaction) => reaction.emoji === emoji && reaction.user.username === logged_in_user?.username)
        socket.send({ action: is_mine ? "remove_reaction" : "add_reaction", chat_id: message.id, emoji })
        echoInMockMode(is_mine ? { action: "remove_reaction", chat_id: message.id, message: "", emoji } : { action: "add_reaction", chat_id: message.id, message: "", emoji, emoji_sender_username: logged_in_user?.username })
    }

    // Function For Delete A Message
    const deleteMessage = async (message:ChatMessage):Promise<void> => {
        const is_confirmed:boolean = await confirmAction({ title: t("Odstrániť správu?"), message: t("Správa sa odstráni pre oboch."), confirm_label: t("Odstrániť"), is_destructive: true })
        if(!is_confirmed) return

        socket.send({ action: "delete", chat_id: message.id })
        echoInMockMode({ action: "delete", chat_id: message.id, message: "" })
    }

    // Function For Open A File (Web: New Tab, Native: Download And Share)
    const openFile = async (attachment:Attachment):Promise<void> => {
        const url:string|null = getAttachmentUrl(attachment.attachment_url) // Gets The Full URL (The Old Code Missed The Domain)
        if(!url) return

        if(Platform.OS === "web") {
            window.open(url, "_blank", "noopener")
            return
        }

        try {
            const file:ExpoFile = await ExpoFile.downloadFileAsync(url, new ExpoFile(Paths.cache, attachment.original_filename))
            if(await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { dialogTitle: t("Uložiť súbor") })
        }

        catch {
            showAlert(t("Chyba"), t("Pri sťahovaní súboru došlo k chybe."))
        }
    }

    // Function For Load Older Messages
    const loadMore = async ():Promise<void> => {
        if(!current || !current.has_next || is_loading_more || !username) return

        setIsLoadingMore(true)
        const response = await getChat(username, current.page + 1) // Sends The Request
        setIsLoadingMore(false)

        if(!response.ok) return

        setState((previous) => {
            if(!previous || previous.username !== username) return previous
            const known:Set<number> = new Set(previous.messages.map((message:ChatMessage) => message.id))
            return { ...previous, messages: [...previous.messages, ...response.data.chats.filter((message:ChatMessage) => !known.has(message.id))], page: previous.page + 1, has_next: response.data.has_next }
        })
    }

    // ---------- Rendering ----------

    const messages:ChatMessage[] = current?.messages ?? []

    const renderMessage = ({ item, index }:ListRenderItemInfo<ChatMessage>) => (
        <MessageBubble
            message={item}
            is_grouped_with_previous={messages[index + 1]?.is_sender === item.is_sender} // The List Is Inverted, So The Message Above Is The Next Item
            onLongPress={setSelected}
            onOpenImages={(urls:string[], image_index:number) => setViewedImages({ urls, index: image_index })}
            onOpenVideo={setViewedVideo}
            onOpenFile={openFile}
        />
    )

    const header = (
        <View style={styles.header}>
            <IconButton icon="chevron-left" accessibility_label={t("Späť")} onPress={() => router.canGoBack() ? router.back() : router.replace("/chat")} variant="soft" size={38} />

            <Pressable
                onPress={() => receiver && router.push({ pathname: "/profile/[username]", params: { username: receiver.username } })}
                accessibilityRole="button"
                accessibilityLabel={receiver ? `${receiver.username}, ${t("Zobraziť profil")}` : username}
                style={styles.header_user}
            >
                {receiver && <Avatar user={receiver} size={36} />}

                <View style={styles.flex}>
                    <Text variant="body_strong" numberOfLines={1}>{receiver?.username ?? username}</Text>
                    {socket.status !== "open" && receiver && <Text variant="caption" color="warning">{t("Pripája sa...")}</Text>}
                    {socket.status === "open" && receiver?.is_muted && <Text variant="caption" color="text_muted">{t("Stlmené")}</Text>}
                </View>
            </Pressable>

            {receiver && <IconButton icon="ellipsis" accessibility_label={t("Možnosti")} onPress={() => setIsMenuOpen(true)} variant="soft" size={38} />}
        </View>
    )

    if(!logged_in_user) {
        return (
            <Screen header={header}>
                <EmptyState icon="comments" title={t("Prihláste sa")} message={t("Po prihlásení si môžete písať s ľuďmi, ktorých sledujete.")} action={{ label: t("Prihlásiť sa"), onPress: () => auth_sheet.open("login_form") }} />
            </Screen>
        )
    }

    const is_locked:boolean = receiver !== null && receiver.private_account && !receiver.has_follow && (current?.messages.length ?? 0) === 0 // Same Rule As Before: New Conversations With Private Accounts Need A Follow

    return (
        <>
            <Screen
                header={header}
                is_scrollable={false}
                is_padded={false}
                is_keyboard_aware
                has_glow={!background}
                edges={["top", "left", "right"]}

                footer={receiver && !is_locked ? (
                    <Composer
                        value={draft}
                        onChange={setDraft}
                        attachments={attachments}
                        onAttachmentsChange={setAttachments}
                        editing={editing}
                        onCancelEdit={() => {
                            setEditing(null)
                            setDraft("")
                        }}
                        onSend={send}
                        is_sending={is_sending}
                        is_disabled={socket.status !== "open"}
                    />
                ) : undefined}
            >
                {background && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Image source={{ uri: getAttachmentUrl(background) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <View style={styles.background_dim} />
                    </View>
                )}

                {!current ? (
                    <ActivityIndicator color={colors.primary} style={styles.loader} />
                ) : current.error ? (
                    <ErrorState error={current.error} />
                ) : is_locked ? (
                    <EmptyState icon="lock" title={t("Účet používateľa je súkromný.")} />
                ) : (
                    <FlatList
                        data={messages}
                        inverted
                        keyExtractor={(message:ChatMessage) => String(message.id)}
                        renderItem={renderMessage}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.3}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                        contentContainerStyle={styles.list_content}
                        ListFooterComponent={is_loading_more ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : undefined}
                        ListEmptyComponent={<View style={styles.empty}><EmptyState icon="hand" title={t("Povedzte ahoj")} message={t("Toto je začiatok vašej konverzácie.")} is_compact /></View>}
                    />
                )}
            </Screen>

            <MessageActionsSheet
                message={selected}
                current_username={logged_in_user.username}
                onClose={() => setSelected(null)}
                onReact={react}
                onEdit={(message:ChatMessage) => {
                    setEditing(message)
                    setDraft(message.content)
                }}
                onDelete={deleteMessage}
            />

            {receiver && (
                <ConversationMenuSheet
                    visible={is_menu_open}
                    onClose={() => setIsMenuOpen(false)}
                    receiver={receiver}
                    onReceiverChange={(next:ChatReceiver) => setState((previous) => previous ? { ...previous, receiver: next } : previous)}
                    background_image={background}
                    onBackgroundChanged={() => loadBackground(receiver.id)}
                />
            )}

            <ImageViewer
                images={(viewed_images?.urls ?? []).map((uri:string) => ({ uri }))}
                imageIndex={viewed_images?.index ?? 0}
                visible={viewed_images !== null}
                onRequestClose={() => setViewedImages(null)}
            />

            {viewed_video && <FullscreenVideoPlayer url={viewed_video} onClose={() => setViewedVideo(null)} />}
        </>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    header: {
        minHeight: layout.header_height,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: layout.screen_padding,
        borderBottomWidth: layout.hairline,
        borderBottomColor: colors.divider,
    },

    header_user: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    background_dim: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(6, 11, 24, 0.72)",
    },

    list_content: {
        flexGrow: 1,
        paddingHorizontal: layout.screen_padding,
        paddingVertical: spacing.md,
    },

    loader: {
        paddingVertical: spacing.xl,
    },

    empty: {
        flex: 1,
        transform: [{ scaleY: -1 }], // Undoes The Inverted List
        justifyContent: "center",
    },
})
