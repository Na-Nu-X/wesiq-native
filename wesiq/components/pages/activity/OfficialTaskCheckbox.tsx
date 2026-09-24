import { BLUE_COLOR, MAIN_COLOR, transparentize } from "@/constants/colors"
import { DOMAIN } from "@/constants/general"
import { useEffect, useRef } from "react"
import { Animated, Image, StyleSheet, View } from "react-native"

interface OfficialTaskCheckboxProps {
    is_checked:boolean
}

const AnimatedView = Animated.createAnimatedComponent(View) // Creates The Animated ViewAnimatedView
const AnimatedImage = Animated.createAnimatedComponent(Image) // Creates The Animated Image

export const OfficialTaskCheckbox = ({ is_checked }:OfficialTaskCheckboxProps) => {
    const animation_value = useRef(new Animated.Value(0)).current // Stores The Animation Value

    useEffect(() => {
        Animated.timing(animation_value, {
            toValue: is_checked ? 1 : 0,
            duration: is_checked ? 300 : 200,
            useNativeDriver: true
        }).start()
    }, [is_checked])

    // Animates The Border Color
    const border_color = animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: [transparentize(BLUE_COLOR, 0.8), "#23a96d"]
    })

    // Animates The Scale
    const scale = animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1.5]
    })

    // Animates The Opacity
    const opacity = animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1]
    })

    return (
        <AnimatedView 
            className="checkbox"

            style={[
                styles.checkbox,
                { borderColor: border_color }
            ]}
        >
            <AnimatedImage 
                source={{ uri: `${DOMAIN}/static/images/check.png`}}
                resizeMode="contain"

                style={[
                    styles.check_icon,

                    {
                        transform: [{ scale: scale }],
                        opacity: opacity
                    }
                ]}
            />
        </AnimatedView>
    )
}

const styles = StyleSheet.create({
    checkbox: {
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: 15,
        height: 15,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
    },
    
    check_icon: {
        position: "absolute",
        width: "100%",
        height: "100%",
    },
})