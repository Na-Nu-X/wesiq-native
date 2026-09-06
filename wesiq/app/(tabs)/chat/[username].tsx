import { View, Text, StyleSheet, ScrollView, Image, Pressable, Alert } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useState } from "react"
import Banner from "@/components/Banner"
import LoginFormDialog from "@/components/LoginFormDialog"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import ProfilePictureLink from "@/components/ProfilePictureLink"
import { API_URL, DOMAIN } from "@/constants/general"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { TextInput } from "react-native"
import EmojiPicker from "rn-emoji-keyboard"
import { BIG_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import Svg, { Path } from "react-native-svg"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useLocalSearchParams } from "expo-router"

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
    message_reactions:MessageReaction[]
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
                console.log(loaded_chat_data)
                setReceiver(loaded_chat_data.receiver)
                setChats(loaded_chat_data.chats)
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

    // Function For Handle The Emoji Select
    const handleEmojiSelect = (emoji:{ emoji:string }) => {
        if(new_message.length >= MAX_MESSAGE_LENGTH) return
        setNewMessage((previous_message) => previous_message + emoji.emoji) // Sets The New Message
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
                            <View className="chat">
                                <View className="top">
                                    <View className="receiver">
                                        <ProfilePictureLink 
                                            user_id={receiver.id} 
                                            user_profile_picture_name={receiver.profile_picture_name || null} 
                                            user_subscription={receiver.subscription?.is_active || false} 
                                            label="Zobraziť užívateľa" 
                                        />

                                        <View className="name">
                                            <Text className="username">{receiver.username}</Text>

                                            {receiver.first_name && receiver.last_name && (
                                                <Text className="full_name">{`${receiver.first_name} ${receiver.last_name}`}</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                <View className="middle">
                                    <View className="all_messages">
                                        {chats.map((one_chat:Chat, index:number) => (
                                            <View 
                                                key={one_chat.id || index}
                                                className={one_chat.is_sender ? "one_message sender" : "one_message receiver"}

                                                // data-time="
                                                //     {{ one_chat.formatted_time }}

                                                //     {% if one_chat.is_edited %}
                                                //         {% translate '(upravené)' %}
                                                    
                                                //     {% endif %}
                                                // "
                                            >
                                                <Image 
                                                    className={`profile_picture ${
                                                        one_chat.sender.subscription && one_chat.sender.subscription.is_active ? "subscriber" : "" // Adds The Subscriber Class
                                                    }`}

                                                    source={
                                                        one_chat.sender.profile_picture_name ? { uri: `${DOMAIN}/media/images/${one_chat.sender.id}/${one_chat.sender.profile_picture_name}` } : { uri: `${DOMAIN}/static/images/profile_picture.png`} // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                                                    }

                                                    // style={[
                                                    //     styles.profile_picture,
                                                    //     one_chat.sender.subscription && one_chat.sender.subscription.is_active && styles.subscriber_profile_picture,
                                                    //     // { transform: [{ scale: animated_scale }] }
                                                    // ]}
                                                />

                                                <Text>{one_chat.content}</Text>

                                                {one_chat.is_sender && one_chat.is_read && (
                                                    <FontAwesome6
                                                        name="check-double"
                                                        size={20}
                                                        color={BLUE_COLOR}
                                                    />
                                                )}

                                                <View className="reactions">
                                                    {one_chat.message_reactions.map((one_reaction:MessageReaction, index:number) => (
                                                        <View className="one_reaction" accessibilityLabel={`Reakciu pridal: ${one_reaction.user.username}`}>

                                                        </View>
                                                    ))}
                                                </View>

                                                {/* <button 
                                                    class="show_message_properties_button" 
                                                    popovertarget="message_properties_{{ one_chat.id }}"
                                                    style="anchor-name: --show_message_properties_button_{{ one_chat.id }};"
                                                    title="{% translate 'Viac...' %}"
                                                    aria-label="{% translate 'Viac...' %}"
                                                >
                                                    <i class="fa-solid fa-ellipsis-vertical"></i> <!-- https://fontawesome.com/icons/ellipsis-vertical -->
                                                </button>

                                                <div 
                                                    class="message_properties" 
                                                    id="message_properties_{{ one_chat.id }}"
                                                    popover
                                                    style="position-anchor: --show_message_properties_button_{{ one_chat.id }};"
                                                >
                                                    <button 
                                                        class="add_reaction_button"
                                                        popovertarget="add_reaction_{{ one_chat.id }}" 
                                                        style="anchor-name: --add_reaction_button_{{ one_chat.id }};"
                                                    >
                                                        <i class="fa-regular fa-face-surprise"></i> <!-- https://fontawesome.com/icons/face-surprise -->
                                                        <span>{% translate "Reakcia" %}</span>
                                                    </button>

                                                    <div 
                                                        class="add_reaction" 
                                                        id="add_reaction_{{ one_chat.id }}"
                                                        popover
                                                        style="position-anchor: --add_reaction_button_{{ one_chat.id }};"
                                                    >
                                                        <button data-hex_code="0x1F600">
                                                            <span>&#128512;</span>
                                                        </button>
                                                        
                                                        <button data-hex_code="0x1F602">
                                                            <span>&#128514;</span>
                                                        </button>
                                                        
                                                        <button data-hex_code="0x1F923">
                                                            <span>&#129315;</span>
                                                        </button>
                                                        
                                                        <button data-hex_code="0x1F92F">
                                                            <span>&#129327;</span>
                                                        </button>
                                                        
                                                        <button data-hex_code="0x1F60D">
                                                            <span>&#128525;</span>
                                                        </button>
                                                        
                                                        <button data-hex_code="0x1F44D">
                                                            <span>&#128077;</span>
                                                        </button>
                                                        
                                                        <button data-hex_code="0x1F44E">
                                                            <span>&#128078;</span>
                                                        </button>
                                                        
                                                        <button data-hex_code="0x1F4AA">
                                                            <span>&#128170;</span>
                                                        </button>
                                                        
                                                        <button data-hex_code="0x1F64C">
                                                            <span>&#128588;</span>
                                                        </button>
                                                        
                                                        <button data-hex_code="0x1F44F">
                                                            <span>&#128079;</span>
                                                        </button>

                                                        <button data-hex_code="0x1F91D">
                                                            <span>&#129309;</span>
                                                        </button>

                                                        <button data-hex_code="0x1F64F">
                                                            <span>&#128591;</span>
                                                        </button>
                                                    </div>

                                                    {% if one_chat.is_sender and not one_chat.is_older_than_15_minutes %}
                                                        <button 
                                                            class="edit_message_button"
                                                            popovertarget="message_properties_{{ one_chat.id }}" 
                                                            popovertargetaction="hide"
                                                        >
                                                            <i class="fa-solid fa-pen"></i> <!-- https://fontawesome.com/icons/pen -->
                                                            <span>{% translate "Upraviť" %}</span>
                                                        </button>
                                                    
                                                    {% endif %}

                                                    {% if one_chat.is_sender and not one_chat.is_older_than_1_day %}
                                                        <button class="delete_message_button">
                                                            <i class="fa-solid fa-eraser"></i> <!-- https://fontawesome.com/icons/eraser -->
                                                            <span>{% translate "Vymazať" %}</span>
                                                        </button>
                                                    
                                                    {% endif %}

                                                    <button 
                                                        class="hide_message_properties_button" 
                                                        popovertarget="message_properties_{{ one_chat.id }}" 
                                                        popovertargetaction="hide"
                                                    >
                                                        <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                                                        <span>{% translate "Zavrieť" %}</span>
                                                    </button>
                                                </div> */}
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <View className="bottom">
                                    <View className="write_message">
                                        <TextInput
                                            className="new_message"
                                            textAlignVertical="top" 
                                            placeholder="Napísať správu" 
                                            placeholderTextColor={LIGHT_BLUE_COLOR}
                                            accessibilityLabel="Napísať správu" 
                                            value={new_message}
                                            onChangeText={setNewMessage}
                                            maxLength={MAX_MESSAGE_LENGTH}

                                            style={[
                                                styles.write_comment_form_comment, 
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
                                            // onPress={() => addComment(one_post.id, comment, null)}
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
                            </View>
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

    write_comment_form: {
        position: "relative",
        marginTop: 8,
    },

    write_comment_form_comment: {
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
})