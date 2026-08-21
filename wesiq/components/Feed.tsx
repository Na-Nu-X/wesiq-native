import React, { useState, useEffect, useRef } from "react"
import { View, StyleSheet, TextInput, Text, Alert, Pressable, Image, Share, Switch } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import Icon from "@/components/Icon"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import ProfilePictureLink from "./ProfilePictureLink"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import { getTimeAgo, getFormattedTime } from "@/utils/time"
import { FontAwesome6 } from "@expo/vector-icons"
import { Video, ResizeMode } from "expo-av"
import Slider from "@react-native-community/slider"
import Svg, { Path } from "react-native-svg"
import EmojiPicker from "rn-emoji-keyboard"
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet"

import type { LoggedInUser } from "./LoginFormDialog"
import { HeartParticle } from "./HeartParticle"
import { getFollowButtonProperties } from "./SearchUsers"

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

export interface User {
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
    },

    has_follow:boolean,
    has_pending_follow_request:boolean
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

    // Processing Posts
    original_filename?:string,
    original_size?:string,

    post?:{ 
        id:number 
    }
}

interface loadedPostCommentsResponse {
    success:boolean,
    has_next?:boolean,
    visible_comments:comment[],
    message:string
}

export interface comment {
    id:number,

    user:{
        id:number,
        first_name:string,
        last_name:string,
        username:string,
        profile_picture_name:string|null,

        subscription?:{
            is_active:boolean
        }
    },

    comment:string,
    likes:number,
    likes_from_users:number[],
    creation_time:string,
    parent_id?:number|null,
    reports_from_users?:number[],
    level:number
}

interface Particle {
    id:number,
    x:number,
    y:number,
    is_regular:boolean
}

