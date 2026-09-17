import * as Notifications from "expo-notifications"
import IconButton from "@/components/IconButton"
import { BLUE_COLOR, SECONDARY_COLOR } from "@/constants/colors"
import { getFormattedTime } from "@/utils/time"
import React, { useEffect, useRef, useState } from "react"
import { View, Text, Animated, StyleSheet, Easing, Platform } from "react-native"
import Svg, { Circle } from "react-native-svg"

interface WarmUpProps {
    time:number // Time In Seconds
    skipWarmUp:() => void
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle) // Creates The Animated Circle

export const WarmUp = ({ time, skipWarmUp }:WarmUpProps) => {
    const [remaining_time, setRemainingTime] = useState<number>(time) // Stores The RemainingTime
    const [max_remaining_time, setMaxRemainingTime] = useState<number>(time) // Stores The Max Remaining Time

    const animated_time = useRef(new Animated.Value(time)).current // Animates The Time
    const last_time = useRef<number>(time) // Stores The Last Time

    const RADIUS:number = 40 // Defines The Radius
    const CIRCUMFERENCE:number = 2 * Math.PI * RADIUS // Defines The Circumference

    // Initializes The Timer
    useEffect(() => {
        const listener_id:string = animated_time.addListener(({ value }) => {
            const current_second:number = Math.ceil(value) // Gets The Current Second
            
            if(current_second !== last_time.current) {
                last_time.current = current_second // Sets The Last Time
                setRemainingTime(Math.max(0, current_second)) // Sets The Remaining Time
            }
        })

        startAnimation(time) // Starts The Animation

        return () => {
            animated_time.removeListener(listener_id)
            animated_time.stopAnimation()
        }
    }, [])

    // Function For Start The Animation
    const startAnimation = (duration:number):void => {
        Animated.timing(animated_time, {
            toValue: 0,
            duration: duration * 1000, 
            easing: Easing.linear,
            useNativeDriver: false,
        }).start(({ finished }) => {

            if(finished) {
                // skipWarmUp() // Skips The Warm Up If The Countdown Has Passed
            }
        })
    }

    // Gets The Stroke Dashoffset
    const stroke_dashoffset = animated_time.interpolate({
        inputRange: [0, max_remaining_time],
        outputRange: [CIRCUMFERENCE, 0], 
    })

    // Gets The Stroke Color
    const stroke_color = animated_time.interpolate({
        inputRange: [0, max_remaining_time],
        outputRange: ["rgb(255, 207, 32)", "rgb(82, 207, 32)"]
    })

    const minutes:number = Math.floor(remaining_time / 60) // Gets The Minutes
    const seconds:number = remaining_time % 60 // Gets The Seconds

    const warm_up_timer_text_color:string = remaining_time <= 10 ? "#df3535" : SECONDARY_COLOR // Gets The Warm Up Timer Text Color

    return (
        <View className="exercise warm_up" style={styles.warm_up}>
            <Text 
                className="title"

                style={[{
                    maxWidth: 350,
                    textAlign: "center",
                    color: SECONDARY_COLOR,
                }]}
            >
                Warm Up
            </Text>

            <View
                style={{ 
                    flexDirection: "row", 
                    alignItems: "center",
                    gap: 50,
                    flex: 1,
                    paddingBottom: 16 + 10, // 16 - Height Of The Title
                    paddingLeft: 50 + 38,
                }}
            >
                <View className="warm_up_timer" style={styles.warm_up_timer}>
                    <Svg width="100" height="100" viewBox="0 0 100 100">
                        <Circle
                            cx="50"
                            cy="50"
                            r={RADIUS}
                            fill="transparent"
                            stroke={BLUE_COLOR}
                            strokeWidth="3"
                        />
                
                        <AnimatedCircle
                            cx="50"
                            cy="50"
                            r={RADIUS}
                            fill="transparent"
                            stroke={stroke_color} 
                            strokeWidth="5"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={stroke_dashoffset} 
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                        />
                    </Svg>

                    <Text 
                        className="countdown"

                        style={[
                            styles.warm_up_timer_text,
                            { color: warm_up_timer_text_color },
                        ]}
                    >
                        <Text className="minutes">{String(minutes)}</Text> {/* Shows Remaining Minutes */}
                        :
                        <Text className="seconds">{getFormattedTime("seconds", seconds, true)}</Text> {/* Shows Remaining Seconds */}
                    </Text>
                </View>

                <View className="skip_warm_up_button">
                    <IconButton 
                        icon_name="angle-right" 
                        onPress={skipWarmUp}
                    />
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    warm_up: {
        // flexDirection: "row",
        alignItems: "center",
        // justifyContent: "space-between",
        justifyContent: "flex-start",
        flex: 1,
        // width: "100%",
        height: 200,
        paddingTop: 10,
        paddingHorizontal: 50,
        // transition: transform 0.5s ease;
        zIndex: 100,

        // &:not(.active) {
        //     position: absolute;
        //     top: 0px;
        //     transform: translateX(100%);

        //     .left {
        //         opacity: 0;
        //     }
        // }

        // .title {
        //     width: 50px;
        // }
    },

    warm_up_timer: {
        position: "relative",
        width: 100,
        height: 100,
        borderRadius: 50,

        // svg {
        //     position: absolute;
        //     top: 50%;
        //     left: 50%;
        //     transform: rotate(-90deg) translate(50%, -50%);
    
        //     &:nth-child(1) {
        //         z-index: 10;
        //     }
    
        //     .progress {
        //         fill: none;
        //         stroke-width: 5;
        //         stroke-linecap: round;
        //         stroke-linejoin: round;
        //     }
    
        //     .progress_background {
        //         fill: none;
        //         stroke: $blue-color;
        //         stroke-width: 3;
        //         stroke-dasharray: 2 4;
        //     }
        // }
    },

    warm_up_timer_text: {
        position: "absolute",
        top: "50%",
        left: "50%",

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        color: SECONDARY_COLOR,
        // font-family: $timer-font;
        fontSize: 22,

        // span {
        //     font-family: inherit;
        //     font-size: inherit;
        // }
    },
})