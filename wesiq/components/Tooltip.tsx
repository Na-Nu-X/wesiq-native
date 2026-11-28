import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { useEffect, useState } from "react"
import { Animated, DimensionValue, Text, View, StyleSheet } from "react-native"

type TooltipProps = {
    text:string,
    orientation?:"top"|"right",
    width?:DimensionValue,
    top?:number
}

// Centering Uses Layout (Not A Percentage translateX): The Native Animated Driver On Android Crashes On Percentage Transforms
export const Tooltip = ({ text, orientation = "top", width = "100%", top = -10 }:TooltipProps) => {
    const animated_scale = useState(() => new Animated.Value(0))[0] // Animates The Scale

    // Initializes The Show Animation
    useEffect(() => {
        Animated.timing(animated_scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
        }).start()
    }, [animated_scale])

    const is_top_oriented:boolean = orientation === "top" // Checks If The Tooltip Is Top Oriented

    return (
        <View
            pointerEvents = "none"
            style = {[styles.tooltip_wrapper, is_top_oriented ? styles.tooltip_wrapper_top : styles.tooltip_wrapper_right, is_top_oriented ? { top } : null]}
        >
            <Animated.View
                style = {[
                    is_top_oriented ? styles.tooltip_container_top : styles.tooltip_container_right,
                    is_top_oriented ? { width } : null,
                    { transform: [{ scale: animated_scale }] },
                ]}
            >
                {!is_top_oriented &&
                    <View style = {styles.tooltip_triangle_right} />
                }
                <Text style = {[styles.tooltip_body, is_top_oriented ? styles.tooltip_body_top : null]}>{text}</Text>
                {is_top_oriented &&
                    <View style = {styles.tooltip_triangle_top} />
                }
            </Animated.View>
        </View>
    )
}

const styles = StyleSheet.create({
    tooltip_wrapper: {
        position: "absolute",
        zIndex: 100,
        elevation: 100, // Android Draws Siblings With Elevation Above zIndex
    },

    tooltip_wrapper_top: {
        left: 0,
        right: 0,
        alignItems: "center", // Centers The Tooltip Horizontally
    },

    tooltip_wrapper_right: {
        top: 0,
        bottom: 0,
        left: "100%",
        justifyContent: "center", // Centers The Tooltip Vertically
        marginLeft: 10,
    },

    tooltip_container_top: {
        flexDirection: "column",
        alignItems: "center",
    },

    tooltip_container_right: {
        flexDirection: "row",
        alignItems: "center",
    },

    tooltip_body: {
        padding: 5,
        textAlign: "center",
        borderRadius: SMALL_BORDER_RADIUS,
        fontSize: 12,
        backgroundColor: transparentize(SECONDARY_COLOR, 0.8),
        color: SECONDARY_COLOR,
        overflow: "hidden",
    },

    tooltip_body_top: {
        width: "100%",
    },

    tooltip_triangle_top: {
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderTopWidth: 10,
        borderTopColor: transparentize(SECONDARY_COLOR, 0.8),
        borderRightWidth: 10,
        borderRightColor: "transparent",
        borderBottomWidth: 0,
        borderLeftWidth: 10,
        borderLeftColor: "transparent",
    },

    tooltip_triangle_right: {
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderTopWidth: 10,
        borderTopColor: "transparent",
        borderRightWidth: 10,
        borderRightColor: transparentize(SECONDARY_COLOR, 0.8),
        borderBottomWidth: 10,
        borderBottomColor: "transparent",
        borderLeftWidth: 0,
    },
})
