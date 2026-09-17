import React, { useState, useEffect, useRef, RefObject, useMemo } from "react"
import { View, Image, StyleSheet, Text, Pressable } from "react-native"
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av"
import { DOMAIN } from "@/constants/general"
import { Media, Post } from "./Feed"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"
import { BIG_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "./Icon"
import Slider from "@react-native-community/slider"
import { getFormattedTime } from "@/utils/time"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from "react-native-reanimated"

interface VideoMetricsProps {
    one_post_media:Media,
    is_video_metrics_open:boolean
}

export const VideoMetrics = ({ one_post_media, is_video_metrics_open }:VideoMetricsProps) => {
    const animation_progress = useSharedValue(0) // Stores The Animation Progress

    const average_watch_time:number = one_post_media.average_watch_time || 0 // Gets The Average Watch Time
    const video_duration:number = one_post_media.video_duration ? one_post_media.video_duration / 1000 : 0 // Gets The Video Duration
    
    const average_watch_time_ratio:number = video_duration > 0 ? Math.min(Math.max(average_watch_time / video_duration, 0), 1) : 0 // Gets The Average Watch Time Ratio (For Example 30% As 0.3)

    useEffect(() => {
        if(is_video_metrics_open) {
            animation_progress.value = 0 // Resets The Progress Of The Animation

            animation_progress.value = withTiming(1, {
                duration: 1000,
                easing: Easing.out(Easing.cubic),
            })
        } 
        
        else {
            animation_progress.value = 0 // Resets The Progress Of The Animation
        }
    }, [is_video_metrics_open])

    // Animates The Duration Bar
    const animated_duration_bar = useAnimatedStyle(() => ({
        width: `${animation_progress.value * 100}%`
    }))

    // Animates The Duration Label
    const animated_duration_label = useAnimatedStyle(() => ({
        left: `${animation_progress.value * 100}%`
    }))

    // Animates The Watch Time Bar
    const animated_watch_time_bar = useAnimatedStyle(() => ({
        width: `${animation_progress.value * average_watch_time_ratio * 100}%`
    }))

    // Animates The Watch Time Label
    const animated_watch_time_label = useAnimatedStyle(() => ({
        left: `${animation_progress.value * average_watch_time_ratio * 100}%`
    }))

    if(!is_video_metrics_open) return null

    return (
        <View className="video_metrics" style={styles.video_metrics}>
            <View className="views" style={styles.video_metrics_views}>
                <Icon
                    icon_name="eye"
                    size={15}
                    is_regular={true}
                />
                
                <Text className="views_counter" style={styles.video_metrics_views_counter}>{String(one_post_media.video_views || 0)}</Text>
            </View>

            <View className="duration_container" style={styles.duration_container}>
                <Animated.View className="duration_bar" style={[styles.duration_bar, animated_duration_bar]} />

                <Animated.Text className="duration_label" style={[styles.duration_label, animated_duration_label]}>
                    {video_duration > 0 ? (
                        `${getFormattedTime("minutes", video_duration)}:${getFormattedTime("seconds", video_duration, true)}`
                    ) : "0:00"}
                </Animated.Text>
            </View>

            <View className="watch_time_container" style={styles.watch_time_container}>
                <Animated.View className="watch_time_bar" style={[styles.watch_time_bar, animated_watch_time_bar]} />

                <Animated.Text className="watch_time_label" style={[styles.watch_time_label, animated_watch_time_label]}>
                    {video_duration > 0 ? (
                        `${getFormattedTime("minutes", average_watch_time)}:${getFormattedTime("seconds", average_watch_time, true)} - ${(average_watch_time_ratio * 100).toFixed(2)}%`
                    ) : "0%"}
                </Animated.Text>

                <View className="watch_time_bar" style={styles.watch_time_bar} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    video_metrics: {
        gap: 10,
        marginTop: 10,

        // &.hidden {
        //     display: none;
        // }
    },

    video_metrics_views: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    video_metrics_views_counter: {
        color: BLUE_COLOR,
    },

    duration_container: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        width: "50%",
    },

    duration_bar: {
        height: 5,
        backgroundColor: "#8EFA00",
        borderRadius: SMALL_BORDER_RADIUS,
    },

    duration_label: {
        // --offset: 10px;
        position: "absolute",
        top: "50%",
        // left: calc(var(--right) * 1% + var(--offset));
        left: "0%",
        transform: [{ translateY: "-50%" }],
        marginLeft: 8,
        color: BLUE_COLOR,
        fontSize: 12,
        // transition: left 1s ease;
    },

    watch_time_container: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        width: "50%",
    },

    watch_time_bar: {
        height: 5,
        backgroundColor: "#FA0080",
        borderRadius: SMALL_BORDER_RADIUS,
    },

    watch_time_label: {
        position: "absolute",
        top: "50%",
        // left: max(5px + var(--offset), calc(var(--right) * 1% + var(--offset)));
        left: "0%",
        transform: [{ translateY: "-50%" }],
        marginLeft: 8,
        color: BLUE_COLOR,
        fontSize: 12,
        // transition: left 1s ease;
    },
})