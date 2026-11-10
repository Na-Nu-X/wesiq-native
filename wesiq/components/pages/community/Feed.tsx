import { useState, useEffect, useRef , useMemo } from "react"
import { View, StyleSheet, Text, Alert, Pressable, Switch, FlatList, ActivityIndicator, Share } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL, DOMAIN } from "@/constants/general"
import { FontAwesome6 } from "@expo/vector-icons"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { PostContainer } from "./PostContainer"
import { ProcessingPostContainer } from "./ProcessingPostContainer"
import { useTranslation } from "react-i18next"
import SearchPosts from "./SearchPosts"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"

import type { LoggedInUser } from "../../LoginFormDialog"
import { TrackedTask } from "@/app/(tabs)"

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

    id:string,
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

    id:string,
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

export interface LoadedFriendsResponse {
    success:boolean,
    following?:Following[],
    message:string
}

export interface Following {
    id:number,
    username:string,
    profile_picture_name:string|null,

    subscription:{
        is_active:boolean
    }|null
}

interface FeedProps {
    tracked_tasks:TrackedTask[],
    processing_posts:ProcessingPost[],
    onProcessingPostsUpdate:(processing_posts:ProcessingPost[]) => void
}

export default function Feed({ tracked_tasks, processing_posts, onProcessingPostsUpdate }:FeedProps) {
    const { t } = useTranslation() // Initializes The Translations

    const { logged_in_user, setLoggedInUser } = useLoggedInUser() // Gets The Logged In User

    const [posts, setPosts] = useState<Post[]>([]) // Stores The Posts
    const [page, setPage] = useState(1) // Stores The Current Page Number
    const [has_next, setHasNext] = useState<boolean>(true) // Stores The Information If There Are More Posts Available
    const [are_posts_loading, setArePostsLoading] = useState<boolean>(false) // Stores The Information If Posts Are Loading
    const [is_error, setIsError] = useState<boolean>(false) // Stores The Information That There Is An Error
    const [search_text, setSearchText] = useState<string>("") // Stores The Search Text

    const [selected_post, setSelectedPost] = useState<Post|null>(null) // Stores The Selected Post
    const [selected_processing_post, setSelectedProcessingPost] = useState<ProcessingPost|null>(null) // Stores The Selected Processing Post
    const [selected_post_comment, setSelectedPostComment] = useState<Comment|null>(null) // Stores The Selected Post Comment

    const [friends, setFriends] = useState<Following[]>([]) // Stores The Friends (Following Users)

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
                Alert.alert(t("Chyba"), t("Pri hľadaní príspevkov došlo k chybe.")) // Shows The Alert
                return
            }

            const loaded_posts_data:LoadedPostsResponse = await loaded_posts_response.json() // Gets The Loaded Posts Data

            // If The Response Isn't Success
            if(!loaded_posts_data.success) {
                Alert.alert(t("Chyba"), loaded_posts_data.message) // Shows The Alert
                return
            }

            if(is_refresh) setPosts(loaded_posts_data.posts || []) // Sets The Posts
            
            else {
                setPosts(previous_posts => {
                    const existing_post_ids:Set<string> = new Set(previous_posts.map((one_post:Post) => one_post.id)) // Gets The Existing Post IDs
                    const new_posts:Post[] = (loaded_posts_data.posts as Post[]).filter((one_post:Post) => !existing_post_ids.has(one_post.id)) // Gets The New Unique Posts
                
                    return [...previous_posts, ...new_posts] // Returns The Combined Posts
                })
            }
    
            setHasNext(loaded_posts_data.has_next || false) // Sets The Has Next
            setPage(page) // Sets The Page
        } 
        
        catch {
            setIsError(true) // Sets The Information That There Is An Error
            Alert.alert(t("Chyba"), t("Pri hľadaní príspevkov došlo k chybe.")) // Shows The Alert
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
    const loadMorePosts = ():void => {
        if(has_next && !are_posts_loading) loadPosts(page + 1) // Loads Posts
    }

    // Function For Get The Friends
    const getFriends = async ():Promise<void> => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const loaded_friends_response:Response = await fetch(`${API_URL}/get-friends/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })
    
            // If The Response Isn't Success
            if(!loaded_friends_response.ok) {
                Alert.alert(t("Chyba"), t("Pri získavaní sledovaných užívateľov došlo k chybe.")) // Shows The Alert
                return
            }

            const loaded_friends_data:LoadedFriendsResponse = await loaded_friends_response.json() // Gets The Toggle Post Save Data

            // If The Response Isn't Success
            if(!loaded_friends_data.success || !loaded_friends_data.following) {
                Alert.alert(t("Chyba"), loaded_friends_data.message) // Shows The Alert
                return
            }
            
            setFriends(loaded_friends_data.following) // Sets Friends
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri získavaní sledovaných užívateľov došlo k chybe.")) // Shows The Alert
        }
    }

    // Initializes The Get Logged In User
    useEffect(() => {
        getFriends() // Gets The Logged In User
    }, [])

    return (
        <BottomSheetModalProvider>
            <View className="feed" style={styles.feed}>
                <SearchPosts 
                    onSearchTextUpdate={(search_text:string) => setSearchText(search_text)}
                    search_text={search_text}
                />

                {processing_posts.length > 0 && logged_in_user && (
                    <FlatList
                        data={processing_posts}
                        extraData={tracked_tasks}
                        keyExtractor={(one_processing_post:ProcessingPost) => one_processing_post.id.toString()}

                        renderItem={({ item }) => (
                            <ProcessingPostContainer 
                                processing_post={item} 
                                tracked_tasks={tracked_tasks}
                                logged_in_user={logged_in_user}
                                onPostsUpdate={(posts:Post[]) => setPosts(posts)}
                                posts={posts}
                                onProcessingPostsUpdate={(processing_posts:ProcessingPost[]) => onProcessingPostsUpdate(processing_posts)}
                                processing_posts={processing_posts}
                                onSelectedPostUpdate={(post:Post|null) => setSelectedPost(post)}
                                selected_post={selected_post}
                                onSelectedProcessingPostUpdate={(processing_post:ProcessingPost|null) => setSelectedProcessingPost(processing_post)}
                                selected_processing_post={selected_processing_post}
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
                                    onProcessingPostsUpdate={(processing_posts:ProcessingPost[]) => onProcessingPostsUpdate(processing_posts)}
                                    processing_posts={processing_posts}
                                    onLoggedInUserUpdate={(logged_in_user:LoggedInUser) => setLoggedInUser(logged_in_user)}
                                    are_posts_loading={are_posts_loading}
                                    onSelectedPostUpdate={(post:Post|null) => setSelectedPost(post)}
                                    selected_post={selected_post}
                                    onSelectedProcessingPostUpdate={(processing_post:ProcessingPost|null) => setSelectedProcessingPost(processing_post)}
                                    selected_processing_post={selected_processing_post}
                                    onSelectedPostCommentUpdate={(selected_post_comment:Comment|null) => setSelectedPostComment(selected_post_comment)}
                                    selected_post_comment={selected_post_comment}
                                    friends={friends}
                                />
                            )}

                            onEndReached={loadMorePosts}
                            onEndReachedThreshold={0.5}

                            ListFooterComponent={
                                are_posts_loading ? (
                                    <View style={{ padding: 20, alignItems: "center" }}>
                                        <ActivityIndicator size="small" color={SECONDARY_COLOR} />
                                    </View>
                                ) : <></>
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
                            <Text className="feed_report" style={styles.feed_report}>{are_posts_loading ? t("Načítavam...") : t("Videli ste všetky príspevky.")}</Text>
                        )}
                    </>
                )}

                {posts.length === 0 && !is_error && (<Text className="feed_report" style={styles.feed_report}>{t("Nenašli sa žiadne príspevky.")}</Text>)}
                {is_error && (<Text className="feed_report" style={styles.feed_report}>{t("Pri hľadaní príspevkov došlo k chybe.")}</Text>)}
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
