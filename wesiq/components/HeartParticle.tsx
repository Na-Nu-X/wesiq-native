import { RED_COLOR } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"
import React, { useEffect, useRef } from "react"
import { Animated, StyleSheet, View } from "react-native"

interface HeartParticleProps {
    x:number,
    y:number,
    is_regular:boolean,
    onComplete:() => void
}

const AnimatedView = Animated.createAnimatedComponent(View) // Creates The Animated View

export const HeartParticle = ({ x, y, is_regular, onComplete }:HeartParticleProps) => {
    const animation_value = useRef(new Animated.Value(0)).current // Stores The Animation Value

    useEffect(() => {
        Animated.timing(animation_value, {
            toValue: 1,
            duration: 800 + Math.random() * 200, // Animation Duration Between 800MS And 1000MS
            useNativeDriver: true
        }).start(onComplete)
    }, [])

    // Animates The Up Movement
    const translateY = animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: [0, y]
    })

    // Animates The Side Movement
    const translateX = animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: [0, x]
    })

    // Animates The Opacity
    const opacity = animation_value.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [1, 1, 0],
    })

    // Animates The Scale
    const scale = animation_value.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [0.5, 1, 0.8]
    })

    return (
        <AnimatedView
            style={[
                styles.particle_container,
                { transform: [{ translateX }, { translateY }, { scale }], opacity }
            ]}
        >
            <FontAwesome6 
                name="heart"
                size={20} 
                solid={!is_regular}
                color={RED_COLOR}
            />
        </AnimatedView>
    )
}

const styles = StyleSheet.create({
    particle_container: {
        position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },
})