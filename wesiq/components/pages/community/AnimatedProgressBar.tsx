import { SECONDARY_COLOR } from "@/constants/colors"
import { useEffect } from "react"
import { View, StyleSheet } from "react-native"
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor, Easing } from "react-native-reanimated"

interface AnimatedProgressBarProps {
    progress:number
}

export const AnimatedProgressBar = ({ progress }:AnimatedProgressBarProps) => {
    const animated_progress = useSharedValue(progress) // Animates The Progress

    useEffect(() => {
        animated_progress.value = withTiming(progress, {
            duration: 500,
            easing: Easing.linear, 
        })
    }, [progress])

    // Animates The Progress Bar
    const animated_progress_bar = useAnimatedStyle(() => {
        const color = interpolateColor(
            animated_progress.value,
            [0, 100],
            ["rgb(255, 207, 32)", "rgb(82, 207, 32)"] // Makes Color Transition For Progress Bar From rgb(255, 207, 32) To rgb(82, 207, 32)
        )

        return {
            width: `${animated_progress.value}%`,
            backgroundColor: color,
            shadowColor: color,
        }
    })

    // Animates The Progress Bar Label
    const animated_progress_bar_label = useAnimatedStyle(() => {
        return {
            width: `${animated_progress.value}%`,
        }
    })

    return (
        <View className="upload_progress" style={styles.upload_progress}>
            <Animated.View style={[styles.upload_progress_active, animated_progress_bar]} />
            <Animated.Text style={[styles.upload_progress_label, animated_progress_bar_label]}>{`${progress}%`}</Animated.Text>
        </View>
    )
}

const styles = StyleSheet.create({
    upload_progress: {
        // --progress: 0%;
        // --progress-color: rgb(255, 207, 32);
        position: "relative",
        top: 25,
        zIndex: 50,
    },

    upload_progress_active: {
        position: "absolute",
        // width: var(--progress);
        height: 5,
        // background-color: var(--progress-color);
        // box-shadow: 0px 0px 10px var(--progress-color);
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
        borderRadius: 5 / 2,
        // transition: width 0.5s linear, background-color 0.5s ease;
    },

    upload_progress_label: {
        position: "absolute",
        // top: calc(50% - 12px);
        top: "50%",
        transform: [{ translateY: "-50%" }],
        maxWidth: "100%",
        // width: var(--progress);
        paddingHorizontal: 10,
        textAlign: "right",
        // font-family: $article-heading-font;
        fontSize: 15,
        fontWeight: "bold",
        color: SECONDARY_COLOR,
        // mix-blend-mode: difference;
        // transition: width 0.5s linear;
    },
})