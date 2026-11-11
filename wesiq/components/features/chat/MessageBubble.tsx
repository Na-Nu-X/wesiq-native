// One Chat Message (Text, Attachments, Shared Post, Reactions, Time, Edited And Read State)

import { memo } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { DOMAIN } from "@/constants/general"
import { getMediaUrl } from "@/lib/media"
import { getReadableSize } from "@/utils/getReadableSize"

import type { IconName } from "@/components/ui"
import type { Attachment, AttachmentType, ChatMessage, MessageReaction } from "@/types/models"

// Function For Get The Full URL Of An Attachment (The Server Returns Paths Like "/media/...")
export const getAttachmentUrl = (path:string|null|undefined):string|null => {
    if(!path) return null
    return /^https?:\/\//.test(path) ? path : `${DOMAIN}${path.startsWith("/") ? "" : "/"}${path}`
}

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
    onLongPress:(message:ChatMessage) => void,
    onOpenImages:(urls:string[], index:number) => void,
    onOpenVideo:(url:string) => void,
    onOpenFile:(attachment:Attachment) => void
}

function MessageBubble({ message, is_grouped_with_previous, onLongPress, onOpenImages, onOpenVideo, onOpenFile }:MessageBubbleProps) {
    const { t } = useTranslation() // Initializes The Translations
    const is_own:boolean = message.is_sender // Stores The Information If The Logged In User Sent It

    const images:Attachment[] = message.attachments.filter((attachment:Attachment) => attachment.attachment_type === "image")
    const image_urls:string[] = images.map((attachment:Attachment) => getAttachmentUrl(attachment.attachment_url) ?? "")
    const videos:Attachment[] = message.attachments.filter((attachment:Attachment) => attachment.attachment_type === "video")
    const files:Attachment[] = message.attachments.filter((attachment:Attachment) => attachment.attachment_type !== "image" && attachment.attachment_type !== "video")

    // Groups Equal Reactions (👍 ×2)
    const reactions:{ emoji:string, count:number }[] = Object.values(message.message_reactions.reduce<Record<string, { emoji:string, count:number }>>((groups, reaction:MessageReaction) => {
        groups[reaction.emoji] = { emoji: reaction.emoji, count: (groups[reaction.emoji]?.count ?? 0) + 1 }
        return groups
    }, {}))

    const post = message.post // Gets The Shared Post
    const post_preview:string|null = post?.media ? getMediaUrl(post.media.is_video ? (post.media.thumbnail ?? post.media.file) : post.media.file) : null

    return (
        <View style={[styles.row, is_own ? styles.row_own : styles.row_other, is_grouped_with_previous ? styles.row_grouped : null]}>
            <Pressable
                onLongPress={() => onLongPress(message)}
                delayLongPress={300}
                accessibilityHint={t("Podržaním zobrazíte možnosti správy")} // No Button Role: It Contains Buttons (Images, Files, Post), And Buttons Can't Be Nested On Web
                accessibilityActions={[{ name: "longpress", label: t("Možnosti správy") }]}
                onAccessibilityAction={() => onLongPress(message)}
                style={[styles.bubble, is_own ? styles.bubble_own : styles.bubble_other]}
            >
                {images.length > 0 && (
                    <View style={styles.images}>
                        {images.map((attachment:Attachment, index:number) => (
                            <Pressable key={attachment.attachment_url} onPress={() => onOpenImages(image_urls, index)} accessibilityRole="imagebutton" accessibilityLabel={t("Zobraziť obrázok")} style={[styles.image_tile, images.length === 1 ? styles.image_single : null]}>
                                <Image source={{ uri: image_urls[index] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                            </Pressable>
                        ))}
                    </View>
                )}

                {videos.map((attachment:Attachment) => (
                    <Pressable key={attachment.attachment_url} onPress={() => { const url = getAttachmentUrl(attachment.attachment_url); if(url) onOpenVideo(url) }} accessibilityRole="button" accessibilityLabel={t("Prehrať video")} style={styles.video}>
                        {attachment.attachment_thumbnail && <Image source={{ uri: getAttachmentUrl(attachment.attachment_thumbnail) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />}
                        <View style={styles.play}><Icon name="play" size={18} color="white" /></View>
                    </Pressable>
                ))}

                {files.map((attachment:Attachment) => (
                    <Pressable key={attachment.attachment_url} onPress={() => onOpenFile(attachment)} accessibilityRole="button" accessibilityLabel={`${t("Stiahnuť")}: ${attachment.original_filename}`} style={[styles.file, is_own ? styles.file_own : null]}>
                        <Icon name={FILE_ICONS[attachment.attachment_type] ?? "file"} size={18} color={is_own ? "on_primary" : "primary"} />

                        <View style={styles.flex}>
                            <Text variant="label" color={is_own ? "on_primary" : "text"} numberOfLines={1}>{attachment.original_filename}</Text>
                            <Text variant="caption" color={is_own ? "on_primary" : "text_muted"}>{getReadableSize(attachment.compressed_size || attachment.original_size)}</Text>
                        </View>

                        <Icon name="download" size={14} color={is_own ? "on_primary" : "text_muted"} />
                    </Pressable>
                ))}

                {post && (
                    <Pressable onPress={() => router.push({ pathname: "/post/[post_id]", params: { post_id: post.id } })} accessibilityRole="button" accessibilityLabel={t("Príspevok užívateľa {{username}}", { username: post.user.username })} style={styles.post}>
                        {post_preview ? <Image source={{ uri: post_preview }} style={styles.post_image} contentFit="cover" /> : <View style={[styles.post_image, styles.post_placeholder]}><Icon name="image" size={18} color="text_muted" /></View>}

                        <View style={styles.post_text}>
                            <Text variant="label" numberOfLines={1}>@{post.user.username}</Text>
                            {post.description ? <Text variant="caption" color="text_secondary" numberOfLines={2}>{post.description}</Text> : null}
                        </View>
                    </Pressable>
                )}

                {message.content ? (
                    <Text variant="body" color={is_own ? "on_primary" : "text"} selectable style={styles.text}>{message.content}</Text>
                ) : null}

                <View style={styles.meta}>
                    {message.is_edited && <Text variant="caption" color={is_own ? "on_primary" : "text_muted"} style={styles.meta_text}>{t("upravené")}</Text>}
                    <Text variant="caption" color={is_own ? "on_primary" : "text_muted"} style={styles.meta_text}>{message.formatted_time}</Text>
                    {is_own && <Icon name={message.is_read ? "check-double" : "check"} size={10} color="on_primary" />}
                </View>
            </Pressable>

            {reactions.length > 0 && (
                <View style={[styles.reactions, is_own ? styles.reactions_own : null]} accessibilityLabel={reactions.map((reaction) => `${reaction.emoji} ${reaction.count}`).join(", ")}>
                    {reactions.map((reaction) => (
                        <Text key={reaction.emoji} variant="caption">{reaction.emoji}{reaction.count > 1 ? ` ${reaction.count}` : ""}</Text>
                    ))}
                </View>
            )}
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

    post: {
        width: 232,
        flexDirection: "row",
        gap: spacing.sm,
        padding: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
    },

    post_image: {
        width: 52,
        height: 64,
        borderRadius: radii.sm,
        backgroundColor: colors.surface_pressed,
    },

    post_placeholder: {
        alignItems: "center",
        justifyContent: "center",
    },

    post_text: {
        flex: 1,
        gap: 2,
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
})
