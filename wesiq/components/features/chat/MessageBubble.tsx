// One Chat Message (Text, Attachments, Shared Post, Reactions, Time, Edited And Read State)

import { memo, useEffect, useState } from "react"
import { Platform, Pressable, StyleSheet, View } from "react-native"
import { GestureDetector, usePanGesture } from "react-native-gesture-handler"
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { DOMAIN } from "@/constants/general"
import { getMediaUrl } from "@/lib/media"
import { getReadableSize } from "@/utils/getReadableSize"
import { formatUsername } from "@/lib/format"
import { haptics } from "@/lib/haptics"
import { canEditMessage } from "./MessageActionsSheet"
import { toSharedPost } from "@/lib/api/endpoints/chat"
import { AudioPlayer, AudioStatus, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import { getFormattedTime } from "@/utils/time"
import { BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"

import type { IconName } from "@/components/ui"
import type { Attachment, AttachmentType, ChatMessage, MessageReaction, SharedPost, VoiceMessage } from "@/types/models"
import { WAVEFORM_BARS } from "./Composer"

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
    is_voice_active:boolean,
    onToggleVoice:(voice_id:number) => void,
    onLongPress:(message:ChatMessage) => void,
    onOpenImages:(urls:string[], index:number) => void,
    onOpenVideo:(url:string) => void,
    onOpenFile:(attachment:Attachment) => void,
    onSwipeEdit?:(message:ChatMessage) => void // Swipe Left Starts Editing An Own Message (Same Rule As The Menu)
}

const SWIPE_EDIT_THRESHOLD:number = 60 // Swipe Distance That Starts Editing
const SWIPE_MAX_DISTANCE:number = 80 // Distance After Which The Swipe Resists

interface ActiveAudioEngineProps {
    uri:string,
    is_paused:boolean,
    seek_to_seconds:number|null,
    onProgress:(current_seconds:number, duration_seconds:number) => void,
    onFinish:() => void
}

function ActiveAudioEngine({ uri, is_paused, seek_to_seconds, onProgress, onFinish }:ActiveAudioEngineProps) {
    const audio_player:AudioPlayer = useAudioPlayer(uri) // Gets The Audio Player
    const status:AudioStatus = useAudioPlayerStatus(audio_player) // Gets The Status

    useEffect(() => {
        let is_mounted:boolean = true

        // Function For Start The Playback
        const startPlayback = async ():Promise<void> => {
            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true
            })

            if(is_mounted && !is_paused) audio_player.play() // Plays The Voice Message
        }

        startPlayback() // Starts The Playback

        return () => { is_mounted = false }
    }, [audio_player])

    useEffect(() => {
        if(is_paused) audio_player.pause() // Pauses The Voice Message
        else audio_player.play() // Plays The Voice Message
    }, [is_paused, audio_player])

    useEffect(() => {
        if(seek_to_seconds !== null) audio_player.seekTo(seek_to_seconds)
    }, [seek_to_seconds, audio_player])

    useEffect(() => {
        onProgress(status.currentTime ?? 0, status.duration ?? 0)

        if(status.didJustFinish) {
            audio_player.seekTo(0)
            onFinish()
        }
    }, [status.currentTime, status.duration, status.didJustFinish, onProgress, onFinish, audio_player])

    return null
}

interface VoiceMessagePlayerProps {
    voice_message:VoiceMessage,
    is_own:boolean,
    is_active:boolean,
    onToggle:() => void
}

