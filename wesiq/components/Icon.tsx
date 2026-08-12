import React, { useState, useRef } from "react"
import { Pressable, StyleProp, ViewStyle, Animated } from "react-native"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"
import { BLUE_COLOR, DARK_BLUE_COLOR } from "@/constants/colors"

type IconProps = {
    icon_name:string,
    onPress?:() => void,
    size?:number,
    is_regular?:boolean,
    style?:StyleProp<ViewStyle>,
    pressed_style?:StyleProp<ViewStyle>,
    color?:string,
    pressed_color?:string
}

const AnimatedIcon = Animated.createAnimatedComponent(FontAwesome6) // Creates The Animated Icon

export default function Icon({ icon_name, onPress, size = 20, is_regular = false, style, pressed_style, color = BLUE_COLOR, pressed_color = DARK_BLUE_COLOR }:IconProps) {
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
        outputRange: [color, pressed_color]
    })

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[style, is_pressed && pressed_style]}
        >
            <AnimatedIcon
                name={icon_name}
                size={size}
                solid={!is_regular}
                color={animated_color}
            />
        </Pressable>
    )
}