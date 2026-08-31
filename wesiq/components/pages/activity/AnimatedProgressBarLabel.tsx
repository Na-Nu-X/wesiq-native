import React, { useEffect, useRef } from "react"
import { Animated, StyleProp, TextStyle } from "react-native"

interface AnimatedProgressBarLabelProps {
    text:string,
    style?:StyleProp<TextStyle>
}

export const AnimatedProgressBarLabel = ({ text, style }:AnimatedProgressBarLabelProps) => {
    const animation = useRef(new Animated.Value(0)).current // Stores The Animation

    // Initializes The Animation
    useEffect(() => {
        Animated.timing(animation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
        }).start()
    }, [])

    // Animates The Opacity
    const opacity = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5] 
    })

    // Animates The Y Translate
    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [10, 0]
    })

    return (
        <Animated.Text 
            style={[
                style, 

                { 
                    opacity: opacity,

                    transform: [
                        { translateX: "-50%" }, 
                        { translateY: translateY }
                    ] 
                }
            ]}
        >
            {text}
        </Animated.Text>
    )
}