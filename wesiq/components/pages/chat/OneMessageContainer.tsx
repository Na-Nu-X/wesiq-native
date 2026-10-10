import Icon from "@/components/Icon"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import { View, StyleSheet, Pressable, Image, Text, ImageSourcePropType, Platform, Alert } from "react-native"
import { useTranslation } from "react-i18next"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import { DynamicImage } from "../community/DynamicImage"
import { LinkPreview } from "@flyerhq/react-native-link-preview"
import { FontAwesome6 } from "@expo/vector-icons"
import { File as ExpoFile, Paths } from "expo-file-system"
import { getReadableSize } from "@/utils/getReadableSize"
import { DOMAIN } from "@/constants/general"
import { isUrlInText } from "@/utils/isUrlInText"
import * as Sharing from "expo-sharing"

import type { Chat, MessageReaction, Attachment } from "@/app/(tabs)/chat/[username]"

// Defines The File Icons
export const FILE_ICONS:{
    audio:ImageSourcePropType,
    pdf:ImageSourcePropType,
    doc:ImageSourcePropType,
    excel:ImageSourcePropType,
    powerpoint:ImageSourcePropType,
    archive:ImageSourcePropType,
    text:ImageSourcePropType,
    file:ImageSourcePropType
} = {
    audio: require("@/assets/images/files/mp3.png"), // https://www.flaticon.com/free-icon/mp3_11039890
    pdf: require("@/assets/images/files/pdf.png"), // https://www.flaticon.com/free-icon/pdf_4726010
    doc: require("@/assets/images/files/doc.png"), // https://www.flaticon.com/free-icon/doc_4725970
    excel: require("@/assets/images/files/xls.png"), // https://www.flaticon.com/free-icon/xls_4726040
    powerpoint: require("@/assets/images/files/ppt.png"), // https://www.flaticon.com/free-icon/ppt_4726016
    archive: require("@/assets/images/files/zip.png"), // https://www.flaticon.com/free-icon/zip_4726042
    text: require("@/assets/images/files/txt.png"), // https://www.flaticon.com/free-icon/txt_9034470
    file: require("@/assets/images/files/file.png"), // https://www.flaticon.com/free-icon/paper_1250627
}

interface OneMessageContainerProps {
    one_chat:Chat,
    selected_message_for_edit:Chat|null,
    onCancelEditMessage:() => void,
    onShowMessageProperties:(message:Chat) => void,
    onViewedImagesUpdate:(viewed_images:{ images:{ uri:string }[], index:number }) => void,
    onViewedVideoUpdate:(viewed_video:string|null) => void
}

