import { View, Text, StyleSheet, ScrollView, Image, Alert, Pressable, Switch } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useMemo, useRef, useState } from "react"
import Banner from "@/components/Banner"
import Icon from "@/components/Icon"
import { useLocalSearchParams } from "expo-router"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import { API_URL, DOMAIN } from "@/constants/general"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, GREEN_COLOR, RED_COLOR, transparentize } from "@/constants/colors"
import { isValidPhoneNumber } from "libphonenumber-js"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { MAIN_WIDTH } from "@/constants/dimensions"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"
import BadgesContainer from "@/components/pages/profile/BadgesContainer"
import EditAccountForm from "@/components/pages/profile/EditAccountForm"
import ProfileSection from "@/components/pages/profile/ProfileSection"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"
import type { BasicResponse } from "@/components/Feed"

interface ProfileResponse {
    success:boolean,
    is_found:boolean,
    user?:Profile,
    message:string
}

export interface Profile {
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
            id:number,
            first_name:string,
            last_name:string,
            username:string,
            profile_picture_name:string|null,
            private_account:boolean,

            subscription:{
                plan:string,
                is_active:boolean
            }|null
        },

        status:string,
        created_at:string
    }[],

    following:{
        to_user:{
            id:number,
            first_name:string,
            last_name:string,
            username:string,
            profile_picture_name:string|null,
            private_account:boolean,

            subscription:{
                plan:string,
                is_active:boolean
            }|null,

            has_follow:boolean,
            has_pending_follow_request:boolean,
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

export interface BioLink {
    id:number,
    url:string
}

export default function ProfileScreen() {
    const { t } = useTranslation() // Initializes The Translations
    
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [is_found, setIsFound] = useState<boolean>(false) // Stores The Information If The User Was Found
    const [profile, setProfile] = useState<Profile|null>(null) // Stores The Profile

    const account_properties = useRef<BottomSheetModal>(null) // Stores The Account Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [account_properties_sheet, setAccountPropertiesSheet] = useState<"main"|"report"|"suspend"|"account_settings">("main") // Stores The Active Account Properties Sheet

    const [active_section, setActiveSection] = useState<"profile"|"edit_account_form">("profile") // Stores The Information Which Section Is Active
    const [active_section_direction, setActiveSectionDirection] = useState<"forward"|"back">("forward") // Stores The Active Section Direction
    
    const { username } = useLocalSearchParams<{ username:string }>() // Gets The Username
    
    const [bio, setBio] = useState<string>("") // Stores The Bio
    const [bio_links, setBioLinks] = useState<BioLink[]>([]) // Stores The Bio
    
    const [selected_profile_picture, setSelectedProfilePicture] = useState<ImagePicker.ImagePickerAsset|null>(null) // Stores The Selected Profile Picture
    
    const [first_name, setFirstName] = useState<string>("") // Stores The First Name
    const [last_name, setLastName] = useState<string>("") // Stores The Last Name
    const [email_address, setEmailAddress] = useState<string>("") // Stores The Email Address
    const [phone_number, setPhoneNumber] = useState<string>("") // Stores The Phone Number
    const [is_phone_number_valid, setIsPhoneNumberValid] = useState<boolean>(false) // Stores The Information If The Phone Number Is Valid
    
    const [data_saving_mode, setDataSavingMode] = useState<boolean>(false) // Stores The Information If The Data Saving Mode Option Is Enabled
    const [private_account, setPrivateAccount] = useState<boolean>(false) // Stores The Information If The Private Account Option Is Enabled
    const [delete_profile_picture, setDeleteProfilePicture] = useState<boolean>(false) // Stores The Information If The Delete Profile Picture Option Is Enabled
    const [delete_account, setDeleteAccount] = useState<boolean>(false) // Stores The Information If The Delete Account Option Is Enabled
    
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

    // Function For Get The Profile
    const getProfile = async (username:string):Promise<void> => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
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
                Alert.alert(t("Chyba"), t("Pri získavaní profilu užívateľa došlo k chybe.")) // Shows The Alert
                return
            }

            const profile_data:ProfileResponse = await profile_response.json() // Gets The Profile Data

            // If The Response Isn't Success
            if(!profile_data.success || !profile_data.user) {
                Alert.alert(t("Chyba"), profile_data.message) // Shows The Alert
                return
            }
            
            else {
                console.log(profile_data)
                setIsFound(profile_data.is_found || false) // Sets The Information If The User Was Found
                setProfile(profile_data.user) // Sets The Profile
                if(profile_data.user.bio.trim()) setBio(profile_data.user.bio) // Sets The Bio
                setFirstName(profile_data.user.first_name || "") // Sets The Information If The Data Saving Mode Option Is Enabled
                setLastName(profile_data.user.last_name || "") // Sets The Information If The Data Saving Mode Option Is Enabled
                if(profile_data.user.email_address) setEmailAddress(profile_data.user.email_address) // Sets The Information If The Data Saving Mode Option Is Enabled

                if(profile_data.user.phone_number) {
                    setPhoneNumber(profile_data.user.phone_number) // Sets The Information If The Data Saving Mode Option Is Enabled
                    setIsPhoneNumberValid(isValidPhoneNumber(profile_data.user.phone_number)) // Sets The Information If The Phone Number Is Valid
                }

                setDataSavingMode(profile_data.user.data_saving_mode || false) // Sets The Information If The Data Saving Mode Option Is Enabled
                setPrivateAccount(profile_data.user.private_account) // Sets The Information If The Private Account Option Is Enabled
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri získavaní profilu užívateľa došlo k chybe.")) // Shows The Alert
        }
    }
    
    // Initializes The Load Of The Profile
    useEffect(() => {
        if(username) getProfile(username) // Gets The Profile
    }, [username])

    // Function For Change The Active Section
    const changeActiveSection = ():void => {
        if(active_section === "profile") {
            setActiveSectionDirection("forward") // Sets The Direction
            setActiveSection("edit_account_form") // Sets The Active Section
        }
        
        else {
            setActiveSectionDirection("back") // Sets The Direction
            setActiveSection("profile") // Sets The Active Section
        }
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

    // Function For Report The User
    const reportUser = async (user_id:number, reason:string):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Nahlásenie nie je možné odoslať bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const reported_user_response:Response = await fetch(`${API_URL}/report-user/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    reported_user_id: user_id,
                    reason: reason
                })
            })

            // If The Response Isn't Success
            if(!reported_user_response.ok) {
                Alert.alert(t("Chyba"), t("Pri odosielaní nahlásenia došlo k chybe.")) // Shows The Alert
                return
            }

            const reported_user_data:BasicResponse = await reported_user_response.json() // Gets The Reported User Data

            // If The Response Isn't Success
            if(!reported_user_data.success) {
                Alert.alert(t("Chyba"), reported_user_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert(t("Úspech"), reported_user_data.message) // Shows The Alert
                hideAccountProperties() // Closes The Account Properties
                return
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri odosielaní nahlásenia došlo k chybe.")) // Shows The Alert
        }
    }

    // Function For Suspend The User
    const suspendUser = async (user_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Nahlásenie nie je možné odoslať bez prihlásenia.")) // Shows The Alert
                return
            }

            if(!["admin", "developer"].includes(logged_in_user.role)) {
                Alert.alert(t("Chyba"), t("Užívateľa môže obmedziť len správca.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const suspended_user_response:Response = await fetch(`${API_URL}/suspend-user/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    user_id: user_id
                })
            })

            // If The Response Isn't Success
            if(!suspended_user_response.ok) {
                Alert.alert(t("Chyba"), t("Pri pokuse o obmedzenie užívateľa došlo k chybe.")) // Shows The Alert
                return
            }

            const suspended_user_data:BasicResponse = await suspended_user_response.json() // Gets The Suspended User Data

            // If The Response Isn't Success
            if(!suspended_user_data.success) {
                Alert.alert(t("Chyba"), suspended_user_data.message) // Shows The Alert
                return
            }
            
            else {
                Alert.alert(t("Úspech"), suspended_user_data.message) // Shows The Alert
                hideAccountProperties() // Closes The Account Properties
                return
            }
        }
        
        catch {
            Alert.alert(t("Chyba"), t("Pri pokuse o obmedzenie užívateľa došlo k chybe.")) // Shows The Alert
        }
    }

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
                    <BottomSheetModalProvider>
                        {is_found ? (
                            <View className="profile_page" style={styles.profile_page}>
                                <View className="profile_container" style={styles.profile_container}>
                                    <View style={styles.circle_decoration_before} />
                                    <View style={styles.circle_decoration_after} />

                                    <View className="options_container" style={styles.options_container}>
                                        <View className="back" accessibilityLabel={t("Späť na úvodnú stránku")}>
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
                                                    onPress={changeActiveSection}
                                                    size={30}
                                                    pressed_style={{ transform: [{ scale: 1.1 }] }}
                                                />
                                            </View>
                                        )}

                                        {(logged_in_user && profile && logged_in_user.id !== profile.id) && (
                                            <View className="show_account_properties_button" accessibilityLabel={t("Viac...")}>
                                                <Icon
                                                    icon_name="ellipsis-vertical"
                                                    onPress={showAccountProperties}
                                                />
                                            </View>
                                        )}
                                    </View>

                                    <View className="profile_content" style={styles.profile_content}>
                                        {active_section === "edit_account_form" && logged_in_user && profile && logged_in_user.id === profile.id && (
                                            <EditAccountForm 
                                                logged_in_user={logged_in_user}
                                                profile={profile}
                                                active_section_direction={active_section_direction}
                                                onBioUpdate={(bio:string) => setBio(bio)}
                                                bio={bio}
                                                onBioLinksUpdate={(bio_links:BioLink[]) => setBio(bio)}
                                                bio_links={bio_links}
                                                onSelectedProfilePictureUpdate={(selected_profile_picture:ImagePicker.ImagePickerAsset|null) => setSelectedProfilePicture(selected_profile_picture)}
                                                selected_profile_picture={selected_profile_picture}
                                                onFirstNameUpdate={(first_name:string) => setFirstName(first_name)}
                                                first_name={first_name}
                                                onLastNameUpdate={(last_name:string) => setLastName(last_name)}
                                                last_name={last_name}
                                                onEmailAddressUpdate={(email_address:string) => setEmailAddress(email_address)}
                                                email_address={email_address}
                                                onPhoneNumberUpdate={(phone_number:string) => setPhoneNumber(phone_number)}
                                                phone_number={phone_number}
                                                onSetIsPhoneNumberValid={(is_phone_number_valid:boolean) => setIsPhoneNumberValid(is_phone_number_valid)}
                                                is_phone_number_valid={is_phone_number_valid}
                                                data_saving_mode={data_saving_mode}
                                                private_account={private_account}
                                                delete_profile_picture={delete_profile_picture}
                                                delete_account={delete_account}
                                                onShowAccountProperties={showAccountProperties}
                                            />
                                        )}

                                        {active_section === "profile" && profile && (
                                            <ProfileSection 
                                                logged_in_user={logged_in_user}
                                                is_found={is_found}
                                                onProfileUpdate={(profile:Profile|null) => setProfile(profile)}
                                                profile={profile}
                                                active_section_direction={active_section_direction}
                                            />
                                        )}

                                        {profile && (
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
                                                                {logged_in_user && profile && logged_in_user.id === profile.id && (
                                                                    <Pressable
                                                                        className="show_account_settings_button"
                                                                        onPress={() => setAccountPropertiesSheet("account_settings")}
                                                                        accessibilityRole="button"

                                                                        style={({ pressed }) => [
                                                                            styles.sheet_item, 
                                                                            styles.sheet_item_border, 
                                                                            pressed && styles.sheet_item_pressed
                                                                        ]}
                                                                    >
                                                                        <View style={styles.sheet_icon}>
                                                                            <FontAwesome6
                                                                                name="gear"
                                                                                size={20}
                                                                                color={BLUE_COLOR}
                                                                            />
                                                                        </View>

                                                                        <Text style={styles.sheet_text}>{t("Nastavenia")}</Text>
                                                                    </Pressable>
                                                                )}

                                                                {/* If The Logged In User Is Developer Or Admin The Suspend Option Will Be Shown */}
                                                                {logged_in_user && (logged_in_user.role === "developer" || logged_in_user.role === "admin") && logged_in_user.id !== profile.id && (
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
                                                                            {t("Obmedziť")}
                                                                        </Text>
                                                                    </Pressable>
                                                                )}

                                                                {logged_in_user && logged_in_user.id !== profile.id && (
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

                                                                        <Text style={styles.sheet_text}>{t("Nahlásiť")}</Text>
                                                                    </Pressable>
                                                                )}

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

                                                                    <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
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
                                                                    {t("Naozaj chcete obmedziť tento účet?")}
                                                                </Text>

                                                                <Pressable
                                                                    onPress={() => suspendUser(profile.id)}
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

                                                                    <Text style={styles.sheet_text}>{t("Obmedziť")}</Text>
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

                                                                    <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
                                                                </Pressable>
                                                            </View>
                                                        )}

                                                        {account_properties_sheet === "report" && (
                                                            <View className="report report_profile" style={styles.sheet_container}>
                                                                <Pressable
                                                                    onPress={() => reportUser(profile.id, "spam")}
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
                        
                                                                    <Text style={styles.sheet_text}>{t("Spam")}</Text>
                                                                </Pressable>
                        
                                                                <Pressable
                                                                    onPress={() => reportUser(profile.id, "harassment")}
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
                        
                                                                    <Text style={styles.sheet_text}>{t("Obťažovanie")}</Text>
                                                                </Pressable>
                        
                                                                <Pressable
                                                                    onPress={() => reportUser(profile.id, "hate_speech")}
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
                        
                                                                    <Text style={styles.sheet_text}>{t("Nenávistné prejavy")}</Text>
                                                                </Pressable>
                        
                                                                <Pressable
                                                                    onPress={() => reportUser(profile.id, "misinformation")}
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
                        
                                                                    <Text style={styles.sheet_text}>{t("Dezinformácie")}</Text>
                                                                </Pressable>
                        
                                                                <Pressable
                                                                    onPress={() => reportUser(profile.id, "explicit_content")}
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
                        
                                                                    <Text style={styles.sheet_text}>{t("Explicitný obsah")}</Text>
                                                                </Pressable>
                        
                                                                <Pressable
                                                                    onPress={() => reportUser(profile.id, "other")}
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
                        
                                                                    <Text style={styles.sheet_text}>{t("Iné")}</Text>
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
                        
                                                                    <Text style={styles.sheet_text}>{t("Späť")}</Text>
                                                                </Pressable>
                                                            </View>
                                                        )}

                                                        {account_properties_sheet === "account_settings" && (
                                                            <View className="account_settings" style={styles.sheet_container}>
                                                                <View 
                                                                    className="data_saving_mode_container"

                                                                    style={[
                                                                        styles.sheet_item, 
                                                                        styles.sheet_item_border,
                                                                    ]}
                                                                >
                                                                    <View style={styles.sheet_icon}>
                                                                        <FontAwesome6
                                                                            name="signal"
                                                                            size={20}
                                                                            color={BLUE_COLOR}
                                                                        />
                                                                    </View>

                                                                    <Switch 
                                                                        value={data_saving_mode}
                                                                        onValueChange={(new_value:boolean) => setDataSavingMode(new_value)}
                                                                        
                                                                        trackColor={{ 
                                                                            false: transparentize(RED_COLOR, 0.8), 
                                                                            true: transparentize(GREEN_COLOR, 0.8) 
                                                                        }}
                                                                        
                                                                        thumbColor={data_saving_mode ? GREEN_COLOR : RED_COLOR}
                                                                    />

                                                                    <Text style={styles.sheet_text}>{t("Šetrenie dát")}</Text>
                                                                </View>

                                                                <View 
                                                                    className="private_account_container"

                                                                    style={[
                                                                        styles.sheet_item, 
                                                                        styles.sheet_item_border,
                                                                    ]}
                                                                >
                                                                    <View style={styles.sheet_icon}>
                                                                        <FontAwesome6
                                                                            name={!private_account ? "lock-open" : "lock"}
                                                                            size={20}
                                                                            color={BLUE_COLOR}
                                                                        />
                                                                    </View>

                                                                    <Switch 
                                                                        value={private_account}
                                                                        onValueChange={(new_value:boolean) => setPrivateAccount(new_value)}
                                                                        
                                                                        trackColor={{ 
                                                                            false: transparentize(RED_COLOR, 0.8), 
                                                                            true: transparentize(GREEN_COLOR, 0.8) 
                                                                        }}
                                                                        
                                                                        thumbColor={private_account ? GREEN_COLOR : RED_COLOR}
                                                                    />

                                                                    <Text style={styles.sheet_text}>{t("Súkromný účet")}</Text>
                                                                </View>

                                                                <View 
                                                                    className="delete_profile_picture_container"

                                                                    style={[
                                                                        styles.sheet_item, 
                                                                        styles.sheet_item_border,
                                                                    ]}
                                                                >
                                                                    <View style={styles.sheet_icon}>
                                                                        <FontAwesome6
                                                                            name="trash-can"
                                                                            size={20}
                                                                            color={BLUE_COLOR}
                                                                        />
                                                                    </View>

                                                                    <Switch 
                                                                        value={delete_profile_picture}
                                                                        onValueChange={(new_value:boolean) => setDeleteProfilePicture(new_value)}
                                                                        
                                                                        trackColor={{ 
                                                                            false: transparentize(RED_COLOR, 0.8), 
                                                                            true: transparentize(GREEN_COLOR, 0.8) 
                                                                        }}
                                                                        
                                                                        thumbColor={delete_profile_picture ? GREEN_COLOR : RED_COLOR}
                                                                    />

                                                                    <Text style={styles.sheet_text}>{t("Odstrániť profilový obrázok")}</Text>
                                                                </View>

                                                                <View 
                                                                    className="delete_account_container"

                                                                    style={[
                                                                        styles.sheet_item, 
                                                                        styles.sheet_item_border,
                                                                    ]}
                                                                >
                                                                    <View style={styles.sheet_icon}>
                                                                        <FontAwesome6
                                                                            name="user-minus"
                                                                            size={20}
                                                                            color={BLUE_COLOR}
                                                                        />
                                                                    </View>

                                                                    <Switch 
                                                                        value={delete_account}
                                                                        onValueChange={(new_value:boolean) => setDeleteAccount(new_value)}
                                                                        
                                                                        trackColor={{ 
                                                                            false: transparentize(RED_COLOR, 0.8), 
                                                                            true: transparentize(GREEN_COLOR, 0.8) 
                                                                        }}
                                                                        
                                                                        thumbColor={delete_account ? GREEN_COLOR : RED_COLOR}
                                                                    />

                                                                    <Text style={styles.sheet_text}>{t("Odstrániť účet")}</Text>
                                                                </View>

                                                                <Pressable
                                                                    className="back_account_settings_button"
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

                                                                    <Text style={styles.sheet_text}>{t("Zavrieť")}</Text>
                                                                </Pressable>
                                                            </View>
                                                        )}
                                                    </View>
                                                </BottomSheetView>
                                            </BottomSheetModal>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View className="profile_page not_found" style={styles.profile_page}>
                                <View className="profile_container" style={styles.profile_container}>
                                    <View className="options_container" style={styles.options_container}>
                                        <View className="back" accessibilityLabel={t("Späť na úvodnú stránku")}>
                                            <Icon
                                                icon_name="chevron-left"
                                                // onPress={}
                                                size={30}
                                                pressed_style={{ transform: [{ scale: 1.1 }] }}
                                            />
                                        </View>
                                    </View>

                                    <View className="profile_content" style={styles.profile_content}>
                                        <ProfileSection 
                                            logged_in_user={logged_in_user}
                                            is_found={is_found}
                                            onProfileUpdate={(profile:Profile|null) => setProfile(profile)}
                                            profile={profile}
                                            active_section_direction={active_section_direction}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}
                    </BottomSheetModalProvider>
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

    profile_page: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
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
        padding: 20,
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