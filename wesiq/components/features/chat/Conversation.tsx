// One Conversation: A 1-On-1 DM (Opened By Username) Or A Group Chat (Opened By Room ID)

import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, FlatList, ListRenderItemInfo, Platform, Pressable, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { File as ExpoFile, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"
import { useTranslation } from "react-i18next"
import { Avatar, EmptyState, ErrorState, IconButton, Screen, Text } from "@/components/ui"
import { colors, layout, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { ChangedRoomResponse, getChat, getChatRoom, getChatSettings, sendVoiceMessage, toSharedPost, uploadChatAttachments } from "@/lib/api/endpoints/chat"
import { IS_MOCK_MODE } from "@/lib/api/mocks/install"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import { OutgoingChatAction, useChatSocket } from "./useChatSocket"
import MessageBubble, { getAttachmentUrl } from "./MessageBubble"
import Composer, { PendingAttachment } from "./Composer"
import MessageActionsSheet from "./MessageActionsSheet"
import ConversationMenuSheet from "./ConversationMenuSheet"
import GroupAvatar from "./GroupAvatar"
import GroupInfoSheet from "./GroupInfoSheet"
import SystemMessage, { GroupIntro } from "./SystemMessage"
import { toReplyPreview } from "./ReplyQuote"
import ImageViewer from "@/components/pages/chat/ImageViewer"
import { FullscreenVideoPlayer } from "@/components/pages/chat/FullscreenVideoPlayer"

import type { ApiError } from "@/types/api"
import type { ChatSocketTarget } from "@/lib/chat"
import type { Attachment, ChatMessage, ChatReceiver, ChatRoom, ChatRoomMember, ChatSocketEvent, MessageReaction, UserSummary } from "@/types/models"
import type { UploadableFile } from "@/lib/api/upload"

interface ConversationState {
    key:string, // Which Conversation The State Belongs To ("user:<username>" Or "room:<id>")
    receiver:ChatReceiver|null, // The Other Person (DMs)
    room:ChatRoom|null, // The Group (Group Chats)
    room_id:number|null, // The Room Of The Conversation (DMs Get It From The Server, Null On Servers Without Rooms)
    messages:ChatMessage[], // Newest First (The List Is Inverted)
    page:number,
    has_next:boolean,
    error:ApiError|null,
    is_removed:boolean // The Logged In User Was Removed From The Group (Read Only, No Socket)
}

export interface RecordedVoiceMessage {
    file:UploadableFile,
    duration:number,
    waveform:number[]
}

export type ConversationProps = { username:string, room_id?:undefined } | { room_id:number, username?:undefined }

const MAX_REACTIONS:number = 3 // The Server Keeps The Latest 3 Reactions Per Message

// Function For Get The Information If A Message Is A System Message
const isSystemMessage = (message:ChatMessage|undefined):boolean => message?.message_type === "system"

// Function For Get The Information If Two Messages Come From The Same Person (System Messages Break A Run)
const isSameSender = (first:ChatMessage|undefined, second:ChatMessage|undefined):boolean => {
    if(!first || !second || isSystemMessage(first) || isSystemMessage(second)) return false
    return first.is_sender === second.is_sender && (first.sender?.id ?? null) === (second.sender?.id ?? null)
}

// Function For Add A Message Unless It's Already In The List (The Socket And A REST Response Can Both Deliver It)
const prependMessage = (messages:ChatMessage[], message:ChatMessage):ChatMessage[] => {
    return messages.some((existing:ChatMessage) => existing.id === message.id) ? messages : [message, ...messages]
}

// Function For Take People Out Of The Group Members
const removeMembers = (room:ChatRoom, user_ids:number[]):ChatRoom => {
    const members:ChatRoomMember[] = room.members.filter((member:ChatRoomMember) => !user_ids.includes(member.id))
    return members.length === room.members.length ? room : { ...room, members, members_count: members.length }
}

// Function For Add People To The Group Members (Skips Those Already In It)
const addMembers = (room:ChatRoom, users:UserSummary[]):ChatRoom => {
    const known:Set<number> = new Set(room.members.map((member:ChatRoomMember) => member.id))
    const new_members:ChatRoomMember[] = users.filter((user:UserSummary) => !known.has(user.id)).map((user:UserSummary) => ({ ...user, first_name: null, last_name: null, role: "member" }))

    if(new_members.length === 0) return room
    return { ...room, members: [...room.members, ...new_members], members_count: room.members_count + new_members.length }
}

export default function Conversation({ username, room_id }:ConversationProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet

    const conversation_key:string = room_id !== undefined ? `room:${room_id}` : `user:${username}`

    const [state, setState] = useState<ConversationState|null>(null)
    const [is_loading_more, setIsLoadingMore] = useState<boolean>(false)
    const [background, setBackground] = useState<string|null>(null)
    const [draft, setDraft] = useState<string>("")
    const [attachments, setAttachments] = useState<PendingAttachment[]>([])
    const [voice_message, setVoiceMessage] = useState<RecordedVoiceMessage|null>(null) // Stores The Voice Message
    const [editing, setEditing] = useState<ChatMessage|null>(null)
    const [is_sending, setIsSending] = useState<boolean>(false)
    const [selected, setSelected] = useState<ChatMessage|null>(null)
    const [is_menu_open, setIsMenuOpen] = useState<boolean>(false)
    const [is_group_info_open, setIsGroupInfoOpen] = useState<boolean>(false)
    const [viewed_images, setViewedImages] = useState<{ urls:string[], index:number }|null>(null)
    const [viewed_video, setViewedVideo] = useState<string|null>(null)
    const [reply_on, setReplyOn] = useState<ChatMessage|null>(null) // Message Being Replied To
    const [highlighted_id, setHighlightedId] = useState<number|null>(null) // Message Briefly Highlighted After Jumping To It From A Reply
    const list_reference = useRef<FlatList<ChatMessage>>(null) // Scrolls To The Original Message Of A Reply
    const highlight_timeout = useRef<ReturnType<typeof setTimeout>|null>(null) // Removes The Highlight

    // Initializes The Cleanup Of The Highlight Timer
    useEffect(() => () => {
        if(highlight_timeout.current) clearTimeout(highlight_timeout.current)
    }, [])

    const current:ConversationState|null = state && state.key === conversation_key ? state : null // The Loaded Chat If It Belongs To The Route
    const receiver:ChatReceiver|null = current?.receiver ?? null
    const room:ChatRoom|null = current?.room ?? null
    const is_group:boolean = room?.is_group === true
    const is_loaded:boolean = receiver !== null || room !== null

    // Initializes The Load Of The First Page (State Is Set Only After The Response)
    useEffect(() => {
        if(!logged_in_user || (room_id === undefined && !username)) return

        const controller:AbortController = new AbortController()

        if(room_id !== undefined) {
            getChatRoom(room_id, 1, controller.signal).then((response) => {
                if(controller.signal.aborted) return

                setState(response.ok
                    ? { key: conversation_key, receiver: null, room: response.data.room, room_id, messages: response.data.chats, page: 1, has_next: response.data.has_next, error: null, is_removed: false }
                    : { key: conversation_key, receiver: null, room: null, room_id, messages: [], page: 1, has_next: false, error: response.error, is_removed: false })
            })
        }

        else if(username) {
            getChat(username, 1, controller.signal).then((response) => {
                if(controller.signal.aborted) return

                setState(response.ok
                    ? { key: conversation_key, receiver: response.data.receiver, room: null, room_id: response.data.room_id ?? null, messages: response.data.chats, page: 1, has_next: response.data.has_next, error: null, is_removed: false }
                    : { key: conversation_key, receiver: null, room: null, room_id: null, messages: [], page: 1, has_next: false, error: response.error, is_removed: false })
            })
        }

        return () => controller.abort()
    }, [conversation_key, username, room_id, logged_in_user])

    // Function For Load The Chat Background (DMs Only)
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
                    const member:ChatRoomMember|undefined = previous.room?.members.find((room_member:ChatRoomMember) => room_member.id === event.sender_id)

                    const sender:UserSummary = is_sender
                        ? { id: logged_in_user.id, username: logged_in_user.username, profile_picture_name: logged_in_user.profile_picture_name, subscription: logged_in_user.subscription }
                        : {
                            id: event.sender_id,
                            username: event.sender_username ?? member?.username ?? previous.receiver?.username ?? "",
                            profile_picture_name: event.sender_profile_picture_name,
                            subscription: member?.subscription ?? previous.receiver?.subscription ?? null,
                        }

                    const message:ChatMessage = {
                        id: event.chat_id,
                        room_id: event.room_id ?? previous.room_id,
                        message_type: event.message_type ?? "text",
                        sender,
                        content: event.message ?? "",
                        attachments: event.attachments ?? [],
                        post: toSharedPost(event.post), // A Plain Message Has "post": {}
                        voice_message: event.voice_message,
                        article: event.article,
                        is_read: false,
                        is_edited: false,
                        formatted_time: event.formatted_time ?? "",
                        is_sender,
                        message_reactions: [],
                        is_older_than_15_minutes: false,
                        is_older_than_1_day: false,
                        reply_on: event.reply_on ?? null
                    }

                    return { ...previous, messages: [message, ...previous.messages] }
                }

                // Members Added / Removed Or The Photo Changed: Shown As A Caption, The Room Updates
                case "system": {
                    const message_id:number = event.message_id ?? event.chat_id

                    const message:ChatMessage = {
                        id: message_id,
                        room_id: event.room_id ?? previous.room_id,
                        message_type: "system",
                        sender: { id: event.sender_id, username: "", profile_picture_name: null },
                        content: event.message ?? "",
                        attachments: [],
                        post: null,
                        voice_message: null,
                        article: null,
                        is_read: true,
                        is_edited: false,
                        formatted_time: event.formatted_time ?? "",
                        is_sender: event.sender_id === logged_in_user.id,
                        message_reactions: [],
                        is_older_than_15_minutes: true,
                        is_older_than_1_day: true
                    }

                    const removed_user_ids:number[] = event.removed_user_ids ?? []
                    let next_room:ChatRoom|null = previous.room ? removeMembers(addMembers(previous.room, event.added_users ?? []), removed_user_ids) : previous.room

                    if(next_room && event.avatar_changed) next_room = { ...next_room, avatar: event.avatar ?? null }

                    return {
                        ...previous,
                        room: next_room,
                        messages: prependMessage(previous.messages, message),
                        is_removed: previous.is_removed || removed_user_ids.includes(logged_in_user.id),
                    }
                }

                // Quotes Of The Edited Message Show The New Text Too
                case "edit": return {
                    ...previous,
                    messages: previous.messages.map((message:ChatMessage) => {
                        if(message.id === event.chat_id) return { ...message, content: event.message, is_edited: true }
                        if(message.reply_on?.id === event.chat_id) return { ...message, reply_on: { ...message.reply_on, content: event.message } }
                        return message
                    }),
                }

                // Replies To The Deleted Message Lose Their Quote (Same As The Server After A Reload)
                case "delete": return {
                    ...previous,
                    messages: previous.messages
                        .filter((message:ChatMessage) => message.id !== event.chat_id)
                        .map((message:ChatMessage) => message.reply_on?.id === event.chat_id ? { ...message, reply_on: null } : message),
                }

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

        if(event.action === "delete") setReplyOn((previous:ChatMessage|null) => previous?.id === event.chat_id ? null : previous) // Stops Replying To A Deleted Message
        if((event.action === "new" || event.action === "system") && logged_in_user && event.sender_id !== logged_in_user.id) send_reference.current({ action: "mark_as_read" })
    }, [logged_in_user])

    // Connects To The Room When Its ID Is Known (DMs And Groups), Otherwise To The DM By Username (Servers Without Rooms)
    const socket_target:ChatSocketTarget|null = current?.room_id ? { room_id: current.room_id } : username ? { username } : null
    const is_removed:boolean = current?.is_removed === true
    const socket = useChatSocket(socket_target, logged_in_user !== null && is_loaded && !is_removed, handleEvent) // A Removed Member Doesn't Reconnect (The Server Would Refuse)

    // Initializes The Update Of The Send Reference (The Event Handler Is Created Before The Socket)
    useEffect(() => {
        send_reference.current = socket.send
    }, [socket.send])

    // Function For Send A Mock Echo (Mock Mode Has No Server To Echo Messages Back)
    const echoInMockMode = (event:Omit<ChatSocketEvent, "sender_id"|"sender_profile_picture_name"|"attachments"|"post"|"voice_message"|"article"> & { attachments?:Attachment[] }):void => {
        if(!IS_MOCK_MODE || !logged_in_user) return
        handleEvent({ attachments: [], post: null, sender_id: logged_in_user.id, sender_profile_picture_name: logged_in_user.profile_picture_name, ...event } as ChatSocketEvent)
    }

    // ---------- Actions ----------

    // Function For Send, Edit Or Send Attachments
    const send = async ():Promise<void> => {
        const text:string = draft.trim() // Gets The Text
        const reply_on_id:number|undefined = reply_on?.id // Sent Only When Replying

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

            socket.send({ action: "send_attachment", attachment_ids: response.data.sent_attachments.map((attachment) => attachment.attachment_id), message: text || null, reply_on: reply_on_id })
            setAttachments([])
            setDraft("")
            setReplyOn(null)
            haptics.light()
            return
        }

        if(voice_message) {
            setIsSending(true)

            // Sends The Voice Message
            const response = await sendVoiceMessage({
                file: voice_message.file,
                duration: voice_message.duration,
                waveform: voice_message.waveform,
            })

            setIsSending(false)

            if(!response.ok) {
                haptics.error()
                showAlert(t("Chyba"), response.error.message)
                return
            }

            socket.send({
                action: "send_voice_message",
                voice_message_id: response.data.sent_voice_message.voice_message_id,
                message: text || null,
                reply_on: reply_on_id
            })

            setVoiceMessage(null)
            setReplyOn(null)
            haptics.light()
            return
        }

        if(!text) return

        if(socket.send({ action: "new", message: text, reply_on: reply_on_id })) {
            echoInMockMode({
                action: "new",
                chat_id: Date.now(),
                message: text,
                formatted_time: new Date().toTimeString().slice(0, 5),
                reply_on: reply_on ? toReplyPreview(reply_on) : null // The Server Sends Back The Quoted Preview, Not Just The ID
            })

            setDraft("")
            setReplyOn(null)
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
        const is_confirmed:boolean = await confirmAction({ title: t("Odstrániť správu?"), message: is_group ? t("Správa sa odstráni pre všetkých.") : t("Správa sa odstráni pre oboch."), confirm_label: t("Odstrániť"), is_destructive: true })
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

    // Function For Start Editing A Message (Long-Press Menu Or Swipe Left)
    const startEditing = (message:ChatMessage):void => {
        setReplyOn(null) // Editing And Replying Share The Banner Above The Input
        setEditing(message)
        setDraft(message.content ?? "")
    }

    // Function For Reply To A Message (Long-Press Menu Or Swipe Right)
    const replyOnMessage = (message:ChatMessage):void => {
        if(editing) {
            setEditing(null) // Leaves Editing, The Edited Text Isn't A Reply
            setDraft("")
        }

        setReplyOn(message)
    }

    // Function For Jump To The Original Message Of A Reply And Highlight It
    const jumpToMessage = (message_id:number):void => {
        const index:number = messages.findIndex((message:ChatMessage) => message.id === message_id)

        if(index === -1) {
            haptics.error()
            showAlert(t("Pôvodnú správu sa nepodarilo nájsť."), t("Je staršia ako načítané správy. Posuňte sa vyššie a skúste to znova."))
            return
        }

        list_reference.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true })
        haptics.selection()

        if(highlight_timeout.current) clearTimeout(highlight_timeout.current)
        setHighlightedId(message_id)
        highlight_timeout.current = setTimeout(() => setHighlightedId(null), 1600)
    }

    // Function For Load Older Messages
    const loadMore = async ():Promise<void> => {
        if(!current || !current.has_next || is_loading_more) return

        setIsLoadingMore(true)
        const response = room_id !== undefined ? await getChatRoom(room_id, current.page + 1) : username ? await getChat(username, current.page + 1) : null // Sends The Request
        setIsLoadingMore(false)

        if(!response?.ok) return

        setState((previous) => {
            if(!previous || previous.key !== conversation_key) return previous
            const known:Set<number> = new Set(previous.messages.map((message:ChatMessage) => message.id))
            return { ...previous, messages: [...previous.messages, ...response.data.chats.filter((message:ChatMessage) => !known.has(message.id))], page: previous.page + 1, has_next: response.data.has_next }
        })
    }

    // Function For Apply A Room Change Made Here (The Socket Usually Delivers The Same System Message Too)
    const applyRoomChange = (response:ChangedRoomResponse):void => {
        setState((previous) => {
            if(!previous || previous.key !== conversation_key) return previous
            return { ...previous, room: response.room, messages: prependMessage(previous.messages, response.system_message) }
        })
    }

    // ---------- Rendering ----------

    const messages:ChatMessage[] = current?.messages ?? []

    const [active_voice_id, setActiveVoiceId] = useState<number|null>(null)

    const toggleVoiceMessage = (voice_id:number):void => {
        setActiveVoiceId((prev_id:number|null) => prev_id === voice_id ? null : voice_id)
    }

    // The List Is Inverted: The Message Above Is The Next Item, The Message Below Is The Previous One
    const renderMessage = ({ item, index }:ListRenderItemInfo<ChatMessage>) => {
        if(isSystemMessage(item)) {
            const is_group_start:boolean = is_group && !!room && index === messages.length - 1 && !current?.has_next // The Oldest Message Of A Group Is "Group Created"
            if(is_group_start && room) return <GroupIntro room={room} text={item.content ?? ""} formatted_time={item.formatted_time} />

            return <SystemMessage text={item.content ?? ""} formatted_time={item.formatted_time} />
        }

        const is_grouped_with_previous:boolean = isSameSender(messages[index + 1], item)

        return (
            <MessageBubble
                message={item}
                is_grouped_with_previous={is_grouped_with_previous}
                is_voice_active={!!item.voice_message && active_voice_id === item.voice_message.id}
                onToggleVoice={toggleVoiceMessage}
                onLongPress={setSelected}
                onOpenImages={(urls:string[], image_index:number) => setViewedImages({ urls, index: image_index })}
                onOpenVideo={setViewedVideo}
                onOpenFile={openFile}
                onSwipeEdit={startEditing}
                onSwipeReply={replyOnMessage}
                onOpenReply={jumpToMessage}
                current_user_id={logged_in_user?.id ?? null}
                is_highlighted={highlighted_id === item.id}
                is_group={is_group}
                is_sender_name_visible={!is_grouped_with_previous}
                is_sender_avatar_visible={!isSameSender(item, messages[index - 1])}
            />
        )
    }

    const go_back = ():void => router.canGoBack() ? router.back() : router.replace("/chat")

    const header = is_group || room_id !== undefined ? (
        <View style={styles.header}>
            <IconButton icon="chevron-left" accessibility_label={t("Späť")} onPress={go_back} variant="soft" size={38} />

            <Pressable
                onPress={() => room && setIsGroupInfoOpen(true)}
                disabled={!room || is_removed}
                accessibilityRole="button"
                accessibilityLabel={room ? `${room.name ?? t("Skupina")}, ${t("Informácie o skupine")}` : t("Skupina")}
                style={styles.header_user}
            >
                {!!room && <GroupAvatar avatar={room.avatar} name={room.name} size={36} />}

                <View style={styles.flex}>
                    <Text variant="body_strong" numberOfLines={1}>{room?.name ?? t("Skupina")}</Text>
                    {room && is_removed && <Text variant="caption" color="text_muted">{t("Už nie ste členom")}</Text>}
                    {room && !is_removed && socket.status !== "open" && <Text variant="caption" color="warning">{t("Pripája sa...")}</Text>}
                    {room && !is_removed && socket.status === "open" && <Text variant="caption" color="text_muted">{t("Členovia: {{count}}", { count: room.members_count })}</Text>}
                </View>
            </Pressable>

            {!!room && !is_removed && <IconButton icon="circle-info" accessibility_label={t("Informácie o skupine")} onPress={() => setIsGroupInfoOpen(true)} variant="soft" size={38} />}
        </View>
    ) : (
        <View style={styles.header}>
            <IconButton icon="chevron-left" accessibility_label={t("Späť")} onPress={go_back} variant="soft" size={38} />

            <Pressable
                onPress={() => receiver && router.push({ pathname: "/profile/[username]", params: { username: receiver.username } })}
                accessibilityRole="button"
                accessibilityLabel={receiver ? `${receiver.username}, ${t("Zobraziť profil")}` : username}
                style={styles.header_user}
            >
                {!!receiver && <Avatar user={receiver} size={36} />}

                <View style={styles.flex}>
                    <Text variant="body_strong" numberOfLines={1}>{receiver?.username ?? username}</Text>
                    {socket.status !== "open" && receiver && <Text variant="caption" color="warning">{t("Pripája sa...")}</Text>}
                    {socket.status === "open" && receiver?.is_muted && <Text variant="caption" color="text_muted">{t("Stlmené")}</Text>}
                </View>
            </Pressable>

            {!!receiver && <IconButton icon="ellipsis" accessibility_label={t("Možnosti")} onPress={() => setIsMenuOpen(true)} variant="soft" size={38} />}
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

                footer={is_removed ? (
                    <View style={styles.removed}>
                        <Text variant="callout" color="text_secondary" style={styles.removed_text}>{t("Boli ste odstránení z tejto skupiny. Nové správy už neuvidíte.")}</Text>
                    </View>
                ) : is_loaded && !is_locked ? (
                    <Composer
                        value={draft}
                        onChange={setDraft}
                        attachments={attachments}
                        onAttachmentsChange={setAttachments}
                        onVoiceMessageUpdate={setVoiceMessage}
                        voice_message={voice_message}
                        editing={editing}
                        onCancelEdit={() => {
                            setEditing(null)
                            setDraft("")
                        }}
                        reply_on={reply_on ? toReplyPreview(reply_on) : null}
                        onCancelReply={() => setReplyOn(null)}
                        onSend={send}
                        is_sending={is_sending}
                        is_disabled={socket.status !== "open"}
                    />
                ) : undefined}
            >
                {!!background && !is_group && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Image source={{ uri: getAttachmentUrl(background) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <View style={styles.background_dim} />
                    </View>
                )}

                {!current ? (
                    <ActivityIndicator color={colors.spinner} style={styles.loader} />
                ) : current.error ? (
                    <ErrorState error={current.error} />
                ) : is_locked ? (
                    <EmptyState icon="lock" title={t("Účet používateľa je súkromný.")} />
                ) : (
                    <FlatList
                        ref={list_reference}
                        data={messages}
                        inverted
                        keyExtractor={(message:ChatMessage) => String(message.id)}
                        renderItem={renderMessage}
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.3}
                        onScrollToIndexFailed={(info) => {
                            list_reference.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true }) // Item Not Measured Yet: Gets Close First, Then Retries
                            setTimeout(() => list_reference.current?.scrollToIndex({ index: info.index, viewPosition: 0.5, animated: true }), 250)
                        }}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                        contentContainerStyle={styles.list_content}
                        ListFooterComponent={is_loading_more ? <ActivityIndicator color={colors.spinner} style={styles.loader} /> : undefined}
                        ListEmptyComponent={<View style={styles.empty}><EmptyState icon="hand" title={t("Povedzte ahoj")} message={is_group ? t("Toto je začiatok skupinovej konverzácie.") : t("Toto je začiatok vašej konverzácie.")} is_compact /></View>}
                    />
                )}
            </Screen>

            <MessageActionsSheet
                message={selected}
                current_username={logged_in_user.username}
                onClose={() => setSelected(null)}
                onReact={react}
                onEdit={startEditing}
                onReply={replyOnMessage}
                onDelete={deleteMessage}
            />

            {!!receiver && (
                <ConversationMenuSheet
                    visible={is_menu_open}
                    onClose={() => setIsMenuOpen(false)}
                    receiver={receiver}
                    onReceiverChange={(next:ChatReceiver) => setState((previous) => previous ? { ...previous, receiver: next } : previous)}
                    background_image={background}
                    onBackgroundChanged={() => loadBackground(receiver.id)}
                />
            )}

            {is_group && (
                <GroupInfoSheet
                    room={is_group_info_open && !is_removed ? room : null}
                    onClose={() => setIsGroupInfoOpen(false)}
                    onRoomChanged={applyRoomChange}
                />
            )}

            <ImageViewer
                images={(viewed_images?.urls ?? []).map((uri:string) => ({ uri }))}
                imageIndex={viewed_images?.index ?? 0}
                visible={viewed_images !== null}
                onRequestClose={() => setViewedImages(null)}
            />

            {!!viewed_video && <FullscreenVideoPlayer url={viewed_video} onClose={() => setViewedVideo(null)} />}
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

    removed: {
        paddingHorizontal: layout.screen_padding,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
        borderTopWidth: layout.hairline,
        borderTopColor: colors.divider,
        backgroundColor: colors.background_deep,
    },

    removed_text: {
        textAlign: "center",
    },

    empty: {
        flex: 1,
        transform: [{ scaleY: -1 }], // Undoes The Inverted List
        justifyContent: "center",
    },
})
