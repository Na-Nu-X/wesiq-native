import { useState, useEffect, JSX } from "react"
import { StyleSheet, Dimensions } from "react-native"
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, SharedValue } from "react-native-reanimated"
import { generateNumberRange } from "@/utils/generateNumberRange"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window") // Gets The Screen Dimensions
const CIRCLES_AMOUNT = 20 // Defines The Amount Of Circles
const COLORS = ["#011C6B33", "#01114233", "#01258F33", "#023BE633", "#0231BD33"] // Defines The Colors

const FloatingCircle = () => {
    const initial_values:{
        size:number,
        color:string,
        start_x:number,
        start_y:number,
        target_x:number,
        target_y:number,
        duration:number
    } = useState(() => {
        const radius:number = generateNumberRange(5, 10) // Sets The Random Radius

        return {
            size: radius * 2, // Gets The Size
            color: COLORS[Math.floor(Math.random() * COLORS.length)] || "#011C6B33", // Sets The Random Color
            start_x: generateNumberRange(0, SCREEN_WIDTH - radius * 2), // Sets The Random Start X Position
            start_y: generateNumberRange(0, SCREEN_HEIGHT - radius * 2), // Sets The Random Start Y Position
            target_x: generateNumberRange(0, SCREEN_WIDTH - radius * 2), // Sets The Random Target X Position
            target_y: generateNumberRange(0, SCREEN_HEIGHT - radius * 2), // Sets The Random Target Y Position
            duration: generateNumberRange(10000, 25000), // Sets The Random Duration
        }
    })[0]

    const translate_x:SharedValue<number> = useSharedValue(initial_values.start_x) // Gets The Translate X
    const translate_y:SharedValue<number> = useSharedValue(initial_values.start_y) // Gets The Translate Y

    // Initializes The Animation
    useEffect(() => {
        translate_x.value = withRepeat(
            withTiming(initial_values.target_x, {
                duration: initial_values.duration,
                easing: Easing.inOut(Easing.ease)
            }),

            -1, 
            true 
        )

        translate_y.value = withRepeat(
            withTiming(initial_values.target_y, {
                duration: initial_values.duration * 1.2, 
                easing: Easing.inOut(Easing.ease)
            }),

            -1,
            true
        )
    }, [])

    // Animates The Movement
    const animated_movement = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translate_x.value },
                { translateY: translate_y.value },
            ],
        }
    })

    return (
        <Animated.View
            style={[
                styles.circle,
                animated_movement,

                {
                    width: initial_values.size,
                    height: initial_values.size,
                    borderRadius: initial_values.size / 2,
                    backgroundColor: initial_values.color,
                },
            ]}
        />
    )
}

export function AnimatedBackground() {
    // Gets The Circles
    const circles:JSX.Element[] = Array.from({ length: CIRCLES_AMOUNT }).map((_, index) => (
        <FloatingCircle key={index} />
    ))

    return (
        <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
            {circles}
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    circle: {
        position: "absolute",
        top: 0,
        left: 0,
    },
})