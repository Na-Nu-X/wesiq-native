// Message Composer: Text, Attachments (Photos / Videos / Files) And Editing

import { ComponentRef, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native"
import { Image } from "expo-image"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"
import { Button, Icon, IconButton, Text, TextField } from "@/components/ui"
import { colors, layout, radii, spacing } from "@/theme"
import { showAlert } from "@/lib/alert"
import { formatMegabytes } from "@/lib/format"
import { getActiveSubscriptionPlan } from "@/lib/subscription"
import { getMediaLimits } from "@/components/features/upload-post/mediaRules"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { AudioModule, AudioRecorder, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio"
import { haptics } from "@/lib/haptics"
import { Ionicons } from "@expo/vector-icons"

import type { UploadableFile } from "@/lib/api/upload"
import type { ChatMessage } from "@/types/models"
import type { RecordedVoiceMessage } from "@/app/(tabs)/chat/[username]"
import { BLUE_COLOR, MAIN_COLOR, RED_COLOR, SECONDARY_COLOR } from "@/constants/colors"
import { getFormattedTime, getMinimalistFormattedTime } from "@/utils/time"

export interface PendingAttachment extends UploadableFile {
    key:string,
    kind:"image"|"video"|"file",
    size:number|null
}

export const MAX_MESSAGE_LENGTH:number = 250 // Same As Before
const MAX_ATTACHMENTS:number = 5

export const WAVEFORM_BARS:number = 35 // Defines The Waveform Bars

interface ComposerProps {
    value:string,
    onChange:(value:string) => void,
    attachments:PendingAttachment[],
    onAttachmentsChange:(attachments:PendingAttachment[]) => void,
    onVoiceMessageUpdate:(voice_message:RecordedVoiceMessage|null) => void,
    voice_message:RecordedVoiceMessage|null,
    editing:ChatMessage|null,
    onCancelEdit:() => void,
    onSend:() => void,
    is_sending:boolean,
    is_disabled:boolean // Not Connected Yet
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
    onSend, 
    is_sending, 
    is_disabled 
}:ComposerProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const plan = getActiveSubscriptionPlan(logged_in_user) // Gets The Plan
    const limits = getMediaLimits(plan) // Same Limits As The Server
    const max_file_bytes:number = plan === "free" ? 5_000_000 : 10_000_000 // Documents (Same As The Server)
    const remaining:number = MAX_ATTACHMENTS - attachments.length
    const input_reference = useRef<ComponentRef<typeof TextInput>>(null) // Focuses The Input When Editing Starts

    const editing_id:number|null = editing?.id ?? null

    const raw_samples_reference = useRef<number[]>([]) // Stores The Raw Samples Reference
    const [live_waveform, setLiveWaveform] = useState<number[]>([]) // Stores The Live Waveform

    // Initializes The Focus Of The Input When Editing Starts (Long-Press Menu Or Swipe), So The Keyboard Opens
    useEffect(() => {
        if(editing_id !== null) input_reference.current?.focus()
    }, [editing_id])

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

        const sample = dbToNormalized(audio_recorder_state.metering)
        raw_samples_reference.current.push(sample)
        setLiveWaveform(raw_samples_reference.current.slice(-WAVEFORM_BARS))
    }, [audio_recorder_state.isRecording, audio_recorder_state.durationMillis, audio_recorder_state.metering])

    const can_send:boolean = !is_disabled && !is_sending && (value.trim().length > 0 || attachments.length > 0 || !!voice_message)

    // Function For Add Picked Files (Skips Files Over The Server Limits And Says Which)
    const addFiles = (picked:PendingAttachment[], durations:Map<string, number|null> = new Map()):void => {
        const rejected:string[] = []

        const accepted:PendingAttachment[] = picked.filter((file:PendingAttachment) => {
            const limit:number = file.kind === "image" ? limits.max_image_bytes : file.kind === "video" ? limits.max_video_bytes : max_file_bytes
            const duration:number|null = durations.get(file.key) ?? null

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
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.9 })
        if(result.canceled) return

        const durations:Map<string, number|null> = new Map()

        addFiles(result.assets.map((asset, index:number) => {
            const is_video:boolean = asset.type === "video"
            const key:string = `${asset.uri}_${Date.now()}_${index}`
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
        const result = await DocumentPicker.getDocumentAsync({ type: "*/*", multiple: true, copyToCacheDirectory: true })
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
                name: `voice_${Date.now()}.m4a`,
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

    // Converts Decibels (From -60 dB - 0 dB To 0.05 - 1.0)
    const dbToNormalized = (db?:number):number => {
        if(typeof db !== "number" || Number.isNaN(db)) return 0.1
        const clamped:number = Math.max(-60, Math.min(0, db))
        return Number((0.05 + ((clamped + 60) / 60) * 0.95).toFixed(3))
    }

    // Function For Normalize Wave Form
    const normalizeWaveform = (samples:number[], targetBars:number = WAVEFORM_BARS):number[] => {
        if(samples.length === 0) return Array(targetBars).fill(0.15)
        if(samples.length <= targetBars) return samples

        const step:number = samples.length / targetBars // Gets The Step
        const result:number[] = [] // Stores The Result

        for(let i:number = 0; i < targetBars; i++) {
            const start:number = Math.floor(i * step)
            const end:number = Math.floor((i + 1) * step)
            const slice:number[] = samples.slice(start, Math.max(start + 1, end))
            const average:number = slice.reduce((sum, val) => sum + val, 0) / slice.length

            result.push(Number(average.toFixed(3)))
        }

        return result // Returns Result
    }

    return (
        <View style={styles.container}>
            {!!editing && (
                <View style={styles.banner}>
                    <Icon name="pen" size={12} color="primary" />

                    <View style={styles.flex}>
                        <Text variant="label" color="primary_text">{t("Úprava správy")}</Text>
                        <Text variant="caption" color="text_secondary" numberOfLines={1}>{editing.content}</Text>
                    </View>

                    <IconButton icon="xmark" accessibility_label={t("Zrušiť úpravu")} onPress={onCancelEdit} size={28} icon_color="text_muted" />
                </View>
            )}

            {attachments.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previews}>
                    {attachments.map((attachment:PendingAttachment) => (
                        <View key={attachment.key} style={styles.preview}>
                            {attachment.kind === "image" ? (
                                <Image source={{ uri: attachment.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                            ) : (
                                <View style={styles.preview_file}>
                                    <Icon name={attachment.kind === "video" ? "film" : "file"} size={16} color="primary" />
                                    <Text variant="caption" numberOfLines={2} align="center">{attachment.name}</Text>
                                </View>
                            )}

                            <View style={styles.preview_remove}>
                                <IconButton icon="xmark" accessibility_label={`${t("Odstrániť")}: ${attachment.name}`} onPress={() => onAttachmentsChange(attachments.filter((other) => other.key !== attachment.key))} variant="soft" size={24} />
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}

            <View style={styles.row}>
                {!editing && (
                    <>
                        <IconButton icon="image" accessibility_label={t("Pridať fotky alebo videá")} onPress={pickMedia} is_disabled={remaining <= 0} size={40} icon_color="primary" is_solid_icon={false} />
                        <IconButton icon="paperclip" accessibility_label={t("Pridať súbor")} onPress={pickDocuments} is_disabled={remaining <= 0} size={40} icon_color="primary" />
                    </>
                )}

                {audio_recorder_state.isRecording ? (
                    <View style={styles.recording_container}>
                        <Pressable 
                            onPress={discardVoiceMessage} 
                            accessibilityLabel={t("Vymazať nahrávku")}
                            style={styles.delete_button}
                        >
                            <Icon name="trash" size={20} color="danger" />
                        </Pressable>

                        <View style={styles.recording_info}>
                            <View 
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: colors.danger,
                                }} 
                            />

                            <Text style={styles.timer_text}>{getFormattedTime("minutes", audio_recorder_state.durationMillis / 1000)}:{getFormattedTime("seconds", audio_recorder_state.durationMillis / 1000, true)}</Text>

                            <View style={styles.waveform_container}>
                                {live_waveform.map((value:number, index:number) => (
                                    <View
                                        key={index}

                                        style={[
                                            styles.waveform_bar,
                                            { height: Math.max(4, value * 24) },
                                        ]}
                                    />
                                ))}
                            </View>
                        </View>

                        <Pressable 
                            onPress={stopRecording} 
                            accessibilityLabel={t("Ukončiť nahrávanie")}

                            style={[
                                styles.stop_button,
                                { marginLeft: "auto" },
                            ]}
                        >
                            <Icon name="stop" size={20} color="danger" />
                        </Pressable>
                    </View>
                ) : voice_message ? (
                    <View style={styles.recording_container}>
                        <Pressable 
                            onPress={discardVoiceMessage} 
                            disabled={is_sending}
                            accessibilityLabel={t("Vymazať nahrávku")}
                            style={styles.delete_button}
                        >
                            <Icon name="trash" size={20} color="danger" />
                        </Pressable>

                        <View style={styles.recording_info}>
                            <Icon name="microphone" size={20} color="primary" />

                            <Text style={styles.timer_text}>{getFormattedTime("minutes", voice_message.duration / 1000)}:{getFormattedTime("seconds", voice_message.duration / 1000, true)}</Text>

                            <View style={styles.waveform_container}>
                                {voice_message.waveform.map((value:number, index:number) => (
                                    <View
                                        key={index}

                                        style={[
                                            styles.waveform_bar,
                                            styles.waveform_bar_ready,
                                            { height: Math.max(4, value * 24) },
                                        ]}
                                    />
                                ))}
                            </View>
                        </View>
                    </View>
                ) : (
                    <>
                        <IconButton icon="microphone" accessibility_label={t("Spustiť nahrávanie")} onPress={startRecording} size={40} icon_color="primary" />

                        <TextField
                            ref={input_reference}
                            placeholder={t("Napíšte správu")}
                            accessibilityLabel={t("Napíšte správu")}
                            value={value}
                            onChangeText={onChange}
                            multiline
                            multiline_min_height={24}
                            maxLength={MAX_MESSAGE_LENGTH}
                            container_style={styles.flex}
                        />
                    </>
                )}


                <IconButton icon="paper-plane" accessibility_label={editing ? t("Uložiť zmeny") : t("Odoslať")} onPress={onSend} is_disabled={!can_send} variant="solid" size={44} />
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

    recording_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flex: 1,
        minHeight: 40,
        marginRight: 10,
    },

    recording_info: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        width: "100%",
        height: 40,
        paddingHorizontal: 10,
    },

    timer_text: {
        fontSize: 12,
        fontWeight: "600",
        fontVariant: ["tabular-nums"],
        color: SECONDARY_COLOR,
    },

    waveform_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        gap: 5,
        height: 25,
        overflow: "hidden",
    },

    waveform_bar: {
        width: 2.5,
        borderRadius: 2,
        backgroundColor: colors.text_muted,
    },

    waveform_bar_ready: {
        backgroundColor: colors.primary,
    },

    delete_button: {
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
    },

    stop_button: {
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        borderWidth: 1,
        borderColor: colors.danger,
        borderRadius: "50%",
    },
})