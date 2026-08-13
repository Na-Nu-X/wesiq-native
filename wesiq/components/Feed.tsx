import React, { useState } from "react"
import { View, StyleSheet, TextInput, Text } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR } from "@/constants/colors"
import Icon from "@/components/Icon"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import ProfilePictureLink from "./ProfilePictureLink"

import type { LoggedInUser } from "@/app/(tabs)"

export interface Post {
    user:User,

    id:number,
    description:string|null,

    tagged_users:{
        id:number,
        first_name:string,
        last_name:string,
        username:string
    }[]|[],

    added_hashtags:string[]|[],
    location:string|null,

    coordinates:{
        latitude:string
        longitude:string
    }|null,

    public_visibility:boolean,
    allow_comments:boolean,
    hide_likes:boolean,
    likes:number,
    likes_from_users:number[],
    created_at:string,
    media:Media[],
    views:number,
    comments_amount:number,
}

interface User {
    id:number,
    first_name:string,
    last_name:string,
    username:string,
    profile_picture_name:string|null,
    following:number[],
    followers:number[],
    private_account:boolean,

    subscription?:{
        is_active:boolean
    }
}

interface Media {
    id:number,
    file:string,
    thumbnail:string,
    is_video:boolean,
    is_muted:boolean,
    average_watch_time:number|null,
    video_views:number|null,
    sprite_sheet:string|null,
    vtt_file:string|null,

    original_filename:string,
    original_size:string,

    post:{ 
        id:number 
    }
}

export default function Feed() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Information If The Upload Post Form Dialog Is Open
    const [processing_posts, setProcessingPosts] = useState<Post[]>([]) // Stores The Processing Posts
    const [processing_post_report, setProcessingPostReport] = useState<string>("Čakajte! Príspevok sa spracováva.") // Stores The Processing Post Report Message

    return (
        <View className="feed" style={styles.feed}>
            <View className="search_posts_container" style={styles.search_posts_container}>
                <View className="search_bar_container">
                    <Icon icon_name="magnifying-glass" style={styles.magnifying_glass_icon} />

                    <View className="delete_search_bar" style={styles.delete_search_bar}>
                        <Icon icon_name="xmark" />
                    </View>

                    <TextInput
                        className="search_bar"
                        textAlignVertical="top" 
                        placeholder="Nájsť príspevky" 
                        placeholderTextColor={LIGHT_BLUE_COLOR}
                        accessibilityLabel="Nájsť príspevky" 
                        // value={}
                        // onChangeText={}

                        style={[
                            styles.search_bar, 
                            { outlineStyle: "none" } as any
                        ]}
                    />
                </View>

                <View className="history_container" style={styles.history_container}></View>
            </View>

            {processing_posts.length > 0 && logged_in_user && (
                processing_posts.map(one_processing_post => (
                    <View className="processing_post_container">
                        <Text className="processing_post_report">{processing_post_report}</Text>

                        <View className="processing_media_info_container">
                            <Text className="processing_media_info">
                                Súbory:{" "}
                                
                                {one_processing_post.media.map((one_post_media, index) => {
                                    if(one_processing_post.id === one_post_media.post.id) {
                                        return (
                                            <Text key={index}>
                                                <Text className="original_filename">{one_post_media.original_filename}</Text>
                                                
                                                <Text className="original_size">
                                                    {" "}({one_post_media.original_size})
                                                    {index < one_processing_post.media.length - 1 && ", "}
                                                </Text>
                                            </Text>
                                        )
                                    }

                                    return null
                                })}
                            </Text>
                        </View>

                        <View className="header">
                            <View className="left">
                                <ProfilePictureLink logged_in_user={logged_in_user} label="Zobraziť užívateľa" />
                            </View>

                            <View className="right">
                                <View className="top">
                                    <Text className="username">{one_processing_post.user.username}</Text>

                                    <View className="followers_container">
                                        {/* <Text className="followers">{one_processing_post.user.accepted_followers.length}</Text> */}
                                        <Icon icon_name="user" />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    feed: {
        position: "relative",
        alignItems: "center",
        gap: 25,
        zIndex: 1,
    },

    search_posts_container: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        // backdrop-filter: blur(5px);
        zIndex: 200,
    },

    magnifying_glass_icon: {
        // @include icon;
        pointerEvents: "none",
        position: "absolute",
        top: "50%",
        left: 8.5,
        transform: [{ translateY: "-50%" }],
        color: BLUE_COLOR,
        fontSize: 20,
        // transition: color 0.3s ease
    },

    delete_search_bar: {
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        top: "50%",
        right: 0,
        transform: [{ translateY: "-50%" }],
        height: "100%",
        width: 40,
        zIndex: 300,

        // &:hover {
        //             .fa-xmark {
        //                 color: $dark-blue-color;
        //                 transition: color 0.2s ease;
        //             }
        //         }
    },

    search_bar: {
        position: "relative",
        width: "100%",
        height: 40,
        paddingHorizontal: 40,
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: DARK_BLUE_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
        textAlign: "center",
        zIndex: 200,
        // transition: border 0.2s ease, box-shadow 0.2s ease;

        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color !important;
        // }
    },

    history_container: {
        // @include scrollbar;
        position: "absolute",
        top: 0,
        width: "100%",
        maxHeight: 40 * 3,
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        opacity: 0,
        overflowY: "auto",
        // transition: top 0.3s ease, border 0.3s ease, width 0.3s ease, opacity 0.5s ease;
        zIndex: 50,

        // &.active {
        //     top: 40px;
        //     opacity: 1;

        //     .searched_post {
        //         p {
        //             pointer-events: all;
        //         }
        //     }
        // }
    },
})