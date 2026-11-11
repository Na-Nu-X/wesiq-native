// One Post In The Feed Or On The Post Screen

import { memo, useEffect, useRef, useState } from "react"
import { Image as NativeImage, LayoutChangeEvent, Linking, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import { Avatar, Button, Icon, IconButton, Text } from "@/components/ui"
import { formatUsername } from "@/lib/format"
import { colors, layout, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { showAlert } from "@/lib/alert"
import { getMediaUrl } from "@/lib/media"
import { getTimeAgo } from "@/utils/time"
import { togglePostLike, togglePostSave } from "@/lib/api/endpoints/posts"
import { getFollowState, getToggledFollowFlags, toggleFollow } from "@/lib/api/endpoints/users"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import PostVideo from "./PostVideo"
import Caption from "./Caption"
import HeartParticles, { createHeartParticles, HeartParticle } from "./HeartParticles"

import type { Post, PostAuthor, PostMedia } from "@/types/models"

const DEFAULT_IMAGE_RATIO:number = 4 / 5 // Until The First Photo Size Is Known
const DEFAULT_VIDEO_RATIO:number = 16 / 9 // Videos Without A Thumbnail
const MIN_MEDIA_RATIO:number = 4 / 5 // Tallest Frame (Portrait)
const MAX_MEDIA_RATIO:number = 1.91 // Widest Frame (Landscape)

const aspect_ratio_cache:Map<string, number> = new Map() // Keeps Measured Sizes While Scrolling The Feed

// Function For Measure The Frame Shape From The First Photo Or Video Thumbnail (Landscape Posts Get A Landscape Frame)
function useMediaAspectRatio(first_media:PostMedia|undefined):number {
    const uri:string|null = first_media ? getMediaUrl(first_media.is_video ? first_media.thumbnail : first_media.file) : null
    const fallback:number = first_media?.is_video ? DEFAULT_VIDEO_RATIO : DEFAULT_IMAGE_RATIO
    const [measured, setMeasured] = useState<{ uri:string, ratio:number }|null>(null)

    // Initializes The Measurement Of The First Media
    useEffect(() => {
        if(!uri || aspect_ratio_cache.has(uri)) return
        let is_active:boolean = true

        NativeImage.getSize(uri, (width:number, height:number) => {
            if(height <= 0) return
            const ratio:number = Math.min(MAX_MEDIA_RATIO, Math.max(MIN_MEDIA_RATIO, width / height))
            aspect_ratio_cache.set(uri, ratio)
            if(is_active) setMeasured({ uri, ratio })
        }, () => {})

        return () => { is_active = false }
    }, [uri])

    if(!uri) return fallback
    return aspect_ratio_cache.get(uri) ?? (measured?.uri === uri ? measured.ratio : fallback)
}
const DOUBLE_TAP_MS:number = 280

interface PostCardProps {
    post:Post,
    onPostChange:(post:Post) => void,
    onAuthorChange:(user_id:number, changes:Partial<PostAuthor>) => void, // Updates Every Post Of The Author (Follow State)
    onOpenComments:(post:Post) => void,
    onOpenMenu:(post:Post) => void,
    onShare:(post:Post) => void,
    onRequireLogin:() => void,
    is_detail?:boolean // On The Post Screen (Caption Fully Expanded)
}

function PostCard({ post, onPostChange, onAuthorChange, onOpenComments, onOpenMenu, onShare, onRequireLogin, is_detail = false }:PostCardProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user, setLoggedInUser } = useLoggedInUser() // Gets The Logged In User

    const [media_width, setMediaWidth] = useState<number>(0) // Stores The Width Of The Media Frame
    const [media_index, setMediaIndex] = useState<number>(0) // Stores The Visible Media
    const [is_follow_busy, setIsFollowBusy] = useState<boolean>(false)
    const last_tap = useRef<number>(0) // Detects Double Taps
    const heart_scale = useSharedValue<number>(0) // Big Heart On Double Tap
    const media_ratio:number = useMediaAspectRatio(post.media[0]) // Shape Of The Media Frame
    const media_height:number = media_width > 0 ? media_width / media_ratio : 0
    const [particles, setParticles] = useState<HeartParticle[]>([]) // Small Hearts Bursting From The Like Button

    const is_own:boolean = logged_in_user?.id === post.user.id // Stores The Information If The Post Belongs To The Logged In User
    const is_liked:boolean = logged_in_user ? post.likes_from_users.includes(logged_in_user.id) : false
    const is_saved:boolean = logged_in_user ? logged_in_user.saved_posts.includes(post.id) : false
    const follow_state = getFollowState(post.user) // Gets The Follow State

    // ---------- Actions ----------

    // Function For Like / Unlike (Optimistic, Rolled Back On Failure)
    const toggleLike = async (force_like:boolean = false):Promise<void> => {
        if(!logged_in_user) {
            onRequireLogin()
            return
        }

        if(force_like && is_liked) return

        const next_liked:boolean = !is_liked
        haptics.light()
        if(next_liked) setParticles(createHeartParticles()) // Bursts The Hearts (Only When Liking)

        const updated:Post = {
            ...post,
            likes: Math.max(0, post.likes + (next_liked ? 1 : -1)),
            likes_from_users: next_liked ? [...post.likes_from_users, logged_in_user.id] : post.likes_from_users.filter((id:number) => id !== logged_in_user.id),
        }

        onPostChange(updated)

        const response = await togglePostLike(post.id) // Sends The Request
        if(!response.ok) onPostChange(post)
    }

    // Function For Save / Unsave (Optimistic)
    const toggleSave = async ():Promise<void> => {
        if(!logged_in_user) {
            onRequireLogin()
            return
        }

        haptics.selection()
        const previous_saved = logged_in_user.saved_posts
        setLoggedInUser({ ...logged_in_user, saved_posts: is_saved ? previous_saved.filter((id) => id !== post.id) : [...previous_saved, post.id] })

        const response = await togglePostSave(post.id) // Sends The Request

        if(!response.ok) {
            setLoggedInUser({ ...logged_in_user, saved_posts: previous_saved })
            showAlert(t("Chyba"), response.error.message)
        }
    }

    // Function For Follow The Author
    const follow = async ():Promise<void> => {
        if(!logged_in_user) {
            onRequireLogin()
            return
        }

        setIsFollowBusy(true)
        const response = await toggleFollow(post.user.id) // Sends The Request
        setIsFollowBusy(false)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        onAuthorChange(post.user.id, getToggledFollowFlags(post.user))
    }

    // Function For Handle A Tap On Media (Double Tap Likes)
    const handleMediaPress = ():void => {
        const now:number = Date.now() // Gets The Time

        if(now - last_tap.current < DOUBLE_TAP_MS) {
            last_tap.current = 0
            heart_scale.set(withSequence(withSpring(1, { damping: 9 }), withTiming(1, { duration: 350 }), withTiming(0, { duration: 200 })))
            toggleLike(true)
            return
        }

        last_tap.current = now
    }

    // Function For Open The Location In Maps
    const openLocation = ():void => {
        if(!post.coordinates) return

        const { latitude, longitude } = post.coordinates
        const label:string = encodeURIComponent(post.location?.replace(/<span><\/span>/g, ",") ?? "")
        const url:string = Platform.OS === "ios" ? `maps:0,0?q=${label}@${latitude},${longitude}` : Platform.OS === "android" ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})` : `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`

        Linking.openURL(url).catch(() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`))
    }

    const heart_style = useAnimatedStyle(() => ({ opacity: heart_scale.get(), transform: [{ scale: 0.6 + heart_scale.get() * 0.6 }] }))

    // The Server Puts "<span></span>" Into Locations With Coordinates (Used As A Line Break On The Website)
    const location:string|null = post.location ? post.location.replace(/<span><\/span>/g, ", ").replace(/\s+,/g, ",") : null

    const show_likes:boolean = !post.hide_likes || is_own // Stores The Information If The Like Count Is Visible

    return (
        <View style={styles.card}>
            {/* ---------- Header ---------- */}
            <View style={styles.header}>
                <Pressable onPress={() => router.push({ pathname: "/profile/[username]", params: { username: post.user.username } })} accessibilityRole="button" accessibilityLabel={post.user.username} style={styles.author}>
                    <Avatar user={post.user} size={40} />

                    <View style={styles.flex}>
                        <View style={styles.name_row}>
                            <Text variant="body_strong" numberOfLines={1} style={styles.shrink}>{post.user.username}</Text>
                            {post.user.subscription?.is_active && <Icon name="crown" size={11} color="premium" />}
                        </View>

                        {location ? (
                            <Pressable onPress={openLocation} disabled={!post.coordinates} hitSlop={6} accessibilityRole={post.coordinates ? "link" : undefined}>
                                <Text variant="caption" color={post.coordinates ? "primary_text" : "text_secondary"} numberOfLines={1}>{location}</Text>
                            </Pressable>
                        ) : (
                            <Text variant="caption" color="text_muted">{getTimeAgo(post.created_at)}</Text>
                        )}
                    </View>
                </Pressable>

                {!is_own && follow_state !== "following" && (
                    <Button
                        label={follow_state === "requested" ? t("Požiadané") : t("Sledovať")}
                        size="sm"
                        variant={follow_state === "requested" ? "secondary" : "primary"}
                        onPress={follow}
                        is_loading={is_follow_busy}
                    />
                )}

                <IconButton icon="ellipsis" accessibility_label={t("Možnosti príspevku")} onPress={() => onOpenMenu(post)} size={36} icon_color="text_secondary" />
            </View>

            {/* ---------- Media ---------- */}
            {post.media.length > 0 && (
                <View style={[styles.media_frame, { aspectRatio: media_ratio }]} onLayout={(event:LayoutChangeEvent) => setMediaWidth(event.nativeEvent.layout.width)}>
                    {media_width > 0 && (
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            scrollEnabled={post.media.length > 1}
                            onMomentumScrollEnd={(event:NativeSyntheticEvent<NativeScrollEvent>) => setMediaIndex(Math.round(event.nativeEvent.contentOffset.x / media_width))}
                            onScroll={Platform.OS === "web" ? (event:NativeSyntheticEvent<NativeScrollEvent>) => setMediaIndex(Math.round(event.nativeEvent.contentOffset.x / media_width)) : undefined}
                            scrollEventThrottle={64}
                        >
                            {post.media.map((media:PostMedia, index:number) => (
                                <View key={media.id} style={[styles.media_page, { width: media_width, height: media_height }]}>
                                    {media.is_video ? (
                                        <PostVideo post={post} media={media} />
                                    ) : (
                                        <Pressable onPress={handleMediaPress} accessibilityLabel={t("Fotka {{position}} z {{count}}", { position: index + 1, count: post.media.length })} accessibilityHint={t("Dvojitým ťuknutím označíte páči sa mi to")}>
                                            <PostImage media={media} width={media_width} height={media_height} />
                                        </Pressable>
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <Animated.View pointerEvents="none" style={[styles.big_heart, heart_style]}>
                        <Icon name="heart" size={84} color="white" />
                    </Animated.View>

                    {post.media.length > 1 && (
                        <View style={styles.counter} pointerEvents="none">
                            <Text variant="caption" color="white" is_tabular>{media_index + 1}/{post.media.length}</Text>
                        </View>
                    )}
                </View>
            )}

            {post.media.length > 1 && (
                <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    {post.media.map((media:PostMedia, index:number) => (
                        <View key={media.id} style={[styles.dot, index === media_index ? styles.dot_active : null]} />
                    ))}
                </View>
            )}

            {/* ---------- Actions ---------- */}
            <View style={styles.actions}>
                <Pressable onPress={() => toggleLike()} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: is_liked }} accessibilityLabel={is_liked ? t("Zrušiť páči sa mi to") : t("Páči sa mi to")} style={styles.action}>
                    <View style={styles.heart}>
                        <Icon name="heart" size={21} color={is_liked ? "danger" : "text"} is_solid={is_liked} />
                        <HeartParticles particles={particles} onComplete={(id:number) => setParticles((previous:HeartParticle[]) => previous.filter((particle:HeartParticle) => particle.id !== id))} />
                    </View>
                    {show_likes && <Text variant="body_strong" is_tabular>{post.likes}</Text>}
                </Pressable>

                <Pressable
                    onPress={() => onOpenComments(post)}
                    disabled={!post.allow_comments}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={post.allow_comments ? `${t("Komentáre")}: ${post.comments_amount}` : t("Komentáre sú vypnuté")}
                    style={[styles.action, !post.allow_comments ? styles.disabled : null]}
                >
                    <Icon name={post.allow_comments ? "comment" : "comment-slash"} size={20} color="text" is_solid={false} />
                    {post.allow_comments && <Text variant="body_strong" is_tabular>{post.comments_amount}</Text>}
                </Pressable>

                <Pressable onPress={() => onShare(post)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("Zdieľať príspevok")} style={styles.action}>
                    <Icon name="paper-plane" size={19} color="text" is_solid={false} />
                </Pressable>

                <View style={styles.flex} />

                <View style={styles.action} accessible accessibilityLabel={`${t("Zobrazenia")}: ${post.views}`}>
                    <Icon name="eye" size={16} color="text_muted" is_solid={false} />
                    <Text variant="caption" color="text_muted" is_tabular>{post.views}</Text>
                </View>

                <Pressable onPress={toggleSave} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: is_saved }} accessibilityLabel={is_saved ? t("Odstrániť z uložených") : t("Uložiť príspevok")} style={styles.action}>
                    <Icon name="bookmark" size={19} color={is_saved ? "premium" : "text"} is_solid={is_saved} />
                </Pressable>
            </View>

            {/* ---------- Caption ---------- */}
            {(post.description || post.tagged_users.length > 0) && (
                <View style={styles.caption}>
                    {!!post.description && <Caption username={post.user.username} text={post.description} is_expanded_initially={is_detail} />}

                    {post.tagged_users.length > 0 && (
                        <Text variant="caption" color="text_secondary">
                            {t("S používateľmi")}{" "}
                            {post.tagged_users.map((user, index:number) => (
                                <Text key={user.id} variant="caption" color="primary_text" onPress={() => router.push({ pathname: "/profile/[username]", params: { username: user.username } })}>
                                    {formatUsername(user.username)}{index < post.tagged_users.length - 1 ? ", " : ""}
                                </Text>
                            ))}
                        </Text>
                    )}
                </View>
            )}

            {!!location && <Text variant="caption" color="text_muted" style={styles.time}>{getTimeAgo(post.created_at)}</Text>}
        </View>
    )
}

export default memo(PostCard)

// Function For Render One Photo (Shows A Placeholder Instead Of The Browser's Broken Image Icon When Loading Fails)
function PostImage({ media, width, height }:{ media:PostMedia, width:number, height:number }) {
    const [has_failed, setHasFailed] = useState<boolean>(false) // Stores The Information If The Image Failed To Load
    const uri:string|null = getMediaUrl(media.file) // Gets The URL

    if(has_failed || !uri) {
        return (
            <View style={[styles.image, styles.image_fallback, { width, height }]}>
                <Icon name="image" size={28} color="text_muted" />
            </View>
        )
    }

    return (
        <Image
            source={{ uri }}
            placeholder={media.thumbnail ? { uri: getMediaUrl(media.thumbnail) ?? undefined } : undefined}
            style={[styles.image, { width, height }]}
            contentFit="cover"
            transition={200}
            recyclingKey={String(media.id)}
            onError={() => setHasFailed(true)}
        />
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    shrink: {
        flexShrink: 1,
    },

    card: {
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderWidth: layout.hairline,
        borderColor: colors.border,
        borderRadius: radii.lg,
        overflow: "hidden",
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },

    author: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },

    name_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
    },

    media_frame: {
        width: "100%",
        backgroundColor: colors.background_deep,
        justifyContent: "center",
    },

    media_page: {
        justifyContent: "center", // Centers A Video Whose Shape Differs From The Frame
    },

    image: {
        backgroundColor: colors.surface_pressed,
    },

    image_fallback: {
        alignItems: "center",
        justifyContent: "center",
    },

    big_heart: {
        position: "absolute",
        alignSelf: "center",
        top: "40%",
    },

    counter: {
        position: "absolute",
        top: spacing.md,
        right: spacing.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        backgroundColor: colors.overlay,
        borderRadius: radii.pill,
    },

    dots: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 5,
        paddingTop: spacing.sm,
    },

    dot: {
        width: 6,
        height: 6,
        backgroundColor: colors.surface_strong,
        borderRadius: radii.pill,
    },

    dot_active: {
        backgroundColor: colors.primary,
    },

    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },

    heart: {
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
    },

    action: {
        minHeight: 32,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs + 2,
    },

    disabled: {
        opacity: 0.45,
    },

    caption: {
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },

    time: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xs,
    },
})
