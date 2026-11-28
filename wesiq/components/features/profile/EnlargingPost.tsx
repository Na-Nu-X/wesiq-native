// One Post Thumbnail In The Profile Grid (Tap Opens The Post, Long Press Shows An Enlarged Preview Of The Cover)

import { useState } from "react"
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Icon } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { getMediaUrl } from "@/lib/media"

import type { ProfilePostPreview } from "@/types/models"

export interface EnlargingPostProps {
    post:ProfilePostPreview,
    size:number, // The Tile Size From The Grid
    author_username:string,
    max_enlarged_size?:number,
    delay_long_press?:number
}

export default function EnlargingPost({
    post,
    size,
    author_username,
    max_enlarged_size = 480,
    delay_long_press = 250
}:EnlargingPostProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { width: window_width, height: window_height } = useWindowDimensions() // Gets The Window Size

    const [is_visible, setIsVisible] = useState<boolean>(false) // Stores The Information If The Preview Modal Is Open
    const [progress] = useState<Animated.Value>(() => new Animated.Value(0)) // Stores The Open / Close Animation Progress

    const cover = post.media[0] // Gets The First Media
    const uri:string|null = getMediaUrl(cover?.is_video ? (cover.thumbnail ?? cover.file) : cover?.file) // Gets The Thumbnail
    const has_marker:boolean = cover?.is_video === true || post.media.length > 1 // Stores The Information If The Video / Carousel Marker Is Shown
    const enlarged_size:number = Math.min(window_width - spacing.lg * 2, window_height * 0.7, max_enlarged_size) // Gets The Preview Size

    // Function For Open The Post
    const openPost = ():void => {
        router.push({ pathname: "/post/[post_id]", params: { post_id: post.id } })
    }

    // Function For Open The Preview
    const openPreview = ():void => {
        haptics.light()
        progress.setValue(0)
        setIsVisible(true) // Opens The Preview

        // Runs The Animation
        Animated.spring(progress, {
            toValue: 1,
            damping: 18,
            stiffness: 240,
            useNativeDriver: true
        }).start()
    }

    // Function For Close The Preview
    const closePreview = ():void => {
        Animated.timing(progress, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true
        }).start(({ finished }) => {
            if(finished) setIsVisible(false) // Closes The Preview
        })
    }

    // Function For Open The Post From The Preview
    const openPostFromPreview = ():void => {
        setIsVisible(false) // Closes The Preview Right Away So It Doesn't Stay Above The Pushed Screen
        openPost()
    }

    // Gets The Scale
    const scale:Animated.AnimatedInterpolation<number> = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.65, 1]
    })

    return (
        <>
            <Pressable
                onPress = {openPost}
                onLongPress = {uri ? openPreview : undefined}
                delayLongPress = {delay_long_press}
                accessibilityRole = "button"
                accessibilityLabel = {t("Príspevok užívateľa {{username}}", { username: author_username })}
                style = {({ pressed }) => [styles.tile, { width: size, height: size }, pressed ? styles.pressed : null]}
            >
                {uri ? <Image
                    source = {{ uri }}
                    style = {StyleSheet.absoluteFill}
                    contentFit = "cover"
                    transition = {150}
                    recyclingKey = {post.id}
                /> : <Icon
                    name = "image"
                    size = {18}
                    color = "text_muted"
                />}

                {has_marker && (
                    <View style = {styles.marker}>
                        <Icon
                            name = {cover?.is_video ? "play" : "clone"}
                            size = {11}
                            color = "white"
                        />
                    </View>
                )}
            </Pressable>

            {is_visible && uri ? (
                <Modal
                    visible = {is_visible}
                    transparent
                    animationType = "none"
                    statusBarTranslucent
                    onRequestClose = {closePreview}
                >
                    <Animated.View style = {[styles.backdrop, { opacity: progress }]}>
                        <Pressable
                            style = {styles.backdrop_pressable}
                            onPress = {closePreview}
                            accessibilityRole = "button"
                            accessibilityLabel = {t("Zavrieť")}
                        >
                            <Animated.View style = {{ transform: [{ scale }] }}>
                                <Pressable
                                    onPress = {openPostFromPreview}
                                    accessibilityRole = "button"
                                    accessibilityLabel = {t("Príspevok užívateľa {{username}}", { username: author_username })}
                                >
                                    <Image
                                        source = {{ uri }}
                                        style = {[styles.preview, { width: enlarged_size, height: enlarged_size }]}
                                        contentFit = "cover"
                                        recyclingKey = {post.id}
                                    />

                                    {has_marker && (
                                        <View style = {[styles.marker, styles.marker_large]}>
                                            <Icon
                                                name = {cover?.is_video ? "play" : "clone"}
                                                size = {16}
                                                color = "white"
                                            />
                                        </View>
                                    )}
                                </Pressable>
                            </Animated.View>
                        </Pressable>
                    </Animated.View>
                </Modal>
            ) : null}
        </>
    )
}

const styles = StyleSheet.create({
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

    marker_large: {
        top: spacing.md,
        right: spacing.md,
        padding: 8,
    },

    backdrop: {
        flex: 1,
        backgroundColor: colors.overlay,
    },

    backdrop_pressable: {
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
    },

    preview: {
        backgroundColor: colors.surface_raised,
        borderRadius: radii.lg,
    },
})
