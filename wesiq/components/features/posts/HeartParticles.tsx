// Small Hearts That Burst Out Of The Like Button (The Original Wesiq Like Animation, On Reanimated)

import { useEffect } from "react"
import { StyleSheet } from "react-native"
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"
import { Icon } from "@/components/ui"

export interface HeartParticle {
    id:number,
    x:number, // Final Side Offset
    y:number, // Final Up Offset (Negative)
    duration:number,
    is_regular:boolean // Outline Or Filled Heart
}

// Function For Create A Random Burst (1 - 5 Hearts, Same Spread As The Original)
export const createHeartParticles = ():HeartParticle[] => {
    const amount:number = Math.floor(Math.random() * 5) + 1 // Between 1 And 5

    return Array.from({ length: amount }, (_, index:number):HeartParticle => ({
        id: Date.now() + index + Math.random(),
        x: (Math.random() * 90 + 20) * (Math.random() < 0.5 ? 1 : -1), // 20 - 110 To The Left Or Right
        y: -(Math.random() * 90 + 20), // 20 - 110 Up
        duration: 800 + Math.random() * 200, // 800 - 1000 MS
        is_regular: Math.random() > 0.5,
    }))
}

// One Flying Heart
function Particle({ particle, onComplete }:{ particle:HeartParticle, onComplete:(id:number) => void }) {
    const progress = useSharedValue<number>(0)

    // Initializes The Flight
    useEffect(() => {
        progress.set(withTiming(1, { duration: particle.duration }, (is_finished?:boolean) => {
            if(is_finished) scheduleOnRN(onComplete, particle.id)
        }))
    }, [progress, particle, onComplete])

    const animated_style = useAnimatedStyle(() => ({
        opacity: interpolate(progress.get(), [0, 0.7, 1], [1, 1, 0]),

        transform: [
            { translateX: progress.get() * particle.x },
            { translateY: progress.get() * particle.y },
            { scale: interpolate(progress.get(), [0, 0.2, 1], [0.5, 1, 0.8]) },
        ],
    }))

    return (
        <Animated.View pointerEvents="none" style={[styles.particle, animated_style]}>
            <Icon name="heart" size={20} color="danger" is_solid={!particle.is_regular} />
        </Animated.View>
    )
}

export default function HeartParticles({ particles, onComplete }:{ particles:HeartParticle[], onComplete:(id:number) => void }) {
    return particles.map((particle:HeartParticle) => <Particle key={particle.id} particle={particle} onComplete={onComplete} />)
}

const styles = StyleSheet.create({
    particle: {
        position: "absolute",
        zIndex: 10,
    },
})
