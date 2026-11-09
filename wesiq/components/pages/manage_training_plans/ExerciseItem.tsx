import { View, Text, Image, StyleSheet, Dimensions } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { DOMAIN } from "@/constants/general"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { Gesture, GestureDetector, Directions, ComposedGesture, PanGesture } from "react-native-gesture-handler"
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated"
import { BlurView } from "expo-blur"

import type { Exercise } from "./ExerciseSelection"

interface ExerciseItemProps {
    one_exercise:Exercise,
    onDragStart:(x:number, y:number, exercise:Exercise) => void,
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
            runOnJS(onDragStart)(event.absoluteX, event.absoluteY, one_exercise)
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

    const composed_gestures = Gesture.Race(swipe_up, swipe_down, drag) // Gets The Composed Gestures

    if(one_exercise.is_hidden) return null

    return (
        <GestureDetector gesture={one_exercise.requires_weight ? composed_gestures : drag}>
            <Animated.View 
                key={one_exercise.id}
                className="exercise"
                
                style={[
                    animated_exercise,
                    styles.exercise,
                ]}
            >
                <BlurView intensity={10} style={StyleSheet.absoluteFill} />

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

const screen_width:number = Dimensions.get("window").width // Gets The Screen Width
const PADDING:number = 40 // Defines The Padding
const exercise_width:number = (screen_width - PADDING - 20) / 3 // Gets The Exercise Width

const styles = StyleSheet.create({
    exercise: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        width: exercise_width, 
        height: exercise_width,
        padding: 10,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        overflow: "hidden",
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