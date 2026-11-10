
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native"
import { useTranslation } from "react-i18next"
import { useEffect, useRef, useState } from "react"
import { BLUE_COLOR, DARK_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { LinearGradient } from "expo-linear-gradient"

import type { LoggedInUser } from "@/components/LoginFormDialog"

interface AnimatedSubscriptionButtonProps {
    logged_in_user:LoggedInUser|null,
    subscription_type:"basic"|"premium",
    onBasicSubscriptionPurchase?:() => void,
    onPremiumSubscriptionPurchase?:() => void
}

export default function AnimatedSubscriptionButton({
    logged_in_user,
    subscription_type,
    onBasicSubscriptionPurchase,
    onPremiumSubscriptionPurchase
}:AnimatedSubscriptionButtonProps) {
    const { t } = useTranslation() // Initializes The Translations

    const spin_animation_value:Animated.Value = useState(() => new Animated.Value(0))[0] // Stores The Spin Animation Value
    const press_animation_value:Animated.Value = useState(() => new Animated.Value(0))[0] // Stores The Press Animation Value

    // Initializes The Spin Animation
    useEffect(() => {
        // Function For Start The Spin Animation
        const startSpinAnimation = () => {
            spin_animation_value.setValue(0) // Resets The Spin Animation Value
            
            Animated.timing(spin_animation_value, {
                toValue: 1,
                duration: 4000, // 4 Seconds
                easing: Easing.linear,
                useNativeDriver: true
            }).start(({ finished }) => {
                if(finished) {
                    startSpinAnimation() // Loops The Animation
                }
            })
        }
    
        startSpinAnimation() // Starts The Spin Animation
    }, [])

    // Sets The Spin Animation
    const spin_animation:Animated.AnimatedInterpolation<string|number> = spin_animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"]
    })

    // Function For Handle The Press In
    const handlePressIn = () => {
        Animated.timing(press_animation_value, {
            toValue: 1,
            duration: 300, // 0.3 Seconds
            useNativeDriver: true
        }).start()
    }

    // Function For Handle The Press Out
    const handlePressOut = () => {
        Animated.timing(press_animation_value, {
            toValue: 0,
            duration: 300, // 0.3 Seconds
            useNativeDriver: true,
        }).start()
    }

    // Sets The Scale Animation
    const scale_animation:Animated.Interpolation<1|1.05> = press_animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05]
    })

    // Sets The Translate Animation
    const translate_animation:Animated.Interpolation<0|-2> = press_animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -2]
    })

    return (
        subscription_type === "premium" ? (
            <Animated.View 
                style={[
                    styles.glow_container,
                    
                    { 
                        transform: [
                            { scale: scale_animation }, 
                            { translateY: translate_animation }
                        ] 
                    }
                ]}
            >
                <Animated.View
                    style={[
                        styles.gradient_container,
                        { transform: [{ rotate: spin_animation }] }
                    ]}
                >
                    <LinearGradient
                        colors={[
                            BLUE_COLOR,
                            "transparent",
                            DARK_BLUE_COLOR,
                            "transparent",
                            BLUE_COLOR
                        ]}

                        locations={[0, 0.25, 0.5, 0.75, 1]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>

                <View style={styles.inner_glow_container}>
                    <Pressable
                        className={logged_in_user ? "subscribe" : "subscribe disabled"}
                        onPress={onPremiumSubscriptionPurchase}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        accessibilityRole="button"
                        disabled={!logged_in_user}
                        style={styles.premium_subscribe}
                    >
                        <Text style={{ color: SECONDARY_COLOR }}>{t("Predplatiť")}</Text>
                    </Pressable>
                </View>
            </Animated.View>
        ) : (
            <Animated.View 
                style={{ 
                    transform: [
                        { translateY: translate_animation }
                    ] 
                }}
            >
                <Pressable
                    className={logged_in_user ? "subscribe" : "subscribe disabled"}
                    onPress={onBasicSubscriptionPurchase}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    accessibilityRole="button"
                    disabled={!logged_in_user}
                    style={styles.subscribe}
                >
                    <Text style={{ color: SECONDARY_COLOR }}>{t("Predplatiť")}</Text>
                </Pressable>
            </Animated.View>
        )
    )
}

const styles = StyleSheet.create({
    subscribe: {
        // @include crop_text;
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease;
        
        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: translateY(-2px);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }

        // &.disabled {
        //     cursor: not-allowed;
        // }
    },

    premium_subscribe: {
        // @include crop_text;
        // @include glow_animated_border;
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        // background: linear-gradient(135deg, transparentize($blue-color, 0.35), transparentize($dark-blue-color, 0.55));
        color: SECONDARY_COLOR,
        // borderWidth: 1,
        // borderColor: BLUE_COLOR,
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease;
        
        // &:hover,
        // &:focus-visible {
        //     background: linear-gradient(135deg, transparentize($blue-color, 0.15), transparentize($dark-blue-color, 0.45));
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: translateY(-2px);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }

        // &.disabled {
        //     cursor: not-allowed;
        // }
    },

    glow_container: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center",
        width: "90%",
        height: 50,
        marginVertical: 10,
        borderRadius: MEDIUM_BORDER_RADIUS,
        overflow: "hidden",
    },

    gradient_container: {
        position: "absolute",
        width: 600,
        height: 600,
    },

    inner_glow_container: {
        position: "absolute",
        top: 2,
        bottom: 2,
        left: 2,
        right: 2,
        backgroundColor: transparentize(MAIN_COLOR, 0.1),
        borderRadius: MEDIUM_BORDER_RADIUS,
        overflow: "hidden",
    },
})