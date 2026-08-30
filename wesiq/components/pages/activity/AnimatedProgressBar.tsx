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
    bar: {
        position: "relative",
        flex: 1,
        height: 10,
        borderWidth: 1,
        borderColor: transparentize(SECONDARY_COLOR, 0.8),
        borderRadius: 10 / 2,
    },

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

    bar_label: {
        pointerEvents: "none",
        opacity: 0,
        // content: attr(data-exercise);
        position: "absolute",
        top: -5,
        left: "50%",
        transform: [{ translateX: "-50%" }],
        // width: calc(100% + 10px)
        textAlign: "center",
        fontSize: 15,
        lineHeight: 15,
        color: transparentize(SECONDARY_COLOR, 0.5),
        // text-overflow: ellipsis;
        // overflow: hidden;
        // transition: opacity 0.3s ease, transform 0.3s ease;
    },
})