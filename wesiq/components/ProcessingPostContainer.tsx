import { useState, useEffect } from "react"
import { View, StyleSheet, Text, Alert, Pressable, Linking, Platform } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import Icon from "@/components/Icon"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import ProfilePictureLink from "./ProfilePictureLink"
import { DOMAIN } from "@/constants/general"
import { getTimeAgo } from "@/utils/time"
import { DynamicImage } from "./DynamicImage"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { AnimatedProgressBar } from "./pages/community/AnimatedProgressBar"

import type { ProcessingPost, ProcessingMedia } from "./Feed"
import type { LoggedInUser } from "./LoginFormDialog"
import type { TrackedTask } from "@/app/(tabs)"

interface ProcessingPostContainerProps {
    processing_post:ProcessingPost,
    tracked_tasks:TrackedTask[]
    onShowProcessingPostProperties:(processing_post:ProcessingPost) => void,
    logged_in_user:LoggedInUser|null
}

export const ProcessingPostContainer = ({ processing_post, tracked_tasks, onShowProcessingPostProperties, logged_in_user }:ProcessingPostContainerProps) => {
    const [active_post_media, setActivePostMedia] = useState<Record<number, number>>({}) // Stores The Active Post Media
    const [processing_post_report, setProcessingPostReport] = useState<string>("Čakajte! Príspevok sa spracováva.") // Stores The Processing Post Report Message

    useEffect(() => {
        console.log(tracked_tasks) // Gets The Upload Progress For Each Post Media
    }, [tracked_tasks])

    // Function For Generate Styled Description
    const generateStyledDescription = (text:string, tagged_users:string|null, added_hashtags:string|null) => {
        if(tagged_users) {
            const tagged_users_array:string[] = JSON.parse(tagged_users) // Converts The Data To An Array Of The Tagged Users

            // Puts Every Tag To The Styled Span Element
            return tagged_users_array.map((one_tag:string, index:number) => (
                <Pressable 
                    key={index}
                    className="tag"
                    // onPress={handleGoToProfile}
                    style={styles.tag}
                >
                    <Text>{one_tag}</Text>
                </Pressable>
            ))
        }
    
        if(added_hashtags) {
            const added_hashtags_array:string[] = JSON.parse(added_hashtags.replace(/'/g, '"')) // Converts The Data To An Array Of The Added Hashtags

            // Puts Every Hashtag To The Styled Span Element
            return added_hashtags_array.map((one_hashtag:string, index:number) => (
                <Pressable 
                    key={index}
                    className="hashtag"
                    // onPress={handleGoToProfile}
                    style={styles.hashtag}
                >
                    {one_hashtag}
                </Pressable>
            ))
        }
    
        return text // Returns The Text
    }

    // Function For Change The Active Post Media
    const changePostMedia = (post_id:number, new_index:number, max_index:number):void => {
        if(new_index >= 0 && new_index <= max_index) {
            // Sets The Active Post Media
            setActivePostMedia(previous_active_post_media => ({
                ...previous_active_post_media,
                [post_id]: new_index // Sets The New Active Index For The Post
            }))
        }
    }

    const active_post_media_index:number = active_post_media[processing_post.id] || 0 // Sets The Active Post Media Index
    const max_active_post_media_index:number = processing_post.media.length - 1 // Sets The Maximum Active Post Media Index

    // Creates The Swipe Gesture
    const swipe_gesture = Gesture.Pan()
        .runOnJS(true)

        .onEnd((event) => {
            if(event.translationX < -50) changePostMedia(processing_post.id, active_post_media_index + 1, max_active_post_media_index) // Shows The Next Post Media
            else if (event.translationX > 50) changePostMedia(processing_post.id, active_post_media_index - 1, max_active_post_media_index) // Shows The Previous Post Media
        })

    // Function For Handle Open Maps
    const handleOpenMaps = async () => {
        if(!processing_post.coordinates?.latitude || !processing_post.coordinates?.longitude) {
            Alert.alert("Upozornenie", "Presné súradnice tohto miesta nie sú k dispozícii.");
            return
        }
    
        const { latitude, longitude } = processing_post.coordinates // Gets The Latitude And Longitude
        const query:string = `${latitude},${longitude}` // Sets The Query
        

        const url:string = Platform.select({
            ios: `maps:0,0?q=${query}`, // iOS
            android: `geo:0,0?q=${query}`, // Android
            default: `https://www.google.com/maps/search/?api=1&query=${query}` // Web
        })
    
        try {
            if(url) {
                const supported:boolean = await Linking.canOpenURL(url)
                
                if(supported) await Linking.openURL(url) // Opens The Maps
                else await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`) // Opens The Browser
            }
        } 
        
        catch {
            console.error("Nepodarilo sa otvoriť mapy.")
        }
    }
    
    return (
        <View className="processing_post_container" key={processing_post.id} style={styles.processing_post_container}>
            <Text className="processing_post_report" style={{ color: SECONDARY_COLOR }}>{processing_post_report}</Text>

            <View className="processing_media_info_container">
                <Text className="processing_media_info" style={{ color: SECONDARY_COLOR }}>
                    Súbory:{" "}
                    
                    {processing_post.media.map((one_post_media:ProcessingMedia, index) => (
                        <Text key={index}>
                            <Text className="original_filename">{one_post_media.original_filename}</Text>
                            
                            <Text className="original_size">
                                {" "}({(one_post_media.original_size / 1000 / 1000).toFixed(2)} MB)
                                {index < processing_post.media.length - 1 && ", "}
                            </Text>
                        </Text>
                    ))}
                </Text>
            </View>

            <View className="header" style={styles.header}>
                <View className="left">
                    <ProfilePictureLink 
                        user_id={processing_post.user.id} 
                        user_profile_picture_name={processing_post.user.profile_picture_name || null} 
                        user_subscription={processing_post.user.subscription?.is_active || false} 
                        label="Zobraziť užívateľa" 
                        width={45} 
                        height={45} 
                    />
                </View>

                <View className="right" style={styles.right}>
                    <View className="top" style={styles.top}>
                        <Text className="username" style={styles.username}>{processing_post.user.username}</Text>

                        <View className="followers_container" style={styles.followers_container}>
                            <Text className="followers" style={styles.followers}>{processing_post.user.followers.length}</Text>
                            <Icon icon_name="user" />
                        </View>

                        <View className="show_post_properties_button" accessibilityLabel="Viac...">
                            <Icon
                                icon_name="ellipsis-vertical"
                                onPress={() => onShowProcessingPostProperties(processing_post)}
                            />
                        </View>
                    </View>

                    <View className="bottom" style={styles.bottom}>
                        {processing_post.location && (
                            processing_post.coordinates ? (
                                <Pressable
                                    className="location"
                                    onPress={handleOpenMaps}
                                    accessibilityRole="button"
                                    accessibilityLabel="Otvoriť mapy" 
                                    style={styles.location}
                                >
                                    <Text numberOfLines={1} ellipsizeMode="tail">
                                        {processing_post.location.split("<span></span>").filter(Boolean).map((one_part:string, index:number) => (
                                            <Text key={index}>
                                                <Text style={{ color: LIGHT_BLUE_COLOR }}>{one_part.trim()}</Text>

                                                {processing_post.location && index < processing_post.location.split("<span></span>").filter(Boolean).length - 1 && (
                                                    <Text style={{ color: LIGHT_BLUE_COLOR }}> • </Text>
                                                )}
                                            </Text>
                                        ))}
                                    </Text>
                                </Pressable>
                            ) : (
                                <Text className="location" numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1, color: LIGHT_BLUE_COLOR }}>{processing_post.location}</Text>
                            )
                        )}

                        <Text className="created_at" style={styles.created_at}>{getTimeAgo(processing_post.created_at)}</Text>
                    </View>
                </View>
            </View>

            <GestureDetector gesture={swipe_gesture}>
                <View className="media" style={styles.media}>
                    {processing_post.media.map((one_post_media: ProcessingMedia, index: number) => {
                        const current_progress = tracked_tasks.find(
                            (one_task: TrackedTask) => 
                                one_task.post_id === processing_post.id && 
                                one_task.post_media_id === one_post_media.id
                        )?.progress ?? 0;

                        return (
                            <View 
                                className="one_post" 
                                key={one_post_media.id || index} 
    
                                style={[
                                    styles.one_processing_post, 
                                    { display: index === active_post_media_index ? "flex" : "none" }
                                ]}
                            >
                                <AnimatedProgressBar progress={current_progress} />

                                {!one_post_media.is_video && (
                                    <View className="image">
                                        <DynamicImage 
                                            key={one_post_media.id || index}
                                            uri={`${DOMAIN}/media/${one_post_media.file}`} 
                                        />
                                    </View>
                                )}

                                {one_post_media.is_video && (
                                    <View className="thumbnail">
                                        <DynamicImage 
                                            key={one_post_media.id || index}
                                            uri={`${DOMAIN}/media/${one_post_media.thumbnail}`} 
                                        />
                                    </View>
                                )}
                            </View>
                        )
                    })}

                    <View 
                        className="post_bars"

                        style={[
                            styles.post_bars,
                            processing_post.media.length === 0 && { display: "none" }
                        ]}
                    >
                        {processing_post.media.length > 1 && (
                            processing_post.media.map((one_post_media:ProcessingMedia, index:number) => (
                                <Pressable 
                                    key={index} 
                                    className="bar" 
                                    onPress={() => changePostMedia(processing_post.id, index, max_active_post_media_index)}

                                    style={[
                                        styles.bar, 
                                        { backgroundColor: index === active_post_media_index ? DARK_BLUE_COLOR : BLUE_COLOR }
                                    ]}
                                />
                            ))
                        )}
                    </View>
                </View>
            </GestureDetector>

            <View className="society" style={styles.society}>
                <View className="likes" accessibilityLabel="Páči sa mi..." style={styles.society_likes}>
                    <View 
                        style={{ 
                            position: "relative", 
                            alignItems: "center", 
                            justifyContent: "center", 
                        }}
                    >
                        <Icon
                            icon_name="heart"
                            size={25}
                            is_regular={true}
                            color={BLUE_COLOR}
                            pressed_color={RED_COLOR}
                        />
                    </View>

                    <Text className="likes_counter" style={styles.society_likes_counter}>0</Text>
                </View>

                <View 
                    className="comments" 
                    accessibilityLabel="Komentáre..."
                    style={styles.comments}
                >
                    <Icon
                        icon_name="comment"
                        size={25}
                        is_regular={true}
                    />

                    {processing_post.allow_comments 
                    ? (<Text className="comments_counter" style={styles.comments_counter}>0</Text>)
                    : (<Text className="hidden_comments_counter" style={styles.hidden_comments_counter}>Vypnuté</Text>)}
                </View>

                <View className="share" accessibilityLabel="Zdielať...">
                    <Icon
                        icon_name="share-nodes"
                        size={25}
                    />
                </View>

                <View 
                    className="views" 
                    accessibilityLabel="Počet videní..."
                    style={styles.views}
                >
                    <Icon
                        icon_name="eye"
                        size={25}
                        is_regular={true}
                    />

                    <Text className="views_counter" style={styles.views_counter}>0</Text>
                </View>

                <View className={"save"} accessibilityLabel="Uložiť...">
                    <View className="save" accessibilityLabel="Uložiť...">
                        <Icon
                            icon_name="bookmark"
                            size={25}
                            is_regular={true}
                        />
                    </View>
                </View>
            </View>

            {processing_post.description && (
                <Text className="description" style={styles.description}>
                {processing_post.tagged_users.map(one_tagged_user => one_tagged_user.username).length > 0 || processing_post.added_hashtags.length > 0 
                ? (generateStyledDescription(processing_post.description, JSON.stringify(processing_post.tagged_users.map(one_tagged_user => one_tagged_user.username)), JSON.stringify(processing_post.added_hashtags))) // Generates The Styled Description
                : (processing_post.description)}
                </Text>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    processing_post_container: {
        position: "relative",
        justifyContent: "space-between",
        gap: 10,
        maxWidth: MAIN_WIDTH,
        width: "100%",
        padding: 20,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover,
        // &:focus-visible {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        // }
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        width: "100%",
    },

    right: {
        flex: 1,
        minWidth: 0,
    },

    top: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    username: {
        flex: 1,
        fontWeight: "bold",
        color: SECONDARY_COLOR,
    },

    followers_container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,

        // &:has(.followers:hover),
        // &:has(.fa-user:hover) {
        //     .followers,
        //     .fa-user {
        //         color: $dark-blue-color;
        //     }
        // }
    },

    followers: {
        color: BLUE_COLOR,
    },

    bottom: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        overflow: "hidden",
    },
    
    location: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        flex: 1,
        color: LIGHT_BLUE_COLOR,
        fontSize: 15,

        // span {
        //     display: inline-block;
        //     width: 4px;
        //     height: 4px;
        //     border-radius: 50%;
        //     background-color: $light-blue-color;
        // }
    },

    created_at: {
        color: LIGHT_BLUE_COLOR,
        fontSize: 15,
    },

    media: {
        position: "relative",
        flexDirection: "row",
        justifyContent: "center",
        width: "100%",
        borderRadius: BIG_BORDER_RADIUS,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,

        // &:has(.one_post .video_container:hover) .post_bars {
        //     visibility: hidden;
        //     opacity: 0;
        //     transition: visibility 0s, opacity 0s;
        // }

        // &:has(.one_post .loading:hover) .post_bars {
        //     visibility: hidden;
        //     opacity: 0;
        //     transition: visibility 0s, opacity 0s;
        // }
    },

    one_processing_post: {
        display: "none",
        position: "relative",
        width: "100%",
        height: "100%",

        // &.active {
        //     display: block;
        // }

        // &:has(.loading:hover) .video_container .controls {
        //     display: flex;
        //     opacity: 1;
        // }
    },

    post_bars: {
        visibility: "visible",
        opacity: 1,
        position: "absolute",
        bottom: 0,
        flexDirection: "row",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: transparentize(BLUE_COLOR, 0.9),
        // transition: visibility 1s ease 1s, opacity 1s ease 1s;
        zIndex: 100,
    },

    bar: {
        position: "relative",
        width: 12,
        height: 12,
        backgroundColor: BLUE_COLOR,
        borderRadius: "50%",
        // transition: background-color 0.3s ease;

        // &.active,
        // &:hover {
        //     cursor: pointer;
        //     background-color: $dark-blue-color;
        // }
    },

    society: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#cccccc",
    },

    society_likes: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 20,
    },

    society_likes_counter: {
        color: BLUE_COLOR,
        fontSize: 22,
    },

    comments: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    comments_counter: {
        color: BLUE_COLOR,
        fontSize: 22,
    },

    hidden_comments_counter: {
        color: BLUE_COLOR,
        fontSize: 15,
    },

    views: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 20,
        marginLeft: "auto",
    },

    views_counter: {
        color: BLUE_COLOR,
        fontSize: 22,
    },

    description: {
        marginTop: 5,
        lineHeight: 1.5,
        color: transparentize(SECONDARY_COLOR, 0.08),
    },

    tag: {
        height: 25,
        lineHeight: 25,
        paddingHorizontal: 5,
        color: BLUE_COLOR,
        backgroundColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: SMALL_BORDER_RADIUS,
        fontSize: 15,
    },

    hashtag: {
        height: 25,
        lineHeight: 25,
        paddingHorizontal: 5,
        color: GREEN_COLOR,
        backgroundColor: transparentize(GREEN_COLOR, 0.9),
        borderRadius: SMALL_BORDER_RADIUS,
        fontSize: 15,
    },
})