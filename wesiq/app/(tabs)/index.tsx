import React, { useState } from "react"
import { View, StyleSheet, SafeAreaView } from "react-native"
import IconButton from "@/components/IconButton"
import BackgroundContainer from "@/components/BackgroundContainer"
import { DARK_BLUE_COLOR, transparentize } from "@/constants/colors"
import { BlurView } from "expo-blur"
import UploadPostFormDialog from "@/components/UploadPostFormDialog"

export default function HomeScreen() {
  const [isUploadPostFormDialogOpen, setIsUploadPostFormDialogOpen] = useState<boolean>(false) // Stores The Information If The Upload Post Form Dialog Is Open

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
          </View>
        </View>

        <View className="content" style={styles.content}>
          <UploadPostFormDialog 
            visible={isUploadPostFormDialogOpen}
            onClose={() => setIsUploadPostFormDialogOpen(false)}
          />
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
    padding: 20,
  },
})