import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert, Platform } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useMemo, useRef, useState } from "react"
import Banner from "@/components/Banner"
import LoginFormDialog from "@/components/LoginFormDialog"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import ProfilePictureLink from "@/components/ProfilePictureLink"
import { API_URL, DOMAIN } from "@/constants/general"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import { TextInput } from "react-native"
import EmojiPicker from "rn-emoji-keyboard"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import Svg, { Path } from "react-native-svg"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useLocalSearchParams } from "expo-router"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { MAIN_WIDTH } from "@/constants/dimensions"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"

interface LoadedChatResponse {
    success:boolean, 
    receiver:Receiver|null,
    chats:Chat[]|null,
    message:string
}

interface Receiver {
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

interface Chat {
    id:number,
    sender:Sender,
    content:string,
    is_read:boolean,
    is_edited:boolean,
    formatted_time:string,
    is_sender:boolean,
    message_reactions:MessageReaction[],
    is_older_than_15_minutes:boolean,
    is_older_than_1_day:boolean
}

interface MessageReaction {
    user: {
        username:string
    },

    emoji:string
}

export default function ChatDetailScreen() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const { username } = useLocalSearchParams<{ username:string }>() // Gets The Username

    const [receiver, setReceiver] = useState<Receiver|null>() // Stores The Receiver
    const [chats, setChats] = useState<Chat[]|null>() // Stores The Chats

    const [new_message, setNewMessage] = useState<string>("") // Stores The New Message
    const [is_emoji_picker_open, setIsEmojiPickerOpen] = useState(false) // Stores The Information If The Emoji Picker Is Open
    const MAX_MESSAGE_LENGTH:number = 250 // Sets The Maximum Message Length

    const message_properties = useRef<BottomSheetModal>(null) // Stores The Message Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [message_properties_sheet, setMessagePropertiesSheet] = useState<"main"|"reaction">("main") // Stores The Active Post Properties Sheet
    const [selected_message, setSelectedMessage] = useState<Chat|null>(null) // Stores The Selected Message

    const [write_message_action, setWriteMessageAction] = useState<"new"|"edit">("new") // Stores The Write Message Action
    const [selected_message_for_edit, setSelectedMessageForEdit] = useState<Chat|null>(null) // Stores The Selected Message For Edit

    // Function For Get The Logged In User
    const getLoggedInUser = async () => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
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
                Alert.alert("Chyba", "Užívateľa nie je možné nájsť bez prihlásenia.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
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
                Alert.alert("Chyba", "Pri hľadaní užívateľa došlo k chybe.") // Shows The Alert
                return
            }

            const loaded_chat_data:LoadedChatResponse = await loaded_chat_response.json() // Gets The Loaded Chat Data

            // If The Response Isn't Success
            if(!loaded_chat_data.success) {
                Alert.alert("Chyba", loaded_chat_data.message) // Shows The Alert
                return
            }
            
