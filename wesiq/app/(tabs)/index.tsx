import React, { useState } from "react"
import { View, StyleSheet, Pressable, Text, TouchableWithoutFeedback, Keyboard, ScrollView } from "react-native"
import IconButton from "@/components/IconButton"
import BackgroundContainer from "@/components/BackgroundContainer"
import { DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import { BlurView } from "expo-blur"
import UploadPostFormDialog from "@/components/UploadPostFormDialog"
import SearchUsers from "@/components/SearchUsers"
import Feed from "@/components/Feed"
import ProfilePictureLink from "@/components/ProfilePictureLink"
import LoginFormDialog from "@/components/LoginFormDialog"
import { SafeAreaView } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"

import type { LoggedInUser } from "@/components/LoginFormDialog"

export default function HomeScreen() {
  const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
  const [is_upload_post_form_dialog_open, setIsUploadPostFormDialogOpen] = useState<boolean>(false) // Stores The Information If The Upload Post Form Dialog Is Open
  const [is_login_form_dialog_open, setIsLoginFormDialogOpen] = useState<boolean>(false) // Stores The Information If The Login Form Dialog Is Open

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BackgroundContainer>
        <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
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
                <View className="upload_post">
                  <IconButton 
                    icon_name="photo-film" 
                    onPress={() => setIsUploadPostFormDialogOpen(true)}
                  />
                </View>
    
                <View className="notifications">
                  <IconButton 
                    icon_name="bell" 
                    onPress={() => console.log("Notifications clicked")} 
                  />
                </View>
              </View>
  
              <View className="right" style={styles.right}>
                {logged_in_user && (
                  <View className="account" style={styles.account}>
                    <ProfilePictureLink user_id={logged_in_user.id} user_profile_picture_name={logged_in_user.profile_picture_name || null} user_subscription={logged_in_user.subscription?.is_active || false} label="Môj účet" />
  
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
                      onPress={() => setIsLoginFormDialogOpen(true)}
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
  
          <ScrollView 
            className="content" 
            style={styles.content} 
            contentContainerStyle={{ padding: 20, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled" 
            keyboardDismissMode="on-drag"
          >
            <LoginFormDialog 
              visible={is_login_form_dialog_open}
              onClose={() => setIsLoginFormDialogOpen(false)}
              onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
            />
  
            <UploadPostFormDialog 
              visible={is_upload_post_form_dialog_open}
              onClose={() => setIsUploadPostFormDialogOpen(false)}
            />
  
            <SearchUsers />
  
            <Feed />
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

  content: {
    flex: 1,
  },
})