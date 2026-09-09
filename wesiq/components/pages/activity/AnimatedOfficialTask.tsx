import React, { useEffect, useRef } from "react"
import { View, Text, StyleSheet, Animated } from "react-native"
import { BLUE_COLOR, GREEN_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { OfficialTaskCheckbox } from "./OfficialTaskCheckbox"

import type { OfficialTask } from "./TasksSection"

interface AnimatedOfficialTaskProps {
    official_task:OfficialTask
}

const AnimatedView = Animated.createAnimatedComponent(View) // Creates The Animated View

export const AnimatedOfficialTask = ({ official_task }:AnimatedOfficialTaskProps) => {
    const animation_value = useRef(new Animated.Value(official_task.is_completed ? 1 : 0)).current // Stores The Animation Value

    useEffect(() => {
        Animated.timing(animation_value, {
            toValue: official_task.is_completed ? 1 : 0,
            duration: 300,
            useNativeDriver: false
        }).start()
    }, [official_task.is_completed])

    // Converts A Numeric Range To Percentages
    const animated_width = animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"]
    })

    // Animates The Background Color
    const animated_background_color = animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: ["rgba(255, 207, 32, 0.1)", "rgba(82, 207, 32, 0.1)"] // Makes Color Transition For Progress From rgba(255, 207, 32, 0.1) To rgba(82, 207, 32, 0.1)
    })

    // Animates The Border Color
    const animated_border_color = animation_value.interpolate({
        inputRange: [0, 1],
        outputRange: [transparentize(BLUE_COLOR, 0.8), transparentize(GREEN_COLOR, 0.8)]
    })

    return (
        <AnimatedView 
            className="task"

            style={[
                styles.official_task, 
                { borderColor: animated_border_color }
            ]}
        >
            <AnimatedView 
                style={[
                    StyleSheet.absoluteFill,

                    {
                        width: animated_width,
                        backgroundColor: animated_background_color,
                    }
                ]} 
            />

            <OfficialTaskCheckbox is_checked={official_task.is_completed} />

            {official_task.data === "30_minutes_activity" && (<Text className="title" style={styles.title}>Zaznamenaj 30 minút aktivity.</Text>)}
            {official_task.data === "1_hour_activity" && (<Text className="title" style={styles.title}>Zaznamenaj 1h aktivity.</Text>)}
            {official_task.data === "2_hours_activity" && (<Text className="title" style={styles.title}>Zaznamenaj 2h aktivity.</Text>)}
            {official_task.data === "3_hours_activity" && (<Text className="title" style={styles.title}>Zaznamenaj 3h aktivity.</Text>)}
            {official_task.data === "beat_average_activity_time" && (<Text className="title" style={styles.title}>Prekonaj týždenný priemer času aktivity.</Text>)}
            {official_task.data === "complete_training_plan_activity" && (<Text className="title" style={styles.title}>Dokonči aktivitu podľa tréningového plánu.</Text>)}
            {official_task.data === "2_activities" && (<Text className="title" style={styles.title}>Zaznamenaj 2 aktivity.</Text>)}
            {official_task.data === "complete_all_official_tasks" && (<Text className="title" style={styles.title}>Splň všetky dnešné výzvy.</Text>)}
            {official_task.data === "add_custom_task" && (<Text className="title" style={styles.title}>Pridaj vlastnú úlohu.</Text>)}

            <View className="xp" style={styles.xp}>
                <Text 
                    style={{ 
                        color: GREEN_COLOR,
                        fontWeight: "bold",
                    }}
                >
                    {official_task.xp}
                </Text>

                <Text 
                    style={{ 
                        color: GREEN_COLOR,
                        fontSize: 15, 
                        opacity: 0.8,
                    }}
                >
                    XP
                </Text>
            </View>
        </AnimatedView>
    )
}

const styles = StyleSheet.create({
    official_task: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        // flexShrink: 0,
        // height: 50,
        paddingHorizontal: 15,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: SMALL_BORDER_RADIUS,
    },

    title: {
        // @include crop_text;
        flexGrow: 1,
        height: 50,
        lineHeight: 50,
        color: SECONDARY_COLOR,
    },

    xp: {
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        width: 40,
        paddingLeft: 15,
        // border-left: 1px solid $training-surface-border;
        borderLeftWidth: 1,
        borderLeftColor: "#333333"
    },
})