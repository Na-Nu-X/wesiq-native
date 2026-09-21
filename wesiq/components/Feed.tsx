import { useState, useEffect, useRef } from "react"
import { View, StyleSheet, TextInput, Text, Alert, Pressable, Switch, FlatList, ActivityIndicator } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import Icon from "@/components/Icon"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import { FontAwesome6 } from "@expo/vector-icons"
import { useMemo } from "react"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { PostContainer } from "./PostContainer"
import { ProcessingPostContainer } from "./ProcessingPostContainer"

import type { LoggedInUserResponse, LoggedInUser } from "./LoginFormDialog"
import type { TrackedTask } from "@/app/(tabs)"

export interface BasicResponse {
    success:boolean,
    message:string
}

interface LoadedPostsResponse {
    success:boolean,
    has_next?:boolean,
    posts?:Post[],
    message:string
}

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
    comments:Comment[]|null
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

export interface Media {
    id:number,
    file:string,
    thumbnail:string,
    is_video:boolean,
    is_muted:boolean,
    average_watch_time:number|null,
    video_views:number|null,
    video_duration:number|null,
    sprite_sheet:string|null,
    vtt_file:string|null
}

export interface Comment {
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
    parent_id:number|null,
    reports_from_users?:number[],
    level:number
}

export interface LoadedProcessingPostsResponse {
    success:boolean,
    processing_posts?:ProcessingPost[],
    message:string
}

export interface ProcessingPost {
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
    created_at:string,
    media:ProcessingMedia[]
}

export interface ProcessingMedia {
    id:number,
    file:string,
    thumbnail:string,
    is_video:boolean,
    original_filename:string,
    original_size:number,
}

interface FeedProps {
    tracked_tasks:TrackedTask[],
    processing_posts:ProcessingPost[],
    onProcessingPostsUpdate:(processing_posts:ProcessingPost[]) => void
}

