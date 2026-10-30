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
import ProfilePictureLink from "@/components/ProfilePictureLink"
import ProfilePicture from "@/components/ProfilePicture"
import { getTimeAgo } from "@/utils/time"
import { ImperativeRouter, useRouter } from "expo-router"
import { BlurView } from "expo-blur"
import { JSX, RefObject, useRef } from "react"
import { Swipeable } from "react-native-gesture-handler"

import type { Chat, MessageReaction, Attachment } from "@/app/(tabs)/chat/[username]"
import type { LoggedInUser } from "@/components/LoginFormDialog"

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
    onHandleEditMessage:(message:Chat) => void,
    onCancelEditMessage:() => void,
    onShowMessageProperties:(message:Chat) => void,
    onViewedImagesUpdate:(viewed_images:{ images:{ uri:string }[], index:number }) => void,
    onViewedVideoUpdate:(viewed_video:string|null) => void,
    logged_in_user:LoggedInUser|null
}

export const OneMessageContainer = ({ 
    one_chat,
    selected_message_for_edit,
    onHandleEditMessage,
    onCancelEditMessage,
    onShowMessageProperties,
    onViewedImagesUpdate,
    onViewedVideoUpdate,
    logged_in_user
}:OneMessageContainerProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const router:ImperativeRouter = useRouter() // Gets The Router

    const swipeable:RefObject<Swipeable|null> = useRef(null) // Stores The Swipeable Reference

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

    // Function For Handle The Swipe Right
    const handleSwipeRight = (message:Chat):void => {
        onHandleEditMessage(message) // Handles The Message Edit
        swipeable.current?.close() // Stops The Swipe
    }

    // Function For Render The Left Actions
    const renderLeftActions = ():JSX.Element => {
        return (
            <View style={{ 
                alignItems: "center",
                justifyContent: "center",
                width: 20,
            }}>
                <FontAwesome6
                    name="pen"
                    size={20}
                    color={BLUE_COLOR}
                />
            </View>
        )
    }

    return (
        <Swipeable
            ref={swipeable}
            renderLeftActions={renderLeftActions}
            onSwipeableLeftOpen={() => handleSwipeRight(one_chat)}
            overshootLeft={false} 
            leftThreshold={50} 
        >
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
                    <BlurView 
                        intensity={20} 
                        
                        style={[
                            StyleSheet.absoluteFill,

                            one_chat.is_sender ? {
                                borderTopLeftRadius: BIG_BORDER_RADIUS,
                                borderTopRightRadius: BIG_BORDER_RADIUS,
                                borderBottomRightRadius: BIG_BORDER_RADIUS,
                                borderBottomLeftRadius: SMALL_BORDER_RADIUS,
                            } : {
                                borderTopLeftRadius: BIG_BORDER_RADIUS,
                                borderTopRightRadius: BIG_BORDER_RADIUS,
                                borderBottomRightRadius: SMALL_BORDER_RADIUS,
                                borderBottomLeftRadius: BIG_BORDER_RADIUS,
                            },
                        ]} 
                    />

                    <View style={{ marginTop: "auto" }}>
                        <ProfilePicture
                            user_id={one_chat.sender.id}
                            user_profile_picture_name={one_chat.sender.profile_picture_name}
                            user_subscription={one_chat.sender.subscription?.is_active || false} 
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

                            {one_chat.post && (
                                <View style={styles.post_container}>
                                    <View className="header" style={styles.header}>
                                        <View className="left">
                                            <ProfilePictureLink 
                                                user_id={one_chat.post.user.id} 
                                                user_username={one_chat.post.user.username}
                                                user_profile_picture_name={one_chat.post.user.profile_picture_name || null} 
                                                user_subscription={one_chat.post.user.subscription?.is_active || false} 
                                                label={t("Zobraziť užívateľa")} 
                                            />
                                        </View>

                                        <View className="right" style={styles.right}>
                                            <View className="top" style={styles.top}>
                                                <Text className="username" style={styles.username}>{one_chat.post.user.username}</Text>
                                            </View>

                                            <View className="bottom" style={styles.bottom}>
                                                <Text className="created_at" style={styles.created_at}>{getTimeAgo(one_chat.post.created_at)}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <Pressable onPress={one_chat.post ? () => router.push(`/post/${one_chat.post?.id}`) : () => console.log("")}>
                                        <DynamicImage
                                            uri={one_chat.post.media.is_video && one_chat.post.media.thumbnail ? `${DOMAIN}/media/${one_chat.post.media.thumbnail}` : `${DOMAIN}/media/${one_chat.post.media.file}`}
                                            style={{ width: 200, borderRadius: MEDIUM_BORDER_RADIUS }}
                                            scale_by_aspect_ratio={true}
                                        />
                                    </Pressable>

                                    <View className="society" style={styles.society}>
                                        <View 
                                            className="likes" 
                                            accessibilityLabel={t("Páči sa mi...")} 
                                            style={styles.society_likes}
                                        >
                                            <View 
                                                style={{ 
                                                    position: "relative", 
                                                    alignItems: "center", 
                                                    justifyContent: "center", 
                                                }}
                                            >
                                                <Icon
                                                    icon_name="heart"
                                                    is_regular={true}
                                                />
                                            </View>

                                            {logged_in_user && one_chat.post.hide_likes && one_chat.post.user.id !== logged_in_user.id 
                                            ? (<Text className="hidden_likes_counter" style={styles.hidden_likes_counter}>{t("Skryté")}</Text>)
                                            : (<Text className="likes_counter" style={styles.society_likes_counter}>{String(one_chat.post.likes)}</Text>)}
                                        </View>

                                        <View 
                                            className="comments" 
                                            accessibilityLabel={t("Komentáre...")}
                                            style={styles.comments}
                                        >
                                            <Icon
                                                icon_name="comment"
                                                is_regular={true}
                                            />

                                            {one_chat.post.allow_comments 
                                            ? (<Text className="comments_counter" style={styles.comments_counter}>{String(one_chat.post.comments)}</Text>)
                                            : (<Text className="hidden_comments_counter" style={styles.hidden_comments_counter}>{t("Vypnuté")}</Text>)}
                                        </View>
                                    </View>

                                    {one_chat.post.description && (
                                        <Text className="description" style={styles.description}>{one_chat.post.description}</Text>
                                    )}
                                </View>
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
        </Swipeable>
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
        maxWidth: "100%",
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

    post_container: {
        position: "relative",
        justifyContent: "space-between",
        gap: 10,
        width: "100%",
        padding: 20,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
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

    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        width: "100%",
    },

    right: {
        flex: 1,
        minWidth: 0,
    },

    top: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    username: {
        flex: 1,
        fontWeight: "bold",
        color: SECONDARY_COLOR,
    },

    bottom: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        overflow: "hidden",
    },

    created_at: {
        color: LIGHT_BLUE_COLOR,
        fontSize: 15,
    },

    society: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#cccccc",
    },

    society_likes: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 20,
    },

    society_likes_counter: {
        color: BLUE_COLOR,
    },

    hidden_likes_counter: {
        color: BLUE_COLOR,
        fontSize: 15,
    },

    comments: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    comments_counter: {
        color: BLUE_COLOR,
    },

    hidden_comments_counter: {
        color: BLUE_COLOR,
        fontSize: 15,
    },

    description: {
        marginTop: 5,
        lineHeight: 1.5,
        fontSize: 12,
        color: transparentize(SECONDARY_COLOR, 0.08),
    },
})