// Message Composer: Text, Attachments (Photos / Videos / Files) And Editing

import { ComponentRef, useEffect, useRef, useState } from "react"
import { ScrollView, StyleSheet, TextInput, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated"
import { Image } from "expo-image"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"
import { Icon, IconButton, Text, TextField } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { showAlert } from "@/lib/alert"
import { formatMegabytes } from "@/lib/format"
import { getActiveSubscriptionPlan } from "@/lib/subscription"
import { getMediaLimits } from "@/components/features/upload-post/mediaRules"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { AudioModule, AudioRecorder, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio"
import { haptics } from "@/lib/haptics"
import { getFormattedTime } from "@/utils/time"
import { fitWaveformToBars } from "@/lib/chat"
import ReplyQuote from "./ReplyQuote"

import type { UploadableFile } from "@/lib/api/upload"
import type { ChatMessage, ChatReplyPreview } from "@/types/models"
import type { RecordedVoiceMessage } from "./Conversation"

export interface PendingAttachment extends UploadableFile {
    key:string,
    kind:"image"|"video"|"file",
    size:number|null
}

export const MAX_MESSAGE_LENGTH:number = 250 // Same As Before
const MAX_ATTACHMENTS:number = 5 // Defines The Max Attachments

export const WAVEFORM_BARS:number = 35 // Defines The Waveform Bars
const MAX_LIVE_BARS:number = 120 // Most Bars The Live Waveform Can Show (Wide Screens)
const BAR_WIDTH:number = 3 // Width Of One Waveform Bar
const BAR_GAP:number = 2 // Gap Between Waveform Bars

interface ComposerProps {
    value:string,
    onChange:(value:string) => void,
    attachments:PendingAttachment[],
    onAttachmentsChange:(attachments:PendingAttachment[]) => void,
    onVoiceMessageUpdate:(voice_message:RecordedVoiceMessage|null) => void,
    voice_message:RecordedVoiceMessage|null,
    editing:ChatMessage|null,
    onCancelEdit:() => void,
    reply_on:ChatReplyPreview|null, // Message Being Replied To
    onCancelReply:() => void,
    onSend:() => void,
    is_sending:boolean,
    is_disabled:boolean // Not Connected Yet
}

// Function For Convert Decibels (From -60 dB - 0 dB To 0.05 - 1.0)
const dbToNormalized = (db?:number):number => {
    if(typeof db !== "number" || Number.isNaN(db)) return 0.1
    const clamped:number = Math.max(-60, Math.min(0, db)) // Gets The Clamped
    return Number((0.05 + ((clamped + 60) / 60) * 0.95).toFixed(3))
}

// Function For Normalize Wave Form
const normalizeWaveform = (samples:number[], targetBars:number = WAVEFORM_BARS):number[] => {
    if(samples.length === 0) return Array(targetBars).fill(0.15)
    if(samples.length <= targetBars) return samples

    const step:number = samples.length / targetBars // Gets The Step
    const result:number[] = [] // Stores The Result

    for(let i:number = 0; i < targetBars; i++) {
        const start:number = Math.floor(i * step) // Gets The Start
        const end:number = Math.floor((i + 1) * step) // Gets The End
        const slice:number[] = samples.slice(start, Math.max(start + 1, end)) // Gets The Slice
        const average:number = slice.reduce((sum, val) => sum + val, 0) / slice.length // Gets The Average

        result.push(Number(average.toFixed(3)))
    }

    return result // Returns Result
}

// Pulsing Red Dot Shown While Recording
function RecordingDot() {
    const opacity = useSharedValue<number>(1) // Opacity Of The Dot

    // Initializes The Pulse Animation
    useEffect(() => {
        opacity.set(withRepeat(withTiming(0.25, { duration: 700 }), -1, true))
    }, [opacity])

    const dot_style = useAnimatedStyle(() => ({ opacity: opacity.get() })) // Gets The Dot Style

    return <Animated.View style = {[styles.recording_dot, dot_style]} />
}

export default function Composer({ 
    value, 
    onChange, 
    attachments, 
    onAttachmentsChange, 
    onVoiceMessageUpdate,
    voice_message,
    editing, 
    onCancelEdit, 
    reply_on,
    onCancelReply,
    onSend, 
    is_sending, 
    is_disabled 
}:ComposerProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const plan = getActiveSubscriptionPlan(logged_in_user) // Gets The Plan
    const limits = getMediaLimits(plan) // Same Limits As The Server
    const max_file_bytes:number = plan === "free" ? 5_000_000 : 10_000_000 // Documents (Same As The Server)
    const remaining:number = MAX_ATTACHMENTS - attachments.length // Gets The Remaining
    const input_reference = useRef<ComponentRef<typeof TextInput>>(null) // Focuses The Input When Editing Starts

    const editing_id:number|null = editing?.id ?? null // Gets The Editing ID
    const reply_on_id:number|null = reply_on?.id ?? null // Gets The Reply On ID

    const raw_samples_reference = useRef<number[]>([]) // Stores The Raw Samples Reference
    const [live_waveform, setLiveWaveform] = useState<number[]>([]) // Stores The Live Waveform
    const [waveform_width, setWaveformWidth] = useState<number>(0) // Stores The Width Available For The Waveform

    // Initializes The Focus Of The Input When Editing Starts (Long-Press Menu Or Swipe), So The Keyboard Opens
    useEffect(() => {
        if(editing_id !== null) input_reference.current?.focus()
    }, [editing_id])

    // Initializes The Focus Of The Input When Replying Starts (Unless A Voice Message Replaces The Input)
    useEffect(() => {
        if(reply_on_id !== null) input_reference.current?.focus()
    }, [reply_on_id])

    // Creates The Audio Recorder
    const audio_recorder:AudioRecorder = useAudioRecorder({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
    })
    
    const audio_recorder_state = useAudioRecorderState(audio_recorder, 100) // Updates The Recorder Every 100 MS

    const MIN_RECORDING_MS:number = 600 // Defines The Minimum Recording In MS

    // Initializes The Live Wave Form Of Microphone
    useEffect(() => {
        if(!audio_recorder_state.isRecording) return

        const sample = dbToNormalized(audio_recorder_state.metering) // Gets The Sample
        raw_samples_reference.current.push(sample)
        setLiveWaveform(raw_samples_reference.current.slice(-MAX_LIVE_BARS)) // Sets The Live Waveform
    }, [audio_recorder_state.isRecording, audio_recorder_state.durationMillis, audio_recorder_state.metering])

    const is_recording:boolean = audio_recorder_state.isRecording // Stores The Information If A Voice Message Is Being Recorded
    const is_voice_mode:boolean = is_recording || !!voice_message // The Recorder Replaces The Text Input
    const voice_seconds:number = (is_recording ? audio_recorder_state.durationMillis : (voice_message?.duration ?? 0)) / 1000 // Gets The Shown Duration

    const bar_capacity:number = Math.min(MAX_LIVE_BARS, Math.max(1, Math.floor((waveform_width + BAR_GAP) / (BAR_WIDTH + BAR_GAP)))) // Bars That Fit The Width
    const live_samples:number[] = live_waveform.slice(-bar_capacity) // Newest Samples That Fit
    const live_bars:(number|null)[] = [...Array<null>(bar_capacity - live_samples.length).fill(null), ...live_samples] // Dots Fill The Rest Until The Recording Is Long Enough

    const can_send:boolean = !is_disabled && !is_sending && (value.trim().length > 0 || attachments.length > 0 || !!voice_message) // Checks If It Can Send

    // Function For Add Picked Files (Skips Files Over The Server Limits And Says Which)
    const addFiles = (picked:PendingAttachment[], durations:Map<string, number|null> = new Map()):void => {
        const rejected:string[] = [] // Gets The Rejected

        // Gets The Accepted
        const accepted:PendingAttachment[] = picked.filter((file:PendingAttachment) => {
            const limit:number = file.kind === "image" ? limits.max_image_bytes : file.kind === "video" ? limits.max_video_bytes : max_file_bytes // Gets The Limit
            const duration:number|null = durations.get(file.key) ?? null // Gets The Duration

            if(file.size !== null && file.size > limit) {
                rejected.push(`${file.name} (max. ${formatMegabytes(limit)})`)
                return false
            }

            if(file.kind === "video" && duration !== null && duration > limits.max_video_seconds) {
                rejected.push(`${file.name} (max. ${Math.round(limits.max_video_seconds / 60)} min)`)
                return false
            }

            return true
        })

        if(rejected.length > 0) showAlert(t("Niektoré súbory sú príliš veľké"), rejected.join("\n"))
        if(accepted.length > 0) onAttachmentsChange([...attachments, ...accepted].slice(0, MAX_ATTACHMENTS))
    }

    // Function For Pick Photos And Videos
    const pickMedia = async ():Promise<void> => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.9 }) // Gets The Result
        if(result.canceled) return

        const durations:Map<string, number|null> = new Map() // Gets The Durations

        addFiles(result.assets.map((asset, index:number) => {
            const is_video:boolean = asset.type === "video" // Checks If It Is Video
            const key:string = `${asset.uri}_${Date.now()}_${index}` // Gets The Key
            durations.set(key, typeof asset.duration === "number" ? asset.duration / 1000 : null)

            return {
                key,
                kind: is_video ? "video" as const : "image" as const,
                uri: asset.uri,
                name: asset.fileName ?? `attachment_${Date.now()}_${index}.${is_video ? "mp4" : "jpg"}`,
                mime_type: asset.mimeType ?? (is_video ? "video/mp4" : "image/jpeg"),
                web_file: asset.file ?? null,
                size: typeof asset.fileSize === "number" ? asset.fileSize : (asset.file?.size ?? null),
            }
        }), durations)
    }

    // Function For Pick Documents
    const pickDocuments = async ():Promise<void> => {
        const result = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true, copyToCacheDirectory: true }) // Gets The Result
        if(result.canceled) return

        addFiles(result.assets.slice(0, remaining).map((asset, index:number) => ({
            key: `${asset.uri}_${Date.now()}_${index}`,
            kind: "file" as const,
            uri: asset.uri,
            name: asset.name,
            mime_type: asset.mimeType ?? "application/octet-stream",
            web_file: asset.file ?? null,
            size: asset.size ?? null,
        })))
    }

    // Function For Start Recording The Voice Message
    const startRecording = async ():Promise<void> => {
        try {
            const permission:ImagePicker.PermissionResponse = await AudioModule.requestRecordingPermissionsAsync() // Gets The Permission

            if(!permission.granted) {
                showAlert(t("Povolenie"), t("Pre nahrávanie hlasových správ povoľte prístup k mikrofónu."))
                return
            }

            onVoiceMessageUpdate(null) // Sets The Voice Message
            raw_samples_reference.current = [] // Sets The Raw Samples Reference
            setLiveWaveform([]) // Sets The Live Wave Form

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true
            })

            await audio_recorder.prepareToRecordAsync()
            audio_recorder.record() // Starts The Rocord Of The Audio
            haptics.light()
        } 
        
        catch {
            haptics.error()
            showAlert(t("Chyba"), t("Nepodarilo sa spustiť nahrávanie hlasovej správy."))
        }
    }

    // Function For Stop Recording The Voice Message
    const stopRecording = async ():Promise<void> => {
        if(!audio_recorder_state.isRecording) return

        try {
            const duration:number = audio_recorder_state.durationMillis // Gets The Duration

            await audio_recorder.stop() // Stops The Rocord Of The Audio

            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true
            })

            const uri:string|null = audio_recorder.uri // Gets The URI

            if(!uri || duration < MIN_RECORDING_MS) {
                raw_samples_reference.current = [] // Sets The Raw Samples Reference
                setLiveWaveform([]) // Sets The Live Wave Form
                return
            }

            // Creates The File
            const file:UploadableFile = {
                uri,
                name: uri.split("/").pop() || "voice_message.m4a", // The Recorder Already Gives The File A Unique Name
                mime_type: "audio/mp4"
            }

            // Sets The Voice Message
            onVoiceMessageUpdate({
                file,
                duration,
                waveform: normalizeWaveform(raw_samples_reference.current),
            })

            haptics.light()
        } 
        
        catch {
            haptics.error()
            showAlert(t("Chyba"), t("Nepodarilo sa uložiť hlasovú správu."))
        }
    }

    // Function For Discard The Recorded Voice Message
    const discardVoiceMessage = async ():Promise<void> => {
        try {
            if(audio_recorder_state.isRecording) {
                await audio_recorder.stop() // Stops The Rocord Of The Audio

                await setAudioModeAsync({
                    allowsRecording: false,
                    playsInSilentMode: true
                })
            }
        } 
        
        finally {
            raw_samples_reference.current = [] // Sets The Raw Samples Reference
            setLiveWaveform([]) // Sets The Live Wave Form
            onVoiceMessageUpdate(null) // Sets The Voice Message
            haptics.light()
        }
    }

    return (
        <View style = {styles.container}>
            {!!editing && (
                <View style = {styles.banner}>
                    <Icon
                        name = "pen"
                        size = {12}
                        color = "primary"
                    />

                    <View style = {styles.flex}>
                        <Text variant = "label" color = "primary_text">{t("Úprava správy")}</Text>
                        <Text
                            variant = "caption"
                            color = "text_secondary"
                            numberOfLines = {1}
                        >
                            {editing.content}
                        </Text>
                    </View>

                    <IconButton
                        icon = "xmark"
                        accessibility_label = {t("Zrušiť úpravu")}
                        onPress = {onCancelEdit}
                        size = {28}
                        icon_color = "text_muted"
                    />
                </View>
            )}

            {!!reply_on && !editing && (
                <View style = {[styles.banner, styles.reply_banner]}>
                    <Icon
                        name = "reply"
                        size = {12}
                        color = "primary"
                    />
                    <ReplyQuote
                        reply = {reply_on}
                        current_user_id = {logged_in_user?.id ?? null}
                        variant = "composer"
                    />
                    <IconButton
                        icon = "xmark"
                        accessibility_label = {t("Zrušiť odpovedanie")}
                        onPress = {onCancelReply}
                        size = {28}
                        icon_color = "text_muted"
                    />
                </View>
            )}

            {attachments.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator = {false}
                    contentContainerStyle = {styles.previews}
                >
                    {attachments.map((attachment:PendingAttachment) => (
                        <View key = {attachment.key} style = {styles.preview}>
                            {attachment.kind === "image" ? (
                                <Image
                                    source = {{ uri: attachment.uri }}
                                    style = {StyleSheet.absoluteFill}
                                    contentFit = "cover"
                                />
                            ) : (
                                <View style = {styles.preview_file}>
                                    <Icon
                                        name = {attachment.kind === "video" ? "film" : "file"}
                                        size = {16}
                                        color = "primary"
                                    />
                                    <Text
                                        variant = "caption"
                                        numberOfLines = {2}
                                        align = "center"
                                    >
                                        {attachment.name}
                                    </Text>
                                </View>
                            )}

                            <View style = {styles.preview_remove}>
                                <IconButton
                                    icon = "xmark"
                                    accessibility_label = {`${t("Odstrániť")}: ${attachment.name}`}
                                    onPress = {() => onAttachmentsChange(attachments.filter((other) => other.key !== attachment.key))}
                                    variant = "soft"
                                    size = {24}
                                />
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}

            <View style = {styles.row}>
                {!editing && !is_voice_mode && (
                    <>
                        <IconButton
                            icon = "image"
                            accessibility_label = {t("Pridať fotky alebo videá")}
                            onPress = {pickMedia}
                            is_disabled = {remaining <= 0}
                            size = {40}
                            icon_color = "primary"
                            is_solid_icon = {false}
                        />
                        <IconButton
                            icon = "paperclip"
                            accessibility_label = {t("Pridať súbor")}
                            onPress = {pickDocuments}
                            is_disabled = {remaining <= 0}
                            size = {40}
                            icon_color = "primary"
                        />
                    </>
                )}

                {is_voice_mode ? (
                    <>
                        <IconButton
                            icon = "trash"
                            accessibility_label = {t("Vymazať nahrávku")}
                            onPress = {discardVoiceMessage}
                            is_disabled = {is_sending}
                            size = {40}
                            icon_color = "danger"
                        />

                        <View
                            style = {styles.voice_pill}
                            accessibilityLiveRegion = "polite"
                            accessibilityLabel = {is_recording ? t("Nahrávanie") : t("Hlasová správa")}
                        >
                            {is_recording ? <RecordingDot /> : <Icon
                                name = "microphone"
                                size = {14}
                                color = "primary"
                            />}

                            <Text
                                variant = "label"
                                color = {is_recording ? "text" : "text_secondary"}
                                is_tabular
                                style = {styles.voice_time}
                            >
                                {getFormattedTime("minutes", voice_seconds)}:{getFormattedTime("seconds", voice_seconds, true)}
                            </Text>

                            <View style = {styles.waveform_container} onLayout = {(event) => setWaveformWidth(event.nativeEvent.layout.width)}>
                                {(is_recording ? live_bars : fitWaveformToBars(voice_message?.waveform ?? [], bar_capacity)).map((value:number|null, index:number) => (
                                    <View key = {index} style = {styles.waveform_slot}>
                                        <View style = {[styles.waveform_bar, value === null ? styles.waveform_bar_empty : is_recording ? null : styles.waveform_bar_ready, { height: value === null ? BAR_WIDTH : Math.max(4, Math.min(22, value * 22)) }]} />
                                    </View>
                                ))}
                            </View>
                        </View>

                        {is_recording &&
                            <IconButton
                                icon = "stop"
                                accessibility_label = {t("Ukončiť nahrávanie")}
                                onPress = {stopRecording}
                                variant = "danger"
                                size = {40}
                            />
                        }
                    </>
                ) : (
                    <>
                        {!editing &&
                            <IconButton
                                icon = "microphone"
                                accessibility_label = {t("Spustiť nahrávanie")}
                                onPress = {startRecording}
                                size = {40}
                                icon_color = "primary"
                            />
                        }

                        <TextField
                            ref = {input_reference}
                            placeholder = {t("Napíšte správu")}
                            accessibilityLabel = {t("Napíšte správu")}
                            value = {value}
                            onChangeText = {onChange}
                            multiline
                            multiline_min_height = {24}
                            maxLength = {MAX_MESSAGE_LENGTH}
                            container_style = {styles.flex}
                        />
                    </>
                )}

                <IconButton
                    icon = "paper-plane"
                    accessibility_label = {editing ? t("Uložiť zmeny") : t("Odoslať")}
                    onPress = {onSend}
                    is_disabled = {!can_send}
                    variant = "solid"
                    size = {44}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    container: {
        gap: spacing.sm,
    },

    banner: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingLeft: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.primary_soft,
        borderRadius: radii.md,
    },

    reply_banner: {
        paddingVertical: 0,
        paddingLeft: spacing.md,
        backgroundColor: colors.surface_raised,
        borderWidth: 1,
        borderColor: colors.border,
    },

    previews: {
        gap: spacing.sm,
    },

    preview: {
        width: 72,
        height: 72,
        overflow: "hidden",
        backgroundColor: colors.surface_raised,
        borderRadius: radii.md,
    },

    preview_file: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: 4,
    },

    preview_remove: {
        position: "absolute",
        top: 2,
        right: 2,
    },

    row: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: spacing.xs,
    },

    voice_pill: {
        flex: 1,
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface_raised,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.pill,
    },

    recording_dot: {
        width: 8,
        height: 8,
        backgroundColor: colors.danger,
        borderRadius: radii.pill,
    },

    voice_time: {
        minWidth: 34,
    },

    waveform_container: {
        flex: 1,
        height: 24,
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
    },

    waveform_slot: {
        flex: 1,
        alignItems: "center", // Each Bar Gets An Equal Share Of The Width, So The Bars Span The Whole Space
    },

    waveform_bar: {
        width: BAR_WIDTH,
        borderRadius: radii.pill,
        backgroundColor: colors.text_muted,
    },

    waveform_bar_empty: {
        opacity: 0.35,
    },

    waveform_bar_ready: {
        backgroundColor: colors.primary,
    },
})