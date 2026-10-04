import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { useEffect, useRef } from "react"
import { Animated, Text, View, StyleSheet } from "react-native"

type TooltipProps = {
    text:string,
    orientation?:"top"|"right"
}

export const Tooltip = ({ text, orientation = "top" }:TooltipProps) => {
    const animated_scale = useRef(new Animated.Value(0)).current // Animates The Scale

    useEffect(() => {
        Animated.timing(animated_scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
        }).start()
    }, [animated_scale])

    const is_top_oriented:boolean = orientation === "top" // Checks If The Tooltip Is Top Oriented

    return (
        <Animated.View style={[
            styles.tooltip_container,
            is_top_oriented ? styles.tooltip_container_top : styles.tooltip_container_right,

            {
                transform: [
                    is_top_oriented ? { translateX: "-50%" } : { translateY: "-50%" },
                    { scale: animated_scale }
                ]
            }
        ]}>
            {!is_top_oriented && <View style={styles.tooltip_triangle_right} />}
            <Text style={styles.tooltip_body}>{text}</Text>
            {is_top_oriented && <View style={styles.tooltip_triangle_top} />}
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    tooltip_container: {
        position: "absolute",
        zIndex: 100,
    },

    tooltip_container_top: {
        bottom: 30,
        left: "50%",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
    },

    tooltip_container_right: {
        top: "50%",
        left: "100%",
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 10,
    },

    tooltip_body: {
        width: "100%",
        padding: 5,
        textAlign: "center",
        borderRadius: SMALL_BORDER_RADIUS,
        fontSize: 12,
        backgroundColor: transparentize(SECONDARY_COLOR, 0.8),
        color: SECONDARY_COLOR,
        overflow: "hidden",
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