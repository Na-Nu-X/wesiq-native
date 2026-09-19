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

import type { LoggedInUser, LoggedInUserResponse } from "./LoginFormDialog"
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av"
import { FontAwesome6 } from "@expo/vector-icons"

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

interface SelectedFile extends ImagePicker.ImagePickerAsset {
    is_muted?:boolean,
    thumbnail_filename?:string
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

interface NominatimPlace {
    display_name:string,
    lat:string,
    lon:string,
    [key:string]:any
}

type UploadPostFormDialogProps = {
    visible:boolean,
    onClose:() => void,
    // onUploadProgressUpdate:(upload_progress:number) => void,
    onCompressTasksLoad:(compress_tasks:CompressTask[]) => void
}

export default function UploadPostFormDialog({ visible, onClose, onCompressTasksLoad }:UploadPostFormDialogProps) {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [selected_files, setSelectedFiles] = useState<SelectedFile[]>([]) // Stores The Selected Files
    const [description, setDescription] = useState<string>("") // Stores The Description
    const [tagged_users, setTaggedUsers] = useState<number[]>([]) // Stores The Tagged Users
    const [added_hashtags, setAddedHashtags] = useState<string[]>([]) // Stores The Added Hashtags

    const [location, setLocation] = useState<string>("") // Stores The Location
    const [location_results, setLocationResults] = useState<NominatimPlace[]>([]) // Stores The Location Results
    const [latitude, setLatitude] = useState<number|null>(null) // Stores The Latitude
    const [longitude, setLongitude] = useState<number|null>(null) // Stores The Longitude
    const [is_location_valid, setIsLocationValid] = useState<boolean>(false) // Stores The Information If The Location Is Valid
    const [is_location_loading, setIsLocationLoading] = useState<boolean>(false) // Stores The Information If The Location Is Loading
    let debounce_timeout:number // Debounce Timeout Between API Requests

    const [public_visibility, setPublicVisibility] = useState<boolean>(true) // Stores The Information If The Public Visibility Is Enabled
    const [allow_comments, setAllowComments] = useState<boolean>(true) // Stores The Information If The Comments Are Allowed
    const [hide_likes, setHideLikes] = useState<boolean>(false) // Stores The Information If Likes Are Hidden

    const [is_emoji_picker_open, setIsEmojiPickerOpen] = useState(false) // Stores The Information If The Emoji Picker Is Open

    const [button_text, setButtonText] = useState<string>("Uverejniť príspevok") // Stores The Button Text
    const [is_uploading, setIsUploading] = useState<boolean>(false) // Stores The Information If The Post Is Uploading

    const MAX_DESCRIPTION_LENGTH:number = 500 // Defines The Maximum Description Length

    const [post_preview_progress, setPostPreviewProgress] = useState<Record<string, number>>({}) // Stores The Post Preview Progress

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

    // Function For Handle The Media Selection
    const handleMediaSelection = (new_selected_files:ImagePicker.ImagePickerAsset[]):void => {
        setSelectedFiles((previous_selected_files:SelectedFile[]) => {
            const combined_selected_files:SelectedFile[] = [...previous_selected_files, ...new_selected_files] // Gets The Combined Selected Files
            return combined_selected_files.slice(0, 5) // Removes Unnecessary Files
        })
    }

    // Function For Handle Selected File Loading Progress
    const handleSelectedFileLoadingProgress = (file:ImagePicker.ImagePickerAsset, onProgress:(progress:number) => void):void => {
        // Accepts Only 5 Files And Only The Image And Video Formats
        if(selected_files.length <= 5 && (file.type === "image" || file.type === "video")) {
            // Web
            if(Platform.OS === "web" && file.file) {
                const file_reader:FileReader = new FileReader() // Reads The Content of The File
        
                file_reader.onprogress = (event:ProgressEvent<FileReader>):void => {
                    if(event.lengthComputable) {
                        const progress_percentage:number = Math.round((event.loaded / event.total) * 100) // Calculates The Loading Progress Percentage
                        onProgress(progress_percentage) // Displays The Loading Progress Percentage
                    }
                }
        
                file_reader.onloadend = () => {
                    onProgress(100) // Displays The Loading Progress Percentage
                }
        
                file_reader.readAsDataURL(file.file) // Renders The Preview
            } 
            
            // iOS / Android
            else {
                onProgress(100) // Displays The Loading Progress Percentage
            }
        }
    }

    // Initializes The Loading Progress Of New Selected Files
    useEffect(() => {
        selected_files.forEach((one_media) => {
            if(post_preview_progress[one_media.uri] === undefined) {
                setPostPreviewProgress(previous_progress => ({ ...previous_progress, [one_media.uri]: 0 })) // Sets The Initial Progress (0%)
                
                handleSelectedFileLoadingProgress(one_media, (progress:number) => {
                    setPostPreviewProgress(previous_progress => ({ 
                        ...previous_progress, 
                        [one_media.uri]: progress 
                    }))
                })
            }
        })
    }, [selected_files])

    // Function For Render Post Preview
    const renderPostPreview = () => {
        const subscription_plan:"free"|"basic"|"premium" = logged_in_user && logged_in_user.subscription && logged_in_user.subscription.is_active ? logged_in_user.subscription.plan : "free" // Gets The Subscription Plan

        const MAX_IMAGE_SIZE:number = subscription_plan === "free" ? 2 * 1000 * 1000 : 10 * 1000 * 1000 // 2MB For No Subscribers, 10MB For Subscribers
        const MAX_VIDEO_SIZE:number = subscription_plan === "free" ? 25 * 1000 * 1000 : subscription_plan === "basic" ? 50 * 1000 * 1000 : 100 * 1000 * 1000 // 25MB For No Subscribers, 50MB For Subscribers With Basic Plan, 100MB For Subscribers With Premium Plan
        const MAX_VIDEO_DURATION:number = subscription_plan === "free" ? 60 : subscription_plan === "basic" ? 2 * 60 : 3 * 60 // 1 Minute For No Subscribers, 2 Minutes For Subscribers With Basic Plan, 3 Minutes For Subscribers With Premium Plan
        const MIN_VIDEO_DURATION:number = 1 // 1 Second

        return selected_files.map((one_media:SelectedFile, index:number) => {
            console.log(selected_files)

            // Accepts Only 5 Files And Only The Image And Video Formats
            if(index < 5 && (one_media.type === "image" || one_media.type === "video")) {
                const is_video:boolean = one_media.type === "video" // Gets The Information If The File Is Video
                const current_progress:number = post_preview_progress[one_media.uri] || 0 // Gets The Current Progress
        
                return (
                    <View className="post" key={one_media.assetId || index} style={styles.post}>
                        {current_progress < 100 && (
                            <View style={styles.posts_preview_loading}>
                                <ActivityIndicator className="loading" size="small" color={SECONDARY_COLOR} />
                                <Text className="loading_progress" style={styles.loading_progress}>{current_progress}%</Text>
                            </View>
                        )}

                        <View className="remove_post" accessibilityLabel="Odstrániť..." style={styles.remove_post}>
                            <Icon
                                icon_name="xmark"
                                // onPress={}
                                // removeFile(index, select_posts, posts_preview) // Removes The File
                                size={22}
                            />
                        </View>

                        {is_video ? (
                            <>
                                {/* Video */}
                                <Video
                                    source={{ uri: one_media.uri }} // Sets The Source
                                    useNativeControls={false} // Disables The Controls
                                    resizeMode={ResizeMode.COVER}
                                    isLooping={false}
                                    isMuted={true} // Mutes The Video
                                    style={{ width: "100%", height: "100%" }}
                                    // filter: blur(2px);
                                />

                                {/* Checks The Video Size */}
                                {one_media.fileSize || 0 > MAX_VIDEO_SIZE && (
                                    <>
                                        <View className="tooltip">
                                            <Text>Video je príliš veľké</Text>
                                        </View>

                                        <FontAwesome6
                                            name="triangle-exclamation"
                                            color={YELLOW_COLOR}
                                        />
                                    </>
                                )}

                                {/* Checks The Video Duration */}
                                {one_media.duration || 0 > MAX_VIDEO_DURATION && (
                                    <>
                                        <View className="tooltip">
                                            <Text>Video je príliš dlhé</Text>
                                        </View>

                                        <FontAwesome6
                                            name="triangle-exclamation"
                                            color={YELLOW_COLOR}
                                        />
                                    </>
                                )}

                                {/* Checks The Video Duration */}
                                {one_media.duration || 0 < MIN_VIDEO_DURATION && (
                                    <>
                                        <View className="tooltip">
                                            <Text>Video je príliš krátke</Text>
                                        </View>

                                        <FontAwesome6
                                            name="triangle-exclamation"
                                            color={YELLOW_COLOR}
                                        />
                                    </>
                                )}

                                <View className="video_settings" style={styles.video_settings}>
                                    <View className="toggle_mute" accessibilityLabel="Vypnúť zvuk" style={styles.toggle_mute}>
                                        <Icon
                                            icon_name={one_media.is_muted ? "volume-xmark" : "volume-high"}
                                            onPress={() => toggleMuteVideo(index)} // Toggles Mute / Unmute Of Video
                                            size={22}
                                            pressed_style={{ transform: [{ scale: 1.1 }] }}
                                        />
                                    </View>

                                    <View className="select_thumbnail" accessibilityLabel="Vybrať náhľad" style={styles.select_thumbnail}>
                                        <Icon
                                            icon_name="image"
                                            onPress={() => selectThumbnail(index)}
                                            size={22}
                                            is_regular={true}
                                            pressed_style={{ transform: [{ scale: 1.1 }] }}
                                        />
                                    </View>
                                </View>
                            </>
                        ) : (
                            <>
                                {/* Image */}
                                <Image
                                    source={{ uri: one_media.uri }}
                                    style={{ width: "100%", height: "100%" }}
                                    // filter: blur(2px);
                                />

                                {/* Checks The Image Size */}
                                {one_media.fileSize || 0 > MAX_IMAGE_SIZE && (
                                    <>
                                        <View className="tooltip">
                                            <Text>Obrázok je príliš veľký</Text>
                                        </View>

                                        <FontAwesome6
                                            name="triangle-exclamation"
                                            color={YELLOW_COLOR}
                                        />
                                    </>
                                )}
                            </>
                        )}

                        {/* // Post Drag & Drop Functionalities (Change The Order of The Posts)
                        post.addEventListener("dragstart", function(event:DragEvent):void {
                            event.dataTransfer?.setData("sourceIndex", index.toString())

                            post.style.opacity = "0.5" // Adds Transparency To The Dragged Post
                            post.style.transform = "scale(1)" // Adds Normal Scale To The Dragged Post

                            posts_preview.querySelectorAll<HTMLDivElement>(".post").forEach(function(one_post:HTMLDivElement):void {
                                if(one_post !== post) one_post.classList.add("drag_active") // Adds Drag Active Class To All Posts Except The One That Was Dragged
                            })
                        })

                        post.addEventListener("dragend", function():void {
                            post.style.opacity = "1" // Removes Transparency From The Dragged Post
                            post.removeAttribute("style") // Removes Hardcoded Style (style="transform: scale(1)) From The Dragged Post

                            posts_preview.querySelectorAll<HTMLDivElement>(".post").forEach(one_post => one_post.classList.remove("drag_active")) // Removes Drag Active Class From All Posts
                        })

                        post.addEventListener("dragover", (event:DragEvent) => event.preventDefault())

                        post.addEventListener("drop", function(event:DragEvent):void {
                            event.preventDefault()
                            event.stopPropagation()

                            posts_preview.classList.remove("drag_active") // Removes Drag Animation From The Post Preview

                            const from_index = parseInt(event.dataTransfer?.getData("sourceIndex") || "-1")
                            const to_index = index

                            if(from_index !== -1 && from_index !== to_index) changePostOrder(from_index, to_index, select_posts, posts_preview) // Changes Post Order
                        }) */}
                    </View>
                )
            }
        })
    }

    // // Function For Remove File
    // function removeFile(index:number, select_posts:HTMLInputElement, posts_preview:HTMLDivElement):void {
    //     posts_preview_state.current_files.splice(index, 1) // Removes The File From The Current Files
    //     syncFiles(select_posts, posts_preview) // Synchronizes Files
    // }

    // Function For Toggle Mute Video
    const toggleMuteVideo = (clicked_index:number):void => {
        // Sets The Selected Files
        setSelectedFiles((previous_selected_files:SelectedFile[]) =>
            previous_selected_files.map((one_selected_file:SelectedFile, index:number) => {
                if (index === clicked_index) {
                    return {
                        ...one_selected_file,
                        is_muted: !one_selected_file.is_muted
                    }
                }

                return one_selected_file // Returns The Unchanged Selected File
            })
        )
    }

    // Function For Select The Thumbnail
    const selectThumbnail = (clicked_index:number):void => {
        console.log(clicked_index)

        {/* // Select Thumbnail Input Change Functionality
        select_thumbnail_input.addEventListener("change", function():void {
            const thumbnail_file:File|null = this.files?.[0] || null // Gets The Thumbnail File

            if(!thumbnail_file) return

            const thumbnail_file_reader:FileReader = new FileReader() // Reads The Content of The File

            thumbnail_file_reader.addEventListener("load", function():void {
                const file_data:string = thumbnail_file_reader.result as string // Gets The File Data

                if(!file_data) return

                if(element) {
                    (element as HTMLVideoElement).poster = file_data // Sets The Video Poster Image
                }

                post.dataset["thumbnail_filename"] = thumbnail_file.name // Stores The Thumbnail's Filename
            })

            thumbnail_file_reader.readAsDataURL(thumbnail_file) // Renders The Preview
        }) */}
    }

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

    // Function For Handle Search Location
    const handleSearchLocation = (searched_text:string):void => {
        clearTimeout(debounce_timeout) // Clears The Debounce Timeout

        setLocation(searched_text) // Sets The Location

        if(searched_text.length < 3) {
            if(location_results.length > 0) setLocationResults([]) // Sets The Location Results
            setIsLocationValid(false) // Sets The Information That The Location Isn't Valid
            return
        }

        // Gets Location After 1000 MS Delay (Because of The Nominatim Usage Policy - 1 Request per Second)
        debounce_timeout = window.setTimeout(function():void {
            getLocation(searched_text)
        }, 1000)
    }

    // Function For Get Locations By Searched Location
    const getLocation = async (searched_text:string):Promise<void> => {
        if(!searched_text.trim()) {
            setIsLocationValid(false) // Sets The Information That The Location Isn't Valid
            setLocationResults([]) // Sets The Location Results
            setLatitude(null) // Sets The Latitude
            setLongitude(null) // Sets The Longitude
            return
        }

        setIsLocationLoading(true) // Sets The Information That The Location Is Loading
    
        try {
            const url:string = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&addressdetails=1&limit=10&featuretype=settlement` // Nominatim API https://nominatim.org/

            // Sends The GET Request To The Server
            const location_response:Response = await fetch(`${url}`, {
                method: "GET",
        
                headers: {
                    "Accept-Language": Platform.OS === "web" ? navigator.language : "sk", // Gets Results In Users System Language
                    "User-Agent": "Wesiq - Native App (behulpatrik@gmail.com)" // Sends User Agent Informations
                }
            })

            if(!location_response.ok) {
                Alert.alert("Chyba", "Pri načítaní polohy došlo k chybe.") // Shows The Alert
            }
    
            const data:NominatimPlace[] = await location_response.json() // Gets The Data
            const unique_data:NominatimPlace[] = getUniquePlaces(data) // Gets Only The Unique Data

            setLocationResults(unique_data) // Sets The Location Results
    
            // Stores The Coordinates
            if(storeCoordinates(unique_data, searched_text)) {
                setIsLocationValid(true) // Sets The Information That The Location Is Valid
            }

            else {
                setIsLocationValid(false) // Sets The Information That The Location Isn't Valid
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri načítaní polohy došlo k chybe.") // Shows The Alert
        } 
        
        finally {
            setIsLocationLoading(true) // Sets The Information That The Location Isn't Loading
        }
    }

    // Function For Get Unique Places From Fetched Data
    const getUniquePlaces = (data:NominatimPlace[]):NominatimPlace[] => {
        return data.filter(function(one_place:NominatimPlace, index:number, self:NominatimPlace[]) {
            return index === self.findIndex(function(p:NominatimPlace) {
                return p.display_name === one_place.display_name
            })
        })
    }

    // Function For Store Coordinates To The Hidden Inputs
    const storeCoordinates = (data:NominatimPlace[] = location_results, searched_text:string):boolean => {
        const matching_location:NominatimPlace|null = data.find((one_place:NominatimPlace) => one_place.display_name === searched_text) || null // Gets The Matching Location If There is Any

        if(matching_location) {
            console.log("MATCH")
            setLatitude(Number(matching_location.lat)) // Sets The Latitude
            setLongitude(Number(matching_location.lon)) // Sets The Longitude
            
            return true // Returns True If The Coordinates Were Stored
        }

        else {
            console.log("NEMATCH")
            setLatitude(null) // Deletes The Latitude
            setLongitude(null) // Deletes The Longitude

            return false // Returns False If The Coordinates Were Not Stored
        }
    }

    // Function For Add Location
    const addLocation = (clicked_location:string, latitude:number, longitude:number):void => {
        setLocation(clicked_location) // Sets The Location
        setIsLocationValid(true) // Sets The Information That The Location Is Valid
        setLocationResults([]) // Sets The Location Results
        setLatitude(latitude) // Sets The Latitude
        setLongitude(longitude) // Sets The Longitude
    }

    // // Location Focus Functionality
    // location_input.addEventListener("focus", function():void {
    //     if(location_results.querySelectorAll(".place").length > 0) location_results.classList.remove("hidden") // Shows The Location Results (If There Are Any)
    // })

    // // Location Blur Functionality
    // location_input.addEventListener("blur", function(event:FocusEvent):void {
    //     if(
    //         !(event.relatedTarget as HTMLDivElement).classList.contains("place") && 
    //         !(event.relatedTarget as HTMLDivElement).classList.contains("location_results") &&
    //         !location_results.classList.contains("hidden")
    //     ) {
    //         location_results.classList.add("hidden") // Hides The Location Results And Prevents Hiding The Places Before Selection (If The User Clicks On The Place In The Location Results In Order To Select)
    //     }
    // })

    // Function For Handle Upload Post Form Submission
    const handleUploadPostSubmission = ():void => {
        Keyboard.dismiss() // Hides The Keyboard
        
        if(selected_files.length === 0) {
            Alert.alert("Chyba", "Vyberte aspoň jednu fotku alebo video.") // Shows The Alert
            return
        }

        // Gets The Selected Files Data
        const selected_files_data:RNMediaAsset[] = selected_files.map((one_selected_file:SelectedFile, index:number) => {
            const is_video:boolean = one_selected_file.type === "video" // Stores The Information If The Selected File Is Video
            const default_extension:"mp4"|"jpg" = is_video ? "mp4" : "jpg" // Sets The Default Extension
            
            const file_name:string = one_selected_file.fileName || `file_${index}_${Date.now()}.${default_extension}` // Sets The File Name
            const file_type:string = one_selected_file.mimeType || (is_video ? "video/mp4" : "image/jpeg") // Sets The File Type

            return {
                uri: one_selected_file.uri,
                fileName: file_name,
                mimeType: file_type,
            }
        })

        // Gets The Media Data
        const media_data = selected_files_data.map((one_selected_file:RNMediaAsset, index:number) => ({
            filename: one_selected_file.fileName as string,
            order: index,
            is_muted: false, 
            thumbnail_filename: ""
        }))

        const thumbnail_files:RNMediaAsset[] = [] // Gets The Thumbnail Files

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
    const uploadPost = async (selected_files:RNMediaAsset[], thumbnail_files:RNMediaAsset[], post_details:PostDetails):Promise<void> => {
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

                            <View className="posts_preview" style={styles.posts_preview}>
                                <SelectPosts onMediaSelection={handleMediaSelection} />
                                {selected_files.length > 0 && (renderPostPreview())} {/* Renders Post Preview */}
                            </View>

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

                            <View className="location_container" style={styles.location_container}>
                                <View className="location_input_container" style={styles.location_input_container}>
                                    <View className="location_icon" style={styles.location_icon}>
                                        <Icon icon_name="location-arrow" />
                                    </View>

                                    <TextInput
                                        className="location"
                                        textAlignVertical="top" 
                                        placeholder="Miesto" 
                                        placeholderTextColor={LIGHT_BLUE_COLOR}
                                        accessibilityLabel="Miesto" 
                                        value={location}
                                        onChangeText={(text) => handleSearchLocation(text)}
                                        maxLength={255}

                                        style={[
                                            styles.location, 
                                            is_location_valid ? { borderBottomColor: GREEN_COLOR } : { borderBottomColor: transparentize(BLUE_COLOR, 0.5) },
                                            { outlineStyle: "none" } as any
                                        ]}
                                    />
                                </View>

                                <ScrollView 
                                    className="location_results_container" 
                                    showsVerticalScrollIndicator={false}
                                    indicatorStyle="white"
                                    style={styles.location_results_container}
                                    contentContainerStyle={styles.location_results_container}
                                >
                                    {is_location_loading && (
                                        <ActivityIndicator className="loading" size="small" color={SECONDARY_COLOR} style={styles.loading} />
                                    )}

                                    <View className="location_results" style={styles.location_results}>
                                        {location_results.map((one_place:NominatimPlace) => (
                                            <Pressable 
                                                className="place"
                                                onPress={() => addLocation(one_place.display_name, Number(one_place.lat), Number(one_place.lon))}
                                                style={styles.place}
                                            >
                                                <Text 
                                                    className="place_text"
                                                    numberOfLines={1} 
                                                    ellipsizeMode="tail"

                                                    style={{ 
                                                        color: SECONDARY_COLOR,
                                                        maxWidth: "100%",
                                                    }}
                                                >
                                                    {one_place.display_name}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

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

    posts_preview: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        width: "100%",
        marginBottom: 20,
    },

    post: {
        position: "relative",
        width: 100,
        height: 100,
        borderRadius: SMALL_BORDER_RADIUS,
        overflow: "hidden",
    },

    posts_preview_loading: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0, 0, 0, 0.6)", // Tmavé polopriehľadné pozadie
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10, // Zabezpečí, že indikátor je nad obrázkom/videom
    },

    loading_progress: {
        fontSize: 15,
        color: "#cccccc",
        zIndex: 50,
        // transition: opacity 1s ease, visibility 1s ease;
    },

    remove_post: {
        position: "absolute",
        right: 0,
        alignItems: "center",
        justifyContent: "center",
        width: 25,
        height: 25,
        margin: 5,
        backgroundColor: transparentize(MAIN_COLOR, 0.8),
        borderRadius: "50%",
        zIndex: 50,
    },

    video_settings: {
        position: "absolute",
        top: 0,
        left: 0,
        flexDirection: "row",
        gap: 5,
        margin: 5,
    },

    toggle_mute: {
        alignItems: "center",
        justifyContent: "center",
        width: 25,
        height: 25,
        zIndex: 50,
    },

    select_thumbnail: {
        alignItems: "center",
        justifyContent: "center",
        width: 25,
        height: 25,
        zIndex: 50,
    },

    tooltip: {
        position: "absolute",
        bottom: 5,
        left: "50%",
        transform: [{ translateX: "-50%" }],
        zIndex: 50,

        // &:hover {
        //     &::before,
        //     &::after {
        //         --scale: 1;
        //         transition: 0.3s transform 1s;
        //     }
        // }
    },

    tooltip_body: {
        // --translate-y: calc(-100% - 10px);
        // --scale: 0;
        position: "absolute",
        top: -1.5,
        left: "50%",

        transform: [
            { translateX: "-50%" },
            // { translateY(var(--translate-y, 0)) },
            // { scale(var(--scale)) }
        ],

        transformOrigin: "bottom center",
        maxWidth: "100%",
        width: "100%",
        padding: 5,
        textAlign: "center",
        borderRadius: SMALL_BORDER_RADIUS,
        fontSize: 15,
        backgroundColor: transparentize(SECONDARY_COLOR, 0.8),
        color: SECONDARY_COLOR,
        // text-shadow: 0px 0px 5px $main-color;
        // transition: 0.3s transform 0s;
    },

    tooltip_triangle: {
        // --translate-y: calc(-1 * 10px);
        // --scale: 0;
        position: "absolute",
        top: -1.5,
        left: "50%",

        transform: [
            { translateX: "-50%" },
            // { translateY(var(--translate-y, 0)) },
            // { scale(var(--scale)) }
        ],

        transformOrigin: "bottom center",
        borderWidth: 10,
        borderTopColor: transparentize(SECONDARY_COLOR, 0.8),
        // transition: 0.3s transform 0s;
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

    location_container: {
        position: "relative",
        padding: 5,
    },

    location_input_container: {
        position: "relative",
    },

    location_icon: {
        position: "absolute",
        bottom: 0,
        left: -16,
        paddingTop: 19,
        paddingBottom: 16,
    },

    location: {
        position: "relative",
        height: 50,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
        // border-color: $blue-color
    },

    location_results_container: {
        position: "relative",
        maxHeight: 50 * 2 + 20 + 20 + 5,
        padding: 10,

        // &:not(:has(.location_results.hidden)) {
        //     background-color: transparentize($blue-color, 0.9);
        //     border: 1px solid transparentize($blue-color, 0.5);
        //     border-radius: 0px 0px $small-border-radius $small-border-radius;
        // }
    },

    loading: {
        position: "absolute",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-100%" },
            { translateY: "-50%" }
        ],
    },

    location_results: {
        // @include scrollbar;
        gap: 10,
        maxHeight: 50 * 2 + 20,
        marginBottom: 50,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,
        opacity: 1,
        // transition: visibility 0.3s ease, opacity 0.3s ease, margin-bottom 0.3s ease;

        // &.hidden {
        //     visibility: hidden;
        //     opacity: 0;
        //     height: 50px;
        //     margin-bottom: 0px;

        //     .place {
        //         pointer-events: none;
        //     }
        // }
    },

    place: {
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

        // &:focus-visible {
        //     background-color: transparentize($blue-color, 0.8);
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