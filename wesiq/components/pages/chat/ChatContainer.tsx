import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert, ImageSourcePropType, Platform } from "react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import ProfilePictureLink from "@/components/ProfilePictureLink"
import { DOMAIN } from "@/constants/general"
import { FontAwesome6, Ionicons } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import { TextInput } from "react-native"
import EmojiPicker from "rn-emoji-keyboard"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import Svg, { Path } from "react-native-svg"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { useTranslation } from "react-i18next"
import AttachmentSelection from "./AttachmentSelection"
import { DynamicImage } from "../community/DynamicImage"
import { getReadableSize } from "@/utils/getReadableSize"
import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import { API_URL } from "@/constants/general"
import { File as ExpoFile, Paths } from "expo-file-system"
import * as Sharing from "expo-sharing"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { Receiver, Chat, MessageReaction, ChatSocketResponse, Attachment } from "@/app/(tabs)/chat/[username]"

interface SentChatAttachmentResponse {
    success:boolean,
    sent_attachments?:SelectedAttachment[],
    message:string
}

interface SelectedAttachment {
    attachment_id:number,
    attachment_url:string,
    attachment_type:string
}

interface SelectedFile {
    uri:string,
    name:string,
    type:string
}

interface ChatContainerProps {
    logged_in_user:LoggedInUser|null,
    username:string,
    receiver:Receiver,
    onSetChats:(chats:Chat[]) => void,
    chats:Chat[]
}