function VoiceMessagePlayer({ voice_message, is_own, is_active, onToggle }:VoiceMessagePlayerProps) {
    const { t } = useTranslation()

    const [is_paused, setIsPaused] = useState<boolean>(false)
    const [current_seconds, setCurrentSeconds] = useState<number>(0)
    const [actual_duration_seconds, setActualDurationSeconds] = useState<number>(0)
    const [seek_to_seconds, setSeekToSeconds] = useState<number|null>(null)

    const audio_url:string|null = getMediaUrl(voice_message.file)
    const total_seconds:number = actual_duration_seconds > 0 ? actual_duration_seconds : (voice_message.duration / 1000)
    const progress:number = is_active && total_seconds > 0 ? Math.min(1, Math.max(0, current_seconds / total_seconds)) : 0
    const is_playing:boolean = is_active && !is_paused

    useEffect(() => {
        if(!is_active) {
            setIsPaused(false)
            setCurrentSeconds(0)
            setSeekToSeconds(null)
        }
    }, [is_active])

    const handlePressPlayPause = ():void => {
        if(!audio_url) return

        if(!is_active) {
            setIsPaused(false)
            onToggle()
            return
        }

        setIsPaused((prev:boolean) => !prev)
    }

    const handleSeekBar = (index:number):void => {
        if(!audio_url || total_seconds <= 0) return

        const target_seconds:number = (index / bars.length) * total_seconds

        setSeekToSeconds(target_seconds)
        setCurrentSeconds(target_seconds)

        if(!is_active) {
            setIsPaused(false)
            onToggle()
        }
    }

    const fitWaveformToBars = (samples:number[], target_bars:number = WAVEFORM_BARS):number[] => {
        if(!samples || samples.length === 0) return Array(target_bars).fill(0.2)
        if(samples.length === 1) return Array(target_bars).fill(samples[0])
        if(samples.length === target_bars) return samples

        // Shorter Recording (Less Than 35 Samples)
        if(samples.length < target_bars) {
            const result:number[] = []
            const max_index:number = samples.length - 1

            for(let i:number = 0; i < target_bars; i++) {
                const exact_pos:number = (i / (target_bars - 1)) * max_index
                const low:number = Math.floor(exact_pos)
                const high:number = Math.ceil(exact_pos)
                const weight:number = exact_pos - low

                const interpolated:number = samples[low] * (1 - weight) + samples[high] * weight

                result.push(Number(interpolated.toFixed(3)))
            }

            return result
        }

        // Longer Recording (More Than 35 Samples)
        const step:number = samples.length / target_bars
        const result:number[] = []

        for(let i:number = 0; i < target_bars; i++) {
            const start:number = Math.floor(i * step)
            const end:number = Math.floor((i + 1) * step)
            const slice:number[] = samples.slice(start, Math.max(start + 1, end))
            const avg:number = slice.reduce((sum, val) => sum + val, 0) / slice.length

            result.push(Number(avg.toFixed(3)))
        }

        return result
    }

    const bars:number[] = fitWaveformToBars(voice_message.waveform, WAVEFORM_BARS) // Gets The Bars

    return (
        <View style={styles.voice_message_container}>
            {is_active && audio_url && (
                <ActiveAudioEngine
                    uri={audio_url}
                    is_paused={is_paused}
                    seek_to_seconds={seek_to_seconds}

                    onProgress={(current:number, duration:number) => {
                        setCurrentSeconds(current)
                        if(duration > 0) setActualDurationSeconds(duration)
                    }}

                    onFinish={onToggle}
                />
            )}

            <Pressable
                onPress={handlePressPlayPause}
                accessibilityRole="button"
                accessibilityLabel={is_playing ? t("Pozastaviť hlasovú správu") : t("Prehrať hlasovú správu")}
                style={[styles.voice_message_play_button, is_own ? styles.voice_message_play_own : styles.voice_message_play_other]}
            >
                <Icon
                    name={is_playing ? "pause" : "play"}
                    size={16}
                    color={is_own ? "on_primary" : "primary"}
                />
            </Pressable>

            <View style={styles.voice_body}>
                <View style={styles.voice_waveform}>
                    {bars.map((value:number, index:number) => {
                        const is_filled:boolean = (index / bars.length) <= progress

                        return (
                            <Pressable
                                key={index}
                                onPress={() => handleSeekBar(index)}
                                hitSlop={{ top: 8, bottom: 8 }}
                                style={styles.voice_bar_touch}
                            >
                                <View
                                    style={[
                                        styles.voice_bar,
                                        { height: Math.max(4, Math.min(24, value * 24)) },
                                        is_own
                                            ? (is_filled ? styles.voice_bar_own_active : styles.voice_bar_own_idle)
                                            : (is_filled ? styles.voice_bar_other_active : styles.voice_bar_other_idle),
                                    ]}
                                />
                            </Pressable>
                        )
                    })}
                </View>

                <Text variant="caption" color={is_own ? "on_primary" : "text_muted"} style={styles.voice_duration}>
                    {is_active 
                        ? `${getFormattedTime("minutes", current_seconds)}:${getFormattedTime("seconds", current_seconds, true)}`
                        : `${getFormattedTime("minutes", total_seconds)}:${getFormattedTime("seconds", total_seconds, true)}`
                    }
                </Text>
            </View>
        </View>
    )
}

