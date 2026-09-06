import { View, StyleSheet, Pressable, Text, TouchableWithoutFeedback, Keyboard, ScrollView } from "react-native"
import IconButton from "./IconButton"
import ProfilePictureLink from "./ProfilePictureLink"
import { DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, transparentize } from "@/constants/colors"
import { BlurView } from "expo-blur"

import type { LoggedInUser } from "@/components/LoginFormDialog"

interface BannerProps {
    logged_in_user:LoggedInUser|null
    setActiveForm:(active_form:"login_form"|"registration_form"|null) => void
    setIsUploadPostFormDialogOpen?:(is_open:boolean) => void
}

export default function Banner({ logged_in_user, setActiveForm, setIsUploadPostFormDialogOpen }:BannerProps) {
    return (
        <View style={styles.banner}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
  
            <View
                style={[
                    StyleSheet.absoluteFill, 
                    { backgroundColor: transparentize(DARK_BLUE_COLOR, 0.5) }
                ]} 
            />

            <View className="banner" style={styles.banner_content}>
                <View className="left" style={styles.left}>
                    {setIsUploadPostFormDialogOpen && (
                        <View className="upload_post">
                            <IconButton 
                                icon_name="photo-film" 
                                onPress={() => setIsUploadPostFormDialogOpen(true)}
                            />
                        </View>
                    )}
        
                    <View className="notifications">
                        <IconButton 
                            icon_name="bell" 
                            // onPress={} 
                        />
                    </View>
                </View>
    
                <View className="right" style={styles.right}>
                    {logged_in_user && (
                        <View className="account" style={styles.account}>
                            <ProfilePictureLink 
                                user_id={logged_in_user.id} 
                                user_profile_picture_name={logged_in_user.profile_picture_name || null} 
                                user_subscription={logged_in_user.subscription?.is_active || false} 
                                label="Môj účet" 
                            />
        
                            <Pressable
                                // onPress={handleGoToProfile}
                                accessibilityRole="button"
                                accessibilityLabel="Môj účet" 
                                >
                                {({ pressed }) => (
                                    <Text 
                                        className="username"
                
                                        style={[
                                            styles.username,
                                            pressed && { textDecorationLine: "underline" } 
                                        ]}
                                    >
                                        {logged_in_user.username}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    )}
        
                    {!logged_in_user && (
                        <View className="no_account" style={styles.no_account}>
                            <Pressable 
                                onPress={() => setActiveForm("login_form")}
                                accessibilityLabel="Prihlásiť sa"
                            >
                                {({ pressed }) => (
                                    <Text 
                                        className="login"
                
                                        style={[
                                            styles.login,
                                            pressed && { textDecorationLine: "underline" } 
                                        ]}
                                    >
                                        Neprihlásený
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    banner: {
        borderBottomWidth: 1,
        borderBottomColor: DARK_BLUE_COLOR,
        overflow: "hidden", 
    },

    banner_content: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        padding: 10,
    },

    left: {
        flexDirection: "row",
        gap: 10,
    },

    right: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 20,
        flex: 1,
    },

    account: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: 38,
    },

    username: {
        color: LIGHT_BLUE_COLOR,
    },

    no_account: {
        alignItems: "center",
        justifyContent: "center",
    },

    login: {
        color: LIGHT_BLUE_COLOR,
    },
})