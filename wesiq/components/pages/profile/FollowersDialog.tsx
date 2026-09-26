import { View, StyleSheet, Text, Pressable, Modal, KeyboardAvoidingView, Platform, Alert } from "react-native"
import { BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { useTranslation } from "react-i18next"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BlurView } from "expo-blur"
import ProfilePictureLink from "@/components/ProfilePictureLink"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"

import type { Profile } from "@/app/(tabs)/profile/[username]"
import type { BasicResponse } from "@/components/Feed"
import type { LoggedInUser } from "@/components/LoginFormDialog"

interface FollowersDialogProps {
    visible:boolean,
    onClose:() => void,
    profile:Profile,
    logged_in_user:LoggedInUser|null,
    onProfileUpdate:(profile:Profile|null) => void
}

export const FollowersDialog = ({ 
    visible, 
    onClose,
    profile,
    logged_in_user,
    onProfileUpdate
}:FollowersDialogProps) => {
    const { t } = useTranslation() // Initializes The Translations

    // Function For Remove The Follower
    const removeFollower = async (removed_follower_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert(t("Chyba"), t("Sledovateľa nie je možné odstrániť bez prihlásenia.")) // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const remove_follower_response:Response = await fetch(`${API_URL}/remove-follower/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({ removed_follower_id })
            })

            // If The Response Isn't Success
            if(!remove_follower_response.ok) {
                console.log(t("Pri odstraňovaní sledovateľa došlo k chybe.")) // Shows The Alert
                return
            }

            const remove_follower_data:BasicResponse = await remove_follower_response.json() // Gets The Toggle Post Like Data

            // If The Response Isn't Success
            if(!remove_follower_data.success) {
                console.log(remove_follower_data.message) // Shows The Alert
                return
            }

            // Stores The New State Of Updated Profile Followers
            const updated_profile_followers = profile.followers.filter(one_follower => one_follower.from_user.id !== removed_follower_id)
        
            // Sets The Profile
            onProfileUpdate({
                ...profile,
                followers: updated_profile_followers
            })
        } 
        
        catch {
            console.log(t("Pri odstraňovaní sledovateľa došlo k chybe.")) // Shows The Alert
        }
    }

    return (
        <Modal
            className="followers_dialog"
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
                        <View className="all_followers" style={styles.all_followers}>
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

                                <Text style={styles.heading}>{t("Sledovatelia")} (<Text className="followers_amount">{profile.followers.length || 0}</Text>)</Text>
                            </View>

                            {profile.followers.length === 0 && (
                                <Text 
                                    className="no_followers"

                                    style={{ 
                                        textAlign: "center",
                                        color: SECONDARY_COLOR,
                                    }}
                                >
                                    Žiadny sledovatelia.
                                </Text>
                            )} 

                            {profile.followers.map((one_follower, index:number) => (
                                <View key={index} className="one_follower" style={styles.one_follower}>
                                    <ProfilePictureLink 
                                        user_id={one_follower.from_user.id} 
                                        user_username={one_follower.from_user.username}
                                        user_profile_picture_name={one_follower.from_user.profile_picture_name || null} 
                                        user_subscription={one_follower.from_user.subscription?.is_active || false} 
                                        label={t("Zobraziť užívateľa")} 
                                    />

                                    <Text className="username" style={styles.username}>{one_follower.from_user.username}</Text>

                                    <Pressable 
                                        className="remove_follower" 
                                        onPress={() => removeFollower(one_follower.from_user.id)}
                                        style={styles.remove_follower}
                                    >
                                        <Text style={{ color: SECONDARY_COLOR }}>{t("Odstrániť")}</Text>
                                    </Pressable>
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
    all_followers: {
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

    one_follower: {
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

    remove_follower: {
        marginLeft: "auto",
        paddingVertical: 5,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
    },
})