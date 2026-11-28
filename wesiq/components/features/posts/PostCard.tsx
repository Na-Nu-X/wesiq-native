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
import PostVideo, { usePlayingVideo } from "./PostVideo"
import Caption from "./Caption"
import HeartParticles, { createHeartParticles, HeartParticle } from "./HeartParticles"

import type { Post, PostAuthor, PostMedia } from "@/types/models"

const DEFAULT_IMAGE_RATIO:number = 4 / 5 // Until The Photo Size Is Known
const DEFAULT_VIDEO_RATIO:number = 16 / 9 // Videos Without A Thumbnail
const MIN_MEDIA_RATIO:number = 9 / 16 // Tallest Frame (Vertical Phone Photo / Video)
const MAX_MEDIA_RATIO:number = 1.91 // Widest Frame (Landscape)

const aspect_ratio_cache:Map<string, number> = new Map() // Keeps Measured Sizes While Scrolling The Feed

// Function For Get The URL Whose Size Gives The Shape Of One Media (The Thumbnail For Videos)
const getRatioUri = (media:PostMedia):string|null => getMediaUrl(media.is_video ? media.thumbnail : media.file)

// Function For Get The Ratio Used Before The Size Of One Media Is Known
const getFallbackRatio = (media:PostMedia):number => media.is_video ? DEFAULT_VIDEO_RATIO : DEFAULT_IMAGE_RATIO

// Function For Measure The Shape Of Every Photo / Video Thumbnail (Each Slide Gets Its Own Frame Shape)
function useMediaAspectRatios(media:PostMedia[]):number[] {
    const [measured, setMeasured] = useState<Record<string, number>>({}) // Stores The Measured
    const uris_key:string = media.map((item:PostMedia) => getRatioUri(item) ?? "").join("|") // Gets The Uris Key

    // Initializes The Measurement Of Every Media
    useEffect(() => {
        let is_active:boolean = true // Checks If It Is Active

        for(const uri of uris_key.split("|")) {
            if(!uri || aspect_ratio_cache.has(uri)) continue

            NativeImage.getSize(uri, (width:number, height:number) => {
                if(height <= 0) return
                const ratio:number = Math.min(MAX_MEDIA_RATIO, Math.max(MIN_MEDIA_RATIO, width / height)) // Gets The Ratio
                aspect_ratio_cache.set(uri, ratio)
                if(is_active) setMeasured((previous:Record<string, number>) => ({ ...previous, [uri]: ratio }))
            }, () => {})
        }

        return () => { is_active = false }
    }, [uris_key])

    return media.map((item:PostMedia) => {
        const uri:string|null = getRatioUri(item) // Gets The URI
        if(!uri) return getFallbackRatio(item)
        return aspect_ratio_cache.get(uri) ?? measured[uri] ?? getFallbackRatio(item)
    })
}
const DOUBLE_TAP_MS:number = 280 // Defines The Double Tap MS

interface PostCardProps {
    post:Post,
    onPostChange:(post:Post) => void,
    onAuthorChange:(user_id:number, changes:Partial<PostAuthor>) => void, // Updates Every Post Of The Author (Follow State)
    onOpenComments:(post:Post) => void,
    onOpenMenu:(post:Post) => void,
    onShare:(post:Post) => void,
    onShowLikes:(post:Post) => void, // Long Press On The Like Button
    onRequireLogin:() => void,
    is_detail?:boolean // On The Post Screen (Caption Fully Expanded)
}