export default function Feed({ tracked_tasks, processing_posts, onProcessingPostsUpdate }:FeedProps) {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const [posts, setPosts] = useState<Post[]>([]) // Stores The Posts
    const [page, setPage] = useState(1) // Stores The Current Page Number
    const [has_next, setHasNext] = useState<boolean>(true) // Stores The Information If There Are More Posts Available
    const [are_posts_loading, setArePostsLoading] = useState(false) // Stores The Information If Posts Are Loading
    const [is_error, setIsError] = useState<boolean>(false) // Stores The Information That There Is An Error
    const [search_text, setSearchText] = useState("") // Stores The Search Text

    const post_properties = useRef<BottomSheetModal>(null) // Stores The Post Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [post_properties_sheet, setPostPropertiesSheet] = useState<"main"|"report"|"settings"|"delete">("main") // Stores The Active Post Properties Sheet
    const [selected_post, setSelectedPost] = useState<Post|null>(null) // Stores The Selected Post

    const processing_post_properties = useRef<BottomSheetModal>(null) // Stores The Processing Post Properties
    const [processing_post_properties_sheet, setProcessingPostPropertiesSheet] = useState<"main"|"report"|"settings"|"delete">("main") // Stores The Active Processing Post Properties Sheet
    const [selected_processing_post, setSelectedProcessingPost] = useState<ProcessingPost|null>(null) // Stores The Selected Processing Post

    const post_comment_properties = useRef<BottomSheetModal>(null) // Stores The Post Comment Properties
    const [post_comment_properties_sheet, setPostCommentPropertiesSheet] = useState<"main"|"report"|"delete">("main") // Stores The Active Post Comment Properties Sheet
    const [selected_post_comment, setSelectedPostComment] = useState<Comment|null>(null) // Stores The Selected Post Comment

    // Function For Get The Logged In User
    const getLoggedInUser = async () => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const logged_in_user_response:Response = await fetch(`${API_URL}/get-logged-in-user/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })
    
            const logged_in_user_data:LoggedInUserResponse = await logged_in_user_response.json() // Gets The Logged In User Data

            if(logged_in_user_response.status === 401) {
                await AsyncStorage.removeItem("user_token") // Removes The User Token
                setLoggedInUser(null) // Removes The Logged In User
                return null
            }
    
            if(logged_in_user_data.success) {
                setLoggedInUser(logged_in_user_data.logged_in_user || null) // Sets The Logged In User
                return logged_in_user_data.logged_in_user || null
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
    
            // Sends The GET Request To The Server
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
                setIsError(true) // Sets The Information That There Is An Error
                Alert.alert("Chyba", "Pri hľadaní príspevkov došlo k chybe.") // Shows The Alert
                return
            }

            const loaded_posts_data:LoadedPostsResponse = await loaded_posts_response.json() // Gets The Loaded Posts Data

            // If The Response Isn't Success
            if(!loaded_posts_data.success) {
                Alert.alert("Chyba", loaded_posts_data.message) // Shows The Alert
                return
            }

            if(is_refresh) setPosts(loaded_posts_data.posts || []) // Sets The Posts
            
            else {
                setPosts(previous_posts => {
                    const existing_posts_ids:Set<number> = new Set(previous_posts.map(post => post.id)) // Gets The Existing Posts IDs
                    const new_posts:Post[] = (loaded_posts_data.posts as Post[]).filter(post => !existing_posts_ids.has(post.id)) // Gets The New Unique Posts
                
                    return [...previous_posts, ...new_posts] // Returns The Combined Posts
                })
            }
    
            setHasNext(loaded_posts_data.has_next || false) // Sets The Has Next
            setPage(page) // Sets The Page
        } 
        
        catch {
            setIsError(true) // Sets The Information That There Is An Error
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

    // Initializes The Load Of Posts
    useEffect(() => {
        loadPosts(1, true) // Loads Posts
    }, [search_text])

    // Function For Load More Posts
    const loadMorePosts = () => {
        if(has_next && !are_posts_loading) loadPosts(page + 1) // Loads Posts
    }

    // Function For Show The Post Properties
    const showPostProperties = (post:Post):void => {
        setSelectedPost(post) // Sets The Selected Post
        post_properties.current?.present() // Shows The Post Properties
    }

    // Function For Close The Post Properties
    const hidePostProperties = ():void => {
        setSelectedPost(null) // Sets The Selected Post
        post_properties.current?.dismiss() // Hides The Post Properties
    }

    // Function For Handle Post Properties Sheet Switching
    const handlePostPropertiesChanges = (index:number) => {
        if(index === -1) setPostPropertiesSheet("main") // Sets The Post Properties Sheet To Default
    }

    // Function For Show The Processing Post Properties
    const showProcessingPostProperties = (processing_post:ProcessingPost):void => {
        console.log(processing_post)
        setSelectedProcessingPost(processing_post) // Sets The Selected Processing Post
        processing_post_properties.current?.present() // Shows The Processing Post Properties
    }

    // Function For Close The Processing Post Properties
    const hideProcessingPostProperties = ():void => {
        setSelectedProcessingPost(null) // Sets The Selected Processing Post
        processing_post_properties.current?.dismiss() // Hides The Processing Post Properties
    }

    // Function For Handle Processing Post Properties Sheet Switching
    const handleProcessingPostPropertiesChanges = (index:number) => {
        if(index === -1) setProcessingPostPropertiesSheet("main") // Sets The Processing Post Properties Sheet To Default
    }

    // Function For Show The Post Comment Properties
    const showPostCommentProperties = (comment:Comment):void => {
        setSelectedPostComment(comment) // Sets The Selected Post Comment
        post_comment_properties.current?.present() // Shows The Post Comment Properties
    }

    // Function For Close The Post Comment Properties
    const hidePostCommentProperties = ():void => {
        setSelectedPostComment(null) // Sets The Selected Post Comment
        post_comment_properties.current?.dismiss() // Hides The Post Properties
    }

    // Function For Handle Post Comment Properties Sheet Switching
    const handlePostCommentPropertiesChanges = (index:number) => {
        if(index === -1) setPostCommentPropertiesSheet("main") // Sets The Post Comment Properties Sheet To Default
    }

    // Function For Report The Post
    const reportPost = async (post_id:number, reason:string) => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Nahlásenie nie je možné odoslať bez prihlásenia.") // Shows The Alert
                return
            }

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

            const reported_post_data:BasicResponse = await reported_post_response.json() // Gets The Reported Post Data

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
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Príspevok nie je možné upraviť bez prihlásenia.") // Shows The Alert
                return
            }

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

            const edited_post_settings_data:BasicResponse = await edited_post_settings_response.json() // Gets The Edited Post Settings Data

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

                // Stores The New State Of Updated Processing Posts
                const updated_processing_posts = processing_posts.map(one_processing_post => one_processing_post.id === post_id
                    ? { ...one_processing_post, [setting]: action } 
                    : one_processing_post
                )

                onProcessingPostsUpdate(updated_processing_posts) // Sets The Processing Posts
                setSelectedProcessingPost(previous_selected_processing_post => previous_selected_processing_post ? { ...previous_selected_processing_post, [setting]: action } : null) // Sets The Selected Post

                return
            }
        }
        
        catch {
            Alert.alert("Chyba", "Pri úprave príspevku došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Delete The Post
    const deletePost = async (post_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Príspevok nie je možné odstrániť bez prihlásenia.") // Shows The Alert
                return
            }

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

            const deleted_post_data:BasicResponse = await deleted_post_response.json() // Gets The Deleted Post Data

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

                const updated_processing_posts = processing_posts.filter((one_processing_post:ProcessingPost) => one_processing_post.id !== post_id) // Stores The New State Of Updated Processing Posts
                onProcessingPostsUpdate(updated_processing_posts) // Sets The Processing Posts
                setSelectedProcessingPost(null) // Sets The Selected Processing Post
                hideProcessingPostProperties() // Closes The Processing Post Properties

                return
            }
        }
        
        catch {
            Alert.alert("Chyba", "Pri odstraňovaní príspevku došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Report The Comment
    const reportComment = async (comment_id:number, reason:string) => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Nahlásenie nie je možné odoslať bez prihlásenia.") // Shows The Alert
                return
            }

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

            const reported_post_comment_data:BasicResponse = await reported_post_comment_response.json() // Gets The Reported Post Comment Data

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
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Komentár nie je možné odstrániť bez prihlásenia.") // Shows The Alert
                return
            }

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

            const deleted_post_comment_data:BasicResponse = await deleted_post_comment_response.json() // Gets The Deleted Post Comment Data

            // If The Response Isn't Success
            if(!deleted_post_comment_data.success) {
                Alert.alert("Chyba", deleted_post_comment_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert("Úspech", deleted_post_comment_data.message) // Shows The Alert

                // Sets The Posts
                if(selected_post_comment) {
                    setPosts(previous_posts => previous_posts.map((one_post:Post) => {
                        const has_comment:boolean = one_post.comments?.some(one_post_comment => one_post_comment.id === selected_post_comment.id) || false // Checks If The Post Has The Selected Comment
                
                        if(has_comment) {
                            const previous_post_comments:Comment[] = one_post.comments || [] // Gets The Previous Post Comments
                
                            return {
                                ...one_post,
                                comments: previous_post_comments.filter((one_post_comment:Comment) => one_post_comment.id !== selected_post_comment.id), // Filters Out Deleted Comment
                                comments_amount: (one_post.comments_amount || 0) - 1 // Decreases The Comments Amount
                            }
                        }
                
                        return one_post // Returns The Unchanged Post
                    }))
                }

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

    return (
        <BottomSheetModalProvider>
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
                            value={search_text}
                            onChangeText={(text:string) => setSearchText(text)}

                            style={[
                                styles.search_bar, 
                                { outlineStyle: "none" } as any
                            ]}
                        />
                    </View>

                    <View className="history_container" style={styles.history_container}></View>
                </View>

                {processing_posts.length > 0 && logged_in_user && (
                    <FlatList
                        data={processing_posts}
                        extraData={tracked_tasks}
                        keyExtractor={(one_processing_post:ProcessingPost) => one_processing_post.id.toString()}

                        renderItem={({ item }) => (
                            <ProcessingPostContainer 
                                processing_post={item} 
                                tracked_tasks={tracked_tasks}
                                onShowProcessingPostProperties={(processing_posts:ProcessingPost) => showProcessingPostProperties(processing_posts)}
                                logged_in_user={logged_in_user}
                            />
                        )}

                        showsVerticalScrollIndicator={false}

                        style={{
                            alignSelf: "center",
                            maxWidth: MAIN_WIDTH,
                            width: "100%",
                        }}

                        contentContainerStyle={{
                            gap: 25,
                            width: "100%",
                        }}
                    />
                )}

                {posts.length > 0 && (
                    <>
                        <FlatList
                            data={posts}
                            keyExtractor={(one_post:Post) => one_post.id.toString()}

                            renderItem={({ item }) => (
                                <PostContainer
                                    post={item}
                                    logged_in_user={logged_in_user}
                                    onPostsUpdate={(posts:Post[]) => setPosts(posts)}
                                    posts={posts}
                                    onLoggedInUserUpdate={(logged_in_user:LoggedInUser) => setLoggedInUser(logged_in_user)}
                                    onShowPostProperties={(posts:Post) => showPostProperties(posts)}
                                    onShowPostCommentProperties={(comment:Comment) => showPostCommentProperties(comment)}
                                    are_posts_loading={are_posts_loading}
                                />
                            )}

                            onEndReached={loadMorePosts}
                            onEndReachedThreshold={0.5}

                            ListFooterComponent={
                                are_posts_loading ? (
                                    <View style={{ padding: 20, alignItems: "center" }}>
                                        <ActivityIndicator size="small" color={SECONDARY_COLOR} />
                                    </View>
                                ) : null
                            }

                            showsVerticalScrollIndicator={false}

                            style={{
                                alignSelf: "center",
                                maxWidth: MAIN_WIDTH,
                                width: "100%",
                            }}

                            contentContainerStyle={{
                                gap: 25,
                                width: "100%",
                            }}
                        />

                        {(are_posts_loading || !has_next) && !is_error && (
                            <Text className="feed_report" style={styles.feed_report}>
                                {are_posts_loading ? "Načítavam..." : "Videli ste všetky príspevky."}
                            </Text>
                        )}
                    </>
                )}

                {posts.length === 0 && !is_error && (<Text className="feed_report" style={styles.feed_report}>Nenašli sa žiadne príspevky.</Text>)}
                {is_error && (<Text className="feed_report" style={styles.feed_report}>Pri hľadaní príspevkov došlo k chybe.</Text>)}

                <BottomSheetModal
                    ref={post_properties}
                    snapPoints={snap_points}
                    enablePanDownToClose={true}
                    onChange={handlePostPropertiesChanges}
                    containerStyle={{ zIndex: 9999 }}
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
                </BottomSheetModal>

                <BottomSheetModal
                    ref={processing_post_properties}
                    snapPoints={snap_points}
                    enablePanDownToClose={true}
                    onChange={handleProcessingPostPropertiesChanges}
                    containerStyle={{ zIndex: 9999 }}
                >
                    <BottomSheetView style={{ padding: 20 }}>
                        {selected_processing_post ? (
                            <View className="processing_post_properties">
                                {processing_post_properties_sheet === "main" && (
                                    <View style={styles.sheet_container}>
                                        {/* If The Processing Post Belongs To The Logged In User The Settings Option Will Be Shown */}
                                        {logged_in_user && selected_processing_post.user.id === logged_in_user.id && (
                                            <Pressable
                                                className="show_processing_post_settings_button"
                                                onPress={() => setProcessingPostPropertiesSheet("settings")}
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

                                        {/* If The Processing Post Belongs To The Logged In User Or The Logged In User Is Developer Or Admin The Delete Option Will Be Shown */}
                                        {logged_in_user && (selected_processing_post.user.id === logged_in_user.id || logged_in_user.role === "developer" || logged_in_user.role === "admin") && (
                                            <Pressable
                                                className="delete_processing_post_button"
                                                onPress={() => setProcessingPostPropertiesSheet("delete")}
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
                                                        { color: selected_processing_post.user.id !== logged_in_user.id && (logged_in_user.role === "developer" || logged_in_user.role === "admin") ? RED_COLOR : BLUE_COLOR }
                                                    ]}
                                                >
                                                    Vymazať
                                                </Text>
                                            </Pressable>
                                        )}

                                        <Pressable
                                            className="hide_processing_post_properties_button"
                                            onPress={hideProcessingPostProperties}
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

                                {processing_post_properties_sheet === "settings" && (
                                    <View className="processing_post_settings" style={styles.sheet_container}>
                                        <View 
                                            className="public_visibility_container"

                                            style={[
                                                styles.sheet_item, 
                                                styles.sheet_item_border,
                                            ]}
                                        >
                                            <View style={styles.sheet_icon}>
                                                <FontAwesome6
                                                    name={!selected_processing_post.user.private_account && selected_processing_post.public_visibility ? "eye" : "eye-low-vision"}
                                                    size={20}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Switch 
                                                className={selected_processing_post.user.private_account ? "disabled_public_visibility" : "public_visibility"} // Adds The Disabled Public Visibility Class
                                                disabled={selected_processing_post.user.private_account} // Disables The Checkbox
                                                value={selected_processing_post.user.private_account ? false : selected_processing_post.public_visibility} // Checks The Public Visibility Checkbox
                                                onValueChange={(new_value:boolean) => editPostSettings(selected_processing_post.id, "public_visibility", new_value)}
                                                
                                                trackColor={{ 
                                                    false: selected_processing_post.user.private_account ? transparentize(MAIN_COLOR, 0.8) : transparentize(RED_COLOR, 0.8), 
                                                    true: selected_processing_post.user.private_account ? transparentize(MAIN_COLOR, 0.8) : transparentize(GREEN_COLOR, 0.8) 
                                                }}
                                                
                                                thumbColor={
                                                    selected_processing_post.user.private_account 
                                                        ? "#333333" 
                                                        : (selected_processing_post.public_visibility ? GREEN_COLOR : RED_COLOR)
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
                                                    name={selected_processing_post.allow_comments ? "comment" : "comment-slash"}
                                                    size={20}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Switch 
                                                className="allow_comments"
                                                value={selected_processing_post.allow_comments} // Checks The Allow Comments Checkbox
                                                onValueChange={(new_value) => editPostSettings(selected_processing_post.id, "allow_comments", new_value)}
                                                trackColor={{ false: transparentize(RED_COLOR, 0.8), true: transparentize(GREEN_COLOR, 0.8) }}
                                                thumbColor={selected_processing_post.allow_comments ? GREEN_COLOR : RED_COLOR}
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
                                                    solid={!selected_processing_post.hide_likes}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Switch 
                                                className="hide_likes" 
                                                value={!selected_processing_post.hide_likes} // Checks The Hide Likes Checkbox
                                                onValueChange={(new_value) => editPostSettings(selected_processing_post.id, "hide_likes", !new_value)}
                                                trackColor={{ false: transparentize(RED_COLOR, 0.8), true: transparentize(GREEN_COLOR, 0.8) }}
                                                thumbColor={!selected_processing_post.hide_likes ? GREEN_COLOR : RED_COLOR}
                                            />
                                        </View>

                                        <Pressable
                                            className="back_post_settings_button"
                                            onPress={() => setProcessingPostPropertiesSheet("main")}
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

                                {processing_post_properties_sheet === "delete" && (
                                    <View className="delete_processing_post" style={styles.sheet_container}>
                                        <Text 
                                            style={[
                                                styles.sheet_text, 
                                                { textAlign: "center" }
                                            ]}
                                        >
                                            Naozaj chcete vymazať Váš príspevok?
                                        </Text>

                                        <Pressable
                                            onPress={() => deletePost(selected_processing_post.id)}
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
                                            onPress={() => setProcessingPostPropertiesSheet("main")}
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
                </BottomSheetModal>

                <BottomSheetModal
                    ref={post_comment_properties}
                    snapPoints={snap_points}
                    enablePanDownToClose={true}
                    onChange={handlePostCommentPropertiesChanges}
                    containerStyle={{ zIndex: 9999 }}
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
                </BottomSheetModal>
            </View>
        </BottomSheetModalProvider>
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

    feed_report: {
        // display: "none",
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