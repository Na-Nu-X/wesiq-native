import React, { useState, useEffect, useRef } from "react"
import { View, StyleSheet, TextInput, Text, Alert, Pressable, Image, Share, Switch, ScrollView, ActivityIndicator, Linking, Platform } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import Icon from "@/components/Icon"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import ProfilePictureLink from "./ProfilePictureLink"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { DOMAIN, API_URL } from "@/constants/general"
import { getTimeAgo, getFormattedTime } from "@/utils/time"
import { FontAwesome6 } from "@expo/vector-icons"
import { Video, ResizeMode } from "expo-av"
import Slider from "@react-native-community/slider"
import Svg, { Path } from "react-native-svg"
import EmojiPicker from "rn-emoji-keyboard"
import { HeartParticle } from "./HeartParticle"
import { getFollowButtonProperties } from "./SearchUsers"
import { DynamicImage } from "./DynamicImage"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { useMemo } from "react"
import { DynamicVideo } from "./DynamicVideo"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { VideoMetrics } from "./VideoMetrics"
import { BlurView } from "expo-blur"

import type { Post, Media, Comment } from "./Feed"
import type { LoggedInUser } from "./LoginFormDialog"
import type { BasicResponse } from "./Feed"

interface loadedPostCommentsResponse {
    success:boolean,
    has_next:boolean,
    visible_comments?:Comment[],
    message:string
}

interface AddedPostCommentResponse {
    success:boolean,
    comment?:AddedComment,
    message:string
}

interface AddedComment {
    id:number,

    user:{
        id:number,
        username:string,
        profile_picture_name:string|null,

        subscription?:{
            is_active:boolean
        }
    },

    creation_time:string,
    level:number
}

interface Particle {
    id:number,
    x:number,
    y:number,
    is_regular:boolean
}

interface PostContainerProps {
    post:Post,
    logged_in_user:LoggedInUser|null,
    onPostsUpdate:(posts:Post[]) => void,
    posts:Post[],
    onLoggedInUserUpdate:(logged_in_user:LoggedInUser) => void,
    onShowPostProperties:(post:Post) => void,
    onShowPostCommentProperties:(comment:Comment) => void,
    are_posts_loading:boolean
}

