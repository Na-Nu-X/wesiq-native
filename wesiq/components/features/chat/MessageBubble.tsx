// One Chat Message (Text, Attachments, Shared Post, Reactions, Time, Edited And Read State)

import { memo } from "react"
import { Platform, Pressable, StyleSheet, View } from "react-native"
import { GestureDetector, usePanGesture } from "react-native-gesture-handler"
import Animated, { FadeIn, FadeOut, interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Avatar, Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { DOMAIN } from "@/constants/general"
import { getMediaUrl } from "@/lib/media"
import { getReadableSize } from "@/utils/getReadableSize"
import { formatUsername } from "@/lib/format"
import { haptics } from "@/lib/haptics"
import { canEditMessage } from "./MessageActionsSheet"
import { toSharedPost } from "@/lib/api/endpoints/chat"

import { getArticleImageUrl } from "@/lib/api/endpoints/blog"
import { getFormattedDate } from "@/utils/time"
import VoiceMessagePlayer from "./VoiceMessagePlayer"
import ReplyQuote from "./ReplyQuote"

import type { IconName } from "@/components/ui"
import type { Article, Attachment, AttachmentType, ChatMessage, ChatReplyPreview, MessageReaction, SharedPost, VoiceMessage } from "@/types/models"

// Function For Get The Full URL Of An Attachment (The Server Returns Paths Like "/media/...")
export const getAttachmentUrl = (path:string|null|undefined):string|null => {
    if(!path) return null
    return /^https?:\/\//.test(path) ? path : `${DOMAIN}${path.startsWith("/") ? "" : "/"}${path}`
}

// Defines The File Icons
const FILE_ICONS:Record<AttachmentType, IconName> = {
    image: "image",
    video: "film",
    audio: "music",
    pdf: "file-pdf",
    doc: "file-word",
    excel: "file-excel",
    powerpoint: "file-powerpoint",
    archive: "file-zipper",
    text: "file-lines",
    file: "file",
}

interface MessageBubbleProps {
    message:ChatMessage,
    is_grouped_with_previous:boolean, // Same Sender As The Message Above (Smaller Gap, No Repeated Time)
    is_voice_active:boolean,
    onToggleVoice:(voice_id:number) => void,
    onLongPress:(message:ChatMessage) => void,
    onOpenImages:(urls:string[], index:number) => void,
    onOpenVideo:(url:string) => void,
    onOpenFile:(attachment:Attachment) => void,
    onSwipeEdit?:(message:ChatMessage) => void, // Swipe Left Starts Editing An Own Message (Same Rule As The Menu)
    onSwipeReply?:(message:ChatMessage) => void, // Swipe Right Replies To Any Message
    onOpenReply?:(reply_id:number) => void, // Tapping The Quote Jumps To The Original Message
    current_user_id?:number|null, // Shows "You" In Quotes Of Own Messages
    is_highlighted?:boolean, // Briefly Highlighted After Jumping To It From A Reply
    is_group?:boolean, // Group Chat: Shows Who Wrote Incoming Messages, Hides Read Receipts (They Are Per Person In DMs Only)
    is_sender_name_visible?:boolean, // Group Chat: First Message Of A Run From One Sender (Shows The Username Above It)
    is_sender_avatar_visible?:boolean // Group Chat: Last Message Of A Run From One Sender (Shows The Avatar Next To It)
}

const GROUP_AVATAR_SIZE:number = 28 // Avatar Next To Incoming Group Messages

const SWIPE_THRESHOLD:number = 60 // Swipe Distance That Starts Editing Or Replying
const SWIPE_MAX_DISTANCE:number = 80 // Distance After Which The Swipe Resists
const DISABLED_OFFSET:number = 100000 // Gesture Offset That Is Never Reached (Turns One Swipe Direction Off)

function MessageBubble({ 
    message, 
    is_grouped_with_previous, 
    is_voice_active,
    onToggleVoice,
    onLongPress, 
    onOpenImages, 
    onOpenVideo, 
    onOpenFile, 
    onSwipeEdit,
    onSwipeReply,
    onOpenReply,
    current_user_id = null,
    is_highlighted = false,
    is_group = false,
    is_sender_name_visible = false,
    is_sender_avatar_visible = false
}:MessageBubbleProps) {
    const { t } = useTranslation() // Initializes The Translations
    const is_own:boolean = message.is_sender // Stores The Information If The Logged In User Sent It
    const is_group_incoming:boolean = is_group && !is_own && !!message.sender // Incoming Group Message (Shows The Sender)

    const images:Attachment[] = message.attachments.filter((attachment:Attachment) => attachment.attachment_type === "image") // Gets The Images
    const image_urls:string[] = images.map((attachment:Attachment) => getAttachmentUrl(attachment.attachment_url) ?? "") // Gets The Image Urls
    const videos:Attachment[] = message.attachments.filter((attachment:Attachment) => attachment.attachment_type === "video") // Gets The Videos
    const files:Attachment[] = message.attachments.filter((attachment:Attachment) => attachment.attachment_type !== "image" && attachment.attachment_type !== "video") // Gets The Files

    // Gets The Reactions
    const reactions:{ emoji:string, count:number }[] = Object.values(message.message_reactions.reduce<Record<string, { emoji:string, count:number }>>((groups, reaction:MessageReaction) => {
        groups[reaction.emoji] = { emoji: reaction.emoji, count: (groups[reaction.emoji]?.count ?? 0) + 1 }
        return groups
    }, {}))

    const can_swipe_edit:boolean = Platform.OS !== "web" && !!onSwipeEdit && canEditMessage(message) // Stores The Information If Swipe To Edit Is Enabled
    const can_swipe_reply:boolean = Platform.OS !== "web" && !!onSwipeReply // Stores The Information If Swipe To Reply Is Enabled
    const swipe_x = useSharedValue<number>(0) // Current Swipe Distance (Negative: Left / Edit, Positive: Right / Reply)
    const has_crossed_threshold = useSharedValue<boolean>(false) // Gives Haptic Feedback Once When The Swipe Is Far Enough

    // Function For Start Editing The Message (Called From The Gesture)
    const startEdit = ():void => {
        onSwipeEdit?.(message)
    }

    // Function For Start Replying To The Message (Called From The Gesture)
    const startReply = ():void => {
        onSwipeReply?.(message)
    }

    // Swipe Left To Edit (Own Messages), Swipe Right To Reply (Any Message); Activates Only When Moving Sideways, So It Never Fights With Scrolling The Chat
    const swipe_gesture = usePanGesture({
        enabled: can_swipe_edit || can_swipe_reply,
        activeOffsetX: [can_swipe_edit ? -15 : -DISABLED_OFFSET, can_swipe_reply ? 15 : DISABLED_OFFSET],
        failOffsetY: [-12, 12],

        onUpdate: (event) => {
            const allowed:number = event.translationX < 0 ? (can_swipe_edit ? event.translationX : 0) : (can_swipe_reply ? event.translationX : 0) // Ignores The Direction That Is Turned Off
            const distance:number = Math.abs(allowed) // Gets The Distance
            const resisted:number = distance > SWIPE_MAX_DISTANCE ? SWIPE_MAX_DISTANCE + (distance - SWIPE_MAX_DISTANCE) * 0.2 : distance // Gets The Resisted

            swipe_x.set(allowed < 0 ? -resisted : resisted)

            const is_past_threshold:boolean = distance >= SWIPE_THRESHOLD // Checks If It Is Past Threshold

            if(is_past_threshold !== has_crossed_threshold.get()) {
                has_crossed_threshold.set(is_past_threshold)
                if(is_past_threshold) scheduleOnRN(haptics.selection)
            }
        },

        onDeactivate: (event) => {
            if(can_swipe_edit && -event.translationX >= SWIPE_THRESHOLD) scheduleOnRN(startEdit)
            else if(can_swipe_reply && event.translationX >= SWIPE_THRESHOLD) scheduleOnRN(startReply)
        },

        onFinalize: () => {
            has_crossed_threshold.set(false)
            swipe_x.set(withSpring(0, { damping: 20, stiffness: 240 }))
        },
    })

    // Gets The Swipe Content Style
    const swipe_content_style = useAnimatedStyle(() => ({
        transform: [{ translateX: swipe_x.get() }],
    }))

    // Gets The Edit Icon Style
    const edit_icon_style = useAnimatedStyle(() => ({
        opacity: interpolate(-swipe_x.get(), [16, SWIPE_THRESHOLD], [0, 1], "clamp"),
        transform: [{ scale: interpolate(-swipe_x.get(), [16, SWIPE_THRESHOLD], [0.6, 1], "clamp") }],
    }))

    // Gets The Reply Icon Style
    const reply_icon_style = useAnimatedStyle(() => ({
        opacity: interpolate(swipe_x.get(), [16, SWIPE_THRESHOLD], [0, 1], "clamp"),
        transform: [{ scale: interpolate(swipe_x.get(), [16, SWIPE_THRESHOLD], [0.6, 1], "clamp") }],
    }))

    const post:SharedPost|null = toSharedPost(message.post) // Gets The Shared Post (Null For The Empty Object Of A Plain Message)
    const post_preview:string|null = post?.media ? getMediaUrl(post.media.is_video ? (post.media.thumbnail ?? post.media.file) : post.media.file) : null // Gets The Post Preview
    const show_likes:boolean = !!post && (!post.hide_likes || is_own) // Stores The Information If The Like Count Is Visible

    const reply_on:ChatReplyPreview|null = message.reply_on ?? null // Gets The Quoted Message Of A Reply
    const voice_message:VoiceMessage|null = message.voice_message // Gets The Voice Message

    const article:Article|null = message.article // Gets The Article
    const article_image:string|null = article ? getArticleImageUrl(article) : null // Gets The Article Image

    // Gets The Bubble Row
    const bubble_row = (
        <GestureDetector gesture = {swipe_gesture}>
            <View style = {[styles.row, is_own ? styles.row_own : styles.row_other, is_grouped_with_previous ? styles.row_grouped : null, is_group_incoming ? styles.row_in_group : null]}>
                {is_group_incoming && is_sender_name_visible && (
                    <Text
                        variant = "caption"
                        color = "text_secondary"
                        numberOfLines = {1}
                        style = {styles.sender_name}
                    >
                        {message.sender.username}
                    </Text>
                )}

                {can_swipe_edit && (
                    <Animated.View pointerEvents = "none" style = {[styles.swipe_icon, styles.swipe_icon_edit, edit_icon_style]}>
                        <Icon
                            name = "pen"
                            size = {16}
                            color = "primary"
                        />
                    </Animated.View>
                )}

                {can_swipe_reply && (
                    <Animated.View pointerEvents = "none" style = {[styles.swipe_icon, styles.swipe_icon_reply, reply_icon_style]}>
                        <View style = {styles.swipe_icon_circle}><Icon
                            name = "reply"
                            size = {14}
                            color = "primary"
                        /></View>
                    </Animated.View>
                )}

                <Animated.View style = {[styles.swipe_content, is_own ? styles.row_own : styles.row_other, swipe_content_style]}>
                <Pressable
                    onLongPress = {() => onLongPress(message)}
                    delayLongPress = {300}
                    accessibilityHint = {t("Podržaním zobrazíte možnosti správy")} // No Button Role: It Contains Buttons (Images, Files, Post), And Buttons Can't Be Nested On Web
                    accessibilityActions = {[{ name: "longpress", label: t("Možnosti správy") }]}
                    onAccessibilityAction = {() => onLongPress(message)}
                    style = {[styles.bubble, is_own ? styles.bubble_own : styles.bubble_other]}
                >
                    {is_highlighted &&
                        <Animated.View
                            entering = {FadeIn.duration(150)}
                            exiting = {FadeOut.duration(500)}
                            pointerEvents = "none"
                            style = {styles.highlight}
                        />
                    }

                    {reply_on ? (
                        <ReplyQuote
                            reply = {reply_on}
                            current_user_id = {current_user_id}
                            variant = {is_own ? "own" : "other"}
                            onPress = {onOpenReply ? () => onOpenReply(reply_on.id) : undefined}
                        />
                    ) : null}

                    {images.length > 0 && (
                        <View style = {styles.images}>
                            {images.map((attachment:Attachment, index:number) => (
                                <Pressable
                                    key = {attachment.attachment_url}
                                    onPress = {() => onOpenImages(image_urls, index)}
                                    accessibilityRole = "imagebutton"
                                    accessibilityLabel = {t("Zobraziť obrázok")}
                                    style = {[styles.image_tile, images.length === 1 ? styles.image_single : null]}
                                >
                                    <Image
                                        source = {{ uri: image_urls[index] }}
                                        style = {StyleSheet.absoluteFill}
                                        contentFit = "cover"
                                        transition = {150}
                                    />
                                </Pressable>
                            ))}
                        </View>
                    )}

                    {videos.map((attachment:Attachment) => (
                        <Pressable
                            key = {attachment.attachment_url}
                            onPress = {() => { const url = getAttachmentUrl(attachment.attachment_url); if(url) onOpenVideo(url) }}
                            accessibilityRole = "button"
                            accessibilityLabel = {t("Prehrať video")}
                            style = {styles.video}
                        >
                            {!!attachment.attachment_thumbnail &&
                                <Image
                                    source = {{ uri: getAttachmentUrl(attachment.attachment_thumbnail) ?? undefined }}
                                    style = {StyleSheet.absoluteFill}
                                    contentFit = "cover"
                                />
                            }
                            <View style = {styles.play}><Icon
                                name = "play"
                                size = {18}
                                color = "white"
                            /></View>
                        </Pressable>
                    ))}

                    {files.map((attachment:Attachment) => (
                        <Pressable
                            key = {attachment.attachment_url}
                            onPress = {() => onOpenFile(attachment)}
                            accessibilityRole = "button"
                            accessibilityLabel = {`${t("Stiahnuť")}: ${attachment.original_filename}`}
                            style = {[styles.file, is_own ? styles.file_own : null]}
                        >
                            <Icon
                                name = {FILE_ICONS[attachment.attachment_type] ?? "file"}
                                size = {18}
                                color = {is_own ? "on_primary" : "primary"}
                            />

                            <View style = {styles.flex}>
                                <Text
                                    variant = "label"
                                    color = {is_own ? "on_primary" : "text"}
                                    numberOfLines = {1}
                                >
                                    {attachment.original_filename}
                                </Text>
                                <Text variant = "caption" color = {is_own ? "on_primary" : "text_muted"}>{getReadableSize(attachment.compressed_size || attachment.original_size)}</Text>
                            </View>

                            <Icon
                                name = "download"
                                size = {14}
                                color = {is_own ? "on_primary" : "text_muted"}
                            />
                        </Pressable>
                    ))}

                    {!!post && (
                        <Pressable
                            onPress = {() => router.push({ pathname: "/post/[post_id]", params: { post_id: post.id } })}
                            accessibilityRole = "button"
                            accessibilityLabel = {t("Príspevok užívateľa {{username}}", { username: post.user.username })}
                            style = {({ pressed }) => [styles.shared_card, pressed ? styles.card_pressed : null]}
                        >
                            {post_preview ? (
                                <View style = {styles.post_media}>
                                    <Image
                                        source = {{ uri: post_preview }}
                                        style = {StyleSheet.absoluteFill}
                                        contentFit = "cover"
                                        transition = {150}
                                    />
                                    {post.media?.is_video &&
                                        <View style = {styles.play}><Icon
                                            name = "play"
                                            size = {16}
                                            color = "white"
                                        /></View>
                                    }
                                </View>
                            ) : null}

                            <View style = {styles.card_body}>
                                <View style = {styles.meta_item}>
                                    <Icon
                                        name = "images"
                                        size = {10}
                                        color = "primary_text"
                                        is_solid = {false}
                                    />
                                    <Text variant = "overline" color = "primary_text">{t("Príspevok")}</Text>
                                </View>

                                <View style = {styles.post_author}>
                                    <Avatar
                                        user = {post.user}
                                        size = {22}
                                        is_ring_hidden
                                    />
                                    <Text
                                        variant = "label"
                                        numberOfLines = {1}
                                        style = {styles.flex_shrink}
                                    >
                                        {formatUsername(post.user.username)}
                                    </Text>
                                    {post.user.subscription?.is_active &&
                                        <Icon
                                            name = "crown"
                                            size = {10}
                                            color = "premium"
                                        />
                                    }
                                </View>

                                {post.description ? <Text
                                    variant = {post_preview ? "caption" : "callout"}
                                    color = "text_secondary"
                                    numberOfLines = {post_preview ? 2 : 4}
                                >
                                    {post.description}
                                </Text> : null}

                                <View style = {styles.card_meta}>
                                    <View style = {styles.meta_item}>
                                        <Icon
                                            name = "heart"
                                            size = {11}
                                            color = "text_muted"
                                            is_solid = {false}
                                        />
                                        {show_likes &&
                                            <Text
                                                variant = "caption"
                                                color = "text_secondary"
                                                is_tabular
                                            >
                                                {post.likes}
                                            </Text>
                                        }
                                    </View>

                                    <View style = {styles.meta_item}>
                                        <Icon
                                            name = {post.allow_comments ? "comment" : "comment-slash"}
                                            size = {11}
                                            color = "text_muted"
                                            is_solid = {false}
                                        />
                                        {post.allow_comments &&
                                            <Text
                                                variant = "caption"
                                                color = "text_secondary"
                                                is_tabular
                                            >
                                                {post.comments}
                                            </Text>
                                        }
                                    </View>

                                    <Text variant = "caption" color = "text_muted">{getFormattedDate(post.created_at)}</Text>
                                </View>
                            </View>
                        </Pressable>
                    )}

                    {voice_message ? (
                        <VoiceMessagePlayer
                            voice_message = {voice_message}
                            is_own = {is_own}
                            is_active = {is_voice_active}
                            onToggle = {() => onToggleVoice(voice_message.id)}
                        />
                    ) : null}

                    {article ? (
                        <Pressable
                            onPress = {() => router.push({ pathname: "/blog/[article]", params: { article: article.link } })}
                            accessibilityRole = "button"
                            accessibilityLabel = {t("Článok {{article_title}}", { article_title: article.title })}
                            style = {({ pressed }) => [styles.shared_card, pressed ? styles.card_pressed : null]}
                        >
                            {article_image ? (
                                <Image
                                    source = {{ uri: article_image }}
                                    style = {styles.article_image}
                                    contentFit = "cover"
                                    transition = {150}
                                />
                            ) : (
                                <View style = {[styles.article_image, styles.article_placeholder]}><Icon
                                    name = "newspaper"
                                    size = {22}
                                    color = "text_muted"
                                    is_solid = {false}
                                /></View>
                            )}

                            <View style = {styles.card_body}>
                                <View style = {styles.meta_item}>
                                    <Icon
                                        name = "newspaper"
                                        size = {10}
                                        color = "primary_text"
                                    />
                                    <Text variant = "overline" color = "primary_text">{t("Článok")}</Text>
                                </View>

                                <Text variant = "subheading" numberOfLines = {2}>{article.title}</Text>
                                {article.description ? <Text
                                    variant = "caption"
                                    color = "text_secondary"
                                    numberOfLines = {2}
                                >
                                    {article.description}
                                </Text> : null}

                                <View style = {styles.card_meta}>
                                    {article.average_rating !== null && (
                                        <View style = {styles.meta_item}>
                                            <Icon
                                                name = "star"
                                                size = {11}
                                                color = "premium"
                                            />
                                            <Text
                                                variant = "caption"
                                                color = "text_secondary"
                                                is_tabular
                                            >
                                                {article.average_rating.toFixed(1)}
                                            </Text>
                                        </View>
                                    )}

                                    <View style = {styles.meta_item}>
                                        <Icon
                                            name = "eye"
                                            size = {11}
                                            color = "text_muted"
                                            is_solid = {false}
                                        />
                                        <Text
                                            variant = "caption"
                                            color = "text_secondary"
                                            is_tabular
                                        >
                                            {article.visitors}
                                        </Text>
                                    </View>

                                    <Text variant = "caption" color = "text_muted">{getFormattedDate(article.creation_time)}</Text>
                                </View>
                            </View>
                        </Pressable>
                    ) : null}

                    {message.content ? (
                        <Text
                            variant = "body"
                            color = {is_own ? "on_primary" : "text"}
                            selectable
                            style = {styles.text}
                        >
                            {message.content}
                        </Text>
                    ) : null}

                    <View style = {styles.meta}>
                        {message.is_edited &&
                            <Text
                                variant = "caption"
                                color = {is_own ? "on_primary" : "text_muted"}
                                style = {styles.meta_text}
                            >
                                {t("upravené")}
                            </Text>
                        }
                        <Text
                            variant = "caption"
                            color = {is_own ? "on_primary" : "text_muted"}
                            style = {styles.meta_text}
                        >
                            {message.formatted_time}
                        </Text>
                        {is_own && !is_group &&
                            <Icon
                                name = {message.is_read ? "check-double" : "check"}
                                size = {10}
                                color = "on_primary"
                            />
                        }
                    </View>
                </Pressable>

                {reactions.length > 0 && (
                    <View style = {[styles.reactions, is_own ? styles.reactions_own : null]} accessibilityLabel = {reactions.map((reaction) => `${reaction.emoji} ${reaction.count}`).join(", ")}>
                        {reactions.map((reaction) => (
                            <Text key = {reaction.emoji} variant = "caption">{reaction.emoji}{reaction.count > 1 ? ` ${reaction.count}` : ""}</Text>
                        ))}
                    </View>
                )}
                </Animated.View>
            </View>
        </GestureDetector>
    )

    if(!is_group_incoming) return bubble_row

    // Group Chat: The Avatar Sits Next To The Last Bubble Of A Run, Earlier Bubbles Keep Its Space So They Stay Aligned
    return (
        <View style = {[styles.group_row, is_grouped_with_previous ? styles.row_grouped : null]}>
            {is_sender_avatar_visible ? (
                <Pressable
                    onPress = {() => router.push({ pathname: "/profile/[username]", params: { username: message.sender.username } })}
                    accessibilityRole = "button"
                    accessibilityLabel = {`${message.sender.username}, ${t("Zobraziť profil")}`}
                    style = {styles.group_avatar}
                >
                    <Avatar
                        user = {message.sender}
                        size = {GROUP_AVATAR_SIZE}
                        is_ring_hidden
                    />
                </Pressable>
            ) : (
                <View style = {styles.group_avatar} />
            )}

            <View style = {styles.group_bubble}>{bubble_row}</View>
        </View>
    )
}

export default memo(MessageBubble)

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    row: {
        maxWidth: "82%",
        marginTop: spacing.md,
    },

    row_grouped: {
        marginTop: 3,
    },

    row_in_group: {
        maxWidth: "100%", // The Group Row Already Limits The Width
        marginTop: 0,
    },

    sender_name: {
        marginBottom: spacing.xxs,
        marginLeft: spacing.sm,
    },

    group_row: {
        maxWidth: "88%",
        flexDirection: "row",
        alignItems: "flex-end",
        alignSelf: "flex-start",
        gap: spacing.xs,
        marginTop: spacing.md,
    },

    group_avatar: {
        width: GROUP_AVATAR_SIZE,
        height: GROUP_AVATAR_SIZE,
    },

    group_bubble: {
        flexShrink: 1,
    },

    swipe_content: {
        maxWidth: "100%",
    },

    swipe_icon: {
        position: "absolute",
        top: 0,
        bottom: 0,
        justifyContent: "center",
    },

    swipe_icon_edit: {
        right: spacing.xs,
    },

    swipe_icon_reply: {
        left: spacing.xs,
    },

    swipe_icon_circle: {
        width: 30,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    row_own: {
        alignSelf: "flex-end",
        alignItems: "flex-end",
    },

    row_other: {
        alignSelf: "flex-start",
        alignItems: "flex-start",
    },

    bubble: {
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radii.lg,
        overflow: "hidden",
    },

    bubble_own: {
        backgroundColor: colors.primary_solid,
        borderBottomRightRadius: radii.xs,
    },

    bubble_other: {
        backgroundColor: colors.surface_raised,
        borderWidth: 1,
        borderColor: colors.border,
        borderBottomLeftRadius: radii.xs,
    },

    highlight: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(255, 255, 255, 0.16)",
    },

    text: {
        flexShrink: 1,
    },

    images: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 3,
        marginHorizontal: -spacing.sm,
        marginTop: -spacing.xs,
    },

    image_tile: {
        width: 116,
        height: 116,
        overflow: "hidden",
        backgroundColor: colors.surface_pressed,
        borderRadius: radii.md,
    },

    image_single: {
        width: 232,
        height: 232,
    },

    video: {
        width: 232,
        height: 160,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: colors.background_deep,
        borderRadius: radii.md,
        marginHorizontal: -spacing.sm,
    },

    play: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.overlay,
        borderRadius: radii.pill,
    },

    file: {
        minWidth: 200,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        padding: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
    },

    file_own: {
        backgroundColor: "rgba(255, 255, 255, 0.14)",
    },

    post_media: {
        height: 200,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface_pressed,
    },

    post_author: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
    },

    flex_shrink: {
        flexShrink: 1,
    },

    meta: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-end",
        gap: spacing.xs,
    },

    meta_text: {
        opacity: 0.8,
        fontSize: 11,
    },

    reactions: {
        flexDirection: "row",
        gap: spacing.xs,
        marginTop: -6,
        marginLeft: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        backgroundColor: colors.surface_raised,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.pill,
    },

    reactions_own: {
        marginLeft: 0,
        marginRight: spacing.sm,
    },

    card_pressed: {
        opacity: 0.85,
    },

    card_meta: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: spacing.md,
        marginTop: 2,
    },

    meta_item: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },

    shared_card: {
        width: 240,
        overflow: "hidden",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.md,
        marginHorizontal: -spacing.xs,
    },

    article_image: {
        height: 128,
        backgroundColor: colors.surface_pressed,
    },

    article_placeholder: {
        alignItems: "center",
        justifyContent: "center",
    },

    card_body: {
        gap: spacing.xs,
        padding: spacing.md,
    },
})
