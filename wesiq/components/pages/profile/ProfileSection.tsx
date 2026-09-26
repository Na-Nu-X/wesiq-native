import { useState } from "react"
import { Pressable, Alert, StyleSheet, Image, View, Text } from "react-native"
import * as ImagePicker from "expo-image-picker"
import {BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import { API_URL, DOMAIN } from "@/constants/general"
import { useTranslation } from "react-i18next"
import Icon from "@/components/Icon"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Animated, { SlideInRight, SlideOutLeft, SlideInLeft, SlideOutRight, useAnimatedStyle, Easing, withTiming } from "react-native-reanimated"
import { FontAwesome6 } from "@expo/vector-icons"
import BadgesContainer from "./BadgesContainer"
import { getFollowButtonProperties } from "../community/SearchUsers"
import { FollowersDialog } from "./FollowersDialog"
import { FollowingDialog } from "./FollowingDialog"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { Profile } from "@/app/(tabs)/profile/[username]"
import type { BasicResponse } from "@/components/Feed"
import type { BioLink } from "@/app/(tabs)/profile/[username]"

type ProfileSectionProps = {
    logged_in_user:LoggedInUser|null,
    is_found:boolean,
    onProfileUpdate:(profile:Profile|null) => void,
    profile:Profile|null,
    active_section_direction:"forward"|"back"
}

export default function ProfileSection({ 
    logged_in_user, 
    is_found,
    onProfileUpdate,
    profile,
    active_section_direction
}:ProfileSectionProps) {
    const { t } = useTranslation() // Initializes The Translations

    const [is_followers_dialog_open, setIsFollowersDialogOpen] = useState<boolean>(false) // Stores The Information If The Followers Dialog Is Open
    const [is_following_dialog_open, setIsFollowingDialogOpen] = useState<boolean>(false) // Stores The Information If The Following Dialog Is Open

    const [grid_select_active_menu, setGridSelectActiveMenu] = useState<"posts"|"saved_posts">("posts") // Stores The Information If The Loading Is Active
    const [grid_select_direction, setGridSelectDirection] = useState<"forward"|"back">("forward") // Stores The Grid Select Direction

    // Function For Toggle Follow
    const toggleFollow = async (user_to_follow_id:number|null, action:string):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Sledovanie nie je možné zmeniť bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const toggle_follow_response:Response = await fetch(`${API_URL}/toggle-follow/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    user_to_follow_id: user_to_follow_id,
                })
            })

            // If The Response Isn't Success
            if(!toggle_follow_response.ok) {
                Alert.alert(t("Chyba"), t("Pri zmene sledovania došlo k chybe.")) // Shows The Alert
                return
            }

            const toggle_follow_data:BasicResponse = await toggle_follow_response.json() // Gets The Toggle Follow Data

            // If The Response Isn't Success
            if(!toggle_follow_data.success || !profile) {
                Alert.alert(t("Chyba"), toggle_follow_data.message) // Shows The Alert
                return
            }

            else {
                if(profile.id === user_to_follow_id) {
                    // Updates The Has Follow And Has Pending Follow Request
                    onProfileUpdate({
                        ...profile,
                        has_follow: action === "follow", 
                        has_pending_follow_request: action === "send_follow_request"
                    })
                }

                Alert.alert(t("Úspech"), toggle_follow_data.message) // Shows The Alert
            }
        }

        catch {
            Alert.alert(t("Chyba"), t("Pri zmene sledovania došlo k chybe.")) // Shows The Alert
        }
    }

    const grid_select_indicator_style = useAnimatedStyle(() => {
        return {
            left: withTiming(grid_select_active_menu === "posts" ? '0%' : '68.5%', {
                duration: 250, // Trvanie animácie v milisekundách
                easing: Easing.out(Easing.quad), // Plynulý dojazd bez pruženia
            }),
        };
    });

    // Function For Change The Active Section
    const changeGridSelectActiveMenu = ():void => {
        if(grid_select_active_menu === "posts") {
            setGridSelectDirection("forward") // Sets The Direction
            setGridSelectActiveMenu("saved_posts") // Sets The Active Section
        }
        
        else {
            setGridSelectDirection("back") // Sets The Direction
            setGridSelectActiveMenu("posts") // Sets The Active Section
        }
    }

    return (
        is_found && profile ? (
            <Animated.View 
                className="profile" 
                entering={active_section_direction === "back" ? SlideInLeft.duration(300) : SlideInRight.duration(300)} 
                exiting={active_section_direction === "back" ? SlideOutRight.duration(300) : SlideOutLeft.duration(300)}
                style={styles.profile}
            >
                <View className="header" style={styles.profile_header}>
                    <View className="top" style={styles.top}>
                        <View className="info" style={styles.profile_info}>
                            <View 
                                className="profile_picture_container"
                                style={styles.profile_picture_container}
                            >
                                <Image 
                                    className={`profile_picture ${
                                        profile.subscription && profile.subscription.is_active ? "subscriber" : "" // Adds The Subscriber Class
                                    }`}

                                    source={
                                        profile.profile_picture_name ? { uri: `${DOMAIN}/media/images/${profile.id}/${profile.profile_picture_name}` } : { uri: `${DOMAIN}/static/images/profile_picture.png`} // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                                    }

                                    style={[
                                        styles.profile_picture,
                                        profile.subscription && profile.subscription.is_active && styles.subscriber_profile_picture,
                                        // { transform: [{ scale: animated_scale }] }
                                    ]}
                                />
                            </View>

                            <View className="name" style={styles.name}>
                                <Text className="username" style={styles.profile_username}>{profile.username}</Text>

                                {profile.first_name && profile.last_name && (
                                    <Text className="full_name" style={styles.full_name}>{`${profile.first_name} ${profile.last_name}`}</Text>
                                )}
                            </View>
                        </View>

                        <View 
                            className={profile.has_already_increased_activity_streak ? "streak increased" : "streak"}

                            style={[
                                styles.streak,
                                profile.has_already_increased_activity_streak ? styles.increased_streak : {}
                            ]}
                        >
                            <FontAwesome6
                                name="fire"
                                size={20}
                                color={BLUE_COLOR}
                            />

                            <Text style={styles.streak_text}>{profile.activity_streak || 0}</Text>
                        </View>
                    </View>

                    <View className="bottom">
                        {profile.bio && (
                            <View className="bio_container" style={styles.profile_bio_container}>
                                <Text className="bio" style={styles.profile_bio}>{profile.bio}</Text>

                                <View className="links" style={styles.links}>
                                    {profile.bio_links.map((one_link:BioLink, index:number) => (
                                        <Pressable 
                                            key={one_link.id || index}
                                            // onPress={}
                                            accessibilityLabel={t("Otvoriť odkaz")}

                                            style={[
                                                styles.profile_link_anchor, 
                                                { outlineStyle: "none" } as any
                                            ]}
                                        >
                                            {one_link.url.includes("instagram.com") && (
                                                <Icon
                                                    icon_name="instagram"
                                                    // onPress={}
                                                />
                                            )}

                                            {one_link.url.includes("facebook.com") && (
                                                <Icon
                                                    icon_name="facebook"
                                                    // onPress={}
                                                />
                                            )}

                                            {one_link.url.includes("youtube.com") && (
                                                <Icon
                                                    icon_name="youtube"
                                                    // onPress={}
                                                />
                                            )}

                                            {!one_link.url.includes("instagram.com") && !one_link.url.includes("facebook.com") && !one_link.url.includes("youtube.com") && (
                                                <Icon
                                                    icon_name="link"
                                                    // onPress={}
                                                />
                                            )}
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                <View className="middle">
                    <View className="follow_container" style={styles.follow_container}>
                        <View className="statistics" style={styles.statistics}>
                            <Pressable 
                                className="followers" 
                                onPress={() => setIsFollowersDialogOpen(true)}
                                style={styles.followers}
                            >
                                <Text className="amount" style={styles.followers_amount}>{profile.followers.length || 0}</Text>
                                <Text className="label" style={styles.followers_label}>{t("sledujú")}</Text>
                            </Pressable>

                            <FollowersDialog 
                                visible={is_followers_dialog_open}
                                onClose={() => setIsFollowersDialogOpen(false)}
                                profile={profile}
                                logged_in_user={logged_in_user}
                                onProfileUpdate={(profile:Profile|null) => onProfileUpdate(profile)}
                            />

                            <Pressable 
                                className="following" 
                                onPress={() => setIsFollowingDialogOpen(true)}
                                style={styles.following}
                            >
                                <Text className="amount" style={styles.following_amount}>{profile.following.length || 0}</Text>
                                <Text className="label" style={styles.following_label}>{t("sleduje")}</Text>
                            </Pressable>

                            <FollowingDialog 
                                visible={is_following_dialog_open}
                                onClose={() => setIsFollowingDialogOpen(false)}
                                profile={profile}
                                logged_in_user={logged_in_user}
                                onProfileUpdate={(profile:Profile|null) => onProfileUpdate(profile)}
                            />

                            <View className="posts">
                                <Text className="amount" style={styles.posts_amount}>{profile.posts.length || 0}</Text>
                                <Text className="label" style={styles.posts_label}>{t("príspevky")}</Text>
                            </View>
                        </View>

                        {logged_in_user && logged_in_user.private_account && logged_in_user.follow_requests.length > 0 && (
                            <View className="show_follow_requests" style={styles.show_follow_requests}>
                                <Text className="follow_requests_amount" style={styles.follow_requests_amount}>{logged_in_user.follow_requests.length || 0}</Text>

                                <Icon
                                    icon_name="bell"
                                    // onPress={}
                                    size={25}
                                    is_regular={true}
                                />
                            </View>

                            // <dialog class="follow_requests_dialog">
                            //     <div class="all_follow_requests">
                            //         <h2>{% translate "Žiadosti o sledovanie" %} (<span class="follow_requests_amount">{{ logged_in_user.follow_requests.count|default:0 }}</span>)</h2>

                            //         <a class="back" href="#" title="{% translate 'Zavrieť' %}" aria-label="{% translate 'Zavrieť' %}" target="_self"><i class="fa-solid fa-chevron-left"></i></a> <!-- https://fontawesome.com/icons/chevron-left -->

                            //         <p 
                            //             class="
                            //                 no_follow_requests

                            //                 {% if logged_in_user.follow_requests.count > 0 %}
                            //                     hidden

                            //                 {% endif %}
                            //             "
                            //         >
                            //             {% translate "Žiadne žiadosti o sledovanie." %}
                            //         </p>

                            //         {% for one_follow_request in logged_in_user.follow_requests %}
                            //             <div class="one_follow_request" data-id="{{ one_follow_request.id }}">
                            //                 <a href="{% url 'profile_url' one_follow_request.from_user.username %}" title="{% translate 'Zobraziť užívateľa' %}" aria-label="{% translate 'Zobraziť užívateľa' %}">
                            //                     <img 
                            //                         class="profile_picture skeleton_loading" 
                            //                         src="
                            //                             {% if one_follow_request.from_user.profile_picture_name %}
                            //                                 /../media/images/{{ one_follow_request.from_user.id }}/{{ one_follow_request.from_user.profile_picture_name }}

                            //                             {% else %}
                            //                                 {% static 'images/profile_picture.png' %} {% comment %} https://www.flaticon.com/free-icon/user_3177440 {% endcomment %}
                                                        
                            //                             {% endif %}
                            //                         "
                            //                         alt=""
                            //                     >
                            //                 </a>

                            //                 <p class="username">{{ one_follow_request.from_user.username }}</p>

                            //                 <button class="approve" title="{% translate 'Schváliť' %}" aria-label="{% translate 'Schváliť' %}">
                            //                     <i class="fa-solid fa-check"></i> <!-- https://fontawesome.com/icons/check -->
                            //                 </button>
                                            
                            //                 <button class="reject" title="{% translate 'Zamietnuť' %}" aria-label="{% translate 'Zamietnuť' %}">
                            //                     <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                            //                 </button>
                            //             </div>
                                    
                            //         {% endfor %}
                            //     </div>
                            // </dialog>
                        )}

                        {logged_in_user && logged_in_user.id !== profile.id && (
                            <Pressable
                                className="follow_button" 
                                onPress={() => toggleFollow(profile.id, getFollowButtonProperties(profile.private_account, profile.has_follow || false, profile.has_pending_follow_request || false).action)}

                                style={[
                                    styles.follow_button, 
                                    { outlineStyle: "none" } as any
                                ]}
                            >
                                <Text style={{ color: SECONDARY_COLOR }}>{getFollowButtonProperties(profile.private_account, profile.has_follow || false, profile.has_pending_follow_request || false).text}</Text>
                            </Pressable>
                        )}
                    </View>

                    {profile.has_follow && (
                        <View className="message_container" style={styles.message_container}>
                            <Text className="unread_messages" style={styles.unread_messages}>{profile.unread_messages_amount}</Text>

                            <Icon 
                                icon_name="comment-dots"
                                // onPress={}
                                is_regular={true}
                            />
                        </View>
                    )}

                    <BadgesContainer is_found={is_found} profile={profile} />
                </View>

                <View className="bottom" style={styles.bottom}>
                    {logged_in_user && profile && logged_in_user.id === profile.id && (
                        <View className="grid_select" style={styles.grid_select}>
                            <Animated.View
                                style={[
                                    {
                                        position: "absolute",
                                        top: 0,
                                        bottom: 0,
                                        width: "32%",
                                        backgroundColor: transparentize(BLUE_COLOR, 0.8),
                                        borderRadius: SMALL_BORDER_RADIUS,
                                    },

                                    grid_select_indicator_style,
                                ]}
                            />

                            <Pressable
                                className="all_posts_icon"
                                onPress={changeGridSelectActiveMenu}
                                style={styles.all_posts_icon}
                            >
                                <FontAwesome6
                                    name="buffer"
                                    size={25}
                                    color={grid_select_active_menu === "posts" ? BLUE_COLOR : DARK_BLUE_COLOR}

                                    style={[
                                        { marginRight: 5 },
                                        grid_select_active_menu === "posts" ? {transform: [{ scale: 1.1 }]} : {}
                                    ]}
                                />
                            </Pressable>

                            <Pressable
                                className="saved_posts_icon"
                                onPress={changeGridSelectActiveMenu}
                                style={styles.saved_posts_icon}
                            >
                                <FontAwesome6
                                    name="bookmark"
                                    size={25}
                                    solid={false}
                                    color={grid_select_active_menu === "saved_posts" ? BLUE_COLOR : DARK_BLUE_COLOR}

                                    style={[
                                        { marginLeft: 5 },
                                        grid_select_active_menu === "saved_posts" ? {transform: [{ scale: 1.1 }]} : {}
                                    ]}
                                />
                            </Pressable>
                        </View>
                    )}

                    {profile && profile.private_account && logged_in_user?.id !== profile.id && !profile.has_follow ? (
                        <View className="private_account_notice" style={styles.private_account_notice}>
                            <FontAwesome6
                                name="lock"
                                size={40}
                                color={BLUE_COLOR}
                            />

                            <Text style={styles.private_account_notice_text}>{t("Tento účet je súkromný.")}</Text>
                        </View>
                    ) : (
                        <>
                            {grid_select_active_menu === "posts" && (
                                <Animated.ScrollView 
                                    className="posts_container" 
                                    entering={grid_select_direction === "forward" ? SlideInRight.duration(300) : SlideInLeft.duration(300)} 
                                    exiting={grid_select_direction === "forward" ? SlideOutLeft.duration(300) : SlideOutRight.duration(300)}
                                    showsVerticalScrollIndicator={false}
                                    indicatorStyle="white"
                                    style={styles.posts_container}
                                >
                                    {profile.posts.length > 0 && (
                                        <View className="posts" style={styles.posts}>
                                            {profile.posts.map((one_post, index:number) => (
                                                !one_post.public_visibility && logged_in_user?.id !== profile.id && !profile.has_follow ? (
                                                    <View key={index} className="private_post_notice" style={styles.private_post_notice}>
                                                        <FontAwesome6
                                                            name="lock"
                                                            size={30}
                                                            color={transparentize(BLUE_COLOR, 0.25)}
                                                        />
                                                    </View>
                                                ) : (
                                                    <Pressable
                                                        key={one_post.media[0].id || index}
                                                        // onPress={}
                                                        accessibilityLabel={t("Zobraziť príspevok")}
                                                        style={styles.post_link}
                                                    >
                                                        {one_post.media[0].is_video ? (
                                                            <View 
                                                                className="thumbnail"
                                                                accessibilityLabel={t("Príspevok užívateľa {{username}}", { username: profile.username })}

                                                                style={{ 
                                                                    width: "100%", 
                                                                    height: "100%",
                                                                    aspectRatio: 1 / 1,
                                                                }}
                                                            >
                                                                <Image
                                                                    source={{ uri: `${DOMAIN}/media/${one_post.media[0].thumbnail}` }}

                                                                    style={{ 
                                                                        width: "100%", 
                                                                        height: "100%",
                                                                        aspectRatio: 1 / 1,
                                                                        resizeMode: "cover"
                                                                    }}
                                                                />
                                                            </View>
                                                        ) : (
                                                            <View 
                                                                className="image"
                                                                accessibilityLabel={t("Príspevok užívateľa {{username}}", { username: profile.username })}

                                                                style={{ 
                                                                    width: "100%", 
                                                                    height: "100%",
                                                                    aspectRatio: 1 / 1,
                                                                }}
                                                            >
                                                                    <Image
                                                                        source={{ uri: `${DOMAIN}/media/${one_post.media[0].file}` }}

                                                                        style={{ 
                                                                            width: "100%", 
                                                                            height: "100%",
                                                                            aspectRatio: 1 / 1,
                                                                            resizeMode: "cover"
                                                                        }}
                                                                    />
                                                            </View>
                                                        )}

                                                        <View className="post_info" style={styles.post_info}>
                                                            {!one_post.public_visibility || !one_post.allow_comments || one_post.hide_likes && (
                                                                <View className="settings" style={styles.settings}>
                                                                    {!one_post.public_visibility && (
                                                                        <FontAwesome6
                                                                            name="eye-low-vision"
                                                                            size={15}
                                                                            color={BLUE_COLOR}
                                                                        />
                                                                    )}

                                                                    {!one_post.allow_comments && (
                                                                        <FontAwesome6
                                                                            name="comment-slash"
                                                                            size={15}
                                                                            color={BLUE_COLOR}
                                                                        />
                                                                    )}

                                                                    {one_post.hide_likes && (
                                                                        <FontAwesome6
                                                                            name="heart"
                                                                            size={15}
                                                                            solid={false}
                                                                            color={BLUE_COLOR}
                                                                        />
                                                                    )}
                                                                </View>
                                                            )}

                                                            {one_post.media.length > 1 && (
                                                                <View className="multiple_posts" style={styles.multiple_posts}>
                                                                    <Text style={styles.multiple_posts_text}>{one_post.media.length}</Text>

                                                                    <FontAwesome6
                                                                        name="buffer"
                                                                        size={15}
                                                                        color={BLUE_COLOR}
                                                                    />
                                                                </View>
                                                            )}
                                                        </View>
                                                    </Pressable>
                                                )
                                            ))}
                                        </View>
                                    )}

                                    {profile.posts.length === 0 && (
                                        <Text 
                                            className="no_posts"

                                            style={[
                                                styles.no_posts,
                                                logged_in_user?.id !== profile.id ? {marginTop: 0} : {}
                                            ]}
                                        >
                                            {t("Zatiaľ žiadne príspevky.")}
                                        </Text>
                                    )}
                                </Animated.ScrollView>
                            )}

                            {grid_select_active_menu === "saved_posts" && (
                                <Animated.ScrollView 
                                    className="saved_posts_container hidden" 
                                    entering={grid_select_direction === "back" ? SlideInLeft.duration(300) : SlideInRight.duration(300)} 
                                    exiting={grid_select_direction === "back" ? SlideOutRight.duration(300) : SlideOutLeft.duration(300)}
                                    showsVerticalScrollIndicator={false}
                                    indicatorStyle="white"
                                    style={styles.posts_container}
                                >
                                    {logged_in_user && profile.saved_posts && profile.saved_posts.length > 0 && logged_in_user.id === profile.id && (
                                        <View className="saved_posts" style={styles.posts}>
                                            {profile.saved_posts.map((one_post, index:number) => (
                                                <Pressable
                                                    key={one_post.media[0].id || index}
                                                    // onPress={}
                                                    accessibilityLabel={t("Zobraziť príspevok")}
                                                    style={styles.post_link}
                                                >
                                                    {one_post.media[0].is_video ? (
                                                        <View 
                                                            className="thumbnail"
                                                            accessibilityLabel={t("Príspevok užívateľa {{username}}", { username: profile.username })}
                                                            
                                                            style={{ 
                                                                width: "100%", 
                                                                height: "100%",
                                                                aspectRatio: 1 / 1,
                                                            }}
                                                        >
                                                            <Image
                                                                source={{ uri: `${DOMAIN}/media/${one_post.media[0].thumbnail}` }}

                                                                style={{ 
                                                                    width: "100%", 
                                                                    height: "100%",
                                                                    aspectRatio: 1 / 1,
                                                                    resizeMode: "cover"
                                                                }}
                                                            />
                                                        </View>
                                                    ) : (
                                                        <View 
                                                            className="image"
                                                            accessibilityLabel={t("Príspevok užívateľa {{username}}", { username: profile.username })}
                                                            
                                                            style={{ 
                                                                width: "100%", 
                                                                height: "100%",
                                                                aspectRatio: 1 / 1,
                                                            }}
                                                        >
                                                            <Image
                                                                source={{ uri: `${DOMAIN}/media/${one_post.media[0].file}` }}

                                                                style={{ 
                                                                    width: "100%", 
                                                                    height: "100%",
                                                                    aspectRatio: 1 / 1,
                                                                    resizeMode: "cover"
                                                                }}
                                                            />
                                                        </View>
                                                    )}

                                                    {one_post.media.length > 1 && (
                                                        <View className="post_info" style={styles.post_info}>
                                                            <View className="multiple_posts" style={styles.multiple_posts}>
                                                                <Text style={styles.multiple_posts_text}>{one_post.media.length}</Text>

                                                                <FontAwesome6
                                                                    name="buffer"
                                                                    size={15}
                                                                    color={BLUE_COLOR}
                                                                />
                                                            </View>
                                                        </View>
                                                    )}
                                                </Pressable>
                                            ))}
                                        </View>
                                    )}

                                    {profile.saved_posts?.length === 0 && logged_in_user && logged_in_user.id === profile.id && (
                                        <Text className="no_saved_posts" style={styles.no_saved_posts}>{t("Žiadne uložené príspevky.")}</Text>
                                    )}
                                </Animated.ScrollView>
                            )}
                        </>
                    )}
                </View>
            </Animated.View>
        ) : (
            <View className="profile" style={styles.profile}>
                <View className="header" style={styles.profile_header}>
                    <View className="top" style={styles.top}>
                        <View className="info" style={styles.profile_info}>
                            <View 
                                className="profile_picture_container"
                                style={styles.profile_picture_container}
                            >
                                <Image 
                                    className="profile_picture"
                                    source={{ uri: `${DOMAIN}/static/images/profile_picture.png`}} // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                                    style={styles.profile_picture}
                                />
                            </View>

                            <View className="name" style={styles.name}>
                                <Text className="username" style={styles.profile_username}>{t("Neexistujúci účet")}</Text>
                            </View>
                        </View>

                        <View className="streak" style={styles.streak}>
                            <FontAwesome6
                                name="fire"
                                size={20}
                                color={BLUE_COLOR}
                            />

                            <Text style={styles.streak_text}>0</Text>
                        </View>
                    </View>
                </View>

                <View className="middle">
                    <View className="follow_container" style={styles.follow_container}>
                        <View className="statistics" style={styles.statistics}>
                            <View className="followers" style={styles.followers}>
                                <Text className="amount" style={styles.followers_amount}>0</Text>
                                <Text className="label" style={styles.followers_label}>{t("sledujú")}</Text>
                            </View>

                            <View className="following" style={styles.following}>
                                <Text className="amount" style={styles.following_amount}>0</Text>
                                <Text className="label" style={styles.following_label}>{t("sleduje")}</Text>
                            </View>
                        </View>
                    </View>

                    <BadgesContainer is_found={is_found} profile={profile} />
                </View>

                <View className="bottom" style={styles.bottom}>
                    {profile && profile.private_account && logged_in_user && logged_in_user.id !== profile.id && !profile.has_follow ? (
                        <View className="private_account_notice" style={styles.private_account_notice}>
                            <FontAwesome6
                                name="lock"
                                size={40}
                                color={BLUE_COLOR}
                            />

                            <Text style={styles.private_account_notice_text}>{t("Tento účet je súkromný.")}</Text>
                        </View>
                    ) : (
                        <View className="posts_container" style={styles.posts_container}>
                            <Text className="no_posts" style={styles.no_posts}>{t("Zatiaľ žiadne príspevky.")}</Text>
                        </View>
                    )}
                </View>
            </View>
        )
    )
}

const styles = StyleSheet.create({
    profile: {
        width: "100%",
        // transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;

        // &.hidden {
        //     position: absolute;
        //     top: 0px;
        //     left: 0px;
        //     width: 100%;
        //     transform: translateX(100%);
        //     opacity: 0;
        //     visibility: hidden;
        //     pointer-events: none;
        // }
    },

    profile_header: {
        gap: 10,
        marginBottom: 20,
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

    top: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    profile_info: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
        minWidth: 0,
    },

    profile_picture_container: {
        padding: 2,
        borderWidth: 1,
        borderColor: LIGHT_BLUE_COLOR,
        borderRadius: 100,
    },

    profile_picture: {
        width: 64,
        height: 64,
        borderRadius: 64 / 2,
        cursor: "pointer",
        // transition: transform 0.3s ease;

        // &:hover {
        //     transform: scale(1.05);
        // }
    },
  
    subscriber_profile_picture: {
        backgroundColor: transparentize(YELLOW_COLOR, 0.85),
        borderColor: transparentize(YELLOW_COLOR, 0.5),
        shadowColor: YELLOW_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    name: {
        gap: 2,
        minWidth: 0,
        textAlign: "left",
    },

    profile_username: {
        // @include crop_text;
        fontSize: 22,
        fontWeight: "semibold",
        // background: linear-gradient(135deg, $secondary-color 20%, lighten($blue-color, 15%) 60%, $blue-color 100%);
        // background-clip: text;
        // -webkit-background-clip: text;
        // -webkit-text-fill-color: transparent;
        color: SECONDARY_COLOR,
    },

    full_name: {
        // @include crop_text;
        // font-size: 0.9em;
        color: LIGHT_BLUE_COLOR,
    },

    streak: {
        userSelect: "none",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
        color: LIGHT_BLUE_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    },

    increased_streak: {
        backgroundColor: transparentize(YELLOW_COLOR, 0.9),
        color: YELLOW_COLOR,
        borderColor: transparentize(YELLOW_COLOR, 0.5),
        shadowColor: YELLOW_COLOR,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },

    streak_text: {
        lineHeight: 1,
        color: SECONDARY_COLOR,
    },

    profile_bio_container: {
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#333333",
    },

    profile_bio: {
        textAlign: "left",
        color: LIGHT_BLUE_COLOR,
    },

    links: {
        flexDirection: "row",
        gap: 10,
        marginTop: 10,
    },

    profile_link_anchor: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: 30 / 2,
        // transition: transform 0.2s ease;

        // &:hover {
        //     transform: translateY(-2px);

        //     i {
        //         color: $dark-blue-color
        //     }
        // }
    },

    follow_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        marginBottom: 20,
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

    statistics: {
        flexDirection: "row",
        gap: 20,
    },

    followers: {
        textAlign: "center",
        cursor: "pointer",
    },

    followers_amount: {
        fontSize: 25,
        fontWeight: "bold",
        // lineHeight: 1,
        color: BLUE_COLOR,
    },

    followers_label: {
        // marginTop: 5,
        color: LIGHT_BLUE_COLOR,
        textTransform: "uppercase",
        fontSize: 15,
        letterSpacing: 0.5,
    },

    following: {
        textAlign: "center",
        cursor: "pointer",
    },

    following_amount: {
        fontSize: 25,
        fontWeight: "bold",
        // lineHeight: 1,
        color: BLUE_COLOR,
    },

    following_label: {
        // marginTop: 5,
        color: LIGHT_BLUE_COLOR,
        textTransform: "uppercase",
        fontSize: 15,
        letterSpacing: 0.5,
    },

    posts_amount: {
        fontSize: 25,
        fontWeight: "bold",
        // lineHeight: 1,
        color: BLUE_COLOR,
    },

    posts_label: {
        // marginTop: 5,
        color: LIGHT_BLUE_COLOR,
        textTransform: "uppercase",
        fontSize: 15,
        letterSpacing: 0.5,
    },

    show_follow_requests: {
        position: "relative",
        // transition: transform 0.3s ease;

        // &:hover {
        //     transform: scale(1.1);
        //     cursor: pointer;       
        // }
    },

    follow_requests_amount: {
        position: "absolute",
        top: -5,
        right: -8,
        lineHeight: 1,
        color: BLUE_COLOR,
    },

    follow_button: {
        marginLeft: "auto",
        paddingVertical: 5,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     cursor: pointer;
        // }
    },

    remove_follower: {
        marginLeft: "auto",
        paddingVertical: 5,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     cursor: pointer;
        // }
    },

    message_container: {
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        justifyContent: "flex-end",
        marginBottom: 25,
        paddingVertical: 15,
        paddingHorizontal: 20,
        // background: linear-gradient(145deg, transparentize($blue-color, 0.95) 0%, transparentize($main-color, 0.95) 100%);
        // border: 1px solid $profile-surface-border;
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    unread_messages: {
        fontSize: 22,
        color: transparentize(SECONDARY_COLOR, 0.4),
    },

    // .message_container {
    //     a {
    //         display: inline-block;
    //         text-decoration: none;
    //         transition: transform 0.3s ease;

    //         &:hover {
    //             cursor: pointer;
    //             transform: translateY(-2px);
    //         }

    //         .fa-comment-dots {
    //             display: block;
    //             font-size: 2em;
    //             color: $blue-color;
    //         }
    //     }
    // }

    bottom: {
        position: "relative",
        paddingTop: 10,
    },

    grid_select: {
        position: "relative",
        // display: grid;
        // grid-template-columns: repeat(3, 1fr);
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 5,
        marginHorizontal: 5,
        marginBottom: 10,
        padding: 5,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: MEDIUM_BORDER_RADIUS,
        overflow: "hidden",
    },

    all_posts_icon: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        maxWidth: "32%",
        // marginHorizontal: "auto",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "transparent",
        textAlign: "center",
        borderRadius: SMALL_BORDER_RADIUS,
        // grid-column: 1;

        // &::before {
        //     display: none;
        // }

        // &:hover,
        // &:focus-visible,
        // &.active {
        //     cursor: pointer;
        //     background: transparentize($blue-color, 0.8);

        //     .fa-buffer,
        //     .fa-bookmark {
        //         color: $blue-color;
        //     }
        // }

        // &.active .fa-buffer,
        // &.active .fa-bookmark {
        //     transform: scale(1.1);
        // }
    },

    saved_posts_icon: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        maxWidth: "32%",
        // marginHorizontal: "auto",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "transparent",
        textAlign: "center",
        borderRadius: SMALL_BORDER_RADIUS,
        // grid-column: 3;

        // &::before {
        //     display: none;
        // }

        // &:hover,
        // &:focus-visible,
        // &.active {
        //     cursor: pointer;
        //     background: transparentize($blue-color, 0.8);

        //     .fa-buffer,
        //     .fa-bookmark {
        //         color: $blue-color;
        //     }
        // }

        // &.active .fa-buffer,
        // &.active .fa-bookmark {
        //     transform: scale(1.1);
        // }
    },

    posts_container: {
        // @include scrollbar;
        position: "relative",
        width: "100%",
        maxHeight: 130 * 3,
        // transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;

        // &.hidden {
        //     position: absolute;
        //     top: 50px;
        //     left: 0px;
        //     width: 100%;
        //     transform: translateX(100%);
        //     opacity: 0;
        //     visibility: hidden;
        //     pointer-events: none;
        // }
    },

    posts: {
        // display: grid;
        // grid-template-columns: repeat(3, 1fr);
        flexDirection: "row",
        flexWrap: "wrap",
        // justifyContent: "center",
        gap: 10,
        margin: 5,
    },

    private_post_notice: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        // background: $profile-surface-hover;
        // border: 1px solid $profile-surface-border;
        backgroundColor: BLUE_COLOR,
        borderWidth: 1,
        borderColor: BLUE_COLOR,
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    post_link: {
        position: "relative",
        width: "32%",
        aspectRatio: 1 / 1,
        color: SECONDARY_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
        borderWidth: 1,
        borderColor: "transparent",
        overflow: "hidden",
        // transition: border-color 0.3s ease;

        // &:hover {
        //     border-color: transparentize($blue-color, 0.8);
        // }
    },

    post_image: {
        width: "100%",
        height: "100%",
        aspectRatio: 1 / 1,
        objectFit: "cover",
        // transition: filter 0.3s ease;
    
        // &:hover {
        //     filter: blur(2px) grayscale(0.8);
        //     cursor: pointer;
        // }
    },

    post_thumbnail: {
        width: "100%",
        height: "100%",
        aspectRatio: 1 / 1,
        objectFit: "cover",
        // transition: filter 0.3s ease;
    
        // &:hover {
        //     filter: blur(2px) grayscale(0.8);
        //     cursor: pointer;
        // }
    },

    post_info: {
        position: "absolute",
        top: 0,
        left: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 5,
        width: "100%",
        padding: 5,
    },

    settings: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 20,
        paddingHorizontal: 10,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        // backdrop-filter: blur(5px);
        color: LIGHT_BLUE_COLOR,
        // border: 1px solid $profile-surface-border;
        borderWidth: 1,
        borderColor: BLUE_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
    },

    multiple_posts: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 20,
        marginLeft: "auto",
        paddingHorizontal: 10,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        // backdrop-filter: blur(5px);
        color: LIGHT_BLUE_COLOR,
        // border: 1px solid $profile-surface-border;
        borderWidth: 1,
        borderColor: BLUE_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
    },

    multiple_posts_text: {
        fontSize: 15,
        fontWeight: "bold",
        color: SECONDARY_COLOR,
    },

    no_posts: {
        display: "none",
        marginTop: 15,
        textAlign: "center",
        // color: $light-blue-color;
        color: BLUE_COLOR,
    },

    no_saved_posts: {
        display: "none",
        marginTop: 15,
        textAlign: "center",
        // color: $light-blue-color;
        color: BLUE_COLOR,
    },

    private_account_notice: {
        textAlign: "center",
        padding: 20,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        // border: 1px solid $profile-surface-border;
        borderRadius: SMALL_BORDER_RADIUS,
    },

    private_account_notice_text: {
        marginTop: 10,
        color: LIGHT_BLUE_COLOR,
    },
})