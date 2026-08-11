import React, { useState } from "react"
import { View, StyleSheet, SafeAreaView, Modal, Text, KeyboardAvoidingView, Pressable } from "react-native"
import IconButton from "@/components/IconButton"
import BackgroundContainer from "@/components/BackgroundContainer"
import { MAIN_COLOR, SECONDARY_COLOR, BLUE_COLOR, DARK_BLUE_COLOR, transparentize } from "@/constants/colors"
import { BlurView } from "expo-blur"
import SelectPosts from "@/components/SelectPosts"
import { MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import { FontAwesome6 } from "@expo/vector-icons"

export default function HomeScreen() {
  const [isUploadPostFormDialogVisible, setIsUploadPostFormDialogVisible] = useState(false) // Stores The Information If The Upload Post Form Dialog Is Visible
  const [is_pressed, setIsPressed] = useState(false) // Stores The Information If The Button Is Pressed
  
  return (
    <BackgroundContainer>
      <SafeAreaView style={styles.safe_area}>
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
                  onPress={() => setIsUploadPostFormDialogVisible(true)}
                />
              </View>
  
              <View className="notifications">
                <IconButton 
                  icon_name="bell" 
                  onPress={() => console.log("Notifications clicked")} 
                />
              </View>
            </View>
          </View>
        </View>

        <View className="content" style={styles.content}>
          <Modal
            className="upload_post_form_dialog"
            visible={isUploadPostFormDialogVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsUploadPostFormDialogVisible(false)}
          >
            <View style={styles.backdrop}>
              <BlurView intensity={25} style={StyleSheet.absoluteFill} />

              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: transparentize(MAIN_COLOR, 0.5) },
                ]}
              />

              <KeyboardAvoidingView className="upload_post_form" style={styles.upload_post_form}>
                <View style={styles.circle_decoration_before} />
                <View style={styles.circle_decoration_after} />

                <View style={styles.top}>
                  <Pressable 
                    className="back"
                    onPress={() => setIsUploadPostFormDialogVisible(false)} 
                    onPressIn={() => setIsPressed(true)}
                    onPressOut={() => setIsPressed(false)}
                    style={is_pressed ? styles.pressed_back : null}
                  >
                    <FontAwesome6
                      name="chevron-left"
                      size={20}
                      color={is_pressed ? BLUE_COLOR : DARK_BLUE_COLOR}
                    />
                  </Pressable>

                  <Text className="heading" style={styles.heading}>Zdieľať príspevok</Text>
                </View>

                <View className="posts_preview" style={styles.posts_preview}>
                  <View className="select_posts_container" style={styles.select_posts_container}>
                    <SelectPosts></SelectPosts>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </BackgroundContainer>
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

  content: {

  },

  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  
  upload_post_form: {
    position: "relative",
    maxWidth: "100%",
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
    borderRadius: 200, // 400 / 2 = perfektný kruh
    backgroundColor: transparentize(BLUE_COLOR, 0.95),
    zIndex: -1,
  },
  
  circle_decoration_after: {

  },

  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 30,
  },

  back: {
    fontSize: 30,
  },

  pressed_back: {
    transform: [{ scale: 1.1 }],
  },

  heading: {
    color: SECONDARY_COLOR,
    fontSize: 30,
    // animation: fadeInScale 0.3s ease-out;
  },

  posts_preview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "100%",
    marginBottom: 20,
  },

  drag_active: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: transparentize(BLUE_COLOR, 0.5),
  },

  select_posts_container: {
    alignItems: "center",
    justifyContent: "center",
    width: 100,
    height: 100,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: transparentize(BLUE_COLOR, 0.5),
    borderRadius: SMALL_BORDER_RADIUS,
  },
})

// &::before {
//     @include circle_decoration($top: -250px, $left: -50px, $width: 400px, $height: 400px);
// }

// &::after {
//     @include circle_decoration($bottom: -200px, $right: -50px, $width: 400px, $height: 400px);
// }