import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { useEffect, useRef } from "react"
import { Animated, Text, View, StyleSheet } from "react-native"

type TooltipProps = {
    text:string
}

export const Tooltip = ({ text }: TooltipProps) => {
    const animated_scale = useRef(new Animated.Value(0)).current // Animates The Scale

    useEffect(() => {
        Animated.timing(animated_scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
        }).start()
    }, [animated_scale])

    return (
        <Animated.View style={[
            styles.tooltip_container, 
            { transform: [{ translateX: "-50%" }, { scale: animated_scale }] }
        ]}>
            <Text style={styles.tooltip_body}>{text}</Text>
            <View style={styles.tooltip_triangle} />
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    tooltip_container: {
        position: "absolute",
        bottom: 30,
        left: "50%",
        alignItems: "center",
        maxWidth: "100%",
        width: "100%",
        zIndex: 100,
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

    tooltip_triangle: {
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderTopWidth: 10,
        borderTopColor: transparentize(SECONDARY_COLOR, 0.8),
        borderRightWidth: 10,
        borderRightColor: "transparent",
        borderLeftWidth: 10,
        borderLeftColor: "transparent",
    },
})