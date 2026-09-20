import { useEffect, useState } from "react"
import { View, StyleSheet, Platform } from "react-native"
import { MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import SelectPosts from "@/components/SelectPosts"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import * as ImagePicker from "expo-image-picker"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { useSharedValue, useAnimatedStyle, withSpring, runOnJS, SharedValue } from "react-native-reanimated"
import { PostPreviewItem } from "./PostPreviewItem"

import type { SelectedFile } from "@/components/UploadPostFormDialog"
import type { LoggedInUser } from "@/components/LoginFormDialog"

interface PostsPreviewProps {
    onSelectedFilesUpdate:(selected_files:SelectedFile[]) => void,
    selected_files:SelectedFile[],
    onThumbnailFilesUpdate:(thumbnail_files:ImagePicker.ImagePickerAsset[]) => void,
    thumbnail_files:ImagePicker.ImagePickerAsset[],
    logged_in_user:LoggedInUser|null
}

export const PostsPreview = ({ 
    onSelectedFilesUpdate, 
    onThumbnailFilesUpdate, 
    thumbnail_files, 
    selected_files, 
    logged_in_user
}:PostsPreviewProps) => {
    const [post_preview_progress, setPostPreviewProgress] = useState<Record<string, number>>({}) // Stores The Post Preview Progress
    const [tooltips, setTooltips] = useState<(string|number)[]>([]) // Stores The Tooltips

    const [drop_zone, setDropZone] = useState({ x: 0, y: 0, width: 0, height: 0 })
    const [dragged_file, setDraggedFile] = useState<SelectedFile|null>(null) // Stores The Dragged File
    const drag_x:SharedValue<number> = useSharedValue(0)
    const drag_y:SharedValue<number> = useSharedValue(0)
    const active_drag_index:SharedValue<number|null> = useSharedValue<number|null>(null) // Stores The Active Drag Index
    const hovered_index:SharedValue<number|null> = useSharedValue<number|null>(null) // Stores The Hovered Index

    // Function To Handle Start Of The File Drag From The Posts Preview
    const handleDragStart = (x:number, y:number, dragged_file:SelectedFile):void => {
        drag_x.value = x
        drag_y.value = y

        setDraggedFile(dragged_file) // Sets The Dragged File From The Posts Preview
        onThumbnailFilesUpdate(thumbnail_files) // Sets The Thumbnail Files
    }

    // Function To Handle The File Drop From The Posts Preview
    const handleDrop = (x:number, y:number, dragged_file:SelectedFile, dropped_index:number|null):void => {
        if(dropped_index === null) {
            setDraggedFile(null) // Sets The Dragged File From The Posts Preview
            return
        }

        const previous_index:number = selected_files.findIndex(one_selected_file => one_selected_file.assetId === dragged_file.assetId) // Gets The Previous Index

        if (
            previous_index === -1 || 
            dropped_index === null || 
            dropped_index === -1 || 
            previous_index === dropped_index
        ) {
            setDraggedFile(null) // Sets The Dragged File From The Posts Preview
            return
        }

        const updated_selected_files = [...selected_files] // Stores The New State Of Updated Selected Files
        const [moved_item] = updated_selected_files.splice(previous_index, 1)
        updated_selected_files.splice(dropped_index, 0, moved_item) // Reorders The Selected Files

        onSelectedFilesUpdate(updated_selected_files) // Sets The Selected Files
        setDraggedFile(null) // Sets The Dragged File From The Posts Preview
    }

    const ITEM_SIZE = 100;
    const GAP = 10;
    const STEP = ITEM_SIZE + GAP; // 110 (o toľkoto sa posúvame o jednu bunku)

    // POZOR: Toto musíš prispôsobiť svojej apke. 
    // Ak je grid pevný (napríklad vždy 3 stĺpce), napíš 3. 
    // Prípadne to vypočítaj z drop_zone: Math.floor(drop_zone.width / STEP)
    const COLUMNS = 3;

    // Function For Initialize The Drag Gesture
    const initializeDragGesture = (selected_file:SelectedFile, index:number) => {
        return Gesture.Pan()
            // Creates The Drag Gesture (Starts After 250MS Hold)
            .activateAfterLongPress(250)
            .onStart((event) => {
                active_drag_index.value = index
                drag_x.value = 0
                drag_y.value = 0

                runOnJS(handleDragStart)(event.absoluteX, event.absoluteY, selected_file)
            })
            .onChange((event) => {
                drag_x.value = event.translationX
                drag_y.value = event.translationY

                const local_x:number = event.absoluteX - (drop_zone?.x || 0) // Gets The Local X Position
                const local_y:number = event.absoluteY - (drop_zone?.y || 0) // Gets The Local Y Position

                const column:number = Math.floor(local_x / STEP) // Gets The Column
                const row:number = Math.floor(local_y / STEP) // Gets The Row
                const safe_column:number = Math.max(0, Math.min(column, COLUMNS - 1)) // Gets The Safe Column
                const safe_row:number = Math.max(0, row) // Gets The Safe Row
                const new_hovered_index:number = (safe_row * COLUMNS) + safe_column // Gets The New Hovered Index
                
                hovered_index.value = Math.max(0, Math.min(new_hovered_index, selected_files.length - 1)) // Sets The Hovered Index
            })
            .onFinalize((event) => {
                runOnJS(handleDrop)(event.absoluteX, event.absoluteY, selected_file, hovered_index.value)
                
                active_drag_index.value = null // Sets The Active Drag Index
                hovered_index.value = null // Sets The Hovered Index
                
                drag_x.value = withSpring(0)
                drag_y.value = withSpring(0)
            })
    }

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
            const key:string|number = one_media.assetId || index // Gets The Key
            const thumbnail_url:string|null = thumbnail_files.find((one_thumbnail_file:ImagePicker.ImagePickerAsset) => one_thumbnail_file.fileName === one_media.thumbnail_filename)?.uri || null // Gets The Thumbnail URL Is Is Available

            // Accepts Only 5 Files And Only The Image And Video Formats
            if(index < 5 && (one_media.type === "image" || one_media.type === "video")) {
                const is_video:boolean = one_media.type === "video" // Gets The Information If The File Is Video
                const current_progress:number = post_preview_progress[one_media.uri] || 0 // Gets The Current Progress

                return (
                    <GestureDetector 
                        gesture={initializeDragGesture(one_media, index)}
                        key={key} 
                    >
                        <PostPreviewItem 
                            onSelectedFilesUpdate={(selected_files:SelectedFile[]) => onSelectedFilesUpdate(selected_files)}
                            selected_files={selected_files}
                            onThumbnailFilesUpdate={(thumbnail_files:ImagePicker.ImagePickerAsset[]) => onThumbnailFilesUpdate(selected_files)}
                            thumbnail_files={thumbnail_files}
                            key={key}
                            thumbnail_url={thumbnail_url}
                            index={index}
                            active_drag_index={active_drag_index}
                            hovered_index={hovered_index}
                            drag_x={drag_x}
                            drag_y={drag_y}
                            is_video={is_video}
                            current_progress={current_progress}
                            selected_file={one_media}
                            MAX_IMAGE_SIZE={MAX_IMAGE_SIZE}
                            MAX_VIDEO_SIZE={MAX_VIDEO_SIZE}
                            MAX_VIDEO_DURATION={MAX_VIDEO_DURATION}
                            MIN_VIDEO_DURATION={MIN_VIDEO_DURATION}
                        />
                    </GestureDetector>
                )
            }
        })
    }

    return (
        <View 
            className="posts_preview" 
            onLayout={(event) => {setDropZone(event.nativeEvent.layout)}}
            style={styles.posts_preview}
        >
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