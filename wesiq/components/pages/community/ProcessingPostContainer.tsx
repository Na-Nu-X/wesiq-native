import { useState, useRef, useMemo } from "react"
import { View, StyleSheet, Text, Alert, Pressable, Linking, Platform, Switch } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import Icon from "@/components/Icon"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import ProfilePictureLink from "@/components/ProfilePictureLink"
import { API_URL, DOMAIN } from "@/constants/general"
import { getTimeAgo } from "@/utils/time"
import { DynamicImage } from "@/components/pages/community/DynamicImage"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { AnimatedProgressBar } from "./AnimatedProgressBar"
import { useTranslation } from "react-i18next"
import { getReadableSize } from "@/utils/getReadableSize"
import { ImperativeRouter, useRouter } from "expo-router"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { FontAwesome6 } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"

import type { BasicResponse } from "@/components/pages/community/Feed"
import type { ProcessingPost, ProcessingMedia } from "@/components/pages/community/Feed"
import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { TrackedTask } from "@/app/(tabs)"
import type { Post } from "@/components/pages/community/Feed"

interface ProcessingPostContainerProps {
    processing_post:ProcessingPost,
    tracked_tasks:TrackedTask[],
    logged_in_user:LoggedInUser|null,
    onPostsUpdate:(posts:Post[]) => void,
    posts:Post[],
    onProcessingPostsUpdate:(processing_posts:ProcessingPost[]) => void,
    processing_posts:ProcessingPost[],
    onSelectedPostUpdate:(post:Post|null) => void,
    selected_post:Post|null,
    onSelectedProcessingPostUpdate:(processing_post:ProcessingPost|null) => void,
    selected_processing_post:ProcessingPost|null
}

