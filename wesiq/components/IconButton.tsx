import { useState, useRef } from "react"
import { Pressable, StyleSheet, Animated } from "react-native"
import { BlurView } from "expo-blur"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { BLUE_COLOR, DARK_BLUE_COLOR } from "@/constants/colors"
import { BIG_BORDER_RADIUS } from "@/constants/borders"

type IconButtonProps = {
    icon_name:string,
    onPress?:() => void,
    size?:number,
    is_regular?:boolean
}

const AnimatedIcon = Animated.createAnimatedComponent(FontAwesome6) // Creates The Animated Icon

export default function IconButton({ icon_name, onPress, size = 20, is_regular = false }:IconButtonProps) {
    const [is_pressed, setIsPressed] = useState<boolean>(false) // Stores The Information If The Button Is Pressed
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
            duration: 0,
            useNativeDriver: false,
        }).start()
    }

    // Animates The Color
    const animated_color = animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: [BLUE_COLOR, DARK_BLUE_COLOR]
    })

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}

            style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed_button,
            ]}
        >
            <BlurView intensity={20} tint="light" style={styles.blur_container}>
                <AnimatedIcon
                    name={icon_name}
                    size={size}
                    solid={!is_regular}
                    style={{ color: animated_color }}
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