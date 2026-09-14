import React, { useRef } from "react"
import { View, Text, PanResponder, Image, Pressable, StyleSheet } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"
import { DOMAIN } from "@/constants/general"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { Gesture, GestureDetector, Directions, ComposedGesture } from "react-native-gesture-handler"
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated"

import type { Exercise } from "./ExerciseSelection"

interface ExerciseItemProps {
    one_exercise:Exercise,
    onDragStart:(exercise:Exercise, x:number, y:number) => void,
    onDragMove:(x:number, y:number) => void,
    checkDropLocation:(x:number, y:number, exercise:Exercise) => void,
    onSwipeUp:() => void,
    onSwipeDown:() => void
}

export const ExerciseItem = ({ one_exercise, onDragStart, onDragMove, checkDropLocation, onSwipeUp, onSwipeDown }:ExerciseItemProps) => {
    const translateX = useSharedValue(0) // Stores The X Transform
    const translateY = useSharedValue(0) // Stores The Y Transform
    const scale = useSharedValue(1) // Stores The Scale

    // Creates The Swipe Up Gesture
    const swipe_up = Gesture.Fling()
        .direction(Directions.UP)
        .onStart(() => {
            runOnJS(onSwipeUp)() // Triggers The Swipe Up Event
        })

    // Creates The Swipe Down Gesture
    const swipe_down = Gesture.Fling()
        .direction(Directions.DOWN)
        .onStart(() => {
            runOnJS(onSwipeDown)() // Triggers The Swipe Down Event
        })

    // Creates The Drag Gesture (Starts After 250MS Hold)
    const drag = Gesture.Pan()
        .activateAfterLongPress(250)
        .onStart((event) => {
            scale.value = withSpring(1.05) // Scales The Item
            runOnJS(onDragStart)(one_exercise, event.absoluteX, event.absoluteY)
        })
        .onChange((event) => {
            runOnJS(onDragMove)(event.absoluteX, event.absoluteY);
            // translateX.value = event.translationX
            // translateY.value = event.translationY
        })
        .onFinalize((event) => {
            scale.value = withSpring(1) // Shrinks The Item
            runOnJS(checkDropLocation)(event.absoluteX, event.absoluteY, one_exercise)
            translateX.value = withSpring(0)
            translateY.value = withSpring(0)
        })

    // Animates The Exercise
    const animated_exercise = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],

        zIndex: scale.value > 1 ? 100 : 1, 

        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: scale.value > 1 ? 0.2 : 0,
        shadowRadius: 30,
        elevation: scale.value > 1 ? 10 : 0,
    }))

    const composed_gestures:ComposedGesture = Gesture.Race(swipe_up, swipe_down, drag) // Gets The Composed Gestures

    if(one_exercise.is_hidden) return null

    return (
        <GestureDetector gesture={composed_gestures}>
            <Animated.View 
                key={one_exercise.id}
                className="exercise"
                
                style={[
                    animated_exercise,
                    styles.exercise,
                ]}
            >
                {one_exercise.image_filename && (
                    <Image 
                        source={{ uri: `${DOMAIN}/static/images/exercises/${one_exercise.image_filename}`}}
                        resizeMode="cover"

                        style={[
                            StyleSheet.absoluteFill,
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
            </Animated.View>
        </GestureDetector>
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