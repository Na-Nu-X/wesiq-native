// Message Composer: Text, Attachments (Photos / Videos / Files) And Editing

import { ScrollView, StyleSheet, View } from "react-native"
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

import type { UploadableFile } from "@/lib/api/upload"
import type { ChatMessage } from "@/types/models"

export interface PendingAttachment extends UploadableFile {
    key:string,
    kind:"image"|"video"|"file",
    size:number|null
}

export const MAX_MESSAGE_LENGTH:number = 250 // Same As Before
const MAX_ATTACHMENTS:number = 5

interface ComposerProps {
    value:string,
    onChange:(value:string) => void,
    attachments:PendingAttachment[],
    onAttachmentsChange:(attachments:PendingAttachment[]) => void,
    editing:ChatMessage|null,
    onCancelEdit:() => void,
    onSend:() => void,
    is_sending:boolean,
    is_disabled:boolean // Not Connected Yet
}

export default function Composer({ value, onChange, attachments, onAttachmentsChange, editing, onCancelEdit, onSend, is_sending, is_disabled }:ComposerProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const plan = getActiveSubscriptionPlan(logged_in_user) // Gets The Plan
    const limits = getMediaLimits(plan) // Same Limits As The Server
    const max_file_bytes:number = plan === "free" ? 5_000_000 : 10_000_000 // Documents (Same As The Server)
    const remaining:number = MAX_ATTACHMENTS - attachments.length

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

    const can_send:boolean = !is_disabled && !is_sending && (value.trim().length > 0 || attachments.length > 0)

    return (
        <View style={styles.container}>
            {editing && (
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

                <TextField
                    placeholder={t("Napíšte správu")}
                    accessibilityLabel={t("Napíšte správu")}
                    value={value}
                    onChangeText={onChange}
                    multiline
                    multiline_min_height={24}
                    maxLength={MAX_MESSAGE_LENGTH}
                    container_style={styles.flex}
                />

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
})