export default function Feed() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    
    const [processing_posts, setProcessingPosts] = useState<Post[]>([]) // Stores The Processing Posts
    const [processing_post_report, setProcessingPostReport] = useState<string>("Čakajte! Príspevok sa spracováva.") // Stores The Processing Post Report Message

    const [posts, setPosts] = useState<Post[]>([]) // Stores The Posts
    const [page, setPage] = useState(1) // Stores The Current Page Number
    const [has_next, setHasNext] = useState(true) // Stores The Information If There Are More Posts Available
    const [are_posts_loading, setArePostsLoading] = useState(false) // Stores The Information If Posts Are Loading
    const [search_text, setSearchText] = useState("") // Stores The Search Text
    const post_properties = useRef<BottomSheet>(null) // Stores The Post Properties
    const [post_properties_sheet, setPostPropertiesSheet] = useState<"main"|"report"|"settings"|"delete">("main") // Stores The Active Post Properties Sheet
    const [selected_post, setSelectedPost] = useState<Post|null>(null) // Stores The Selected Post

    const [post_comments, setPostComments] = useState<comment[]>([]) // Stores The Post Comments
    const [post_comments_page, setPostCommentsPage] = useState(1) // Stores The Current Post Comments Page Number
    const [has_next_post_comments, setHasNextPostComments] = useState(true) // Stores The Information If There Are More Post Comments Available
    const [are_post_comments_loading, setArePostCommentsLoading] = useState(false) // Stores The Information If Post Comments Are Loading
    const [comment, setComment] = useState<string>("") // Stores The Written Comment
    const MAX_COMMENT_LENGTH:number = 100 // Sets The Maximum Comment Length
    const post_comment_properties = useRef<BottomSheet>(null) // Stores The Post Comment Properties
    const [post_comment_properties_sheet, setPostCommentPropertiesSheet] = useState<"main"|"report"|"delete">("main") // Stores The Active Post Comment Properties Sheet
    const [selected_post_comment, setSelectedPostComment] = useState<comment|null>(null) // Stores The Selected Post Comment

    const [volume, setVolume] = useState<number>(0) // Stores The Video Volume

    const [is_emoji_picker_open, setIsEmojiPickerOpen] = useState(false) // Stores The Information If The Emoji Picker Is Open

    const [particles, setParticles] = useState<Particle[]>([]) // Stores The Like Particles

    // Function For Get The Logged In User
    const getLoggedInUser = async () => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const logged_in_user_response:Response = await fetch(`${API_URL}/get-logged-in-user/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })
    
            const logged_in_user_data = await logged_in_user_response.json() // Gets The Logged In User Data

            if(logged_in_user_response.status === 401 || logged_in_user_data.code === "token_not_valid") {
                await AsyncStorage.removeItem("user_token") // Removes The User Token
                setLoggedInUser(null) // Removes The Logged In User
                return null
            }
    
            if(logged_in_user_data.success) {
                setLoggedInUser(logged_in_user_data.logged_in_user) // Sets The Logged In User
                return logged_in_user_data.logged_in_user
            } 
            
            else return null
    
        } 
        
        catch {
            return null
        }
    }

    // Initializes The Get Logged In User
    useEffect(() => {
        getLoggedInUser() // Gets The Logged In User
    }, [])

    // Function For Load Posts
    const loadPosts = async (page:number = 1, is_refresh:boolean = false) => {
        if(are_posts_loading || (!has_next && !is_refresh)) return

        setArePostsLoading(true) // Stores The Information That Posts Are Loading

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const loaded_posts_response:Response = await fetch(`${API_URL}/get-posts/?page=${page}&searched_text=${encodeURIComponent(search_text)}`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_posts_response.ok) {
                Alert.alert("Chyba", "Pri hľadaní príspevkov došlo k chybe.") // Shows The Alert
                return
            }

            const loaded_posts_data = await loaded_posts_response.json() // Gets The Loaded Posts Data

            // If The Response Isn't Success
            if(!loaded_posts_data.success) {
                Alert.alert("Chyba", loaded_posts_data.message) // Shows The Alert
                return
            }

            if(is_refresh) setPosts(loaded_posts_data.posts) // Sets The Posts
            
            else {
                setPosts(previous_posts => {
                    const existing_posts_ids:Set<number> = new Set(previous_posts.map(post => post.id)) // Gets The Existing Posts IDs
                    const new_posts:Post[] = (loaded_posts_data.posts as Post[]).filter(post => !existing_posts_ids.has(post.id)) // Gets The New Unique Posts
                
                    return [...previous_posts, ...new_posts] // Returns The Combined Posts
                })
            }
    
            setHasNext(loaded_posts_data.has_next) // Sets The Has Next
            setPage(page) // Sets The Page
        } 
        
        catch {
            Alert.alert("Chyba", "Pri hľadaní príspevkov došlo k chybe.") // Shows The Alert
        } 
        
        finally {
            // seenPostObserver(feed) // Initializes The Post Observation

            // feed_state.is_loading = false // Sets The Is Loading To False
            // const all_post_containers:NodeListOf<HTMLDivElement> = feed.querySelectorAll<HTMLDivElement>(".post_container") // Gets All Post Containers

            // if(all_post_containers.length === 0) {
            //     feed_report.textContent = gettext("Nenašli sa žiadne príspevky.")
            // }

            // else {
            //     if(search_bar && history_container && search_bar.value.trim() !== "") {
            //         storeSearchedPostToHistory(search_bar.value) // Stores The Searched Text To The Searched Posts History
            //         renderSearchedPostsHistory(history_container, search_bar) // Renders The Searched Posts History
            //     }
            // }

            setArePostsLoading(false) // Stores The Information That Posts Aren't Loading
        }
    }

    // Initializes The Posts Loading
    useEffect(() => {
        loadPosts(1, true) // Loads Posts
    }, [search_text])

    // Function For Load More Posts
    const loadMorePosts = () => {
        if(has_next && !are_posts_loading) loadPosts(page + 1) // Loads Posts
    }

    // Function For Get Post Comments
    const getPostComments = async (page:number = 1, is_refresh:boolean = false, post_id:number) => {
        if(are_post_comments_loading || (!has_next_post_comments && !is_refresh)) return

        setArePostCommentsLoading(true) // Stores The Information That Posts Are Loading

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const loaded_post_comments_response:Response = await fetch(`${API_URL}/get-post-comments/?post_id=${post_id}&page=${page}&searched_text=${encodeURIComponent(search_text)}`, {
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

            if(is_refresh) setPostComments(loaded_post_comments_data.visible_comments) // Sets The Post Comments
            
            else {
                // Sets The Post Comments
                setPostComments(previous_post_comments => {
                    const existing_posts_ids:Set<number> = new Set(previous_post_comments.map(post => post.id)) // Gets The Existing Post Comments IDs
                    const new_post_comments:comment[] = (loaded_post_comments_data.visible_comments as comment[]).filter(post => !existing_posts_ids.has(post.id)) // Gets The New Unique Post Comments
                
                    return [...previous_post_comments, ...new_post_comments] // Returns The Combined Post Comments
                })
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
        if(has_next_post_comments && !are_post_comments_loading) getPostComments(page + 1, false, post_id) // Loads Posts
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
    const loadComments = (post_comments:comment[]) => {
        return post_comments.map((one_post_comment:comment, index:number) => (
            <View className="one_comment" style={styles.one_comment}>
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
                                onPress={() => showPostCommentProperties(one_post_comment)}
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

        //     const post_id:number = Number(post_container.dataset["post_id"]) // Gets The Post ID
        //     const page:number = Number(all_comments.dataset["page"]) || 1 // Gets The Current Page Number
        //     const show_more:HTMLButtonElement = all_comments.querySelector(".show_more") as HTMLButtonElement // Gets The Show More Button

        //     try {
        //         const params:URLSearchParams = new URLSearchParams({
        //             page: String(page)
        //         })

        //         // Gets Full Loaded Posts Response
        //         const full_loaded_post_comments_response:Response = await fetch(`/api/load-post-comments/${post_id}?${params.toString()}`, {
        //             method: "GET",

        //             headers: {
        //                 "X-Requested-With": "XMLHttpRequest",
        //             }
        //         })

        //         // If The Response Isn't Success
        //         if(!full_loaded_post_comments_response.ok) {
        //             displayMessage("Pri hľadaní komentárov došlo k chybe.", "error") // Displays The Error Message
        //             return
        //         }

        //         const loaded_post_comments_response:loadedPostCommentsResponse = await full_loaded_post_comments_response.json() // Gets Loaded Posts Response

        //         // If The Response Isn't Success
        //         if(!loaded_post_comments_response.success) {
        //             displayMessage(loaded_post_comments_response.message, "error") // Displays The Error Message
        //             return
        //         }

        //         const all_comment_containers:NodeListOf<HTMLDivElement> = all_comments.querySelectorAll<HTMLDivElement>(".one_comment") // Gets All Post Containers

        //         // Gets Only The Posts Data Of Posts Which Aren't Already Rendered
        //         const no_already_rendered_post_comments_data:comment[] = loaded_post_comments_response.visible_comments.filter(function(one_loaded_post_comment:comment):boolean {
        //             return (
        //                 ![...all_comment_containers].some(function(one_comment_container:HTMLDivElement):boolean {
        //                     return one_loaded_post_comment.id === Number(one_comment_container.dataset["comment_id"]) // If The Post ID Is Equal To Data In The Rendered Post In The DOM
        //                 })
        //             )
        //         })

        //         no_already_rendered_post_comments_data.forEach(function(one_comment:comment):void {
        //             const data_saving_mode:boolean = post_container.dataset["data_saving_mode"] === "True" ? true : false // Gets The Value If The User Has Data Saving Mode Enabled
        //             const MAX_LOADED_COMMENTS:number = data_saving_mode ? 3 : 10 // Gets The Maximum Amount Of Loaded Comments

        //             if(all_comment_containers.length >= MAX_LOADED_COMMENTS && !show_more.classList.contains("hidden")) all_comments.insertBefore(createCommentHTML(feed, all_comments, one_comment, post_container, logged_in_user_id, logged_in_user_role), show_more) // Appends The Comment To The All Comments Container To The Bottom Position
        //             else all_comments.prepend(createCommentHTML(feed, all_comments, one_comment, post_container, logged_in_user_id, logged_in_user_role)) // Appends The Comment To The All Comments Container To The Top Position
        //         })

        //         all_comments.dataset["has_next"] = String(loaded_post_comments_response.has_next || false) // Sets The Has More Comments

        //         if(loaded_post_comments_response.has_next) {
        //             show_more.classList.remove("hidden") // Shows The Show More Button
        //             all_comments.dataset["page"] = String(Number(all_comments.dataset["page"]) + 1) // Increases And Updates The Stored Page
        //         }

        //         else show_more.classList.add("hidden") // Hides The Show More Button

        //         // Comment Preview
        //         const root_comments:comment[] = loaded_post_comments_response.visible_comments.filter(one_comment => one_comment.level === 1) // Gets Only Root Comments

        //         if(root_comments.length > 0) {
        //             const media:HTMLDivElement = post_container.querySelector(".media") as HTMLDivElement // Gets The Media Container
        //             const random_comment:comment = root_comments[Math.floor(Math.random() * root_comments.length)] as comment // Gets The Random Comment

        //             // Comment Preview
        //             const comment_preview:HTMLDivElement = document.createElement("div") // Creates The Comment Preview Container
        //             comment_preview.classList.add("comment_preview") // Adds The Comment Preview Class
        //             media.appendChild(comment_preview) // Appends The Comment Preview To The Media Container

        //             // Profile Picture
        //             const profile_picture:HTMLImageElement = document.createElement("img") // Creates The Profile Picture Image
        //             profile_picture.classList.add("profile_picture") // Adds The Profile Picture Class
        //             profile_picture.src = random_comment.user.profile_picture_name ? `/../media/images/${random_comment.user.id}/${random_comment.user.profile_picture_name}` : "/../static/images/profile_picture.png" // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
        //             profile_picture.alt = ""
        //             comment_preview.appendChild(profile_picture) // Appends The Profile Picture To The Comment Preview

        //             // Username
        //             const username:HTMLParagraphElement = document.createElement("p") // Creates The Username Paragraph
        //             username.classList.add("username") // Adds The Username Class
        //             username.textContent = random_comment.user.username // Adds The Username
        //             comment_preview.appendChild(username) // Appends The Username To The Comment Preview

        //             // Comment
        //             const comment:HTMLParagraphElement = document.createElement("p") // Creates The Comment Paragraph
        //             comment.classList.add("comment") // Adds The Username Class
        //             comment.textContent = random_comment.comment // Adds The Comment
        //             comment_preview.appendChild(comment) // Appends The Comment To The Comment Preview

        //             // Likes
        //             const likes:HTMLDivElement = document.createElement("div") // Creates The Likes Container
        //             likes.classList.add("likes") // Adds The Likes Class
        //             comment_preview.appendChild(likes) // Appends The Likes Container To The Comment Preview

        //             // Like Icon
        //             const like_icon:HTMLElement = document.createElement("i") // Creates The Like Icon
        //             like_icon.classList.add("fa-heart")
        //             logged_in_user_id && random_comment.likes_from_users.includes(logged_in_user_id) ? like_icon.classList.add("fa-solid") : like_icon.classList.add("fa-regular") // Shows The Empty Or Filled Heart Icon - https://fontawesome.com/icons/heart
        //             likes.appendChild(like_icon) // Appends The Like Icon To The Likes

        //             // Likes Counter
        //             const likes_counter:HTMLParagraphElement = document.createElement("p") // Creates The Likes Counter
        //             likes_counter.textContent = String(random_comment.likes) // Sets The Likes Counter
        //             likes.appendChild(likes_counter) // Appends The Likes Counter To The Likes
        //         }
        //     }
            
        //     catch {
        //         displayMessage("Pri hľadaní komentárov došlo k chybe.", "error") // Displays The Error Message
        //     }
    }

    // Function For Show The Post Properties
    const showPostProperties = (post:Post):void => {
        setSelectedPost(post) // Sets The Selected Post
        post_properties.current?.expand() // Shows The Post Properties
    }

    // Function For Close The Post Properties
    const hidePostProperties = ():void => {
        setSelectedPost(null) // Sets The Selected Post
        post_properties.current?.close() // Hides The Post Properties
    }

    // Function For Handle Post Properties Sheet Switching
    const handlePostPropertiesChanges = (index:number) => {
        if(index === -1) setPostPropertiesSheet("main") // Sets The Post Properties Sheet To Default
    }

    // Function For Show The Post Comment Properties
    const showPostCommentProperties = (comment:comment):void => {
        setSelectedPostComment(comment) // Sets The Selected Post Comment
        post_comment_properties.current?.expand() // Shows The Post Comment Properties
    }

    // Function For Close The Post Comment Properties
    const hidePostCommentProperties = ():void => {
        setSelectedPostComment(null) // Sets The Selected Post Comment
        post_comment_properties.current?.close() // Hides The Post Properties
    }

    // Function For Handle Post Comment Properties Sheet Switching
    const handlePostCommentPropertiesChanges = (index:number) => {
        if(index === -1) setPostCommentPropertiesSheet("main") // Sets The Post Comment Properties Sheet To Default
    }

    // Function For Toggle Post Like
    const togglePostLike = async (post_id:number):Promise<void> => {
        if(!logged_in_user) {
            Alert.alert("Chyba", "Označenie páči sa mi to nie je možné zmeniť bez prihlásenia.") // Shows The Alert
            return
        }

        try {
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

            const toggle_post_like_data = await toggle_post_like_response.json() // Gets The Toggle Post Like Data

            // If The Response Isn't Success
            if(!toggle_post_like_data.success) {
                Alert.alert("Chyba", toggle_post_like_data.message) // Shows The Alert
                return
            }
            
            else {
                // Sets The Posts
                setPosts(previous_posts => previous_posts.map((one_post:Post) => {
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
                }))
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

    // Function For Share The Post
    const sharePost = async (post_id:number, username:string):Promise<void> => {
        // const link:string = interpolate(gettext("/sk/prispevok/%s"), [post_id]) // Sets The Link To The Post
        const link: string = `${API_URL}/sk/prispevok/${post_id}` // Sets The Link To The Post
    
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
        if(!logged_in_user) {
            Alert.alert("Chyba", "Príspevok nie je možné uložiť bez prihlásenia.") // Shows The Alert
            return
        }

        try {
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

            const toggle_post_save_data = await toggle_post_save_response.json() // Gets The Toggle Post Save Data

            // If The Response Isn't Success
            if(!toggle_post_save_data.success) {
                Alert.alert("Chyba", toggle_post_save_data.message) // Shows The Alert
                return
            }
            
            else {
                // Sets The Logged In User
                setLoggedInUser((previous_user:LoggedInUser|null) => {
                    if(!previous_user) return null

                    const has_save:boolean = previous_user.saved_posts.includes(post_id) // Checks If The User Had Already Saved The Post
            
                    // Updates The Saved Posts
                    return {
                        ...previous_user,
                        saved_posts: has_save
                            ? previous_user.saved_posts.filter(id => id !== post_id) // Removes The Post From The Saved Posts
                            : [...previous_user.saved_posts, post_id] // Adds The Post To The Saved Posts
                    }
                })
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri zmene uloženia príspevku došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Report The Post
    const reportPost = async (post_id:number, reason:string) => {
        if(!logged_in_user) {
            Alert.alert("Chyba", "Nahlásenie nie je možné odoslať bez prihlásenia.") // Shows The Alert
            return
        }

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const reported_post_response:Response = await fetch(`${API_URL}/report-post/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    post_id: post_id,
                    reason: reason
                })
            })

            // If The Response Isn't Success
            if(!reported_post_response.ok) {
                Alert.alert("Chyba", "Pri odosielaní nahlásenia došlo k chybe.") // Shows The Alert
                return
            }

            const reported_post_data = await reported_post_response.json() // Gets The Reported Post Data

            // If The Response Isn't Success
            if(!reported_post_data.success) {
                Alert.alert("Chyba", reported_post_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert("Úspech", reported_post_data.message) // Shows The Alert
                hidePostProperties() // Closes The Post Properties
                return
            }
        }
        
        catch {
            Alert.alert("Chyba", "Pri odosielaní nahlásenia došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Edit The Post Settings
    const editPostSettings = async (post_id:number, setting:string, action:boolean):Promise<void> => {
        if(!logged_in_user) {
            Alert.alert("Chyba", "Príspevok nie je možné upraviť bez prihlásenia.") // Shows The Alert
            return
        }

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const edited_post_settings_response:Response = await fetch(`${API_URL}/edit-post-settings/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    post_id: post_id,
                    setting: setting,
                    action: action
                })
            })

            // If The Response Isn't Success
            if(!edited_post_settings_response.ok) {
                Alert.alert("Chyba", "Pri úprave príspevku došlo k chybe.") // Shows The Alert
                return
            }

            const edited_post_settings_data = await edited_post_settings_response.json() // Gets The Edited Post Settings Data

            // If The Response Isn't Success
            if(!edited_post_settings_data.success) {
                Alert.alert("Chyba", edited_post_settings_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert("Úspech", edited_post_settings_data.message) // Shows The Alert

                // Sets The Posts
                setPosts(previous_posts => previous_posts.map(one_post => one_post.id === post_id
                    ? { ...one_post, [setting]: action } 
                    : one_post)
                )

                setSelectedPost(previous_selected_post => previous_selected_post ? { ...previous_selected_post, [setting]: action } : null) // Sets The Selected Post

                return
            }
        }
        
        catch {
            Alert.alert("Chyba", "Pri úprave príspevku došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Delete The Post
    const deletePost = async (post_id:number):Promise<void> => {
        if(!logged_in_user) {
            Alert.alert("Chyba", "Príspevok nie je možné odstrániť bez prihlásenia.") // Shows The Alert
            return
        }

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const deleted_post_response:Response = await fetch(`${API_URL}/delete-post/`, {
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
            if(!deleted_post_response.ok) {
                Alert.alert("Chyba", "Pri odstraňovaní príspevku došlo k chybe.") // Shows The Alert
                return
            }

            const deleted_post_data = await deleted_post_response.json() // Gets The Deleted Post Data

            // If The Response Isn't Success
            if(!deleted_post_data.success) {
                Alert.alert("Chyba", deleted_post_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert("Úspech", deleted_post_data.message) // Shows The Alert

                // // Gets All Processing Posts From The Local Storage
                // const processing_posts:compressTask[] = JSON.parse(localStorage.getItem("processing_posts") || "[]") // Gets The Processing Posts From The Local Storage

                // // Removes All Tasks For The Current Processing Post From The Local Storage
                // const remaining_processing_posts:compressTask[]|[] = processing_posts.filter(function(one_task:compressTask):boolean {
                //     return one_task.post_id !== id
                // })

                // localStorage.setItem("processing_posts", JSON.stringify(remaining_processing_posts)) // Saves Updated Processing Posts To The Local Storage

                setPosts(previous_posts => previous_posts.filter((one_post:Post) => one_post.id !== post_id)) // Sets The Posts
                setSelectedPost(null) // Sets The Selected Post
                hidePostProperties() // Closes The Post Properties

                return
            }
        }
        
        catch {
            Alert.alert("Chyba", "Pri odstraňovaní príspevku došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Toggle Post Comment Like
    const togglePostCommentLike = async (comment_id:number):Promise<void> => {
        if(!logged_in_user) {
            Alert.alert("Chyba", "Označenie páči sa mi to nie je možné zmeniť bez prihlásenia.") // Shows The Alert
            return
        }

        try {
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

            const toggle_post_comment_like_data = await toggle_post_comment_like_response.json() // Gets The Toggle Post Comment Like Data

            // If The Response Isn't Success
            if(!toggle_post_comment_like_data.success) {
                Alert.alert("Chyba", toggle_post_comment_like_data.message) // Shows The Alert
                return
            }
            
            else {
                // Sets The Post Comments
                setPostComments(previous_post_comments => previous_post_comments.map((one_post_comment:comment) => {
                    if(one_post_comment.id === comment_id) {
                        const has_like:boolean = one_post_comment.likes_from_users.includes(logged_in_user.id) // Checks If The User Had Already Liked The Post
                        
                        // Updates The Post Likes Amount And Stored Likes From Users
                        return {
                            ...one_post_comment,
                            likes: has_like ? one_post_comment.likes - 1 : one_post_comment.likes + 1,
                            likes_from_users: has_like 
                                ? one_post_comment.likes_from_users.filter(id => id !== logged_in_user.id) 
                                : [...one_post_comment.likes_from_users, logged_in_user.id]
                        }
                    }
                
                    return one_post_comment // Returns The Unchanged Post Comment
                }))
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri zmene označenia páči sa mi to došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Report The Comment
    const reportComment = async (comment_id:number, reason:string) => {
        if(!logged_in_user) {
            Alert.alert("Chyba", "Nahlásenie nie je možné odoslať bez prihlásenia.") // Shows The Alert
            return
        }

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const reported_post_comment_response:Response = await fetch(`${API_URL}/report-post-comment/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    comment_id: comment_id,
                    reason: reason
                })
            })

            // If The Response Isn't Success
            if(!reported_post_comment_response.ok) {
                Alert.alert("Chyba", "Pri odosielaní nahlásenia došlo k chybe.") // Shows The Alert
                return
            }

            const reported_post_comment_data = await reported_post_comment_response.json() // Gets The Reported Post Comment Data

            // If The Response Isn't Success
            if(!reported_post_comment_data.success) {
                Alert.alert("Chyba", reported_post_comment_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert("Úspech", reported_post_comment_data.message) // Shows The Alert
                hidePostCommentProperties() // Closes The Post Comment Properties
                return
            }
        }
        
        catch {
            Alert.alert("Chyba", "Pri odosielaní nahlásenia došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Delete The Comment
    const deleteComment = async (comment_id:number):Promise<void> => {
        if(!logged_in_user) {
            Alert.alert("Chyba", "Komentár nie je možné odstrániť bez prihlásenia.") // Shows The Alert
            return
        }

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const deleted_post_comment_response:Response = await fetch(`${API_URL}/delete-post-comment/`, {
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
            if(!deleted_post_comment_response.ok) {
                Alert.alert("Chyba", "Pri odstraňovaní komentáru došlo k chybe.") // Shows The Alert
                return
            }

            const deleted_post_comment_data = await deleted_post_comment_response.json() // Gets The Deleted Post Comment Data

            // If The Response Isn't Success
            if(!deleted_post_comment_data.success) {
                Alert.alert("Chyba", deleted_post_comment_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert("Úspech", deleted_post_comment_data.message) // Shows The Alert

                setPostComments(previous_post_comments => previous_post_comments.filter((one_post_comment:comment) => one_post_comment.id !== comment_id)) // Sets The Post Comments
                setSelectedPostComment(null) // Sets The Selected Post Comment
                hidePostCommentProperties() // Closes The Post Comment Properties
                // if(reply_container && reply_container.children.length === 0) deleteShowRepliesIcon(reply_container) // Deletes The Show Replies Icon From The Comment If There Aren't Any Replies Left

                return
            }
        }
        
        catch {
            Alert.alert("Chyba", "Pri odstraňovaní komentáru došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Add Comment
    const addComment = async (post_id:number, comment:string, parent_id:number|null):Promise<void> => {
        if(!logged_in_user) {
            Alert.alert("Chyba", "Komentár nie je možné pridať bez prihlásenia.") // Shows The Alert
            return
        }

        try {
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

            const added_post_comment_data = await added_post_comment_response.json() // Gets The Added Post Comment Data

            // If The Response Isn't Success
            if(!added_post_comment_data.success) {
                Alert.alert("Chyba", added_post_comment_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert("Úspech", added_post_comment_data.message) // Shows The Alert

                // Stores The New Comment Data
                const new_comment:comment = {
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
                    creation_time: added_post_comment_data.creation_time,
                    parent_id: parent_id,
                    reports_from_users: [],
                    level: added_post_comment_data.level
                }

                // Sets The Post Comments
                setPostComments(previous_post_comments => {
                    return [...previous_post_comments, new_comment] // Returns The Combined Post Comments
                })

                setComment("") // Sets The Comment
            }
        }
        
        catch {
            Alert.alert("Chyba", "Pri pridávaní komentáru došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Toggle Follow
    const toggleFollow = async (user_to_follow_id:number|null, action:string):Promise<void> => {
        if(!logged_in_user) {
            Alert.alert("Chyba", "Sledovanie nie je možné zmeniť bez prihlásenia.") // Shows The Alert
            return
        }

        try {
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

            const toggle_follow_data = await toggle_follow_response.json() // Gets The Toggle Follow Data

            // If The Response Isn't Success
            if(!toggle_follow_data.success) {
                Alert.alert("Chyba", toggle_follow_data.message) // Shows The Alert
                return
            }
            
            else {
                // Sets The Posts
                setPosts(previous_posts => previous_posts.map((one_post:Post) => {
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
                }))

                Alert.alert("Úspech", toggle_follow_data.message) // Shows The Alert
            }
        }

        catch {
            Alert.alert("Chyba", "Pri zmene sledovania došlo k chybe.") // Shows The Alert
        }
    }

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
                    <View className="processing_post_container" key={one_processing_post.id}>
                        <Text className="processing_post_report">{processing_post_report}</Text>

                        <View className="processing_media_info_container">
                            <Text className="processing_media_info">
                                Súbory:{" "}
                                
                                {one_processing_post.media.map((one_post_media:Media, index) => {
                                    if(one_post_media.post && one_processing_post.id === one_post_media.post.id) {
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
                                <ProfilePictureLink user_id={one_processing_post.user.id} user_profile_picture_name={one_processing_post.user.profile_picture_name || null} user_subscription={one_processing_post.user.subscription?.is_active || false} label="Zobraziť užívateľa" />
                            </View>

                            <View className="right">
                                <View className="top">
                                    <Text className="username">{one_processing_post.user.username}</Text>

                                    <View className="followers_container">
                                        <Text className="followers">{one_processing_post.user.followers.length}</Text>
                                        <Icon icon_name="user" />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                ))
            )}

            {posts.length > 0 && (
                posts.map((one_post:Post) => (
                    <View className="post_container" key={one_post.id} style={styles.post_container}>
                        <View className="header" style={styles.header}>
                            <View className="left">
                                <ProfilePictureLink user_id={one_post.user.id} user_profile_picture_name={one_post.user.profile_picture_name || null} user_subscription={one_post.user.subscription?.is_active || false} label="Zobraziť užívateľa" width={45} height={45} />
                            </View>

                            <View className="right" style={styles.right}>
                                <View className="top" style={styles.top}>
                                    <Text className="username" style={styles.username}>{one_post.user.username}</Text>

                                    <View className="followers_container" style={styles.followers_container}>
                                        <Text className="followers" style={styles.followers}>{one_post.user.followers.length}</Text>
                                        <Icon icon_name="user" />
                                    </View>

                                    {logged_in_user && logged_in_user.id !== one_post.user.id && (
                                        <Pressable
                                            className="follow_button" 
                                            onPress={() => toggleFollow(one_post.user.id, getFollowButtonProperties(one_post.user.private_account, one_post.user.has_follow, one_post.user.has_pending_follow_request).action)}

                                            style={[
                                                styles.follow_button, 
                                                { outlineStyle: "none" } as any
                                            ]}
                                        >
                                            <Text style={{ color: SECONDARY_COLOR }}>{getFollowButtonProperties(one_post.user.private_account, one_post.user.has_follow, one_post.user.has_pending_follow_request).text}</Text>
                                        </Pressable>
                                    )}

                                    <View className="show_post_properties_button" accessibilityLabel="Viac...">
                                        <Icon
                                            icon_name="ellipsis-vertical"
                                            onPress={() => showPostProperties(one_post)}
                                        />
                                    </View>
                                </View>

                                <View className="bottom" style={styles.bottom}>
                                    {one_post.location && (
                                        one_post.coordinates ? (
                                            <Pressable
                                                className="location"
                                                // onPress={handleOpenMaps}
                                                accessibilityRole="button"
                                                accessibilityLabel="Otvoriť mapy" 
                                                style={styles.location}
                                            >
                                                <Text numberOfLines={1}>
                                                    {one_post.location.split("<span></span>").filter(Boolean).map((one_part:string, index:number) => (
                                                        <>
                                                            <Text style={{ color: LIGHT_BLUE_COLOR }}>{one_part.trim()}</Text>

                                                            {one_post.location && index < one_post.location.split("<span></span>").filter(Boolean).length - 1 && (
                                                                <Text style={{ color: LIGHT_BLUE_COLOR }}> • </Text>
                                                            )}
                                                        </>
                                                    ))}
                                                </Text>
                                            </Pressable>
                                        ) : (
                                            <Text className="location" numberOfLines={1} style={{ flex: 1 }}>{one_post.location}</Text>
                                        )
                                    )}

                                    <Text className="created_at" style={styles.created_at}>{getTimeAgo(one_post.created_at)}</Text>
                                </View>
                            </View>
                        </View>

                        <View className="media" style={styles.media}>
                            {one_post.media.map((one_post_media:Media, index:number) => (
                                <View 
                                    className="one_post" 
                                    key={one_post_media.id || index} 

                                    style={[
                                        styles.one_post, 
                                        { display: index === 0 ? "flex" : "none" }
                                    ]}
                                >
                                    <View className="loading hidden" style={styles.loading}>
                                        <Text>Načítavam...</Text>
                                    </View>

                                    <View className="previous hidden" style={styles.previous}>
                                        <Icon
                                            icon_name="angle-left"
                                            // onPress={}
                                        />
                                    </View>

                                    <View className="next hidden" style={styles.next}>
                                        <Icon
                                            icon_name="angle-right"
                                            // onPress={}
                                        />
                                    </View>

                                    {!one_post_media.is_video && (
                                        <Image 
                                            className="image"
                                            source={{ uri: `https://wesiq.com/media/${one_post_media.file}` }}
                                            style={{ width: "100%", aspectRatio: 16 / 9, resizeMode: "cover" }}
                                        />
                                    )}

                                    {one_post_media.is_video && (
                                        <View className="video_container" style={styles.video_container}>
                                            <View className="play_pause_indicator hidden" style={styles.play_pause_indicator}>
                                                <FontAwesome6
                                                    name="pause"
                                                    size={40}
                                                    color={LIGHT_BLUE_COLOR}
                                                    style={{
                                                        position: "absolute",
                                                        top: "50%",
                                                        left: "50%",

                                                        transform: [
                                                            { translateX: "-50%" },
                                                            { translateY: "-50%" }
                                                        ],
                                                    }}
                                                />
                                            </View>

                                            <View className="step_back_indicator hidden" style={styles.step_back_indicator}>
                                                <FontAwesome6
                                                    name="angle-left"
                                                    size={40}
                                                    color={LIGHT_BLUE_COLOR}
                                                    // style={{ transition: opacity 0.5s ease, transform 0.2s ease-out; }}
                                                />

                                                <Text style={{ fontSize: 25 }}>-5</Text> {/* transition: opacity 0.3s ease, transform 0.3s ease-out */}
                                            </View>

                                            <View className="step_further_indicator hidden" style={styles.step_further_indicator}>
                                                <Text style={{ fontSize: 25 }}>+5</Text> {/* transition: opacity 0.3s ease, transform 0.3s ease-out */}

                                                <FontAwesome6
                                                    name="angle-right"
                                                    size={40}
                                                    color={LIGHT_BLUE_COLOR}
                                                    // style={{ transition: opacity 0.5s ease, transform 0.2s ease-out; }}
                                                />
                                            </View>

                                            <Video
                                                className="video"
                                                source={`/api/stream-video/${one_post.user.id}/${one_post_media.id}/index.m3u8`}
                                                posterSource={{ uri: `https://wesiq.com/media/${one_post_media.thumbnail}` }}
                                                usePoster={true}
                                                // shouldPlay={!logged_in_user.data_saving_mode}
                                                isLooping={true}
                                                isMuted={true}
                                                resizeMode={ResizeMode.COVER}
                                                style={{ width: "100%" }}
                                            />

                                            <View className="controls" style={styles.controls}>
                                                <View className="buttons" style={styles.buttons}>
                                                    {/* <View className="play_pause" accessibilityLabel={!logged_in_user.data_saving_mode ? "Pozastaviť..." : "Prehrať..."}> */}
                                                    <View 
                                                        className="play_pause" 
                                                        accessibilityLabel=""
                                                        // &:hover {
                                                        //     i {
                                                        //         transform: scale(1.1);
                                                        //         cursor: pointer;
                                                        //     }
                                                        // }
                                                        style={styles.play_pause}
                                                    >
                                                        <Icon
                                                            // icon_name={!logged_in_user.data_saving_mode ? "pause" : "play"}
                                                            icon_name=""
                                                            size={25}
                                                            // style={{ transition: transform 0.3s ease; }}
                                                            // onPress={}
                                                        />
                                                    </View>

                                                    <View 
                                                        className="step_back" 
                                                        accessibilityLabel="O 5 sekúnd späť..."
                                                        // &:hover {
                                                        //     i {
                                                        //         transform: scale(1.1);
                                                        //         cursor: pointer;
                                                        //     }
                                                        // }
                                                    >
                                                        <Icon
                                                            icon_name="arrow-rotate-left"
                                                            // onPress={}
                                                            size={25}
                                                            // style={{ transition: transform 0.3s ease; }}
                                                        />
                                                    </View>

                                                    <View 
                                                        className="step_further" 
                                                        accessibilityLabel="O 5 sekúnd ďalej..."
                                                        // &:hover {
                                                        //     i {
                                                        //         transform: scale(1.1);
                                                        //         cursor: pointer;
                                                        //     }
                                                        // }
                                                    >
                                                        <Icon
                                                            icon_name="arrow-rotate-right"
                                                            // onPress={}
                                                            size={25}
                                                            // style={{ transition: transform 0.3s ease; }}
                                                        />
                                                    </View>

                                                    <View className="timer" style={styles.timer}>
                                                        <Text 
                                                            className="elapsed"

                                                            style={{
                                                                width: 40,
                                                                // width: "4ch"
                                                                textAlign: "center",
                                                                fontSize: 15,
                                                            }}
                                                        >
                                                            0:00
                                                        </Text>

                                                        <Text
                                                            style={{
                                                                width: 40,
                                                                // width: "4ch"
                                                                textAlign: "center",
                                                                fontSize: 15,
                                                            }}
                                                        >
                                                            /
                                                        </Text>

                                                        <Text 
                                                            className="total"
                                                            
                                                            style={{
                                                                width: 40,
                                                                // width: "4ch"
                                                                textAlign: "center",
                                                                fontSize: 15,
                                                            }}
                                                        >
                                                            0:00
                                                        </Text>
                                                    </View>

                                                    <View className="volume_container" style={styles.volume_container}>
                                                        {!one_post_media.is_muted && (
                                                            <>
                                                                <Slider
                                                                    className="volume"
                                                                    minimumValue={0}
                                                                    maximumValue={1}
                                                                    step={0.01}
                                                                    value={volume}
                                                                    onValueChange={(value) => setVolume(value)}
                                                                    minimumTrackTintColor="#FFFFFF"
                                                                    maximumTrackTintColor="#000000"
                                                                    style={styles.volume}
                                                                >
                                                                    <Text className="volume_label" style={styles.volume_label}>0%</Text>
                                                                </Slider>

                                                                <View className="mute_unmute" accessibilityLabel="Hlasitosť..." style={styles.mute_unmute}>
                                                                    <Icon
                                                                        icon_name="volume-xmark"
                                                                        // onPress={}
                                                                        size={25}
                                                                        // style={{ transition: transform 0.3s ease; }}
                                                                    />
                                                                </View>
                                                            </>
                                                        )}

                                                        {one_post_media.is_muted && (
                                                            <View className="volume_container">
                                                                <View className="muted" accessibilityLabel="Video nemá zvuk" style={styles.muted}>
                                                                    <FontAwesome6
                                                                        name="volume-xmark"
                                                                        size={25}
                                                                        color={"#999999"}
                                                                        // style={{ transition: transform 0.3s ease; }}
                                                                    />
                                                                </View>
                                                            </View>
                                                        )}
                                                    </View>

                                                    <View 
                                                        className="show_video_settings_button" 
                                                        accessibilityLabel="Nastavenia..."
                                                        // &:hover {
                                                        //     i {
                                                        //         transform: scale(1.1);
                                                        //         cursor: pointer;
                                                        //     }
                                                        // }
                                                        style={styles.show_video_settings_button}
                                                    >
                                                        <Icon
                                                            icon_name="gear"
                                                            // onPress={}
                                                            size={25}
                                                            // style={{ transition: transform 0.3s ease; }}
                                                        />
                                                    </View>

                                                    {/* <div 
                                                        class="video_settings" 
                                                        id=""
                                                        popover
                                                        style=""
                                                    >
                                                        <button 
                                                            class="show_video_quality_button"
                                                            popovertarget=""
                                                            style=""
                                                        >
                                                            <i class="fa-solid fa-gear"></i> <!-- https://fontawesome.com/icons/gear -->
                                                            <span>{% translate "Kvalita" %}</span>
                                                        </button>

                                                        <button 
                                                            class="show_video_speed_button"
                                                            popovertarget=""
                                                            style=""
                                                        >
                                                            <i class="fa-solid fa-stopwatch"></i> <!-- https://fontawesome.com/icons/stopwatch -->
                                                            <span>{% translate "Rýchlosť" %}</span>
                                                        </button>

                                                        <button 
                                                            class="back_video_settings_button"
                                                            popovertarget=""
                                                            popovertargetaction="hide"
                                                        >
                                                            <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                                                            <span>{% translate "Zavrieť" %}</span>
                                                        </button>
                                                    </div>

                                                    <div 
                                                        class="video_quality" 
                                                        id=""
                                                        popover
                                                        style=""
                                                    >
                                                        <button class="quality_button quality_auto" data-quality="-1">auto</button>
                                                        <button class="quality_button quality_1080p" data-quality="1080">1080p</button>
                                                        <button class="quality_button quality_720p" data-quality="720">720p</button>
                                                        <button class="quality_button quality_480p" data-quality="480">480p</button>

                                                        <button 
                                                            class="back_video_quality_button" 
                                                            popovertarget=""
                                                            popovertargetaction="hide"
                                                        >
                                                            <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                                                            <span>{% translate "Zavrieť" %}</span>
                                                        </button>
                                                    </div>

                                                    <div 
                                                        class="video_speed" 
                                                        id=""
                                                        popover
                                                        style=""
                                                    >
                                                        <button class="speed_button" data-speed="2">2×</button>
                                                        <button class="speed_button" data-speed="1.5">1,5×</button>
                                                        <button class="speed_button" data-speed="1">{% translate "Normálna" %}</button>
                                                        <button class="speed_button" data-speed="0.5">0,5×</button>

                                                        <button 
                                                            class="back_video_speed_button" 
                                                            popovertarget=""
                                                            popovertargetaction="hide"
                                                        >
                                                            <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                                                            <span>{% translate "Zavrieť" %}</span>
                                                        </button>
                                                    </div> */}

                                                    <View 
                                                        className="fullscreen" 
                                                        accessibilityLabel="Rozstiahnuť..."
                                                        // &:hover {
                                                        //     i {
                                                        //         transform: scale(1.1);
                                                        //         cursor: pointer;
                                                        //     }
                                                        // }
                                                        style={styles.fullscreen}
                                                    >
                                                        <Icon
                                                            icon_name="expand"
                                                            // onPress={}
                                                            size={25}
                                                            // style={{ transition: transform 0.3s ease; }}
                                                        />
                                                    </View>
                                                </View>

                                                <View className="scrubber_hitbox" style={styles.scrubber_hitbox}>
                                                    <View className="scrubber" style={styles.scrubber}>
                                                        <View className="scrubber_track" style={styles.scrubber_track}></View>
                                                        <View className="scrubber_thumb" style={styles.scrubber_thumb}></View>
                                                        <View className="buffering_bar" style={styles.buffering_bar}></View>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    )}

                                    {/* else if(one_post_media.is_video) {
                                        const video_container_template:HTMLTemplateElement = feed.querySelector(".video_container_template") as HTMLTemplateElement // Gets The Video Container Template
                                        const video_container_template_clone:DocumentFragment = video_container_template.content.cloneNode(true) as DocumentFragment // Clones The Video Container Template Content
                                        const video_container:HTMLDivElement = video_container_template_clone.querySelector(".video_container") as HTMLDivElement // Gets The Video Container
                                        const controls:HTMLDivElement = video_container.querySelector(".controls") as HTMLDivElement // Gets The Video Controls Container
                                        const buttons:HTMLDivElement = controls.querySelector(".buttons") as HTMLDivElement // Gets The Buttons Container

                                        // Video Metrics
                                        if(logged_in_user && logged_in_user.id === post_data.user.id) {
                                            video_container.dataset["average_watch_time"] = String(one_post_media.average_watch_time) // Stores The Average Watch Time To The Video Container
                                            video_container.dataset["video_views"] = String(one_post_media.video_views) // Stores The Video Views To The Video Container
                                            if(one_post_media.sprite_sheet) video_container.dataset["sprite_sheet"] = one_post_media.sprite_sheet // Stores The Sprite Sheet Path To The Video Container
                                            if(one_post_media.vtt_file) video_container.dataset["vtt_file"] = one_post_media.vtt_file // Stores The VTT File Path To The Video Container
                                        }

                                        initializeChangeVideoQuality(video, video_src, video_container) // Initializes The Change Video Quality Buttons

                                        // If The Data Saving Mode Is Enabled (Sets The Video Quality To 480p By Default)
                                        if(data_saving_mode) {
                                            (video_container.querySelector(".play_pause_indicator") as HTMLDivElement).classList.remove("hidden") // Shows The Play Pause Indicator

                                            // HLS Format
                                            if(Hls.isSupported()) {
                                                const hls:any = new Hls({
                                                    autoStartLoad: false // Disables Video Preload
                                                })

                                                hls.loadSource(video_src)
                                                hls.attachMedia(video)

                                                // Only Starts Downloading A Video If The User Manually First Time Plays It
                                                video.addEventListener("play", function():void {
                                                    hls.startLoad()
                                                }, { once: true })
                                                
                                                // If The Video Is Ready
                                                hls.on(Hls.Events.MANIFEST_PARSED, function():void {
                                                    const video_quality:HTMLDivElement = video_container.querySelector(".controls .buttons .video_quality") as HTMLDivElement // Gets The Video Quality Menu
                                                    const all_quality_buttons:NodeListOf<HTMLButtonElement> = video_quality.querySelectorAll<HTMLButtonElement>(".quality_button") // Gets All Quality Buttons
                                                    const quality_480p_button:HTMLButtonElement = video_quality.querySelector(".quality_480p") as HTMLButtonElement // Gets The Quality 480p Button

                                                    changeVideoQuality(480, hls, quality_480p_button, all_quality_buttons) // Changes The Video Quality
                                                })
                                            }

                                            else if(video.canPlayType("application/x-mpegURL")) video.src = video_src // Fallback For Safari (Mac / iOS), Which Support HLS Format Without An Additional Library
                                        }

                                        video.append(interpolate(gettext('Príspevok užívateľa %s'), [post_data.user.username])) // Sets The Alternative Text For The Video

                                        one_post_container.appendChild(video_container) // Appends The Video Container To The One Post Container
                                        media.appendChild(one_post_container) // Appends The One Post Container To The Media Container
                                    } */}
                                </View>
                            ))}

                            <View className="particles" style={styles.particles}>

                            </View>

                            <View 
                                className="post_bars"

                                style={[
                                    styles.post_bars,
                                    one_post.media.length === 0 && { display: "none" }
                                ]}
                            >
                                {one_post.media.length > 1 && (
                                    one_post.media.map((one_post_media:Media, index:number) => (
                                        <View 
                                            key={index} 
                                            className="bar" 

                                            style={[
                                                styles.bar, 
                                                { backgroundColor: index === 0 ? DARK_BLUE_COLOR : BLUE_COLOR }
                                            ]}
                                        />
                                    ))
                                )}
                            </View>
                        </View>

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
                                        onPress={() => togglePostLike(one_post.id)}
                                        is_regular={!Boolean(logged_in_user && one_post.likes_from_users.includes(logged_in_user.id))} // Shows The Empty Or Filled Heart Icon
                                        color={Boolean(logged_in_user && one_post.likes_from_users.includes(logged_in_user.id)) ? RED_COLOR : BLUE_COLOR} // Shows The Red Or Blue Colored Heart Icon
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

                                {logged_in_user && one_post.hide_likes && one_post.user.id !== logged_in_user.id 
                                ? (<Text className="hidden_likes_counter" style={styles.hidden_likes_counter}>Skryté</Text>)
                                : (<Text className="likes_counter" style={styles.society_likes_counter}>{String(one_post.likes)}</Text>)}
                            </View>

                            <View 
                                className="comments" 
                                accessibilityLabel="Komentáre..."
                                style={styles.comments}
                            >
                                <Icon
                                    icon_name="comment"
                                    onPress={() => getPostComments(post_comments_page, false, one_post.id)}
                                    size={25}
                                    is_regular={true}
                                />

                                {one_post.allow_comments 
                                ? (<Text className="comments_counter" style={styles.comments_counter}>{String(one_post.comments_amount)}</Text>)
                                : (<Text className="hidden_comments_counter" style={styles.hidden_comments_counter}>Vypnuté</Text>)}
                            </View>

                            <View className="share" accessibilityLabel="Zdielať...">
                                <Icon
                                    icon_name="share-nodes"
                                    onPress={() => sharePost(one_post.id, one_post.user.username)}
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
                                    // onPress={}
                                    size={25}
                                />

                                <Text className="views_counter" style={styles.views_counter}>{String(one_post.views)}</Text>
                            </View>

                            {logged_in_user && one_post.user.id === logged_in_user.id && (
                                one_post.media.map((one_post_media:Media, index:number) => (
                                    one_post_media.is_video && index === 0 && (
                                        one_post_media.average_watch_time !== null && one_post_media.video_views !== null && (
                                            <>
                                                <View className="show_video_metrics" accessibilityLabel="Štatistiky...">
                                                    <Icon
                                                        icon_name="chart-simple"
                                                        // onPress={}
                                                        size={25}
                                                    />
                                                </View>

                                                <View className="video_metrics" style={styles.video_metrics}>
                                                    <View className="views" style={styles.video_metrics_views}>
                                                        <Icon
                                                            icon_name="eye"
                                                            // onPress={}
                                                        />
                                                        
                                                        <Text className="views_counter" style={styles.video_metrics_views_counter}>{String(one_post_media.video_views)}</Text>
                                                    </View>

                                                    <View className="duration_container" style={styles.duration_container}>
                                                        <View className="duration_bar" style={styles.duration_bar} />
                                                        {/* <Text className="duration_label" style={styles.duration_label}>{`${getFormattedTime("minutes", video_duration)}:${getFormattedTime("seconds", video_duration, true)}`}</Text> */}
                                                    </View>

                                                    <View className="watch_time_container" style={styles.watch_time_container}>
                                                        <View className="watch_time_bar" style={styles.watch_time_bar} />
                                                        {/* <Text className="watch_time_label" style={styles.watch_time_label}>{`${getFormattedTime("minutes", one_post_media.average_watch_time)}:${getFormattedTime("seconds", one_post_media.average_watch_time, true)} - ${((one_post_media.average_watch_time / video_duration) * 100).toFixed(2)}%`}</Text> */}
                                                    </View>
                                                </View>
                                            </>
                                        )
                                    )
                                ))
                            )}

                            <View className={logged_in_user && logged_in_user.saved_posts.includes(one_post.id) ? "save active" : ""} accessibilityLabel="Uložiť...">
                                <View className="save" accessibilityLabel="Uložiť...">
                                    <Icon
                                        icon_name="bookmark"
                                        onPress={() => togglePostSave(one_post.id)}
                                        size={25}
                                        is_regular={logged_in_user && logged_in_user.saved_posts.includes(one_post.id) ? false : true} // Shows The Empty Or Filled Heart Icon
                                        color={logged_in_user && logged_in_user.saved_posts.includes(one_post.id) ? YELLOW_COLOR : BLUE_COLOR}
                                        pressed_color={logged_in_user && logged_in_user.saved_posts.includes(one_post.id) ? YELLOW_COLOR : DARK_BLUE_COLOR}
                                    />
                                </View>
                            </View>
                        </View>

                        {one_post.description && (
                            <Text className="description" style={styles.description}>
                               {one_post.tagged_users.map(one_tagged_user => one_tagged_user.username).length > 0 || one_post.added_hashtags.length > 0 
                               ? (generateStyledDescription(one_post.description, JSON.stringify(one_post.tagged_users.map(one_tagged_user => one_tagged_user.username)), JSON.stringify(one_post.added_hashtags))) // Generates The Styled Description
                               : (one_post.description)}
                            </Text>
                        )}

                        {one_post.allow_comments && (
                            <View className="comment_forum" style={styles.comment_forum}>
                                <View className="all_comments" style={styles.all_comments}>
                                    {/* Loads The Comments */}
                                    {one_post.comments_amount > 0 && loadComments(post_comments)}

                                    <Pressable 
                                        className="show_more hidden" 
                                        onPress={() => getPostComments(post_comments_page, false, one_post.id)} 
                                        style={styles.show_more}
                                    >
                                        <Text>Zobraziť viac</Text>
                                    </Pressable>
                                </View>

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
                                        <ProfilePictureLink user_id={logged_in_user.id} user_profile_picture_name={logged_in_user.profile_picture_name || null} user_subscription={logged_in_user.subscription?.is_active || false} label="Môj účet" />
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
                                        onPress={() => addComment(one_post.id, comment, null)}
                                        style={styles.send}
                                    >
                                        <Svg 
                                            width={24} 
                                            height={24} 
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
                ))
            )}

            <BottomSheet
                ref={post_properties}
                index={-1}
                snapPoints={["30%", "50%"]}
                enablePanDownToClose={true}
                onChange={handlePostPropertiesChanges}
            >
                <BottomSheetView style={{ padding: 20 }}>
                    {selected_post ? (
                        <View className="post_properties">
                            {post_properties_sheet === "main" && (
                                <View style={styles.sheet_container}>
                                    {/* If The Post Doesn't Belong To The Logged In User The Report Option Will Be Shown */}
                                    {logged_in_user && selected_post.user.id !== logged_in_user.id && (
                                        <Pressable
                                            className="show_report_post_button"
                                            onPress={() => setPostPropertiesSheet("report")}
                                            accessibilityRole="button"

                                            style={({ pressed }) => [
                                                styles.sheet_item, 
                                                styles.sheet_item_border, 
                                                pressed && styles.sheet_item_pressed
                                            ]}
                                        >
                                            <View style={styles.sheet_icon}>
                                                <FontAwesome6
                                                    name="flag"
                                                    size={20}
                                                    solid={false}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Text style={styles.sheet_text}>Nahlásiť</Text>
                                        </Pressable>
                                    )}

                                    {/* If The Post Belongs To The Logged In User The Settings Option Will Be Shown */}
                                    {logged_in_user && selected_post.user.id === logged_in_user.id && (
                                        <Pressable
                                            className="show_post_settings_button"
                                            onPress={() => setPostPropertiesSheet("settings")}
                                            accessibilityRole="button"

                                            style={({ pressed }) => [
                                                styles.sheet_item, 
                                                styles.sheet_item_border, 
                                                pressed && styles.sheet_item_pressed
                                            ]}
                                        >
                                            <View style={styles.sheet_icon}>
                                                <FontAwesome6
                                                    name="pen"
                                                    size={20}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Text style={styles.sheet_text}>Upraviť</Text>
                                        </Pressable>
                                    )}

                                    {/* If The Post Belongs To The Logged In User Or The Logged In User Is Developer Or Admin The Delete Option Will Be Shown */}
                                    {logged_in_user && (selected_post.user.id === logged_in_user.id || logged_in_user.role === "developer" || logged_in_user.role === "admin") && (
                                        <Pressable
                                            className="delete_post_button"
                                            onPress={() => setPostPropertiesSheet("delete")}
                                            accessibilityRole="button"

                                            style={({ pressed }) => [
                                                styles.sheet_item, 
                                                styles.sheet_item_border, 
                                                pressed && styles.sheet_item_pressed
                                            ]}
                                        >
                                            <View style={styles.sheet_icon}>
                                                <FontAwesome6
                                                    name="eraser"
                                                    size={20}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Text 
                                                style={[
                                                    styles.sheet_text,
                                                    // Shows The Red Text If The Logged In User Is Developer Or Admin
                                                    { color: selected_post.user.id !== logged_in_user.id && (logged_in_user.role === "developer" || logged_in_user.role === "admin") ? RED_COLOR : BLUE_COLOR }
                                                ]}
                                            >
                                                Vymazať
                                            </Text>
                                        </Pressable>
                                    )}

                                    <Pressable
                                        className="hide_post_properties_button"
                                        onPress={hidePostProperties}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="xmark"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Zavrieť</Text>
                                    </Pressable>
                                </View>
                            )}

                            {post_properties_sheet === "report" && (
                                <View className="report" style={styles.sheet_container}>
                                    <Pressable
                                        onPress={() => reportPost(selected_post.id, "spam")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Spam</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => reportPost(selected_post.id, "harassment")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Obťažovanie</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => reportPost(selected_post.id, "hate_speech")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Nenávistné prejavy</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => reportPost(selected_post.id, "misinformation")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Dezinformácie</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => reportPost(selected_post.id, "explicit_content")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Explicitný obsah</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => reportPost(selected_post.id, "other")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Iné</Text>
                                    </Pressable>

                                    <Pressable
                                        className="back_report_button"
                                        onPress={() => setPostPropertiesSheet("main")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="xmark"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Späť</Text>
                                    </Pressable>
                                </View>
                            )}

                            {post_properties_sheet === "settings" && (
                                <View className="post_settings" style={styles.sheet_container}>
                                    <View 
                                        className="public_visibility_container"

                                        style={[
                                            styles.sheet_item, 
                                            styles.sheet_item_border,
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name={!selected_post.user.private_account && selected_post.public_visibility ? "eye" : "eye-low-vision"}
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Switch 
                                            className={selected_post.user.private_account ? "disabled_public_visibility" : "public_visibility"} // Adds The Disabled Public Visibility Class
                                            disabled={selected_post.user.private_account} // Disables The Checkbox
                                            value={selected_post.user.private_account ? false : selected_post.public_visibility} // Checks The Public Visibility Checkbox
                                            onValueChange={(new_value:boolean) => editPostSettings(selected_post.id, "public_visibility", new_value)}
                                            
                                            trackColor={{ 
                                                false: selected_post.user.private_account ? transparentize(MAIN_COLOR, 0.8) : transparentize(RED_COLOR, 0.8), 
                                                true: selected_post.user.private_account ? transparentize(MAIN_COLOR, 0.8) : transparentize(GREEN_COLOR, 0.8) 
                                            }}
                                            
                                            thumbColor={
                                                selected_post.user.private_account 
                                                    ? "#333333" 
                                                    : (selected_post.public_visibility ? GREEN_COLOR : RED_COLOR)
                                            }
                                        />
                                    </View>

                                    <View 
                                        className="allow_comments_container"

                                        style={[
                                            styles.sheet_item, 
                                            styles.sheet_item_border,
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name={selected_post.allow_comments ? "comment" : "comment-slash"}
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Switch 
                                            className="allow_comments"
                                            value={selected_post.allow_comments} // Checks The Allow Comments Checkbox
                                            onValueChange={(new_value) => editPostSettings(selected_post.id, "allow_comments", new_value)}
                                            trackColor={{ false: transparentize(RED_COLOR, 0.8), true: transparentize(GREEN_COLOR, 0.8) }}
                                            thumbColor={selected_post.allow_comments ? GREEN_COLOR : RED_COLOR}
                                        />
                                    </View>

                                    <View 
                                        className="hide_likes_container"

                                        style={[
                                            styles.sheet_item, 
                                            styles.sheet_item_border,
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="heart"
                                                size={20}
                                                solid={!selected_post.hide_likes}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Switch 
                                            className="hide_likes" 
                                            value={!selected_post.hide_likes} // Checks The Hide Likes Checkbox
                                            onValueChange={(new_value) => editPostSettings(selected_post.id, "hide_likes", !new_value)}
                                            trackColor={{ false: transparentize(RED_COLOR, 0.8), true: transparentize(GREEN_COLOR, 0.8) }}
                                            thumbColor={!selected_post.hide_likes ? GREEN_COLOR : RED_COLOR}
                                        />
                                    </View>

                                    <Pressable
                                        className="back_post_settings_button"
                                        onPress={() => setPostPropertiesSheet("main")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="xmark"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Zavrieť</Text>
                                    </Pressable>
                                </View>
                            )}

                            {post_properties_sheet === "delete" && (
                                <View className="delete_post" style={styles.sheet_container}>
                                    <Text 
                                        style={[
                                            styles.sheet_text, 
                                            { textAlign: "center" }
                                        ]}
                                    >
                                        Naozaj chcete vymazať Váš príspevok?
                                    </Text>

                                    <Pressable
                                        onPress={() => deletePost(selected_post.id)}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="eraser"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Vymazať</Text>
                                    </Pressable>

                                    <Pressable 
                                        onPress={() => setPostPropertiesSheet("main")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="xmark"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Zrušiť</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    ) : null}
                </BottomSheetView>
            </BottomSheet>

            <BottomSheet
                ref={post_comment_properties}
                index={-1}
                snapPoints={["30%", "50%"]}
                enablePanDownToClose={true}
                onChange={handlePostCommentPropertiesChanges}
            >
                <BottomSheetView style={{ padding: 20 }}>
                    {selected_post_comment ? (
                        <View className="comment_properties">
                            {post_comment_properties_sheet === "main" && (
                                <View style={styles.sheet_container}>
                                    {/* If The Comment Doesn't Belong To The Logged In User The Report Option Will Be Shown */}
                                    {logged_in_user && selected_post_comment.user.id !== logged_in_user.id && (
                                        <Pressable
                                            className="show_report_comment_button"
                                            onPress={() => setPostCommentPropertiesSheet("report")}
                                            accessibilityRole="button"

                                            style={({ pressed }) => [
                                                styles.sheet_item, 
                                                styles.sheet_item_border, 
                                                pressed && styles.sheet_item_pressed
                                            ]}
                                        >
                                            <View style={styles.sheet_icon}>
                                                <FontAwesome6
                                                    name="flag"
                                                    size={20}
                                                    solid={false}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Text style={styles.sheet_text}>Nahlásiť</Text>
                                        </Pressable>
                                    )}

                                    {/* If The Comment Belongs To The Logged In User The Delete Option Will Be Shown */}
                                    {logged_in_user && (selected_post_comment.user.id === logged_in_user.id || logged_in_user.role === "developer" || logged_in_user.role === "admin") && (
                                        <Pressable
                                            className="delete_comment_button"
                                            onPress={() => setPostCommentPropertiesSheet("delete")}
                                            accessibilityRole="button"

                                            style={({ pressed }) => [
                                                styles.sheet_item, 
                                                styles.sheet_item_border, 
                                                pressed && styles.sheet_item_pressed
                                            ]}
                                        >
                                            <View style={styles.sheet_icon}>
                                                <FontAwesome6
                                                    name="eraser"
                                                    size={20}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Text 
                                                style={[
                                                    styles.sheet_text,
                                                    // Shows The Red Text If The Logged In User Is Developer Or Admin
                                                    { color: selected_post_comment.user.id !== logged_in_user.id && (logged_in_user.role === "developer" || logged_in_user.role === "admin") ? RED_COLOR : BLUE_COLOR }
                                                ]}
                                            >
                                                Vymazať
                                            </Text>
                                        </Pressable>
                                    )}

                                    <Pressable
                                        className="hide_comment_properties_button"
                                        onPress={hidePostCommentProperties}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="xmark"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Zavrieť</Text>
                                    </Pressable>
                                </View>
                            )}

                            {post_comment_properties_sheet === "report" && (
                                <View className="report" style={styles.sheet_container}>
                                    <Pressable
                                        onPress={() => reportComment(selected_post_comment.id, "spam")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Spam</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => reportComment(selected_post_comment.id, "harassment")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Obťažovanie</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => reportComment(selected_post_comment.id, "hate_speech")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Nenávistné prejavy</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => reportComment(selected_post_comment.id, "misinformation")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Dezinformácie</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => reportComment(selected_post_comment.id, "explicit_content")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Explicitný obsah</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => reportComment(selected_post_comment.id, "other")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="list"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Iné</Text>
                                    </Pressable>

                                    <Pressable
                                        className="back_report_button"
                                        onPress={() => setPostCommentPropertiesSheet("main")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="xmark"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Späť</Text>
                                    </Pressable>
                                </View>
                            )}

                            {post_comment_properties_sheet === "delete" && (
                                <View className="delete_comment" style={styles.sheet_container}>
                                    <Text 
                                        style={[
                                            styles.sheet_text, 
                                            { textAlign: "center" }
                                        ]}
                                    >
                                        Naozaj chcete vymazať Váš komentár?
                                    </Text>

                                    <Pressable
                                        onPress={() => deleteComment(selected_post_comment.id)}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            styles.sheet_item_border, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="eraser"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Vymazať</Text>
                                    </Pressable>

                                    <Pressable 
                                        onPress={() => setPostCommentPropertiesSheet("main")}
                                        accessibilityRole="button"

                                        style={({ pressed }) => [
                                            styles.sheet_item, 
                                            pressed && styles.sheet_item_pressed
                                        ]}
                                    >
                                        <View style={styles.sheet_icon}>
                                            <FontAwesome6
                                                name="xmark"
                                                size={20}
                                                color={BLUE_COLOR}
                                            />
                                        </View>

                                        <Text style={styles.sheet_text}>Zrušiť</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    ) : null}
                </BottomSheetView>
            </BottomSheet>
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
        // overflowY: "auto",
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
        position: "absolute",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        // backdrop-filter: blur(5px);
        opacity: 1,
        // transition: opacity 0.3s ease, display 0.3s ease allow-discrete;
        zIndex: 50,

        // &.hidden {
        //     opacity: 0;
        //     display: none;
        // }
    },

    previous: {
        opacity: 0,
        position: "absolute",
        top: "50%",
        left: 10,
        transform: [{ translateY: "-50%" }],
        width: 50,
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.3s ease, transform 0.2s ease, opacity 0.3s ease;
        zIndex: 50,

        // &.hidden {
        //     display: none;
        // }

        // &:hover,
        // &:focus-visible {
                // border-color: $blue-color;
        //     transform: translateY(-50%) scale(1.05);
        //     opacity: 1;
        // }
    },

    next: {
        opacity: 0,
        position: "absolute",
        top: "50%",
        right: 10,
        transform: [{ translateY: "-50%" }],
        width: 50,
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.3s ease, transform 0.2s ease, opacity 0.3s ease;
        zIndex: 50,

        // &.hidden {
        //     display: none;
        // }

        // &:hover,
        // &:focus-visible {
                // border-color: $blue-color;
        //     transform: translateY(-50%) scale(1.05);
        //     opacity: 1;
        // }
    },

    video_container: {
        position: "relative",

        // &:hover {
        //     .controls {
        //         display: flex;
        //         opacity: 1;
        //     }
        // }

        // &:fullscreen {
        //     top: 0px !important;
        //     left: 0px !important;
        //     width: 100vw !important;
        //     height: 100vh !important;
        //     margin: 0px !important;
        //     padding: 0px !important;

        //     .controls {
        //         .buttons {
        //             padding: 0px calc(50px);
        //         }
        //     }
        // }
    },

    play_pause_indicator: {
        position: "absolute",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        pointerEvents: "none",
        opacity: 1,
        width: 50,
        height: 50,
        backgroundColor: transparentize(MAIN_COLOR, 0.8),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: opacity 0.3s ease;
        zIndex: 50,

        // &.hidden {
        //     opacity: 0;
        // }
    },

    step_back_indicator: {
        position: "absolute",
        top: "50%",
        left: 50,
        transform: [{ translateY: "-50%" }],
        pointerEvents: "none",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 50,
        zIndex: 50,

        // &.hidden {
        //     span {
        //         opacity: 0;
        //         transform: scale(1.1);
        //     }
        // }

        // &.hidden {
        //     .fa-angle-left {
        //         opacity: 0;
        //         transform: translateX(-10px);
        //     }
        // }
    },

    step_further_indicator: {
        position: "absolute",
        top: "50%",
        right: 50,
        transform: [{ translateY: "-50%" }],
        pointerEvents: "none",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 50,
        zIndex: 50,

        // &.hidden {
        //     span {
        //         opacity: 0;
        //         transform: scale(1.1);
        //     }
        // }

        // &.hidden {
        //     .fa-angle-right {
        //         opacity: 0;
        //         transform: translateX(10px);
        //     }
        // }
    },

    controls: {
        display: "none",
        opacity: 0,
        position: "absolute",
        bottom: BIG_BORDER_RADIUS / 2,
        gap: 10,
        width: "100%",
        // transition: display 0.3s ease allow-discrete 1s, opacity 0.3s ease 1s;
        zIndex: 100,
    },

    buttons: {
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: BIG_BORDER_RADIUS / 2,
    },

    play_pause: {
        width: 13.5,
    },

    timer: {
        alignItems: "center",
        marginRight: "auto",
        paddingVertical: 5,
        paddingHorizontal: 10,
        // font-family: $article-heading-font;
        // font-variant-numeric: tabular-nums;
        fontSize: 15,
        backgroundColor: transparentize(MAIN_COLOR, 0.8),
        borderRadius: 28 / 2,
    },

    volume_container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: transparentize(MAIN_COLOR, 0.8),
        borderRadius: 28 / 2,
    },

    volume: {
        // appearance: none !important;
        // -webkit-appearance: none !important;
        direction: "rtl",
        position: "relative",
        height: 5,
        backgroundColor: BLUE_COLOR,
        borderRadius: 5 / 2,

        // &:hover {
        //     &::-webkit-slider-thumb {
        //         background-color: $dark-blue-color;
        //         scale: 1.2;
        //     }
        // }

        // &::-webkit-slider-thumb {
        //     -webkit-appearance: none !important;
        //     height: 10px;
        //     width: 10px;
        //     background-color: $blue-color;
        //     border-radius: 50%;
        //     transition: background-color 0.3s ease, scale 0.3s ease;
        // }
    },

    volume_label: {
        position: "absolute",
        bottom: "50%",
        left: -45,
        transform: [{ translateY: "50%" }],
        // width: 4ch;
        width: 40,
        textAlign: "right",
        color: SECONDARY_COLOR,
        // font-variant-numeric: tabular-nums;
        fontSize: 15,
    },

    mute_unmute: {
        width: 22.5,
        textAlign: "right",
        // transition: transform 0.3s ease;

        // &:hover {
        //     transform: scale(1.1);
        //     cursor: pointer;
        // }
    },

    muted: {
        width: 22.5,
        textAlign: "right",
        // transition: transform 0.3s ease;

        // &:hover {
        //     transform: scale(1.1);
        //     cursor: pointer;
        // }
    },

    show_video_settings_button: {
        marginLeft: 10,
    },

    fullscreen: {
        marginLeft: 10,
    },

    scrubber_hitbox: {
        // width: calc(100% - $big-border-radius);
        width: "100%",
        marginHorizontal: "auto",
        paddingVertical: 5,

        // &:hover {
        //     .scrubber {
        //         &::before {
        //             transition: width 0s;
        //         }
    
        //         &::after {
        //             transition: transform 0s, margin-left 0s;
        //         }
        //     }
        // }
    },

    scrubber: {
        position: "relative",
        width: "100%",
        height: 5,
        backgroundColor: LIGHT_BLUE_COLOR,
        borderRadius: 8 / 2,

        // &:hover {
        //     // height: 8px;

        //     &::after {
        //         background-color: $dark-blue-color;
        //         transform: translateY(-50%) scale(1.2);
        //     }
        // }
    },

    scrubber_track: {
        position: "absolute",
        // width: var(--progress);
        width: 0,
        maxWidth: "100%",
        height: 5,
        backgroundColor: DARK_BLUE_COLOR,
        borderRadius: 8 / 2,
        // transition: width 0.1s linear;
        zIndex: 100,
    },

    scrubber_thumb: {
        position: "absolute",
        top: "50%",
        transform: [{ translateY: "50%" }],
        width: 10,
        height: 10,
        // margin-left: calc(var(--progress) - (10px / 2));
        marginLeft: 0,
        backgroundColor: DARK_BLUE_COLOR,
        borderRadius: "50%",
        // transition: transform 0.3s ease, margin-left 0.1s linear, background-color 0.3s ease;
        zIndex: 100,
    },

    buffering_bar: {
        position: "relative",
        // width: var(--progress);
        width: 0,
        maxWidth: "100%",
        height: 5,
        backgroundColor: DARK_BLUE_COLOR,
        borderRadius: 8 / 2,
        // transition: width 0.1s linear;
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

    // Unfinished JSX

    video_metrics: {
        gap: 10,
        marginTop: 10,

        // &.hidden {
        //     display: none;
        // }
    },

    video_metrics_views: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    video_metrics_views_counter: {
        color: BLUE_COLOR,
    },

    duration_container: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        width: "50%",
    },

    duration_bar: {
        width: "0%",
        // width: calc(var(--width) * 1%);
        height: 5,
        backgroundColor: "#8EFA00",
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: width 1s ease;
    },

    duration_label: {
        // --offset: 10px;
        position: "absolute",
        top: "50%",
        // left: calc(var(--right) * 1% + var(--offset));
        left: "0%",
        transform: [{ translateY: "-50%" }],
        color: BLUE_COLOR,
        // transition: left 1s ease;
    },

    watch_time_container: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        width: "50%",
    },

    watch_time_bar: {
        width: "0%",
        // width: max(5px, calc(var(--width) * 1%));
        height: 5,
        backgroundColor: "#FA0080",
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: width 1s ease;
    },

    watch_time_label: {
        position: "absolute",
        top: "50%",
        // left: max(5px + var(--offset), calc(var(--right) * 1% + var(--offset)));
        left: "0%",
        transform: [{ translateY: "-50%" }],
        color: BLUE_COLOR,
        // transition: left 1s ease;
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

    feed_report: {
        display: "none",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        padding: 20,
        textAlign: "center",
        color: LIGHT_BLUE_COLOR,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
    },

    sheet_container: {
        paddingBottom: 20,
    },

    sheet_item: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        paddingVertical: 20,
        paddingHorizontal: 10,
    },

    sheet_item_border: {
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.8),
    },

    sheet_item_pressed: {
        opacity: 0.5,
    },

    sheet_icon: {
        width: 20,
        alignItems: "center",
        justifyContent: "center",
    },

    sheet_text: {
        color: BLUE_COLOR,
    },
})