import * as Notifications from "expo-notifications"
import IconButton from "@/components/IconButton"
import { BLUE_COLOR, SECONDARY_COLOR } from "@/constants/colors"
import { getFormattedTime } from "@/utils/time"
import { useEffect, useRef, useState } from "react"
import { View, Text, Animated, StyleSheet, Easing, Platform } from "react-native"
import Svg, { Circle } from "react-native-svg"
import { useTranslation } from "react-i18next"

interface BreakProps {
    time:number // Time In Seconds
    skipBreak:() => void
}

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false
    })
})

const AnimatedCircle = Animated.createAnimatedComponent(Circle) // Creates The Animated Circle

export const Break = ({ time, skipBreak }:BreakProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const notification_id = useRef<string|null>(null) // Stores The Notification ID

    const [remaining_time, setRemainingTime] = useState<number>(time) // Stores The RemainingTime
    const [max_remaining_time, setMaxRemainingTime] = useState<number>(time) // Stores The Max Remaining Time

    const animated_time = useRef(new Animated.Value(time)).current // Animates The Time
    const last_time = useRef<number>(time) // Stores The Last Time

    const RADIUS:number = 40 // Defines The Radius
    const CIRCUMFERENCE:number = 2 * Math.PI * RADIUS // Defines The Circumference

    // Initializes The Notification Permission Request
    useEffect(() => {
        // Function For Request The Notification Permissions
        const requestNotificationPermissions = async ():Promise<void> => {
            if(Platform.OS === "android") {
                await Notifications.setNotificationChannelAsync("break-alarm", {
                    name: "Break alarm",
                    importance: Notifications.AndroidImportance.MAX,
                    sound: "default",
                    vibrationPattern: [0, 250, 250, 250]
                })
            }
    
            const { status } = await Notifications.requestPermissionsAsync() // Gets The Permission Status
    
            if(status !== "granted") console.error(t("Notifikácie neboli povolené."))
        }
    
        requestNotificationPermissions() // Requests The Notification Permissions
    }, [])

    // Function For Schedule The Notification
    const scheduleNotification = async (seconds:number):Promise<void> => {
        try {
            if(notification_id.current) {
                await Notifications.cancelScheduledNotificationAsync(notification_id.current) // Cancels The Previous Notification
                notification_id.current = null // Removes The Notification ID
            }
    
            if (seconds <= 0) return
    
            // Setup The Notification And Gets Its ID
            const id:string = await Notifications.scheduleNotificationAsync({
                content: {
                    title: t("Čas prestávky vypršal!"),
                    body: t("Je čas pokračovať v tréningu. Poďme na to!"),
                    sound: "default"
                },

                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: Math.ceil(seconds),
                    repeats: false,

                    ...(Platform.OS === "android" && {
                        channelId: "break-alarm"
                    })
                }
            })
    
            notification_id.current = id // Sets The Notification ID
        } 
        
        catch {
            console.error(t("Pri plánovaní notifikácie došlo k chybe."))
        }
    }

    // Initializes The Timer
    useEffect(() => {
        const listener_id:string = animated_time.addListener(({ value }) => {
            const current_second:number = Math.ceil(value) // Gets The Current Second
            
            if(current_second !== last_time.current) {
                last_time.current = current_second // Sets The Last Time
                setRemainingTime(Math.max(0, current_second)) // Sets The Remaining Time
            }
        })

        scheduleNotification(time) // Schedules The Notification
        startAnimation(time) // Starts The Animation

        return () => {
            if(notification_id.current) Notifications.cancelScheduledNotificationAsync(notification_id.current) // Cancels The Previous Notification
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
                // skipBreak() // Skips The Break If The Countdown Has Passed
            }
        })
    }

    // Function For Add Time
    const addTime = ():void => {
        animated_time.stopAnimation((current_time:number):void => {
            const new_time:number = current_time + 30 // Gets The New Time
            
            if(new_time > max_remaining_time) setMaxRemainingTime(new_time) // Sets The Maximum Remaining Time
            
            animated_time.setValue(new_time)
            scheduleNotification(new_time) // Schedules The Notification
            startAnimation(new_time) // Starts The Animation
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

    const break_timer_text_color:string = remaining_time <= 10 ? "#df3535" : SECONDARY_COLOR // Gets The Break Timer Text Color

    return (
        <View className="break" style={styles.break}>
            <View className="add_time">
                <IconButton 
                    icon_name="plus" 
                    onPress={addTime} 
                />

                <Text className="add_time_message" style={styles.add_time_message}>+30s</Text>
            </View>

            <View className="break_timer" style={styles.break_timer}>
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
                    style={[
                        styles.break_timer_text,
                        { color: break_timer_text_color },
                    ]}
                >
                    <Text className="minutes">{String(minutes)}</Text> {/* Shows Remaining Minutes */}
                    :
                    <Text className="seconds">{getFormattedTime("seconds", seconds, true)}</Text> {/* Shows Remaining Seconds */}
                </Text>
            </View>

            <View className="skip_break_button">
                <IconButton 
                    icon_name="angle-right" 
                    onPress={skipBreak} 
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    break: {
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        paddingVertical: 50,
        paddingHorizontal: 10,
        zIndex: 100,
    },

    add_time: {
        overflow: "visible",
    },

    add_time_message: {
        visibility: "hidden",
        opacity: 0,
        position: "absolute",
        top: "0%",
        left: "50%",

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        textAlign: "center",
        color: BLUE_COLOR,
        zIndex: 200,

        // &.animate {
        //     animation: fadeOut 1s ease-out forwards;
        // }
    },

    break_timer: {
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

    break_timer_text: {
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