export const ChatContainer = ({ 
    logged_in_user,
    username,
    receiver,
    onSetChats,
    chats
}:ChatContainerProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const [new_message, setNewMessage] = useState<string>("") // Stores The New Message
    const [is_emoji_picker_open, setIsEmojiPickerOpen] = useState(false) // Stores The Information If The Emoji Picker Is Open
    const MAX_MESSAGE_LENGTH:number = 250 // Sets The Maximum Message Length

    const message_properties = useRef<BottomSheetModal>(null) // Stores The Message Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [message_properties_sheet, setMessagePropertiesSheet] = useState<"main"|"reaction">("main") // Stores The Active Post Properties Sheet
    const [selected_message, setSelectedMessage] = useState<Chat|null>(null) // Stores The Selected Message

    const [write_message_action, setWriteMessageAction] = useState<"new"|"edit">("new") // Stores The Write Message Action
    const [selected_message_for_edit, setSelectedMessageForEdit] = useState<Chat|null>(null) // Stores The Selected Message For Edit
    
    const all_messages = useRef<ScrollView|null>(null) // Sets The All Messages Reference
    
    const chat_socket = useRef<WebSocket|null>(null) // Stores The Chat Socket Reference
    
    const [selected_files, setSelectedFiles] = useState<SelectedFile[]>([]) // Stores The Selected Files
    const [is_uploading, setIsUploading] = useState<boolean>(false) // Stores The Information If The Attachment Is Uploading
    const attachment_options = useRef<BottomSheetModal>(null) // Stores The Attachment Options

    // Defines The File Icons
    const FILE_ICONS:{
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

    // Initializes The Web Socket
    useEffect(() => {
        // Function For Initialize The Web Socket
        const initializeWebSocket = async ():Promise<void> => {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token

            const is_secure:boolean = DOMAIN.startsWith("https") // Stores The Information If The API Is Secure
            const clean_domain:string = DOMAIN.replace(/^https?:\/\//, "") // Gets The Clean Domain
            const web_socket_protocol:"wss"|"ws" = is_secure ? "wss" : "ws" // Gets The Web Socket Protocol
            const web_socket_url:string = `${web_socket_protocol}://${clean_domain}/ws/chat/${username}/?token=${user_token}` // Gets The Web Socket URL

            chat_socket.current = new WebSocket(web_socket_url) // Sets The Chat Socket

            // Succeeded Open Of Chat Socket
            chat_socket.current.onopen = () => {
                markMessagesAsRead() // Marks Messages As Read
            }
    
            // Response From The Server (The DOM Changes Will Be Visible To Every User In Chat)
            chat_socket.current.onmessage = (event) => {
                const data:ChatSocketResponse = JSON.parse(event.data) // Gets The Data

                // New Message
                if(data.action === "new") {
                    const chat_id:number = data.chat_id as number // Gets The Chat ID
                    const message_content:string = data.message as string // Gets The Message Content
                    const attachment:Attachment|null = data.attachment as Attachment || null // Gets The Attachment
                    const formatted_time:string = data.formatted_time as string // Gets The Formatted Time
                    const sender_id:number = data.sender_id as number // Gets The Sender's ID
                    const sender_profile_picture_name:string = data.sender_profile_picture_name as string // Gets The Sender's Profile Picture Name

                    const new_chat:Chat = {
                        id: chat_id,

                        sender: {
                            id: sender_id,
                            profile_picture_name: sender_profile_picture_name,
                            subscription: null
                        },

                        content: message_content,
                        attachment: attachment,
                        is_read: false,
                        is_edited: false,
                        formatted_time: formatted_time,
                        is_sender: logged_in_user && logged_in_user.id === sender_id || false,
                        message_reactions: [],
                        is_older_than_15_minutes: false,
                        is_older_than_1_day: false
                    }

                    // Stores The New State Of Updated Chats
                    const updated_chats:Chat[] = [
                        new_chat,
                        ...chats
                    ]
                    
                    onSetChats(updated_chats) // Sets The Chats
                
                    // If Message Isn't From Logged In User
                    if(logged_in_user && logged_in_user.id !== data.sender_id) {
                        markMessagesAsRead() // Marks Messages As Read
                    }
                }

                // Edited Message
                else if(data.action === "edit") {
                    const chat_id:number = data.chat_id as number // Gets The Chat ID
                    const message_content:string = data.message as string // Gets The Message Content

                    // Stores The New State Of Updated Chats
                    const updated_chats:Chat[] = chats.map((one_chat:Chat) => {
                        if(one_chat.id === chat_id) {
                            // Updates The Post Likes Amount And Stored Likes From Users
                            return {
                                ...one_chat,
                                content: message_content,
                                is_edited: true
                            }
                        }

                        return one_chat // Returns The Unchanged Post
                    })

                    onSetChats(updated_chats) // Sets The Chats

                    cancelEditMessage() // Cancels The Edit Message
                }

                // Delete Message
                else if(data.action === "delete") {
                    const chat_id:number = data.chat_id as number // Gets The Chat ID
                    const updated_chats:Chat[] = chats.filter((one_chat:Chat) => one_chat.id !== chat_id) // Stores The New State Of Updated Chats
                    onSetChats(updated_chats) // Sets The Chats
                }

                // Add Message Reaction
                else if(data.action === "add_reaction") {
                    const chat_id:number = data.chat_id as number // Gets The Chat ID
                    const emoji:string = data.emoji as string // Gets The Emoji
                    const emoji_sender_username:string = data.emoji_sender_username as string // Gets The Sender's Username 

                    // Creates The New Message Reaction
                    const new_message_reaction:MessageReaction = {
                        user: {
                            username: emoji_sender_username
                        },

                        emoji
                    }

                    // Stores The New State Of Updated Chats
                    const updated_chats:Chat[] = chats.map((one_chat:Chat) => {
                        if(one_chat.id === chat_id) {
                            // Checks If The Reaction Has Been Already Added
                            const is_existing_reaction: boolean = one_chat.message_reactions.some(
                                (one_message_reaction:MessageReaction) => one_message_reaction.emoji === emoji && one_message_reaction.user.username === emoji_sender_username
                            )

                            // Updates The Chat Message Reactions
                            return {
                                ...one_chat,

                                message_reactions: is_existing_reaction
                                    // Removes The Reaction
                                    ? one_chat.message_reactions.filter(
                                        (one_message_reaction:MessageReaction) => !(one_message_reaction.emoji === emoji && one_message_reaction.user.username === emoji_sender_username)
                                    )

                                    : one_chat.message_reactions.length >= 3 
                                        ? [...one_chat.message_reactions.slice(1), new_message_reaction] // Removes The Last Reaction And Adds The New One
                                        : [...one_chat.message_reactions, new_message_reaction] // Adds The Reaction
                            }
                        }

                        return one_chat // Returns The Unchanged Chat
                    })

                    onSetChats(updated_chats) // Sets The Chats
                }

                // Remove Message Reaction
                else if(data.action === "remove_reaction") {
                    const chat_id:number = data.chat_id as number // Gets The Chat ID
                    const emoji:string = data.emoji as string // Gets The Emoji

                    // Stores The New State Of Updated Chats
                    const updated_chats:Chat[] = chats.map((one_chat:Chat) => {
                        if(one_chat.id === chat_id) {
                            // Updates The Chat Message Reactions
                            return {
                                ...one_chat,
                                message_reactions: one_chat.message_reactions.filter((one_message_reaction:MessageReaction) => one_message_reaction.emoji !== emoji) // Removes The Reaction
                            }
                        }

                        return one_chat // Returns The Unchanged Chat
                    })

                    onSetChats(updated_chats) // Sets The Chats
                }
            }
    
            // Interrupted Connection
            chat_socket.current.onclose = () => {
                Alert.alert(t("Chyba"), t("Spojenie sa neočakávane prerušilo.")) // Shows The Alert
            }
    
            // Interrupted Connection
            chat_socket.current.onerror = () => {
                Alert.alert(t("Chyba"), t("Pri pokuse o spojenie došlo k chybe.")) // Shows The Alert
            }
        }

        if(username) initializeWebSocket() // Initializes The Web Socket

        return () => {
            if(chat_socket.current) chat_socket.current.close() // Closes The Socket
        }
    }, [username, logged_in_user])

    // Function For Mark Messages As Read
    const markMessagesAsRead = ():void => {
        if(chat_socket.current && chat_socket.current.readyState === WebSocket.OPEN) {
            // Sends The Action
            chat_socket.current.send(JSON.stringify({
                action: "mark_as_read"
            }))
        }

        else {
            console.warn(t("Web Socket nie je otvorený."))
        }
    }

    // Function For Send The Message
    const sendMessage = async ():Promise<void> => {
        if(chat_socket.current && chat_socket.current.readyState === WebSocket.OPEN) {
            // New Message
            if(write_message_action === "new") {
                // If Any Files Were Selected
                if(selected_files.length > 0) {
                    setIsUploading(true) // Sets The Information That The Attachment Is Uploading
        
                    const sent_chat_attachment_data:SelectedAttachment[] = await sendChatAttachment(selected_files) || [] // Gets The Sent Chat Attachment Data
        
                    // Sends The Data To The Web Socket
                    if(chat_socket.current && chat_socket.current.readyState === WebSocket.OPEN) {
                        sent_chat_attachment_data.forEach((one_attachment:SelectedAttachment) => {
                            if(chat_socket.current) {
                                // Sends The Attachment
                                chat_socket.current.send(JSON.stringify({
                                    action: "send_attachment",
                                    message: new_message.trim() !== "" ? new_message : null,
                                    attachment_id: one_attachment.attachment_id,
                                    attachment_type: one_attachment.attachment_type,
                                    attachment_url: one_attachment.attachment_url
                                }))
                            }
                        })
                    }
                }

                else {
                    // Sends The New Message
                    chat_socket.current.send(JSON.stringify({
                        action: write_message_action,
                        message: new_message
                    }))
                }
            }

            // Edit Message
            else if(write_message_action === "edit" && selected_message_for_edit) {
                // Sends The Edited Message
                chat_socket.current.send(JSON.stringify({
                    action: write_message_action,
                    chat_id: selected_message_for_edit.id,
                    message: new_message
                }))
            }

            setNewMessage("") // Sets The New Message
        }

        else {
            console.warn(t("Web Socket nie je otvorený."))
        }
    }

    // Function For Select Chat Attachment
    const selectChatAttachment = async (gallery_or_documents:"gallery"|"documents" = "gallery"):Promise<void> => {
        try {
            // Gallery Selection (Images And Videos)
            if(gallery_or_documents === "gallery") {
                const permission_result = await ImagePicker.requestMediaLibraryPermissionsAsync() // Gets The Permission Result
    
                if(!permission_result.granted) {
                    Alert.alert(t("Prístup zamietnutý"), t("Pre výber fotiek a videí musíte povoliť prístup.")) // Shows The Alert
                    return
                }
    
                // Opens The Gallery
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    allowsMultipleSelection: true, // Multiple Selection
                    selectionLimit: 5, // Accepts Only Maximum Of 5 Files
                    quality: 0.8 // Compression For Faster Upload
                })
    
                if(!result.canceled && result.assets) {
                    // Accepts Only The Image And Video Formats
                    const valid_files:ImagePicker.ImagePickerAsset[] = result.assets.filter((one_file:ImagePicker.ImagePickerAsset) => {
                        const is_valid_type:boolean = one_file.type === "image" || one_file.type === "video"

                        const is_valid_mime:boolean = one_file.mimeType
                            ? one_file.mimeType.startsWith("image/") || one_file.mimeType.startsWith("video/")
                            : true
    
                        return is_valid_type && is_valid_mime
                    })
    
                    if(valid_files.length < result.assets.length) {
                        Alert.alert(t("Chyba"), t("Niekteré vybrané súbory boli vynechané, pretože nie sú podporovaným obrázkom alebo videom.")) // Shows The Alert
                    }

                    const MAX_FILES:number = 5 // Defines The Maximum Amount Of Files
                    const current_max_files:number = MAX_FILES - selected_files.length // Gets The Current Maximum Amount Of Files

                    const subscription_plan:"free"|"basic"|"premium" = logged_in_user && logged_in_user.subscription && logged_in_user.subscription.is_active ? logged_in_user.subscription.plan : "free" // Gets The Subscription Plan

                    const MAX_IMAGE_SIZE:number = subscription_plan === "free" ? 2 * 1000 * 1000 : 10 * 1000 * 1000 // 2MB For No Subscribers, 10MB For Subscribers
                    const MAX_VIDEO_SIZE:number = subscription_plan === "free" ? 25 * 1000 * 1000 : subscription_plan === "basic" ? 50 * 1000 * 1000 : 100 * 1000 * 1000 // 25MB For No Subscribers, 50MB For Subscribers With Basic Plan, 100MB For Subscribers With Premium Plan
                    const MAX_VIDEO_DURATION:number = subscription_plan === "free" ? 60 : subscription_plan === "basic" ? 2 * 60 : 3 * 60 // 1 Minute For No Subscribers, 2 Minutes For Subscribers With Basic Plan, 3 Minutes For Subscribers With Premium Plan
                    const MIN_VIDEO_DURATION:number = 1 // 1 Second

                    // Gets The New Selected Files
                    const new_selected_files:SelectedFile[] = valid_files
                        .filter((one_file:ImagePicker.ImagePickerAsset) => {
                            if(one_file.type === "image" && (one_file.fileSize || 0) > MAX_IMAGE_SIZE) {
                                Alert.alert(t("Chyba"), t("Obrázok {{ file }} je príliš veľký.", { file: one_file.fileName })) // Shows The Alert
                                return false // Checks The Image Size
                            }

                            if(one_file.type === "video" && (one_file.fileSize || 0) > MAX_VIDEO_SIZE) {
                                Alert.alert(t("Chyba"), t("Video {{ file }} je príliš veľké.", { file: one_file.fileName })) // Shows The Alert
                                return false // Checks The Video Size
                            }

                            if(one_file.type === "video" && (one_file.duration || 0) > MAX_VIDEO_DURATION) {
                                Alert.alert(t("Chyba"), t("Video {{ file }} je príliš dlhé.", { file: one_file.fileName })) // Shows The Alert
                                return false // Checks The Video Duration
                            }
                            
                            if(one_file.type === "video" && (one_file.duration || 0) < MIN_VIDEO_DURATION) {
                                Alert.alert(t("Chyba"), t("Video {{ file }} je príliš krátke.", { file: one_file.fileName })) // Shows The Alert
                                return false // Checks The Video Duration
                            }

                            return true
                        })
                        .slice(0, current_max_files)
                        .map((one_file:ImagePicker.ImagePickerAsset) => ({
                            uri: one_file.uri,
                            name: one_file.fileName || `media_${Date.now()}.${one_file.uri.split(".").pop() || "jpg"}`,
                            type: one_file.mimeType || (one_file.type === "video" ? "video/mp4" : "image/jpeg")
                        }))

                    setSelectedFiles([...selected_files, ...new_selected_files]) // Sets The Selected Files
                }
            } 
            
            // Documents Selection (PDF, Audio And Other Files)
            else if(gallery_or_documents === "documents") {
                // Opens The Explorer
                const result = await DocumentPicker.getDocumentAsync({
                    type: "*/*", // All Files
                    multiple: true, // Multiple Selection
                    copyToCacheDirectory: true
                })
    
                if(!result.canceled && result.assets) {
                    // Sets The Selected Files
                    setSelectedFiles(result.assets.map((one_file:DocumentPicker.DocumentPickerAsset) => ({
                        uri: one_file.uri,
                        name: one_file.name,
                        type: one_file.mimeType || "application/octet-stream"
                    })))
                }
            }
        } 
        
        catch {
            console.warn(t("Pri výbere súborov došlo k chybe."))
            Alert.alert(t("Chyba"), t("Pri výbere súborov došlo k chybe.")) // Shows The Alert
        }
        
        finally {
            setIsUploading(false) // Sets The Information That The Attachment Isn't Uploading
        }
    }

    // Function For Send Chat Attachment
    const sendChatAttachment = async (selected_files:SelectedFile[]):Promise<SelectedAttachment[]|undefined> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Prílohu nie je možné odoslať bez prihlásenia.")) // Shows The Alert
                return
            }
    
            const form_data:FormData = new FormData() // Creates The Form Data

            for(const one_selected_file of selected_files) {
                const file_data:any = await prepareFileForFormData(one_selected_file) // Gets The File Data
                form_data.append("selected_files", file_data) // Appends The Selected Files To The Form Data
            }
    
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token

            // Sends The POST Request To The Server
            const sent_chat_attachment_response:Response = await fetch(`${API_URL}/send-chat-attachment/`, {
                method: "POST",

                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: form_data
            })

            // If The Response Isn't Success
            if(!sent_chat_attachment_response.ok) {
                Alert.alert(t("Pri odosielaní prílohy došlo k chybe.")) // Shows The Alert
                return
            }

            const sent_chat_attachment_data:SentChatAttachmentResponse = await sent_chat_attachment_response.json() // Gets The Sent Chat Attachment Data
            return sent_chat_attachment_data.sent_attachments ? sent_chat_attachment_data.sent_attachments : [] // Returns The Sent Chat Attachment Data
        }

        catch {
            Alert.alert(t("Pri odosielaní prílohy došlo k chybe.")) // Shows The Alert
        }
    }

    // Function For Prepare File For Form Data
    const prepareFileForFormData = async (file:SelectedFile):Promise<any> => {
        const is_video:boolean = file.type === "video" // Stores The Information If The Selected File Is Video
        const default_extension:"mp4"|"jpg" = is_video ? "mp4" : "jpg" // Sets The Default Extension

        const file_name:string = file.name || `file_${Date.now()}.${default_extension}` // Sets The File Name
        const file_type:string = file.type || (is_video ? "video/mp4" : "image/jpeg") // Sets The File Type

        // Web
        if(Platform.OS === "web") {
            const file_response:Response = await fetch(file.uri)
            const blob:Blob = await file_response.blob()

            return new File([blob], file_name, {
                type: file_type
            })
        } 
        
        // iOS And Android
        else {
            return {
                uri: file.uri,
                type: file_type,
                name: file_name
            } as any
        }
    }

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

    // Function For Handle The Message Edit
    const handleEditMessage = (message:Chat):void => {
        setWriteMessageAction("edit") // Sets The Write Message Action
        setSelectedMessageForEdit(message) // Sets The Selected Message For Edit
        hideMessageProperties() // Closes The Message Properties
    }

    // Function For Cancel The Edit
    const cancelEditMessage = ():void => {
        setWriteMessageAction("new") // Sets The Write Message Action
        setSelectedMessageForEdit(null) // Sets The Selected Message For Edit
    }

    // Function For Delete The Message
    const deleteMessage = ():void => {
        setWriteMessageAction("new") // Sets The Write Message Action
        setSelectedMessageForEdit(null) // Sets The Selected Message For Edit
        hideMessageProperties() // Closes The Message Properties

        if(chat_socket.current && chat_socket.current.readyState === WebSocket.OPEN) {
            if(selected_message) {
                chat_socket.current.send(JSON.stringify({
                    action: "delete",
                    chat_id: selected_message.id,
                }))
            }
        }

        else {
            console.warn(t("Web Socket nie je otvorený."))
        }
    }

    // Function For Add The Reaction
    const addReaction = (emoji_hex:string):void => {
        hideMessageProperties() // Closes The Message Properties

        if(chat_socket.current && chat_socket.current.readyState === WebSocket.OPEN) {
            if(selected_message) {
                chat_socket.current.send(
                    JSON.stringify({
                        action: "add_reaction",
                        chat_id: selected_message.id,
                        emoji: String.fromCodePoint(parseInt(emoji_hex, 16))
                    })
                )
            }
        } 
        
        else {
            console.warn(t("Web Socket nie je otvorený."))
        }
    }

    // Function For Handle The Emoji Select
    const handleEmojiSelect = (emoji:{ emoji:string }) => {
        if(new_message.length >= MAX_MESSAGE_LENGTH) return
        setNewMessage((previous_message) => previous_message + emoji.emoji) // Sets The New Message
    }

    // Function For Handle Message Properties Sheet Switching
    const handleMessagePropertiesChanges = (index:number) => {
        if(index === -1) setMessagePropertiesSheet("main") // Sets The Message Properties Sheet To Default
    }

    // Function For Show The Message Properties
    const showMessageProperties = (message:Chat):void => {
        setSelectedMessage(message) // Sets The Selected Message
        message_properties.current?.present() // Shows The Message Properties
    }

    // Function For Close The Message Properties
    const hideMessageProperties = ():void => {
        setSelectedMessage(null) // Sets The Selected Message
        message_properties.current?.dismiss() // Hides The Message Properties
    }

    // Function For Show The Attachment Options
    const showAttachmentOptions = ():void => {
        attachment_options.current?.present() // Shows The Attachment Options
    }

    // Function For Close The Attachment Options
    const hideAttachmentOptions = ():void => {
        attachment_options.current?.dismiss() // Hides The Attachment Options
    }

    return (
        <BottomSheetModalProvider>
            <View className="chat" style={styles.chat}>
                <View style={styles.circle_decoration_before} />
                <View style={styles.circle_decoration_after} />

                <View className="top" style={styles.top}>
                    <View className="receiver" style={styles.receiver}>
                        <ProfilePictureLink 
                            user_id={receiver.id} 
                            user_username={receiver.username}
                            user_profile_picture_name={receiver.profile_picture_name || null} 
                            user_subscription={receiver.subscription?.is_active || false} 
                            label={t("Zobraziť užívateľa")} 
                        />

                        <View className="name">
                            <Text className="username" style={styles.username}>{receiver.username}</Text>

                            {receiver.first_name && receiver.last_name && (
                                <Text className="full_name" style={{ color: SECONDARY_COLOR }}>{`${receiver.first_name} ${receiver.last_name}`}</Text>
                            )}
                        </View>
                    </View>
                </View>

                <View className="middle" style={styles.middle}>
                    <ScrollView 
                        ref={all_messages}
                        className="all_messages" 
                        showsVerticalScrollIndicator={false}
                        indicatorStyle="white"
                        keyboardShouldPersistTaps="handled" 
                        keyboardDismissMode="on-drag"
                        style={styles.all_messages}
                        contentContainerStyle={styles.all_messages}

                        onContentSizeChange={() => {
                            if(all_messages.current) all_messages.current.scrollToEnd({ animated: true }) // Auto Scrolls To The Bottom
                        }}
                    >
                        {chats.map((one_chat:Chat, index:number) => (
                            <View
                                key={one_chat.id || index}
                                className="one_message_container"

                                style={[
                                    styles.one_message_container,
                                    one_chat.is_sender ? styles.one_message_container_sender : styles.one_message_container_receiver
                                ]}
                            >
                                <Pressable 
                                    key={one_chat.id || index}
                                    className={one_chat.is_sender ? "one_message sender" : "one_message receiver"}
                                    onPress={one_chat === selected_message_for_edit ? cancelEditMessage : null}

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

                                    <View style={{ gap: 5 }}>
                                        {one_chat.attachment && (
                                            <>
                                                {(one_chat.attachment.attachment_type === "image" || one_chat.attachment.attachment_type === "video") ? (
                                                    <View style={styles.image_attachment}>
                                                        {one_chat.attachment.attachment_type === "image" && (
                                                            <DynamicImage 
                                                                uri={`${DOMAIN}${one_chat.attachment.attachment_url}`} 
                                                                style={{ borderRadius: MEDIUM_BORDER_RADIUS }}
                                                                scale_by_aspect_ratio={true}
                                                            />
                                                        )}

                                                        {one_chat.attachment.attachment_type === "video" && one_chat.attachment.attachment_thumbnail && (
                                                            <DynamicImage 
                                                                uri={`${DOMAIN}${one_chat.attachment.attachment_thumbnail}`} 
                                                                style={{ borderRadius: MEDIUM_BORDER_RADIUS }}
                                                                scale_by_aspect_ratio={true}
                                                            />
                                                        )}                                                 
                                                    </View>
                                                ) : (
                                                    <View style={styles.file_attachment}>
                                                        <Image
                                                            source={FILE_ICONS[one_chat.attachment.attachment_type] || require("@/assets/images/files/file.png")}

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
                                                                {one_chat.attachment.original_filename}
                                                            </Text>

                                                            <Text className="original_size" style={{ color: SECONDARY_COLOR }}>{getReadableSize(one_chat.attachment.compressed_size)}</Text>
                                                        </View>
                                                        
                                                        <View accessibilityLabel={t("Stiahnuť")}>
                                                            <Icon 
                                                                icon_name="download" 
                                                                onPress={() => downloadFile(one_chat.attachment.attachment_url, one_chat.attachment.original_filename)}
                                                            />
                                                        </View>
                                                    </View>
                                                )}
                                            </>
                                        )}

                                        {one_chat.content && (<Text style={{ color: SECONDARY_COLOR }}>{one_chat.content}</Text>)}
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
                                            onPress={() => showMessageProperties(one_chat)}
                                        />
                                    </View>
                                </Pressable>

                                <Text 
                                    numberOfLines={1} 

                                    style={[
                                        styles.time_label,
                                        one_chat.is_sender ? { marginLeft: 20 } : { marginRight: 20, textAlign: "right" }
                                    ]}
                                >
                                    {one_chat.formatted_time}
                                    {one_chat.is_edited && (t(" (upravené)"))}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View className="bottom">
                    <View className="write_message" style={styles.write_message}>
                        <TextInput
                            className="new_message"
                            textAlignVertical="top" 
                            placeholder={write_message_action === "new" ? t("Napísať správu") : t("Upraviť správu")} 
                            placeholderTextColor={LIGHT_BLUE_COLOR}
                            accessibilityLabel={write_message_action === "new" ? t("Napísať správu") : t("Upraviť správu")}
                            value={new_message}
                            onChangeText={setNewMessage}
                            maxLength={MAX_MESSAGE_LENGTH}

                            style={[
                                styles.new_message, 
                                { outlineStyle: "none" } as any
                            ]}
                        />

                        {logged_in_user && (
                            <View 
                                style={{ 
                                    position: "absolute",
                                    top: 6,
                                    left: 6,
                                }}
                            >
                                <ProfilePictureLink 
                                    user_id={logged_in_user.id} 
                                    user_username={logged_in_user.username}
                                    user_profile_picture_name={logged_in_user.profile_picture_name || null} 
                                    user_subscription={logged_in_user.subscription?.is_active || false} 
                                    label={t("Môj účet")} 
                                />
                            </View>
                        )}

                        <View 
                            className="add_emoji"
                            accessibilityLabel={t("Pridať emoji")}
                            style={styles.add_emoji}
                        >
                            <Icon 
                                icon_name="face-surprise"
                                is_regular={true}
                                onPress={() => setIsEmojiPickerOpen(true)}
                            />
                        </View>

                        <EmojiPicker
                            onEmojiSelected={handleEmojiSelect}
                            open={is_emoji_picker_open}
                            onClose={() => setIsEmojiPickerOpen(false)}

                            translation={{
                                smileys_emotion: t("Smajlíky"),
                                people_body: t("Ľudia"), 
                                recently_used: t("Naposledy použité"),
                                animals_nature: t("Zvieratá"),
                                food_drink: t("Jedlo a nápoje"),
                                activities: t("Aktivity"),
                                travel_places: t("Cestovanie"),
                                objects: t("Predmety"),
                                symbols: t("Symboly"),
                                flags: t("Vlajky"),
                                search: t("Hľadať..."),
                            }}
                        />

                        <AttachmentSelection 
                            onShowAttachmentOptions={showAttachmentOptions}
                            is_uploading={is_uploading}
                            selected_files_amount={selected_files.length || 0}
                        />

                        <Pressable 
                            className="send" 
                            accessibilityLabel={t("Odoslať správu")}
                            accessibilityRole="button"
                            onPress={sendMessage}
                            style={styles.send}
                        >
                            <Svg 
                                width={30} 
                                height={30} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                strokeWidth={1.5} 
                                stroke={BLUE_COLOR}
                            >
                                <Path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" 
                                />
                            </Svg>
                        </Pressable>
                    </View>
                </View>

                <BottomSheetModal
                    ref={message_properties}
                    snapPoints={snap_points}
                    enablePanDownToClose={true}
                    onChange={handleMessagePropertiesChanges}
                    containerStyle={{ zIndex: 9999 }}
                >
                    <BottomSheetView style={{ padding: 20 }}>
                        {selected_message ? (
                            <View className="message_properties">
                                {message_properties_sheet === "main" && (
                                    <View style={styles.sheet_container}>
                                        <Pressable
                                            className="add_reaction_button"
                                            onPress={() => setMessagePropertiesSheet("reaction")}
                                            accessibilityRole="button"

                                            style={({ pressed }) => [
                                                styles.sheet_item, 
                                                styles.sheet_item_border, 
                                                pressed && styles.sheet_item_pressed
                                            ]}
                                        >
                                            <View style={styles.sheet_icon}>
                                                <FontAwesome6
                                                    name="face-surprise"
                                                    size={20}
                                                    solid={false}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Text style={styles.sheet_text}>{t("Reakcia")}</Text>
                                        </Pressable>

                                        {/* If The Post Belongs To The Logged In User And Isn't Older Than 15 Minutes The Edit Option Will Be Shown */}
                                        {selected_message.is_sender && !selected_message.is_older_than_15_minutes && (
                                            <Pressable
                                                className="edit_message_button"
                                                onPress={() => handleEditMessage(selected_message)}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    styles.sheet_item, 
                                                    styles.sheet_item_border, 
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <View style={styles.sheet_icon}>
                                                    <FontAwesome6
                                                        name="pen"
                                                        size={20}
                                                        color={BLUE_COLOR}
                                                    />
                                                </View>

                                                <Text style={styles.sheet_text}>{t("Upraviť")}</Text>
                                            </Pressable>
                                        )}

                                        {/* If The Post Belongs To The Logged In User Or The Logged In User Is Developer Or Admin The Delete Option Will Be Shown */}
                                        {selected_message.is_sender && !selected_message.is_older_than_1_day && (
                                            <Pressable
                                                className="delete_message_button"
                                                onPress={(deleteMessage)}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    styles.sheet_item, 
                                                    styles.sheet_item_border, 
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <View style={styles.sheet_icon}>
                                                    <FontAwesome6
                                                        name="eraser"
                                                        size={20}
                                                        color={BLUE_COLOR}
                                                    />
                                                </View>

                                                <Text style={styles.sheet_text}>{t("Vymazať")}</Text>
                                            </Pressable>
                                        )}

                                        <Pressable
                                            className="hide_message_properties_button"
                                            onPress={hideMessageProperties}
                                            accessibilityRole="button"

                                            style={({ pressed }) => [
                                                styles.sheet_item, 
                                                pressed && styles.sheet_item_pressed
                                            ]}
                                        >
                                            <View style={styles.sheet_icon}>
                                                <FontAwesome6
                                                    name="xmark"
                                                    size={20}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
                                        </Pressable>
                                    </View>
                                )}

                                {message_properties_sheet === "reaction" && (
                                    <View className="add_reaction" style={styles.sheet_container}>
                                        <View style={styles.sheet_item}>
                                            <Pressable
                                                onPress={() => addReaction("1F600")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F600}"}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={() => addReaction("1F602")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F602}"}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={() => addReaction("1F923")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F923}"}
                                                </Text>
                                            </Pressable>
                                        </View>

                                        <View style={styles.sheet_item}>
                                            <Pressable
                                                onPress={() => addReaction("1F92F")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F92F}"}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={() => addReaction("1F60D")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F60D}"}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={() => addReaction("1F44D")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F44D}"}
                                                </Text>
                                            </Pressable>
                                        </View>

                                        <View style={styles.sheet_item}>
                                            <Pressable
                                                onPress={() => addReaction("1F44E")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F44E}"}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={() => addReaction("1F4AA")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F4AA}"}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={() => addReaction("1F64C")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F64C}"}
                                                </Text>
                                            </Pressable>
                                        </View>

                                        <View style={styles.sheet_item}>
                                            <Pressable
                                                onPress={() => addReaction("1F44F")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F44F}"}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={() => addReaction("1F91D")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F91D}"}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                onPress={() => addReaction("1F64F")}
                                                accessibilityRole="button"

                                                style={({ pressed }) => [
                                                    pressed && styles.sheet_item_pressed
                                                ]}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.sheet_text,
                                                        { fontSize: 30 }
                                                    ]}
                                                >
                                                    {"\u{1F64F}"}
                                                </Text>
                                            </Pressable>
                                        </View>

                                        <Pressable
                                            className="back_add_reaction_button"
                                            onPress={() => setMessagePropertiesSheet("main")}
                                            accessibilityRole="button"

                                            style={({ pressed }) => [
                                                styles.sheet_item, 
                                                pressed && styles.sheet_item_pressed
                                            ]}
                                        >
                                            <View style={styles.sheet_icon}>
                                                <FontAwesome6
                                                    name="xmark"
                                                    size={20}
                                                    color={BLUE_COLOR}
                                                />
                                            </View>

                                            <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        ) : null}
                    </BottomSheetView>
                </BottomSheetModal>

                <BottomSheetModal
                    ref={attachment_options}
                    snapPoints={snap_points}
                    enablePanDownToClose={true}
                    containerStyle={{ zIndex: 9999 }}
                >
                    <BottomSheetView style={{ padding: 20 }}>
                        <View className="attachment_options">
                            <View style={styles.sheet_container}>
                                <Pressable
                                    onPress={() => {
                                        hideAttachmentOptions() // Hides The Attachment Options
                                        selectChatAttachment("gallery") // Sets The Selected Chat Attachment
                                    }}

                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <Ionicons name="images" size={24} color={BLUE_COLOR} />
                                    </View>

                                    <Text style={styles.sheet_text}>{t("Fotografie a Videá")}</Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => {
                                        hideAttachmentOptions() // Hides The Attachment Options
                                        selectChatAttachment("documents") // Sets The Selected Chat Attachment
                                    }}
 
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <Ionicons name="document-text" size={24} color={RED_COLOR} />
                                    </View>

                                    <Text style={styles.sheet_text}>{t("Dokumenty a Súbory")}</Text>
                                </Pressable>

                                <Pressable
                                    className="hide_attachment_options_button"
                                    onPress={hideAttachmentOptions}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <FontAwesome6
                                            name="xmark"
                                            size={20}
                                            color={BLUE_COLOR}
                                        />
                                    </View>

                                    <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </BottomSheetView>
                </BottomSheetModal>
            </View>
        </BottomSheetModalProvider>
    )
}

