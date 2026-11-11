// Three Column Grid Of Post Thumbnails (Profile Posts And Saved Posts)

import { useState } from "react"
import { LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Icon } from "@/components/ui"
import { colors, radii } from "@/theme"
import { getMediaUrl } from "@/lib/media"

import type { ProfilePostPreview } from "@/types/models"

const COLUMNS:number = 3
const GAP:number = 3

export default function PostGrid({ posts, author_username }:{ posts:ProfilePostPreview[], author_username:string }) {
    const { t } = useTranslation() // Initializes The Translations
    const [width, setWidth] = useState<number>(0) // Stores The Grid Width
    const tile:number = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0 // Gets The Tile Size

    return (
        <View style={styles.grid} onLayout={(event:LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
            {tile > 0 && posts.map((post:ProfilePostPreview) => {
                const cover = post.media[0] // Gets The First Media
                const uri:string|null = getMediaUrl(cover?.is_video ? (cover.thumbnail ?? cover.file) : cover?.file) // Gets The Thumbnail

                return (
                    <Pressable
                        key={post.id}
                        onPress={() => router.push({ pathname: "/post/[post_id]", params: { post_id: post.id } })}
                        accessibilityRole="button"
                        accessibilityLabel={t("Príspevok užívateľa {{username}}", { username: author_username })}
                        style={({ pressed }) => [styles.tile, { width: tile, height: tile }, pressed ? styles.pressed : null]}
                    >
                        {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} recyclingKey={post.id} /> : <Icon name="image" size={18} color="text_muted" />}

                        {(cover?.is_video || post.media.length > 1) && (
                            <View style={styles.marker}>
                                <Icon name={cover?.is_video ? "play" : "clone"} size={11} color="white" />
                            </View>
                        )}
                    </Pressable>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: GAP,
    },

    tile: {
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface_raised,
        borderRadius: radii.xs,
    },

    pressed: {
        opacity: 0.8,
    },

    marker: {
        position: "absolute",
        top: 6,
        right: 6,
        padding: 4,
        backgroundColor: colors.overlay,
        borderRadius: radii.pill,
    },
})
