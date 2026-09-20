import React, { useEffect, useState } from "react"
import { View, StyleSheet, Modal, Text, KeyboardAvoidingView, TextInput, Pressable, Image, Platform, TouchableWithoutFeedback, Keyboard, Button, Alert, ActivityIndicator, ScrollView } from "react-native"
import { MAIN_COLOR, SECONDARY_COLOR, BLUE_COLOR, transparentize, LIGHT_BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, RED_COLOR, YELLOW_COLOR } from "@/constants/colors"
import { BlurView } from "expo-blur"
import SelectPosts from "@/components/SelectPosts"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "./Icon"
import EmojiPicker from "rn-emoji-keyboard"
import * as ImagePicker from "expo-image-picker"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { API_URL } from "@/constants/general"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av"
import { FontAwesome6 } from "@expo/vector-icons"
import { PostsPreview } from "./pages/community/PostsPreview"
import { LocationContainer } from "./pages/community/LocationContainer"

import type { LoggedInUser, LoggedInUserResponse } from "./LoginFormDialog"

export interface UploadPostResponse {
    success:boolean,
    compress_tasks?:CompressTask[],
    message:string
}

export interface CompressTask {
    task_id:string,
    post_media_id:number,
    post_id:number
}

interface RNMediaAsset {
    uri:string,
    mimeType?:string,
    fileName?:string
}

interface PostDetails {
    description?:string
    tagged_users?:number[]
    added_hashtags?:string[]
    location?:string
    latitude:number|null
    longitude:number|null
    public_visibility:boolean
    allow_comments:boolean
    hide_likes:boolean

    media_data:{
        filename:string
        order:number
        is_muted:boolean
        thumbnail_filename:string
    }[]
}

export interface SelectedFile extends ImagePicker.ImagePickerAsset {
    is_muted:boolean,
    thumbnail_filename:string|null
}

export interface UploadProgressResponse {
    success:boolean,

    upload_progress:{
        task_id:string,
        state:"PENDING"|"PROGRESS"|"SUCCESS"|"FAILURE",
        progress:number
    },

    message:string
}

type UploadPostFormDialogProps = {
    visible:boolean,
    onClose:() => void,
    onCompressTasksLoad:(compress_tasks:CompressTask[]) => void
}

