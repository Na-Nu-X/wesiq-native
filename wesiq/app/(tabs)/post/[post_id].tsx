import { useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, ScrollView, Alert, View, Pressable, Text, Switch } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import LoginFormDialog from "@/components/LoginFormDialog"
import { SafeAreaView } from "react-native-safe-area-context"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import Banner from "@/components/Banner"
import { useTranslation } from "react-i18next"
import { useLocalSearchParams } from "expo-router"
import { PostContainer } from "@/components/pages/post/PostContainer"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, GREEN_COLOR, MAIN_COLOR, RED_COLOR, transparentize } from "@/constants/colors"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { BasicResponse, Post, Comment } from "@/components/pages/community/Feed"

interface LoadedPostResponse {
  success:boolean,
  post?:Post,
  message:string
}

export default function HomeScreen() {
    const { t } = useTranslation() // Initializes The Translations

    const { post_id } = useLocalSearchParams<{ post_id:string }>() // Gets The Post ID

    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [post, setPost] = useState<Post|null>(null) // Stores The Post
    const [is_post_loading, setIsPostLoading] = useState<boolean>(false) // Stores The Information If Post Is Loading

    const post_properties = useRef<BottomSheetModal>(null) // Stores The Post Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [post_properties_sheet, setPostPropertiesSheet] = useState<"main"|"report"|"settings"|"delete">("main") // Stores The Active Post Properties Sheet
    const [selected_post, setSelectedPost] = useState<Post|null>(null) // Stores The Selected Post

    const post_comment_properties = useRef<BottomSheetModal>(null) // Stores The Post Comment Properties
    const [post_comment_properties_sheet, setPostCommentPropertiesSheet] = useState<"main"|"report"|"delete">("main") // Stores The Active Post Comment Properties Sheet
    const [selected_post_comment, setSelectedPostComment] = useState<Comment|null>(null) // Stores The Selected Post Comment

    // Function For Get The Post
    const getPost = async (post_id:string):Promise<void> => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token

            // Sends The GET Request To The Server
            const loaded_post_response:Response = await fetch(`${API_URL}/get-post/${post_id}/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_post_response.ok) {
                Alert.alert(t("Chyba"), t("Pri získavaní profilu užívateľa došlo k chybe.")) // Shows The Alert
                return
            }

            const loaded_post_data:LoadedPostResponse = await loaded_post_response.json() // Gets The Profile Data

            // If The Response Isn't Success
            if(!loaded_post_data.success || !loaded_post_data.post) {
                Alert.alert(t("Chyba"), loaded_post_data.message) // Shows The Alert
                return
            }

            setPost(loaded_post_data.post)
        }
    
        catch {
            Alert.alert(t("Chyba"), t("Pri získavaní profilu užívateľa došlo k chybe.")) // Shows The Alert
        }
    }
    
    // Initializes The Load Of The Post
    useEffect(() => {
        if(post_id) getPost(post_id) // Loads The Post
    }, [post_id])

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
                Alert.alert(t("Chyba"), t("Nahlásenie nie je možné odoslať bez prihlásenia.")) // Shows The Alert
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
                Alert.alert(t("Chyba"), t("Pri odosielaní nahlásenia došlo k chybe.")) // Shows The Alert
                return
            }

            const reported_post_data:BasicResponse = await reported_post_response.json() // Gets The Reported Post Data

            // If The Response Isn't Success
            if(!reported_post_data.success) {
                Alert.alert(t("Chyba"), reported_post_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert(t("Úspech"), reported_post_data.message) // Shows The Alert
                hidePostProperties() // Closes The Post Properties
                return
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri odosielaní nahlásenia došlo k chybe.")) // Shows The Alert
        }
    }

    // Function For Edit The Post Settings
    const editPostSettings = async (post_id:number, setting:string, action:boolean):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Príspevok nie je možné upraviť bez prihlásenia.")) // Shows The Alert
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
                Alert.alert(t("Chyba"), t("Pri úprave príspevku došlo k chybe.")) // Shows The Alert
                return
            }

            const edited_post_settings_data:BasicResponse = await edited_post_settings_response.json() // Gets The Edited Post Settings Data

            // If The Response Isn't Success
            if(!edited_post_settings_data.success) {
                Alert.alert(t("Chyba"), edited_post_settings_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert(t("Úspech"), edited_post_settings_data.message) // Shows The Alert

                // Sets The Post
                setPost((previous_post:Post|null) => {
                    if(!previous_post) return null
                
                    return {
                        ...previous_post,
                        [setting]: action
                    }
                })

                setSelectedPost(previous_selected_post => previous_selected_post ? { ...previous_selected_post, [setting]: action } : null) // Sets The Selected Post

                return
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri úprave príspevku došlo k chybe.")) // Shows The Alert
        }
    }

    // Function For Delete The Post
    const deletePost = async (post_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Príspevok nie je možné odstrániť bez prihlásenia.")) // Shows The Alert
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
                Alert.alert(t("Chyba"), t("Pri odstraňovaní príspevku došlo k chybe.")) // Shows The Alert
                return
            }

            const deleted_post_data:BasicResponse = await deleted_post_response.json() // Gets The Deleted Post Data

            // If The Response Isn't Success
            if(!deleted_post_data.success) {
                Alert.alert(t("Chyba"), deleted_post_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert(t("Úspech"), deleted_post_data.message) // Shows The Alert
               
                setPost(null) // Sets The Post
                setSelectedPost(null) // Sets The Selected Post
                hidePostProperties() // Closes The Post Properties

                return
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri odstraňovaní príspevku došlo k chybe.")) // Shows The Alert
        }
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
                Alert.alert(t("Chyba"), t("Pri odosielaní nahlásenia došlo k chybe.")) // Shows The Alert
                return
            }

            const reported_post_comment_data:BasicResponse = await reported_post_comment_response.json() // Gets The Reported Post Comment Data

            // If The Response Isn't Success
            if(!reported_post_comment_data.success) {
                Alert.alert(t("Chyba"), reported_post_comment_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert(t("Úspech"), reported_post_comment_data.message) // Shows The Alert
                hidePostCommentProperties() // Closes The Post Comment Properties
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
                Alert.alert(t("Chyba"), t("Pri odstraňovaní komentáru došlo k chybe.")) // Shows The Alert
                return
            }

            const deleted_post_comment_data:BasicResponse = await deleted_post_comment_response.json() // Gets The Deleted Post Comment Data

            // If The Response Isn't Success
            if(!deleted_post_comment_data.success) {
                Alert.alert(t("Chyba"), deleted_post_comment_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert(t("Úspech"), deleted_post_comment_data.message) // Shows The Alert

                // Sets The Posts
                if(selected_post_comment) {
                    // Sets The Post
                    setPost((previous_post:Post|null) => {
                        if(!previous_post) return null

                        const has_comment:boolean = previous_post.comments?.some(one_post_comment => one_post_comment.id === selected_post_comment.id) || false // Checks If The Post Has The Selected Comment
                
                        if(has_comment) {
                            const previous_post_comments:Comment[] = previous_post.comments || [] // Gets The Previous Post Comments
                
                            return {
                                ...previous_post,
                                comments: previous_post_comments.filter((one_post_comment:Comment) => one_post_comment.id !== selected_post_comment.id), // Filters Out Deleted Comment
                                comments_amount: (previous_post.comments_amount || 0) - 1 // Decreases The Comments Amount
                            }
                        }
                
                        return previous_post // Returns The Unchanged Post
                    })
                }

                setSelectedPostComment(null) // Sets The Selected Post Comment
                hidePostCommentProperties() // Closes The Post Comment Properties
                // if(reply_container && reply_container.children.length === 0) deleteShowRepliesIcon(reply_container) // Deletes The Show Replies Icon From The Comment If There Aren't Any Replies Left

                return
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri odstraňovaní komentáru došlo k chybe.")) // Shows The Alert
        }
    }

    return (
        <BackgroundContainer style={{ flex: 1 }}>
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
                <LoginFormDialog 
                    visible={active_form==="login_form"}
                    onChangeActiveForm={() => setActiveForm("registration_form")}
                    onClose={() => setActiveForm(null)}
                    onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
                />

                <RegistrationFormDialog
                    visible={active_form==="registration_form"}
                    onChangeActiveForm={() => setActiveForm("login_form")}
                    onClose={() => setActiveForm(null)}
                    onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
                />

                {post && (
                    <BottomSheetModalProvider>
                        <View
                            style={{
                                flex: 1,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <PostContainer 
                                post={post}
                                logged_in_user={logged_in_user}
                                onPostUpdate={(post:Post) => setPost(post)}
                                onShowPostProperties={(posts:Post) => showPostProperties(posts)}
                                onShowPostCommentProperties={(comment:Comment) => showPostCommentProperties(comment)}
                                onLoggedInUserUpdate={(logged_in_user:LoggedInUser) => setLoggedInUser(logged_in_user)}
                                is_post_loading={is_post_loading}
                            />

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

                                                            <Text style={styles.sheet_text}>{t("Nahlásiť")}</Text>
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

                                                            <Text style={styles.sheet_text}>{t("Upraviť")}</Text>
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
                                                                    { color: selected_post.user.id !== logged_in_user.id && (logged_in_user.role === "developer" || logged_in_user.role === "admin") ? RED_COLOR : BLUE_COLOR } // Shows The Red Text If The Logged In User Is Developer Or Admin
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

                                                        <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Spam")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Obťažovanie")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Nenávistné prejavy")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Dezinformácie")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Explicitný obsah")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Iné")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Späť")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
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
                                                        {t("Naozaj chcete vymazať Váš príspevok?")}
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

                                                        <Text style={styles.sheet_text}>{t("Vymazať")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Zrušiť")}</Text>
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

                                                            <Text style={styles.sheet_text}>{t("Nahlásiť")}</Text>
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
                                                                {t("Vymazať")}
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

                                                        <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Spam")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Obťažovanie")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Nenávistné prejavy")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Dezinformácie")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Explicitný obsah")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Iné")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Späť")}</Text>
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
                                                        {t("Naozaj chcete vymazať Váš komentár?")}
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

                                                        <Text style={styles.sheet_text}>{t("Vymazať")}</Text>
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

                                                        <Text style={styles.sheet_text}>{t("Zrušiť")}</Text>
                                                    </Pressable>
                                                </View>
                                            )}
                                        </View>
                                    ) : null}
                                </BottomSheetView>
                            </BottomSheetModal>
                        </View>
                    </BottomSheetModalProvider>
                )}
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