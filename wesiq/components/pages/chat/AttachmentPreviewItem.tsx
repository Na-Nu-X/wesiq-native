import { View, StyleSheet, Image, ImageSourcePropType, Text } from "react-native"
import { MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { useTranslation } from "react-i18next"
import { useVideoPlayer, VideoPlayer, VideoView } from "expo-video"
import { FILE_ICONS } from "./OneMessageContainer"

import type { SelectedFile } from "./ChatContainer"

interface AttachmentPreviewItemProps {
    one_selected_file:SelectedFile,
    onSelectedFilesUpdate:(selected_files:SelectedFile[]) => void,
    selected_files:SelectedFile[],
    index:number
}

export const AttachmentPreviewItem = ({ 
    one_selected_file, 
    onSelectedFilesUpdate, 
    selected_files, 
    index 
}:AttachmentPreviewItemProps) => {
    const { t } = useTranslation() // Initializes The Translations

    // Creates The Video Player
    const video_player:VideoPlayer = useVideoPlayer(one_selected_file.uri, (player:VideoPlayer) => {
        player.loop = false
        player.muted = true // Mutes The Video
        player.staysActiveInBackground = false
    })

    // Function For Get The File Icon
    const getFileIcon = (file_type:string, file_name:string):ImageSourcePropType => {
        if(!file_type) return FILE_ICONS.file
    
        const type:string = file_type.toLowerCase()
        const name:string = file_name.toLowerCase()
    
        if(type.startsWith("audio/")) return FILE_ICONS.audio
        if(type.includes("pdf") || name.endsWith(".pdf")) return FILE_ICONS.pdf
        if(type.includes("word") || type.includes("document") || name.endsWith(".doc") || name.endsWith(".docx")) return FILE_ICONS.doc
        if(type.includes("excel") || type.includes("spreadsheet") || name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return FILE_ICONS.excel
        if(type.includes("powerpoint") || type.includes("presentation") || name.endsWith(".ppt") || name.endsWith(".pptx")) return FILE_ICONS.powerpoint
        if(type.includes("zip") || type.includes("rar") || type.includes("tar") || type.includes("7z") || type.includes("archive")) return FILE_ICONS.archive
        if(type.startsWith("text/")) return FILE_ICONS.text

        return FILE_ICONS.file // Returns The Icon
    }

    // Function For Remove File
    const removeFile = (clicked_index:number):void => {
        const updated_selected_files:SelectedFile[] = selected_files.filter((_, index:number) => index !== clicked_index) // Stores The New State Of Updated Selected Files
        onSelectedFilesUpdate(updated_selected_files) // Sets The Selected Files
    }

    return (
        <View 
            className="attachment" 

            style={[
                styles.attachment,
                !one_selected_file.type.startsWith("image/") && !one_selected_file.type.startsWith("video/") ? { justifyContent: "space-between", padding: 5 } : {},
            ]}
        >
            {/* {current_progress < 100 && (
                <BlurView 
                    intensity={10} 
                    tint="dark" 
                    style={styles.attachments_preview_loading}
                >
                    <ActivityIndicator className="loading" size="small" color={SECONDARY_COLOR} />
                    <Text className="loading_progress" style={styles.loading_progress}>{current_progress}%</Text>
                </BlurView>
            )} */}

            <View className="remove_attachment" accessibilityLabel={t("Odstrániť...")} style={styles.remove_attachment}>
                <Icon
                    icon_name="xmark"
                    onPress={() => removeFile(index)} // Removes The File
                    size={22}
                />
            </View>

            {one_selected_file.type.startsWith("image/") && (
                <Image
                    source={{ uri: one_selected_file.uri }}
                    style={{ width: "100%", height: "100%" }}
                    // filter: blur(2px);
                />
            )}

            {one_selected_file.type.startsWith("video/") && (
                <VideoView
                    player={video_player}
                    nativeControls={false} // Disables The Controls
                    style={{ width: "100%", height: "100%" }}
                />
            )}

            {!one_selected_file.type.startsWith("image/") && !one_selected_file.type.startsWith("video/") && (
                <>
                    <Image
                        source={getFileIcon(one_selected_file.type, one_selected_file.name)}
                        
                        style={{
                            width: 24,
                            height: 24,
                            resizeMode: "contain",
                        }}
                    />

                    <Text 
                        numberOfLines={2}
                        ellipsizeMode="tail" 

                        style={{ 
                            fontSize: 12,
                            color: SECONDARY_COLOR,
                        }}
                    >
                        {one_selected_file.name}
                    </Text>
                </>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    attachment: {
        position: "relative",
        width: 80,
        height: 80,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        borderRadius: SMALL_BORDER_RADIUS,
        overflow: "hidden",
    },

    attachments_preview_loading: {
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

    remove_attachment: {
        position: "absolute",
        top: 5,
        right: 5,
        alignItems: "center",
        justifyContent: "center",
        width: 25,
        height: 25,
        backgroundColor: transparentize(MAIN_COLOR, 0.8),
        borderRadius: "50%",
        zIndex: 50,
    },
})