import React, { useRef } from "react"
import { View, Text, PanResponder, Image, Pressable, StyleSheet } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"
import { DOMAIN } from "@/constants/general"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"

import type { Exercise } from "./ExerciseSelection"

interface ExerciseItemProps {
    one_exercise:Exercise,
    onSwipeUp:() => void,
    onSwipeDown:() => void
}

export const ExerciseItem = ({ one_exercise, onSwipeUp, onSwipeDown }:ExerciseItemProps) => {
    const pan_responder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder:() => true,
            onPanResponderRelease:(_, gesture_state) => {
                if(gesture_state.dy < -50) onSwipeUp() // Triggers The Swipe Up Event
                else if(gesture_state.dy > 50) onSwipeDown() // Triggers The Swipe Down Event
            }
        })
    ).current

    if(one_exercise.is_hidden) return null

    return (
        <View 
            {...pan_responder.panHandlers}
            key={one_exercise.id}
            className="exercise"
            // draggable="true" 
            style={styles.exercise}
        >
            {one_exercise.image_filename && (
                <Image 
                    source={{ uri: `${DOMAIN}/static/images/exercises/${one_exercise.image_filename}`}}
                    resizeMode="cover"

                    style={[
                        StyleSheet.absoluteFillObject,
                        { opacity: 0.2 },
                    ]}
                />
            )}

            <Text 
                className="name" 

                style={[{
                    textAlign: "center", 
                    color: SECONDARY_COLOR,
                    pointerEvents: "none",
                    userSelect: "none",
                }]}
            >
                {one_exercise.exercise}
            </Text>

            <View 
                className="weight_selection" 

                style={[
                    styles.weight_selection,
                    one_exercise.is_weight_selection_active ? { display: "flex" } : { display: "none" }
                ]}
            >
                {/* <Pressable
                    className="increase_weight"
                    // onPress={}
                >
                    <FontAwesome6
                        name="plus"
                        size={22}
                        color={SECONDARY_COLOR}
                    />
                </Pressable> */}

                <Text 
                    className="weight" 

                    style={[{
                        fontSize: 30, 
                        color: SECONDARY_COLOR,
                        pointerEvents: "none",
                        userSelect: "none",
                    }]}
                >
                    <Text>{one_exercise.weight}</Text>
                    <Text>kg</Text>
                </Text>

                {/* <Pressable
                    className="decrease_weight"
                    // onPress={}
                >
                    <FontAwesome6
                        name="minus"
                        size={22}
                        color={SECONDARY_COLOR}
                    />
                </Pressable> */}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    exercise: {
        // @include scrollbar;
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flexBasis: 100,
        flexGrow: 1,
        minWidth: 100,
        gap: 5,
        aspectRatio: 1 / 1,
        padding: 10,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        // cursor: move;
        overflow: "hidden",
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &.hidden {
        //     display: none !important;
        // }

        // &:hover, 
        // &:focus-visible {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);

        //     .name {
        //         filter: blur(2px);
        //     }
        // }
    },

    weight_selection: {
        position: "absolute",
        top: 0,
        left: 0,

        // transform: [
        //     { translateX: "-50%" },
        //     { translateY: "-50%" }
        // ],

        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        // backgroundColor: transparentize(MAIN_COLOR, 0.1),
    },
})