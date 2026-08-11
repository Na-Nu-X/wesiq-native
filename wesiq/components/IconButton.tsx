import React, { useState } from "react"
import { Pressable, StyleSheet } from "react-native"
import { BlurView } from "expo-blur"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { BLUE_COLOR, DARK_BLUE_COLOR } from "@/constants/colors"
import { BIG_BORDER_RADIUS } from "@/constants/borders"

type IconButtonProps = {
  icon_name:string,
  onPress?:() => void
}

export default function IconButton({ icon_name, onPress }:IconButtonProps) {
  const [is_pressed, setIsPressed] = useState(false) // Stores The Information If The Button Is Pressed

  return (
    <Pressable
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}

        style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed_button,
        ]}
    >
        <BlurView intensity={20} tint="light" style={styles.blur_container}>
            <FontAwesome6
                name={icon_name}
                size={20}
                color={is_pressed ? BLUE_COLOR : DARK_BLUE_COLOR}
            />
        </BlurView>
    </Pressable>
  )
}

const styles = StyleSheet.create({
    button: {
        width: 40,
        height: 40,
        borderWidth: 1,
        borderColor: DARK_BLUE_COLOR,
        borderRadius: BIG_BORDER_RADIUS,
        backgroundColor: "transparent",
        overflow: "hidden",
    },

    pressed_button: {
        transform: [{ translateY: -1 }],
    },
    
    blur_container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
})