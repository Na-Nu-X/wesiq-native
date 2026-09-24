import { useEffect, useRef } from "react"
import { View, Text, Pressable, StyleSheet, Animated } from "react-native"
import { CustomTaskCheckbox } from "./CustomTaskCheckbox"
import { BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { getFormattedDate } from "@/utils/time"
import { useTranslation } from "react-i18next"

import type { CustomTask } from "./TasksSection"

interface AnimatedCustomTaskProps {
    custom_task:CustomTask,
    onToggleCompleteCustomTask:() => void,
    onShowCustomTaskProperties:() => void
}

const AnimatedView = Animated.createAnimatedComponent(View) // Creates The Animated View

export const AnimatedCustomTask = ({ custom_task, onToggleCompleteCustomTask, onShowCustomTaskProperties }:AnimatedCustomTaskProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const animation_value = useRef(new Animated.Value(custom_task.is_completed ? 1 : 0)).current // Stores The Animation Value

    useEffect(() => {
        Animated.timing(animation_value, {
            toValue: custom_task.is_completed ? 1 : 0,
            duration: 300,
            useNativeDriver: false
        }).start()
    }, [custom_task.is_completed])

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
                styles.custom_task, 
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

            <CustomTaskCheckbox 
                is_checked={custom_task.is_completed} 
                onComplete={onToggleCompleteCustomTask}
            />

            <Pressable 
                className="title" 
                onPress={onToggleCompleteCustomTask}

                style={{ 
                    flex: 1,
                    justifyContent: "center",
                    height: "100%",
                    cursor: "pointer" 
                }}
            >
                <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: SECONDARY_COLOR }}>{custom_task.title}</Text>
            </Pressable>

            <Text className="date" style={styles.date}>{getFormattedDate(custom_task.created_at, false)}</Text>

            <View 
                className="show_custom_task_properties_button"
                accessibilityLabel={t("Viac...")} 
            >
                <Icon
                    icon_name="ellipsis-vertical"
                    onPress={onShowCustomTaskProperties}
                />
            </View>
        </AnimatedView>
    )
}

const styles = StyleSheet.create({
    custom_task: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
        height: 50,
        paddingHorizontal: 15,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: SMALL_BORDER_RADIUS,
        overflow: "hidden",

        // &.dragging {
        //     transform: scale(0.98);
        //     opacity: 0.8;
        // }
    },

    date: {
        userSelect: "none",
        width: 70,
        paddingLeft: 10,
        textAlign: "center",
        color: LIGHT_BLUE_COLOR,
        borderLeftWidth: 1,
        borderLeftColor: transparentize(BLUE_COLOR, 0.8),
        fontSize: 15,
        // font-variant-numeric: tabular-nums;
        // white-space: nowrap;
    },
})