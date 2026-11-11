// A Post Still Being Processed On The Server (Video Compression Progress)

import { StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { useTranslation } from "react-i18next"
import { Card, Icon, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { getMediaUrl } from "@/lib/media"

import type { ProcessingPost } from "@/types/models"
import type { TrackedTask } from "./useUploadTracking"

export default function ProcessingPostCard({ post, tasks }:{ post:ProcessingPost, tasks:TrackedTask[] }) {
    const { t } = useTranslation() // Initializes The Translations
    const post_tasks:TrackedTask[] = tasks.filter((task:TrackedTask) => task.post_id === post.id) // Gets The Tasks Of The Post
    const has_failed:boolean = post_tasks.some((task:TrackedTask) => task.state === "FAILURE")
    const progress:number = post_tasks.length > 0 ? Math.round(post_tasks.reduce((total:number, task:TrackedTask) => total + task.progress, 0) / post_tasks.length) : 0
    const thumbnail:string|null = getMediaUrl(post.media[0]?.thumbnail ?? post.media[0]?.file) // Gets The Preview

    return (
        <Card padding="md" style={styles.card} accessibility_label={has_failed ? t("Príspevok sa nepodarilo spracovať") : `${t("Spracováva sa príspevok")} ${progress}%`}>
            <View style={styles.thumbnail}>
                {thumbnail ? <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon name="film" size={16} color="primary" />}
            </View>

            <View style={styles.body}>
                <Text variant="body_strong">{has_failed ? t("Príspevok sa nepodarilo spracovať") : t("Spracováva sa príspevok")}</Text>
                {post.description && <Text variant="caption" color="text_secondary" numberOfLines={1}>{post.description}</Text>}

                {!has_failed && (
                    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }}>
                        <View style={[styles.fill, { width: `${Math.max(progress, 4)}%` }]} />
                    </View>
                )}
            </View>

            {!has_failed && <Text variant="label" color="primary_text" is_tabular>{progress}%</Text>}
        </Card>
    )
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },

    thumbnail: {
        width: 48,
        height: 60,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface_raised,
        borderRadius: radii.sm,
    },

    body: {
        flex: 1,
        gap: spacing.xs,
    },

    track: {
        height: 5,
        overflow: "hidden",
        backgroundColor: colors.surface_strong,
        borderRadius: radii.pill,
    },

    fill: {
        height: "100%",
        backgroundColor: colors.primary,
        borderRadius: radii.pill,
    },
})
