import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useMemo, useRef, useState } from "react"
import Banner from "@/components/Banner"
import { useLocalSearchParams } from "expo-router"
import { API_URL, DOMAIN } from "@/constants/general"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTranslation } from "react-i18next"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import ProfilePictureLink from "@/components/ProfilePictureLink"
import { TextInput } from "react-native-gesture-handler"
import Icon from "@/components/Icon"
import EmojiPicker from "rn-emoji-keyboard"
import Svg, { Path } from "react-native-svg"
import { getTimeAgo } from "@/utils/time"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import { DynamicImage } from "@/components/pages/community/DynamicImage"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"
import type { Comment } from "@/components/Feed"
import type { AddedComment } from "@/components/pages/community/PostContainer"
import type { BasicResponse } from "@/components/Feed"

interface LoadedArticleResponse {
    success:boolean,
    article:LoadedArticle,
    message:string
}

interface LoadedArticle {
    id:number,
    title:string,
    description:string,
    image_name:string|null,
    html_filename:string|null,
    link:string,
    categories:string[],
    visitors:number,
    creation_time:string,
    difficulty:number,
    time_to_learn:number,
    time_to_learn_text:string,
    rarity:number,
    strength:number,
    technique:number,
    average_rating:number,
    given_rating:number,
    comments_amount:number,
    comments:Comment[]|null
}

interface loadedArticleCommentsResponse {
    success:boolean,
    has_next:boolean,
    visible_comments?:Comment[],
    message:string
}

interface AddedArticleCommentResponse {
    success:boolean,
    comment?:AddedComment,
    message:string
}

