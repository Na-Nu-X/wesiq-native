import { StyleSheet, ScrollView, Alert, View } from "react-native"
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
    has_next?:boolean,
    receiver?:Receiver,
    chats?:Chat[],
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
    attachments:Attachment[],
    is_read:boolean,
    is_edited:boolean,
    formatted_time:string,
    is_sender:boolean,
    message_reactions:MessageReaction[],
    is_older_than_15_minutes:boolean,
    is_older_than_1_day:boolean,
    post?:Post
}

interface Post {
    id:number,

    user:{
        id:number,
        username:string,
        profile_picture_name:string|null,

        subscription?:{
            is_active:boolean
        },
    },

    description:string|null,
    public_visibility:boolean,
    allow_comments:boolean,
    hide_likes:boolean,
    likes:number,
    comments:number,
    created_at:string,

    media:{
        id:number,
        file:string,
        thumbnail:string|null,
        is_video:boolean
    }
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
    attachments:Attachment[],
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
    original_size:number,
    compressed_size:number
}

export default function ChatDetailScreen() {
    const { t } = useTranslation() // Initializes The Translations

    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const { username } = useLocalSearchParams<{ username:string }>() // Gets The Username

    const [receiver, setReceiver] = useState<Receiver|null>() // Stores The Receiver
    const [chats, setChats] = useState<Chat[]>([]) // Stores The Chats
    const [page, setPage] = useState(1) // Stores The Current Page Number
    const [has_next, setHasNext] = useState<boolean>(true) // Stores The Information If There Are More Chats Available
    const [are_chats_loading, setAreChatsLoading] = useState(false) // Stores The Information If Chats Are Loading
    const [is_error, setIsError] = useState<boolean>(false) // Stores The Information That There Is An Error

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

    // Function For Load The Chats
    const loadChats = async (username:string, page:number = 1, is_refresh:boolean = false):Promise<void> => {
        if(are_chats_loading || (!has_next && !is_refresh)) return

        setAreChatsLoading(true) // Stores The Information That Chats Are Loading

        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Užívateľa nie je možné nájsť bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const loaded_chat_response:Response = await fetch(`${API_URL}/get-chat/${username}/?page=${page}`, {
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
                setIsError(true) // Sets The Information That There Is An Error
                Alert.alert(t("Chyba"), loaded_chat_data.message) // Shows The Alert
                return
            }

            if(is_refresh) {
                setReceiver(loaded_chat_data.receiver) // Sets The Receiver
                if(loaded_chat_data.chats) setChats(loaded_chat_data.chats) // Sets The Chats
            }
            
            else {
                setChats(previous_chats => {
                    const existing_chat_ids:Set<number> = new Set(previous_chats.map((one_chat:Chat) => one_chat.id)) // Gets The Existing Chats IDs
                    const new_chats:Chat[] = (loaded_chat_data.chats as Chat[]).filter((one_chat:Chat) => !existing_chat_ids.has(one_chat.id)) // Gets The New Unique Chats
                
                    return [...previous_chats, ...new_chats] // Returns The Combined Chats
                })
            }
    
            setHasNext(loaded_chat_data.has_next || false) // Sets The Has Next
            setPage(page) // Sets The Page
        } 
        
        catch {
            setIsError(true) // Sets The Information That There Is An Error
            Alert.alert(t("Chyba"), t("Pri hľadaní užívateľa došlo k chybe.")) // Shows The Alert
        }

        finally {
            setAreChatsLoading(false) // Stores The Information That Chats Aren't Loading
        }
    }

    // Initializes The Load Of The Chats
    useEffect(() => {
        if(username && logged_in_user) loadChats(username, 1, true) // Loads The Chats
    }, [username, logged_in_user])

    // Function For Load More Chats
    const loadMoreChats = ():void => {
        if(has_next && !are_chats_loading) loadChats(username, page + 1) // Loads The Chats
    }

    return (
        <BackgroundContainer>
            <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
                <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                />

                <View 
                    className="content" 
                    style={styles.content}
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
                            onLoadMoreChats={loadMoreChats}
                            has_next={has_next}
                            are_chats_loading={are_chats_loading}
                            is_error={is_error}
                        />
                    )}
                </View>
            </SafeAreaView>
        </BackgroundContainer>
    )
}

const styles = StyleSheet.create({
    safe_area: {
        flex: 1,
    },
  
    content: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        padding: 20,
    },
})