export const OneMessageContainer = ({ 
    one_chat,
    selected_message_for_edit,
    onCancelEditMessage,
    onShowMessageProperties,
    onViewedImagesUpdate,
    onViewedVideoUpdate
}:OneMessageContainerProps) => {
    const { t } = useTranslation() // Initializes The Translations

    // Function For Download The File
    const downloadFile = async (file_url:string, filename:string):Promise<void> => {
        try {
            // Web
            if(Platform.OS === "web") {
                const link:HTMLAnchorElement = document.createElement("a") // Creates The Link
                link.href = file_url
                link.download = filename
                link.target = "_blank"

                document.body.appendChild(link) // Appends The Link To The Document
                link.click() // Opens The Download Menu
                document.body.removeChild(link) // Removes The Link From The Document
            } 
            
            // iOS And Android
            else {
                const destination_file:ExpoFile = new ExpoFile(Paths.document, filename) // Creates The Destination File
    
                await ExpoFile.downloadFileAsync(file_url, destination_file)
    
                if(await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(destination_file.uri, {
                        UTI: "public.item",
                        mimeType: "application/octet-stream",
                        dialogTitle: t("Uložiť súbor")
                    })
                }
                
                else {
                    Alert.alert(t("Chyba"), t("Zdieľanie nie je dostupné."))
                }
            }
        } 
        
        catch {
            console.error(t("Pri sťahovaní súboru došlo k chybe."))
        }
    }

    return (
        <View
            key={one_chat.id}
            className="one_message_container"

            style={[
                styles.one_message_container,
                one_chat.is_sender ? styles.one_message_container_sender : styles.one_message_container_receiver,
            ]}
        >
            <Pressable 
                key={one_chat.id}
                className={one_chat.is_sender ? "one_message sender" : "one_message receiver"}
                onPress={one_chat === selected_message_for_edit ? onCancelEditMessage : null}

                style={[
                    styles.one_message,
                    one_chat.is_sender ? styles.one_message_sender : styles.one_message_receiver,
                    one_chat === selected_message_for_edit ? styles.edit : {}
                ]}
            >
                <View className="profile_picture_container" style={styles.profile_picture_container}>
                    <Image 
                        className={`profile_picture ${
                            one_chat.sender.subscription && one_chat.sender.subscription.is_active ? "subscriber" : "" // Adds The Subscriber Class
                        }`}

                        source={
                            one_chat.sender.profile_picture_name ? { uri: `${DOMAIN}/media/images/${one_chat.sender.id}/${one_chat.sender.profile_picture_name}` } : require("@/assets/images/profile_picture.png") // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                        }

                        style={[
                            styles.profile_picture,
                            one_chat.sender.subscription && one_chat.sender.subscription.is_active && styles.subscriber_profile_picture,
                            // { transform: [{ scale: animated_scale }] }
                        ]}
                    />
                </View>

                <View style={{ gap: 10 }}>
                    <>
                        {one_chat.attachments.length > 0 && (
                            one_chat.attachments.map((one_attachment:Attachment, index:number) => {
                                return (
                                    <View key={index}>
                                        {(one_attachment.attachment_type === "image" || one_attachment.attachment_type === "video") ? (
                                            <View style={styles.image_attachment}>
                                                {one_attachment.attachment_type === "image" && (
                                                    <Pressable 
                                                        onPress={() => {
                                                            // Gets Only The Image Attachments
                                                            const image_attachments:Attachment[] = one_chat.attachments.filter((one_image_attachment:Attachment) => (
                                                                one_image_attachment.attachment_type === "image"
                                                            ))
                                                            
                                                            // Formats The Image Attachments
                                                            const all_images:{
                                                                uri:string
                                                            }[] = image_attachments.map((one_image_attachment:Attachment) => ({
                                                                uri: `${DOMAIN}${one_image_attachment.attachment_url}`
                                                            }))
                                                            
                                                            const clicked_index:number = image_attachments.findIndex((one_image_attachment:Attachment) => one_image_attachment.attachment_url === one_attachment.attachment_url) // Gets The Clicked Index
                                                            
                                                            onViewedImagesUpdate({ images: all_images, index: clicked_index }) // Sets The Viewed Images
                                                        }}
                                                    >
                                                        <DynamicImage 
                                                            uri={`${DOMAIN}${one_attachment.attachment_url}`} 
                                                            style={{ borderRadius: MEDIUM_BORDER_RADIUS }}
                                                            scale_by_aspect_ratio={true}
                                                        />
                                                    </Pressable>
                                                )}

                                                {one_attachment.attachment_type === "video" && one_attachment.attachment_thumbnail && (
                                                    <Pressable onPress={() => onViewedVideoUpdate(`${DOMAIN}${one_attachment.attachment_url}`)}>
                                                        <View style={{ position: "relative" }}>
                                                            <DynamicImage 
                                                                uri={`${DOMAIN}${one_attachment.attachment_thumbnail}`} 
                                                                style={{ borderRadius: MEDIUM_BORDER_RADIUS }}
                                                                scale_by_aspect_ratio={true}
                                                            />

                                                            <View style={styles.play_pause_indicator}>
                                                                <Icon
                                                                    icon_name="play"
                                                                    // onPress={}
                                                                    style={{ marginLeft: 4 }}
                                                                    pressed_color={LIGHT_BLUE_COLOR}
                                                                    color={LIGHT_BLUE_COLOR}
                                                                />
                                                            </View>
                                                        </View>
                                                    </Pressable>
                                                )}                                                 
                                            </View>
                                        ) : (
                                            <View style={styles.file_attachment}>
                                                <Image
                                                    source={FILE_ICONS[one_attachment.attachment_type] || require("@/assets/images/files/file.png")}

                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        resizeMode: "contain",
                                                    }}
                                                />

                                                <View>
                                                    <Text 
                                                        numberOfLines={1} 
                                                        ellipsizeMode="tail" 
                                                        
                                                        style={[{ 
                                                            maxWidth: 100,
                                                            color: SECONDARY_COLOR,
                                                        }]}
                                                    >
                                                        {one_attachment.original_filename}
                                                    </Text>

                                                    <Text 
                                                        className="size" 

                                                        style={{ 
                                                            fontSize: 12, 
                                                            color: SECONDARY_COLOR,
                                                        }}
                                                    >
                                                        {getReadableSize(one_attachment.compressed_size)}
                                                    </Text>
                                                </View>
                                                
                                                <View accessibilityLabel={t("Stiahnuť")}>
                                                    <Icon 
                                                        icon_name="download" 
                                                        onPress={() => downloadFile(one_attachment.attachment_url, one_attachment.original_filename)}
                                                    />
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )
                            })
                        )}

                        {one_chat.content && (
                            isUrlInText(one_chat.content) ? (
                                <LinkPreview 
                                    text={one_chat.content} 
                                    
                                    renderText={(text) => (
                                        <Text 
                                            style={{ 
                                                color: SECONDARY_COLOR, 
                                                flexShrink: 1, 
                                                marginBottom: 5 
                                            }}
                                        >
                                            {text}
                                        </Text>
                                    )}
                                    
                                    renderTitle={(title) => (
                                        <Text 
                                            numberOfLines={2}
                                            ellipsizeMode="tail" 

                                            style={{ 
                                                color: SECONDARY_COLOR, 
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {title}
                                        </Text>
                                    )}

                                    renderDescription={(description) => (
                                        <Text 
                                            numberOfLines={2}
                                            ellipsizeMode="tail" 

                                            style={{ 
                                                color: "#cccccc", 
                                                fontSize: 12,
                                            }}
                                        >
                                            {description}
                                        </Text>
                                    )}

                                    renderImage={(image_data) => (
                                        <DynamicImage 
                                            uri={image_data?.url}
                                            style={{ borderRadius: MEDIUM_BORDER_RADIUS }}
                                            scale_by_aspect_ratio={true}
                                        />
                                    )}
                                    
                                    textContainerStyle={{
                                        margin: 0,
                                        padding: 0,
                                    }}

                                    containerStyle={{ 
                                        maxWidth: "100%",
                                        width: 180,
                                        overflow: "hidden",
                                    }}
                                />
                            ) : (
                                <Text style={{ color: SECONDARY_COLOR }}>{one_chat.content}</Text>
                            )
                        )}
                    </>
                </View>

                {one_chat.is_sender && one_chat.is_read && (
                    <View style={{ marginLeft: "auto" }}>
                        <FontAwesome6
                            name="check-double"
                            size={20}
                            color={transparentize(BLUE_COLOR, 0.5)}
                        />
                    </View>
                )}

                <View 
                    className="reactions"

                    style={[
                        styles.reactions,
                        one_chat.is_sender ? styles.sender_reactions : styles.receiver_reactions
                    ]}
                >
                    {one_chat.message_reactions.map((one_reaction:MessageReaction, index:number) => (
                        <Text 
                            key={index}
                            className="one_reaction" 
                            accessibilityLabel={t("Reakciu pridal: {{username}}", { username: one_reaction.user.username })}
                            style={styles.one_reaction}
                        >
                            {one_reaction.emoji}
                        </Text>
                    ))}
                </View>

                <View 
                    className="show_message_properties_button"
                    accessibilityLabel={t("Viac...")} 
                    
                    style={{ 
                        marginLeft: "auto", 
                        marginRight: 10,
                    }}
                >
                    <Icon
                        icon_name="ellipsis-vertical"
                        onPress={() => onShowMessageProperties(one_chat)}
                    />
                </View>
            </Pressable>

            <Text 
                numberOfLines={1} 

                style={[
                    styles.time_label,
                    // one_chat.is_sender ? { marginLeft: 20 } : { marginRight: 20, textAlign: "right" }
                    one_chat.is_sender ? { } : { textAlign: "right" }
                ]}
            >
                {one_chat.formatted_time}
                {one_chat.is_edited && (t(" (upravené)"))}
            </Text>
        </View>
    )
}

const styles = StyleSheet.create({
    one_message_container: {
        maxWidth: "80%",
        width: "100%",
        gap: 5,
        marginTop: 50,
    },

    one_message_container_receiver: {
        flexDirection: "column",
        // marginRight: 20,
        marginLeft: "auto",
        textAlign: "right",
    },

    one_message_container_sender: {
        flexDirection: "column",
        marginRight: "auto",
        // marginLeft: 20,
        textAlign: "right",
    },

    one_message: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 10,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        maxWidth: "100%",      // Správa nepresiahne svojho rodiča (one_message_container)
        overflow: "hidden",
        // backdrop-filter: blur(5px);
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover,
        // &:focus-visible {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        // }
    },

    image_attachment: {
        width: 100,
        // borderWidth: 1,
        // borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        overflow: "hidden",
    },

    play_pause_indicator: {
        position: "absolute",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        alignItems: "center",
        justifyContent: "center",

        // pointerEvents: "none",
        opacity: 1,
        width: 40,
        height: 40,
        backgroundColor: transparentize(MAIN_COLOR, 0.8),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: opacity 0.3s ease;
        zIndex: 50,

        // &.hidden {
        //     opacity: 0;
        // }
    },

    file_attachment: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    time_label: {
        color: LIGHT_BLUE_COLOR,
        fontSize: 15,
    },

    profile_picture_container: {
        marginTop: "auto",
        padding: 2,
        borderWidth: 1,
        borderColor: LIGHT_BLUE_COLOR,
        borderRadius: 100,
    },

    profile_picture: {
        width: 32,
        height: 32,
        borderRadius: 32 / 2,
    },
  
    subscriber_profile_picture: {
        backgroundColor: transparentize(YELLOW_COLOR, 0.85),
        borderColor: transparentize(YELLOW_COLOR, 0.5),
        shadowColor: YELLOW_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    edit: {
        borderColor: BLUE_COLOR,
    },

    deleted: {
        display: "none",
        transform: [{ translateX: "-100%" }],
        opacity: 0,
    },

    one_message_receiver: {
        flexDirection: "row-reverse",
        justifyContent: "flex-start",
        // marginRight: 20,
        marginLeft: "auto",
        textAlign: "right",
        borderTopLeftRadius: BIG_BORDER_RADIUS,
        borderTopRightRadius: BIG_BORDER_RADIUS,
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: BIG_BORDER_RADIUS,

        // &::before {
        //     right: 0px;
        // }
    },

    receiver_reactions: {
        left: -10,

        transform: [
            { translateX: "-100%" },
            { translateY: "-50%" }
        ],
    },

    one_message_sender: {
        flexDirection: "row",
        justifyContent: "flex-start",
        marginRight: "auto",
        // marginLeft: 20,
        textAlign: "right",
        borderTopLeftRadius: BIG_BORDER_RADIUS,
        borderTopRightRadius: BIG_BORDER_RADIUS,
        borderBottomRightRadius: BIG_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,

        // &::before {
        //     left: 0px;
        // }
    },

    sender_reactions: {
        right: -10,

        transform: [
            { translateX: "100%" },
            { translateY: "-50%" }
        ],

        flexDirection: "row-reverse",
    },

    reactions: {
        position: "absolute",
        top: "50%",
        flexDirection: "row",
        gap: 5,
        opacity: 0.8,
    },

    one_reaction: {
        fontSize: 15,
        // animation: idle 1s ease-in-out infinite alternate both;

        // @for $i from 1 through 3 {
        //     &:nth-child(#{$i}) {
        //         animation-delay: ($i - 1) * 0.2s;
        //     }
        // }
    },
})