export default function ProfileScreen() {
    const { t } = useTranslation() // Initializes The Translations
    
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const { article } = useLocalSearchParams<{ article:string }>() // Gets The Searched Article
    const [loaded_article, setLoadedArticle] = useState<LoadedArticle|null>(null) // Stores The Loaded Article

    const [article_comments_page, setArticleCommentsPage] = useState<number>(1) // Stores The Current Article Comments Page Number
    const [has_next_article_comments, setHasNextArticleComments] = useState<boolean>(true) // Stores The Information If There Are More Article Comments Available
    const [are_article_comments_loading, setAreArticleCommentsLoading] = useState<boolean>(false) // Stores The Information If Article Comments Are Loading
    const [is_comment_forum_open, setIsCommentForumOpen] = useState<boolean>(false) // Stores The Information If The Comment Forum Is Open

    const [comment, setComment] = useState<string>("") // Stores The Written Comment
    const MAX_COMMENT_LENGTH:number = 100 // Sets The Maximum Comment Length

    const [selected_parent_comment, setSelectedParentComment] = useState<Comment|null>(null) // Stores The Selected Parent Comment
    const [expanded_comments, setExpandedComments] = useState<number[]>([]) // Stores The IDs Of Expanded Article Comments (Visible Replies)

    const [is_emoji_picker_open, setIsEmojiPickerOpen] = useState<boolean>(false) // Stores The Information If The Emoji Picker Is Open

    const article_comment_properties = useRef<BottomSheetModal>(null) // Stores The Article Comment Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [article_comment_properties_sheet, setArticleCommentPropertiesSheet] = useState<"main"|"report"|"delete">("main") // Stores The Active Article Comment Properties Sheet
    const [selected_article_comment, setSelectedArticleComment] = useState<Comment|null>(null) // Stores The Selected Article Comment
    
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

    // Function For Get The Article
    const getArticle = async (article:string):Promise<void> => {
        try {
            // Sends The GET Request To The Server
            const loaded_article_response:Response = await fetch(`${API_URL}/get-article/${article}/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }
            })

            // If The Response Isn't Success
            if(!loaded_article_response.ok) {
                Alert.alert(t("Chyba"), t("Pri získavaní článku došlo k chybe.")) // Shows The Alert
                return
            }

            const loaded_article_data:LoadedArticleResponse = await loaded_article_response.json() // Gets The Article Data

            // If The Response Isn't Success
            if(!loaded_article_data.success) {
                Alert.alert(t("Chyba"), loaded_article_data.message) // Shows The Alert
                return
            }
            
            console.log(loaded_article_data)
            setLoadedArticle(loaded_article_data.article) // Sets The Loaded Article
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri získavaní článku došlo k chybe.")) // Shows The Alert
        }
    }

    // Initializes The Load Of The Article
    useEffect(() => {
        getArticle(article) // Gets The Article
    }, [article])

    // Function For Get The Difficulty Label
    const getDifficultyLabel = ():string => {
        let difficulty_label:string = t("obtiažnosť: ") // Stores The Difficulty Label
    
        if(loaded_article) {
            if(loaded_article.difficulty <= 10) difficulty_label += t("jednoduchá")
            else if(loaded_article.difficulty <= 30) difficulty_label += t("stredná")
            else if(loaded_article.difficulty <= 60) difficulty_label += t("náročná")
            else if(loaded_article.difficulty <= 90) difficulty_label += t("veľmi náročná")
            else difficulty_label += t("elitná")
        }

        return difficulty_label // Returns The Difficulty Label
    }

    // Function For Get The Time To Learn Label
    const getTimeToLearnLabel = ():string => {
        let time_to_learn_label:string = t("doba učenia: ") // Stores The Time To Learn Label
    
        if(loaded_article) {
            if(loaded_article.time_to_learn_text == "2 - 6 months") time_to_learn_label += t("2 - 6 mesiacov")
        }

        return time_to_learn_label // Returns The Time To Learn Label
    }

    // Function For Get The Rarity Label
    const getRarityLabel = ():string => {
        let rarity_label:string = t("vzácnosť: ") // Stores The Rarity Label
    
        if(loaded_article) {
            if(loaded_article.rarity <= 10) rarity_label += t("bežné")
            else if(loaded_article.rarity <= 30) rarity_label += t("nevídané")
            else if(loaded_article.rarity <= 60) rarity_label += t("vzácne")
            else if(loaded_article.rarity <= 90) rarity_label += t("epické")
            else rarity_label += t("legendárne")
        }

        return rarity_label // Returns The Rarity Label
    }

    // Function For Get Article Comments
    const getArticleComments = async (page:number = 1, is_refresh:boolean = false, article_id:number) => {
        if(are_article_comments_loading || (!has_next_article_comments && !is_refresh)) return

        setAreArticleCommentsLoading(true) // Stores The Information That Article Are Loading

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const loaded_article_comments_response:Response = await fetch(`${API_URL}/get-article-comments/?article_id=${article_id}&page=${page}`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_article_comments_response.ok) {
                Alert.alert(t("Chyba"), t("Pri hľadaní komentárov došlo k chybe.")) // Shows The Alert
                return
            }

            const loaded_article_comments_data:loadedArticleCommentsResponse = await loaded_article_comments_response.json() // Gets The Loaded Article Comments Data

            // If The Response Isn't Success
            if(!loaded_article_comments_data.success) {
                Alert.alert(t("Chyba"), loaded_article_comments_data.message) // Shows The Alert
                return
            }

            if(is_refresh) {
                if(!loaded_article) return

                // Sets The Article
                setLoadedArticle({
                    ...loaded_article,
                    comments: loaded_article_comments_data.visible_comments || [] // Sets The Article Comments
                })
            }
            
            else {
                if(!loaded_article) return

                const previous_article_comments:Comment[] = loaded_article.comments || [] // Gets The Previous Article Comments
                const incoming_article_comments:Comment[] = (loaded_article_comments_data.visible_comments as Comment[]) || [] // Gets The Incoming Article Comments
                const existing_article_comments_ids:Set<number> = new Set(previous_article_comments.map((one_comment:Comment) => one_comment.id)) // Gets The Existing Article Comments IDs
                const new_article_comments:Comment[] = incoming_article_comments.filter((one_comment:Comment) => !existing_article_comments_ids.has(one_comment.id)) // Gets The New Unique Article Comments

                // Sets The Article
                setLoadedArticle({
                    ...loaded_article,
                    comments: is_refresh ? incoming_article_comments : [...previous_article_comments, ...new_article_comments] // Returns The Combined Article Comments
                })
            }
    
            setHasNextArticleComments(loaded_article_comments_data.has_next || false) // Sets The Has Next Article Comments
            setArticleCommentsPage(page) // Sets The Article Comments Page

            console.log(loaded_article_comments_data.visible_comments)
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri hľadaní komentárov došlo k chybe.")) // Shows The Alert
        } 
        
        finally {
            setAreArticleCommentsLoading(false) // Stores The Information That Article Comments Aren't Loading
        }
    }

    // Initializes The Load Of The Article Comments
    useEffect(() => {
        if(loaded_article) getArticleComments(1, false, loaded_article.id) // Gets The Article Comments
    }, [loaded_article])

    // Function For Load More Article Comments
    const loadMoreArticleComments = (article_id:number) => {
        if(has_next_article_comments && !are_article_comments_loading) getArticleComments(article_comments_page + 1, false, article_id) // Loads Article Comments
    }

    // Function For Handle The Emoji Select
    const handleEmojiSelect = (emoji:{ emoji:string }) => {
        if(comment.length >= MAX_COMMENT_LENGTH) return
        setComment((previous_comment) => previous_comment + emoji.emoji) // Sets The Comment
    }

    // Function For Load Comments
    const loadComments = () => {
        if(loaded_article) {
            const root_comments:Comment[] = (loaded_article.comments || []).filter((one_comment:Comment) => one_comment.level === 1 || one_comment.parent_id === null) // Gets The Root Comments
            return root_comments.map((root_comment:Comment) => createCommentHTML(root_comment)) // Creates The Comment HTML
        }
    }

    // Function For Toggle Reply On Comment
    const toggleReplyOnComment = (comment:Comment):void => {
        if(selected_parent_comment) setSelectedParentComment(null) // Sets Selected Parent Comment
        else setSelectedParentComment(comment) // Sets Selected Parent Comment
    }

    // Function For Toggle Visibility Of The Comment Replies
    const toggleShowReplies = (comment:Comment):void => {
        setExpandedComments((previous_comments:number[]) => {
            if(previous_comments.includes(comment.id)) return previous_comments.filter(id => id !== comment.id) // Hides The Replies
            else return [...previous_comments, comment.id] // Shows The Replies
        })
    }

    const createCommentHTML = (one_article_comment:Comment) => {
        if(loaded_article) {
            const children_comments:Comment[] = (loaded_article.comments || []).filter((one_article_comment_2:Comment) => one_article_comment_2.parent_id === one_article_comment.id) // Gets The Children Comments
            const has_replies:boolean = children_comments.length > 0 // Checks If The Comment Has Any Replies
            const is_expanded:boolean = expanded_comments.includes(one_article_comment.id) // Checks If The Comment Has Expanded Replies
        
            return (
                <View 
                    key={one_article_comment.id}
                    className="one_comment" 
                    style={styles.one_comment}
                >
                    <View className="comment_container" style={styles.comment_container}>
                        <View className="user" style={styles.user}>
                            <ProfilePictureLink 
                                user_id={one_article_comment.user.id} 
                                user_username={one_article_comment.user.username}
                                user_profile_picture_name={one_article_comment.user.profile_picture_name || null} 
                                user_subscription={one_article_comment.user.subscription?.is_active || false} 
                                label={t("Zobraziť užívateľa")} 
                            />
                            
                            <Text 
                                className="username" 
    
                                style={{ 
                                    color: SECONDARY_COLOR, 
                                    fontWeight: "bold",
                                }}
                            >
                                {one_article_comment.user.username}
                            </Text>
        
                            <View 
                                className="show_comment_properties_button"
                                accessibilityLabel={t("Viac...")} 
                                
                                style={{ 
                                    marginLeft: "auto", 
                                    marginRight: 10,
                                }}
                            >
                                <Icon
                                    icon_name="ellipsis-vertical"
                                    onPress={() => showArticleCommentProperties(one_article_comment)}
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
                                {one_article_comment.comment}
                            </Text>
        
                            <View className="likes_container">
                                <View className="likes" accessibilityLabel={t("Páči sa mi...")} style={styles.comment_likes}>
                                    <Icon
                                        icon_name="heart"
                                        onPress={() => toggleArticleCommentLike(one_article_comment.id)}
                                        is_regular={!Boolean(logged_in_user && one_article_comment.likes_from_users.includes(logged_in_user.id))} // Shows The Empty Or Filled Heart Icon
                                        color={Boolean(logged_in_user && one_article_comment.likes_from_users.includes(logged_in_user.id)) ? RED_COLOR : BLUE_COLOR} // Shows The Red Or Blue Colored Heart Icon
                                        pressed_color={RED_COLOR}
                                    />
    
                                    <Text 
                                        className="likes_counter" 
                                        style={styles.comment_likes_counter}
                                    >
                                        {one_article_comment.likes}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
    
                    <View className="interactions" style={styles.interactions}>
                        {one_article_comment.level < 5 && (
                            <View className="reply" accessibilityLabel={t("Odpovedať...")}>
                                <Icon
                                    icon_name={selected_parent_comment && selected_parent_comment.id === one_article_comment.id ? "comment-slash" : "comment"}
                                    onPress={() => toggleReplyOnComment(one_article_comment)}
                                    is_regular={!(selected_parent_comment && selected_parent_comment.id === one_article_comment.id)}
                                />
                            </View>
                        )}
    
                        {has_replies && (
                            <View className="show_replies" accessibilityLabel={t("Zobraziť odpovede...")}>
                                <Icon
                                    icon_name={is_expanded ? "angle-up" : "angle-down"}
                                    onPress={() => toggleShowReplies(one_article_comment)}
                                />
                            </View>
                        )}
    
                        <View className="date" accessibilityLabel={t("Dátum zverejnenia")} style={styles.date}>
                            <Text style={styles.date_text}>{getTimeAgo(one_article_comment.creation_time)}</Text>
                        </View>
                    </View>
                    
                    {is_expanded && has_replies && (
                        <View className="reply_container" style={styles.reply_container}>
                            {children_comments.map((one_child_comment:Comment) => createCommentHTML(one_child_comment))}
                        </View>
                    )}
                </View>
            )
        }
    }

    // Function For Toggle Article Comment Like
    const toggleArticleCommentLike = async (comment_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Označenie páči sa mi to nie je možné zmeniť bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const toggle_article_comment_like_response:Response = await fetch(`${API_URL}/toggle-article-comment-like/`, {
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
            if(!toggle_article_comment_like_response.ok) {
                Alert.alert(t("Chyba"), t("Pri zmene označenia páči sa mi to došlo k chybe.")) // Shows The Alert
                return
            }

            const toggle_article_comment_like_data:BasicResponse = await toggle_article_comment_like_response.json() // Gets The Toggle Article Comment Like Data

            // If The Response Isn't Success
            if(!toggle_article_comment_like_data.success) {
                Alert.alert(t("Chyba"), toggle_article_comment_like_data.message) // Shows The Alert
                return
            }
            
            else {
                if(!loaded_article) return

                // Sets The Article
                setLoadedArticle((previous_article:LoadedArticle|null) => {
                    if(!previous_article || !previous_article.comments) return previous_article

                    return {
                        ...previous_article,

                        comments: previous_article.comments.map((one_article_comment:Comment) => {
                            if(one_article_comment.id === comment_id) {
                                const has_like:boolean = one_article_comment.likes_from_users.includes(logged_in_user.id) // Checks If The User Had Already Liked The Article Comment

                                // Updates The Article Comment Likes Amount And Stored Likes From Users
                                return {
                                    ...one_article_comment,

                                    likes: has_like ? one_article_comment.likes - 1 : one_article_comment.likes + 1,
                                    likes_from_users: has_like 
                                        ? one_article_comment.likes_from_users.filter((id:number) => id !== logged_in_user.id) 
                                        : [...one_article_comment.likes_from_users, logged_in_user.id]
                                }
                            }

                            return one_article_comment; // Returns The Unchanged Article Comment
                        })
                    }
                })
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri zmene označenia páči sa mi to došlo k chybe.")) // Shows The Alert
        }
    }

    // Function For Add Comment
    const addComment = async (article_id:number, comment:string, parent_id:number|null):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Komentár nie je možné pridať bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const added_article_comment_response:Response = await fetch(`${API_URL}/add-article-comment/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    article_id: article_id,
                    comment: comment,
                    parent_id: parent_id
                })
            })

            // If The Response Isn't Success
            if(!added_article_comment_response.ok) {
                Alert.alert(t("Chyba"), t("Pri pridávaní komentáru došlo k chybe.")) // Shows The Alert
                return
            }

            const added_article_comment_data:AddedArticleCommentResponse = await added_article_comment_response.json() // Gets The Added Article Comment Data

            // If The Response Isn't Success
            if(!added_article_comment_data.success || !added_article_comment_data.comment) {
                Alert.alert(t("Chyba"), added_article_comment_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert(t("Úspech"), added_article_comment_data.message) // Shows The Alert

                // Stores The New Comment Data
                const new_comment:Comment = {
                    id: added_article_comment_data.comment.id,

                    user:{
                        id: added_article_comment_data.comment.user.id,
                        first_name: logged_in_user.first_name,
                        last_name: logged_in_user.last_name,
                        username: added_article_comment_data.comment.user.username,
                        profile_picture_name: added_article_comment_data.comment.user.profile_picture_name,
                        subscription:added_article_comment_data.comment.user.subscription
                    },

                    comment: comment,
                    likes: 0,
                    likes_from_users: [],
                    creation_time: added_article_comment_data.comment.creation_time,
                    parent_id: parent_id,
                    reports_from_users: [],
                    level: added_article_comment_data.comment.level
                }

                // Sets The Article
                setLoadedArticle((previous_article:LoadedArticle|null) => {
                    if(!previous_article || !previous_article.comments) return previous_article

                    const previous_article_comments:Comment[] = previous_article.comments || [] // Gets The Previous Article Comments

                    return {
                        ...previous_article,
                        comments: [...previous_article_comments, new_comment],
                        comments_amount: (previous_article.comments_amount || 0) + 1 // Increases The Comments Amount
                    }
                })

                setComment("") // Sets The Comment
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri pridávaní komentáru došlo k chybe.")) // Shows The Alert
        }
    }

    // Function For Show The Article Comment Properties
    const showArticleCommentProperties = (comment:Comment):void => {
        setSelectedArticleComment(comment) // Sets The Selected Article Comment
        article_comment_properties.current?.present() // Shows The Article Comment Properties
    }

    // Function For Close The Article Comment Properties
    const hideArticleCommentProperties = ():void => {
        setSelectedArticleComment(null) // Sets The Selected Article Comment
        article_comment_properties.current?.dismiss() // Hides The Article Properties
    }

    // Function For Handle Article Comment Properties Sheet Switching
    const handleArticleCommentPropertiesChanges = (index:number) => {
        if(index === -1) setArticleCommentPropertiesSheet("main") // Sets The Article Comment Properties Sheet To Default
    }

    // Function For Report The Comment
    const reportComment = async (comment_id:number, reason:string) => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Nahlásenie nie je možné odoslať bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const reported_article_comment_response:Response = await fetch(`${API_URL}/report-article-comment/`, {
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
            if(!reported_article_comment_response.ok) {
                Alert.alert(t("Chyba"), t("Pri odosielaní nahlásenia došlo k chybe.")) // Shows The Alert
                return
            }

            const reported_article_comment_data:BasicResponse = await reported_article_comment_response.json() // Gets The Reported Article Comment Data

            // If The Response Isn't Success
            if(!reported_article_comment_data.success) {
                Alert.alert(t("Chyba"), reported_article_comment_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert(t("Úspech"), reported_article_comment_data.message) // Shows The Alert
                hideArticleCommentProperties() // Closes The Article Comment Properties
                return
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri odosielaní nahlásenia došlo k chybe.")) // Shows The Alert
        }
    }

    // Function For Delete The Comment
    const deleteComment = async (comment_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Komentár nie je možné odstrániť bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const deleted_article_comment_response:Response = await fetch(`${API_URL}/delete-article-comment/`, {
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
            if(!deleted_article_comment_response.ok) {
                Alert.alert(t("Chyba"), t("Pri odstraňovaní komentáru došlo k chybe.")) // Shows The Alert
                return
            }

            const deleted_article_comment_data:BasicResponse = await deleted_article_comment_response.json() // Gets The Deleted Article Comment Data

            // If The Response Isn't Success
            if(!deleted_article_comment_data.success) {
                Alert.alert(t("Chyba"), deleted_article_comment_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert(t("Úspech"), deleted_article_comment_data.message) // Shows The Alert

                // Sets The Article
                if(selected_article_comment) {
                    // Sets The Article
                    setLoadedArticle((previous_article:LoadedArticle|null) => {
                        if(!previous_article || !previous_article.comments) return previous_article

                        const previous_article_comments:Comment[] = previous_article.comments || [] // Gets The Previous Article Comments
                
                        return {
                            ...previous_article,
                            comments: previous_article_comments.filter((one_article_comment:Comment) => one_article_comment.id !== comment_id), // Filters Out Deleted Comment
                            comments_amount: (previous_article.comments_amount || 0) - 1 // Decreases The Comments Amount
                        }
                    })
                }

                setSelectedArticleComment(null) // Sets The Selected Article Comment
                hideArticleCommentProperties() // Closes The Article Comment Properties
                // if(reply_container && reply_container.children.length === 0) deleteShowRepliesIcon(reply_container) // Deletes The Show Replies Icon From The Comment If There Aren't Any Replies Left

                return
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri odstraňovaní komentáru došlo k chybe.")) // Shows The Alert
        }
    }

    return (
        <BackgroundContainer>
            <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
                <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                />

                <ScrollView 
                    className="content" 
                    style={styles.content} 
                    contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled" 
                    keyboardDismissMode="on-drag"
                >
                    <BottomSheetModalProvider>
                        {loaded_article && (
                            <>
                                <View className="article_banner" style={styles.article_banner}>
                                    <View 
                                        className="banner_image"

                                        style={{
                                            maxWidth: 400,
                                            width: "100%",
                                        }}
                                    >
                                        <DynamicImage 
                                            uri={`${DOMAIN}/static/images/articles/${loaded_article.image_name}`} 
                                            scale_by_aspect_ratio={true}
                                        />
                                    </View>

                                    <View className="banner_info" style={styles.banner_info}>
                                        <View className="article_opening" style={styles.article_opening}>
                                            <Text style={styles.title}>{loaded_article.title}</Text>
                                            <Text style={styles.description}>{loaded_article.description}</Text>
                                        </View>

                                        <View className="article_info">
                                            <View 
                                                className="rating"
                                                accessibilityLabel={loaded_article.average_rating === 0 ? t("Zatiaľ žiadne hodnotenia") : t("Priemerné hodnotenie {{ average_rating }}", { average_rating: loaded_article.average_rating })}

                                                style={{ 
                                                    flexDirection: "row", 
                                                    gap: 5,
                                                }}
                                            >
                                                {Array.from({ length: 5 }).map((_, index:number) => (
                                                    index < loaded_article.average_rating ? (
                                                        <View key={index} className="full" style={{ cursor: "pointer" }}>
                                                            <FontAwesome6
                                                                name="star"
                                                                size={25}
                                                                solid={true}
                                                                color={YELLOW_COLOR}
                                                                style={{ opacity: 1 }}
                                                            />
                                                        </View>
                                                    ) : (
                                                        <View key={index} className="empty" style={{ cursor: "pointer" }}>
                                                            <FontAwesome6
                                                                name="star"
                                                                size={25}
                                                                solid={true}
                                                                color={DARK_BLUE_COLOR}
                                                                style={{ opacity: 0.5 }}
                                                            />
                                                        </View>
                                                    )
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View className="exercise_statistics" style={styles.exercise_statistics}>
                                    <View 
                                        className="bar difficulty" 
                                        accessibilityLabel={getDifficultyLabel()}
                                        style={styles.bar}
                                    />

                                    <View 
                                        className="bar time_to_learn" 
                                        accessibilityLabel={getTimeToLearnLabel()}
                                        style={styles.bar}
                                    />

                                    <View 
                                        className="bar rarity" 
                                        accessibilityLabel={getRarityLabel()}
                                        style={styles.bar}
                                    />

                                    <View 
                                        className="bar strength" 
                                        accessibilityLabel={t("sila")}
                                        style={styles.bar}
                                    />

                                    <View 
                                        className="bar technique" 
                                        accessibilityLabel={t("technika")}
                                        style={styles.bar}
                                    />
                                </View>

                                <View className="article_content" style={styles.article_content}>
                                    {loaded_article.html_filename ? (
                                        <View>
                                            {/* {% include "partials/articles/"|add:article.html_filename %} */}
                                        </View>
                                    ) : (
                                        <Text>{t("Tento článok nie je ešte dokončený.")}</Text> 
                                    )}
                                </View>

                                {logged_in_user && (
                                    <View className="rating" style={styles.rating}>
                                        <View style={{ marginRight: 5 }}>
                                            <ProfilePictureLink 
                                                user_id={logged_in_user.id} 
                                                user_username={logged_in_user.username}
                                                user_profile_picture_name={logged_in_user.profile_picture_name || null} 
                                                user_subscription={logged_in_user.subscription?.is_active || false} 
                                                label={t("Môj účet")} 
                                            />
                                        </View>

                                        {Array.from({ length: 5 }).map((_, index:number) => (
                                            index < loaded_article.given_rating ? (
                                                <Pressable 
                                                    key={index} 
                                                    className="full" 
                                                    // onPress={}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <FontAwesome6
                                                        name="star"
                                                        size={25}
                                                        solid={true}
                                                        color={YELLOW_COLOR}
                                                        style={{ opacity: 1 }}
                                                    />
                                                </Pressable>
                                            ) : (
                                                <Pressable 
                                                    key={index} 
                                                    className="empty" 
                                                    // onPress={}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <FontAwesome6
                                                        name="star"
                                                        size={25}
                                                        solid={true}
                                                        color={LIGHT_BLUE_COLOR}
                                                        style={{ opacity: 0.5 }}
                                                    />
                                                </Pressable>
                                            )
                                        ))}
                                    </View>
                                )}

                                <View className="comment_forum" style={styles.comment_forum}>
                                    {/* <View className="heading">
                                        <View className="comments_counter">
                                            <FontAwesome6
                                                name="comment"
                                                size={20}
                                                solid={false}
                                                color={BLUE_COLOR}
                                            />

                                            <Text>{loaded_article.comments.length}</Text>
                                        </View>

                                        <Text>{t("Komentáre")}</Text>
                                    </View> */}

                                    <ScrollView 
                                        className="all_comments" 
                                        showsVerticalScrollIndicator={false}
                                        indicatorStyle="white"
                                        style={styles.all_comments}
                                    >
                                        {loaded_article.comments && loaded_article.comments.length > 0 && loadComments()} {/* Loads The Comments */}

                                        {has_next_article_comments && (
                                            <Pressable 
                                                className="show_more hidden" 
                                                onPress={() => loadMoreArticleComments(loaded_article.id)} 
                                                style={styles.show_more}
                                            >
                                                <Text style={{ color: LIGHT_BLUE_COLOR }}>{t("Zobraziť viac")}</Text>
                                            </Pressable>
                                        )}
                                    </ScrollView>

                                    <View className="write_comment_form" style={styles.write_comment_form}>
                                        <TextInput
                                            className="comment"
                                            textAlignVertical="top" 

                                            placeholder={
                                                selected_parent_comment 
                                                ? t("Odpoveď užívateľovi {{username}}", { username: selected_parent_comment.user.username}) 
                                                : t("Napísať komentár")
                                            }
                                                
                                            placeholderTextColor={LIGHT_BLUE_COLOR}

                                            accessibilityLabel={
                                                selected_parent_comment 
                                                ? t("Odpoveď užívateľovi {{username}}", { username: selected_parent_comment.user.username}) 
                                                : t("Napísať komentár")
                                            }

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
                                                <ProfilePictureLink 
                                                    user_id={logged_in_user.id} 
                                                    user_username={logged_in_user.username}
                                                    user_profile_picture_name={logged_in_user.profile_picture_name || null} 
                                                    user_subscription={logged_in_user.subscription?.is_active || false} 
                                                    label={t("Môj účet")} 
                                                />
                                            </View>
                                        )}

                                        <View 
                                            className="add_emoji"
                                            accessibilityLabel={t("Pridať emoji")}
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
                                                smileys_emotion: t("Smajlíky"),
                                                people_body: t("Ľudia"), 
                                                recently_used: t("Naposledy použité"),
                                                animals_nature: t("Zvieratá"),
                                                food_drink: t("Jedlo a nápoje"),
                                                activities: t("Aktivity"),
                                                travel_places: t("Cestovanie"),
                                                objects: t("Predmety"),
                                                symbols: t("Symboly"),
                                                flags: t("Vlajky"),
                                                search: t("Hľadať..."),
                                            }}
                                        />

                                        <Pressable 
                                            className="send" 
                                            accessibilityLabel={t("Odoslať komentár")}
                                            accessibilityRole="button"
                                            onPress={() => addComment(loaded_article.id, comment, selected_parent_comment ? selected_parent_comment.id : null)}
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

                                    <BottomSheetModal
                                        ref={article_comment_properties}
                                        snapPoints={snap_points}
                                        enablePanDownToClose={true}
                                        onChange={handleArticleCommentPropertiesChanges}
                                        containerStyle={{ zIndex: 9999 }}
                                    >
                                        <BottomSheetView style={{ padding: 20 }}>
                                            {selected_article_comment ? (
                                                <View className="comment_properties">
                                                    {article_comment_properties_sheet === "main" && (
                                                        <View style={styles.sheet_container}>
                                                            {/* If The Comment Doesn't Belong To The Logged In User The Report Option Will Be Shown */}
                                                            {logged_in_user && selected_article_comment.user.id !== logged_in_user.id && (
                                                                <Pressable
                                                                    className="show_report_comment_button"
                                                                    onPress={() => setArticleCommentPropertiesSheet("report")}
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

                                                                    <Text style={styles.sheet_text}>{t("Nahlásiť")}</Text>
                                                                </Pressable>
                                                            )}

                                                            {/* If The Comment Belongs To The Logged In User The Delete Option Will Be Shown */}
                                                            {logged_in_user && (selected_article_comment.user.id === logged_in_user.id || logged_in_user.role === "developer" || logged_in_user.role === "admin") && (
                                                                <Pressable
                                                                    className="delete_comment_button"
                                                                    onPress={() => setArticleCommentPropertiesSheet("delete")}
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
                                                                            { color: selected_article_comment.user.id !== logged_in_user.id && (logged_in_user.role === "developer" || logged_in_user.role === "admin") ? RED_COLOR : BLUE_COLOR }
                                                                        ]}
                                                                    >
                                                                        {t("Vymazať")}
                                                                    </Text>
                                                                </Pressable>
                                                            )}

                                                            <Pressable
                                                                className="hide_comment_properties_button"
                                                                onPress={hideArticleCommentProperties}
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

                                                                <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
                                                            </Pressable>
                                                        </View>
                                                    )}

                                                    {article_comment_properties_sheet === "report" && (
                                                        <View className="report" style={styles.sheet_container}>
                                                            <Pressable
                                                                onPress={() => reportComment(selected_article_comment.id, "spam")}
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

                                                                <Text style={styles.sheet_text}>{t("Spam")}</Text>
                                                            </Pressable>

                                                            <Pressable
                                                                onPress={() => reportComment(selected_article_comment.id, "harassment")}
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

                                                                <Text style={styles.sheet_text}>{t("Obťažovanie")}</Text>
                                                            </Pressable>

                                                            <Pressable
                                                                onPress={() => reportComment(selected_article_comment.id, "hate_speech")}
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

                                                                <Text style={styles.sheet_text}>{t("Nenávistné prejavy")}</Text>
                                                            </Pressable>

                                                            <Pressable
                                                                onPress={() => reportComment(selected_article_comment.id, "misinformation")}
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

                                                                <Text style={styles.sheet_text}>{t("Dezinformácie")}</Text>
                                                            </Pressable>

                                                            <Pressable
                                                                onPress={() => reportComment(selected_article_comment.id, "explicit_content")}
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

                                                                <Text style={styles.sheet_text}>{t("Explicitný obsah")}</Text>
                                                            </Pressable>

                                                            <Pressable
                                                                onPress={() => reportComment(selected_article_comment.id, "other")}
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

                                                                <Text style={styles.sheet_text}>{t("Iné")}</Text>
                                                            </Pressable>

                                                            <Pressable
                                                                className="back_report_button"
                                                                onPress={() => setArticleCommentPropertiesSheet("main")}
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

                                                                <Text style={styles.sheet_text}>{t("Späť")}</Text>
                                                            </Pressable>
                                                        </View>
                                                    )}

                                                    {article_comment_properties_sheet === "delete" && (
                                                        <View className="delete_comment" style={styles.sheet_container}>
                                                            <Text 
                                                                style={[
                                                                    styles.sheet_text, 
                                                                    { textAlign: "center" }
                                                                ]}
                                                            >
                                                                {t("Naozaj chcete vymazať Váš komentár?")}
                                                            </Text>

                                                            <Pressable
                                                                onPress={() => deleteComment(selected_article_comment.id)}
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

                                                                <Text style={styles.sheet_text}>{t("Vymazať")}</Text>
                                                            </Pressable>

                                                            <Pressable 
                                                                onPress={() => setArticleCommentPropertiesSheet("main")}
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

                                                                <Text style={styles.sheet_text}>{t("Zrušiť")}</Text>
                                                            </Pressable>
                                                        </View>
                                                    )}
                                                </View>
                                            ) : null}
                                        </BottomSheetView>
                                    </BottomSheetModal>
                                </View>
                            </>
                        )}

                        {/* 
                            <template class="report_template">
                                <div 
                                    class="report" 
                                    id=""
                                    popover
                                    style=""
                                >
                                    <button data-reason="spam"><span>{% translate "Spam" %}</span></button>
                                    <button data-reason="harassment"><span>{% translate "Obťažovanie" %}</span></button>
                                    <button data-reason="hate_speech"><span>{% translate "Nenávistné prejavy" %}</span></button>
                                    <button data-reason="misinformation"><span>{% translate "Dezinformácie" %}</span></button>
                                    <button data-reason="explicit_content"><span>{% translate "Explicitný obsah" %}</span></button>
                                    <button data-reason="other"><span>{% translate "Iné" %}</span></button>
                    
                                    <button 
                                        class="back_report_button"
                                        popovertarget="" 
                                        popovertargetaction="hide"
                                    >
                                        <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                                        <span>{% translate "Späť" %}</span>
                                    </button>
                                </div>
                            </template> */}
                    </BottomSheetModalProvider>
                </ScrollView>
            </SafeAreaView>
        </BackgroundContainer>
    )
}

const styles = StyleSheet.create({
    safe_area: {
        flex: 1,
    },
  
    content: {
        flex: 1,
    },

    article_banner: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: 20,
        backgroundColor: transparentize(SECONDARY_COLOR, 0.1)

        // .banner_image {
        //     img {
        //         display: block;
        //         max-width: 400px;
        //     }
        // }
    },

    banner_info: {
        justifyContent: "space-between",
        gap: 10,
        paddingVertical: 10,
        paddingRight: 20,
        color: MAIN_COLOR,
    },

    article_opening: {
        paddingLeft: 10,
        borderLeftWidth: 3,
        borderLeftColor: MAIN_COLOR,
        // animation: fadeIn 0.3s ease-in forwards;
    },

    title: {
        textAlign: "left",
        // font-family: $article-heading-font;
        fontSize: 45,
    },

    description: {
        // display: -webkit-box;
        // -webkit-box-orient: vertical;
        // -webkit-line-clamp: 5;
        // line-clamp: 5;
        textAlign: "left",
        overflow: "hidden",
    },

    exercise_statistics: {
        gap: 10,
        maxWidth: MAIN_WIDTH,
        marginVertical: 20,
        marginHorizontal: "auto",
        padding: 20,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    bar: {
        // --percentage: 0;
        // --max-width: 250px;
        // --hue: calc(120 - (var(--percentage) * 120 / 100)); // 120 - Easiest, 0 - Hardest

        position: "relative",
        // width: calc(var(--max-width) * var(--percentage) / 100);
        height: 5,
        // background-color: hsl(var(--hue), 80%, 50%);
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: width 0.3s ease, background-color 0.3s ease;
            
        // &:hover {
        //     background-color: hsl(var(--hue), 80%, 60%);
        //     cursor: pointer;
        // }
    },

    bar_label: {
        // content: attr(data-label);
        position: "absolute",
        top: "50%",
        right: -5,

        transform: [
            { translateX: "100%" },
            { translateY: "-50%" }
        ],

        lineHeight: 1,
        textAlign: "center",
        fontSize: 15,
        opacity: 0.5,
        // white-space: nowrap;
        color: LIGHT_BLUE_COLOR,
        pointerEvents: "none",
    },

    article_content: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        marginHorizontal: "auto",
        marginBottom: 50,
        paddingVertical: 50,
        paddingHorizontal: 30,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
        overflow: "hidden",

        //     &::before {
        //         @include glass_accent_bar;
        //     }
    
        //     section {
        //         transform: translateX(calc(-50%));
        //         opacity: 0;
        //         transition: transform 0.3s ease, opacity 0.3s ease;
    
        //         &.animate {
        //             transform: translateX(0%);
        //             opacity: 1;
        //         }
    
        //         &:first-of-type {
        //             p:first-of-type {
        //                 &::first-letter {
        //                     margin-right: 10px;
        //                     initial-letter: 2;
        //                 }
        //             }
        //         }
        //     }
    
        //     h3 {
        //         margin-bottom: 10px;
        //         text-align: center;
        //         font-size: 2em;
        //     }
    
        //     h4 {
        //         width: fit-content;
        //         margin-top: 20px;
        //         margin-bottom: 10px;
        //         font-size: 1.5em;
        //         border-bottom: 2px solid $secondary-color;
        //     }
    
        //     p {
        //         margin-bottom: 20px;
        //     }
    
        //     ul,
        //     ol {
        //         margin-left: 20px;
    
        //         li {
        //             margin-bottom: 10px;
        //         }
        //     }
    },

    rating: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        maxWidth: MAIN_WIDTH,
        marginHorizontal: "auto",
        marginBottom: 50,
    },

    comment_forum: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginHorizontal: "auto",
        paddingTop: 10,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: MEDIUM_BORDER_RADIUS,

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

    // .show_comment_properties_button {
    //     @include show_properties_button;
    //     margin-left: auto;
    //     margin-right: 10px;
    // }

    // .comment_properties,
    // .report,
    // .delete_comment {
    //     @include properties_menu;
    // }

    // .report {
    //     min-width: 200px;
    // }

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