// One Selected Photo / Video In The Upload Flow (Preview, Order, Remove, Mute, Cover, Validation)

import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { useVideoPlayer, VideoView } from "expo-video"
import { useTranslation } from "react-i18next"
import { Icon, IconButton, Text } from "@/components/ui"
import { colors, layout, radii, spacing } from "@/theme"
import { formatDuration, formatMegabytes } from "./mediaRules"

import type { DraftMedia, MediaIssue } from "./mediaRules"

export const TILE_WIDTH:number = 132
export const TILE_HEIGHT:number = 165 // 4:5 Like The Feed

interface MediaTileProps {
    media:DraftMedia,
    index:number,
    count:number,
    issue:MediaIssue|null,
    onRemove:() => void,
    onMove:(direction:-1|1) => void,
    onToggleMute:() => void,
    onPickCover:() => void
}

export default function MediaTile({ media, index, count, issue, onRemove, onMove, onToggleMute, onPickCover }:MediaTileProps) {
    const { t } = useTranslation() // Initializes The Translations
    const position_label:string = t("Položka {{position}} z {{count}}", { position: index + 1, count }) // Gets The Position Label

    // Function For Get The Issue Text
    const getIssueText = (media_issue:MediaIssue):string => {
        if(media_issue.kind === "image_too_large") return t("Max. {{size}}", { size: formatMegabytes(media_issue.limit_bytes) })
        if(media_issue.kind === "video_too_large") return t("Max. {{size}}", { size: formatMegabytes(media_issue.limit_bytes) })
        if(media_issue.kind === "video_too_long") return t("Max. {{duration}}", { duration: formatDuration(media_issue.limit_seconds) })
        return t("Príliš krátke")
    }

    return (
        <View style={styles.container} accessibilityLabel={`${position_label}, ${media.type === "video" ? t("Video") : t("Fotka")}`}>
            <View style={[styles.preview, issue ? styles.preview_invalid : null]}>
                {media.type === "video" && !media.cover ? (
                    <VideoPreview uri={media.uri} />
                ) : (
                    <Image source={{ uri: media.cover?.uri ?? media.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
                )}

                <View style={styles.order_badge}>
                    <Text variant="caption" color="white" is_tabular style={styles.order_text}>{index + 1}</Text>
                </View>

                <View style={styles.remove}>
                    <IconButton icon="xmark" accessibility_label={`${t("Odstrániť")}: ${position_label}`} onPress={onRemove} variant="soft" size={28} />
                </View>

                {media.type === "video" && (
                    <View style={[styles.video_bar, issue ? styles.video_bar_raised : null]}>
                        <View style={styles.duration}>
                            <Icon name="play" size={9} color="white" />
                            {media.duration_seconds !== null && <Text variant="caption" color="white" is_tabular>{formatDuration(media.duration_seconds)}</Text>}
                        </View>

                        <IconButton
                            icon={media.is_muted ? "volume-xmark" : "volume-high"}
                            accessibility_label={media.is_muted ? t("Zapnúť zvuk") : t("Stlmiť zvuk")}
                            onPress={onToggleMute}
                            variant="soft"
                            size={28}
                        />
                    </View>
                )}

                {!!issue && (
                    <View style={styles.issue} accessibilityLiveRegion="polite">
                        <Icon name="triangle-exclamation" size={12} color="white" />
                        <Text variant="caption" color="white" numberOfLines={1}>{getIssueText(issue)}</Text>
                    </View>
                )}
            </View>

            <View style={styles.actions}>
                <IconButton icon="chevron-left" accessibility_label={`${t("Posunúť dopredu")}: ${position_label}`} onPress={() => onMove(-1)} is_disabled={index === 0} size={30} />

                {media.type === "video" ? (
                    <IconButton icon="image" accessibility_label={media.cover ? t("Zmeniť náhľad videa") : t("Vybrať náhľad videa")} onPress={onPickCover} size={30} icon_color={media.cover ? "primary" : "text_secondary"} />
                ) : <View style={styles.spacer} />}

                <IconButton icon="chevron-right" accessibility_label={`${t("Posunúť dozadu")}: ${position_label}`} onPress={() => onMove(1)} is_disabled={index === count - 1} size={30} />
            </View>
        </View>
    )
}

// Function For Render The First Frame Of A Video
function VideoPreview({ uri }:{ uri:string }) {
    const player = useVideoPlayer(uri, (video_player) => {
        video_player.muted = true
        video_player.loop = false
    })

    return <VideoView player={player} nativeControls={false} contentFit="cover" style={StyleSheet.absoluteFill} pointerEvents="none" />
}

const styles = StyleSheet.create({
    container: {
        width: TILE_WIDTH,
        gap: spacing.xs,
    },

    preview: {
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        overflow: "hidden",
        backgroundColor: colors.surface_raised,
        borderWidth: layout.hairline,
        borderColor: colors.border,
        borderRadius: radii.md,
    },

    preview_invalid: {
        borderColor: colors.danger,
        borderWidth: 2,
    },

    order_badge: {
        position: "absolute",
        top: spacing.sm,
        left: spacing.sm,
        minWidth: 22,
        height: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.overlay,
        borderRadius: radii.pill,
    },

    order_text: {
        fontWeight: "700",
    },

    remove: {
        position: "absolute",
        top: spacing.xs,
        right: spacing.xs,
    },

    video_bar: {
        position: "absolute",
        left: spacing.sm,
        right: spacing.xs,
        bottom: spacing.xs,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    video_bar_raised: {
        bottom: 34, // Leaves Room For The Issue Banner
    },

    duration: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        backgroundColor: colors.overlay,
        borderRadius: radii.pill,
    },

    issue: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        paddingVertical: spacing.xs + 2,
        backgroundColor: colors.danger,
    },

    actions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    spacer: {
        width: 30,
    },
})
