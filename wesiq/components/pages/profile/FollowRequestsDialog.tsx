import { View, StyleSheet, Text, Pressable, Modal, KeyboardAvoidingView, Platform, Alert } from "react-native"
import { BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { useTranslation } from "react-i18next"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BlurView } from "expo-blur"
import ProfilePictureLink from "@/components/ProfilePictureLink"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"

import type { BasicResponse } from "@/components/Feed"
import type { LoggedInUser } from "@/components/LoginFormDialog"

interface FollowRequestsDialogProps {
    visible:boolean,
    onClose:() => void,
    logged_in_user:LoggedInUser,
    onLoggedInUserUpdate:(logged_in_user:LoggedInUser) => void
}

export const FollowRequestsDialog = ({ 
    visible, 
    onClose,
    logged_in_user,
    onLoggedInUserUpdate
}:FollowRequestsDialogProps) => {
    const { t } = useTranslation() // Initializes The Translations

    // Function For Approve The Follow Request
    const approveFollowRequest = async (follow_request_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Žiadosť o sledovanie nie je možné potvrdiť bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const approve_follow_request_response:Response = await fetch(`${API_URL}/approve-follow-request/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({ follow_request_id })
            })

            // If The Response Isn't Success
            if(!approve_follow_request_response.ok) {
                console.log(t("Pri potvrdení žiadosti o sledovanie došlo k chybe.")) // Shows The Alert
                return
            }

            const approve_follow_request_data:BasicResponse = await approve_follow_request_response.json() // Gets The Approve Follow Request Data

            // If The Response Isn't Success
            if(!approve_follow_request_data.success) {
                console.log(approve_follow_request_data.message) // Shows The Alert
                return
            }

            // Stores The New State Of Updated Logged In User Follow Requests
            const updated_logged_in_user_follow_requests = logged_in_user.follow_requests.filter(one_follow_request => one_follow_request.from_user.id !== follow_request_id)
        
            // Sets The Logged In User
            onLoggedInUserUpdate({
                ...logged_in_user,
                follow_requests: updated_logged_in_user_follow_requests
            })
        } 
        
        catch (err) {
            console.log(err)
            console.log(t("Pri potvrdení žiadosti o sledovanie došlo k chybe.")) // Shows The Alert
        }
    }

    // Function For Reject The Follow Request
    const rejectFollowRequest = async (follow_request_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Žiadosť o sledovanie nie je možné zamietnuť bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const reject_follow_request_response:Response = await fetch(`${API_URL}/reject-follow-request/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({ follow_request_id })
            })

            // If The Response Isn't Success
            if(!reject_follow_request_response.ok) {
                console.log(t("Pri zamietnutí žiadosti o sledovanie došlo k chybe.")) // Shows The Alert
                return
            }

            const reject_follow_request_data:BasicResponse = await reject_follow_request_response.json() // Gets The Reject Follow Request Data

            // If The Response Isn't Success
            if(!reject_follow_request_data.success) {
                console.log(reject_follow_request_data.message) // Shows The Alert
                return
            }

            // Stores The New State Of Updated Logged In User Follow Requests
            const updated_profile_followers = logged_in_user.follow_requests.filter(one_follow_request => one_follow_request.from_user.id !== follow_request_id)
        
            // Sets The Logged In User
            onLoggedInUserUpdate({
                ...logged_in_user,
                follow_requests: updated_profile_followers
            })
        } 
        
        catch {
            console.log(t("Pri zamietnutí žiadosti o sledovanie došlo k chybe.")) // Shows The Alert
        }
    }

    return (
        <Modal
            className="follow_requests_dialog"
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable 
                onPress={onClose}

                style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                }} 
            >
                <BlurView intensity={25} style={StyleSheet.absoluteFill} />

                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: transparentize(MAIN_COLOR, 0.5) },
                    ]}
                />

                <Pressable 
                    onPress={(event) => event.stopPropagation()}

                    style={{
                        maxWidth: MAIN_WIDTH,
                        width: "100%",
                    }}
                >
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ width: "100%", alignItems: "center" }}
                    >
                        <View className="all_follow_requests" style={styles.all_follow_requests}>
                            <View style={styles.circle_decoration_before} />
                            <View style={styles.circle_decoration_after} />

                            <View style={styles.top}>
                                <View className="back" accessibilityLabel={t("Zavrieť")}>
                                    <Icon
                                        icon_name="chevron-left"
                                        onPress={onClose}
                                        size={30}
                                        pressed_style={{ transform: [{ scale: 1.1 }] }}
                                    />
                                </View>

                                <Text style={styles.heading}>{t("Žiadosti o sledovanie")} (<Text className="follow_requests_amount">{logged_in_user.follow_requests.length || 0}</Text>)</Text>
                            </View>

                            {logged_in_user.follow_requests.length === 0 && (
                                <Text 
                                    className="no_follow_requests" 

                                    style={{ 
                                        textAlign: "center",
                                        color: SECONDARY_COLOR,
                                    }}
                                >
                                    Žiadne žiadosti o sledovanie.
                                </Text>
                            )} 

                            {logged_in_user.follow_requests.map((one_follow_request, index:number) => (
                                <View key={index} className="one_follow_request" style={styles.one_follow_request}>
                                    <ProfilePictureLink 
                                        user_id={one_follow_request.from_user.id} 
                                        user_username={one_follow_request.from_user.username}
                                        user_profile_picture_name={one_follow_request.from_user.profile_picture_name || null} 
                                        user_subscription={one_follow_request.from_user.subscription?.is_active || false} 
                                        label={t("Zobraziť užívateľa")} 
                                    />

                                    <Text className="username" style={styles.username}>{one_follow_request.from_user.username}</Text>

                                    <View 
                                        className="approve" 
                                        accessibilityLabel="Schváliť"
                                        style={{ marginLeft: "auto" }}
                                    >
                                        <Icon 
                                            icon_name="check"
                                            onPress={() => approveFollowRequest(one_follow_request.id)}
                                            size={25}
                                        />
                                    </View>

                                    <View className="reject" accessibilityLabel="Zamietnuť">
                                        <Icon 
                                            icon_name="xmark"
                                            onPress={() => rejectFollowRequest(one_follow_request.id)}
                                            size={25}
                                        />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </KeyboardAvoidingView>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    all_follow_requests: {
        position: "fixed",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" }, 
            { translateY: "-50%" }
        ],

        gap: 10,
        maxWidth: MAIN_WIDTH,
        width: "100%",
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

    top: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        marginBottom: 30,
    },

    heading: {
        flex: 1,
        marginRight: 18.75 + 20,
        textAlign: "center",
        color: SECONDARY_COLOR,
        fontSize: 30,
        // animation: fadeInScale 0.3s ease-out;
    },

    one_follow_request: {
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
        width: 250,
        color: SECONDARY_COLOR,
    },
})