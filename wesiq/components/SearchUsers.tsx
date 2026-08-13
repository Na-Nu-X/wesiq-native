import React, { useState, useEffect, useRef } from "react"
import { View, StyleSheet, TextInput, Text, Alert, Pressable, Image, ActivityIndicator } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import Icon from "@/components/Icon"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { FontAwesome6 } from "@expo/vector-icons"

interface loadedUser {
    id:number,
    first_name:string,
    last_name:string,
    username:string,
    profile_picture_name:string,
    friend_code:string,
    private_account:boolean,
    followers:number,
    has_follow:boolean,
    has_pending_follow_request:boolean,

    subscription?:{
        is_active:boolean
    }
}

interface firstLoadedUsersResponse {
    success: boolean,
    // logged_in_user_id?:number,
    users:loadedUser[],
    message: string
}

interface searchedUser extends loadedUser {
    
}

interface searchedUsersResponse {
    success:boolean,
    // logged_in_user_id?:number,
    users?:searchedUser[],
    message:string
}

export default function SearchUsers() {
    const [logged_in_user_id, setLoggedInUserID] = useState<number|null>(null) // Stores The Logged In User ID
    const [first_loaded_users, setFirstLoadedUsers] = useState<loadedUser[]>([]) // Stores The First Loaded Users
    const [displayed_users, setDisplayedUsers] = useState<loadedUser[]>(first_loaded_users) // Stores The Displayed Users
    const [loaded_users, setLoadedUsers] = useState<loadedUser[]>([]) // Stores The Loaded Users
    const [searched_users_history, setSearchedUsersHistory] = useState<string[]>([]) // Stores The Searched Users History From The History
    const [searched_text, setSearchedText] = useState<string>("") // Stores The Searched Text
    const [is_loading, setIsLoading] = useState<boolean>(false) // Stores The Information If The Users Are Loading

    const search_users_timeout = useRef<ReturnType<typeof setTimeout>|null>(null) // Stores The Search Users Timeout

    // Loads The Searched Users From The History
    useEffect(() => {
        // Function For Load Searched Users History
        const loadSearchedUsersHistory = async () => {
            try {
                const searched_users_history_json:string|null = await AsyncStorage.getItem("searched_users_history") // Gets The Searched Users History In JSON Format
                if(searched_users_history_json !== null) setSearchedUsersHistory(JSON.parse(searched_users_history_json) as string[]) // Sets The Searched Users History
            }
            
            catch(error) {
                console.error("Pri načítavaní užívateľov došlo k chybe: ", error)
                Alert.alert("Chyba", "Pri načítavaní užívateľov došlo k chybe.")
            }
        }

        loadSearchedUsersHistory() // Loads Searched Users History
    }, [])

    // Loads The First Users
    useEffect(() => {
        // Function For Load First Users
        const loadFirstUsers = async () => {
            try {
                // Sends The POST Request To The Server
                const first_loaded_users_response:Response = await fetch(`${API_URL}/load-first-users/`, {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },

                    body: JSON.stringify(searched_users_history),
                })
        
                const first_loaded_users_data:firstLoadedUsersResponse = await first_loaded_users_response.json() // Gets The Load First Users Data

                // If The Response Isn't Success
                if(!first_loaded_users_data.success) {
                    console.error(first_loaded_users_data.message)
                    // displayMessage(first_loaded_users_response.message, "error") // Displays The Error Message
                    return
                }

                if(first_loaded_users_data.users) {
                    setFirstLoadedUsers(first_loaded_users_data.users) // Sets The First Loaded Users
                    if(searched_text.trim() === "") setDisplayedUsers(first_loaded_users_data.users) // Sets The Displayed Users
                }
            } 
            
            catch {
                console.error("Pri načítavaní užívateľov došlo k chybe.")
                // displayMessage(gettext("Pri načítavaní užívateľov došlo k chybe."), "error") // Displays The Error Message
            }
        }

        loadFirstUsers() // Loads The First Users
    }, [])

    // Function For Save Searched Users History
    const saveSearchedUsersHistory = async (new_history:string[]) => {
        try {
            setSearchedUsersHistory(new_history) // Sets The Searched Users History
            await AsyncStorage.setItem("searched_users_history", JSON.stringify(new_history)) // Sets The Searched Users History
        }
        
        catch(error) {
            console.error("Pri ukladaní histórie užívateľov došlo k chybe: ", error)
            Alert.alert("Chyba", "Pri ukladaní histórie užívateľov došlo k chybe.")
        }
    }

    // Function For Add Searched User To History
    const addSearchedUserToHistory = (username:string) => {
        const new_history:string[] = [username, ...searched_users_history] // Gets The New History
        saveSearchedUsersHistory(new_history) // Saves The Searched Users History
    }

    // Function For Get The Follow Button Properties
    const getFollowButtonProperties = (user:loadedUser) => {
        let action:string = "follow" // Stores The Action
        let text:string = "Začať sledovať" // Stores The Text

        if(!user.has_follow && !user.has_pending_follow_request && !user.private_account) {
            action = "follow"
            text = "Začať sledovať"
        } 
        
        else if(user.has_follow) {
            action = "unfollow"
            text = "Prestať sledovať"
        } 
        
        else if(!user.has_pending_follow_request && user.private_account) {
            action = "send_follow_request"
            text = "Začať sledovať"
        } 
        
        else if(user.has_pending_follow_request) {
            action = "cancel_follow_request"
            text = "Zrušiť žiadosť"
        }

        return { action, text }
    }

    // Function For Create Loaded User HTML
    const createLoadedUserHTML = (one_loaded_user:loadedUser, logged_in_user_id:number|null) => {
        // Gets The Follow Button Properties
        const follow_button_properties:{
            action:string,
            text:string
        } = getFollowButtonProperties(one_loaded_user)

        return (
            <Pressable 
                key={one_loaded_user.id}
                // onPress={handleGoToProfile}
                accessibilityRole="button"
                accessibilityLabel="Zobraziť užívateľa" 
                className="one_user"
                style={styles.one_user}
            >
                <View className="profile_picture_container" style={styles.profile_picture_container}>
                    <Image 
                        className={`profile_picture skeleton_loading ${
                            one_loaded_user.subscription && one_loaded_user.subscription.is_active ? "subscriber" : "" // Adds The Subscriber Class
                        }`}

                        source={
                            one_loaded_user.profile_picture_name ? { uri: `https://wesiq.com/media/images/${one_loaded_user.id}/${one_loaded_user.profile_picture_name}` } : require("../assets/images/profile_picture.png") // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                        }

                        style={[
                            styles.profile_picture,
                            one_loaded_user.subscription && one_loaded_user.subscription.is_active && styles.subscriber_profile_picture,
                            // { transform: [{ scale: animated_scale }] }
                        ]}
                    />
                </View>

                <Text className="username" style={styles.username}>{one_loaded_user.username}</Text>
                <Text className="full_name" style={styles.full_name}>{one_loaded_user.first_name} {one_loaded_user.last_name}</Text>

                <View className="followers_container" accessibilityLabel="Počet sledovateľov..." style={styles.followers_container}>
                    <Text className="followers" style={styles.followers}>{one_loaded_user.followers}</Text>
                    
                    <FontAwesome6
                        name="user"
                        size={20}
                        solid={true}
                        color={BLUE_COLOR}
                    />
                </View>

                {logged_in_user_id && one_loaded_user && logged_in_user_id !== one_loaded_user.id && (
                    <Pressable
                        className="follow_button" 

                        style={[
                            styles.follow_button, 
                            { outlineStyle: "none" } as any
                        ]}
                    >
                        <Text>{follow_button_properties.text}</Text>
                    </Pressable>
                )}
            </Pressable>
        )
    }

    // Function For Get Searched Users
    const getSearchedUsers = async (text:string) => {
        setSearchedText(text) // Sets The Searched Text

        // Shows The First Loaded Users If The Searched Text Is Empty
        if(text.trim() === "") {
            setDisplayedUsers(first_loaded_users) // Sets The Displayed Users
            return
        }

        // Gets Users From The DB If The First Character Is Entered
        if(text.length === 1 && searched_text.length !== 2) {
            setIsLoading(true) // Shows The Loading

            if(search_users_timeout.current) clearTimeout(search_users_timeout.current) // Deletes The Previous Search Users Timeout

            // Gets The Users After 1 Second Of Delay
            search_users_timeout.current = setTimeout(async () => {
                try {
                    // Sends The POST Request To The Server
                    const searched_users_response:Response = await fetch(`${API_URL}/search-users/`, {
                        method: "POST",
        
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                        },
        
                        body: JSON.stringify({searched_text: text}),
                    })
            
                    const searched_users_data:firstLoadedUsersResponse = await searched_users_response.json() // Gets The Searched Users Data

                    if(!searched_users_data.success) {
                        console.log(searched_users_data.message)
                        // displayMessage(searched_users_data.message, "error") // Displays The Error Message
                        return
                    }
        
                    if(searched_users_data.users) {
                        setLoadedUsers(searched_users_data.users) // Sets The Loaded Users
                        setDisplayedUsers(searched_users_data.users) // Sets The Displayed Users
                    }
                } 
                
                catch {
                    console.error("Pri hľadaní užívateľov došlo k chybe.")
                    // displayMessage(gettext("Pri hľadaní užívateľov došlo k chybe."), "error") // Displays The Error Message
                } 
                
                finally {
                    setIsLoading(false) // Hides The Loading
                }
            }, 1000)
        } 

        // Filters Users From Already Obtained Users
        else {
            const filtered_users = loaded_users.filter((one_loaded_user) => {
                // Filters By Full Name, Username And By Friend Code
                const full_name = `${one_loaded_user.first_name} ${one_loaded_user.last_name}`.toLowerCase()
                const username = one_loaded_user.username?.toLowerCase() || ""
                const friend_code = one_loaded_user.friend_code?.toLowerCase() || ""

                return (
                    full_name.includes(text.toLowerCase()) ||
                    username.includes(text.toLowerCase()) ||
                    friend_code.includes(text.toLowerCase())
                )
            })

            setDisplayedUsers(filtered_users) // Sets The Displayed Users
        }
    }
    
    return (
        <View className="search_users" style={styles.search_users}>
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
                    value={searched_text}
                    onChangeText={getSearchedUsers}

                    style={[
                        styles.search_bar, 
                        { outlineStyle: "none" } as any
                    ]}
                />
            </View>

            <View className="search_result_container" style={styles.search_result_container}>
                {is_loading && (
                    <View className="loading" style={styles.loading}>
                        <ActivityIndicator size="small" color={BLUE_COLOR} />
                        <Text>Načítavam...</Text>
                    </View>
                )}

                {!is_loading && (
                    <View className="all_users" style={styles.all_users}>
                        {displayed_users && (
                            displayed_users.map(one_loaded_user => (
                                createLoadedUserHTML(one_loaded_user, null)
                            ))
                        )}
                    </View>
                )}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    search_users: {
        // min-height: calc(100vh - 109px - 20px);
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100%",
        paddingVertical: 20,
        zIndex: 100,
    },

    search_bar_container: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        width: "100%",
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
    
    search_result_container: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        // width: calc(100% + 10px);
        width: "100%",
        maxHeight: 3 * 56 + 24 + 10,
        marginTop: 18,
        marginHorizontal: "auto",
        padding: 5,
        // background: linear-gradient(145deg, transparentize($blue-color, 0.95) 0%, transparentize($main-color, 0.95) 100%);
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    loading: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [
            { translateX: "-50%" }, 
            { translateY: "-50%" }
        ],
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        // background: transparentize($community-surface, 0.3);
        // backdrop-filter: blur(8px);
        borderRadius: MEDIUM_BORDER_RADIUS,
        opacity: 1,
        // transition: opacity 0.3s ease, display 0.3s ease allow-discrete;

        // &.hidden {
        //     opacity: 0;
        //     display: none;
        // }
    },

    all_users: {
        // @include scrollbar;
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: "100%",
        padding: 15,
    },

    one_user: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexShrink: 0,
        width: "100%",
        height: 50,
        paddingHorizontal: 15,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }

        // &.hidden {
        //     transform: translateY(calc(300% + 20px));
        //     display: none;
        // }
    },

    profile_picture_container: {
        padding: 2,
        borderWidth: 1,
        borderColor: LIGHT_BLUE_COLOR,
        borderRadius: 38 / 2,
    },

    profile_picture: {
        width: 32,
        height: 32,
        borderRadius: 38 / 2,
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

    username: {
        // @include crop_text;
        maxWidth: 150,
        fontWeight: 600,
        color: SECONDARY_COLOR,
    },

    full_name: {
        // @include crop_text;
        maxWidth: 150,
        fontStyle: "italic",
        color: BLUE_COLOR,
    },

    followers_container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginLeft: "auto",
    },

    followers: {
        color: BLUE_COLOR,
    },

    follow_button: {
        // @include crop_text;
        width: "auto",
        height: "auto",
        paddingVertical: 5,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     cursor: pointer;
        // }
    },
})