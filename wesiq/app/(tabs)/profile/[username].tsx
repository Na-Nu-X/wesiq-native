import { View, Text, StyleSheet, ScrollView, Image, Alert, Pressable, TextInput } from "react-native"
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
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, RED_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import { AsYouType, isValidPhoneNumber } from "libphonenumber-js"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import { getFollowButtonProperties } from "@/components/SearchUsers"
import IconButton from "@/components/IconButton"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { DynamicImage } from "../../../components/DynamicImage"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"
import type { BasicResponse } from "@/components/Feed"

interface ProfileResponse {
    success:boolean,
    is_found:boolean,
    user?:Profile,
    message:string
}

interface Profile {
    id:number,
    first_name:string|null,
    last_name:string|null,
    username:string,
    email_address:string|null,
    phone_number:string|null,
    role:string,
    profile_picture_name:string,
    creation_time:string,
    friend_code:string,
    bio:string,
    bio_links:BioLink[],
    xp:number,
    activity_streak:number,
    max_activity_streak:number,
    has_already_increased_activity_streak:boolean,
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

    has_follow:boolean,
    has_pending_follow_request:boolean,

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
    }|null,

    total_transactions_amount:number,
    level:number,
    years_since_registration:number,
    total_activities:number,
    total_received_likes:number,
    post_comments:[],
    badges:{ title:string, data:string }[],
}

interface BioLink {
    id:number,
    url:string
}

const BLUE_RARITY = "#3b82f6" // Defines The Blue Rarity Color
const GREEN_RARITY = "#10b981" // Defines The Green Rarity Color
const YELLOW_RARITY = "#f59e0b" // Defines The Yellow Rarity Color
const ORANGE_RARITY = "#fa541c" // Defines The Orange Rarity Color
const RED_RARITY = "#ef4444" // Defines The Red Rarity Color
const PURPLE_RARITY = "#8b5cf6" // Defines The Purple Rarity Color

