import { useState, RefObject } from "react"
import { Alert, StyleSheet, View, ActivityIndicator, Platform } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"
import Icon from "@/components/Icon"
import { API_URL } from "@/constants/general"
import AsyncStorage from "@react-native-async-storage/async-storage"

import type { LoggedInUser } from "@/components/LoginFormDialog"

interface SentChatAttachmentResponse {
    success:boolean,
    sent_attachments?:Attachment[],
    message:string
}

interface Attachment {
    attachment_id:number,
    attachment_url:string,
    attachment_type:string
}

interface AttachmentSelectionProps {
    logged_in_user:LoggedInUser|null,
    chat_socket:RefObject<WebSocket|null>
}

export default function AttachmentSelection({ logged_in_user, chat_socket }:AttachmentSelectionProps) {
    const { t } = useTranslation() // Initializes The Translations

    const [is_uploading, setIsUploading] = useState<boolean>(false) // Stores The Information If The Attachment Is Uploading

    // Function For Select Chat Attachment
    const selectChatAttachment = async ():Promise<void> => {
        try {
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
                    Alert.alert(t("Nepodporovaný formát"), t("Niekteré vybrané súbory boli vynechané, pretože nie sú podporovaným obrázkom alebo videom.")) // Shows The Alert
                }
        
                if(valid_files.length > 0) {
                    setIsUploading(true) // Sets The Information That The Attachment Is Uploading
    
                    // Gets The Sent Chat Attachment Data
                    const sent_chat_attachment_data:Attachment[] = await sendChatAttachment(valid_files) || [] // Gets The Sent Chat Attachment Data
    
                    if(chat_socket.current && chat_socket.current.readyState === WebSocket.OPEN) {
                        sent_chat_attachment_data.forEach((one_attachment:Attachment) => {
                            if(chat_socket.current) {
                                // Sends The Attachment
                                chat_socket.current.send(JSON.stringify({
                                    action: "send_attachment",
                                    attachment_id: one_attachment.attachment_id,
                                    attachment_type: one_attachment.attachment_type,
                                    attachment_url: one_attachment.attachment_url
                                }))
                            }
                        })
                    }
                }
            }
        }

        catch {
            console.warn(t("Pri výbere súborov došlo k chybe."))
            Alert.alert(t("Nepodporovaný formát"), t("Niekteré vybrané súbory boli vynechané, pretože nie sú podporovaným obrázkom alebo videom.")) // Shows The Alert
        }

        finally {
            setIsUploading(false) // Sets The Information That The Attachment Isn't Uploading
        }
    }

    // Function For Send Chat Attachment
    const sendChatAttachment = async (selected_files:ImagePicker.ImagePickerAsset[]):Promise<Attachment[]|undefined> => {
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
    const prepareFileForFormData = async (file:ImagePicker.ImagePickerAsset):Promise<any> => {
        const is_video:boolean = file.type === "video" // Stores The Information If The Selected File Is Video
        const default_extension:"mp4"|"jpg" = is_video ? "mp4" : "jpg" // Sets The Default Extension

        const file_name:string = file.fileName || `file_${Date.now()}.${default_extension}` // Sets The File Name
        const file_type:string = file.mimeType || (is_video ? "video/mp4" : "image/jpeg") // Sets The File Type

        // Web
        if(Platform.OS === "web") {
            console.log("WEB")
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

    return (
        <View style={styles.attachment_selection}>
            {is_uploading ? (
                <ActivityIndicator size="small" color="#0000ff" />
            ) : (
                <Icon
                    icon_name="plus"
                    onPress={selectChatAttachment}
                />
            )}
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
