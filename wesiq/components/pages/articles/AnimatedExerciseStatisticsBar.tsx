import { useEffect } from "react"
import { StyleSheet } from "react-native"
import { LIGHT_BLUE_COLOR } from "@/constants/colors"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withDelay } from "react-native-reanimated"

interface AnimatedExerciseStatisticsBarProps {
    text:string,
    percentage:number,
    delay?:number
}

export const AnimatedExerciseStatisticsBar = ({ text, percentage, delay = 0 }:AnimatedExerciseStatisticsBarProps) => {
    const MAX_WIDTH:number = 250 // Defines The Maximum Width Of The Bar
    const animation_progress = useSharedValue(0) // Stores The Animation Progress

    // Initializes The Animation
    useEffect(() => {
        animation_progress.value = 0 // Resets The Progress Of The Animation

        animation_progress.value = withDelay(
            delay,

            withTiming(1, {
                duration: 1000,
                easing: Easing.out(Easing.cubic)
            })
        )
    }, [percentage])

    // Animates The Bar
    const animated_bar = useAnimatedStyle(() => {
        const current_percentage:number = animation_progress.value * percentage // Gets The Current Percentage
        const hue:number = Math.round(120 - (current_percentage * 120 / 100)) // Gets The hue (120 - Easiest, 0 - Hardest)
        const calculated_width:number = (current_percentage / 100) * MAX_WIDTH // Calculates The Width

        return {
            width: calculated_width,
            backgroundColor: `hsl(${hue}, 80%, 50%)`
        }
    })

    // Animates The Label
    const animated_label = useAnimatedStyle(() => {
        const current_percentage:number = animation_progress.value * percentage // Gets The Current Percentage
        const calculated_width:number = (current_percentage / 100) * MAX_WIDTH // Calculates The Width
        
        return {
            left: calculated_width + 5
        }
    })

    return (
        <>
            <Animated.View 
                className="bar" 
                accessibilityLabel={text}
                style={[styles.bar, animated_bar]}
            />

            <Animated.Text 
                className="label" 
                style={[styles.bar_label, animated_label]}
            >
                {text}
            </Animated.Text>
        </>
    )
}

const styles = StyleSheet.create({
    bar: {
        height: 5,
        borderRadius: SMALL_BORDER_RADIUS,
    },

    bar_label: {
        position: "absolute",
        top: "50%",

        transform: [
            { translateY: "-50%" }
        ],

        fontSize: 12,
        opacity: 0.5,
        color: LIGHT_BLUE_COLOR,
        pointerEvents: "none",
    },
})