export const PostContainer = ({ 
    post, 
    logged_in_user, 
    onPostsUpdate, 
    posts, 
    onShowPostProperties, 
    onShowPostCommentProperties, 
    onLoggedInUserUpdate, 
    are_posts_loading 
}:PostContainerProps) => {
    // const [post_comments, setPostComments] = useState<comment[]>([]) // Stores The Post Comments
    const [post_comments_page, setPostCommentsPage] = useState<number>(1) // Stores The Current Post Comments Page Number
    const [has_next_post_comments, setHasNextPostComments] = useState<boolean>(true) // Stores The Information If There Are More Post Comments Available
    const [are_post_comments_loading, setArePostCommentsLoading] = useState<boolean>(false) // Stores The Information If Post Comments Are Loading
    const [is_comment_forum_open, setIsCommentForumOpen] = useState<boolean>(false) // Stores The Information If The Comment Forum Is Open

    const [comment, setComment] = useState<string>("") // Stores The Written Comment
    const MAX_COMMENT_LENGTH:number = 100 // Sets The Maximum Comment Length

    const [active_post_media, setActivePostMedia] = useState<Record<number, number>>({}) // Stores The Active Post Media
    const [playing_video, setPlayingVideo] = useState<number|null>(null) // Stores The Current Playing Video ID
    const is_volume_slider_sliding = useRef<boolean>(false) // Stores The Information If The Volume Slider Is Sliding

    const [is_emoji_picker_open, setIsEmojiPickerOpen] = useState<boolean>(false) // Stores The Information If The Emoji Picker Is Open

    const [particles, setParticles] = useState<Particle[]>([]) // Stores The Like Particles

    const [is_video_metrics_open, setIsVideoMetricsOpen] = useState<boolean>(false) // Stores The Information If The Video Metrics Is Open

    // Function For Get Post Comments
    const getPostComments = async (page:number = 1, is_refresh:boolean = false, post_id:number) => {
        if(are_post_comments_loading || (!has_next_post_comments && !is_refresh)) return

        setArePostCommentsLoading(true) // Stores The Information That Posts Are Loading

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const loaded_post_comments_response:Response = await fetch(`${API_URL}/get-post-comments/?post_id=${post_id}&page=${page}`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_post_comments_response.ok) {
                Alert.alert("Chyba", "Pri hľadaní komentárov došlo k chybe.") // Shows The Alert
                return
            }

            const loaded_post_comments_data:loadedPostCommentsResponse = await loaded_post_comments_response.json() // Gets The Loaded Post Comments Data

            // If The Response Isn't Success
            if(!loaded_post_comments_data.success) {
                Alert.alert("Chyba", loaded_post_comments_data.message) // Shows The Alert
                return
            }

            if(is_refresh) {
                // Stores The New State Of Updated Posts
                const updated_posts:Post[] = posts.map((one_post:Post) => {
                    if(one_post.id === post.id) {
                        return {
                            ...one_post,
                            comments: loaded_post_comments_data.visible_comments || [] // Sets The Post Comments
                        }
                    }

                    return one_post // Returns The Unchanged Post
                })

                onPostsUpdate(updated_posts) // Sets The Posts
            }
            
            else {
                // Stores The New State Of Updated Posts
                const updated_posts:Post[] = posts.map((one_post:Post) => {
                    if(one_post.id === post.id) {
                        const previous_post_comments:Comment[] = one_post.comments || [] // Gets The Previous Post Comments
                        const incoming_post_comments:Comment[] = (loaded_post_comments_data.visible_comments as Comment[]) || [] // Gets The Incoming Post Comments
                        const existing_post_comments_ids:Set<number> = new Set(previous_post_comments.map((one_comment:Comment) => one_comment.id)) // Gets The Existing Post Comments IDs
                        const new_post_comments:Comment[] = incoming_post_comments.filter((one_comment:Comment) => !existing_post_comments_ids.has(one_comment.id)) // Gets The New Unique Post Comments

                        return {
                            ...one_post,
                            comments: is_refresh ? incoming_post_comments : [...previous_post_comments, ...new_post_comments] // Returns The Combined Post Comments
                        }
                    }

                    return one_post // Returns The Unchanged Post
                })

                onPostsUpdate(updated_posts) // Sets The Posts
            }
    
            setHasNextPostComments(loaded_post_comments_data.has_next || false) // Sets The Has Next Post Comments
            setPostCommentsPage(page) // Sets The Post Comments Page
        } 
        
        catch {
            Alert.alert("Chyba", "Pri hľadaní komentárov došlo k chybe.") // Shows The Alert
        } 
        
        finally {
            setArePostCommentsLoading(false) // Stores The Information That Posts Aren't Loading
        }
    }
    
    // Function For Load More Post Comments
    const loadMorePostComments = (post_id:number) => {
        if(has_next_post_comments && !are_post_comments_loading) getPostComments(post_comments_page + 1, false, post_id) // Loads Posts
    }

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

    // Function For Handle The Emoji Select
    const handleEmojiSelect = (emoji:{ emoji:string }) => {
        if(comment.length >= MAX_COMMENT_LENGTH) return
        setComment((previous_comment) => previous_comment + emoji.emoji) // Sets The Comment
    }

    // Function For Load Comments
    const loadComments = (post_comments:Comment[]) => {
        return post_comments.map((one_post_comment:Comment, index:number) => (
            <View 
                key={one_post_comment.id || index}
                className="one_comment" 
                style={styles.one_comment}
            >
                <View className="comment_container" style={styles.comment_container}>
                    <View className="user" style={styles.user}>
                        <ProfilePictureLink user_id={one_post_comment.user.id} user_profile_picture_name={one_post_comment.user.profile_picture_name || null} user_subscription={one_post_comment.user.subscription?.is_active || false} label="Zobraziť užívateľa" />

                        <Text 
                            className="username" 

                            style={{ 
                                color: SECONDARY_COLOR, 
                                fontWeight: "bold",
                            }}
                        >
                            {one_post_comment.user.username}
                        </Text>

                        <View 
                            className="show_comment_properties_button"
                            accessibilityLabel="Viac..." 
                            
                            style={{ 
                                marginLeft: "auto", 
                                marginRight: 10,
                            }}
                        >
                            <Icon
                                icon_name="ellipsis-vertical"
                                onPress={() => onShowPostCommentProperties(one_post_comment)}
                            />
                        </View>
                    </View>

                    <View 
                        className="right"

                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            marginBottom: 7.5,
                            marginLeft: 38 + 10,
                            paddingRight: 10,
                        }}
                    >
                        <Text 
                            className="comment"

                            style={{
                                color: SECONDARY_COLOR,
                                textAlign: "justify",
                                paddingRight: 10,
                                // line-break: anywhere;
                            }}
                        >
                            {one_post_comment.comment}
                        </Text>

                        <View className="likes_container" style={styles.likes_container}>
                            <View className="likes" accessibilityLabel="Páči sa mi..." style={styles.comment_likes}>
                                <Icon
                                    icon_name="heart"
                                    onPress={() => togglePostCommentLike(one_post_comment.id)}
                                    is_regular={!Boolean(logged_in_user && one_post_comment.likes_from_users.includes(logged_in_user.id))} // Shows The Empty Or Filled Heart Icon
                                    color={Boolean(logged_in_user && one_post_comment.likes_from_users.includes(logged_in_user.id)) ? RED_COLOR : BLUE_COLOR} // Shows The Red Or Blue Colored Heart Icon
                                    pressed_color={RED_COLOR}
                                />

                                <Text 
                                    className="likes_counter" 
                                    style={styles.comment_likes_counter}
                                >
                                    {one_post_comment.likes}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="interactions" style={styles.interactions}>
                    {one_post_comment.level < 5 && (
                        <View className="reply" accessibilityLabel="Odpovedať...">
                            <Icon
                                icon_name="comment"
                                // onPress={}
                                is_regular={true}
                            />
                        </View>
                    )}

                    {one_post_comment.parent_id && (
                        <View className="show_replies" accessibilityLabel="Zobraziť odpovede...">
                            <Icon
                                icon_name="angle-down"
                                // onPress={}
                            />
                        </View>
                    )}

                    <View className="date" accessibilityLabel="Dátum zverejnenia" style={styles.date}>
                        <Text style={styles.date_text}>{getTimeAgo(one_post_comment.creation_time)}</Text>
                    </View>
                </View>
                
                <View className="reply_container hidden" style={styles.reply_container}>

                </View>

                {/* // Appends The Reply
                if(one_visible_comment.parent_id) {
                    const parent_comment:HTMLDivElement|null = all_comments.querySelector(`[data-comment_id="${one_visible_comment.parent_id}"]`) as HTMLDivElement || null // Gets The Parent Comment

                    if(parent_comment) {
                        const reply_container:HTMLDivElement = parent_comment.querySelector(".reply_container") as HTMLDivElement // Gets The Reply Container

                        reply_container.prepend(one_comment_container)

                        if(one_visible_comment.level === 2) {
                            one_comment_container.classList.add("first_level_reply")
                        }
                    }
                } */}
            </View>
        ))
    }

    // Function For Toggle Post Like
    const togglePostLike = async (post_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Označenie páči sa mi to nie je možné zmeniť bez prihlásenia.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const toggle_post_like_response:Response = await fetch(`${API_URL}/toggle-post-like/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    post_id: post_id
                })
            })

            // If The Response Isn't Success
            if(!toggle_post_like_response.ok) {
                Alert.alert("Chyba", "Pri zmene označenia páči sa mi to došlo k chybe.") // Shows The Alert
                return
            }

            const toggle_post_like_data:BasicResponse = await toggle_post_like_response.json() // Gets The Toggle Post Like Data

            // If The Response Isn't Success
            if(!toggle_post_like_data.success) {
                Alert.alert("Chyba", toggle_post_like_data.message) // Shows The Alert
                return
            }
            
            else {
                // Stores The New State Of Updated Posts
                const updated_posts:Post[] = posts.map((one_post:Post) => {
                    if(one_post.id === post_id) {
                        const has_like:boolean = one_post.likes_from_users.includes(logged_in_user.id) // Checks If The User Had Already Liked The Post

                        if(!has_like) generateHeartParticles() // Generates The Heart Particles
                        
                        // Updates The Post Likes Amount And Stored Likes From Users
                        return {
                            ...one_post,
                            likes: has_like ? one_post.likes - 1 : one_post.likes + 1,
                            likes_from_users: has_like 
                                ? one_post.likes_from_users.filter(id => id !== logged_in_user.id) 
                                : [...one_post.likes_from_users, logged_in_user.id]
                        }
                    }

                    return one_post // Returns The Unchanged Post
                })

                onPostsUpdate(updated_posts) // Sets The Posts
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri zmene označenia páči sa mi to došlo k chybe.") // Shows The Alert
        }
    }
    
    // Function For Generate The Heart Particles
    const generateHeartParticles = ():void => {
        const amount:number = Math.floor(Math.random() * 5) + 1 // Generates The Random Amount Of The Particles Between 1 And 5
        const new_particles:Particle[] = [] // Stores The New Particles
      
        // Generates The New Particles
        for(let i:number = 0; i < amount; i++) {
            new_particles.push({
                id: Date.now() + Math.random(),
                x: (Math.random() * 90 + 20) * (Math.random() < 0.5 ? 1 : -1), // Generates The Random X Position Between -110 And -20 To The Left And Between 20 And 110 To The Right
                y: -(Math.random() * 90 + 20), // Generates The Random Y Position Between -20 And -110 To Up
                is_regular: Math.random() > 0.5
            })
        }
      
        setParticles(new_particles) // Sets The Particles
    }

    // Function For Remove The Particle
    const removeParticle = (id:number):void => {
        setParticles((previous_particles) => previous_particles.filter((one_particle) => one_particle.id !== id)) // Sets The Particles
    }

    // Function For Toggle Show Comments
    const toggleShowComments = (post:Post) => {
        if(!is_comment_forum_open) {
            setIsCommentForumOpen(true) // Sets The Information That The Comment Forum Is Open
            getPostComments(post_comments_page, false, post.id) // Gets The Post Comments
        }

        else setIsCommentForumOpen(false) // Sets The Information That The Comment Forum Isn't Open
    }

    // Function For Share The Post
    const sharePost = async (post_id:number, username:string):Promise<void> => {
        // const link:string = interpolate(gettext("/sk/prispevok/%s"), [post_id]) // Sets The Link To The Post
        const link: string = `${DOMAIN}/sk/prispevok/${post_id}` // Sets The Link To The Post
    
        try {
            const result = await Share.share({
                message: `Wesiq - Príspevok užívateľa ${username}\n${link}`,
                url: link, // Only IOS
                title: `Wesiq - Príspevok užívateľa ${username}`
            })
    
            if(result.action === Share.sharedAction) {
                if(result.activityType) console.log("Zdieľané cez: ", result.activityType) // Only IOS
                else console.log("Úspešne zdieľané")
            } 
            
            else if(result.action === Share.dismissedAction) console.log("Zdieľanie zrušené") // Only IOS
        } 

        catch(error:any) {
            Alert.alert("Chyba", "Nepodarilo sa otvoriť menu na zdieľanie.")
        }
    }

    // Function For Save Or Unsave The Post
    const togglePostSave = async (post_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Príspevok nie je možné uložiť bez prihlásenia.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const toggle_post_save_response:Response = await fetch(`${API_URL}/toggle-post-save/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    post_id: post_id
                })
            })

            // If The Response Isn't Success
            if(!toggle_post_save_response.ok) {
                Alert.alert("Chyba", "Pri zmene uloženia príspevku došlo k chybe.") // Shows The Alert
                return
            }

            const toggle_post_save_data:BasicResponse = await toggle_post_save_response.json() // Gets The Toggle Post Save Data

            // If The Response Isn't Success
            if(!toggle_post_save_data.success) {
                Alert.alert("Chyba", toggle_post_save_data.message) // Shows The Alert
                return
            }
            
            else {
                if(!logged_in_user) return

                const has_save:boolean = logged_in_user.saved_posts.includes(post_id) // Checks If The User Had Already Saved The Post

                // Stores The New State Of Updated Logged In User
                const updated_logged_in_user:LoggedInUser = {
                    ...logged_in_user,

                    // Updates The Saved Posts
                    saved_posts: has_save
                        ? logged_in_user.saved_posts.filter(id => id !== post_id) // Removes The Post From The Saved Posts
                        : [...logged_in_user.saved_posts, post_id] // Adds The Post To The Saved Posts
                }

                onLoggedInUserUpdate(updated_logged_in_user) // Sets The Logged In User
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri zmene uloženia príspevku došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Toggle Post Comment Like
    const togglePostCommentLike = async (comment_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Označenie páči sa mi to nie je možné zmeniť bez prihlásenia.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const toggle_post_comment_like_response:Response = await fetch(`${API_URL}/toggle-post-comment-like/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    comment_id: comment_id
                })
            })

            // If The Response Isn't Success
            if(!toggle_post_comment_like_response.ok) {
                Alert.alert("Chyba", "Pri zmene označenia páči sa mi to došlo k chybe.") // Shows The Alert
                return
            }

            const toggle_post_comment_like_data:BasicResponse = await toggle_post_comment_like_response.json() // Gets The Toggle Post Comment Like Data

            // If The Response Isn't Success
            if(!toggle_post_comment_like_data.success) {
                Alert.alert("Chyba", toggle_post_comment_like_data.message) // Shows The Alert
                return
            }
            
            else {
                // Stores The New State Of Updated Posts
                const updated_posts:Post[] = posts.map((one_post:Post) => {
                    if(one_post.id === post.id) {
                        const previous_post_comments:Comment[] = one_post.comments || [] // Gets The Previous Post Comments

                        return {
                            ...one_post,

                            comments: previous_post_comments.map((one_post_comment:Comment) => {
                                if(one_post_comment.id === comment_id) {
                                    const has_like:boolean = one_post_comment.likes_from_users.includes(logged_in_user.id) // Checks If The User Had Already Liked The Post
                                    
                                    // Updates The Post Comment Likes Amount And Stored Likes From Users
                                    return {
                                        ...one_post_comment,

                                        likes: has_like ? one_post_comment.likes - 1 : one_post_comment.likes + 1,
                                        likes_from_users: has_like 
                                            ? one_post_comment.likes_from_users.filter(id => id !== logged_in_user.id) 
                                            : [...one_post_comment.likes_from_users, logged_in_user.id]
                                    }
                                }

                                return one_post_comment // Returns The Unchanged Post Comment
                            })
                        }
                    }

                    return one_post // Returns The Unchanged Post
                })

                onPostsUpdate(updated_posts) // Sets The Posts
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri zmene označenia páči sa mi to došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Add Comment
    const addComment = async (post_id:number, comment:string, parent_id:number|null):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Komentár nie je možné pridať bez prihlásenia.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const added_post_comment_response:Response = await fetch(`${API_URL}/add-comment/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    post_id: post_id,
                    comment: comment,
                    parent_id: parent_id
                })
            })

            // If The Response Isn't Success
            if(!added_post_comment_response.ok) {
                Alert.alert("Chyba", "Pri pridávaní komentáru došlo k chybe.") // Shows The Alert
                return
            }

            const added_post_comment_data:AddedPostCommentResponse = await added_post_comment_response.json() // Gets The Added Post Comment Data

            // If The Response Isn't Success
            if(!added_post_comment_data.success || !added_post_comment_data.comment) {
                Alert.alert("Chyba", added_post_comment_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert("Úspech", added_post_comment_data.message) // Shows The Alert

                // Stores The New Comment Data
                const new_comment:Comment = {
                    id: added_post_comment_data.comment.id,

                    user:{
                        id: added_post_comment_data.comment.user.id,
                        first_name: logged_in_user.first_name,
                        last_name: logged_in_user.last_name,
                        username: added_post_comment_data.comment.user.username,
                        profile_picture_name: added_post_comment_data.comment.user.profile_picture_name,
                        subscription:added_post_comment_data.comment.user.subscription
                    },

                    comment: comment,
                    likes: 0,
                    likes_from_users: [],
                    creation_time: added_post_comment_data.comment.creation_time,
                    parent_id: parent_id,
                    reports_from_users: [],
                    level: added_post_comment_data.comment.level
                }

                // Stores The New State Of Updated Posts
                const updated_posts:Post[] = posts.map((one_post:Post) => {
                    if(one_post.id === post_id) {
                        const previous_post_comments:Comment[] = one_post.comments || [] // Gets The Previous Post Comments

                        return {
                            ...one_post,
                            comments: [...previous_post_comments, new_comment], // Returns The Combined Post Comments
                            comments_amount: (one_post.comments_amount || 0) + 1 // Increases The Comments Amount
                        }
                    }

                    return one_post // Returns The Unchanged Post
                })

                onPostsUpdate(updated_posts) // Sets The Posts
                setComment("") // Sets The Comment
            }
        }
        
        catch {
            Alert.alert("Chyba", "Pri pridávaní komentáru došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Toggle Follow
    const toggleFollow = async (user_to_follow_id:number|null, action:string):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Sledovanie nie je možné zmeniť bez prihlásenia.") // Shows The Alert
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
                Alert.alert("Chyba", "Pri zmene sledovania došlo k chybe.") // Shows The Alert
                return
            }

            const toggle_follow_data:BasicResponse = await toggle_follow_response.json() // Gets The Toggle Follow Data

            // If The Response Isn't Success
            if(!toggle_follow_data.success) {
                Alert.alert("Chyba", toggle_follow_data.message) // Shows The Alert
                return
            }
            
            else {
                // Stores The New State Of Updated Posts
                const updated_posts:Post[] = posts.map((one_post:Post) => {
                    if(one_post.user.id === user_to_follow_id) {
                        // Updates The Has Follow And Has Pending Follow Request
                        return {
                            ...one_post,
                            user: {
                                ...one_post.user,
                                has_follow: action === "follow", 
                                has_pending_follow_request: action === "send_follow_request"
                            }
                        }
                    }

                    return one_post // Returns The Unchanged Post
                })

                onPostsUpdate(updated_posts) // Sets The Posts

                Alert.alert("Úspech", toggle_follow_data.message) // Shows The Alert
            }
        }

        catch {
            Alert.alert("Chyba", "Pri zmene sledovania došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Change The Active Post Media
    const changePostMedia = (post_id:number, new_index:number, max_index:number):void => {
        if(new_index >= 0 && new_index <= max_index) {
            // Sets The Active Post Media
            setActivePostMedia(previous_active_post_media => ({
                ...previous_active_post_media,
                [post_id]: new_index // Sets The New Active Index For The Post
            }))

            setPlayingVideo(null) // Sets The Playing Video
        }
    }

    // Function For Handle The Video Duration Load
    const handleVideoDurationLoad = (video_duration:number, post_id:number, post_media_id:number):void => {
        // Stores The New State Of Updated Posts
        const updated_posts:Post[] = posts.map((one_post:Post) => {
            if(one_post.id === post_id) {
                return {
                    ...one_post,

                    media: one_post.media.map((one_post_media:Media) => {
                        if(one_post_media.id === post_media_id) {
                            return {
                                ...one_post_media,
                                video_duration: video_duration // Sets The Video Duration
                            }
                        }

                        return one_post_media // Returns The Unchanged Post Media
                    })
                }
            }

            return one_post // Returns The Unchanged Post
        })

        onPostsUpdate(updated_posts) // Sets The Posts
    }

    const active_post_media_index:number = active_post_media[post.id] || 0 // Sets The Active Post Media Index
    const max_active_post_media_index:number = post.media.length - 1 // Sets The Maximum Active Post Media Index

    // Creates The Swipe Gesture
    const swipe_gesture = Gesture.Pan()
        .runOnJS(true)

        .onEnd((event) => {
            if(is_volume_slider_sliding.current) return // Do Nothing If The Volume Slider Is Sliding
            if(event.translationX < -50) changePostMedia(post.id, active_post_media_index + 1, max_active_post_media_index) // Shows The Next Post Media
            else if (event.translationX > 50) changePostMedia(post.id, active_post_media_index - 1, max_active_post_media_index) // Shows The Previous Post Media
        })

    // Function For Handle Open Maps
    const handleOpenMaps = async () => {
        if(!post.coordinates?.latitude || !post.coordinates?.longitude) {
            Alert.alert("Upozornenie", "Presné súradnice tohto miesta nie sú k dispozícii.");
            return
        }
    
        const { latitude, longitude } = post.coordinates // Gets The Latitude And Longitude
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
        <View className="post_container" key={post.id} style={styles.post_container}>
            <View className="header" style={styles.header}>
                <View className="left">
                    <ProfilePictureLink 
                        user_id={post.user.id} 
                        user_profile_picture_name={post.user.profile_picture_name || null} 
                        user_subscription={post.user.subscription?.is_active || false} 
                        label="Zobraziť užívateľa" 
                        width={45} 
                        height={45} 
                    />
                </View>

                <View className="right" style={styles.right}>
                    <View className="top" style={styles.top}>
                        <Text className="username" style={styles.username}>{post.user.username}</Text>

                        <View className="followers_container" style={styles.followers_container}>
                            <Text className="followers" style={styles.followers}>{post.user.followers.length}</Text>
                            <Icon icon_name="user" />
                        </View>

                        {logged_in_user && logged_in_user.id !== post.user.id && (
                            <Pressable
                                className="follow_button" 
                                onPress={() => toggleFollow(post.user.id, getFollowButtonProperties(post.user.private_account, post.user.has_follow, post.user.has_pending_follow_request).action)}

                                style={[
                                    styles.follow_button, 
                                    { outlineStyle: "none" } as any
                                ]}
                            >
                                <Text style={{ color: SECONDARY_COLOR }}>{getFollowButtonProperties(post.user.private_account, post.user.has_follow, post.user.has_pending_follow_request).text}</Text>
                            </Pressable>
                        )}

                        <View className="show_post_properties_button" accessibilityLabel="Viac...">
                            <Icon
                                icon_name="ellipsis-vertical"
                                onPress={() => onShowPostProperties(post)}
                            />
                        </View>
                    </View>

                    <View className="bottom" style={styles.bottom}>
                        {post.location && (
                            post.coordinates ? (
                                <Pressable
                                    className="location"
                                    onPress={handleOpenMaps}
                                    accessibilityRole="button"
                                    accessibilityLabel="Otvoriť mapy" 
                                    style={styles.location}
                                >
                                    <Text numberOfLines={1} ellipsizeMode="tail">
                                        {post.location.split("<span></span>").filter(Boolean).map((one_part:string, index:number) => (
                                            <Text key={index}>
                                                <Text style={{ color: LIGHT_BLUE_COLOR }}>{one_part.trim()}</Text>

                                                {post.location && index < post.location.split("<span></span>").filter(Boolean).length - 1 && (
                                                    <Text style={{ color: LIGHT_BLUE_COLOR }}> • </Text>
                                                )}
                                            </Text>
                                        ))}
                                    </Text>
                                </Pressable>
                            ) : (
                                <Text className="location" numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1, color: LIGHT_BLUE_COLOR }}>{post.location}</Text>
                            )
                        )}

                        <Text className="created_at" style={styles.created_at}>{getTimeAgo(post.created_at)}</Text>
                    </View>
                </View>
            </View>

            <GestureDetector gesture={swipe_gesture}>
                <View className="media" style={styles.media}>
                    {post.media.map((one_post_media:Media, index:number) => (
                        <View 
                            className="one_post" 
                            key={one_post_media.id || index} 

                            style={[
                                styles.one_post, 
                                { display: index === active_post_media_index ? "flex" : "none" }
                            ]}
                        >
                            {are_posts_loading && (
                                <BlurView intensity={40} tint="dark" style={styles.loading}>
                                    <ActivityIndicator size="small" color={SECONDARY_COLOR} />
                                    {/* <Text style={{ marginTop: 10, color: SECONDARY_COLOR }}>Načítavam...</Text> */}
                                </BlurView>
                            )}

                            {!one_post_media.is_video && (
                                <View className="image">
                                    <DynamicImage 
                                        key={one_post_media.id || index}
                                        uri={`${DOMAIN}/media/${one_post_media.file}`} 
                                    />
                                </View>
                            )}

                            {one_post_media.is_video && (
                                <DynamicVideo 
                                    one_post={post}
                                    one_post_media={one_post_media}
                                    playing_video={playing_video}
                                    setPlayingVideo={setPlayingVideo}
                                    data_saving_mode={logged_in_user && logged_in_user.data_saving_mode ? logged_in_user.data_saving_mode : false}
                                    is_volume_slider_sliding={is_volume_slider_sliding}
                                    onVideoDurationLoad={(video_duration:number) => handleVideoDurationLoad(video_duration, post.id, one_post_media.id)}
                                />
                            )}
                        </View>
                    ))}

                    <View className="particles" style={styles.particles}></View>

                    <View 
                        className="post_bars"

                        style={[
                            styles.post_bars,
                            post.media.length === 0 && { display: "none" }
                        ]}
                    >
                        {post.media.length > 1 && (
                            post.media.map((one_post_media:Media, index:number) => (
                                <Pressable 
                                    key={index} 
                                    className="bar" 
                                    onPress={() => changePostMedia(post.id, index, max_active_post_media_index)}

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

            <View className="video_scrubber_preview" style={styles.video_scrubber_preview}>
                <View className="triangle" style={styles.triangle}></View>
            </View>

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
                            onPress={() => togglePostLike(post.id)}
                            is_regular={!Boolean(logged_in_user && post.likes_from_users.includes(logged_in_user.id))} // Shows The Empty Or Filled Heart Icon
                            color={Boolean(logged_in_user && post.likes_from_users.includes(logged_in_user.id)) ? RED_COLOR : BLUE_COLOR} // Shows The Red Or Blue Colored Heart Icon
                            pressed_color={RED_COLOR}
                        />

                        {particles.map((one_particle:Particle) => (
                            <HeartParticle
                                key={one_particle.id}
                                x={one_particle.x}
                                y={one_particle.y}
                                is_regular={one_particle.is_regular}
                                onComplete={() => removeParticle(one_particle.id)}
                            />
                        ))}
                    </View>

                    {logged_in_user && post.hide_likes && post.user.id !== logged_in_user.id 
                    ? (<Text className="hidden_likes_counter" style={styles.hidden_likes_counter}>Skryté</Text>)
                    : (<Text className="likes_counter" style={styles.society_likes_counter}>{String(post.likes)}</Text>)}
                </View>

                <View 
                    className="comments" 
                    accessibilityLabel="Komentáre..."
                    style={styles.comments}
                >
                    <Icon
                        icon_name="comment"
                        onPress={() => toggleShowComments(post)}
                        size={25}
                        is_regular={true}
                    />

                    {post.allow_comments 
                    ? (<Text className="comments_counter" style={styles.comments_counter}>{String(post.comments_amount)}</Text>)
                    : (<Text className="hidden_comments_counter" style={styles.hidden_comments_counter}>Vypnuté</Text>)}
                </View>

                <View className="share" accessibilityLabel="Zdielať...">
                    <Icon
                        icon_name="share-nodes"
                        onPress={() => sharePost(post.id, post.user.username)}
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

                    <Text className="views_counter" style={styles.views_counter}>{String(post.views)}</Text>
                </View>

                {logged_in_user && post.user.id === logged_in_user.id && (() => {
                    const current_media:Media = post.media[active_post_media_index] ?? post.media[0] // Gets The Current Media
                    if(!current_media) return null

                    const is_video:boolean = current_media.is_video === true // Gets The Information If The Media Is Video
                    const has_metrics:boolean = current_media.average_watch_time !== null && current_media.video_views !== null // Gets The Information If The Media Has Metrics

                    if(!is_video || !has_metrics) return null

                    return (
                        <View key={current_media.id || active_post_media_index}>
                            <View className="show_video_metrics" accessibilityLabel="Štatistiky...">
                                <Icon
                                    icon_name="chart-simple"
                                    onPress={() => setIsVideoMetricsOpen(previous => !previous)}
                                    size={25}
                                />
                            </View>
                        </View>
                    )
                })()}

                <View className={logged_in_user && logged_in_user.saved_posts.includes(post.id) ? "save active" : "save"} accessibilityLabel="Uložiť...">
                    <View className="save" accessibilityLabel="Uložiť...">
                        <Icon
                            icon_name="bookmark"
                            onPress={() => togglePostSave(post.id)}
                            size={25}
                            is_regular={logged_in_user && logged_in_user.saved_posts.includes(post.id) ? false : true} // Shows The Empty Or Filled Bookmark Icon
                            color={logged_in_user && logged_in_user.saved_posts.includes(post.id) ? YELLOW_COLOR : BLUE_COLOR}
                            pressed_color={logged_in_user && logged_in_user.saved_posts.includes(post.id) ? YELLOW_COLOR : DARK_BLUE_COLOR}
                        />
                    </View>
                </View>
            </View>

            {post.description && (
                <Text className="description" style={styles.description}>
                {post.tagged_users.map(one_tagged_user => one_tagged_user.username).length > 0 || post.added_hashtags.length > 0 
                ? (generateStyledDescription(post.description, JSON.stringify(post.tagged_users.map(one_tagged_user => one_tagged_user.username)), JSON.stringify(post.added_hashtags))) // Generates The Styled Description
                : (post.description)}
                </Text>
            )}

            {logged_in_user && post.user.id === logged_in_user.id && (() => {
                const current_media:Media = post.media[active_post_media_index] || post.media[0] // Gets The Current Media
                if(!current_media) return null

                const is_video:boolean = current_media.is_video === true // Gets The Information If The Media Is Video
                const has_metrics:boolean = current_media.average_watch_time !== null && current_media.video_views !== null // Gets The Information If The Media Has Metrics

                if(!is_video || !has_metrics) return null

                return (
                    <View key={current_media.id || active_post_media_index}>
                        <VideoMetrics
                            one_post_media={current_media}
                            is_video_metrics_open={is_video_metrics_open}
                        />
                    </View>
                )
            })()}

            {post.allow_comments && post.comments && is_comment_forum_open && (
                <View className="comment_forum" style={styles.comment_forum}>
                    <ScrollView 
                        className="all_comments" 
                        showsVerticalScrollIndicator={false}
                        indicatorStyle="white"
                        style={styles.all_comments}
                    >
                        {/* Loads The Comments */}
                        {post.comments.length > 0 && loadComments(post.comments)}

                        {has_next_post_comments && (
                            <Pressable 
                                className="show_more hidden" 
                                onPress={() => loadMorePostComments(post.id)} 
                                style={styles.show_more}
                            >
                                <Text style={{ color: LIGHT_BLUE_COLOR }}>Zobraziť viac</Text>
                            </Pressable>
                        )}
                    </ScrollView>

                    <View className="write_comment_form" style={styles.write_comment_form}>
                        <TextInput
                            className="comment"
                            textAlignVertical="top" 
                            placeholder="Napísať komentár" 
                            placeholderTextColor={LIGHT_BLUE_COLOR}
                            accessibilityLabel="Napísať komentár" 
                            value={comment}
                            onChangeText={setComment}
                            maxLength={MAX_COMMENT_LENGTH}

                            style={[
                                styles.write_comment_form_comment, 
                                { outlineStyle: "none" } as any
                            ]}
                        />

                        {logged_in_user && (
                            <View 
                                style={{ 
                                    position: "absolute",
                                    top: 6,
                                    left: 6,
                                }}
                            >
                                <ProfilePictureLink user_id={logged_in_user.id} user_profile_picture_name={logged_in_user.profile_picture_name || null} user_subscription={logged_in_user.subscription?.is_active || false} label="Môj účet" />
                            </View>
                        )}

                        <View 
                            className="add_emoji"
                            accessibilityLabel="Pridať emoji"
                            style={styles.add_emoji}
                        >
                            <Icon 
                                icon_name="face-surprise"
                                is_regular={true}
                                onPress={() => setIsEmojiPickerOpen(true)}
                            />
                        </View>

                        <EmojiPicker
                            onEmojiSelected={handleEmojiSelect}
                            open={is_emoji_picker_open}
                            onClose={() => setIsEmojiPickerOpen(false)}

                            translation={{
                                smileys_emotion: "Smajlíky",
                                people_body: "Ľudia", 
                                recently_used: "Naposledy použité",
                                animals_nature: "Zvieratá",
                                food_drink: "Jedlo a nápoje",
                                activities: "Aktivity",
                                travel_places: "Cestovanie",
                                objects: "Predmety",
                                symbols: "Symboly",
                                flags: "Vlajky",
                                search: "Hľadať...",
                            }}
                        />

                        <Pressable 
                            className="send" 
                            accessibilityLabel="Odoslať komentár"
                            accessibilityRole="button"
                            onPress={() => addComment(post.id, comment, null)}
                            style={styles.send}
                        >
                            <Svg 
                                width={30} 
                                height={30} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                strokeWidth={1.5} 
                                stroke={BLUE_COLOR}
                            >
                                <Path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" 
                                />
                            </Svg>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    post_container: {
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

    follow_button: {
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

    one_post: {
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

    loading: {
        ...StyleSheet.absoluteFill,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
    },

    comment_preview: {
        position: "absolute",
        bottom: 22 + 10,
        left: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        opacity: 0.5,
        userSelect: "none",
        // animation: beep 5s ease-out alternate infinite;

        // .username,
        // .comment {
        //     font-size: 0.8em;
        // }
    },

    comment: {
        // @include crop_text;
        maxWidth: 100,
        marginLeft: 5,
    },

    likes: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 20,
        marginLeft: 5,

        // .fa-heart {
        //     display: block;
        //     color: $red-color;
        // }
    },

    likes_counter: {
        color: "#999999",
    },

    particles: {
        position: "absolute",
        bottom: 0,
        left: 0,
    },

    one_particle: {
        position: "absolute",
        bottom: 10,
        left: 10,
        // font-size: 1.2em;
        // color: $red-color;
        pointerEvents: "none",
        userSelect: "none",
        // animation: flyFadeOut 1s ease-out forwards;
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

    video_scrubber_preview: {
        position: "absolute",
        transform: [{ translateX: "-50%" }],
        display: "none",
        width: 160,
        height: 90,
        borderWidth: 1,
        borderColor: "#cccccc",
        borderRadius: SMALL_BORDER_RADIUS,
        opacity: 0.9,
        zIndex: 200,
    },

    triangle: {
        position: "absolute",
        bottom: -18,
        left: "50%",
        transform: [{ translateX: "-50%" }],
        width: 0,
        height: 0,
        borderTopWidth: 10,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopColor: "#cccccc",
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

    hidden_likes_counter: {
        color: BLUE_COLOR,
        fontSize: 15,
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

    comment_forum: {
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: "#333333"

        // &.hidden {
        //     display: none;
        //     opacity: 0;
        // }
    },

    all_comments: {
        // @include scrollbar;
        maxHeight: 300,
        paddingTop: 10
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

    one_comment: {
        position: "relative",
        marginBottom: 10,

        // &:last-child {
        //     margin-bottom: 20px;
        // }
    },

    comment_leading_line_vertical: {
        position: "absolute",
        top: 38,
        left: 6 + 38 / 2,
        width: 1,
        // height: calc(100% - 38px);
        height: "100%",
        backgroundColor: "#333333",
    },

    comment_container: {
        marginLeft: 6,
    },

    user: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    likes_container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    
    profile_picture: {
        width: 16,
        height: 16,
        borderRadius: "50%",
        opacity: 0.8,
    },

    comment_likes: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 20,
    },

    comment_likes_counter: {
        color: BLUE_COLOR,
    },

    interactions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginLeft: 6 + 10 + 38,
        paddingRight: 10,
    },

    date: {
        marginLeft: "auto",
    },

    date_text: {
        fontSize: 15,
        fontStyle: "italic",
        color: LIGHT_BLUE_COLOR,
    },

    reply_container: {
        position: "relative",
        marginTop: 10,
        marginLeft: 6 + 10 + 32,
        marginRight: 10,

        // &.hidden {
        //     display: none;
        // }
    },

    reply_leading_line_vertical: {
        position: "absolute",
        top: 0,
        bottom: 82,
        left: 6 + 32 / 2,
        width: 1,
        backgroundColor: "#333333",
    },

    one_reply: {
        // &::before {
        //     display: none;
        // }

        // &.first_level_reply {
        //     > .comment_container {
        //         &::before {
        //             left: -15px;
        //             width: 15px;
        //         }

        //         &::after {
        //             left: -29px;
        //         }
        //     }
        // }
    },

    reply_leading_line_vertical_hidden: {
        position: "absolute",
        top: 103,
        left: 6 + 32 / 2,
        width: 1,
        height: 196,
        backgroundColor: "transparent",
    },

    reply_comment_container: {
        position: "relative",
    },

    reply_leading_line_horizontal: {
        position: "absolute",
        top: 32 / 2,
        left: -18,
        width: 18,
        height: 1,
        backgroundColor: "#333333",
    },

    reply_leading_line_rounded: {
        position: "absolute",
        top: 3,
        left: -32,
        width: 28 / 2,
        height: 28 / 2,
        borderBottomWidth: 1,
        borderBottomColor: "#333333",
        borderLeftWidth: 1,
        borderLeftColor: "#333333",
        borderBottomLeftRadius: MEDIUM_BORDER_RADIUS,
    },

    // .one_comment .comment_container .user a .profile_picture {
    //     width: 32px;
    //     height: 32px;
    // }

    show_more: {
        marginHorizontal: "auto",
        marginBottom: 10,
        color: LIGHT_BLUE_COLOR,

        // &.hidden {
        //     display: none;
        // }

        // &:hover,
        // &:active {
        //     text-decoration: underline;
        //     cursor: pointer;
        // }
    },

    write_comment_form: {
        position: "relative",
        marginTop: 8,
    },

    write_comment_form_comment: {
        width: "100%",
        minHeight: 50,
        // field-sizing: content;
        paddingVertical: 12,
        paddingRight: 30 + 10 + 10,
        paddingLeft: 38 + 6 + 10 + 15 + 10,
        textAlign: "left",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: padding 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

        // &:empty::before {
        //     content: attr(data-placeholder);
        //     color: $light-blue-color;
        //     cursor: text;
        // }

        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    add_emoji: {
        position: "absolute",
        top: 24,
        left: 6 + 38 + 10,
        transform: [{ translateY: "-50%" }],
    },

    send: {
        position: "absolute",
        top: "50%",
        right: 10,
        transform: [{ translateY: "-50%" }],
        width: 30,
        height: 30,
        color: BLUE_COLOR,
        // transition: transform 0.2s ease, color 0.3s ease;

        // &:hover {
        //     transform: translateY(-50%) scale(1.1);
        //     color: $dark-blue-color;
        //     cursor: pointer;
        // }
    },
})