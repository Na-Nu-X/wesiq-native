import React, { useState, useRef } from "react"
import { Pressable, Alert, StyleSheet, Animated } from "react-native"
import * as ImagePicker from "expo-image-picker"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { BLUE_COLOR, transparentize } from "@/constants/colors"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"

type SelectPostsProps = {
  onMediaSelection:(media:ImagePicker.ImagePickerAsset[]) => void
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable) // Creates The Animated Pressable Element
const AnimatedIcon = Animated.createAnimatedComponent(FontAwesome6) // Creates The Animated Icon Element

export default function SelectPosts({ onMediaSelection }:SelectPostsProps) {
  const [is_pressed, setIsPressed] = useState(false) // Stores The Information If The Button Is Pressed
  const animation_value = useRef(new Animated.Value(0)).current // Stores The Animation Value

  // Function For Handle Press In
  const handlePressIn = () => {
    setIsPressed(true)

    Animated.timing(animation_value, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
    }).start()
  }

  // Function For Handle Press Out
  const handlePressOut = () => {
    setIsPressed(false)

    Animated.timing(animation_value, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  // Animates The Color
  const animated_color = animation_value.interpolate({
    inputRange: [0, 1],
    outputRange: [transparentize(BLUE_COLOR, 0.5), BLUE_COLOR]
  })

  // Animates The Scale
  const animated_scale = animation_value.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05]
  })

  // Function For Handle Media Selection
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
      onMediaSelection(result.assets) // Handles The Media Selection
    }
  }

  return (
    <AnimatedPressable 
      className="select_posts_container" 
      onPress={handleSelectMedia} 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}

      style={[
        styles.select_posts_container,
        {borderColor: animated_color},
        {transform: [{ scale: animated_scale }]}
      ]}
    >
      <AnimatedIcon
        name="photo-film"
        size={20}
        color={animated_color}
      />
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
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