            else {
                setReceiver(loaded_chat_data.receiver) // Sets The Receiver
                setChats(loaded_chat_data.chats) // Sets The Chats
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri hľadaní užívateľa došlo k chybe.") // Shows The Alert
        }
    }

    // Initializes The Load Of The Chat
    useEffect(() => {
        if(username && logged_in_user) getChat(username) // Gets The Chat
    }, [username, logged_in_user])

    const chat_socket = useRef<WebSocket|null>(null) // Stores The Chat Socket Reference

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
                // markMessagesAsRead() // Marks Messages As Read
    
                console.log("WebSocket pripojený")
            }
    
            // Response From The Server (The DOM Changes Will Be Visible To Every User In Chat)
            chat_socket.current.onmessage = (event) => {
                const data = JSON.parse(event.data) // Gets The Data

                // {
                //     "action": "new",
                //     "chat_id": 110,
                //     "message": "a",
                //     "formatted_time": "now",
                //     "sender_id": 16,
                //     "sender_profile_picture_name": "IMG-75a2ff770861da3a10d9.jpeg"
                // }

                // New Message
                if(data.action === "new") {
                    const chat_id:number = data.chat_id as number // Gets The Chat ID
                    const message_content:string = data.message as string // Gets The Message Content
                    const formatted_time:string = data.formatted_time as string // Gets The Formatted Time
                    const sender_id:number = data.sender_id as number // Gets The Sender's ID
                    const sender_profile_picture_name:string = data.sender_profile_picture_name as string // Gets The Sender's Profile Picture Name

                    console.log(data)

                    const new_chat:Chat = {
                        id: chat_id,

                        sender: {
                            id: sender_id,
                            profile_picture_name: sender_profile_picture_name,
                            subscription: null
                        },

                        content: message_content,
                        is_read: false,
                        is_edited: false,
                        formatted_time: formatted_time,
                        is_sender: logged_in_user && logged_in_user.id === sender_id || false,
                        message_reactions: [],
                        is_older_than_15_minutes: false,
                        is_older_than_1_day: false
                    }

                    setChats(previous_chats => [new_chat, ...(previous_chats || [])]) // Sets The Chats

                    //     // Auto Scrolls To The Bottom
                    //     all_messages.scrollTo({
                    //         top: all_messages.scrollHeight,
                    //         behavior: "smooth"
                    //     })
                
                    //     // If Message Isn't From Logged In User
                    //     if(logged_in_user_id && logged_in_user_id !== data.sender_id) {
                    //         markMessagesAsRead() // Marks Messages As Read
                    //     }
                    // }
                }

                // Edited Message
                if(data.action === "edit") {
                    const chat_id:number = data.chat_id as number // Gets The Chat ID
                    const message_content:string = data.message as string // Gets The Message Content

                    // Sets The Chats
                    setChats(previous_chats => (previous_chats || []).map((one_chat:Chat) => {
                        if(one_chat.id === chat_id) {
                            // Updates The Post Likes Amount And Stored Likes From Users
                            return {
                                ...one_chat,
                                content: message_content,
                                is_edited: true
                            }
                        }

                        return one_chat // Returns The Unchanged Post
                    }))

                    cancelEditMessage() // Cancels The Edit Message
                }

                // // Delete Message
                // else if(data.action === "delete") {
                //     const chat_id:number = data.chat_id as number // Gets The Chat ID

                //     const deleted_message:HTMLDivElement|null = [...all_messages.querySelectorAll<HTMLDivElement>(".one_message")].find((one_message) => one_message.dataset["chat_id"] === String(chat_id)) || null // Gets The Edited Message Container

                //     if(deleted_message) deleted_message.classList.add("deleted") // Adds The Deleted Class
                // }

                // // Add Message Reaction
                // else if(data.action === "add_reaction") {
                //     const chat_id:number = data.chat_id as number // Gets The Chat ID
                //     const emoji:string = data.emoji as string // Gets The Emoji
                //     const emoji_sender_username:string = data.emoji_sender_username as string // Gets The Sender's Username 

                //     const one_message:HTMLDivElement|null = [...all_messages.querySelectorAll<HTMLDivElement>(".one_message")].find((one_message) => one_message.dataset["chat_id"] === String(chat_id)) || null // Gets The One Message Container

                //     if(one_message) {
                //         const reactions:HTMLDivElement = one_message.querySelector(".reactions") as HTMLDivElement // Gets The Reactions Container
                //         const is_existing_reaction:boolean = [...reactions.querySelectorAll<HTMLDivElement>(".one_reaction")].some(one_reaction => one_reaction.textContent.trim() === emoji) // Checks If The Reaction Has Been Already Added
            
                //         // Removes The Reaction
                //         if(is_existing_reaction) {
                //             const reaction_to_remove:HTMLDivElement|null = [...reactions.querySelectorAll<HTMLDivElement>(".one_reaction")].find(one_reaction => one_reaction.textContent.trim() === emoji) || null // Gets The Reaction To Remove
            
                //             if(reaction_to_remove) reaction_to_remove.remove() // Removes The Reaction From The DOM
                //         }
            
                //         // Adds The Reaction
                //         else {
                //             const one_reaction:HTMLDivElement = document.createElement("div") // Creates The One Reaction Container
                //             one_reaction.classList.add("one_reaction") // Adds The One Reaction Class
                //             one_reaction.title = interpolate(gettext("Reakciu pridal: %s"), [emoji_sender_username])
                //             one_reaction.ariaLabel = interpolate(gettext("Reakciu pridal: %s"), [emoji_sender_username])
                //             one_reaction.textContent = emoji // Sets The Emoji
                            
                //             if(reactions.children.length >= 3) {
                //                 (reactions.firstElementChild as HTMLDivElement).remove() // Removes The Last Reaction From The DOM
                //             }
            
                //             reactions.appendChild(one_reaction) // Appends The One Reaction Container To The Reactions Container
                //         }
                //     }
                // }

                // // Remove Message Reaction
                // else if(data.action === "remove_reaction") {
                //     const chat_id:number = data.chat_id as number // Gets The Chat ID
                //     const emoji:string = data.emoji as string // Gets The Emoji

                //     const one_message:HTMLDivElement|null = [...all_messages.querySelectorAll<HTMLDivElement>(".one_message")].find((one_message) => one_message.dataset["chat_id"] === String(chat_id)) || null // Gets The One Message Container

                //     if(one_message) {
                //         const reactions:HTMLDivElement = one_message.querySelector(".reactions") as HTMLDivElement // Gets The Reactions Container
                //         const reaction_to_remove:HTMLDivElement|null = [...reactions.querySelectorAll<HTMLDivElement>(".one_reaction")].find(one_reaction => one_reaction.textContent.trim() === emoji) || null // Gets The Reaction To Remove

                //         if(reaction_to_remove) reaction_to_remove.remove() // Removes The Reaction From The DOM
                //     }
                // }
    
                console.log("Prijaté dáta zo socketu:", data)
            }
    
            // Interrupted Connection
            chat_socket.current.onclose = () => {
                Alert.alert("Chyba", "Spojenie sa neočakávane prerušilo.") // Shows The Alert
    
                console.log("Spojenie sa neočakávane prerušilo.")
            }
    
            chat_socket.current.onerror = (error) => {
                Alert.alert("Chyba", "Pri pokuse o spojenie došlo k chybe.") // Shows The Alert
    
                console.error("WebSocket chyba:", error)
            }
        }

        if(username) initializeWebSocket() // Initializes The Web Socket

        return () => {
            if(chat_socket.current) chat_socket.current.close() // Closes The Socket
        }
    }, [username])

    // Function For Mark Messages As Read
    const markMessagesAsRead = ():void => {
        if(chat_socket.current && chat_socket.current.readyState === WebSocket.OPEN) {
            // Sends The Action
            chat_socket.current.send(JSON.stringify({
                "action": "mark_as_read"
            }))
        }

        else {
            console.warn("Web Socket nie je otvorený.")
        }
    }

    // Function For Send The Message
    const sendMessage = ():void => {
        if(chat_socket.current && chat_socket.current.readyState === WebSocket.OPEN) {
            if(new_message.trim() !== "") {
                // New Message
                if(write_message_action === "new") {
                    // Sends The New Message
                    chat_socket.current.send(JSON.stringify({
                        "action": write_message_action,
                        "message": new_message
                    }))
                }

                // Edit Message
                else if(write_message_action === "edit" && selected_message_for_edit) {
                    // Sends The Edited Message
                    chat_socket.current.send(JSON.stringify({
                        "action": write_message_action,
                        "chat_id": selected_message_for_edit.id,
                        "message": new_message
                    }))
                }

                setNewMessage("") // Sets The New Message
            }
        }

        else {
            console.warn("Web Socket nie je otvorený.")
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
                    "action": "delete",
                    "chat_id": selected_message.id,
                }))
            }
        }

        else {
            console.warn("Web Socket nie je otvorený.")
        }
    }

    // Function For Add The Reaction
    const addReaction = (emoji:string):void => {
        hideMessageProperties() // Closes The Message Properties

        if(chat_socket.current && chat_socket.current.readyState === WebSocket.OPEN) {
            if(selected_message) {
                chat_socket.current.send(
                    JSON.stringify({
                        action: "add_reaction",
                        chat_id: selected_message.id,
                        emoji: emoji
                    })
                )
            }
        } 
        
        else {
            console.warn("Web Socket nie je otvorený.")
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

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
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
                            <BottomSheetModalProvider>
                                <View className="chat" style={styles.chat}>
                                    <View style={styles.circle_decoration_before} />
                                    <View style={styles.circle_decoration_after} />

                                    <View className="top" style={styles.top}>
                                        <View className="receiver" style={styles.receiver}>
                                            <ProfilePictureLink 
                                                user_id={receiver.id} 
                                                user_profile_picture_name={receiver.profile_picture_name || null} 
                                                user_subscription={receiver.subscription?.is_active || false} 
                                                label="Zobraziť užívateľa" 
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
                                            className="all_messages" 
                                            keyboardShouldPersistTaps="handled" 
                                            keyboardDismissMode="on-drag"
                                            style={styles.all_messages}
                                            contentContainerStyle={styles.all_messages}
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
                                                                    one_chat.sender.profile_picture_name ? { uri: `${DOMAIN}/media/images/${one_chat.sender.id}/${one_chat.sender.profile_picture_name}` } : { uri: `${DOMAIN}/static/images/profile_picture.png`} // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                                                                }

                                                                style={[
                                                                    styles.profile_picture,
                                                                    one_chat.sender.subscription && one_chat.sender.subscription.is_active && styles.subscriber_profile_picture,
                                                                    // { transform: [{ scale: animated_scale }] }
                                                                ]}
                                                            />
                                                        </View>

                                                        <Text style={{ color: SECONDARY_COLOR }}>{one_chat.content}</Text>

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
                                                                <View 
                                                                    key={index}
                                                                    className="one_reaction" 
                                                                    accessibilityLabel={`Reakciu pridal: ${one_reaction.user.username}`}
                                                                    // style={styles.one_reaction}
                                                                >

                                                                </View>
                                                            ))}
                                                        </View>

                                                        <View 
                                                            className="show_message_properties_button"
                                                            accessibilityLabel="Viac..." 
                                                            
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
                                                        {one_chat.is_edited && (" (upravené)")}
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
                                                placeholder={write_message_action === "new" ? "Napísať správu" : "Upraviť správu"} 
                                                placeholderTextColor={LIGHT_BLUE_COLOR}
                                                accessibilityLabel={write_message_action === "new" ? "Napísať správu" : "Upraviť správu"}
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
                                                    <ProfilePictureLink user_id={logged_in_user.id} user_profile_picture_name={logged_in_user.profile_picture_name || null} user_subscription={logged_in_user.subscription?.is_active || false} label="Môj účet" />
                                                </View>
                                            )}

                                            <View 
                                                className="add_emoji"
                                                accessibilityLabel="Pridať emoji"
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
                                                    smileys_emotion: "Smajlíky",
                                                    people_body: "Ľudia", 
                                                    recently_used: "Naposledy použité",
                                                    animals_nature: "Zvieratá",
                                                    food_drink: "Jedlo a nápoje",
                                                    activities: "Aktivity",
                                                    travel_places: "Cestovanie",
                                                    objects: "Predmety",
                                                    symbols: "Symboly",
                                                    flags: "Vlajky",
                                                    search: "Hľadať...",
                                                }}
                                            />

                                            <Pressable 
                                                className="send" 
                                                accessibilityLabel="Odoslať správu"
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

                                                                <Text style={styles.sheet_text}>Reakcia</Text>
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

                                                                    <Text style={styles.sheet_text}>Upraviť</Text>
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

                                                                    <Text style={styles.sheet_text}>Vymazať</Text>
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

                                                                <Text style={styles.sheet_text}>Zavrieť</Text>
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

                                                                <Text style={styles.sheet_text}>Zavrieť</Text>
                                                            </Pressable>
                                                        </View>
                                                    )}
                                                </View>
                                            ) : null}
                                        </BottomSheetView>
                                    </BottomSheetModal>
                                </View>
                            </BottomSheetModalProvider>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </BackgroundContainer>
        </GestureHandlerRootView>
    )
}

const styles = StyleSheet.create({
    safe_area: {
        flex: 1,
    },
  
    content: {
        flex: 1,
    },

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
    },

    all_messages: {
        // @include scrollbar;
        flexDirection: "column-reverse",
        gap: 50,
        maxHeight: 400,
        paddingTop: 12 + 5,
        paddingBottom: 12 + 5,
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

    time_label: {
        color: LIGHT_BLUE_COLOR,
        fontSize: 15,
    },

    profile_picture_container: {
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
        paddingLeft: 38 + 6 + 10 + 15 + 10,
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