import { SECONDARY_COLOR, transparentize } from "@/constants/colors"
import React, { useEffect, useRef } from "react"
import { Animated, StyleSheet } from "react-native"

interface AnimatedProgressBarProps {
    is_active:boolean,
    is_completed:boolean,
    percentage:number,
    red:number
}

export const AnimatedProgressBar = ({ is_active, is_completed, percentage, red }:AnimatedProgressBarProps) => {
    const animated_progress = useRef(new Animated.Value(0)).current // Animates The Progress

    // Initializes The Animation
    useEffect(() => {
        Animated.timing(animated_progress, {
            toValue: percentage,
            duration: 500,
            useNativeDriver: false
        }).start()
    }, [percentage])

    // Converts A Numeric Range To Percentages
    const animated_width = animated_progress.interpolate({
        inputRange: [0, 100],
        outputRange: ["0%", "100%"]
    })

    return (
        <Animated.View
            style={[
                styles.bar_progress,
                is_active ? styles.bar_progress_active : {},

                { 
                    width: animated_width, // Sets Progress
                    backgroundColor: `rgb(${red}, 207, 32)`,
                    shadowColor: `rgb(${red}, 207, 32)`
                }
            ]}
        />
    )
}

const styles = StyleSheet.create({
    bar_progress: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "0%",
        height: "100%",
        borderRadius: 10 / 2,
    },

    bar_progress_active: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
    },
})