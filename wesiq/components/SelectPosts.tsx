import React, { useState } from "react"
import { Pressable, Alert } from "react-native"
import * as ImagePicker from "expo-image-picker"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { BLUE_COLOR, transparentize } from "@/constants/colors"

export default function SelectPosts() {
  const [is_pressed, setIsPressed] = useState(false) // Stores The Information If The Button Is Pressed

  const handleSelectMedia = async () => {
    const permission_result = await ImagePicker.requestMediaLibraryPermissionsAsync() // Gets The Permission Result

    if(!permission_result.granted) {
      // Shows The Alert
      Alert.alert(
        "Prístup zamietnutý", 
        "Pre výber fotiek a videí musíte povoliť prístup."
      )

      return
    }

    // Opens The Gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"], // Images And Videos
      allowsMultipleSelection: true, // Multiple Selection
      quality: 1
    })

    if(!result.canceled) {
      console.log("Vybrané súbory:", result.assets)
    }
  }

  return (
    <Pressable 
      onPress={handleSelectMedia} 
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      <FontAwesome6 name="photo-film" size={20} color={is_pressed ? BLUE_COLOR : transparentize(BLUE_COLOR, 0.5)} />
    </Pressable>
  )
}