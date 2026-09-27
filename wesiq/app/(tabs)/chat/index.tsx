import { View, Text, StyleSheet, ScrollView, Alert } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useState } from "react"
import Banner from "@/components/Banner"
import LoginFormDialog from "@/components/LoginFormDialog"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import ProfilePictureLink from "@/components/ProfilePictureLink"
import Icon from "@/components/Icon"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { useTranslation } from "react-i18next"
import { ImperativeRouter, useRouter } from "expo-router"
import { SearchChat } from "@/components/pages/chat/SearchChat"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"
import type { Chat } from "@/components/pages/chat/SearchChat"

interface ChatsResponse {
    success:boolean, 
    unread_chats:ChatData[],
    read_chats:ChatData[],
    message:string
}

export interface ChatData {
    id:number, 
    sender:Sender,
    content:string
}

export interface Sender {
    id:number,
    username:string,
    profile_picture_name:string|null,

    subscription: {
        is_active:boolean
    }|null
}

export default function ChatScreen() {
    const { t } = useTranslation() // Initializes The Translations

    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [unread_chats, setUnreadChats] = useState<ChatData[]>([]) // Stores The Unread Chats
    const [read_chats, setReadChats] = useState<ChatData[]>([]) // Stores The Read Chats

    const router:ImperativeRouter = useRouter() // Gets The Router

    const [searched_text, setSearchedText] = useState<string>("") // Stores The Searched Text
    const [filtered_chats, setFilteredChats] = useState<Chat[]>([]) // Stores The Filtered Chats

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

    // Function For Get The Chats
    const getChats = async ():Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Správy nie je možné načítať bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const chats_response:Response = await fetch(`${API_URL}/get-chats/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!chats_response.ok) {
                Alert.alert(t("Chyba"), t("Pri načítaní správ došlo k chybe.")) // Shows The Alert
                return
            }

            const chats_data:ChatsResponse = await chats_response.json() // Gets The Chats Data

            // If The Response Isn't Success
            if(!chats_data.success) {
                Alert.alert(t("Chyba"), chats_data.message) // Shows The Alert
                return
            }
            
            else {
                setUnreadChats(chats_data.unread_chats) // Sets The Unread Chats
                setReadChats(chats_data.read_chats) // Sets The Read Chats
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri načítaní správ došlo k chybe.")) // Shows The Alert
        }
    }

    // Initializes The Load Of The Chats
    useEffect(() => {
        getChats() // Gets The Chats
    }, [logged_in_user])

    // Groups The Unread Chats By Senders
    const grouped_unread_chats:Chat[] = Object.values(
        unread_chats.reduce((user:Record<number, Chat>, chat:ChatData) => {
            const sender_id:number = chat.sender.id // Gets The Sender ID

            if(!user[sender_id]) {
                user[sender_id] = {
                    sender: chat.sender,
                    list: []
                }
            }

            if(user[sender_id].list) user[sender_id].list.push(chat)

            return user
        }, {} as Record<number, Chat>)
    )

    // Groups The Read Chats By Senders
    const grouped_read_chats:Chat[] = Object.values(
        read_chats.reduce((user:Record<number, Chat>, chat:ChatData) => {
            const sender_id:number = chat.sender.id // Gets The Sender ID

            if(!user[sender_id]) {
                user[sender_id] = {
                    sender: chat.sender,
                    last_message: chat.content
                }
            }

            user[sender_id].last_message = chat.content // Updates The Last Message

            return user
        }, {} as Record<number, Chat>)
    )

    return (
        <BackgroundContainer>
            <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
                <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                />

                <ScrollView 
                    className="content" 
                    keyboardShouldPersistTaps="handled" 
                    keyboardDismissMode="on-drag"
                    style={styles.content} 

                    contentContainerStyle={{ 
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 20, 
                        flexGrow: 1 
                    }}
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

                    <ScrollView 
                        className="all_messages_container" 
                        showsVerticalScrollIndicator={false}
                        indicatorStyle="white"
                        keyboardShouldPersistTaps="handled" 
                        keyboardDismissMode="on-drag"
                        style={styles.all_messages_container}
                    >
                        <View style={styles.circle_decoration_before} />
                        <View style={styles.circle_decoration_after} />

                        <SearchChat 
                            grouped_unread_chats={grouped_unread_chats} 
                            grouped_read_chats={grouped_read_chats} 
                            onFilteredChatsUpdate={(filtered_chats:Chat[]) => setFilteredChats(filtered_chats)}
                            onSearchedTextUpdate={(searched_text:string) => setSearchedText(searched_text)}
                            searched_text={searched_text}
                        />

                        {filtered_chats.length === 0 || searched_text.trim() === "" ? (
                            <>
                                {unread_chats.length > 0 ? (
                                    <View 
                                        className="all_unread_messages" 

                                        style={[
                                            styles.all_messages,
                                            { marginBottom: 50 },
                                        ]}
                                    >
                                        {grouped_unread_chats.map((one_item:Chat, index:number) => (
                                            <View key={one_item.sender.id || index} className="one_message" style={styles.one_message}>
                                                <ProfilePictureLink 
                                                    user_id={one_item.sender.id} 
                                                    user_username={one_item.sender.username}
                                                    user_profile_picture_name={one_item.sender.profile_picture_name || null} 
                                                    user_subscription={one_item.sender.subscription?.is_active || false} 
                                                    label={t("Zobraziť užívateľa")} 
                                                />
            
                                                <Text className="username" numberOfLines={1} ellipsizeMode="tail" style={styles.username}>{one_item.sender.username}</Text>
            
                                                <View className="message_container" style={styles.message_container}>
                                                    {one_item.list && (<Text className="unread_messages" style={styles.messages}>{one_item.list.length <= 9 ? one_item.list.length : "9+"}</Text>)}
            
                                                    <View 
                                                        className="chat"
                                                        accessibilityLabel={t("Zobraziť správy")}
                                                    >
                                                        <Icon 
                                                            icon_name="comment-dots"
                                                            onPress={() => router.push(`/chat/${one_item.sender.username}`)}
                                                            size={25}
                                                            is_regular={true}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text className="no_messages" style={styles.no_messages}>{t("Žiadne nové správy")}</Text>
                                )}

                                {read_chats.length > 0 ? (
                                    <View className="all_read_messages" style={styles.all_messages}>
                                        {grouped_read_chats.map((one_item:Chat, index:number) => (
                                            <View key={one_item.sender.id || index} className="one_message" style={styles.one_message}>
                                                <ProfilePictureLink 
                                                    user_id={one_item.sender.id} 
                                                    user_username={one_item.sender.username}
                                                    user_profile_picture_name={one_item.sender.profile_picture_name || null} 
                                                    user_subscription={one_item.sender.subscription?.is_active || false} 
                                                    label={t("Zobraziť užívateľa")} 
                                                />
            
                                                <Text className="username" numberOfLines={1} ellipsizeMode="tail" style={styles.username}>{one_item.sender.username}</Text>

                                                <Text className="last_message" numberOfLines={1} ellipsizeMode="tail" style={styles.last_message}>{one_item.last_message}</Text>
            
                                                <View className="message_container" style={styles.message_container}>
                                                    <View 
                                                        className="chat"
                                                        accessibilityLabel={t("Zobraziť správy")}
                                                    >
                                                        <Icon 
                                                            icon_name="comment-dots"
                                                            onPress={() => router.push(`/chat/${one_item.sender.username}`)}
                                                            size={25}
                                                            is_regular={true}
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : null}
                            </>
                        ) : (
                            filtered_chats.map((one_item:Chat, index:number) => (
                                <View key={one_item.sender.id || index} className="one_message" style={styles.one_message}>
                                    <ProfilePictureLink 
                                        user_id={one_item.sender.id} 
                                        user_username={one_item.sender.username}
                                        user_profile_picture_name={one_item.sender.profile_picture_name || null} 
                                        user_subscription={one_item.sender.subscription?.is_active || false} 
                                        label={t("Zobraziť užívateľa")} 
                                    />

                                    <Text className="username" numberOfLines={1} ellipsizeMode="tail" style={styles.username}>{one_item.sender.username}</Text>

                                    {one_item.last_message && (<Text className="last_message" numberOfLines={1} ellipsizeMode="tail" style={styles.last_message}>{one_item.last_message}</Text>)}

                                    <View className="message_container" style={styles.message_container}>
                                        {one_item.list && (<Text className="unread_messages" style={styles.messages}>{one_item.list.length <= 9 ? one_item.list.length : "9+"}</Text>)}

                                        <View 
                                            className="chat"
                                            accessibilityLabel={t("Zobraziť správy")}
                                        >
                                            <Icon 
                                                icon_name="comment-dots"
                                                onPress={() => router.push(`/chat/${one_item.sender.username}`)}
                                                size={25}
                                                is_regular={true}
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
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

    all_messages_container: {
        gap: 10,
        maxWidth: MAIN_WIDTH,
        width: "100%",
        padding: 20,
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

    no_messages: {
        color: SECONDARY_COLOR,
        textAlign: "center",
    },

    all_messages: {
        gap: 10,
    },

    one_message: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        // transition: display 0.3s ease allow-discrete, transform 0.3s ease, opacity 0.3s ease;

        // &.hidden {
        //     display: none;
        //     transform: translateX(-100%);
        //     opacity: 0;
        // }
    },

    username: {
        // @include crop_text;
        flex: 1,
        width: 250,
        color: SECONDARY_COLOR,
    },

    last_message: {
        // @include crop_text;
        flex: 1,
        width: 250,
        textAlign: "right",
        color: transparentize(SECONDARY_COLOR, 0.4),
    },

    message_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 5,
        marginLeft: "auto",
        paddingVertical: 5,
    },

    messages: {
        fontSize: 22,
        color: transparentize(SECONDARY_COLOR, 0.4),
    },
})