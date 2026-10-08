import { StyleSheet, View, ActivityIndicator, Text } from "react-native"
import Icon from "@/components/Icon"
import { BLUE_COLOR } from "@/constants/colors"

interface AttachmentSelectionProps {
    onShowAttachmentOptions:() => void,
    is_uploading:boolean,
    selected_files_amount:number
}

export default function AttachmentSelection({ onShowAttachmentOptions, is_uploading, selected_files_amount }:AttachmentSelectionProps) {
    return (
        <View style={styles.attachment_selection}>
            {is_uploading ? (
                <ActivityIndicator size="small" color={BLUE_COLOR} />
            ) : (
                <Icon
                    icon_name="plus"
                    onPress={onShowAttachmentOptions}
                />
            )}

            <Text 
                style={[{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    color: BLUE_COLOR,
                }]}
            >
                {selected_files_amount}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    attachment_selection: {
        position: "absolute",
        top: 24,
        left: 6 + 38 + 10 + 20 + 10,
        transform: [{ translateY: "-50%" }],
    },
})
