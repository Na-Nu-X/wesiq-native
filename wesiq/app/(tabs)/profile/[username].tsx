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
import { BLUE_COLOR, DARK_BLUE_COLOR, GREEN_COLOR, RED_COLOR, transparentize } from "@/constants/colors"
import { isValidPhoneNumber } from "libphonenumber-js"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { MAIN_WIDTH } from "@/constants/dimensions"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"
import ProfileSection from "@/components/pages/profile/ProfileSection"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import Back from "@/components/Back"

import EditAccountSheet from "@/components/features/account/EditAccountSheet"
import type { Profile } from "@/types/models"
import type { ConnectionsTab } from "@/components/features/profile/ConnectionsSheet"
import type { BasicResponse } from "@/components/pages/community/Feed"
import type { LoggedInUser } from "@/types/models"

interface ProfileResponse {
    success:boolean,
    is_found:boolean,
    user?:Profile,
    message:string
}

export type { Profile, BioLink } from "@/types/models"


export default function ProfileScreen() {
    const { t, i18n } = useTranslation() // Initializes The Translations
    const language:string = i18n.language // Gets The Language
    
    const { logged_in_user, setLoggedInUser } = useLoggedInUser() // Gets The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [is_found, setIsFound] = useState<boolean>(false) // Stores The Information If The User Was Found
    const [profile, setProfile] = useState<Profile|null>(null) // Stores The Profile

    const account_properties = useRef<BottomSheetModal>(null) // Stores The Account Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [account_properties_sheet, setAccountPropertiesSheet] = useState<"main"|"report"|"suspend">("main") // Stores The Active Account Properties Sheet

    
    const { username } = useLocalSearchParams<{ username:string }>() // Gets The Username
    
    
    
    

    const [is_edit_account_open, setIsEditAccountOpen] = useState<boolean>(false) // Stores The Information If The Edit Account Sheet Is Open
    const [connections_tab, setConnectionsTab] = useState<ConnectionsTab|null>(null) // Stores The Open Tab Of The Followers / Following / Requests Sheet

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
                setIsFound(profile_data.is_found || false) // Sets The Information If The User Was Found
                setProfile(profile_data.user) // Sets The Profile
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri získavaní profilu užívateľa došlo k chybe.")) // Shows The Alert
        }
    }
    
    // Initializes The Load Of The Profile
    useEffect(() => {
        if(username) {
            getProfile(username) // Gets The Profile
            setConnectionsTab(null) // Closes The Followers / Following / Requests Sheet
            setIsEditAccountOpen(false) // Closes The Edit Account Sheet
        }
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
                {/* <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                /> */}

                <ScrollView 
                    className="content" 
                    style={styles.content} 

                    contentContainerStyle={{ 
                        justifyContent: "center",
                        flexGrow: 1,
                        padding: 20, 
                    }}

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
                                        <Back />

                                        {logged_in_user && profile && logged_in_user.id === profile.id && (
                                            <View className="toggle_settings" accessibilityRole="button" accessibilityLabel={t("Upraviť profil")}>
                                                <Icon
                                                    icon_name="gear"
                                                    onPress={() => setIsEditAccountOpen(true)}
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
                                        {profile && (
                                            <ProfileSection 
                                                logged_in_user={logged_in_user}
                                                is_found={is_found}
                                                onProfileUpdate={(profile:Profile|null) => setProfile(profile)}
                                                profile={profile}
                                                active_section_direction="forward"
                                                onLoggedInUserUpdate={(logged_in_user:LoggedInUser) => setLoggedInUser(logged_in_user)}
                                                connections_tab={connections_tab}
                                                onConnectionsTabChange={setConnectionsTab}
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
                                        <Back />
                                    </View>

                                    <View className="profile_content" style={styles.profile_content}>
                                        <ProfileSection 
                                            logged_in_user={logged_in_user}
                                            is_found={is_found}
                                            onProfileUpdate={(profile:Profile|null) => setProfile(profile)}
                                            profile={profile}
                                            active_section_direction="forward"
                                            onLoggedInUserUpdate={(logged_in_user:LoggedInUser) => setLoggedInUser(logged_in_user)}
                                            connections_tab={connections_tab}
                                            onConnectionsTabChange={setConnectionsTab}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}
                        {logged_in_user && profile && logged_in_user.id === profile.id && (
                            <EditAccountSheet
                                visible={is_edit_account_open}
                                onClose={() => setIsEditAccountOpen(false)}
                                profile={profile}
                                onSaved={() => { if(username) getProfile(username) }}
                            />
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
        // paddingBottom: 40,

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