const styles = StyleSheet.create({
    chat: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginHorizontal: "auto",
        paddingTop: 30,
        paddingHorizontal: 50,
        paddingBottom: 50,
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
        marginBottom: 30 - 12 - 5,
    },

    receiver: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        textAlign: "left",
    },

    username: {
        fontSize: 22,
        fontWeight: "semibold",
        color: SECONDARY_COLOR,
    },

    middle: {
        marginBottom: 30,
        paddingTop: 12 + 5,
    },

    all_messages: {
        flexDirection: "column-reverse",
        gap: 50,
        maxHeight: 400,
    },

    one_message_container: {
        maxWidth: "80%",
        width: "100%",
        gap: 5,
    },

    one_message_container_receiver: {
        flexDirection: "column",
        marginRight: 20,
        marginLeft: "auto",
        textAlign: "right",
    },

    one_message_container_sender: {
        flexDirection: "column",
        marginRight: "auto",
        marginLeft: 20,
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
        marginRight: 20,
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
        marginLeft: 20,
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

    write_message: {
        position: "relative",
        marginTop: 8,
    },

    new_message: {
        width: "100%",
        minHeight: 50,
        // field-sizing: content;
        paddingVertical: 12,
        paddingRight: 30 + 10 + 10,
        paddingLeft: 38 + 6 + 10 + 15 + 10 + 20 + 10,
        textAlign: "left",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: padding 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

        // &:empty::before {
        //     content: attr(data-placeholder);
        //     color: $light-blue-color;
        //     cursor: text;
        // }

        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    tag: {
        display: "flex",
        height: 25,
        lineHeight: 25,
        paddingHorizontal: 5,
        backgroundColor: transparentize(BLUE_COLOR, 0.8),
        color: BLUE_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
        fontSize: 15,
    },

    hashtag: {
        display: "flex",
        height: 25,
        lineHeight: 25,
        paddingHorizontal: 5,
        backgroundColor: transparentize(GREEN_COLOR, 0.9),
        color: GREEN_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
        fontSize: 15,
    },

    add_emoji: {
        position: "absolute",
        top: 24,
        left: 6 + 38 + 10,
        transform: [{ translateY: "-50%" }],
    },

    send: {
        position: "absolute",
        top: "50%",
        right: 10,
        transform: [{ translateY: "-50%" }],
        width: 30,
        height: 30,
        color: BLUE_COLOR,
        // transition: transform 0.2s ease, color 0.3s ease;

        // &:hover {
        //     transform: translateY(-50%) scale(1.1);
        //     color: $dark-blue-color;
        //     cursor: pointer;
        // }
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