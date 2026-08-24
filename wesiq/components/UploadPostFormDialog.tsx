import React, { useState } from "react"
import { View, StyleSheet, Modal, Text, KeyboardAvoidingView, TextInput, Pressable, Image, Platform, TouchableWithoutFeedback, Keyboard, Button, Alert } from "react-native"
import { MAIN_COLOR, SECONDARY_COLOR, BLUE_COLOR, transparentize, LIGHT_BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, RED_COLOR } from "@/constants/colors"
import { BlurView } from "expo-blur"
import SelectPosts from "@/components/SelectPosts"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "./Icon"
import EmojiPicker from "rn-emoji-keyboard"
import * as ImagePicker from "expo-image-picker"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { API_URL } from "@/constants/general"
import AsyncStorage from "@react-native-async-storage/async-storage"

type UploadPostFormDialogProps = {
    visible:boolean
    onClose:() => void
}

export interface uploadPostResponse {
    success:boolean,
    compress_tasks?:compressTask[],
    message?:string
}

export interface compressTask {
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

export interface uploadProgressResponse {
    success:boolean,

    upload_progress:{
        task_id:string,
        state:"PENDING"|"PROGRESS"|"SUCCESS"|"FAILURE",
        progress:number
    },

    message:string
}

export default function UploadPostFormDialog({ visible, onClose }:UploadPostFormDialogProps) {
    const [selected_files, setSelectedFiles] = useState<ImagePicker.ImagePickerAsset[]>([]) // Stores The Selected Files
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
    const [upload_progress, setUploadProgress] = useState<number>(0) // Stores The Upload Progress

    const MAX_DESCRIPTION_LENGTH:number = 500 // Defines The Maximum Description Length

    // Function For Handle The Media Selection
    const handleMediaSelection = (new_selected_files:ImagePicker.ImagePickerAsset[]) => {
        setSelectedFiles((previous_selected_files) => [...previous_selected_files, ...new_selected_files]) // Sets The Selected Files
    }

    // Function For Render Post Preview
    const renderPostPreview = () => {
        return selected_files.map((one_media:ImagePicker.ImagePickerAsset, index:number) => (
            <View key={one_media.assetId || index} style={styles.post}>
                <Image 
                    source={{ uri: one_media.uri }} 
                    style={{ width: "100%", height: "100%" }}
                />
            </View>
        ))
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

    //  // Location Input Functionality
    //  location_input.addEventListener("input", function():void {
    //     clearTimeout(debounce_timeout) // Clears The Debounce Timeout

    //     const searched_location = location_input.value // Gets The Searched Location

    //     if(searched_location.length < 3) {
    //         const all_places:NodeListOf<HTMLDivElement> = location_results.querySelectorAll<HTMLDivElement>(".place") // Gets All Places

    //         if(location_results.querySelectorAll(".place").length > 0) {
    //             all_places.forEach(function(one_place:HTMLDivElement):void {
    //                 one_place.remove() // Removes The Place From The DOM
    //             })
    //         }

    //         location_loading.classList.add("hidden") // Hides The Loader
    //         location_results.classList.add("hidden") // Hides The Location Results
    //         return
    //     }

    //     location_loading.classList.remove("hidden") // Shows The Loader

    //     // Gets Location After 1000 MS Delay (Because of The Nominatim Usage Policy - 1 Request per Second)
    //     debounce_timeout = window.setTimeout(function():void {
    //         getLocation(searched_location, location_results, location_input, latitude, longitude)
    //     }, 1000)
    // })

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

    // // Change Focused Place In The Location Results
    // location_container.addEventListener("keydown", function(event:KeyboardEvent):void {
    //     if(event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter") event.preventDefault() // Prevents Default Behaviour

    //     if(event.key === "ArrowUp") changeFocusedPlace(location_state.focused_place_index - 1, location_results) // Changes Focused Place (Shows The Previous Place)
    //     else if(event.key === "ArrowDown") changeFocusedPlace(location_state.focused_place_index + 1, location_results) // Changes Focused Place (Shows The Next Place)

    //     else if(event.key === "Enter") {
    //         const all_places:NodeListOf<HTMLDivElement> = location_results.querySelectorAll(".place"); // Gets All Places

    //         (all_places[location_state.focused_place_index] as HTMLDivElement).click() // Adds The Location Name To The Location Input Value After Click
    //         upload_post_form_dialog.showModal() // Shows The Upload Post Form Dialog
    //     }
    // })

    // Function For Handle Upload Post Form Submission
    const handleUploadPostSubmission = ():void => {
        if(selected_files.length === 0) {
            Alert.alert("Chyba", "Vyberte aspoň jednu fotku alebo video.") // Shows The Alert
            return
        }

        // Gets The Selected Files Data
        const selected_files_data:RNMediaAsset[] = selected_files.map((one_selected_file:ImagePicker.ImagePickerAsset, index:number) => {
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

    // Function For Upload The Post
    const uploadPost = async (selected_files:RNMediaAsset[], thumbnail_files:RNMediaAsset[], post_details:PostDetails):Promise<void> => {
        setIsUploading(true) // Sets The Information That The Post Is Uploading
        setButtonText("Overuje sa...") // Sets The Button Text
    
        try {
            const form_data:FormData = new FormData() // Gets The Form Data
    
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
                form_data.append("select_posts", file_data) // Appends The Selected Posts To The Form Data
            }
            
            for(const one_thumbnail of thumbnail_files) {
                const thumbnail_data = await prepareFileForFormData(one_thumbnail) // Gets The Thumbnail Data
                form_data.append("select_thumbnail", thumbnail_data) // Appends The Selected Thumbnail To The Form Data
            }
    
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const upload_post_response:Response = await fetch(`${API_URL}/upload-post/`, {
                method: "POST",

                headers: {
                    // "Content-Type": "multipart/form-data",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: form_data,
            })
    
            const upload_post_data:uploadPostResponse = await upload_post_response.json() // Gets The Upload Post Data
    
            if(upload_post_response.ok && upload_post_data.success) {
                if(upload_post_data.compress_tasks && upload_post_data.compress_tasks.length > 0) {
                    const existing_tasks:string|null = await AsyncStorage.getItem("processing_posts") // Gets The Existing Tasks Of The Processing Posts From The Async Storage
                    let processing_posts:compressTask[] = existing_tasks ? JSON.parse(existing_tasks) : [] // Gets The Processing Posts

                    processing_posts.push(...upload_post_data.compress_tasks) // Adds The New Tasks Of Processing Posts
                    await AsyncStorage.setItem("processing_posts", JSON.stringify(processing_posts)) // Saves Updated Processing Posts To The Async Storage

                    const all_task_ids:string[] = upload_post_data.compress_tasks.map(one_task => one_task.task_id) // Stores All UUIDs Of Tasks (Uploaded Files)
                    
                    setUploadProgress(0) // Sets The Upload Progress To 0
                    setButtonText("Spracuváva sa...") // Sets The Button Text

                    // Checks The Progress Of Uploaded Posts
                    const check_upload_progress_interval = setInterval(async () => {
                        try {
                            const upload_progress_response_promises:Promise<uploadProgressResponse>[] = all_task_ids.map(async (one_task_id:string):Promise<uploadProgressResponse> => {
                                
                                const upload_progress_response:Response = await fetch(`${API_URL}/get-upload-progress/${one_task_id}/`, {
                                    headers: { "Authorization": `Bearer ${user_token}` }
                                })
                                
                                if(!upload_progress_response.ok) throw new Error("Chyba servera")
                                return upload_progress_response.json() as Promise<uploadProgressResponse>
                            })
                            const tasks_results:uploadProgressResponse[] = await Promise.all(upload_progress_response_promises)

                            const all_tasks_finished:boolean = tasks_results.every(one_task => one_task.upload_progress.state.toUpperCase() === "SUCCESS") // If Every Tasks Has Been Succeeded
                            const any_task_failed:boolean = tasks_results.some(one_task => one_task.upload_progress.state.toUpperCase() === "FAILURE") // If Any Task Has Failed

                            let total_progress:number = 0 // Stores The Total Progress

                            tasks_results.forEach(one_task => {
                                if(one_task.upload_progress) {
                                    if(one_task.upload_progress.state.toUpperCase() === "SUCCESS") total_progress += 100
                                    else if(one_task.upload_progress.progress !== undefined) total_progress += one_task.upload_progress.progress
                                }
                            })

                            const overall_progress_percentage:number = Math.round(total_progress / all_task_ids.length) // Gets The Overall Progress Percentage
                            setUploadProgress(overall_progress_percentage) // Sets The Upload Progress
                            onClose() // Closes The Upload Post Form

                            if(all_tasks_finished) {
                                clearInterval(check_upload_progress_interval) // Deletes The Upload Progress Interval
                            }

                            else if(any_task_failed) {
                                clearInterval(check_upload_progress_interval) // Deletes The Upload Progress Interval
                                setButtonText("Chyba pri spracovaní") // Sets The Button Text
                            }
                        } 
                        
                        catch {
                            setButtonText("Chyba spojenia") // Sets The Button Text
                        }
                    }, 1500)
                }
                
                else {
                    setButtonText("Skúste znovu") // Sets The Button Text
                }
            }
             
            else {
                setButtonText("Skúste znovu") // Sets The Button Text
            }
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
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.backdrop}>
                    <BlurView intensity={25} style={StyleSheet.absoluteFill} />

                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            { backgroundColor: transparentize(MAIN_COLOR, 0.5) },
                        ]}
                    />

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

                                {selected_files.length > 0 && (
                                    renderPostPreview() // Renders Post Preview
                                )}
                            </View>

                            <View className="post_info_container" style={styles.post_info_container}>
                                <TextInput
                                    className="description"
                                    multiline={true} 
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
                                        onChangeText={setLocation}
                                        maxLength={255}

                                        style={[
                                            styles.location, 
                                            { outlineStyle: "none" } as any
                                        ]}
                                    />
                                </View>

                                <View className="location_results_container">
                                    <View className="loading hidden"></View>
                                    <View className="location_results hidden"></View>
                                </View>
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
                </View>
            </TouchableWithoutFeedback>
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