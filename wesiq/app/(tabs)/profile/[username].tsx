import { View, Text, StyleSheet, ScrollView, Image, Alert, Pressable } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useMemo, useRef, useState } from "react"
import Banner from "@/components/Banner"
import LoginFormDialog from "@/components/LoginFormDialog"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import Icon from "@/components/Icon"
import { useLocalSearchParams } from "expo-router"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { API_URL, DOMAIN } from "@/constants/general"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, RED_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"

interface ProfileResponse {
    success:boolean,
    is_found:boolean,
    user?:Profile,
    message:string
}

interface Profile {
    id:number,
    first_name:string,
    last_name:string,
    username:string,
    email_address:string|null,
    phone_number:string|null,
    role:string,
    profile_picture_name:string,
    creation_time:string,
    friend_code:string,
    bio:string,
    xp:number,
    activity_streak:number,
    max_activity_streak:number,
    private_account:boolean,
    data_saving_mode:boolean|null,

    followers:{
        from_user:{
            first_name:string,
            last_name:string,
            username:string,
            profile_picture_name:string|null,
            private_account:boolean
        },

        status:string,
        created_at:string
    }[],

    following:{
        from_user:{
            first_name:string,
            last_name:string,
            username:string,
            profile_picture_name:string|null,
            private_account:boolean
        },

        status:string,
        created_at:string
    }[],

    has_follow:boolean|null,
    has_pending_follow_request:boolean|null,

    posts:{
        id:number,
        public_visibility:boolean,
        allow_comments:boolean,
        hide_likes:boolean,
        created_at:string,

        media:{
            id:number,
            file:string,
            thumbnail:string|null,
            is_video:boolean,
            is_muted:boolean
        }[]
    }[],

    saved_posts:{
        id:number,
        public_visibility:boolean,
        allow_comments:boolean,
        hide_likes:boolean,
        created_at:string,

        media:{
            id:number,
            file:string,
            thumbnail:string|null,
            is_video:boolean,
            is_muted:boolean
        }[]
    }[]|null,

    unread_messages_amount:number|null,

    subscription:{
        plan:string,
        is_active:boolean
    }|null
}