export const ProcessingPostContainer = ({ 
    processing_post, 
    tracked_tasks, 
    logged_in_user, 
    onPostsUpdate, 
    posts, 
    onProcessingPostsUpdate,
    processing_posts,
    onSelectedPostUpdate,
    selected_post,
    onSelectedProcessingPostUpdate,
    selected_processing_post
}:ProcessingPostContainerProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const router:ImperativeRouter = useRouter() // Gets The Router

    const [active_post_media, setActivePostMedia] = useState<Record<string, number>>({}) // Stores The Active Post Media
    const [processing_post_report, setProcessingPostReport] = useState<string>("Čakajte! Príspevok sa spracováva.") // Stores The Processing Post Report Message

    const processing_post_properties = useRef<BottomSheetModal>(null) // Stores The Processing Post Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [processing_post_properties_sheet, setProcessingPostPropertiesSheet] = useState<"main"|"report"|"settings"|"delete">("main") // Stores The Active Processing Post Properties Sheet

    // Function For Generate Styled Description
    const generateStyledDescription = (text:string, tagged_users:string|null, added_hashtags:string|null) => {
        if(tagged_users) {
            const tagged_users_array:string[] = JSON.parse(tagged_users) // Converts The Data To An Array Of The Tagged Users

            // Puts Every Tag To The Styled Span Element
            return tagged_users_array.map((one_tag:string, index:number) => (
                <Pressable 
                    key={index}
                    className="tag"
                    onPress={() => router.push(`/profile/${one_tag}`)}
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
                    // onPress={}
                    style={styles.hashtag}
                >
                    {one_hashtag}
                </Pressable>
            ))
        }
    
        return text // Returns The Text
    }

    // Function For Change The Active Post Media
    const changePostMedia = (post_id:string, new_index:number, max_index:number):void => {
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
            Alert.alert(t("Upozornenie"), t("Presné súradnice tohto miesta nie sú k dispozícii."));
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
            console.error(t("Nepodarilo sa otvoriť mapy."))
        }
    }

    // Function For Show The Processing Post Properties
    const showProcessingPostProperties = (processing_post:ProcessingPost):void => {
        console.log(processing_post)
        onSelectedProcessingPostUpdate(processing_post) // Sets The Selected Processing Post
        processing_post_properties.current?.present() // Shows The Processing Post Properties
    }

    // Function For Close The Processing Post Properties
    const hideProcessingPostProperties = ():void => {
        onSelectedProcessingPostUpdate(null) // Sets The Selected Processing Post
        processing_post_properties.current?.dismiss() // Hides The Processing Post Properties
    }

    // Function For Handle Processing Post Properties Sheet Switching
    const handleProcessingPostPropertiesChanges = (index:number) => {
        if(index === -1) setProcessingPostPropertiesSheet("main") // Sets The Processing Post Properties Sheet To Default
    }

    // Function For Edit The Post Settings
    const editPostSettings = async (post_id:string, setting:string, action:boolean):Promise<void> => {
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

                // Stores The New State Of Updated Posts
                const updated_posts:Post[] = posts.map((one_post:Post) => {
                    return (
                        one_post.id === post_id
                            ? { ...one_post, [setting]: action } 
                            : one_post
                    )
                })

                onPostsUpdate(updated_posts) // Sets The Posts

                if(selected_post) {
                    const updated_selected_post = { ...selected_post, [setting]: action } // Stores The New State Of Updated Selected Posts
                    onSelectedPostUpdate(updated_selected_post) // Sets The Selected Post
                } 
                
                else {
                    onSelectedPostUpdate(null) // Sets The Selected Post
                }

                // Stores The New State Of Updated Processing Posts
                const updated_processing_posts:ProcessingPost[] = processing_posts.map((one_processing_post:ProcessingPost) => {
                    return (
                        one_processing_post.id === post_id
                            ? { ...one_processing_post, [setting]: action } 
                            : one_processing_post
                    )
                })

                onProcessingPostsUpdate(updated_processing_posts) // Sets The Processing Posts

                if(selected_processing_post) {
                    const updated_selected_processing_post = { ...selected_processing_post, [setting]: action } // Stores The New State Of Updated Selected Posts
                    onSelectedProcessingPostUpdate(updated_selected_processing_post) // Sets The Selected Processing Post
                } 
                
                else {
                    onSelectedProcessingPostUpdate(null) // Sets The Selected Processing Post
                }

                return
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri úprave príspevku došlo k chybe.")) // Shows The Alert
        }
    }

    // Function For Delete The Post
    const deletePost = async (post_id:string):Promise<void> => {
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

                // // Gets All Processing Posts From The Local Storage
                // const processing_posts:compressTask[] = JSON.parse(localStorage.getItem("processing_posts") || "[]") // Gets The Processing Posts From The Local Storage

                // // Removes All Tasks For The Current Processing Post From The Local Storage
                // const remaining_processing_posts:compressTask[]|[] = processing_posts.filter(function(one_task:compressTask):boolean {
                //     return one_task.post_id !== id
                // })

                // localStorage.setItem("processing_posts", JSON.stringify(remaining_processing_posts)) // Saves Updated Processing Posts To The Local Storage
                
                const updated_posts:Post[] = posts.filter((one_post:Post) => one_post.id !== post_id) // Stores The New State Of Updated Posts
                onPostsUpdate(updated_posts) // Sets The Posts

                onSelectedPostUpdate(null) // Sets The Selected Post
                // hidePostProperties() // Closes The Post Properties

                const updated_processing_posts = processing_posts.filter((one_processing_post:ProcessingPost) => one_processing_post.id !== post_id) // Stores The New State Of Updated Processing Posts
                onProcessingPostsUpdate(updated_processing_posts) // Sets The Processing Posts
                onSelectedProcessingPostUpdate(null) // Sets The Selected Processing Post
                // hideProcessingPostProperties() // Closes The Processing Post Properties

                return
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri odstraňovaní príspevku došlo k chybe.")) // Shows The Alert
        }
    }
    
    return (
        <BottomSheetModalProvider>
            <View className="processing_post_container" key={processing_post.id} style={styles.processing_post_container}>
                <Text className="processing_post_report" style={{ color: SECONDARY_COLOR }}>{processing_post_report}</Text>

                <View className="processing_media_info_container">
                    <Text 
                        className="processing_media_info" 
                        numberOfLines={1} 
                        ellipsizeMode="tail" 
                        style={{ color: SECONDARY_COLOR }}
                    >
                        Súbory:{" "}
                        
                        {processing_post.media.map((one_post_media:ProcessingMedia, index) => (
                            <Text key={index}>
                                <Text className="original_filename">{one_post_media.original_filename}</Text>
                                
                                <Text className="original_size">
                                    {getReadableSize(one_post_media.original_size)}
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
                            user_username={processing_post.user.username}
                            user_profile_picture_name={processing_post.user.profile_picture_name || null} 
                            user_subscription={processing_post.user.subscription?.is_active || false} 
                            label={t("Zobraziť užívateľa")} 
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

                            <View className="show_post_properties_button" accessibilityLabel={t("Viac...")}>
                                <Icon
                                    icon_name="ellipsis-vertical"
                                    onPress={() => showProcessingPostProperties(processing_post)}
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
                                        accessibilityLabel={t("Otvoriť mapy")} 
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
                            // Gets The Matching Task
                            const matching_task:TrackedTask|null = tracked_tasks.find(
                                (one_task:TrackedTask) => one_task.post_id === processing_post.id && Number(one_task.post_media_id) === Number(one_post_media.id)
                            ) || null

                            const current_progress:number = matching_task ? matching_task.progress : 0 // Gets The Current Progress

                            if(current_progress === 100) setProcessingPostReport(t("Príspevok bol úspešne pridaný."))

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
                                processing_post.media.map((_, index:number) => (
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
                    <View 
                        className="likes" 
                        accessibilityLabel={t("Páči sa mi...")} 
                        style={styles.society_likes}
                    >
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
                        accessibilityLabel={t("Komentáre...")}
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

                    <View className="share" accessibilityLabel={t("Zdielať...")}>
                        <Icon
                            icon_name="share-nodes"
                            size={25}
                        />
                    </View>

                    <View 
                        className="views" 
                        accessibilityLabel={t("Počet videní...")}
                        style={styles.views}
                    >
                        <Icon
                            icon_name="eye"
                            size={25}
                            is_regular={true}
                        />

                        <Text className="views_counter" style={styles.views_counter}>0</Text>
                    </View>

                    <View className={"save"} accessibilityLabel={t("Uložiť...")}>
                        <View className="save" accessibilityLabel={t("Uložiť...")}>
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

                                                <Text style={styles.sheet_text}>{t("Upraviť")}</Text>
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
                                                    {t("Vymazať")}
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

                                            <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
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

                                            <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
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
                                            {t("Naozaj chcete vymazať Váš príspevok?")}
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

                                            <Text style={styles.sheet_text}>{t("Vymazať")}</Text>
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