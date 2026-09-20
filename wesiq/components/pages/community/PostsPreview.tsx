import { useEffect, useState } from "react"
import { View, StyleSheet, Text, Image, Platform, Alert, ActivityIndicator } from "react-native"
import { MAIN_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import SelectPosts from "@/components/SelectPosts"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import * as ImagePicker from "expo-image-picker"
import { ResizeMode, Video } from "expo-av"
import { FontAwesome6 } from "@expo/vector-icons"
import Icon from "@/components/Icon"
import { BlurView } from "expo-blur"

import type { SelectedFile } from "@/components/UploadPostFormDialog"
import type { LoggedInUser } from "@/components/LoginFormDialog"

interface PostsPreviewProps {
    onSelectedFilesUpdate:(selected_files:SelectedFile[]) => void,
    selected_files:SelectedFile[],
    onThumbnailFilesUpdate:(thumbnail_files:ImagePicker.ImagePickerAsset[]) => void,
    thumbnail_files:ImagePicker.ImagePickerAsset[],
    logged_in_user:LoggedInUser|null
}

export const PostsPreview = ({ onSelectedFilesUpdate, onThumbnailFilesUpdate, thumbnail_files, selected_files, logged_in_user }:PostsPreviewProps) => {
    const [post_preview_progress, setPostPreviewProgress] = useState<Record<string, number>>({}) // Stores The Post Preview Progress

    // Function For Handle The Media Selection
    const handleMediaSelection = (new_selected_files:ImagePicker.ImagePickerAsset[]):void => {
        // Gets The Prepared New Selected Files
        const prepared_new_selected_files:SelectedFile[] = new_selected_files.map((one_selected_file:ImagePicker.ImagePickerAsset) => ({
            ...one_selected_file,
            is_muted: false,
            thumbnail_filename: null
        }))

        const updated_selected_files:SelectedFile[] = [...selected_files, ...prepared_new_selected_files].slice(0, 5) // Stores The New State Of Updated Selected Files
        onSelectedFilesUpdate(updated_selected_files) // Sets The Selected Files
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
            const thumbnail_url:string|null = thumbnail_files.find((one_thumbnail_file:ImagePicker.ImagePickerAsset) => one_thumbnail_file.fileName === one_media.thumbnail_filename)?.uri || null // Gets The Thumbnail URL Is Is Available

            // Accepts Only 5 Files And Only The Image And Video Formats
            if(index < 5 && (one_media.type === "image" || one_media.type === "video")) {
                const is_video:boolean = one_media.type === "video" // Gets The Information If The File Is Video
                const current_progress:number = post_preview_progress[one_media.uri] || 0 // Gets The Current Progress
        
                return (
                    <View className="post" key={one_media.assetId || index} style={styles.post}>
                        {current_progress < 100 && (
                            <BlurView 
                                intensity={10} 
                                tint="dark" 
                                style={styles.posts_preview_loading}
                            >
                                <ActivityIndicator className="loading" size="small" color={SECONDARY_COLOR} />
                                <Text className="loading_progress" style={styles.loading_progress}>{current_progress}%</Text>
                            </BlurView>
                        )}

                        <View className="remove_post" accessibilityLabel="Odstrániť..." style={styles.remove_post}>
                            <Icon
                                icon_name="xmark"
                                onPress={() => removeFile(index)} // Removes The File
                                size={22}
                            />
                        </View>

                        {is_video ? (
                            <>  
                                {/* Video */}
                                {one_media.thumbnail_filename && thumbnail_url ? (
                                    <Image 
                                        source={{ uri: thumbnail_url }} 
                                        style={StyleSheet.absoluteFill} 
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Video
                                        source={{ uri: one_media.uri }} // Sets The Source
                                        useNativeControls={false} // Disables The Controls
                                        resizeMode={ResizeMode.COVER}
                                        isLooping={false}
                                        isMuted={true} // Mutes The Video
                                        style={{ width: "100%", height: "100%" }}
                                        // filter: blur(2px);
                                    />
                                )}

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

    // Function For Remove File
    const removeFile = (clicked_index:number):void => {
        const updated_selected_files:SelectedFile[] = selected_files.filter((_, index:number) => index !== clicked_index) // Stores The New State Of Updated Posts
        onSelectedFilesUpdate(updated_selected_files) // Sets The Selected Files
    }

    // Function For Toggle Mute Video
    const toggleMuteVideo = (clicked_index:number):void => {
        // Stores The New State Of Updated Posts
        const updated_selected_files:SelectedFile[] = selected_files.map((one_selected_file:SelectedFile, index:number) => {
            if(index === clicked_index) {
                return {
                    ...one_selected_file,
                    is_muted: !one_selected_file.is_muted
                }
            }

            return one_selected_file // Returns The Unchanged Selected File
        })

        onSelectedFilesUpdate(updated_selected_files) // Sets The Selected Files
    }

    // Function For Select The Thumbnail
    const selectThumbnail = async (clicked_index:number):Promise<void> => {
        try {
            const permission_result = await ImagePicker.requestMediaLibraryPermissionsAsync() // Gets The Permission Result
        
            if(!permission_result.granted) {
                Alert.alert("Prístup zamietnutý", "Pre výber fotiek a videí musíte povoliť prístup.") // Shows The Alert
                return
            }
        
            // Opens The Gallery
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 1
            })
        
            if(!result.canceled && result.assets) {
                // Accepts Only The Image Formats
                const valid_files:ImagePicker.ImagePickerAsset[] = result.assets.filter((one_file:ImagePicker.ImagePickerAsset) => {
                    const is_valid_type = one_file.type === "image"
                    const is_valid_mime = one_file.mimeType
                        ? one_file.mimeType.startsWith("image/")
                        : true
            
                    return is_valid_type && is_valid_mime
                })
        
                if(valid_files.length < result.assets.length) {
                    Alert.alert("Nepodporovaný formát", "Niekteré vybrané súbory boli vynechané, pretože nie sú podporovaným obrázkom.") // Shows The Alert
                }
        
                if(valid_files.length > 0) {
                    // Stores The New State Of Updated Posts
                    const updated_selected_files:SelectedFile[] = selected_files.map((one_selected_file:SelectedFile, index:number) => {
                        if(index === clicked_index) {
                            return {
                                ...one_selected_file,
                                thumbnail_filename: valid_files[0].fileName || null
                            }
                        }

                        return one_selected_file // Returns The Unchanged Selected File
                    })

                    onSelectedFilesUpdate(updated_selected_files) // Sets The Selected Files
                    onThumbnailFilesUpdate([...thumbnail_files, valid_files[0]]) // Sets The Thumbnail Files
                }
            }
        }

        catch(error) {
            console.warn("Pri výbere súborov došlo k chybe.")
            Alert.alert("Nepodporovaný formát", "Niekteré vybrané súbory boli vynechané, pretože nie sú podporovaným obrázkom.") // Shows The Alert
        }
    }

    return (
        <View className="posts_preview" style={styles.posts_preview}>
            <SelectPosts onMediaSelection={handleMediaSelection} />
            {selected_files.length > 0 && (renderPostPreview())} {/* Renders Post Preview */}
        </View>
    )
}

const styles = StyleSheet.create({
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
        justifyContent: "center",
        alignItems: "center",
        borderRadius: SMALL_BORDER_RADIUS,
        zIndex: 100,
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
})