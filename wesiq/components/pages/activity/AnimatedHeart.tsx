import { useEffect, useRef } from "react"
import { Animated } from "react-native"
import { RED_COLOR } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"

const AnimatedIcon = Animated.createAnimatedComponent(FontAwesome6) // Creates The Animated Icon

interface AnimatedHeartProps {
    bpm:number|null
}

export const AnimatedHeart = ({ bpm }:AnimatedHeartProps) => {
    const animated_scale:Animated.Value = useRef(new Animated.Value(1)).current // Animates The Scale

    // Initializes The Heart Beat Animation
    useEffect(() => {
        if(!bpm || bpm <= 0) {
            animated_scale.setValue(1) // Sets The Scale
            return
        }

        const beat_duration:number = (60 / bpm) * 1000 // Gets The Beat Duration

        // Fast Scale (30% Of The Time) And Slow Shrink (70% Of The Time)
        const pulse_animation = Animated.sequence([
            Animated.timing(animated_scale, {
                toValue: 1.25, // Scales By 25%
                duration: beat_duration * 0.3, // Fast Scale
                useNativeDriver: true,
            }),

            Animated.timing(animated_scale, {
                toValue: 1, // Default Scale
                duration: beat_duration * 0.7, // Slow Shrink
                useNativeDriver: true,
            }),
        ])

        const loop = Animated.loop(pulse_animation) // Creates The Loop Animation
        loop.start() // Starts The Loop

        return () => loop.stop()
    }, [bpm])

    return (
        <AnimatedIcon
            name="heart"
            size={20}
            solid={true}
            color={RED_COLOR}

            style={{
                transform: [{ scale: animated_scale }],
            }}
        />
    )
}