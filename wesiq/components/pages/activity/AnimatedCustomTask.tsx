import { useEffect } from "react"
import { View, Text, StyleSheet } from "react-native"
import { CustomTaskCheckbox } from "./CustomTaskCheckbox"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { getFormattedDate } from "@/utils/time"
import { useTranslation } from "react-i18next"
import ReAnimated, { interpolate, interpolateColor, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated"

import type { CustomTask } from "./TasksSection"

export const CUSTOM_TASK_HEIGHT:number = 50 // Defines The Custom Task Height
export const CUSTOM_TASK_GAP:number = 10 // Defines The Custom Task Gap
export const CUSTOM_TASK_STRIDE:number = CUSTOM_TASK_HEIGHT + CUSTOM_TASK_GAP // Defines The Custom Task Stride

interface AnimatedCustomTaskProps {
    custom_task:CustomTask,
    onShowCustomTaskProperties?:() => void,
    is_floating?:boolean
}

export const AnimatedCustomTask = ({ custom_task, onShowCustomTaskProperties, is_floating = false }: AnimatedCustomTaskProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const animation_value:SharedValue<number> = useSharedValue(custom_task.is_completed ? 1 : 0) // Stores The Animation Value

    useEffect(() => {
        animation_value.value = withTiming(custom_task.is_completed ? 1 : 0, {
            duration: 300,
        })
    }, [animation_value, custom_task.is_completed])

    // Animates The Progress
    const animated_progress = useAnimatedStyle(() => {
        const width = interpolate(animation_value.value, [0, 1], [0, 100]) // Converts A Numeric Range To Percentages

        // Animates The Background Color
        const background_color = interpolateColor(
            animation_value.value,
            [0, 1],
            ["rgba(255, 207, 32, 0.1)", "rgba(82, 207, 32, 0.1)"] // Makes Color Transition For Progress Bar From rgba(255, 207, 32, 0.1) To rgba(82, 207, 32, 0.1)
        )

        // // Animates The Border Color
        // const border_color = interpolateColor(
        //     animation_value.value,
        //     [0, 1],
        //     [transparentize(BLUE_COLOR, 0.8), transparentize(GREEN_COLOR, 0.8)]
        // )

        return {
            width: `${width}%`,
            backgroundColor: background_color,
            // borderColor: border_color
        }
    })

    return (
        <View
            className="task"

            style={[
                styles.custom_task,
                is_floating && styles.floating_custom_task,
            ]}
        >
            <ReAnimated.View  
                style={[
                    StyleSheet.absoluteFill,
                    animated_progress,
                ]} 
            />

            <View pointerEvents="none">
                <CustomTaskCheckbox is_checked={custom_task.is_completed} />
            </View>

            <View 
                className="title" 
                pointerEvents="none"

                style={{ 
                    flex: 1,
                    justifyContent: "center",
                    height: "100%",
                }}
            >
                <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: SECONDARY_COLOR }}>{custom_task.title}</Text>
            </View>

            <Text className="date" style={styles.date}>{getFormattedDate(custom_task.created_at, false)}</Text>

            {!is_floating && onShowCustomTaskProperties && (
                <View 
                    className="show_custom_task_properties_button"
                    accessibilityLabel={t("Viac...")} 
                >
                    <Icon
                        icon_name="ellipsis-vertical"
                        onPress={onShowCustomTaskProperties}
                    />
                </View>
            )}
        </View>
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

    floating_custom_task: {
        elevation: 10,
        zIndex: 9999,
        overflow: "visible",
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