function PostCard({ 
    post, 
    onPostChange, 
    onAuthorChange, 
    onOpenComments, 
    onOpenMenu, 
    onShare, 
    onShowLikes,
    onRequireLogin, 
    is_detail = false 
}:PostCardProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user, setLoggedInUser } = useLoggedInUser() // Gets The Logged In User

    const [media_width, setMediaWidth] = useState<number>(0) // Stores The Width Of The Media Frame
    const [media_index, setMediaIndex] = useState<number>(0) // Stores The Visible Media
    const [is_follow_busy, setIsFollowBusy] = useState<boolean>(false) // Stores If It Is Follow Busy
    const last_tap = useRef<number>(0) // Detects Double Taps
    const heart_scale = useSharedValue<number>(0) // Big Heart On Double Tap
    const media_ratios:number[] = useMediaAspectRatios(post.media) // Shape Of Every Slide
    const active_media_index:number = Math.min(media_index, Math.max(0, post.media.length - 1)) // Guards Against A Shorter Media List After An Edit
    const media_ratio:number = media_ratios[active_media_index] ?? DEFAULT_IMAGE_RATIO // The Frame Follows The Visible Slide
    const media_height:number = media_width > 0 ? media_width / media_ratio : 0 // Gets The Media Height
    const { playing_media_id, setPlayingMediaId } = usePlayingVideo() // Pauses A Video That Was Swiped Away
    const [particles, setParticles] = useState<HeartParticle[]>([]) // Stores The Particles (Small Hearts Bursting From The Like Button)

    const is_own:boolean = logged_in_user?.id === post.user.id // Stores The Information If The Post Belongs To The Logged In User
    const is_liked:boolean = logged_in_user ? post.likes_from_users.includes(logged_in_user.id) : false // Checks If It Is Liked
    const is_saved:boolean = logged_in_user ? logged_in_user.saved_posts.includes(post.id) : false // Checks If It Is Saved
    const follow_state = getFollowState(post.user) // Gets The Follow State

    // ---------- Actions ----------

    // Function For Like / Unlike (Optimistic, Rolled Back On Failure)
    const toggleLike = async (force_like:boolean = false):Promise<void> => {
        if(!logged_in_user) {
            onRequireLogin()
            return
        }

        if(force_like && is_liked) return

        const next_liked:boolean = !is_liked // Gets The Next Liked
        haptics.light()
        if(next_liked) setParticles(createHeartParticles()) // Bursts The Hearts (Only When Liking)

        // Gets The Updated
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
        const previous_saved = logged_in_user.saved_posts // Gets The Previous Saved
        setLoggedInUser({ ...logged_in_user, saved_posts: is_saved ? previous_saved.filter((id) => id !== post.id) : [...previous_saved, post.id] }) // Sets The Logged In User

        const response = await togglePostSave(post.id) // Sends The Request

        if(!response.ok) {
            setLoggedInUser({ ...logged_in_user, saved_posts: previous_saved }) // Sets The Logged In User
            showAlert(t("Chyba"), response.error.message)
        }
    }

    // Function For Follow The Author
    const follow = async ():Promise<void> => {
        if(!logged_in_user) {
            onRequireLogin()
            return
        }

        setIsFollowBusy(true) // Sets The Follow Busy State
        const response = await toggleFollow(post.user.id) // Sends The Request
        setIsFollowBusy(false) // Sets The Follow Busy State

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

        const { latitude, longitude } = post.coordinates // Gets The Latitude And Longitude
        const label:string = encodeURIComponent(post.location?.replace(/<span><\/span>/g, ",") ?? "") // Gets The Label
        const url:string = Platform.OS === "ios" ? `maps:0,0?q=${label}@${latitude},${longitude}` : Platform.OS === "android" ? `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})` : `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}` // Gets The URL

        Linking.openURL(url).catch(() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`))
    }

    // Function For Switch The Visible Slide (Pauses The Video Of The Previous Slide)
    const changeMediaIndex = (event:NativeSyntheticEvent<NativeScrollEvent>):void => {
        const next_index:number = Math.max(0, Math.min(post.media.length - 1, Math.round(event.nativeEvent.contentOffset.x / media_width))) // Gets The Next Index
        if(next_index === media_index) return

        const previous_media:PostMedia|undefined = post.media[media_index] // Gets The Previous Media
        if(previous_media?.is_video && playing_media_id === previous_media.id) setPlayingMediaId(null)
        setMediaIndex(next_index) // Sets The Media Index
    }

    const heart_style = useAnimatedStyle(() => ({ opacity: heart_scale.get(), transform: [{ scale: 0.6 + heart_scale.get() * 0.6 }] })) // Gets The Heart Style

    // The Server Puts "<span></span>" Into Locations With Coordinates (Used As A Line Break On The Website)
    const location:string|null = post.location ? post.location.replace(/<span><\/span>/g, ", ").replace(/\s+,/g, ",") : null // Gets The Location

    const show_likes:boolean = !post.hide_likes || is_own // Stores The Information If The Like Count Is Visible
    const can_show_likers:boolean = show_likes && post.likes > 0 // Stores The Information If The Long Press Opens The Likes Sheet

    return (
        <View style = {styles.card}>
            {/* ---------- Header ---------- */}
            <View style = {styles.header}>
                <Pressable
                    onPress = {() => router.push({ pathname: "/profile/[username]", params: { username: post.user.username } })}
                    accessibilityRole = "button"
                    accessibilityLabel = {post.user.username}
                    style = {styles.author}
                >
                    <Avatar user = {post.user} size = {40} />

                    <View style = {styles.flex}>
                        <View style = {styles.name_row}>
                            <Text
                                variant = "body_strong"
                                numberOfLines = {1}
                                style = {styles.shrink}
                            >
                                {post.user.username}
                            </Text>
                            {post.user.subscription?.is_active &&
                                <Icon
                                    name = "crown"
                                    size = {11}
                                    color = "premium"
                                />
                            }
                        </View>

                        {location ? (
                            <Pressable
                                onPress = {openLocation}
                                disabled = {!post.coordinates}
                                hitSlop = {6}
                                accessibilityRole = {post.coordinates ? "link" : undefined}
                            >
                                <Text
                                    variant = "caption"
                                    color = {post.coordinates ? "primary_text" : "text_secondary"}
                                    numberOfLines = {1}
                                >
                                    {location}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text variant = "caption" color = "text_muted">{getTimeAgo(post.created_at)}</Text>
                        )}
                    </View>
                </Pressable>

                {!is_own && follow_state !== "following" && (
                    <Button
                        label = {follow_state === "requested" ? t("Požiadané") : t("Sledovať")}
                        size = "sm"
                        variant = {follow_state === "requested" ? "secondary" : "primary"}
                        onPress = {follow}
                        is_loading = {is_follow_busy}
                    />
                )}

                <IconButton
                    icon = "ellipsis"
                    accessibility_label = {t("Možnosti príspevku")}
                    onPress = {() => onOpenMenu(post)}
                    size = {36}
                    icon_color = "text_secondary"
                />
            </View>

            {/* ---------- Media ---------- */}
            {post.media.length > 0 && (
                <View style = {[styles.media_frame, { aspectRatio: media_ratio }]} onLayout = {(event:LayoutChangeEvent) => setMediaWidth(event.nativeEvent.layout.width)}>
                    {media_width > 0 && (
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator = {false}
                            scrollEnabled = {post.media.length > 1}
                            onMomentumScrollEnd = {changeMediaIndex}
                            onScroll = {Platform.OS === "web" ? changeMediaIndex : undefined}
                            scrollEventThrottle = {64}
                        >
                            {post.media.map((media:PostMedia, index:number) => {
                                const item_height:number = media_width / (media_ratios[index] ?? media_ratio) // Each Slide Keeps Its Own Shape (No Cropping)

                                return (
                                    <View key = {media.id} style = {[styles.media_page, { width: media_width, height: media_height }]}>
                                        {media.is_video ? (
                                            <PostVideo
                                                post = {post}
                                                media = {media}
                                                is_active = {index === active_media_index}
                                            />
                                        ) : (
                                            <Pressable
                                                onPress = {handleMediaPress}
                                                accessibilityLabel = {t("Fotka {{position}} z {{count}}", { position: index + 1, count: post.media.length })}
                                                accessibilityHint = {t("Dvojitým ťuknutím označíte páči sa mi to")}
                                            >
                                                <PostImage
                                                    media = {media}
                                                    width = {media_width}
                                                    height = {item_height}
                                                />
                                            </Pressable>
                                        )}
                                    </View>
                                )
                            })}
                        </ScrollView>
                    )}

                    <Animated.View pointerEvents = "none" style = {[styles.big_heart, heart_style]}>
                        <Icon
                            name = "heart"
                            size = {84}
                            color = "white"
                        />
                    </Animated.View>

                    {post.media.length > 1 && (
                        <View style = {styles.counter} pointerEvents = "none">
                            <Text
                                variant = "caption"
                                color = "white"
                                is_tabular
                            >
                                {active_media_index + 1}/{post.media.length}
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {post.media.length > 1 && (
                <View
                    style = {styles.dots}
                    accessibilityElementsHidden
                    importantForAccessibility = "no-hide-descendants"
                >
                    {post.media.map((media:PostMedia, index:number) => (
                        <View key = {media.id} style = {[styles.dot, index === active_media_index ? styles.dot_active : null]} />
                    ))}
                </View>
            )}

            {/* ---------- Actions ---------- */}
            <View style = {styles.actions}>
                <Pressable 
                    onPress = {() => toggleLike()} 
                    onLongPress = {can_show_likers ? () => onShowLikes(post) : undefined}
                    hitSlop = {8} 
                    accessibilityActions = {can_show_likers ? [{ name: "longpress", label: t("Zobraziť označenia páči sa mi to") }] : undefined}
                    onAccessibilityAction = {() => onShowLikes(post)}
                    accessibilityRole = "button" 
                    accessibilityState = {{ selected: is_liked }} 
                    accessibilityLabel = {is_liked ? t("Zrušiť páči sa mi to") : t("Páči sa mi to")} 
                    style = {styles.action}
                >
                    <View style = {styles.heart}>
                        <Icon
                            name = "heart"
                            size = {21}
                            color = {is_liked ? "danger" : "text"}
                            is_solid = {is_liked}
                        />
                        <HeartParticles particles = {particles} onComplete = {(id:number) => setParticles((previous:HeartParticle[]) => previous.filter((particle:HeartParticle) => particle.id !== id))} />
                    </View>
                    
                    {show_likes &&
                        <Text variant = "body_strong" is_tabular>{post.likes}</Text>
                    }
                </Pressable>

                <Pressable
                    onPress = {() => onOpenComments(post)}
                    disabled = {!post.allow_comments}
                    hitSlop = {8}
                    accessibilityRole = "button"
                    accessibilityLabel = {post.allow_comments ? `${t("Komentáre")}: ${post.comments_amount}` : t("Komentáre sú vypnuté")}
                    style = {[styles.action, !post.allow_comments ? styles.disabled : null]}
                >
                    <Icon
                        name = {post.allow_comments ? "comment" : "comment-slash"}
                        size = {20}
                        color = "text"
                        is_solid = {false}
                    />
                    {post.allow_comments &&
                        <Text variant = "body_strong" is_tabular>{post.comments_amount}</Text>
                    }
                </Pressable>

                <Pressable
                    onPress = {() => onShare(post)}
                    hitSlop = {8}
                    accessibilityRole = "button"
                    accessibilityLabel = {t("Zdieľať príspevok")}
                    style = {styles.action}
                >
                    <Icon
                        name = "paper-plane"
                        size = {19}
                        color = "text"
                        is_solid = {false}
                    />
                </Pressable>

                <View style = {styles.flex} />

                <View
                    style = {styles.action}
                    accessible
                    accessibilityLabel = {`${t("Zobrazenia")}: ${post.views}`}
                >
                    <Icon
                        name = "eye"
                        size = {16}
                        color = "text_muted"
                        is_solid = {false}
                    />
                    <Text
                        variant = "caption"
                        color = "text_muted"
                        is_tabular
                    >
                        {post.views}
                    </Text>
                </View>

                <Pressable
                    onPress = {toggleSave}
                    hitSlop = {8}
                    accessibilityRole = "button"
                    accessibilityState = {{ selected: is_saved }}
                    accessibilityLabel = {is_saved ? t("Odstrániť z uložených") : t("Uložiť príspevok")}
                    style = {styles.action}
                >
                    <Icon
                        name = "bookmark"
                        size = {19}
                        color = {is_saved ? "premium" : "text"}
                        is_solid = {is_saved}
                    />
                </Pressable>
            </View>

            {/* ---------- Caption ---------- */}
            {(post.description || post.tagged_users.length > 0) && (
                <View style = {styles.caption}>
                    {!!post.description &&
                        <Caption
                            username = {post.user.username}
                            text = {post.description}
                            is_expanded_initially = {is_detail}
                        />
                    }

                    {post.tagged_users.length > 0 && (
                        <Text variant = "caption" color = "text_secondary">
                            {t("S používateľmi")}{" "}
                            {post.tagged_users.map((user, index:number) => (
                                <Text
                                    key = {user.id}
                                    variant = "caption"
                                    color = "primary_text"
                                    onPress = {() => router.push({ pathname: "/profile/[username]", params: { username: user.username } })}
                                >
                                    {formatUsername(user.username)}{index < post.tagged_users.length - 1 ? ", " : ""}
                                </Text>
                            ))}
                        </Text>
                    )}
                </View>
            )}

            {!!location &&
                <Text
                    variant = "caption"
                    color = "text_muted"
                    style = {styles.time}
                >
                    {getTimeAgo(post.created_at)}
                </Text>
            }
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
            <View style = {[styles.image, styles.image_fallback, { width, height }]}>
                <Icon
                    name = "image"
                    size = {28}
                    color = "text_muted"
                />
            </View>
        )
    }

    return (
        <Image
            source = {{ uri }}
            placeholder = {media.thumbnail ? { uri: getMediaUrl(media.thumbnail) ?? undefined } : undefined}
            style = {[styles.image, { width, height }]}
            contentFit = "cover"
            transition = {200}
            recyclingKey = {String(media.id)}
            onError = {() => setHasFailed(true)}
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
        justifyContent: "center", // Centers A Slide Whose Shape Differs From The Frame While Swiping
        overflow: "hidden", // Keeps Video Controls And Taller Slides Inside Their Own Page
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