export default function ProfileScreen() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [profile, setProfile] = useState<Profile|null>(null) // Stores The Profile

    const account_properties = useRef<BottomSheetModal>(null) // Stores The Account Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [account_properties_sheet, setAccountPropertiesSheet] = useState<"main"|"report"|"suspend"|"delete">("main") // Stores The Active Account Properties Sheet

    const { username } = useLocalSearchParams<{ username:string }>() // Gets The Username

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

    // Function For Get The Profile
    const getProfile = async (username:string):Promise<void> => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const profile_response:Response = await fetch(`${API_URL}/get-profile/${username}/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!profile_response.ok) {
                Alert.alert("Chyba", "Pri získavaní profilu užívateľa došlo k chybe.") // Shows The Alert
                return
            }

            const profile_data:ProfileResponse = await profile_response.json() // Gets The Profile Data

            // If The Response Isn't Success
            if(!profile_data.success) {
                Alert.alert("Chyba", profile_data.message) // Shows The Alert
                return
            }
            
            else {
                console.log(profile_data)
                setProfile(profile_data.user || null) // Sets The Profile
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri získavaní profilu užívateľa došlo k chybe.") // Shows The Alert
        }
    }
    
    // Initializes The Load Of The Profile
    useEffect(() => {
        if(username) getProfile(username) // Gets The Profile
    }, [username])

    // Function For Show The Account Properties
    const showAccountProperties = ():void => {
        account_properties.current?.present() // Shows The Account Properties
    }

    // Function For Close The Account Properties
    const hideAccountProperties = ():void => {
        account_properties.current?.dismiss() // Hides The Account Properties
    }

    // Function For Handle Account Properties Sheet Switching
    const handleAccountPropertiesChanges = (index:number) => {
        if(index === -1) setAccountPropertiesSheet("main") // Sets The Account Properties Sheet To Default
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
                        <BottomSheetModalProvider>
                            <View className="profile_page">
                                <View className="profile_container">
                                    <View className="options_container">
                                        <View className="back" accessibilityLabel="Späť na úvodnú stránku">
                                            <Icon
                                                icon_name="chevron-left"
                                                // onPress={}
                                                size={30}
                                                pressed_style={{ transform: [{ scale: 1.1 }] }}
                                            />
                                        </View>

                                        {logged_in_user && profile && logged_in_user.id === profile.id && (
                                            <View className="toggle_settings" accessibilityLabel="">
                                                <Icon
                                                    icon_name="gear"
                                                    // onPress={}
                                                    size={30}
                                                    pressed_style={{ transform: [{ scale: 1.1 }] }}
                                                />
                                            </View>
                                        )}

                                        {(!logged_in_user || !profile || logged_in_user.id !== profile.id) && (
                                            <>
                                                <View className="show_account_properties_button" accessibilityLabel="Viac...">
                                                    <Icon
                                                        icon_name="ellipsis-vertical"
                                                        onPress={showAccountProperties}
                                                    />
                                                </View>
                                                
                                                <BottomSheetModal
                                                    ref={account_properties}
                                                    snapPoints={snap_points}
                                                    enablePanDownToClose={true}
                                                    onChange={handleAccountPropertiesChanges}
                                                    containerStyle={{ zIndex: 9999 }}
                                                >
                                                    <BottomSheetView style={{ padding: 20 }}>
                                                        <View className="account_properties">
                                                            {account_properties_sheet === "main" && (
                                                                <View style={styles.sheet_container}>
                                                                    {/* If The Logged In User Is Developer Or Admin The Suspend Option Will Be Shown */}
                                                                    {logged_in_user && (logged_in_user.role === "developer" || logged_in_user.role === "admin") && (
                                                                        <Pressable
                                                                            className="show_suspend_account_button red"
                                                                            onPress={() => setAccountPropertiesSheet("suspend")}
                                                                            accessibilityRole="button"

                                                                            style={({ pressed }) => [
                                                                                styles.sheet_item, 
                                                                                styles.sheet_item_border, 
                                                                                pressed && styles.sheet_item_pressed
                                                                            ]}
                                                                        >
                                                                            <View style={styles.sheet_icon}>
                                                                                <FontAwesome6
                                                                                    name="flag"
                                                                                    size={20}
                                                                                    color={BLUE_COLOR}
                                                                                />
                                                                            </View>

                                                                            <Text 
                                                                                style={[
                                                                                    styles.sheet_text,
                                                                                    // Shows The Red Text If The Logged In User Is Developer Or Admin
                                                                                    { color: logged_in_user && (logged_in_user.role === "developer" || logged_in_user.role === "admin") ? RED_COLOR : BLUE_COLOR }
                                                                                ]}
                                                                            >
                                                                                Obmedziť
                                                                            </Text>
                                                                        </Pressable>
                                                                    )}

                                                                    <Pressable
                                                                        className="show_report_profile_button"
                                                                        onPress={() => setAccountPropertiesSheet("report")}
                                                                        accessibilityRole="button"

                                                                        style={({ pressed }) => [
                                                                            styles.sheet_item, 
                                                                            styles.sheet_item_border, 
                                                                            pressed && styles.sheet_item_pressed
                                                                        ]}
                                                                    >
                                                                        <View style={styles.sheet_icon}>
                                                                            <FontAwesome6
                                                                                name="flag"
                                                                                size={20}
                                                                                solid={false}
                                                                                color={BLUE_COLOR}
                                                                            />
                                                                        </View>

                                                                        <Text style={styles.sheet_text}>Nahlásiť</Text>
                                                                    </Pressable>

                                                                    <Pressable
                                                                        className="hide_account_properties_button"
                                                                        onPress={hideAccountProperties}
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

                                                            {account_properties_sheet === "suspend" && (
                                                                <View className="suspend_account" style={styles.sheet_container}>
                                                                    <Text 
                                                                        style={[
                                                                            styles.sheet_text, 
                                                                            { textAlign: "center" }
                                                                        ]}
                                                                    >
                                                                        Naozaj chcete obmedziť tento účet?
                                                                    </Text>

                                                                    <Pressable
                                                                        // onPress={() => suspendAccount(selected_post.id)}
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

                                                                        <Text style={styles.sheet_text}>Obmedziť</Text>
                                                                    </Pressable>

                                                                    <Pressable
                                                                        className="back_suspend_account_button"
                                                                        onPress={() => setAccountPropertiesSheet("main")}
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

                                                            {account_properties_sheet === "report" && (
                                                                <View className="report report_profile" style={styles.sheet_container}>
                                                                    <Pressable
                                                                        // onPress={() => reportAccount(selected_post.id, "spam")}
                                                                        accessibilityRole="button"
                            
                                                                        style={({ pressed }) => [
                                                                            styles.sheet_item, 
                                                                            styles.sheet_item_border, 
                                                                            pressed && styles.sheet_item_pressed
                                                                        ]}
                                                                    >
                                                                        <View style={styles.sheet_icon}>
                                                                            <FontAwesome6
                                                                                name="list"
                                                                                size={20}
                                                                                color={BLUE_COLOR}
                                                                            />
                                                                        </View>
                            
                                                                        <Text style={styles.sheet_text}>Spam</Text>
                                                                    </Pressable>
                            
                                                                    <Pressable
                                                                        // onPress={() => reportAccount(selected_post.id, "harassment")}
                                                                        accessibilityRole="button"
                            
                                                                        style={({ pressed }) => [
                                                                            styles.sheet_item, 
                                                                            styles.sheet_item_border, 
                                                                            pressed && styles.sheet_item_pressed
                                                                        ]}
                                                                    >
                                                                        <View style={styles.sheet_icon}>
                                                                            <FontAwesome6
                                                                                name="list"
                                                                                size={20}
                                                                                color={BLUE_COLOR}
                                                                            />
                                                                        </View>
                            
                                                                        <Text style={styles.sheet_text}>Obťažovanie</Text>
                                                                    </Pressable>
                            
                                                                    <Pressable
                                                                        // onPress={() => reportAccount(selected_post.id, "hate_speech")}
                                                                        accessibilityRole="button"
                            
                                                                        style={({ pressed }) => [
                                                                            styles.sheet_item, 
                                                                            styles.sheet_item_border, 
                                                                            pressed && styles.sheet_item_pressed
                                                                        ]}
                                                                    >
                                                                        <View style={styles.sheet_icon}>
                                                                            <FontAwesome6
                                                                                name="list"
                                                                                size={20}
                                                                                color={BLUE_COLOR}
                                                                            />
                                                                        </View>
                            
                                                                        <Text style={styles.sheet_text}>Nenávistné prejavy</Text>
                                                                    </Pressable>
                            
                                                                    <Pressable
                                                                        // onPress={() => reportAccount(selected_post.id, "misinformation")}
                                                                        accessibilityRole="button"
                            
                                                                        style={({ pressed }) => [
                                                                            styles.sheet_item, 
                                                                            styles.sheet_item_border, 
                                                                            pressed && styles.sheet_item_pressed
                                                                        ]}
                                                                    >
                                                                        <View style={styles.sheet_icon}>
                                                                            <FontAwesome6
                                                                                name="list"
                                                                                size={20}
                                                                                color={BLUE_COLOR}
                                                                            />
                                                                        </View>
                            
                                                                        <Text style={styles.sheet_text}>Dezinformácie</Text>
                                                                    </Pressable>
                            
                                                                    <Pressable
                                                                        // onPress={() => reportAccount(selected_post.id, "explicit_content")}
                                                                        accessibilityRole="button"
                            
                                                                        style={({ pressed }) => [
                                                                            styles.sheet_item, 
                                                                            styles.sheet_item_border, 
                                                                            pressed && styles.sheet_item_pressed
                                                                        ]}
                                                                    >
                                                                        <View style={styles.sheet_icon}>
                                                                            <FontAwesome6
                                                                                name="list"
                                                                                size={20}
                                                                                color={BLUE_COLOR}
                                                                            />
                                                                        </View>
                            
                                                                        <Text style={styles.sheet_text}>Explicitný obsah</Text>
                                                                    </Pressable>
                            
                                                                    <Pressable
                                                                        // onPress={() => reportAccount(selected_post.id, "other")}
                                                                        accessibilityRole="button"
                            
                                                                        style={({ pressed }) => [
                                                                            styles.sheet_item, 
                                                                            styles.sheet_item_border, 
                                                                            pressed && styles.sheet_item_pressed
                                                                        ]}
                                                                    >
                                                                        <View style={styles.sheet_icon}>
                                                                            <FontAwesome6
                                                                                name="list"
                                                                                size={20}
                                                                                color={BLUE_COLOR}
                                                                            />
                                                                        </View>
                            
                                                                        <Text style={styles.sheet_text}>Iné</Text>
                                                                    </Pressable>
                            
                                                                    <Pressable
                                                                        className="back_report_profile_button"
                                                                        onPress={() => setAccountPropertiesSheet("main")}
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
                            
                                                                        <Text style={styles.sheet_text}>Späť</Text>
                                                                    </Pressable>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </BottomSheetView>
                                                </BottomSheetModal>
                                            </>
                                        )}
                                    </View>

                                    <View className="profile_content">
                                        {logged_in_user && profile && logged_in_user.id === profile.id && (
                                            <View className="edit_account_form hidden">
                                                <View className="header">
                                                    <View className="info">
                                                        <Pressable 
                                                            className="profile_picture_container"
                                                            // onPress={}
                                                            accessibilityLabel="Nahrať obrázok"
                                                            style={styles.profile_picture_container}
                                                        >
                                                            {/* <Image 
                                                                className={`profile_picture skeleton_loading ${
                                                                    logged_in_user.subscription && logged_in_user.subscription.is_active ? "subscriber" : "" // Adds The Subscriber Class
                                                                }`}

                                                                source={
                                                                    logged_in_user.profile_picture_name ? { uri: `${DOMAIN}/media/images/${logged_in_user.id}/${logged_in_user.profile_picture_name}` } : require("../assets/images/profile_picture.png") // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                                                                }

                                                                style={[
                                                                    styles.profile_picture,
                                                                    logged_in_user.subscription && logged_in_user.subscription.is_active && styles.subscriber_profile_picture,
                                                                    // { transform: [{ scale: animated_scale }] }
                                                                ]}
                                                            /> */}
                                                        </Pressable>

                                                        <Text className="username">{logged_in_user.username}</Text>
                                                    </View>
                                                </View>

                                                <Text className="friend_code">Friend Code - <Text>{logged_in_user.friend_code}</Text></Text>

                                                <View className="bio_container">
                                                    
                                                </View>

                                                {/* <p class="friend_code">Friend Code - <span>{{ logged_in_user.friend_code }}</span></p>

                                                <div class="bio_container">
                                                    {{ edit_account_form.bio }}

                                                    <input class="bio_links" type="hidden" name="bio_links" value="[]">
                                    
                                                    <div class="icons">
                                                        <button 
                                                            class="show_add_link_form_button" 
                                                            type="button"
                                                            popovertarget="add_link_form"
                                                            style="anchor-name: --show_add_link_form_button;"
                                                            title="{% translate 'Pridať odkaz' %}"
                                                            aria-label="{% translate 'Pridať odkaz' %}"
                                                        >
                                                            <i class="fa-solid fa-link"></i> <!-- https://fontawesome.com/icons/link -->
                                                        </button>

                                                        <div 
                                                            class="add_link_form" 
                                                            id="add_link_form"
                                                            popover
                                                            style="position-anchor: --show_add_link_form_button;"
                                                        >
                                                            <div class="form">
                                                                <input class="url" type="text" placeholder="https://example.com">
                                                                <button class="add_link" type="button"><i class="fa-solid fa-plus"></i></button> <!-- https://fontawesome.com/icons/plus -->
                                                            </div>

                                                            <button 
                                                                class="hide_add_link_form_button" 
                                                                type="button"
                                                                popovertarget="add_link_form"
                                                                popovertargetaction="hide"
                                                            >
                                                                <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                                                                <span>{% translate "Zavrieť" %}</span>
                                                            </button>
                                                        </div>

                                                        <button class="add_emoji" type="button" title="{% translate 'Pridať emoji' %}" aria-label="{% translate 'Pridať emoji' %}">
                                                            <i class="fa-regular fa-face-surprise"></i> <!-- https://fontawesome.com/icons/face-surprise -->
                                                        </button>
                                                    </div> */}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </BottomSheetModalProvider>
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

    profile_picture_container: {
        padding: 2,
        borderWidth: 1,
        borderColor: LIGHT_BLUE_COLOR,
        borderRadius: 100,
    },

    profile_picture: {
        borderRadius: 100,
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