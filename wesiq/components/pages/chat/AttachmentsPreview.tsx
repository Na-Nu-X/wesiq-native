import { View, StyleSheet } from "react-native"
import { AttachmentPreviewItem } from "./AttachmentPreviewItem"

import type { SelectedFile } from "./ChatContainer"

interface AttachmentsPreviewProps {
    onSelectedFilesUpdate:(selected_files:SelectedFile[]) => void,
    selected_files:SelectedFile[]
}

export const AttachmentsPreview = ({ onSelectedFilesUpdate, selected_files }:AttachmentsPreviewProps) => {
    return (
        <View 
            className="attachments_preview" 
            style={styles.attachments_preview}
        >
            {selected_files.length > 0 && (
                selected_files.map((one_selected_file:SelectedFile, index:number) => (
                    <AttachmentPreviewItem 
                        key={index} 
                        one_selected_file={one_selected_file} 
                        onSelectedFilesUpdate={(selected_files:SelectedFile[]) => onSelectedFilesUpdate(selected_files)}
                        selected_files={selected_files} 
                        index={index}
                    />
                ))
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    attachments_preview: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        width: "100%",
    },
})