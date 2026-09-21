import { useEffect, useState } from "react"
import { View, StyleSheet, Text, Image, Platform, Alert, ActivityIndicator, Pressable } from "react-native"
import { MAIN_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import * as ImagePicker from "expo-image-picker"
import { ResizeMode, Video } from "expo-av"
import { FontAwesome6 } from "@expo/vector-icons"
import Icon from "@/components/Icon"
import { BlurView } from "expo-blur"
import { Tooltip } from "@/components/Tooltip"
import Animated, { useAnimatedStyle, withSpring, SharedValue } from "react-native-reanimated"

import type { SelectedFile } from "./UploadPostFormDialog"

interface PostPreviewItemProps {
    onSelectedFilesUpdate:(selected_files:SelectedFile[]) => void,
    selected_files:SelectedFile[],
    onThumbnailFilesUpdate:(thumbnail_files:ImagePicker.ImagePickerAsset[]) => void,
    thumbnail_files:ImagePicker.ImagePickerAsset[],
    key:string|number,
    thumbnail_url:string|null,
    index:number,
    active_drag_index:SharedValue<number | null>,
    hovered_index:SharedValue<number | null>,
    drag_x:SharedValue<number>,
    drag_y:SharedValue<number>,
    is_video:boolean,
    current_progress:number,
    selected_file:SelectedFile,
    MAX_IMAGE_SIZE:number,
    MAX_VIDEO_SIZE:number,
    MAX_VIDEO_DURATION:number,
    MIN_VIDEO_DURATION:number
}

export const PostPreviewItem = ({ 
    onSelectedFilesUpdate, 
    onThumbnailFilesUpdate, 
    thumbnail_files, 
    selected_files, 
    key,
    thumbnail_url,
    index,
    active_drag_index,
    hovered_index,
    drag_x,
    drag_y,
    is_video,
    current_progress,
    selected_file,
    MAX_IMAGE_SIZE,
    MAX_VIDEO_SIZE,
    MAX_VIDEO_DURATION,
    MIN_VIDEO_DURATION
}:PostPreviewItemProps) => {
    const [post_preview_progress, setPostPreviewProgress] = useState<Record<string, number>>({}) // Stores The Post Preview Progress
    const [tooltips, setTooltips] = useState<(string|number)[]>([]) // Stores The Tooltips

    const ITEM_SIZE:number = 100 // Defines The Item Size
    const GAP:number = 10 // Defines The Gap
    const STEP:number = ITEM_SIZE + GAP // Defines The Step
    const COLUMNS:number = 3 // Defines The Columns

    // Animates The Shift
    const animated_shift = useAnimatedStyle(() => {
        const is_dragging:boolean = active_drag_index.value === index // Checks If The Post Is Currently Being Dragged
    
        if(is_dragging) {
            return {
                transform: [
                    { translateX: drag_x.value },
                    { translateY: drag_y.value },
                    { scale: 1.05 },
                ],

                backfaceVisibility: "hidden",
                zIndex: 9999,
            }
        }
    
        if(active_drag_index.value === null || hovered_index.value === null) {
            return { 
                transform: [{ translateX: withSpring(0) }, { translateY: withSpring(0) }],
                zIndex: 1,
            }
        }
    
        let target_index:number = index // Stores The Target Index
        if(index > active_drag_index.value && index <= hovered_index.value) target_index = index - 1 // Up And Left Shift
        else if(index < active_drag_index.value && index >= hovered_index.value) target_index = index + 1 // Down And Right Shift
    
        if(target_index === index) {
            return { 
                transform: [{ translateX: withSpring(0) }, { translateY: withSpring(0) }],
                zIndex: 1 
            }
        }
        
        const current_column:number = index % COLUMNS // Gets The Current Column
        const current_row:number = Math.floor(index / COLUMNS) // Gets The Current Row
        const target_column = target_index % COLUMNS // Gets The Target Column
        const target_row = Math.floor(target_index / COLUMNS) // Gets The Target Row
    
        const shift_x = (target_column - current_column) * STEP // Gets The Shift On X Axis
        const shift_y = (target_row - current_row) * STEP // Gets The Shift On Y Axis
    
        return { 
            transform: [
                { translateX: withSpring(shift_x) },
                { translateY: withSpring(shift_y) },
            ],

            zIndex: 1,
        }
    })

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

    // Function For Toggle Show / Hide Tooltip
    const toggleShowTooltip = (key:string|number) => {
        setTooltips((previous_tooltips) => {
            const is_already_open:boolean = previous_tooltips.some((one_tooltip:string|number) => one_tooltip === key) // Checks If The Tooltip Is Already Open

            if(is_already_open) return previous_tooltips.filter((one_tooltip:string|number) => one_tooltip !== key) // Hkeyes The Tooltip
            else return [...previous_tooltips, key] // Shows The Tooltip
        })
    }

    // Function For Remove File
    const removeFile = (clicked_index:number):void => {
        const updated_selected_files:SelectedFile[] = selected_files.filter((_, index:number) => index !== clicked_index) // Stores The New State Of Updated Selected Files
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
        <Animated.View 
            className="post" 

            style={[
                styles.post, 
                animated_shift
            ]}
        >
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
                    {selected_file.thumbnail_filename && thumbnail_url ? (
                        <Image 
                            source={{ uri: thumbnail_url }} 
                            style={StyleSheet.absoluteFill} 
                            resizeMode="cover"
                        />
                    ) : (
                        <Video
                            source={{ uri: selected_file.uri }} // Sets The Source
                            useNativeControls={false} // Disables The Controls
                            resizeMode={ResizeMode.COVER}
                            isLooping={false}
                            isMuted={true} // Mutes The Video
                            style={{ width: "100%", height: "100%" }}
                            // filter: blur(2px);
                        />
                    )}

                    {/* Checks The Video Size */}
                    {selected_file.fileSize && selected_file.fileSize > MAX_VIDEO_SIZE && (
                        <>
                            <Pressable 
                                className="tooltip" 
                                onPress={() => toggleShowTooltip(key)}
                                style={styles.tooltip}
                            >
                                <FontAwesome6
                                    name="triangle-exclamation"
                                    size={20}
                                    color={YELLOW_COLOR}
                                />    
                            </Pressable>

                            {tooltips.includes(key) && (<Tooltip text="Video je príliš veľké" />)}
                        </>
                    )}

                    {/* Checks The Video Duration */}
                    {selected_file.duration || 0 > MAX_VIDEO_DURATION && (
                        tooltips.includes(key) && (<Tooltip text="Video je príliš dlhé" />)
                    )}

                    {/* Checks The Video Duration */}
                    {selected_file.duration || 0 < MIN_VIDEO_DURATION && (
                        tooltips.includes(key) && (<Tooltip text="Video je príliš krátke" />)
                    )}

                    <View className="video_settings" style={styles.video_settings}>
                        <View className="toggle_mute" accessibilityLabel="Vypnúť zvuk" style={styles.toggle_mute}>
                            <Icon
                                icon_name={selected_file.is_muted ? "volume-xmark" : "volume-high"}
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
                        source={{ uri: selected_file.uri }}
                        style={{ width: "100%", height: "100%" }}
                        // filter: blur(2px);
                    />

                    {/* Checks The Image Size */}
                    {selected_file.fileSize || 0 > MAX_IMAGE_SIZE && (
                        tooltips.includes(key) && (<Tooltip text="Obrázok je príliš veľký" />)
                    )}
                </>
            )}
        </Animated.View>
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
        // top: -1.5,
        bottom: 35 + 1,
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
        // top: -1.5,
        bottom: 15 + 1,
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