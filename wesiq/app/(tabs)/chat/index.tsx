import { View, Text, StyleSheet, ScrollView, Alert, Pressable, Image, TouchableOpacity, TextInput } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
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
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"

interface UnreadChatsResponse {
    success:boolean, 
    unread_chats:UnreadChat[],
    message:string
}

interface UnreadChat {
    id:number, 
    sender:Sender
}

interface Sender {
    id:number,
    username:string,
    profile_picture_name:string|null,

    subscription: {
        is_active:boolean
    }|null
}

export default function ChatScreen() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [unread_chats, setUnreadChats] = useState<UnreadChat[]>([]) // Stores The Unread Chats

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

    // Function For Get The Unread Chats
    const getUnreadChats = async ():Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Nové správy nie je možné načítať bez prihlásenia.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const unread_chats_response:Response = await fetch(`${API_URL}/get-unread-chats/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!unread_chats_response.ok) {
                Alert.alert("Chyba", "Pri načítaní nových správ došlo k chybe.") // Shows The Alert
                return
            }

            const unread_chats_data:UnreadChatsResponse = await unread_chats_response.json() // Gets The Unread Chats Data

            console.log(unread_chats_data.unread_chats)

            // If The Response Isn't Success
            if(!unread_chats_data.success) {
                Alert.alert("Chyba", unread_chats_data.message) // Shows The Alert
                return
            }
            
            else {
                setUnreadChats(unread_chats_data.unread_chats) // Sets The Unread Chats
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri načítaní nových správ došlo k chybe.") // Shows The Alert
        }
    }

    // Initializes The Load Of The Unread Chats
    useEffect(() => {
        getUnreadChats() // Gets The Unread Chats
    }, [logged_in_user])

    // Groups The Senders
    const grouped_senders = Object.values(
        unread_chats.reduce((user, chat) => {
            const sender_id:number = chat.sender.id // Gets The Sender ID

            if(!user[sender_id]) {
                user[sender_id] = {
                    sender: chat.sender,
                    first_message: chat,
                    list: []
                }
            }

            user[sender_id].list.push(chat)

            return user
        }, {} as Record<number, { sender:Sender, first_message:UnreadChat, list:UnreadChat[] }>)
    )

    console.log(grouped_senders)

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

                    {unread_chats.length > 0 ? (
                        <ScrollView 
                            className="all_messages" 
                            showsVerticalScrollIndicator={false}
                            indicatorStyle="white"
                            keyboardShouldPersistTaps="handled" 
                            keyboardDismissMode="on-drag"
                            style={styles.all_messages}
                        >
                            <View style={styles.circle_decoration_before} />
                            <View style={styles.circle_decoration_after} />

                            <View className="search_bar_container" style={styles.search_bar_container}>
                                <View className="magnifying_glass_icon" style={styles.magnifying_glass_icon}>
                                    <Icon icon_name="magnifying-glass" />
                                </View>

                                <View className="delete_search_bar" style={styles.delete_search_bar}>
                                    <Icon icon_name="xmark" />
                                </View>

                                <TextInput
                                    className="search_bar"
                                    textAlignVertical="top" 
                                    placeholder="Nájsť užívateľa" 
                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                    accessibilityLabel="Nájsť užívateľa" 
                                    // value={searched_text}
                                    // onChangeText={getSearchedUsers}

                                    style={[
                                        styles.search_bar, 
                                        { outlineStyle: "none" } as any
                                    ]}
                                />
                            </View>

                            {grouped_senders.map((one_item:{
                                sender:Sender,
                                first_message:UnreadChat,
                                list:UnreadChat[]
                            }, index:number) => (
                                <View key={one_item.sender.id || index} className="one_message" style={styles.one_message}>
                                    <ProfilePictureLink 
                                        user_id={one_item.sender.id} 
                                        user_username={one_item.sender.username}
                                        user_profile_picture_name={one_item.sender.profile_picture_name || null} 
                                        user_subscription={one_item.sender.subscription?.is_active || false} 
                                        label="Zobraziť užívateľa" 
                                    />

                                    <Text className="username" numberOfLines={1} ellipsizeMode="tail" style={styles.username}>{one_item.sender.username}</Text>

                                    <View className="message_container" style={styles.message_container}>
                                        <Text className="unread_messages" style={styles.unread_messages}>{one_item.list.length <= 9 ? one_item.list.length : "9+"}</Text>

                                        <View 
                                            className="chat"
                                            accessibilityLabel="Zobraziť správy"
                                        >
                                            <Icon 
                                                icon_name="comment-dots"
                                                // onPress={}
                                                size={25}
                                                is_regular={true}
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text className="no_messages" style={styles.no_messages}>Žiadne nové správy</Text>
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

    all_messages: {
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

    search_bar_container: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginBottom: 20,
        // backdrop-filter: blur(5px);
        zIndex: 100,
    },

    magnifying_glass_icon: {
        // @include icon;
        pointerEvents: "none",
        position: "absolute",
        top: "50%",
        left: 8.5,
        transform: [{ translateY: "-50%" }],
        color: BLUE_COLOR,
        fontSize: 20,
        // transition: color 0.3s ease
    },

    delete_search_bar: {
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        top: "50%",
        right: 0,
        transform: [{ translateY: "-50%" }],
        height: "100%",
        width: 40,
        zIndex: 200,

        // &:hover {
        //             .fa-xmark {
        //                 color: $dark-blue-color;
        //                 transition: color 0.2s ease;
        //             }
        //         }
    },

    search_bar: {
        width: "100%",
        height: 40,
        paddingHorizontal: 40,
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: DARK_BLUE_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
        textAlign: "center",
        zIndex: 50,
        // transition: border 0.2s ease, box-shadow 0.2s ease;

        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color !important;
        // }
    },

    no_messages: {
        color: SECONDARY_COLOR,
        textAlign: "center",
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

    message_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 5,
        marginLeft: "auto",
        paddingVertical: 5,
    },

    unread_messages: {
        fontSize: 22,
        color: transparentize(SECONDARY_COLOR, 0.4),
    },
})