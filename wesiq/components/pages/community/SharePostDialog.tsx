import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet"
import { RefObject, useMemo } from "react"
import { StyleSheet, FlatList, Pressable, Text, View } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import ProfilePicture from "@/components/ProfilePicture"
import { BIG_BORDER_RADIUS } from "@/constants/borders"
import { useTranslation } from "react-i18next"

import type { Post, Following } from "./Feed"
import { FontAwesome6 } from "@expo/vector-icons"

interface SharePostDialogProps {
    friends:Following[],
    onSharePostToChat:(friend_username:string) => void,
    onSharePost:() => void,
    is_sending: boolean,
    share_post_dialog:RefObject<BottomSheetModal|null>,
    share_post_dialog_sheet:"main",
    selected_post:Post|null,
    handleSharePostDialogChanges:() => void
}

export const SharePostDialog = ({ 
    friends, 
    onSharePostToChat, 
    onSharePost,
    is_sending, 
    share_post_dialog,
    share_post_dialog_sheet,
    selected_post,
    handleSharePostDialogChanges,
}:SharePostDialogProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points

    return (
        <BottomSheetModal
            ref={share_post_dialog}
            snapPoints={snap_points}
            enablePanDownToClose={true}
            onChange={handleSharePostDialogChanges}
            containerStyle={{ zIndex: 9999 }}
        >
            <BottomSheetView style={{ padding: 20 }}>
                {selected_post ? (
                    <View className="share_post_dialog">
                        {share_post_dialog_sheet === "main" && (
                            <View style={styles.sheet_container}>
                                <Pressable
                                    className="show_report_post_button"
                                    onPress={onSharePost}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        pressed && styles.sheet_item_pressed,
                                        { justifyContent: "center" },
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <FontAwesome6
                                            name="share-nodes"
                                            size={20}
                                            solid={false}
                                            color={BLUE_COLOR}
                                        />
                                    </View>

                                    <Text style={styles.sheet_text}>{t("Zdielať inde")}</Text>
                                </Pressable>

                                <FlatList
                                    data={friends}
                                    keyExtractor={(one_friend) => one_friend.id.toString()}

                                    renderItem={({ item }) => (
                                        <View style={styles.sheet_item}>
                                            <ProfilePicture
                                                user_id={item.id}
                                                user_profile_picture_name={item.profile_picture_name}
                                                user_subscription={item.subscription?.is_active || false} 
                                            />

                                            <Text>{item.username}</Text>
                                            
                                            <Pressable 
                                                style={styles.send_button}
                                                onPress={() => onSharePostToChat(item.username)}
                                                disabled={is_sending}
                                            >
                                                <Text style={styles.send_button_text}>{is_sending ? t("Posiela sa...") : t("Odoslať")}</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                />
                            </View>
                        )}
                    </View>
                ) : null}
            </BottomSheetView>
        </BottomSheetModal>
    )
}

const styles = StyleSheet.create({
    send_button: {
        alignItems: "center",
        justifyContent: "center",
        minWidth: 80,
        marginLeft: "auto",
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: BLUE_COLOR,
        borderWidth: 1,
        borderColor: DARK_BLUE_COLOR,
        borderRadius: BIG_BORDER_RADIUS,
    },
    
    send_button_text: {
        color: SECONDARY_COLOR,
        fontWeight: "bold",
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