export default function ProfileScreen() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [is_found, setIsFound] = useState<boolean>(false) // Stores The Information If The User Was Found
    const [profile, setProfile] = useState<Profile|null>(null) // Stores The Profile

    const account_properties = useRef<BottomSheetModal>(null) // Stores The Account Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [account_properties_sheet, setAccountPropertiesSheet] = useState<"main"|"report"|"suspend"|"delete">("main") // Stores The Active Account Properties Sheet

    const [active_section, setActiveSection] = useState<"profile"|"edit_account_form"|null>("profile") // Stores The Information Which Section Is Active

    const { username } = useLocalSearchParams<{ username:string }>() // Gets The Username

    const [bio, setBio] = useState<string>("") // Stores The Bio
    const [bio_links, setBioLinks] = useState<BioLink[]>([]) // Stores The Bio
    const [is_emoji_picker_open, setIsEmojiPickerOpen] = useState(false) // Stores The Information If The Emoji Picker Is Open

    const [first_name, setFirstName] = useState<string>("") // Stores The First Name
    const [last_name, setLastName] = useState<string>("") // Stores The Last Name
    const [email_address, setEmailAddress] = useState<string>("") // Stores The Email Address
    const [phone_number, setPhoneNumber] = useState<string>("") // Stores The Phone Number
    const [is_phone_number_valid, setIsPhoneNumberValid] = useState<boolean>(false) // Stores The Information If The Phone Number Is Valid
    const [flag, setFlag] = useState<string|null>(null) // Stores The Country Flag For The Entered Phone Number
    const [form_report, setFormReport] = useState<string>("") // Stores The Form Report
    const [form_report_appearance, setFormReportAppearance] = useState<"success"|"error">("success") // Stores The Form Report Appearance
    const [is_loading, setIsLoading] = useState<boolean>(false) // Stores The Information If The Loading Is Active

    const [grid_select_active_menu, setGridSelectActiveMenu] = useState<"posts"|"saved_posts">("posts") // Stores The Information If The Loading Is Active

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
                setIsFound(profile_data.is_found || false) // Sets The Information If The User Was Found
                setProfile(profile_data.user || null) // Sets The Profile
                if(profile_data.user && profile_data.user.bio.trim()) setBio(profile_data.user.bio) // Sets The Bio
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

     // Function For Toggle Follow
     const toggleFollow = async (user_to_follow_id:number|null, action:string):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Sledovanie nie je možné zmeniť bez prihlásenia.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const toggle_follow_response:Response = await fetch(`${API_URL}/toggle-follow/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    user_to_follow_id: user_to_follow_id,
                })
            })

            // If The Response Isn't Success
            if(!toggle_follow_response.ok) {
                Alert.alert("Chyba", "Pri zmene sledovania došlo k chybe.") // Shows The Alert
                return
            }

            const toggle_follow_data:BasicResponse = await toggle_follow_response.json() // Gets The Toggle Follow Data

            // If The Response Isn't Success
            if(!toggle_follow_data.success || !profile) {
                Alert.alert("Chyba", toggle_follow_data.message) // Shows The Alert
                return
            }

            else {
                if(profile.id === user_to_follow_id) {
                    // Updates The Has Follow And Has Pending Follow Request
                    setProfile({
                        ...profile,
                        has_follow: action === "follow", 
                        has_pending_follow_request: action === "send_follow_request"
                    })
                }

                Alert.alert("Úspech", toggle_follow_data.message) // Shows The Alert
            }
        }

        catch {
            Alert.alert("Chyba", "Pri zmene sledovania došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Get The Domain
    const getDomain = (url:string):string => {
        try {
            const valid_url:string = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}` // Gets The Valid URL
            const hostname:string = new URL(valid_url).hostname // Gets The Hostname
            return hostname.replace(/^www\./, "") // Returns The Domain
        } 
        
        catch {
            return url
        }
    }

    // Function For Handle The Phone Number Change
    const handlePhoneNumberChange = (text:string):void => {
        const phone_number_formatter:AsYouType = new AsYouType()
        const formatted_phone_number:string = phone_number_formatter.input(text)
        
        setPhoneNumber(formatted_phone_number) // Sets The Phone Number
        setIsPhoneNumberValid(isValidPhoneNumber(formatted_phone_number)) // Sets The Information That The Phone Number Is Valid

        // Language Flag

        if(formatted_phone_number.startsWith("+421")) setFlag(`${DOMAIN}/static/images/sk.png`) // Sets The Flag (Slovak)
        else if(formatted_phone_number.startsWith("+420")) setFlag(`${DOMAIN}/static/images/cs.png`) // Sets The Flag (Czech)
        else if(formatted_phone_number.startsWith("+44") || formatted_phone_number.startsWith("+1")) setFlag(`${DOMAIN}/static/images/en.png`) // Sets The Flag (English (England & USA))
        else if(formatted_phone_number.startsWith("+34")) setFlag(`${DOMAIN}/static/images/es.png`) // Sets The Flag (Spanish)
        else if(formatted_phone_number.startsWith("+33")) setFlag(`${DOMAIN}/static/images/fr.png`) // Sets The Flag (French)
        else if(formatted_phone_number.startsWith("+380")) setFlag(`${DOMAIN}/static/images/uk.png`) // Sets The Flag (Ukrainian)
        else if(formatted_phone_number.startsWith("+7")) setFlag(`${DOMAIN}/static/images/ru.png`) // Sets The Flag (Russian)
        else if(formatted_phone_number.startsWith("+55")) setFlag(`${DOMAIN}/static/images/pt-br.png`) // Sets The Flag (Portuguese (Brazil))
        else if(formatted_phone_number.startsWith("+86")) setFlag(`${DOMAIN}/static/images/zh-hans.png`) // Sets The Flag (Simplified Chinese)
        else setFlag(null) // Sets The Flag
    }

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
                            {is_found ? (
                                <View className="profile_page" style={styles.profile_page}>
                                    <View className="profile_container" style={styles.profile_container}>
                                        <View style={styles.circle_decoration_before} />
                                        <View style={styles.circle_decoration_after} />

                                        <View className="options_container" style={styles.options_container}>
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

                                        <View className="profile_content" style={styles.profile_content}>
                                            {active_section === "edit_account_form" && logged_in_user && profile && logged_in_user.id === profile.id && (
                                                <View className="edit_account_form hidden" style={styles.edit_account_form}>
                                                    <View className="header" style={styles.header}>
                                                        <View className="info" style={styles.info}>
                                                            <Pressable 
                                                                className="profile_picture_container"
                                                                // onPress={}
                                                                accessibilityLabel="Nahrať obrázok"
                                                                style={styles.profile_picture_container}
                                                            >
                                                                <Image 
                                                                    className={`profile_picture skeleton_loading ${
                                                                        logged_in_user.subscription && logged_in_user.subscription.is_active ? "subscriber" : "" // Adds The Subscriber Class
                                                                    }`}

                                                                    source={
                                                                        logged_in_user.profile_picture_name ? { uri: `${DOMAIN}/media/images/${logged_in_user.id}/${logged_in_user.profile_picture_name}` } : require("../../../assets/images/profile_picture.png") // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                                                                    }

                                                                    style={[
                                                                        styles.profile_picture,
                                                                        logged_in_user.subscription && logged_in_user.subscription.is_active && styles.subscriber_profile_picture,
                                                                        // { transform: [{ scale: animated_scale }] }
                                                                    ]}
                                                                />
                                                            </Pressable>

                                                            <Text className="username" style={styles.username}>{logged_in_user.username}</Text>
                                                        </View>
                                                    </View>

                                                    <Text className="friend_code" style={styles.friend_code}>Friend Code - <Text style={styles.friend_code_text}>{logged_in_user.friend_code}</Text></Text>

                                                    <View className="bio_container" style={styles.bio_container}>
                                                        <TextInput
                                                            className="bio"
                                                            keyboardType="default"
                                                            autoCapitalize="none"
                                                            autoCorrect={false}
                                                            textAlignVertical="top" 
                                                            placeholder="Niečo o Vás" 
                                                            placeholderTextColor={LIGHT_BLUE_COLOR}
                                                            accessibilityLabel="Niečo o Vás" 
                                                            value={bio}
                                                            onChangeText={setBio}
                                                            maxLength={100}

                                                            style={[
                                                                styles.bio, 
                                                                { outlineStyle: "none" } as any
                                                            ]}
                                                        />

                                                        <View className="icons" style={styles.icons}>
                                                            {/* <button 
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
                                                            </div> */}

                                                            <View className="add_emoji">
                                                                <Icon 
                                                                    icon_name="face-surprise"
                                                                    onPress={() => setIsEmojiPickerOpen(true)}
                                                                    is_regular={true}
                                                                />
                                                            </View>
                                                        </View>
                                                    </View>

                                                    {/*
                                                                    {{ one_bio_link.domain }}
                                                                </a>

                                                                <button class="remove_link" type="button" title="{% translate 'Odstrániť odkaz' %}"><i class="fa-solid fa-xmark"></i></button> <!-- https://fontawesome.com/icons/xmark -->
                                                            </div>
                                                        
                                                        {% endfor %}
                                                    </div> */}

                                                    <View className="added_links_container" style={styles.added_links_container}>
                                                        {profile.bio_links.map((one_bio_link:BioLink, index:number) => (
                                                            <View key={one_bio_link.id || index} className="link" style={styles.link}>
                                                                <Pressable 
                                                                    // onPress={}
                                                                    accessibilityLabel="Otvoriť odkaz"

                                                                    style={[
                                                                        styles.link_anchor, 
                                                                        { outlineStyle: "none" } as any
                                                                    ]}
                                                                >
                                                                    {one_bio_link.url.includes("instagram.com") && (
                                                                        <Icon
                                                                            icon_name="instagram"
                                                                            // onPress={}
                                                                        />
                                                                    )}

                                                                    {one_bio_link.url.includes("facebook.com") && (
                                                                        <Icon
                                                                            icon_name="facebook"
                                                                            // onPress={}
                                                                        />
                                                                    )}

                                                                    {one_bio_link.url.includes("youtube.com") && (
                                                                        <Icon
                                                                            icon_name="youtube"
                                                                            // onPress={}
                                                                        />
                                                                    )}

                                                                    {!one_bio_link.url.includes("instagram.com") && !one_bio_link.url.includes("facebook.com") && !one_bio_link.url.includes("youtube.com") && (
                                                                        <Icon
                                                                            icon_name="link"
                                                                            // onPress={}
                                                                        />
                                                                    )}

                                                                    <Text style={{ color: SECONDARY_COLOR }}>{getDomain(one_bio_link.url)}</Text>
                                                                </Pressable>

                                                                <View className="remove_link" accessibilityLabel="Odstrániť odkaz">
                                                                    <Icon
                                                                        icon_name="xmark"
                                                                        // onPress={}
                                                                    />
                                                                </View>
                                                            </View>
                                                        ))}
                                                    </View>

                                                    <View className="inputs">
                                                        <View className="name_container" style={styles.name_container}>
                                                            <View className="first_name_container" style={styles.first_name_container}>
                                                                <View className="first_name_icon" style={styles.first_name_icon}>
                                                                    <Icon icon_name="user" />
                                                                </View>

                                                                <TextInput
                                                                    className="first_name"
                                                                    keyboardType="default"
                                                                    autoCapitalize="words"
                                                                    textAlignVertical="top" 
                                                                    placeholder="Zmeniť meno" 
                                                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                                                    accessibilityLabel="Zmeniť meno" 
                                                                    value={first_name}
                                                                    onChangeText={setFirstName}
                                                                    maxLength={20}

                                                                    style={[
                                                                        styles.first_name, 
                                                                        { outlineStyle: "none" } as any
                                                                    ]}
                                                                />
                                                            </View>

                                                            <View className="last_name_container" style={styles.last_name_container}>
                                                                <View className="last_name_icon" style={styles.last_name_icon}>
                                                                    <Icon icon_name="user" />
                                                                </View>

                                                                <TextInput
                                                                    className="last_name"
                                                                    keyboardType="default"
                                                                    autoCapitalize="words"
                                                                    textAlignVertical="top" 
                                                                    placeholder="Zmeniť priezvisko" 
                                                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                                                    accessibilityLabel="Zmeniť priezvisko" 
                                                                    value={last_name}
                                                                    onChangeText={setLastName}
                                                                    maxLength={50}

                                                                    style={[
                                                                        styles.last_name, 
                                                                        { outlineStyle: "none" } as any
                                                                    ]}
                                                                />
                                                            </View>
                                                        </View>

                                                        <View className="contact_container" style={styles.contact_container}>
                                                            <View className="email_address_container" style={styles.email_address_container}>
                                                                <View className="email_address_icon" style={styles.email_address_icon}>
                                                                    <Icon icon_name="envelope" />
                                                                </View>

                                                                <TextInput
                                                                    className="email_address"
                                                                    keyboardType="default"
                                                                    textAlignVertical="top" 
                                                                    placeholder="Zmeniť e-mail" 
                                                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                                                    accessibilityLabel="Zmeniť e-mail" 
                                                                    value={email_address}
                                                                    onChangeText={setEmailAddress}
                                                                    maxLength={50}

                                                                    style={[
                                                                        styles.email_address, 
                                                                        { outlineStyle: "none" } as any
                                                                    ]}
                                                                />
                                                            </View>

                                                            <View className="phone_number_container" style={styles.phone_number_container}>
                                                                <View className="phone_number_icon" style={styles.phone_number_icon}>
                                                                    <Icon icon_name="phone" />
                                                                </View>

                                                                <TextInput
                                                                    className="phone_number"
                                                                    keyboardType="phone-pad"
                                                                    textAlignVertical="top" 
                                                                    placeholder="Zmeniť telefónne číslo" 
                                                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                                                    accessibilityLabel="Zmeniť telefónne číslo" 
                                                                    value={phone_number}
                                                                    onChangeText={handlePhoneNumberChange}
                                                                    maxLength={25}

                                                                    style={[
                                                                        styles.phone_number, 
                                                                        phone_number.trim().length > 0 ? { borderBottomColor: is_phone_number_valid ? "#52cf20" : "#df3535" } : {},
                                                                        { outlineStyle: "none" } as any
                                                                    ]}
                                                                />

                                                                {flag && (
                                                                    <Image
                                                                        source={{ uri:flag }}
                                                                        style={styles.flag}
                                                                    />
                                                                )}
                                                            </View>
                                                        </View>
                                                    </View>

                                                    <Text 
                                                        className="form_report" 

                                                        style={[
                                                            styles.form_report, 
                                                            form_report_appearance === "success" ? { color: GREEN_COLOR } : { color: RED_COLOR }
                                                        ]}
                                                    >
                                                        {form_report}
                                                    </Text>

                                                    <Pressable 
                                                        className="edit_account_form_submit"
                                                        // onPress={}
                                                        disabled={is_loading}
                                                        accessibilityLabel="Uložiť zmeny"

                                                        style={[
                                                            styles.edit_account_form_submit, 
                                                            { outlineStyle: "none" } as any
                                                        ]}
                                                    >
                                                        <Text className="text-white font-bold text-base" style={{ color: SECONDARY_COLOR }}>Uložiť zmeny</Text>
                                                    </Pressable>

                                                    <View className="form_questions" style={styles.form_questions}>
                                                        <View 
                                                            style={{ 
                                                                flexDirection: "row",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            <Text style={{ color: SECONDARY_COLOR }}>Zabudli ste heslo? </Text>
                                                            <Pressable
                                                                // onPress={handleGoToPasswordReset}
                                                                accessibilityRole="button"
                                                                accessibilityLabel="Zmeniť heslo" 
                                                            >
                                                                {({ pressed }) => (
                                                                    <Text 
                                                                        style={[
                                                                            { color: SECONDARY_COLOR, fontStyle: "italic" },
                                                                            pressed && { textDecorationLine: "underline" } 
                                                                        ]}
                                                                    >
                                                                        Zmeniť heslo
                                                                    </Text>
                                                                )}
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                </View>
                                            )}

                                            {active_section === "profile" && profile && (
                                                <View className="profile" style={styles.profile}>
                                                    <View className="header" style={styles.profile_header}>
                                                        <View className="top" style={styles.top}>
                                                            <View className="info" style={styles.profile_info}>
                                                                <View 
                                                                    className="profile_picture_container"
                                                                    style={styles.profile_picture_container}
                                                                >
                                                                    <Image 
                                                                        className={`profile_picture ${
                                                                            profile.subscription && profile.subscription.is_active ? "subscriber" : "" // Adds The Subscriber Class
                                                                        }`}

                                                                        source={
                                                                            profile.profile_picture_name ? { uri: `${DOMAIN}/media/images/${profile.id}/${profile.profile_picture_name}` } : require("../../../assets/images/profile_picture.png") // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                                                                        }

                                                                        style={[
                                                                            styles.profile_picture,
                                                                            profile.subscription && profile.subscription.is_active && styles.subscriber_profile_picture,
                                                                            // { transform: [{ scale: animated_scale }] }
                                                                        ]}
                                                                    />
                                                                </View>

                                                                <View className="name" style={styles.name}>
                                                                    <Text className="username" style={styles.profile_username}>{profile.username}</Text>

                                                                    {profile.first_name && profile.last_name && (
                                                                        <Text className="full_name" style={styles.full_name}>{`${profile.first_name} ${profile.last_name}`}</Text>
                                                                    )}
                                                                </View>
                                                            </View>

                                                            <View 
                                                                className={profile.has_already_increased_activity_streak ? "streak increased" : "streak"}

                                                                style={[
                                                                    styles.streak,
                                                                    profile.has_already_increased_activity_streak ? styles.increased_streak : {}
                                                                ]}
                                                            >
                                                                <FontAwesome6
                                                                    name="fire"
                                                                    size={20}
                                                                    color={BLUE_COLOR}
                                                                />

                                                                <Text style={styles.streak_text}>{profile.activity_streak || 0}</Text>
                                                            </View>
                                                        </View>

                                                        <View className="bottom">
                                                            {profile.bio && (
                                                                <View className="bio_container" style={styles.profile_bio_container}>
                                                                    <Text className="bio" style={styles.profile_bio}>{profile.bio}</Text>

                                                                    <View className="links" style={styles.links}>
                                                                        {profile.bio_links.map((one_link:BioLink, index:number) => (
                                                                            <Pressable 
                                                                                key={one_link.id || index}
                                                                                // onPress={}
                                                                                accessibilityLabel="Otvoriť odkaz"

                                                                                style={[
                                                                                    styles.profile_link_anchor, 
                                                                                    { outlineStyle: "none" } as any
                                                                                ]}
                                                                            >
                                                                                {one_link.url.includes("instagram.com") && (
                                                                                    <Icon
                                                                                        icon_name="instagram"
                                                                                        // onPress={}
                                                                                    />
                                                                                )}

                                                                                {one_link.url.includes("facebook.com") && (
                                                                                    <Icon
                                                                                        icon_name="facebook"
                                                                                        // onPress={}
                                                                                    />
                                                                                )}

                                                                                {one_link.url.includes("youtube.com") && (
                                                                                    <Icon
                                                                                        icon_name="youtube"
                                                                                        // onPress={}
                                                                                    />
                                                                                )}

                                                                                {!one_link.url.includes("instagram.com") && !one_link.url.includes("facebook.com") && !one_link.url.includes("youtube.com") && (
                                                                                    <Icon
                                                                                        icon_name="link"
                                                                                        // onPress={}
                                                                                    />
                                                                                )}
                                                                            </Pressable>
                                                                        ))}
                                                                    </View>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>

                                                    <View className="middle">
                                                        <View className="follow_container" style={styles.follow_container}>
                                                            <View className="statistics" style={styles.statistics}>
                                                                <View className="followers" style={styles.followers}>
                                                                    <Text className="amount" style={styles.followers_amount}>{profile.followers.length || 0}</Text>
                                                                    <Text className="label" style={styles.followers_label}>sledujú</Text>
                                                                </View>

                                                                {/* {% if request.session.logged_in_user_id and logged_in_user and user and logged_in_user.id == user.id %}
                                                                    <dialog class="followers_dialog">
                                                                        <div class="all_followers">
                                                                            <h2>{% translate "Sledovatelia" %} (<span class="followers_amount">{{ followers.count|default:0 }}</span>)</h2>

                                                                            <a class="back" href="#" title="{% translate 'Zavrieť' %}" aria-label="{% translate 'Zavrieť' %}" target="_self"><i class="fa-solid fa-chevron-left"></i></a> <!-- https://fontawesome.com/icons/chevron-left -->
                                                                            
                                                                            <p 
                                                                                class="
                                                                                    no_followers

                                                                                    {% if followers.count > 0 %}
                                                                                        hidden

                                                                                    {% endif %}
                                                                                "
                                                                            >
                                                                                {% translate "Žiadny sledovatelia." %}
                                                                            </p>

                                                                            {% for one_follower in followers %}
                                                                                <div class="one_follower" data-id="{{ one_follower.id }}">
                                                                                    <a href="{% url 'profile_url' one_follower.from_user.username %}" title="{% translate 'Zobraziť užívateľa' %}" aria-label="{% translate 'Zobraziť užívateľa' %}">
                                                                                        <img 
                                                                                            class="profile_picture skeleton_loading" 
                                                                                            src="
                                                                                                {% if one_follower.from_user.profile_picture_name %}
                                                                                                    /../media/images/{{ one_follower.from_user.id }}/{{ one_follower.from_user.profile_picture_name }}
                                                        
                                                                                                {% else %}
                                                                                                    {% static 'images/profile_picture.png' %} {% comment %} https://www.flaticon.com/free-icon/user_3177440 {% endcomment %}
                                                                                                
                                                                                                {% endif %}
                                                                                            "
                                                                                            alt=""
                                                                                        >
                                                                                    </a>
                                        
                                                                                    <p class="username">{{ one_follower.from_user.username }}</p>

                                                                                    <button 
                                                                                        class="remove_follower"
                                                                                        data-id="{{ one_follower.from_user.id }}"
                                                                                    >
                                                                                        {% translate "Odstrániť" %}
                                                                                    </button>
                                                                                </div>
                                                                            
                                                                            {% endfor %}
                                                                        </div>
                                                                    </dialog>

                                                                {% endif %} */}

                                                                <View className="following" style={styles.following}>
                                                                    <Text className="amount" style={styles.following_amount}>{profile.following.length || 0}</Text>
                                                                    <Text className="label" style={styles.following_label}>sleduje</Text>
                                                                </View>

                                                                {/* {% if request.session.logged_in_user_id and logged_in_user and user and logged_in_user.id == user.id %}
                                                                    <dialog class="following_dialog">
                                                                        <div class="all_followings">
                                                                            <h2>{% translate "Sleduješ" %} (<span class="followings_amount">{{ following.count|default:0 }}</span>)</h2>

                                                                            <a class="back" href="#" title="{% translate 'Zavrieť' %}" aria-label="{% translate 'Zavrieť' %}" target="_self"><i class="fa-solid fa-chevron-left"></i></a> <!-- https://fontawesome.com/icons/chevron-left -->

                                                                            <p 
                                                                                class="
                                                                                    no_followings

                                                                                    {% if following.count > 0 %}
                                                                                        hidden

                                                                                    {% endif %}
                                                                                "
                                                                            >
                                                                                {% translate "Nikoho nesleduješ." %}
                                                                            </p>

                                                                            {% for one_following in following %}
                                                                                <div class="one_following" data-id="{{ one_following.id }}">
                                                                                    <a href="{% url 'profile_url' one_following.to_user.username %}" title="{% translate 'Zobraziť užívateľa' %}" aria-label="{% translate 'Zobraziť užívateľa' %}">
                                                                                        <img 
                                                                                            class="profile_picture skeleton_loading" 
                                                                                            src="
                                                                                                {% if one_following.to_user.profile_picture_name %}
                                                                                                    /../media/images/{{ one_following.to_user.id }}/{{ one_following.to_user.profile_picture_name }}
                                                        
                                                                                                {% else %}
                                                                                                    {% static 'images/profile_picture.png' %} {% comment %} https://www.flaticon.com/free-icon/user_3177440 {% endcomment %}
                                                                                                
                                                                                                {% endif %}
                                                                                            "
                                                                                            alt=""
                                                                                        >
                                                                                    </a>
                                        
                                                                                    <p class="username">{{ one_following.to_user.username }}</p>

                                                                                    <button 
                                                                                        class="follow_button"
                                                                                        data-id="{{ one_following.to_user.id }}"
                                                                                        data-action="unfollow"
                                                                                    >
                                                                                        {% translate "Prestať sledovať" %}
                                                                                    </button>
                                                                                </div>
                                                                            
                                                                            {% endfor %}
                                                                        </div>
                                                                    </dialog>
                                                                
                                                                {% endif %} */}

                                                                <View className="posts">
                                                                    <Text className="amount" style={styles.posts_amount}>{profile.posts.length || 0}</Text>
                                                                    <Text className="label" style={styles.posts_label}>príspevky</Text>
                                                                </View>
                                                            </View>

                                                            {logged_in_user && logged_in_user.private_account && logged_in_user.follow_requests.length > 0 && (
                                                                <View className="show_follow_requests" style={styles.show_follow_requests}>
                                                                    <Text className="follow_requests_amount" style={styles.follow_requests_amount}>{logged_in_user.follow_requests.length || 0}</Text>

                                                                    <Icon
                                                                        icon_name="bell"
                                                                        // onPress={}
                                                                        size={25}
                                                                        is_regular={true}
                                                                    />
                                                                </View>

                                                                // <dialog class="follow_requests_dialog">
                                                                //     <div class="all_follow_requests">
                                                                //         <h2>{% translate "Žiadosti o sledovanie" %} (<span class="follow_requests_amount">{{ logged_in_user.follow_requests.count|default:0 }}</span>)</h2>

                                                                //         <a class="back" href="#" title="{% translate 'Zavrieť' %}" aria-label="{% translate 'Zavrieť' %}" target="_self"><i class="fa-solid fa-chevron-left"></i></a> <!-- https://fontawesome.com/icons/chevron-left -->

                                                                //         <p 
                                                                //             class="
                                                                //                 no_follow_requests

                                                                //                 {% if logged_in_user.follow_requests.count > 0 %}
                                                                //                     hidden

                                                                //                 {% endif %}
                                                                //             "
                                                                //         >
                                                                //             {% translate "Žiadne žiadosti o sledovanie." %}
                                                                //         </p>

                                                                //         {% for one_follow_request in logged_in_user.follow_requests %}
                                                                //             <div class="one_follow_request" data-id="{{ one_follow_request.id }}">
                                                                //                 <a href="{% url 'profile_url' one_follow_request.from_user.username %}" title="{% translate 'Zobraziť užívateľa' %}" aria-label="{% translate 'Zobraziť užívateľa' %}">
                                                                //                     <img 
                                                                //                         class="profile_picture skeleton_loading" 
                                                                //                         src="
                                                                //                             {% if one_follow_request.from_user.profile_picture_name %}
                                                                //                                 /../media/images/{{ one_follow_request.from_user.id }}/{{ one_follow_request.from_user.profile_picture_name }}

                                                                //                             {% else %}
                                                                //                                 {% static 'images/profile_picture.png' %} {% comment %} https://www.flaticon.com/free-icon/user_3177440 {% endcomment %}
                                                                                            
                                                                //                             {% endif %}
                                                                //                         "
                                                                //                         alt=""
                                                                //                     >
                                                                //                 </a>

                                                                //                 <p class="username">{{ one_follow_request.from_user.username }}</p>

                                                                //                 <button class="approve" title="{% translate 'Schváliť' %}" aria-label="{% translate 'Schváliť' %}">
                                                                //                     <i class="fa-solid fa-check"></i> <!-- https://fontawesome.com/icons/check -->
                                                                //                 </button>
                                                                                
                                                                //                 <button class="reject" title="{% translate 'Zamietnuť' %}" aria-label="{% translate 'Zamietnuť' %}">
                                                                //                     <i class="fa-solid fa-xmark"></i> <!-- https://fontawesome.com/icons/xmark -->
                                                                //                 </button>
                                                                //             </div>
                                                                        
                                                                //         {% endfor %}
                                                                //     </div>
                                                                // </dialog>
                                                            )}

                                                            {logged_in_user && logged_in_user.id !== profile.id && (
                                                                <Pressable
                                                                    className="follow_button" 
                                                                    onPress={() => toggleFollow(profile.id, getFollowButtonProperties(profile.private_account, profile.has_follow || false, profile.has_pending_follow_request || false).action)}

                                                                    style={[
                                                                        styles.follow_button, 
                                                                        { outlineStyle: "none" } as any
                                                                    ]}
                                                                >
                                                                    <Text style={{ color: SECONDARY_COLOR }}>{getFollowButtonProperties(profile.private_account, profile.has_follow || false, profile.has_pending_follow_request || false).text}</Text>
                                                                </Pressable>
                                                            )}
                                                        </View>

                                                        {profile.has_follow && (
                                                            <View className="message_container" style={styles.message_container}>
                                                                <Text className="unread_messages" style={styles.unread_messages}>{profile.unread_messages_amount}</Text>

                                                                <Icon 
                                                                    icon_name="comment-dots"
                                                                    // onPress={}
                                                                    is_regular={true}
                                                                />
                                                            </View>
                                                        )}

                                                        <View className="badges_container" style={styles.badges_container}>
                                                            <ScrollView 
                                                                className="badges" 
                                                                horizontal={true}
                                                                showsHorizontalScrollIndicator={true}
                                                                style={styles.badges}
                                                                contentContainerStyle={styles.badges_content}
                                                            >
                                                                {profile.role === "developer" && (
                                                                    <View 
                                                                        className="badge developer" 
                                                                        accessibilityLabel="Vývojár"

                                                                        style={[
                                                                            styles.badge,
                                                                            styles.badge_developer,
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="code"
                                                                            size={20}
                                                                            color={RED_RARITY}
                                                                            style={styles.badge_icon}
                                                                        />
                                                                    </View>
                                                                )}

                                                                {profile.subscription && profile.subscription.is_active && (
                                                                    <View 
                                                                        className="badge subscriber" 
                                                                        accessibilityLabel={profile.subscription.plan === "premium" ? "Prémiový predplatiteľ" : "Základný predplatiteľ"}

                                                                        style={[
                                                                            styles.badge,
                                                                            styles.badge_subscriber,
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="crown"
                                                                            size={20}
                                                                            color={YELLOW_RARITY}
                                                                            style={styles.badge_icon}
                                                                        />
                                                                    </View>
                                                                )}
                                                                
                                                                {profile.total_transactions_amount !== 0 && (
                                                                    <View 
                                                                        className={[
                                                                            "badge", 
                                                                            "donations",
                                                                            profile.total_transactions_amount >= 1 && profile.total_transactions_amount < 2 && "blue",
                                                                            profile.total_transactions_amount >= 2 && profile.total_transactions_amount < 5 && "green",
                                                                            profile.total_transactions_amount >= 5 && profile.total_transactions_amount < 10 && "yellow",
                                                                            profile.total_transactions_amount >= 10 && profile.total_transactions_amount < 50 && "orange",
                                                                            profile.total_transactions_amount >= 50 && profile.total_transactions_amount < 100 && "red",
                                                                            profile.total_transactions_amount >= 100 && "purple"
                                                                        ].filter(Boolean).join(" ")}
                                                                        
                                                                        accessibilityLabel="Prispievateľ"

                                                                        style={[
                                                                            styles.badge,
                                                                            profile.total_transactions_amount >= 1 && profile.total_transactions_amount < 2 ? styles.badge_blue_rarity : {},
                                                                            profile.total_transactions_amount >= 2 && profile.total_transactions_amount < 5 ? styles.badge_green_rarity : {},
                                                                            profile.total_transactions_amount >= 5 && profile.total_transactions_amount < 10 ? styles.badge_yellow_rarity : {},
                                                                            profile.total_transactions_amount >= 10 && profile.total_transactions_amount < 50 ? styles.badge_orange_rarity : {},
                                                                            profile.total_transactions_amount >= 50 && profile.total_transactions_amount < 100 ? styles.badge_red_rarity : {},
                                                                            profile.total_transactions_amount >= 100 ? styles.badge_purple_rarity : {},
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="dollar-sign"
                                                                            size={30}

                                                                            color={
                                                                                profile.total_transactions_amount >= 1 && profile.total_transactions_amount < 2 ? BLUE_RARITY :
                                                                                profile.total_transactions_amount >= 2 && profile.total_transactions_amount < 5 ? GREEN_RARITY : 
                                                                                profile.total_transactions_amount >= 5 && profile.total_transactions_amount < 10 ? YELLOW_RARITY : 
                                                                                profile.total_transactions_amount >= 10 && profile.total_transactions_amount < 50 ? ORANGE_RARITY : 
                                                                                profile.total_transactions_amount >= 50 && profile.total_transactions_amount < 100 ? RED_RARITY : 
                                                                                PURPLE_RARITY
                                                                            }

                                                                            style={styles.badge_icon}
                                                                        />

                                                                        <Text 
                                                                            style={[
                                                                                styles.badge_text,
                                                                                profile.total_transactions_amount >= 1 && profile.total_transactions_amount < 2 ? { color: BLUE_RARITY } : {},
                                                                                profile.total_transactions_amount >= 2 && profile.total_transactions_amount < 5 ? { color: GREEN_RARITY } : {},
                                                                                profile.total_transactions_amount >= 5 && profile.total_transactions_amount < 10 ? { color: YELLOW_RARITY } : {},
                                                                                profile.total_transactions_amount >= 10 && profile.total_transactions_amount < 50 ? { color: ORANGE_RARITY } : {},
                                                                                profile.total_transactions_amount >= 50 && profile.total_transactions_amount < 100 ? { color: RED_RARITY } : {},
                                                                                profile.total_transactions_amount >= 100 ? { color: PURPLE_RARITY } : {},
                                                                            ]}
                                                                        >
                                                                            {profile.total_transactions_amount >= 1 && profile.total_transactions_amount < 2 && ("1€")}
                                                                            {profile.total_transactions_amount >= 2 && profile.total_transactions_amount < 5 && ("2€")}
                                                                            {profile.total_transactions_amount >= 5 && profile.total_transactions_amount < 10 && ("5€")}
                                                                            {profile.total_transactions_amount >= 10 && profile.total_transactions_amount < 50 && ("10€")}
                                                                            {profile.total_transactions_amount >= 50 && profile.total_transactions_amount < 100 && ("50€")}
                                                                            {profile.total_transactions_amount >= 100 && ("100+€")}
                                                                        </Text>
                                                                    </View>
                                                                )}

                                                                <View 
                                                                    className={[
                                                                        "badge", 
                                                                        "level",
                                                                        profile.level >= 1 && profile.level <= 10 && "blue",
                                                                        profile.level > 10 && profile.level <= 25 && "green",
                                                                        profile.level > 25 && profile.level <= 50 && "yellow",
                                                                        profile.level > 50 && profile.level <= 75 && "orange",
                                                                        profile.level > 75 && profile.level <= 100 && "red",
                                                                        profile.level > 100 && "purple"
                                                                    ].filter(Boolean).join(" ")}
                                                                    
                                                                    accessibilityLabel="Level"

                                                                    style={[
                                                                        styles.badge,
                                                                        profile.level >= 1 && profile.level <= 10 ? styles.badge_blue_rarity : {},
                                                                        profile.level > 10 && profile.level <= 25 ? styles.badge_green_rarity : {},
                                                                        profile.level > 25 && profile.level <= 50 ? styles.badge_yellow_rarity : {},
                                                                        profile.level > 50 && profile.level <= 75 ? styles.badge_orange_rarity : {},
                                                                        profile.level > 75 && profile.level <= 100 ? styles.badge_red_rarity : {},
                                                                        profile.level > 100 ? styles.badge_purple_rarity : {},
                                                                    ]}
                                                                >
                                                                    <FontAwesome6
                                                                        name="arrow-trend-up"
                                                                        size={30}

                                                                        color={
                                                                            profile.level >= 1 && profile.level <= 10 ? BLUE_RARITY :
                                                                            profile.level > 10 && profile.level <= 25 ? GREEN_RARITY : 
                                                                            profile.level > 25 && profile.level <= 50 ? YELLOW_RARITY : 
                                                                            profile.level > 50 && profile.level <= 75 ? ORANGE_RARITY : 
                                                                            profile.level > 75 && profile.level <= 100 ? RED_RARITY : 
                                                                            PURPLE_RARITY
                                                                        }

                                                                        style={styles.badge_icon}
                                                                    />

                                                                    <Text 
                                                                        style={[
                                                                            styles.badge_text,
                                                                            profile.level >= 1 && profile.level <= 10 ? { color: BLUE_RARITY } : {},
                                                                            profile.level > 10 && profile.level <= 25 ? { color: GREEN_RARITY } : {},
                                                                            profile.level > 25 && profile.level <= 50 ? { color: YELLOW_RARITY } : {},
                                                                            profile.level > 50 && profile.level <= 75 ? { color: ORANGE_RARITY } : {},
                                                                            profile.level > 75 && profile.level <= 100 ? { color: RED_RARITY } : {},
                                                                            profile.level > 100 ? { color: PURPLE_RARITY } : {},
                                                                        ]}
                                                                    >
                                                                        {profile.level}
                                                                    </Text>
                                                                </View>

                                                                {profile.xp !== 0 && (
                                                                    <View 
                                                                        className={[
                                                                            "badge", 
                                                                            "xp",
                                                                            profile.xp < 1000 && "blue",
                                                                            profile.xp >= 1000 && profile.xp <= 5000 && "green",
                                                                            profile.xp > 5000 && profile.xp <= 10000 && "yellow",
                                                                            profile.xp > 10000 && profile.xp <= 50000 && "orange",
                                                                            profile.xp > 50000 && profile.xp <= 100000 && "red",
                                                                            profile.xp > 100000 && "purple"
                                                                        ].filter(Boolean).join(" ")}
                                                                        
                                                                        accessibilityLabel="Získané XP"

                                                                        style={[
                                                                            styles.badge,
                                                                            profile.xp < 1000 ? styles.badge_blue_rarity : {},
                                                                            profile.xp >= 1000 && profile.xp <= 5000 ? styles.badge_green_rarity : {},
                                                                            profile.xp > 5000 && profile.xp <= 10000 ? styles.badge_yellow_rarity : {},
                                                                            profile.xp > 10000 && profile.xp <= 50000 ? styles.badge_orange_rarity : {},
                                                                            profile.xp > 50000 && profile.xp <= 100000 ? styles.badge_red_rarity : {},
                                                                            profile.xp > 100000 ? styles.badge_purple_rarity : {},
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="bolt"
                                                                            size={30}

                                                                            color={
                                                                                profile.xp < 1000 ? BLUE_RARITY :
                                                                                profile.xp >= 1000 && profile.xp <= 5000 ? GREEN_RARITY : 
                                                                                profile.xp > 5000 && profile.xp <= 10000 ? YELLOW_RARITY : 
                                                                                profile.xp > 10000 && profile.xp <= 50000 ? ORANGE_RARITY : 
                                                                                profile.xp > 50000 && profile.xp <= 100000 ? RED_RARITY : 
                                                                                PURPLE_RARITY
                                                                            }

                                                                            style={styles.badge_icon}
                                                                        />

                                                                        <View 
                                                                            style={[
                                                                                {
                                                                                    position: "absolute",
                                                                                    top: 0, 
                                                                                    bottom: 0,
                                                                                    left: 0,
                                                                                    right: 0,
                                                                                },
                                                                               
                                                                                styles.badge_xp_text,
                                                                            ]}
                                                                        >
                                                                            <Text 
                                                                                style={[
                                                                                    { 
                                                                                        textAlign: "center",
                                                                                        lineHeight: 22,
                                                                                        fontSize: 22,
                                                                                        fontWeight: "bold", 
                                                                                    },

                                                                                    profile.xp < 1000 ? { color: BLUE_RARITY } : {},
                                                                                    profile.xp >= 1000 && profile.xp <= 5000 ? { color: GREEN_RARITY } : {},
                                                                                    profile.xp > 5000 && profile.xp <= 10000 ? { color: YELLOW_RARITY } : {},
                                                                                    profile.xp > 10000 && profile.xp <= 50000 ? { color: ORANGE_RARITY } : {},
                                                                                    profile.xp > 50000 && profile.xp <= 100000 ? { color: RED_RARITY } : {},
                                                                                    profile.xp > 100000 ? { color: PURPLE_RARITY } : {},
                                                                                ]}
                                                                            >
                                                                                {profile.xp < 1000 && "<1000"}
                                                                                {profile.xp >= 1000 && profile.xp <= 5000 && "1K"}
                                                                                {profile.xp > 5000 && profile.xp <= 10000 && "5K"}
                                                                                {profile.xp > 10000 && profile.xp <= 50000 && "10K"}
                                                                                {profile.xp > 50000 && profile.xp <= 100000 && "50K"}
                                                                                {profile.xp > 100000 && "100K+"}
                                                                            </Text>

                                                                            <Text 
                                                                                style={[
                                                                                    { textAlign: "center" },
                                                                                    profile.xp < 1000 ? { color: BLUE_RARITY } : {},
                                                                                    profile.xp >= 1000 && profile.xp <= 5000 ? { color: GREEN_RARITY } : {},
                                                                                    profile.xp > 5000 && profile.xp <= 10000 ? { color: YELLOW_RARITY } : {},
                                                                                    profile.xp > 10000 && profile.xp <= 50000 ? { color: ORANGE_RARITY } : {},
                                                                                    profile.xp > 50000 && profile.xp <= 100000 ? { color: RED_RARITY } : {},
                                                                                    profile.xp > 100000 ? { color: PURPLE_RARITY } : {},
                                                                                ]}
                                                                            >
                                                                                XP
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                )}

                                                                {profile.max_activity_streak !== 0 && (
                                                                    <View 
                                                                        className="badge max_activity_streak" 
                                                                        accessibilityLabel="Najdlhšia rada aktivity"

                                                                        style={[
                                                                            styles.badge,
                                                                            styles.badge_max_activity_streak,
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="fire"
                                                                            size={20}
                                                                            color={YELLOW_RARITY}
                                                                            style={styles.badge_icon}
                                                                        />

                                                                        <Text 
                                                                            style={[
                                                                                styles.badge_text,
                                                                                { color: YELLOW_RARITY }
                                                                            ]}
                                                                        >
                                                                            {profile.max_activity_streak}
                                                                        </Text>
                                                                    </View>
                                                                )}

                                                                {profile.years_since_registration !== 0 && (
                                                                    <View 
                                                                        className={[
                                                                            "badge", 
                                                                            "years_since_registration",
                                                                            profile.years_since_registration === 1 && "blue",
                                                                            profile.years_since_registration === 2 && "green",
                                                                            profile.years_since_registration === 3 && "yellow",
                                                                            profile.years_since_registration === 4 && "orange",
                                                                            profile.years_since_registration === 5 && "red",
                                                                            profile.years_since_registration > 5 && "purple"
                                                                        ].filter(Boolean).join(" ")}
                                                                        
                                                                        accessibilityLabel="Roky od registrácie"

                                                                        style={[
                                                                            styles.badge,
                                                                            profile.years_since_registration === 1 ? styles.badge_blue_rarity : {},
                                                                            profile.years_since_registration === 2 ? styles.badge_green_rarity : {},
                                                                            profile.years_since_registration === 3 ? styles.badge_yellow_rarity : {},
                                                                            profile.years_since_registration === 4 ? styles.badge_orange_rarity : {},
                                                                            profile.years_since_registration === 5 ? styles.badge_red_rarity : {},
                                                                            profile.years_since_registration > 5 ? styles.badge_purple_rarity : {},
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="cake-candles"
                                                                            size={30}

                                                                            color={
                                                                                profile.years_since_registration === 1 ? BLUE_RARITY :
                                                                                profile.years_since_registration === 2 ? GREEN_RARITY : 
                                                                                profile.years_since_registration === 3 ? YELLOW_RARITY : 
                                                                                profile.years_since_registration === 4 ? ORANGE_RARITY : 
                                                                                profile.years_since_registration === 5 ? RED_RARITY : 
                                                                                PURPLE_RARITY
                                                                            }

                                                                            style={styles.badge_icon}
                                                                        />

                                                                        <Text 
                                                                            style={[
                                                                                styles.badge_text,
                                                                                profile.years_since_registration === 1 ? { color: BLUE_RARITY } : {},
                                                                                profile.years_since_registration === 2 ? { color: GREEN_RARITY } : {},
                                                                                profile.years_since_registration === 3 ? { color: YELLOW_RARITY } : {},
                                                                                profile.years_since_registration === 4 ? { color: ORANGE_RARITY } : {},
                                                                                profile.years_since_registration === 5 ? { color: RED_RARITY } : {},
                                                                                profile.years_since_registration > 5 ? { color: PURPLE_RARITY } : {},
                                                                            ]}
                                                                        >
                                                                            {profile.years_since_registration}
                                                                        </Text>
                                                                    </View>
                                                                )}

                                                                {profile.total_activities !== 0 && (
                                                                    <View 
                                                                        className={[
                                                                            "badge", 
                                                                            "total_activities",
                                                                            profile.total_activities < 10 && "blue",
                                                                            profile.total_activities <= 50 && "green",
                                                                            profile.total_activities <= 100 && "yellow",
                                                                            profile.total_activities <= 250 && "orange",
                                                                            profile.total_activities <= 500 && "red",
                                                                            profile.total_activities > 500 && "purple"
                                                                        ].filter(Boolean).join(" ")}
                                                                        
                                                                        accessibilityLabel="Zaznamenané aktivity"

                                                                        style={[
                                                                            styles.badge,
                                                                            profile.total_activities >= 1 && profile.total_activities < 10 ? styles.badge_blue_rarity : {},
                                                                            profile.total_activities >= 10 && profile.total_activities <= 50 ? styles.badge_green_rarity : {},
                                                                            profile.total_activities > 50 && profile.total_activities <= 100 ? styles.badge_yellow_rarity : {},
                                                                            profile.total_activities > 100 && profile.total_activities <= 250 ? styles.badge_orange_rarity : {},
                                                                            profile.total_activities > 250 && profile.total_activities <= 500 ? styles.badge_red_rarity : {},
                                                                            profile.total_activities > 500 ? styles.badge_purple_rarity : {},
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="dumbbell"
                                                                            size={30}

                                                                            color={
                                                                                profile.total_activities >= 1 && profile.total_activities < 10 ? BLUE_RARITY :
                                                                                profile.total_activities >= 10 && profile.total_activities <= 50 ? GREEN_RARITY : 
                                                                                profile.total_activities > 50 && profile.total_activities <= 100 ? YELLOW_RARITY : 
                                                                                profile.total_activities > 100 && profile.total_activities <= 250 ? ORANGE_RARITY : 
                                                                                profile.total_activities > 250 && profile.total_activities <= 500 ? RED_RARITY : 
                                                                                PURPLE_RARITY
                                                                            }

                                                                            style={styles.badge_icon}
                                                                        />

                                                                        <Text 
                                                                            style={[
                                                                                styles.badge_text,
                                                                                profile.total_activities >= 1 && profile.total_activities < 10 ? { color: BLUE_RARITY } : {},
                                                                                profile.total_activities >= 10 && profile.total_activities <= 50 ? { color: GREEN_RARITY } : {},
                                                                                profile.total_activities > 50 && profile.total_activities <= 100 ? { color: YELLOW_RARITY } : {},
                                                                                profile.total_activities > 100 && profile.total_activities <= 250 ? { color: ORANGE_RARITY } : {},
                                                                                profile.total_activities > 250 && profile.total_activities <= 500 ? { color: RED_RARITY } : {},
                                                                                profile.total_activities > 500 ? { color: PURPLE_RARITY } : {},
                                                                            ]}
                                                                        >
                                                                            {profile.total_activities < 10 && "1"}
                                                                            {profile.total_activities >= 10 && profile.total_activities <= 50 && "10"}
                                                                            {profile.total_activities > 50 && profile.total_activities <= 100 && "50"}
                                                                            {profile.total_activities > 100 && profile.total_activities <= 250 && "100"}
                                                                            {profile.total_activities > 250 && profile.total_activities <= 500 && "250"}
                                                                            {profile.total_activities > 500 && "500+"}
                                                                        </Text>
                                                                    </View>
                                                                )}

                                                                {profile.followers.length !== 0 && (
                                                                    <View 
                                                                        className={[
                                                                            "badge", 
                                                                            "followers",
                                                                            profile.followers.length >= 1 && profile.followers.length < 5 && "blue",
                                                                            profile.followers.length >= 5 && profile.followers.length <= 10 && "green",
                                                                            profile.followers.length > 10 && profile.followers.length <= 25 && "yellow",
                                                                            profile.followers.length > 25 && profile.followers.length <= 50 && "orange",
                                                                            profile.followers.length > 50 && profile.followers.length <= 100 && "red",
                                                                            profile.followers.length > 100 && "purple"
                                                                        ].filter(Boolean).join(" ")}
                                                                        
                                                                        accessibilityLabel="Počet sledovateľov"

                                                                        style={[
                                                                            styles.badge,
                                                                            profile.followers.length >= 1 && profile.followers.length < 5 ? styles.badge_blue_rarity : {},
                                                                            profile.followers.length >= 5 && profile.followers.length <= 10 ? styles.badge_green_rarity : {},
                                                                            profile.followers.length > 10 && profile.followers.length <= 25 ? styles.badge_yellow_rarity : {},
                                                                            profile.followers.length > 25 && profile.followers.length <= 50 ? styles.badge_orange_rarity : {},
                                                                            profile.followers.length > 50 && profile.followers.length <= 100 ? styles.badge_red_rarity : {},
                                                                            profile.followers.length > 100 ? styles.badge_purple_rarity : {},
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="bluesky"
                                                                            size={30}

                                                                            color={
                                                                                profile.followers.length >= 1 && profile.followers.length < 5 ? BLUE_RARITY :
                                                                                profile.followers.length >= 5 && profile.followers.length <= 10 ? GREEN_RARITY : 
                                                                                profile.followers.length > 10 && profile.followers.length <= 25 ? YELLOW_RARITY : 
                                                                                profile.followers.length > 25 && profile.followers.length <= 50 ? ORANGE_RARITY : 
                                                                                profile.followers.length > 50 && profile.followers.length <= 100 ? RED_RARITY : 
                                                                                PURPLE_RARITY
                                                                            }

                                                                            style={styles.badge_icon}
                                                                        />

                                                                        <Text 
                                                                            style={[
                                                                                styles.badge_text,
                                                                                profile.followers.length >= 1 && profile.followers.length < 5 ? { color: BLUE_RARITY } : {},
                                                                                profile.followers.length >= 5 && profile.followers.length <= 10 ? { color: GREEN_RARITY } : {},
                                                                                profile.followers.length > 10 && profile.followers.length <= 25 ? { color: YELLOW_RARITY } : {},
                                                                                profile.followers.length > 25 && profile.followers.length <= 50 ? { color: ORANGE_RARITY } : {},
                                                                                profile.followers.length > 50 && profile.followers.length <= 100 ? { color: RED_RARITY } : {},
                                                                                profile.followers.length > 100 ? { color: PURPLE_RARITY } : {},
                                                                            ]}
                                                                        >
                                                                            {profile.followers.length < 5 && "1"}
                                                                            {profile.followers.length >= 5 && profile.followers.length <= 10 && "5"}
                                                                            {profile.followers.length > 10 && profile.followers.length <= 25 && "10"}
                                                                            {profile.followers.length > 25 && profile.followers.length <= 50 && "25"}
                                                                            {profile.followers.length > 50 && profile.followers.length <= 100 && "50"}
                                                                            {profile.followers.length > 100 && "100+"}
                                                                        </Text>
                                                                    </View>
                                                                )}

                                                                {profile.posts.length !== 0 && (
                                                                    <View 
                                                                        className={[
                                                                            "badge", 
                                                                            "posts",
                                                                            profile.posts.length >= 1 && profile.posts.length < 5 && "blue",
                                                                            profile.posts.length >= 5 && profile.posts.length <= 10 && "green",
                                                                            profile.posts.length > 10 && profile.posts.length <= 25 && "yellow",
                                                                            profile.posts.length > 25 && profile.posts.length <= 50 && "orange",
                                                                            profile.posts.length > 50 && profile.posts.length <= 100 && "red",
                                                                            profile.posts.length > 100 && "purple"
                                                                        ].filter(Boolean).join(" ")}
                                                                        
                                                                        accessibilityLabel="Počet príspevkov"

                                                                        style={[
                                                                            styles.badge,
                                                                            profile.posts.length >= 1 && profile.posts.length < 5 ? styles.badge_blue_rarity : {},
                                                                            profile.posts.length >= 5 && profile.posts.length <= 10 ? styles.badge_green_rarity : {},
                                                                            profile.posts.length > 10 && profile.posts.length <= 25 ? styles.badge_yellow_rarity : {},
                                                                            profile.posts.length > 25 && profile.posts.length <= 50 ? styles.badge_orange_rarity : {},
                                                                            profile.posts.length > 50 && profile.posts.length <= 100 ? styles.badge_red_rarity : {},
                                                                            profile.posts.length > 100 ? styles.badge_purple_rarity : {},
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="bluesky"
                                                                            size={30}

                                                                            color={
                                                                                profile.posts.length >= 1 && profile.posts.length < 5 ? BLUE_RARITY :
                                                                                profile.posts.length >= 5 && profile.posts.length <= 10 ? GREEN_RARITY : 
                                                                                profile.posts.length > 10 && profile.posts.length <= 25 ? YELLOW_RARITY : 
                                                                                profile.posts.length > 25 && profile.posts.length <= 50 ? ORANGE_RARITY : 
                                                                                profile.posts.length > 50 && profile.posts.length <= 100 ? RED_RARITY : 
                                                                                PURPLE_RARITY
                                                                            }

                                                                            style={styles.badge_icon}
                                                                        />

                                                                        <Text 
                                                                            style={[
                                                                                styles.badge_text,
                                                                                profile.posts.length >= 1 && profile.posts.length < 5 ? { color: BLUE_RARITY } : {},
                                                                                profile.posts.length >= 5 && profile.posts.length <= 10 ? { color: GREEN_RARITY } : {},
                                                                                profile.posts.length > 10 && profile.posts.length <= 25 ? { color: YELLOW_RARITY } : {},
                                                                                profile.posts.length > 25 && profile.posts.length <= 50 ? { color: ORANGE_RARITY } : {},
                                                                                profile.posts.length > 50 && profile.posts.length <= 100 ? { color: RED_RARITY } : {},
                                                                                profile.posts.length > 100 ? { color: PURPLE_RARITY } : {},
                                                                            ]}
                                                                        >
                                                                            {profile.posts.length >= 1 && profile.posts.length < 5 && "1"}
                                                                            {profile.posts.length >= 5 && profile.posts.length <= 10 && "5"}
                                                                            {profile.posts.length > 10 && profile.posts.length <= 25 && "10"}
                                                                            {profile.posts.length > 25 && profile.posts.length <= 50 && "25"}
                                                                            {profile.posts.length > 50 && profile.posts.length <= 100 && "50"}
                                                                            {profile.posts.length > 100 && "100+"}
                                                                        </Text>
                                                                    </View>
                                                                )}

                                                                {profile.total_received_likes !== 0 && (
                                                                    <View 
                                                                        className={[
                                                                            "badge", 
                                                                            "received_likes",
                                                                            profile.total_received_likes >= 1 && profile.total_received_likes < 5 && "blue",
                                                                            profile.total_received_likes >= 5 && profile.total_received_likes <= 10 && "green",
                                                                            profile.total_received_likes > 10 && profile.total_received_likes <= 25 && "yellow",
                                                                            profile.total_received_likes > 25 && profile.total_received_likes <= 50 && "orange",
                                                                            profile.total_received_likes > 50 && profile.total_received_likes <= 100 && "red",
                                                                            profile.total_received_likes > 100 && "purple"
                                                                        ].filter(Boolean).join(" ")}
                                                                        
                                                                        accessibilityLabel="Získané lajky"

                                                                        style={[
                                                                            styles.badge,
                                                                            profile.total_received_likes >= 1 && profile.total_received_likes < 5 ? styles.badge_blue_rarity : {},
                                                                            profile.total_received_likes >= 5 && profile.total_received_likes <= 10 ? styles.badge_green_rarity : {},
                                                                            profile.total_received_likes > 10 && profile.total_received_likes <= 25 ? styles.badge_yellow_rarity : {},
                                                                            profile.total_received_likes > 25 && profile.total_received_likes <= 50 ? styles.badge_orange_rarity : {},
                                                                            profile.total_received_likes > 50 && profile.total_received_likes <= 100 ? styles.badge_red_rarity : {},
                                                                            profile.total_received_likes > 100 ? styles.badge_purple_rarity : {},
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="heart"
                                                                            size={30}

                                                                            color={
                                                                                profile.total_received_likes >= 1 && profile.total_received_likes < 5 ? BLUE_RARITY :
                                                                                profile.total_received_likes >= 5 && profile.total_received_likes <= 10 ? GREEN_RARITY : 
                                                                                profile.total_received_likes > 10 && profile.total_received_likes <= 25 ? YELLOW_RARITY : 
                                                                                profile.total_received_likes > 25 && profile.total_received_likes <= 50 ? ORANGE_RARITY : 
                                                                                profile.total_received_likes > 50 && profile.total_received_likes <= 100 ? RED_RARITY : 
                                                                                PURPLE_RARITY
                                                                            }

                                                                            style={styles.badge_icon}
                                                                        />

                                                                        <Text 
                                                                            style={[
                                                                                styles.badge_text,
                                                                                profile.total_received_likes >= 1 && profile.total_received_likes < 5 ? { color: BLUE_RARITY } : {},
                                                                                profile.total_received_likes >= 5 && profile.total_received_likes <= 10 ? { color: GREEN_RARITY } : {},
                                                                                profile.total_received_likes > 10 && profile.total_received_likes <= 25 ? { color: YELLOW_RARITY } : {},
                                                                                profile.total_received_likes > 25 && profile.total_received_likes <= 50 ? { color: ORANGE_RARITY } : {},
                                                                                profile.total_received_likes > 50 && profile.total_received_likes <= 100 ? { color: RED_RARITY } : {},
                                                                                profile.total_received_likes > 100 ? { color: PURPLE_RARITY } : {},
                                                                            ]}
                                                                        >
                                                                            {profile.total_received_likes >= 1 && profile.total_received_likes < 5 && "1"}
                                                                            {profile.total_received_likes >= 5 && profile.total_received_likes <= 10 && "5"}
                                                                            {profile.total_received_likes > 10 && profile.total_received_likes <= 25 && "10"}
                                                                            {profile.total_received_likes > 25 && profile.total_received_likes <= 50 && "25"}
                                                                            {profile.total_received_likes > 50 && profile.total_received_likes <= 100 && "50"}
                                                                            {profile.total_received_likes > 100 && "100+"}
                                                                        </Text>
                                                                    </View>
                                                                )}

                                                                {profile.post_comments.length !== 0 && (
                                                                    <View 
                                                                        className={[
                                                                            "badge", 
                                                                            "written_comments",
                                                                            profile.post_comments.length >= 1 && profile.post_comments.length < 5 && "blue",
                                                                            profile.post_comments.length >= 5 && profile.post_comments.length <= 10 && "green",
                                                                            profile.post_comments.length > 10 && profile.post_comments.length <= 25 && "yellow",
                                                                            profile.post_comments.length > 25 && profile.post_comments.length <= 50 && "orange",
                                                                            profile.post_comments.length > 50 && profile.post_comments.length <= 100 && "red",
                                                                            profile.post_comments.length > 100 && "purple"
                                                                        ].filter(Boolean).join(" ")}
                                                                        
                                                                        accessibilityLabel="Získané lajky"

                                                                        style={[
                                                                            styles.badge,
                                                                            profile.post_comments.length >= 1 && profile.post_comments.length < 5 ? styles.badge_blue_rarity : {},
                                                                            profile.post_comments.length >= 5 && profile.post_comments.length <= 10 ? styles.badge_green_rarity : {},
                                                                            profile.post_comments.length > 10 && profile.post_comments.length <= 25 ? styles.badge_yellow_rarity : {},
                                                                            profile.post_comments.length > 25 && profile.post_comments.length <= 50 ? styles.badge_orange_rarity : {},
                                                                            profile.post_comments.length > 50 && profile.post_comments.length <= 100 ? styles.badge_red_rarity : {},
                                                                            profile.post_comments.length > 100 ? styles.badge_purple_rarity : {},
                                                                        ]}
                                                                    >
                                                                        <FontAwesome6
                                                                            name="heart"
                                                                            size={30}

                                                                            color={
                                                                                profile.post_comments.length >= 1 && profile.post_comments.length < 5 ? BLUE_RARITY :
                                                                                profile.post_comments.length >= 5 && profile.post_comments.length <= 10 ? GREEN_RARITY : 
                                                                                profile.post_comments.length > 10 && profile.post_comments.length <= 25 ? YELLOW_RARITY : 
                                                                                profile.post_comments.length > 25 && profile.post_comments.length <= 50 ? ORANGE_RARITY : 
                                                                                profile.post_comments.length > 50 && profile.post_comments.length <= 100 ? RED_RARITY : 
                                                                                PURPLE_RARITY
                                                                            }

                                                                            style={styles.badge_icon}
                                                                        />

                                                                        <Text 
                                                                            style={[
                                                                                styles.badge_text,
                                                                                profile.post_comments.length >= 1 && profile.post_comments.length < 5 ? { color: BLUE_RARITY } : {},
                                                                                profile.post_comments.length >= 5 && profile.post_comments.length <= 10 ? { color: GREEN_RARITY } : {},
                                                                                profile.post_comments.length > 10 && profile.post_comments.length <= 25 ? { color: YELLOW_RARITY } : {},
                                                                                profile.post_comments.length > 25 && profile.post_comments.length <= 50 ? { color: ORANGE_RARITY } : {},
                                                                                profile.post_comments.length > 50 && profile.post_comments.length <= 100 ? { color: RED_RARITY } : {},
                                                                                profile.post_comments.length > 100 ? { color: PURPLE_RARITY } : {},
                                                                            ]}
                                                                        >
                                                                            {profile.post_comments.length >= 1 && profile.post_comments.length < 5 && "1"}
                                                                            {profile.post_comments.length >= 5 && profile.post_comments.length <= 10 && "5"}
                                                                            {profile.post_comments.length > 10 && profile.post_comments.length <= 25 && "10"}
                                                                            {profile.post_comments.length > 25 && profile.post_comments.length <= 50 && "25"}
                                                                            {profile.post_comments.length > 50 && profile.post_comments.length <= 100 && "50"}
                                                                            {profile.post_comments.length > 100 && "100+"}
                                                                        </Text>
                                                                    </View>
                                                                )}

                                                                {profile.badges.map((one_badge:{ title:string, data:string }, index:number) => (
                                                                    <View 
                                                                        key={index} 
                                                                        className="badge"

                                                                        style={[
                                                                            styles.badge,
                                                                            one_badge.data === "no_day_off_week" ? styles.badge_no_day_off_week : {},
                                                                            one_badge.data === "xmas_activity" ? styles.badge_xmas_activity : {},
                                                                            one_badge.data === "new_year_new_goals" ? styles.badge_new_year_new_goals : {},
                                                                        ]}
                                                                    >
                                                                        {one_badge.data === "no_day_off_week" && (
                                                                            <>
                                                                                <FontAwesome6
                                                                                    name="calendar-check"
                                                                                    size={30}
                                                                                    color={YELLOW_RARITY}
                                                                                    style={styles.badge_icon}
                                                                                />

                                                                                <Text 
                                                                                    style={[
                                                                                        styles.badge_text,
                                                                                        { color: YELLOW_RARITY },
                                                                                    ]}
                                                                                >
                                                                                    7
                                                                                </Text>
                                                                            </>
                                                                        )}

                                                                        {one_badge.data === "xmas_activity" && (
                                                                            <>
                                                                                <FontAwesome6
                                                                                    name="gift"
                                                                                    size={20}
                                                                                    color={"#dc2626"}
                                                                                    style={styles.badge_icon}
                                                                                />
                                                                            </>
                                                                        )}

                                                                        {one_badge.data === "new_year_new_goals" && (
                                                                            <>
                                                                                <FontAwesome6
                                                                                    name="champagne-glasses"
                                                                                    size={20}
                                                                                    color={"#a57e05"}
                                                                                    style={styles.badge_icon}
                                                                                />
                                                                            </>
                                                                        )}
                                                                    </View>
                                                                ))}
                                                            </ScrollView>
                                                        </View>
                                                    </View>

                                                    <View className="bottom" style={styles.bottom}>
                                                        {logged_in_user && profile && logged_in_user.id === profile.id && (
                                                            <View className="grid_select" style={styles.grid_select}>
                                                                <Pressable
                                                                    className="all_posts_icon active"
                                                                    // onPress={}

                                                                    style={[
                                                                        styles.all_posts_icon,
                                                                        grid_select_active_menu === "posts" ? {backgroundColor: transparentize(BLUE_COLOR, 0.8)} : {}
                                                                    ]}
                                                                >
                                                                    <FontAwesome6
                                                                        name="buffer"
                                                                        size={25}
                                                                        color={grid_select_active_menu === "posts" ? BLUE_COLOR : DARK_BLUE_COLOR}
                                                                        style={grid_select_active_menu === "posts" ? {transform: [{ scale: 1.1 }]} : {}}
                                                                    />
                                                                </Pressable>

                                                                <Pressable
                                                                    className="saved_posts_icon"
                                                                    // onPress={}
                                                                    style={styles.saved_posts_icon}
                                                                >
                                                                    <FontAwesome6
                                                                        name="bookmark"
                                                                        size={25}
                                                                        solid={false}
                                                                        color={DARK_BLUE_COLOR}
                                                                    />
                                                                </Pressable>
                                                            </View>
                                                        )}

                                                        {profile && profile.private_account && logged_in_user?.id !== profile.id && !profile.has_follow ? (
                                                            <View className="private_account_notice" style={styles.private_account_notice}>
                                                                <FontAwesome6
                                                                    name="lock"
                                                                    size={40}
                                                                    color={BLUE_COLOR}
                                                                />

                                                                <Text style={styles.private_account_notice_text}>Tento účet je súkromný.</Text>
                                                            </View>
                                                        ) : (
                                                            <>
                                                                <View className="posts_container" style={styles.posts_container}>
                                                                    {profile.posts.length > 0 && (
                                                                        <View className="posts" style={styles.posts}>
                                                                            {profile.posts.map((one_post, index:number) => (
                                                                                !one_post.public_visibility && logged_in_user?.id !== profile.id && !profile.has_follow ? (
                                                                                    <View key={index} className="private_post_notice" style={styles.private_post_notice}>
                                                                                        <FontAwesome6
                                                                                            name="lock"
                                                                                            size={30}
                                                                                            color={transparentize(BLUE_COLOR, 0.25)}
                                                                                        />
                                                                                    </View>
                                                                                ) : (
                                                                                    <Pressable
                                                                                        key={one_post.media[0].id || index}
                                                                                        // onPress={}
                                                                                        accessibilityLabel="Zobraziť príspevok"
                                                                                        style={styles.post_link}
                                                                                    >
                                                                                        {one_post.media[0].is_video ? (
                                                                                            <View 
                                                                                                className="thumbnail"
                                                                                                accessibilityLabel={`Príspevok užívateľa ${profile.username}`}

                                                                                                style={{ 
                                                                                                    width: "100%", 
                                                                                                    height: "100%",
                                                                                                    aspectRatio: 1 / 1,
                                                                                                }}
                                                                                            >
                                                                                                <Image
                                                                                                    source={{ uri: `${DOMAIN}/media/${one_post.media[0].thumbnail}` }}

                                                                                                    style={{ 
                                                                                                        width: "100%", 
                                                                                                        height: "100%",
                                                                                                        aspectRatio: 1 / 1,
                                                                                                        resizeMode: "cover"
                                                                                                    }}
                                                                                                />
                                                                                            </View>
                                                                                        ) : (
                                                                                            <View 
                                                                                                className="image"
                                                                                                accessibilityLabel={`Príspevok užívateľa ${profile.username}`}

                                                                                                style={{ 
                                                                                                    width: "100%", 
                                                                                                    height: "100%",
                                                                                                    aspectRatio: 1 / 1,
                                                                                                }}
                                                                                            >
                                                                                                    <Image
                                                                                                        source={{ uri: `${DOMAIN}/media/${one_post.media[0].file}` }}

                                                                                                        style={{ 
                                                                                                            width: "100%", 
                                                                                                            height: "100%",
                                                                                                            aspectRatio: 1 / 1,
                                                                                                            resizeMode: "cover"
                                                                                                        }}
                                                                                                    />
                                                                                            </View>
                                                                                        )}

                                                                                        <View className="post_info" style={styles.post_info}>
                                                                                            {!one_post.public_visibility || !one_post.allow_comments || one_post.hide_likes && (
                                                                                                <View className="settings" style={styles.settings}>
                                                                                                    {!one_post.public_visibility && (
                                                                                                        <FontAwesome6
                                                                                                            name="eye-low-vision"
                                                                                                            size={15}
                                                                                                            color={BLUE_COLOR}
                                                                                                        />
                                                                                                    )}

                                                                                                    {!one_post.allow_comments && (
                                                                                                        <FontAwesome6
                                                                                                            name="comment-slash"
                                                                                                            size={15}
                                                                                                            color={BLUE_COLOR}
                                                                                                        />
                                                                                                    )}

                                                                                                    {one_post.hide_likes && (
                                                                                                        <FontAwesome6
                                                                                                            name="heart"
                                                                                                            size={15}
                                                                                                            solid={false}
                                                                                                            color={BLUE_COLOR}
                                                                                                        />
                                                                                                    )}
                                                                                                </View>
                                                                                            )}

                                                                                            {one_post.media.length > 1 && (
                                                                                                <View className="multiple_posts" style={styles.multiple_posts}>
                                                                                                    <Text style={styles.multiple_posts_text}>{one_post.media.length}</Text>

                                                                                                    <FontAwesome6
                                                                                                        name="buffer"
                                                                                                        size={15}
                                                                                                        color={BLUE_COLOR}
                                                                                                    />
                                                                                                </View>
                                                                                            )}
                                                                                        </View>
                                                                                    </Pressable>
                                                                                )
                                                                            ))}
                                                                        </View>
                                                                    )}

                                                                    {profile.posts.length === 0 && (
                                                                        <Text 
                                                                            className="no_posts"

                                                                            style={[
                                                                                styles.no_posts,
                                                                                logged_in_user?.id !== profile.id ? {marginTop: 0} : {}
                                                                            ]}
                                                                        >
                                                                            Zatiaľ žiadne príspevky.
                                                                        </Text>
                                                                    )}
                                                                </View>

                                                                <View className="saved_posts_container hidden" style={styles.posts_container}>
                                                                    {logged_in_user && profile.saved_posts && profile.saved_posts.length > 0 && logged_in_user.id === profile.id && (
                                                                        <View className="saved_posts" style={styles.posts}>
                                                                            {profile.saved_posts.map((one_post, index:number) => (
                                                                                <Pressable
                                                                                    key={one_post.media[0].id || index}
                                                                                    // onPress={}
                                                                                    accessibilityLabel="Zobraziť príspevok"
                                                                                >
                                                                                    {one_post.media[0].is_video ? (
                                                                                        <View 
                                                                                            className="thumbnail"
                                                                                            accessibilityLabel={`Príspevok užívateľa ${profile.username}`}
                                                                                            style={{ width: 150, height: 150 }}
                                                                                        >
                                                                                            <Image
                                                                                                source={{ uri: `${DOMAIN}/media/${one_post.media[0].thumbnail}` }}

                                                                                                style={{ 
                                                                                                    width: 150, 
                                                                                                    height: 150,
                                                                                                    aspectRatio: 1 / 1,
                                                                                                    resizeMode: "cover"
                                                                                                }}
                                                                                            />
                                                                                        </View>
                                                                                    ) : (
                                                                                        <View 
                                                                                            className="image"
                                                                                            accessibilityLabel={`Príspevok užívateľa ${profile.username}`}
                                                                                            style={{ width: 150, height: 150 }}
                                                                                        >
                                                                                            <Image
                                                                                                source={{ uri: `${DOMAIN}/media/${one_post.media[0].file}` }}

                                                                                                style={{ 
                                                                                                    width: 150, 
                                                                                                    height: 150,
                                                                                                    aspectRatio: 1 / 1,
                                                                                                    resizeMode: "cover"
                                                                                                }}
                                                                                            />
                                                                                        </View>
                                                                                    )}

                                                                                    {one_post.media.length > 1 && (
                                                                                        <View className="post_info" style={styles.post_info}>
                                                                                            <View className="multiple_posts" style={styles.multiple_posts}>
                                                                                                <Text style={styles.multiple_posts_text}>{one_post.media.length}</Text>

                                                                                                <FontAwesome6
                                                                                                    name="buffer"
                                                                                                    size={15}
                                                                                                    color={BLUE_COLOR}
                                                                                                />
                                                                                            </View>
                                                                                        </View>
                                                                                    )}
                                                                                </Pressable>
                                                                            ))}
                                                                        </View>
                                                                    )}

                                                                    {profile.saved_posts?.length === 0 && logged_in_user && logged_in_user.id === profile.id && (
                                                                        <Text className="no_saved_posts" style={styles.no_saved_posts}>Žiadne uložené príspevky.</Text>
                                                                    )}
                                                                </View>
                                                            </>

                                                            
                                                        )}
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View className="profile_page not_found" style={styles.profile_page}>
                                    <View className="profile_container" style={styles.profile_container}>
                                        <View className="options_container" style={styles.options_container}>
                                            <View className="back" accessibilityLabel="Späť na úvodnú stránku">
                                                <Icon
                                                    icon_name="chevron-left"
                                                    // onPress={}
                                                    size={30}
                                                    pressed_style={{ transform: [{ scale: 1.1 }] }}
                                                />
                                            </View>
                                        </View>

                                        <View className="profile_content" style={styles.profile_content}>
                                            <View className="profile" style={styles.profile}>
                                                <View className="header" style={styles.profile_header}>
                                                    <View className="top" style={styles.top}>
                                                        <View className="info" style={styles.profile_info}>
                                                            <View 
                                                                className="profile_picture_container"
                                                                style={styles.profile_picture_container}
                                                            >
                                                                <Image 
                                                                    className="profile_picture"
                                                                    source={require("../../../assets/images/profile_picture.png")} // Sets Profile Picture - https://www.flaticon.com/free-icon/user_3177440
                                                                    style={styles.profile_picture}
                                                                />
                                                            </View>

                                                            <View className="name" style={styles.name}>
                                                                <Text className="username" style={styles.profile_username}>Neexistujúci účet</Text>
                                                            </View>
                                                        </View>

                                                        <View className="streak" style={styles.streak}>
                                                            <FontAwesome6
                                                                name="fire"
                                                                size={20}
                                                                color={BLUE_COLOR}
                                                            />

                                                            <Text style={styles.streak_text}>0</Text>
                                                        </View>
                                                    </View>
                                                </View>

                                                <View className="middle">
                                                    <View className="follow_container" style={styles.follow_container}>
                                                        <View className="statistics" style={styles.statistics}>
                                                            <View className="followers" style={styles.followers}>
                                                                <Text className="amount" style={styles.followers_amount}>0</Text>
                                                                <Text className="label" style={styles.followers_label}>sledujú</Text>
                                                            </View>

                                                            <View className="following" style={styles.following}>
                                                                <Text className="amount" style={styles.following_amount}>0</Text>
                                                                <Text className="label" style={styles.following_label}>sleduje</Text>
                                                            </View>
                                                        </View>
                                                    </View>

                                                    <View className="badges_container" style={styles.badges_container}>
                                                        <View className="badges" style={styles.badges}>
                                                            <View 
                                                                className="badge level blue" 
                                                                accessibilityLabel="Level" 
                                                                style={styles.badge}
                                                            >
                                                                <FontAwesome6
                                                                    name="arrow-trend-up"
                                                                    size={20}
                                                                    color={BLUE_COLOR}
                                                                />

                                                                <Text>1</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>

                                                <View className="bottom" style={styles.bottom}>
                                                    {profile && profile.private_account && logged_in_user && logged_in_user.id !== profile.id && !profile.has_follow ? (
                                                        <View className="private_account_notice" style={styles.private_account_notice}>
                                                            <FontAwesome6
                                                                name="lock"
                                                                size={40}
                                                                color={BLUE_COLOR}
                                                            />

                                                            <Text style={styles.private_account_notice_text}>Tento účet je súkromný.</Text>
                                                        </View>
                                                    ) : (
                                                        <View className="posts_container" style={styles.posts_container}>
                                                            <Text className="no_posts" style={styles.no_posts}>Zatiaľ žiadne príspevky.</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}
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

    profile_page: {
        maxWidth: MAIN_WIDTH,
        marginHorizontal: "auto",
        paddingBottom: 40,

        // &.not_found {
        //     .profile_container .profile_content .profile .bottom {
        //         padding-top: 0px;
    
        //         .posts_container .no_posts {
        //             margin-top: 0px;
        //         }
        //     }
        // }
    },

    profile_container: {
        position: "relative",
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
        // overflow: "hidden",
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

    options_container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#333333",
    },

    profile_content: {
        position: "relative",
        minHeight: 200,
    },

    edit_account_form: {
        position: "relative",
        width: "100%",
        textAlign: "center",
        // transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;

        // &.hidden {
        //     position: absolute;
        //     top: 0px;
        //     left: 0px;
        //     width: 100%;
        //     transform: translateX(100%);
        //     opacity: 0;
        //     visibility: hidden;
        //     pointer-events: none;
        // }
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 20,
        padding: 20,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
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

    info: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
        minWidth: 0,
    },

    profile_picture_container: {
        padding: 2,
        borderWidth: 1,
        borderColor: LIGHT_BLUE_COLOR,
        borderRadius: 100,
    },

    profile_picture: {
        width: 64,
        height: 64,
        padding: 2,
        borderWidth: 1,
        borderColor: LIGHT_BLUE_COLOR,
        borderRadius: 64 / 2,
        cursor: "pointer",
        // transition: transform 0.3s ease;

        // &:hover {
        //     transform: scale(1.05);
        // }
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
        flex: 1,
        minWidth: 0,
        fontSize: 22,
        color: SECONDARY_COLOR,
        textAlign: "left",
    },

    friend_code: {
        textAlign: "left",
        marginBottom: 20,
        padding: 20,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        // font-size: 0.9em;
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover,
        // &:focus-visible {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        // }
    },

    friend_code_text: {
        fontWeight: "bold",
        color: BLUE_COLOR,
        letterSpacing: 1,
    },

    bio_container: {
        position: "relative",
        width: "100%",
        marginTop: 10,
        marginHorizontal: "auto",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: border-color 0.3s ease;

        // &:has(.bio:focus) {
        //     border-color: $blue-color;
        // }

        // &:hover {
        //     border-color: $blue-color;
        // }
    },

    bio: {
        width: "100%",
        minHeight: 100,
        // field-sizing: content;
        paddingVertical: 5,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
    },

    icons: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 25,
        paddingHorizontal: 10,
        backgroundColor: transparentize(BLUE_COLOR, 0.9),
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,
    },

    added_links_container: {
        // @include scrollbar($direction: "horizontal");
        flexDirection: "row",
        gap: 10,
        marginBottom: 20,
    },

    link: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        height: 25,
        marginTop: 5,
        marginBottom: 5,
        paddingHorizontal: 5,
        backgroundColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: border-color 0.3s ease;
        // animation: fadeInScale 0.3s ease-in forwards;

        // &.hidden {
        //     display: none;
        // }
    },

    link_anchor: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        fontSize: 15,
        color: BLUE_COLOR,
    },

    name_container: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 30,
        width: "90%",
        marginHorizontal: "auto",
    },

    first_name_container: {
        position: "relative",
        flex: 1,
    },

    first_name_icon: {
        position: "absolute",
        bottom: 10,
        left: -24,
        paddingTop: 19,
        paddingBottom: 16,
    },

    first_name: {
        position: "relative",
        width: "100%",
        height: 50,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    last_name_container: {
        position: "relative",
        flex: 1,
    },

    last_name_icon: {
        position: "absolute",
        bottom: 10,
        left: -24,
        paddingTop: 19,
        paddingBottom: 16,
    },

    last_name: {
        position: "relative",
        width: "100%",
        height: 50,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    contact_container: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 30,
        width: "90%",
        marginHorizontal: "auto",
    },

    email_address_container: {
        position: "relative",
        flex: 1,
    },

    email_address_icon: {
        position: "absolute",
        bottom: 10,
        left: -24,
        paddingTop: 19,
        paddingBottom: 16,
    },

    email_address: {
        position: "relative",
        width: "100%",
        height: 50,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    phone_number_container: {
        position: "relative",
        flex: 1,
    },

    phone_number_icon: {
        position: "absolute",
        bottom: 10,
        left: -24,
        paddingTop: 19,
        paddingBottom: 16,
    },

    phone_number: {
        position: "relative",
        width: "100%",
        height: 50,
        marginBottom: 10,
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;
    
        // &:hover,
        // &:focus {
        //     border-color: $blue-color;
        // }
    },

    flag: {
        position: "absolute",
        bottom: 21,
        right: -30,
        width: 24,
        opacity: 0.8,
        aspectRatio: 1 / 1,
        resizeMode: "cover",
        // transition: right 0.3s ease;
    },

    form_report: {
        position: "absolute",
        bottom: 123,
        alignSelf: "center",
    },

    edit_account_form_submit: {
        alignItems: "center",
        justifyContent: "center",
        width: "90%",
        height: 50,
        marginTop: 40,
        marginBottom: 10,
        marginHorizontal: "auto",
        paddingHorizontal: 10,
        textAlign: "center",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: scale(1.05);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }
    },

    form_questions: {
        marginTop: 10,
        color: SECONDARY_COLOR,
    },

    delete_account: {
        marginTop: 10,
        opacity: 0.6,
        // transition: transform 0.3s ease, opacity 0.3s ease;

        // &:hover {
        //     transform: scale(1.1);
        //     opacity: 1;
        //     cursor: pointer;
        // }
    },

    profile: {
        width: "100%",
        // transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;

        // &.hidden {
        //     position: absolute;
        //     top: 0px;
        //     left: 0px;
        //     width: 100%;
        //     transform: translateX(100%);
        //     opacity: 0;
        //     visibility: hidden;
        //     pointer-events: none;
        // }
    },

    profile_header: {
        gap: 10,
        marginBottom: 20,
        padding: 20,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
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

    top: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    profile_info: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flex: 1,
        minWidth: 0,
    },

    name: {
        gap: 2,
        minWidth: 0,
        textAlign: "left",
    },

    profile_username: {
        // @include crop_text;
        fontSize: 22,
        fontWeight: "semibold",
        // background: linear-gradient(135deg, $secondary-color 20%, lighten($blue-color, 15%) 60%, $blue-color 100%);
        // background-clip: text;
        // -webkit-background-clip: text;
        // -webkit-text-fill-color: transparent;
        color: SECONDARY_COLOR,
    },

    full_name: {
        // @include crop_text;
        // font-size: 0.9em;
        color: LIGHT_BLUE_COLOR,
    },

    streak: {
        userSelect: "none",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
        color: LIGHT_BLUE_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    },

    increased_streak: {
        backgroundColor: transparentize(YELLOW_COLOR, 0.9),
        color: YELLOW_COLOR,
        borderColor: transparentize(YELLOW_COLOR, 0.5),
        shadowColor: YELLOW_COLOR,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },

    streak_text: {
        lineHeight: 1,
        color: SECONDARY_COLOR,
    },

    profile_bio_container: {
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#333333",
    },

    profile_bio: {
        textAlign: "left",
        color: LIGHT_BLUE_COLOR,
    },

    links: {
        flexDirection: "row",
        gap: 10,
        marginTop: 10,
    },

    profile_link_anchor: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: 30 / 2,
        // transition: transform 0.2s ease;

        // &:hover {
        //     transform: translateY(-2px);

        //     i {
        //         color: $dark-blue-color
        //     }
        // }
    },

    follow_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        marginBottom: 20,
        padding: 20,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
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

    statistics: {
        flexDirection: "row",
        gap: 20,
    },

    followers: {
        textAlign: "center",
        cursor: "pointer",
    },

    followers_amount: {
        fontSize: 25,
        fontWeight: "bold",
        // lineHeight: 1,
        color: BLUE_COLOR,
    },

    followers_label: {
        // marginTop: 5,
        color: LIGHT_BLUE_COLOR,
        textTransform: "uppercase",
        fontSize: 15,
        letterSpacing: 0.5,
    },

    following: {
        textAlign: "center",
        cursor: "pointer",
    },

    following_amount: {
        fontSize: 25,
        fontWeight: "bold",
        // lineHeight: 1,
        color: BLUE_COLOR,
    },

    following_label: {
        // marginTop: 5,
        color: LIGHT_BLUE_COLOR,
        textTransform: "uppercase",
        fontSize: 15,
        letterSpacing: 0.5,
    },

    posts_amount: {
        fontSize: 25,
        fontWeight: "bold",
        // lineHeight: 1,
        color: BLUE_COLOR,
    },

    posts_label: {
        // marginTop: 5,
        color: LIGHT_BLUE_COLOR,
        textTransform: "uppercase",
        fontSize: 15,
        letterSpacing: 0.5,
    },

    show_follow_requests: {
        position: "relative",
        // transition: transform 0.3s ease;

        // &:hover {
        //     transform: scale(1.1);
        //     cursor: pointer;       
        // }
    },

    follow_requests_amount: {
        position: "absolute",
        top: -5,
        right: -8,
        lineHeight: 1,
        color: BLUE_COLOR,
    },

    // .statistics .followers_dialog,
    // .statistics .following_dialog,
    // .follow_requests_dialog {
    //     &::backdrop {
    //         background-color: transparentize($main-color, 0.5);
    //         backdrop-filter: blur(5px);
    //     }

    //     .all_followers,
    //     .all_followings,
    //     .all_follow_requests {
    //         @include position_center($position: fixed);
    //         @include scrollbar;
    //         display: flex;
    //         flex-direction: column;
    //         gap: 10px;
    //         max-width: $secondary-width;
    //         width: 100%;
    //         padding: 30px 50px 50px;
    //         border: 1px solid transparentize($blue-color, 0.5);
    //         border-radius: $medium-border-radius;
    //         box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
    //         overflow: hidden;

    //         &::before {
    //             @include circle_decoration($top: -250px, $left: -50px, $width: 400px, $height: 400px);
    //         }

    //         &::after {
    //             @include circle_decoration($bottom: -200px, $right: -50px, $width: 400px, $height: 400px);
    //         }

    //         h2 {
    //             margin-bottom: 30px;
    //             color: $secondary-color;
    //             font-size: 2.5em;
    //             text-align: center;
    //             animation: fadeInScale 0.3s ease-out;

    //             span {
    //                 font-size: inherit;
    //             }
    //         }

    //         .back {
    //             @include form_back;
    //         }

    //         .no_followers,
    //         .no_followings,
    //         .no_follow_requests {
    //             color: $secondary-color;

    //             &.hidden {
    //                 display: none;
    //             }
    //         }
            
    //         .one_follower,
    //         .one_following,
    //         .one_follow_request {
    //             display: flex;
    //             align-items: center;
    //             gap: 10px;

    //             a {
    //                 .profile_picture {
    //                     @include profile_picture($width: 38px, $height: 38px);
    //                     display: block;
    //                     transition: transform 0.3s ease;

    //                     &:hover {
    //                         transform: scale(1.05);
    //                     }
    //                 }
    //             }

    //             .username {
    //                 @include crop_text;
    //                 width: 250px;
    //                 color: $secondary-color;
    //                 text-align: left;
    //             }

    //             .approve,
    //             .reject {
    //                 all: unset;

    //                 i {
    //                     @include icon;
    //                     display: block;
    //                     font-size: 1.5em;
    //                 }
    //             }

    //             .approve {
    //                 margin-left: auto;
    //             }
    //         }

    //         .one_follower,
    //         .one_follow_request {
    //             transition: display 0.3s ease allow-discrete, transform 0.3s ease, opacity 0.3s ease;

    //             &.hidden {
    //                 display: none;
    //                 transform: translateX(-100%);
    //                 opacity: 0;
    //             }
    //         }
    //     }
    // }

    follow_button: {
        marginLeft: "auto",
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

    remove_follower: {
        marginLeft: "auto",
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

    message_container: {
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        justifyContent: "flex-end",
        marginBottom: 25,
        paddingVertical: 15,
        paddingHorizontal: 20,
        // background: linear-gradient(145deg, transparentize($blue-color, 0.95) 0%, transparentize($main-color, 0.95) 100%);
        // border: 1px solid $profile-surface-border;
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    unread_messages: {
        fontSize: 22,
        color: transparentize(SECONDARY_COLOR, 0.4),
    },

    // .message_container {
    //     a {
    //         display: inline-block;
    //         text-decoration: none;
    //         transition: transform 0.3s ease;

    //         &:hover {
    //             cursor: pointer;
    //             transform: translateY(-2px);
    //         }

    //         .fa-comment-dots {
    //             display: block;
    //             font-size: 2em;
    //             color: $blue-color;
    //         }
    //     }
    // }

    badges_container: {
        position: "relative",
        marginBottom: 40,
        padding: 10,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        overflow: "visible",
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover,
        // &:focus-visible {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        // }
    },

    badges: {
        flex: 1,
        width: "100%",
    },
    
    badges_content: {
        flexDirection: "column",
        alignContent: "flex-start",
        flexWrap: "wrap",
        gap: 10,
        height: 50 + 10 + 50 + 20,             
        padding: 10,
    },

    badge: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: 50,
        height: 50,
        borderWidth: 1,
        borderColor: transparentize(SECONDARY_COLOR, 0.8),
        borderRadius: 50 / 2,
        userSelect: "none",
        // transition: transform 0.3s ease;

        // &:hover {
        //     transform: scale(1.1);
        //     cursor: pointer;
        // }
    },

    badge_text: {
        position: "absolute",
        fontSize: 22,
        fontWeight: "bold",

        // span {
        //     text-align: center;
        // }
    },

    badge_icon: {
        opacity: 0.2,
    },

    badge_blue_rarity: {
        backgroundColor: transparentize(BLUE_RARITY, 0.85),
        color: BLUE_RARITY,
        borderColor: transparentize(BLUE_RARITY, 0.7),
        shadowColor: BLUE_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_green_rarity: {
        backgroundColor: transparentize(GREEN_RARITY, 0.85),
        color: GREEN_RARITY,
        borderColor: transparentize(GREEN_RARITY, 0.7),
        shadowColor: GREEN_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_yellow_rarity: {
        backgroundColor: transparentize(YELLOW_RARITY, 0.85),
        color: YELLOW_RARITY,
        borderColor: transparentize(YELLOW_RARITY, 0.7),
        shadowColor: YELLOW_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_orange_rarity: {
        backgroundColor: transparentize(ORANGE_RARITY, 0.85),
        color: ORANGE_RARITY,
        borderColor: transparentize(ORANGE_RARITY, 0.7),
        shadowColor: ORANGE_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_red_rarity: {
        backgroundColor: transparentize(RED_RARITY, 0.85),
        color: RED_RARITY,
        borderColor: transparentize(RED_RARITY, 0.7),
        shadowColor: RED_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_developer: {
        backgroundColor: transparentize(RED_RARITY, 0.85),
        color: RED_RARITY,
        borderColor: transparentize(RED_RARITY, 0.7),
        shadowColor: RED_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_purple_rarity: {
        backgroundColor: transparentize(PURPLE_RARITY, 0.85),
        color: PURPLE_RARITY,
        borderColor: transparentize(PURPLE_RARITY, 0.7),
        shadowColor: PURPLE_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_xp_text: {
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,

        // span {
        //     line-height: 1;
        //     font-weight: normal;
        // }
    },

    badge_subscriber: {
        backgroundColor: transparentize(YELLOW_RARITY, 0.85),
        color: YELLOW_RARITY,
        borderColor: transparentize(YELLOW_RARITY, 0.7),
        shadowColor: YELLOW_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_max_activity_streak: {
        backgroundColor: transparentize(YELLOW_RARITY, 0.85),
        color: YELLOW_RARITY,
        borderColor: transparentize(YELLOW_RARITY, 0.7),
        shadowColor: YELLOW_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_no_day_off_week: {
        backgroundColor: transparentize(YELLOW_RARITY, 0.85),
        color: YELLOW_RARITY,
        borderColor: transparentize(YELLOW_RARITY, 0.7),
        shadowColor: YELLOW_RARITY,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_xmas_activity: {
        backgroundColor: transparentize("#dc2626", 0.88),
        color: "#dc2626",
        borderColor: transparentize("#dc2626", 0.6),
        shadowColor: "#dc2626",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    badge_new_year_new_goals: {
        backgroundColor: transparentize("#eab308", 0.9),
        color: "#a57e05",
        borderColor: transparentize("#eab308", 0.5),
        shadowColor: "#eab308",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 4,
    },

    bottom: {
        position: "relative",
        paddingTop: 10,
    },

    grid_select: {
        // display: grid;
        // grid-template-columns: repeat(3, 1fr);
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 5,
        marginHorizontal: 5,
        marginBottom: 10,
        padding: 5,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    all_posts_icon: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        maxWidth: "31.5%",
        // marginHorizontal: "auto",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "transparent",
        textAlign: "center",
        borderRadius: SMALL_BORDER_RADIUS,
        // grid-column: 1;

        // &::before {
        //     display: none;
        // }

        // &:hover,
        // &:focus-visible,
        // &.active {
        //     cursor: pointer;
        //     background: transparentize($blue-color, 0.8);

        //     .fa-buffer,
        //     .fa-bookmark {
        //         color: $blue-color;
        //     }
        // }

        // &.active .fa-buffer,
        // &.active .fa-bookmark {
        //     transform: scale(1.1);
        // }
    },

    saved_posts_icon: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        maxWidth: "31.5%",
        // marginHorizontal: "auto",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "transparent",
        textAlign: "center",
        borderRadius: SMALL_BORDER_RADIUS,
        // grid-column: 3;

        // &::before {
        //     display: none;
        // }

        // &:hover,
        // &:focus-visible,
        // &.active {
        //     cursor: pointer;
        //     background: transparentize($blue-color, 0.8);

        //     .fa-buffer,
        //     .fa-bookmark {
        //         color: $blue-color;
        //     }
        // }

        // &.active .fa-buffer,
        // &.active .fa-bookmark {
        //     transform: scale(1.1);
        // }
    },

    posts_container: {
        // @include scrollbar;
        position: "relative",
        width: "100%",
        maxHeight: 130 * 3,
        // transition: transform 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;

        // &.hidden {
        //     position: absolute;
        //     top: 50px;
        //     left: 0px;
        //     width: 100%;
        //     transform: translateX(100%);
        //     opacity: 0;
        //     visibility: hidden;
        //     pointer-events: none;
        // }
    },

    posts: {
        // display: grid;
        // grid-template-columns: repeat(3, 1fr);
        flexDirection: "row",
        flexWrap: "wrap",
        // justifyContent: "center",
        gap: 10,
        margin: 5,
    },

    private_post_notice: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        // background: $profile-surface-hover;
        // border: 1px solid $profile-surface-border;
        backgroundColor: BLUE_COLOR,
        borderWidth: 1,
        borderColor: BLUE_COLOR,
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    post_link: {
        position: "relative",
        width: "31.5%",
        aspectRatio: 1 / 1,
        color: SECONDARY_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
        borderWidth: 1,
        borderColor: "transparent",
        overflow: "hidden",
        // transition: border-color 0.3s ease;

        // &:hover {
        //     border-color: transparentize($blue-color, 0.8);
        // }
    },

    post_image: {
        width: "100%",
        height: "100%",
        aspectRatio: 1 / 1,
        objectFit: "cover",
        // transition: filter 0.3s ease;
    
        // &:hover {
        //     filter: blur(2px) grayscale(0.8);
        //     cursor: pointer;
        // }
    },

    post_thumbnail: {
        width: "100%",
        height: "100%",
        aspectRatio: 1 / 1,
        objectFit: "cover",
        // transition: filter 0.3s ease;
    
        // &:hover {
        //     filter: blur(2px) grayscale(0.8);
        //     cursor: pointer;
        // }
    },

    post_info: {
        position: "absolute",
        top: 0,
        left: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 5,
        width: "100%",
        padding: 5,
    },

    settings: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 20,
        paddingHorizontal: 10,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        // backdrop-filter: blur(5px);
        color: LIGHT_BLUE_COLOR,
        // border: 1px solid $profile-surface-border;
        borderWidth: 1,
        borderColor: BLUE_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
    },

    multiple_posts: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 20,
        marginLeft: "auto",
        paddingHorizontal: 10,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        // backdrop-filter: blur(5px);
        color: LIGHT_BLUE_COLOR,
        // border: 1px solid $profile-surface-border;
        borderWidth: 1,
        borderColor: BLUE_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
    },

    multiple_posts_text: {
        fontSize: 15,
        fontWeight: "bold",
        color: SECONDARY_COLOR,
    },

    no_posts: {
        display: "none",
        marginTop: 15,
        textAlign: "center",
        // color: $light-blue-color;
        color: BLUE_COLOR,
    },

    no_saved_posts: {
        display: "none",
        marginTop: 15,
        textAlign: "center",
        // color: $light-blue-color;
        color: BLUE_COLOR,
    },

    private_account_notice: {
        textAlign: "center",
        padding: 20,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        // border: 1px solid $profile-surface-border;
        borderRadius: SMALL_BORDER_RADIUS,
    },

    private_account_notice_text: {
        marginTop: 10,
        color: LIGHT_BLUE_COLOR,
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