function MessageBubble({ 
    message, 
    is_grouped_with_previous, 
    is_voice_active,
    onToggleVoice,
    onLongPress, 
    onOpenImages, 
    onOpenVideo, 
    onOpenFile, 
    onSwipeEdit 
}:MessageBubbleProps) {
    const { t } = useTranslation() // Initializes The Translations
    const is_own:boolean = message.is_sender // Stores The Information If The Logged In User Sent It

    const images:Attachment[] = message.attachments.filter((attachment:Attachment) => attachment.attachment_type === "image")
    const image_urls:string[] = images.map((attachment:Attachment) => getAttachmentUrl(attachment.attachment_url) ?? "")
    const videos:Attachment[] = message.attachments.filter((attachment:Attachment) => attachment.attachment_type === "video")
    const files:Attachment[] = message.attachments.filter((attachment:Attachment) => attachment.attachment_type !== "image" && attachment.attachment_type !== "video")

    const reactions:{ emoji:string, count:number }[] = Object.values(message.message_reactions.reduce<Record<string, { emoji:string, count:number }>>((groups, reaction:MessageReaction) => {
        groups[reaction.emoji] = { emoji: reaction.emoji, count: (groups[reaction.emoji]?.count ?? 0) + 1 }
        return groups
    }, {}))

    const can_swipe_edit:boolean = Platform.OS !== "web" && !!onSwipeEdit && canEditMessage(message) // Stores The Information If Swipe To Edit Is Enabled
    const swipe_x = useSharedValue<number>(0) // Current Swipe Distance (Positive, The Bubble Moves Left)
    const has_crossed_threshold = useSharedValue<boolean>(false) // Gives Haptic Feedback Once When The Swipe Is Far Enough

    // Function For Start Editing The Message (Called From The Gesture)
    const startEdit = ():void => {
        onSwipeEdit?.(message)
    }

    // Swipe Left To Edit (Own Messages Are On The Right; Activates Only When Moving Left, So It Never Fights With Scrolling The Chat)
    const swipe_gesture = usePanGesture({
        enabled: can_swipe_edit,
        activeOffsetX: -15,
        failOffsetY: [-12, 12],

        onUpdate: (event) => {
            const distance:number = Math.max(0, -event.translationX)
            swipe_x.set(distance > SWIPE_MAX_DISTANCE ? SWIPE_MAX_DISTANCE + (distance - SWIPE_MAX_DISTANCE) * 0.2 : distance)

            const is_past_threshold:boolean = distance >= SWIPE_EDIT_THRESHOLD

            if(is_past_threshold !== has_crossed_threshold.get()) {
                has_crossed_threshold.set(is_past_threshold)
                if(is_past_threshold) scheduleOnRN(haptics.selection)
            }
        },

        onDeactivate: (event) => {
            if(-event.translationX >= SWIPE_EDIT_THRESHOLD) scheduleOnRN(startEdit)
        },

        onFinalize: () => {
            has_crossed_threshold.set(false)
            swipe_x.set(withSpring(0, { damping: 20, stiffness: 240 }))
        },
    })

    const swipe_content_style = useAnimatedStyle(() => ({
        transform: [{ translateX: -swipe_x.get() }],
    }))

    const swipe_icon_style = useAnimatedStyle(() => ({
        opacity: interpolate(swipe_x.get(), [16, SWIPE_EDIT_THRESHOLD], [0, 1], "clamp"),
        transform: [{ scale: interpolate(swipe_x.get(), [16, SWIPE_EDIT_THRESHOLD], [0.6, 1], "clamp") }],
    }))

    const post:SharedPost|null = toSharedPost(message.post) // Gets The Shared Post (Null For The Empty Object Of A Plain Message)
    const post_preview:string|null = post?.media ? getMediaUrl(post.media.is_video ? (post.media.thumbnail ?? post.media.file) : post.media.file) : null

    const voice_message:VoiceMessage|null = message.voice_message

    return (    
        <GestureDetector gesture={swipe_gesture}>
            <View style={[styles.row, is_own ? styles.row_own : styles.row_other, is_grouped_with_previous ? styles.row_grouped : null]}>
                {can_swipe_edit && (
                    <Animated.View pointerEvents="none" style={[styles.swipe_icon, swipe_icon_style]}>
                        <Icon name="pen" size={16} color="primary" />
                    </Animated.View>
                )}

                <Animated.View style={[styles.swipe_content, is_own ? styles.row_own : styles.row_other, swipe_content_style]}>
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
                            {!!attachment.attachment_thumbnail && <Image source={{ uri: getAttachmentUrl(attachment.attachment_thumbnail) ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" />}
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

                    {!!post && (
                        <Pressable onPress={() => router.push({ pathname: "/post/[post_id]", params: { post_id: post.id } })} accessibilityRole="button" accessibilityLabel={t("Príspevok užívateľa {{username}}", { username: post.user.username })} style={styles.post}>
                            {post_preview ? <Image source={{ uri: post_preview }} style={styles.post_image} contentFit="cover" /> : <View style={[styles.post_image, styles.post_placeholder]}><Icon name="image" size={18} color="text_muted" /></View>}

                            <View style={styles.post_text}>
                                <Text variant="label" numberOfLines={1}>{formatUsername(post.user.username)}</Text>
                                {post.description ? <Text variant="caption" color="text_secondary" numberOfLines={2}>{post.description}</Text> : null}
                            </View>
                        </Pressable>
                    )}

                    {voice_message ? (
                        <VoiceMessagePlayer
                            voice_message={voice_message}
                            is_own={is_own}
                            is_active={is_voice_active}
                            onToggle={() => onToggleVoice(voice_message.id)}
                        />
                    ) : null}

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
                </Animated.View>
            </View>
        </GestureDetector>
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

    swipe_content: {
        maxWidth: "100%",
    },

    swipe_icon: {
        position: "absolute",
        right: spacing.xs,
        top: 0,
        bottom: 0,
        justifyContent: "center",
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

    voice_message_container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minWidth: 190,
        paddingVertical: 2,
    },

    voice_message_play_button: {
        justifyContent: "center",
        alignItems: "center",
        width: 32,
        height: 32,
        borderRadius: "50%",
    },

    voice_message_play_own: {
        backgroundColor: transparentize(SECONDARY_COLOR, 0.8),
    },

    voice_message_play_other: {
        backgroundColor: transparentize(BLUE_COLOR, 0.8),
    },

    voice_body: {
        flex: 1,
        gap: 4,
    },

    voice_waveform: {
        flexDirection: "row",
        alignItems: "center",
        height: 24,
        gap: 2,
    },

    voice_bar_touch: {
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
        height: 24,
    },

    voice_bar: {
        width: 2.5,
        borderRadius: 2,
    },

    voice_bar_own_active: {
        backgroundColor: SECONDARY_COLOR,
    },

    voice_bar_own_idle: {
        backgroundColor: transparentize(SECONDARY_COLOR, 0.6),
    },

    voice_bar_other_active: {
        backgroundColor: BLUE_COLOR,
    },

    voice_bar_other_idle: {
        backgroundColor: transparentize(SECONDARY_COLOR, 0.6),
    },

    voice_duration: {
        fontSize: 10,
        fontVariant: ["tabular-nums"],
    },
})
