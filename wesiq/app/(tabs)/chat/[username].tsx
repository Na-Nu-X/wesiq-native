import { StyleSheet, ScrollView, Alert } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useState } from "react"
import Banner from "@/components/Banner"
import LoginFormDialog from "@/components/LoginFormDialog"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import { API_URL } from "@/constants/general"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useLocalSearchParams } from "expo-router"
import { useTranslation } from "react-i18next"
import { ChatContainer } from "@/components/pages/chat/ChatContainer"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"

export interface LoadedChatResponse {
    success:boolean, 
    receiver:Receiver|null,
    chats:Chat[]|null,
    message:string
}

export interface Receiver {
    id:number,
    first_name:string|null,
    last_name:string|null
    username:string,
    profile_picture_name:string|null,

    subscription: {
        is_active:boolean
    }|null
}

interface Sender {
    id:number,
    profile_picture_name:string|null,

    subscription: {
        is_active:boolean
    }|null
}

export interface Chat {
    id:number,
    sender:Sender,
    content:string,
    attachment:Attachment,
    is_read:boolean,
    is_edited:boolean,
    formatted_time:string,
    is_sender:boolean,
    message_reactions:MessageReaction[],
    is_older_than_15_minutes:boolean,
    is_older_than_1_day:boolean
}

export interface MessageReaction {
    user: {
        username:string
    },

    emoji:string
}

export interface ChatSocketResponse {
    action:"new"|"edit"|"delete"|"add_reaction"|"remove_reaction"|"new_message_notification",
    chat_id:number,
    message:string,
    attachment:Attachment,
    formatted_time?:string,
    sender_id:number,
    sender_username?:string,
    sender_profile_picture_name:string,
    emoji?:string,
    emoji_sender_username?:string
}

export interface Attachment {
    attachment_url:string,
    attachment_thumbnail:string|null,
    attachment_type:"image"|"video"|"audio"|"pdf"|"doc"|"excel"|"powerpoint"|"archive"|"text"|"file",
    original_filename:string,
    compressed_size:number
}

export default function ChatDetailScreen() {
    const { t } = useTranslation() // Initializes The Translations

    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const { username } = useLocalSearchParams<{ username:string }>() // Gets The Username

    const [receiver, setReceiver] = useState<Receiver|null>() // Stores The Receiver
    const [chats, setChats] = useState<Chat[]>([]) // Stores The Chats

    // Function For Get The Logged In User
    const getLoggedInUser = async () => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const logged_in_user_response:Response = await fetch(`${API_URL}/get-logged-in-user/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })
    
            const logged_in_user_data:LoggedInUserResponse = await logged_in_user_response.json() // Gets The Logged In User Data

            if(logged_in_user_response.status === 401) {
                await AsyncStorage.removeItem("user_token") // Removes The User Token
                setLoggedInUser(null) // Removes The Logged In User
                return null
            }
    
            if(logged_in_user_data.success) {
                setLoggedInUser(logged_in_user_data.logged_in_user || null) // Sets The Logged In User
                return logged_in_user_data.logged_in_user || null
            } 
            
            else return null
        } 
        
        catch {
            return null
        }
    }

    // Initializes The Get Logged In User
    useEffect(() => {
        getLoggedInUser() // Gets The Logged In User
    }, [])

    // Function For Get The Chat
    const getChat = async (username:string):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Užívateľa nie je možné nájsť bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const loaded_chat_response:Response = await fetch(`${API_URL}/get-chat/${username}/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_chat_response.ok) {
                Alert.alert(t("Chyba"), t("Pri hľadaní užívateľa došlo k chybe.")) // Shows The Alert
                return
            }

            const loaded_chat_data:LoadedChatResponse = await loaded_chat_response.json() // Gets The Loaded Chat Data
            
            console.log(loaded_chat_data)

            // If The Response Isn't Success
            if(!loaded_chat_data.success) {
                Alert.alert(t("Chyba"), loaded_chat_data.message) // Shows The Alert
                return
            }
            
            else {
                setReceiver(loaded_chat_data.receiver) // Sets The Receiver
                if(loaded_chat_data.chats) setChats(loaded_chat_data.chats) // Sets The Chats
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri hľadaní užívateľa došlo k chybe.")) // Shows The Alert
        }
    }

    // Initializes The Load Of The Chat
    useEffect(() => {
        if(username && logged_in_user) getChat(username) // Gets The Chat
    }, [username, logged_in_user])

    return (
        <BackgroundContainer>
            <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
                <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                />

                <ScrollView 
                    className="content" 
                    style={styles.content} 
                    contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled" 
                    keyboardDismissMode="on-drag"
                >
                    <LoginFormDialog 
                        visible={active_form==="login_form"}
                        onChangeActiveForm={() => setActiveForm("registration_form")}
                        onClose={() => setActiveForm(null)}
                        onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
                    />

                    <RegistrationFormDialog
                        visible={active_form==="registration_form"}
                        onChangeActiveForm={() => setActiveForm("login_form")}
                        onClose={() => setActiveForm(null)}
                        onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
                    />

                    {receiver && chats && (
                        <ChatContainer 
                            logged_in_user={logged_in_user}
                            username={username}
                            receiver={receiver}
                            onSetChats={(chats:Chat[]) => setChats(chats)}
                            chats={chats}
                        />
                    )}
                </ScrollView>
            </SafeAreaView>
        </BackgroundContainer>
    )
}

const styles = StyleSheet.create({
    safe_area: {
        flex: 1,
    },
  
    content: {
        flex: 1,
    },
})