export default function UploadPostFormDialog({ visible, onClose, onCompressTasksLoad }:UploadPostFormDialogProps) {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const [selected_files, setSelectedFiles] = useState<SelectedFile[]>([]) // Stores The Selected Files
    const [thumbnail_files, setThumbnailFiles] = useState<ImagePicker.ImagePickerAsset[]>([]) // Stores The Thumbnail Files

    const [description, setDescription] = useState<string>("") // Stores The Description
    const [tagged_users, setTaggedUsers] = useState<number[]>([]) // Stores The Tagged Users
    const [added_hashtags, setAddedHashtags] = useState<string[]>([]) // Stores The Added Hashtags

    const [location, setLocation] = useState<string>("") // Stores The Location
    const [latitude, setLatitude] = useState<number|null>(null) // Stores The Latitude
    const [longitude, setLongitude] = useState<number|null>(null) // Stores The Longitude

    const [public_visibility, setPublicVisibility] = useState<boolean>(true) // Stores The Information If The Public Visibility Is Enabled
    const [allow_comments, setAllowComments] = useState<boolean>(true) // Stores The Information If The Comments Are Allowed
    const [hide_likes, setHideLikes] = useState<boolean>(false) // Stores The Information If Likes Are Hidden

    const [is_emoji_picker_open, setIsEmojiPickerOpen] = useState(false) // Stores The Information If The Emoji Picker Is Open

    const [button_text, setButtonText] = useState<string>("Uverejniť príspevok") // Stores The Button Text
    const [is_uploading, setIsUploading] = useState<boolean>(false) // Stores The Information If The Post Is Uploading

    const MAX_DESCRIPTION_LENGTH:number = 500 // Defines The Maximum Description Length

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

    // Function For Handle The Emoji Select
    const handleEmojiSelect = (emoji:{ emoji:string }) => {
        if(description.length >= MAX_DESCRIPTION_LENGTH) return
        setDescription((previous_description) => previous_description + emoji.emoji) // Sets The Description
    }

    // Function For Add The Hashtag
    const addHashtag = () => {
        // Checks For The Maximum Input Length
        if(description.length < MAX_DESCRIPTION_LENGTH - 1) {
            const previous_character:string|null = description[description.length - 1] || null // Gets The Last Entered Character (Null If There Hasn't Been Any Yet)
    
            previous_character?.charCodeAt(0) === 160 || previous_character === " " || previous_character === null ? setDescription((previous_description) => previous_description + "#") : setDescription((previous_description) => previous_description + " #") // Adds Hashtag Sign At The End With Additional Spacing (If There Isn't Already)

            // hideUsersForTag(users_for_tag_container) // Hides Users For Tag Container
            // focusAtEnd(description) // Adds Focus To The Description
        }
    }

    // Function For Handle Upload Post Form Submission
    const handleUploadPostSubmission = ():void => {
        Keyboard.dismiss() // Hides The Keyboard
        
        if(selected_files.length === 0) {
            Alert.alert("Chyba", "Vyberte aspoň jednu fotku alebo video.") // Shows The Alert
            return
        }

        // Gets The Selected Files Data
        const selected_files_data = selected_files.map((one_selected_file:SelectedFile, index:number) => {
            const is_video:boolean = one_selected_file.type === "video" // Stores The Information If The Selected File Is Video
            const default_extension:"mp4"|"jpg" = is_video ? "mp4" : "jpg" // Sets The Default Extension
            
            const file_name:string = one_selected_file.fileName || `file_${index}_${Date.now()}.${default_extension}` // Sets The File Name
            const file_type:string = one_selected_file.mimeType || (is_video ? "video/mp4" : "image/jpeg") // Sets The File Type

            return {
                uri: one_selected_file.uri,
                fileName: file_name,
                mimeType: file_type,
                is_muted: one_selected_file.is_muted,
                thumbnail_filename: one_selected_file.thumbnail_filename
            }
        })

        // Gets The Media Data
        const media_data = selected_files_data.map((one_selected_file, index:number) => ({
            filename: one_selected_file.fileName as string,
            order: index,
            is_muted: one_selected_file.is_muted, 
            thumbnail_filename: one_selected_file.thumbnail_filename || ""
        }))

        // const thumbnail_files:RNMediaAsset[] = [] // Gets The Thumbnail Files

        // Gets The Post Details
        const post_details:PostDetails = {
            description,
            tagged_users,
            added_hashtags,
            location,
            latitude,
            longitude,
            public_visibility,
            allow_comments,
            hide_likes,
            media_data,
        }

        uploadPost(selected_files_data, thumbnail_files, post_details) // Uploads The Post
    }

    // Function For Prepare File For Form Data
    const prepareFileForFormData = async (file:RNMediaAsset):Promise<any> => {
        // Web
        if(Platform.OS === "web") {
            const file_response:Response = await fetch(file.uri)
            const blob:Blob = await file_response.blob()

            return new File([blob], file.fileName || `file_${Date.now()}.jpg`, {
                type: file.mimeType || "image/jpeg"
            })
        } 
        
        // iOS And Android
        else {
            return {
                uri: file.uri,
                type: file.mimeType || "image/jpeg",
                name: file.fileName || `file_${Date.now()}.jpg`
            } as any
        }
    }

    // Function For Upload The Post With Progress
    const uploadPostWithProgress = (url:string, headers:Record<string, string>, form_data:FormData, onProgress:(progress: number) => void):Promise<Response> => {
        return new Promise((resolve, reject) => {
            const xhr:XMLHttpRequest = new XMLHttpRequest()

            // Checks The Server Upload Process
            xhr.upload.onprogress = (event) => {
                if(event.lengthComputable) {
                    const progress_percentage:number = Math.round((event.loaded / event.total) * 100) // Calculates The Loading Progress Percentage
                    onProgress(progress_percentage) // Displays The Loading Progress Percentage
                }
            }
    
            xhr.onload = () => {
                resolve({
                    ok: xhr.status >= 200 && xhr.status < 300,
                    status: xhr.status,
                    json: async () => JSON.parse(xhr.responseText)
                } as Response)
            }
    
            xhr.onerror = (error) => reject(error)
            xhr.open("POST", url)
            Object.keys(headers).forEach(key => {xhr.setRequestHeader(key, headers[key])}) // Adds The Request Headers
            xhr.send(form_data) // Sends The POST Request To The Server
        })
    }

    // Function For Upload The Post
    const uploadPost = async (selected_files:any, thumbnail_files:any, post_details:PostDetails):Promise<void> => {
        setIsUploading(true) // Sets The Information That The Post Is Uploading
        setButtonText("Overuje sa...") // Sets The Button Text
    
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Príspevok nie je možné pridať bez prihlásenia.") // Shows The Alert
                return
            }

            const form_data:FormData = new FormData() // Creates The Form Data
    
            form_data.append("description", post_details.description || "") // Appends The Description To The Form Data
            form_data.append("tagged_users", JSON.stringify(post_details.tagged_users || [])) // Appends The Tagged Users To The Form Data
            form_data.append("added_hashtags", JSON.stringify(post_details.added_hashtags || [])) // Appends The Added Hashtags To The Form Data

            form_data.append("location", post_details.location || "") // Appends The Location To The Form Data
            
            if(post_details.latitude && post_details.longitude) {
                form_data.append("latitude", String(post_details.latitude)) // Appends The Latitude To The Form Data
                form_data.append("longitude", String(post_details.longitude)) // Appends The Longitude To The Form Data
            }

            form_data.append("public_visibility", post_details.public_visibility ? "True" : "False") // Appends The Public Visibility To The Form Data
            form_data.append("allow_comments", post_details.allow_comments ? "True" : "False") // Appends The Allow Comments To The Form Data
            form_data.append("hide_likes", post_details.hide_likes ? "True" : "False") // Appends The Hide Likes To The Form Data

            form_data.append("media_data", JSON.stringify(post_details.media_data || [])) // Appends The Media Data To The Form Data

            for(const one_selected_file of selected_files) {
                const file_data:any = await prepareFileForFormData(one_selected_file) // Gets The File Data
                form_data.append("selected_posts", file_data) // Appends The Selected Posts To The Form Data
            }
            
            for(const one_thumbnail of thumbnail_files) {
                const thumbnail_data = await prepareFileForFormData(one_thumbnail) // Gets The Thumbnail Data
                form_data.append("select_thumbnail", thumbnail_data) // Appends The Selected Thumbnail To The Form Data
            }
    
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token

            setButtonText("Nahráva sa... 0%") // Sets The Button Text

            // Uploads The Post With Progress
            const upload_post_response: Response = await uploadPostWithProgress(
                `${API_URL}/upload-post/`,

                {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                form_data,
                (progress) => {setButtonText(`Nahráva sa... ${progress}%`)} // Sets The Button Text
            )
    
            const upload_post_data:UploadPostResponse = await upload_post_response.json() // Gets The Upload Post Data

            if(upload_post_response.ok && upload_post_data.success) {
                if(upload_post_data.compress_tasks && upload_post_data.compress_tasks.length > 0) {
                    onCompressTasksLoad(upload_post_data.compress_tasks) // Sets The Currently Being Compressed Tasks
                }
            }
             
            else setButtonText("Skúste znovu") // Sets The Button Text
        }
        
        catch {
            setButtonText("Skúste znovu") // Sets The Button Text
        }
        
        finally {
            setIsUploading(false) // Sets The Information That The Post Isn't Uploading
            setButtonText("Uverejniť príspevok") // Sets The Button Text
        }
    }
  
    return (
        <Modal
            className="upload_post_form_dialog"
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable 
                onPress={onClose}

                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }} 
            >
                <BlurView intensity={25} style={StyleSheet.absoluteFill} />

                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: transparentize(MAIN_COLOR, 0.5) },
                    ]}
                />

                <Pressable 
                    onPress={(event) => event.stopPropagation()}

                    style={{
                        maxWidth: MAIN_WIDTH,
                        width: "100%",
                    }}
                >
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ width: "100%", alignItems: "center" }}
                    >
                        <View className="upload_post_form" style={styles.upload_post_form}>
                            <View style={styles.circle_decoration_before} />
                            <View style={styles.circle_decoration_after} />

                            <View style={styles.top}>
                                <View className="back" accessibilityLabel="Zavrieť">
                                    <Icon
                                        icon_name="chevron-left"
                                        onPress={onClose}
                                        size={30}
                                        pressed_style={{ transform: [{ scale: 1.1 }] }}
                                    />
                                </View>

                                <Text className="heading" style={styles.heading}>Zdieľať príspevok</Text>
                            </View>

                            <PostsPreview 
                                onSelectedFilesUpdate={(selected_files:SelectedFile[]) => setSelectedFiles(selected_files)}
                                selected_files={selected_files}
                                onThumbnailFilesUpdate={(thumbnail_files:ImagePicker.ImagePickerAsset[]) => setThumbnailFiles(thumbnail_files)}
                                thumbnail_files={thumbnail_files}
                                logged_in_user={logged_in_user}
                            />

                            <View className="post_info_container" style={styles.post_info_container}>
                                <TextInput
                                    className="description"
                                    multiline={true} 
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    textAlignVertical="top" 
                                    placeholder="Popis príspevku" 
                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                    accessibilityLabel="Popis príspevku" 
                                    value={description}
                                    onChangeText={setDescription}
                                    maxLength={MAX_DESCRIPTION_LENGTH}

                                    style={[
                                        styles.description, 
                                        { outlineStyle: "none" } as any
                                    ]}
                                />

                                <View className="icons" style={styles.icons}>
                                    <View className="settings" style={styles.settings}>
                                        <View 
                                            className="public_visibility" 
                                            accessibilityLabel={public_visibility ? "Zapnúť viditeľnosť len pre sledovateľov" : "Vypnúť viditeľnosť len pre sledovateľov"}
                                            style={styles.icon}
                                        >
                                            <Icon
                                                icon_name={public_visibility ? "eye" : "eye-low-vision"}
                                                onPress={() => setPublicVisibility(previous => !previous)} // Toggles The Value
                                            />
                                        </View>

                                        <View 
                                            className="allow_comments" 
                                            accessibilityLabel={allow_comments ? "Vypnúť komentáre" : "Zapnúť komentáre"}
                                            style={styles.icon}
                                        >
                                            <Icon
                                                icon_name={allow_comments ? "comment" : "comment-slash"}
                                                onPress={() => setAllowComments(previous => !previous)} // Toggles The Value
                                            />
                                        </View>

                                        <View 
                                            className="hide_likes" 
                                            accessibilityLabel={allow_comments ? "Zobraziť počet označení páči sa mi to" : "Skryť počet označení páči sa mi to"}
                                            style={styles.icon}
                                        >
                                            <Icon
                                                icon_name="heart"
                                                onPress={() => setHideLikes(previous => !previous)} // Toggles The Value
                                                is_regular={hide_likes ? true : false}
                                            />
                                        </View>
                                    </View>

                                    <View className="tags" style={styles.tags}>
                                        <View className="add_emoji" style={styles.icon}>
                                            <Icon 
                                                icon_name="face-surprise"
                                                is_regular={true}
                                                onPress={() => setIsEmojiPickerOpen(true)}
                                            />
                                        </View>

                                        <View className="tag_user" style={styles.icon}>
                                            <Icon 
                                                icon_name="at"
                                            />
                                        </View>

                                        <View className="add_hashtag" style={styles.icon}>
                                            <Icon 
                                                icon_name="hashtag"
                                                onPress={addHashtag}
                                            />
                                        </View>
                                    </View>
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

                                <View className="users_for_tag_container_wrapper" style={styles.users_for_tag_container_wrapper}>
                                    <View className="users_for_tag_container" style={styles.users_for_tag_container}></View>
                                </View>
                            </View>

                            <View className="tagged_users_container" style={styles.tagged_users_container}></View>

                            <LocationContainer 
                                onLocationUpdate={(location:string) => setLocation(location)}
                                location={location}
                                onLatitudeUpdate={(latitude:number|null) => setLatitude(latitude)}
                                onLongitudeUpdate={(longitude:number|null) => setLongitude(longitude)}
                            />

                            <Text className="form_report error" style={styles.form_report}></Text>

                            <Pressable 
                                className="upload_post_form_submit"
                                onPress={handleUploadPostSubmission}
                                accessibilityLabel={button_text} 
                                disabled={is_uploading}

                                style={[
                                    styles.upload_post_form_submit, 
                                    { outlineStyle: "none" } as any
                                ]}
                            >
                                <Text className="text-white font-bold text-base" style={{ color: SECONDARY_COLOR }}>{button_text}</Text>
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    
    upload_post_form: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        padding: 20,
        textAlign: "center",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
        overflow: "hidden",
    },

    circle_decoration_before: {
        position: "absolute",
        top: -250,
        left: -50,
        width: 400,
        height: 400,
        borderRadius: 400 / 2,
        backgroundColor: transparentize(BLUE_COLOR, 0.95),
        zIndex: -1,
    },
    
    circle_decoration_after: {
        position: "absolute",
        bottom: -200,
        right: -50,
        width: 400,
        height: 400,
        borderRadius: 400 / 2,
        backgroundColor: transparentize(BLUE_COLOR, 0.95),
        zIndex: -1,
    },

    top: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        marginBottom: 30,
    },

    heading: {
        flex: 1,
        marginRight: 18.75 + 20,
        textAlign: "center",
        color: SECONDARY_COLOR,
        fontSize: 30,
        // animation: fadeInScale 0.3s ease-out;
    },

    drag_active: {
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: transparentize(BLUE_COLOR, 0.5),
    },

    post_info_container: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: border-color 0.3s ease, box-shadow 0.3s ease;

        // &:hover,
        // &:has(.description:focus) {
        //     border-color: $blue-color;

        //     .users_for_tag_container_wrapper {
        //         border-color: $blue-color;
        //     }
        // }

        // &:not(:has(.users_for_tag_container.active)) {
        //         &:hover,
        //         &:has(.description:focus) {
        //             box-shadow: 0 5px 20px transparentize($blue-color, 0.85);
        //         }
        //     }
    },

    description: {
        minHeight: 100,
        paddingVertical: 5,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
    },

    icons: {
        flexDirection: "row",
        justifyContent: "space-between",
        height: 25,
        paddingHorizontal: 10,
        backgroundColor: transparentize(BLUE_COLOR, 0.9),
        // backdrop-filter: blur(5px);
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,
    },

    icon: {
        flexDirection: "row",
        justifyContent: "center",
        width: 25,
    },

    disabled_public_visibility: {
        color: transparentize(BLUE_COLOR, 0.5),
    },

    settings: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    tags: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    users_for_tag_container_wrapper: {
        position: "absolute",
        top: 0,
        transform: [{ translateX: -1 }],
        display: "none",
        opacity: 0,
        maxWidth: "100%",
        width: "100%",
        marginHorizontal: -1,
        padding: 5,
        backgroundColor: transparentize(BLUE_COLOR, 0.9),
        // backdrop-filter: blur(5px);
        borderRightWidth: 1,
        borderRightColor: transparentize(BLUE_COLOR, 0.5),
        borderLeftWidth: 1,
        borderLeftColor: transparentize(BLUE_COLOR, 0.5),
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,
        zIndex: 50,

        // transition: border-color 0.3s ease, display 0.5s ease allow-discrete, top 0.3s ease, opacity 0.5s ease;

        // &:has(.users_for_tag_container.active) {
        //     top: calc(100% - 1px);
        //     display: block;
        //     opacity: 1;

        //     @starting-style {
        //         top: 0%;
        //         opacity: 0;
        //     }
        // }
    },

    users_for_tag_container: {
        // @include scrollbar;
        gap: 10,
        width: "100%",
        maxHeight: 3 * 48 + 30 + 5,
        padding: 5,
    },

    one_user: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
        height: 50,
        paddingHorizontal: 10,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,

        // transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        
        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
        
        // &.hidden {
        //     transform: translateY(calc(300% + 20px));
        //     display: none;
        // }

        // &:focus-visible {
        //     background-color: transparentize($blue-color, 0.8);
        // }
    },

    profile_picture: {
        // @include profile_picture;
        pointerEvents: "none",
    },

    username: {
        pointerEvents: "none",
        color: SECONDARY_COLOR,
    },

    delete_from_history: {
        position: "absolute",
        top: "50%",
        right: 0,
        transform: [{ translateY: "-50%" }],
        width: 15 + 10,
        height: "100%",
        lineHeight: 48,
        paddingRight: 10,
        pointerEvents: "auto",

        // transition: display 0.15s ease allow-discrete, opacity 0.15s ease;

        // &.hidden {
        //     display: none;
        //     opacity: 0;
        // }

        // &.fa-xmark {
        //     font-size: 20px;
        // }
    },

    tagged_users_container: {
        flexDirection: "row",
        gap: 10,
    },

    tag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 25,
        marginVertical: 5,
        paddingHorizontal: 5,
        backgroundColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: SMALL_BORDER_RADIUS,

        // transition: border-color 0.3s ease;
        // animation: fadeInScale 0.3s ease-in forwards;

        // &.hidden {
        //     display: none;
        // }

        // p {
        //     font-size: 0.8em;
        //     color: $blue-color;
        // }

        // .fa-xmark {
        //     @include icon;
        // }
    },

    form_report: {
        alignSelf: "center",
        // font-size: 0.9em;
    },

    success: {
        color: GREEN_COLOR,
    },

    error: {
        color: RED_COLOR,
    },

    upload_post_form_submit: {
        alignItems: "center",
        justifyContent: "center",
        width: "90%",
        height: 50,
        marginTop: 40,
        marginHorizontal: "auto",
        paddingHorizontal: 10,
        textAlign: "center",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: scale(1.05);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }
    },
})