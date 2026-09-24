import { View, StyleSheet, Alert, TextInput, ScrollView } from "react-native"
import { useEffect, useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import Icon from "@/components/Icon"
import { ExerciseItem } from "./ExerciseItem"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated"
import { useTranslation } from "react-i18next"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"

interface LoadedExercisesResponse {
    success:boolean, 
    exercises:Exercise[],
    message:string
}

export interface Exercise {
    id:number,
    exercise:string,
    unit:"reps"|"seconds"|"steps",
    categories:string[]
    requires_weight:boolean,
    image_filename?:string,
    
    is_hidden:boolean,
    weight:number|null,
    is_weight_selection_active:boolean|null
}

type ExerciseSelectionProps = {
    onDragStart:(x:number, y:number, exercise:Exercise|"custom_exercise"|"warm_up") => void,
    onDragMove:(x:number, y:number) => void,
    checkDropLocation:(x:number, y:number, exercise:Exercise|"custom_exercise"|"warm_up") => void
}

export default function ExerciseSelection({ onDragStart, onDragMove, checkDropLocation }:ExerciseSelectionProps) {
    const { t } = useTranslation() // Initializes The Translations

    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const [exercises, setExercises] = useState<Exercise[]>([]) // Stores The Exercises
    const [are_exercises, setAreExercisesLoading] = useState<boolean>(false) // Stores The Information If Exercises Are Loading

    const [searched_text, setSearchedText] = useState<string>("") // Stores The Searched Text

    const translateX = useSharedValue(0) // Stores The X Transform
    const translateY = useSharedValue(0) // Stores The Y Transform
    const scale = useSharedValue(1) // Stores The Scale

    // Creates The Warm Up Drag Gesture (Starts After 250MS Hold)
    const warm_up_drag = Gesture.Pan()
        .activateAfterLongPress(250)
        .onStart((event) => {
            scale.value = withSpring(1.05) // Scales The Item
            runOnJS(onDragStart)(event.absoluteX, event.absoluteY, "warm_up")
        })
        .onChange((event) => {
            runOnJS(onDragMove)(event.absoluteX, event.absoluteY);
            // translateX.value = event.translationX
            // translateY.value = event.translationY
        })
        .onFinalize((event) => {
            scale.value = withSpring(1) // Shrinks The Item
            runOnJS(checkDropLocation)(event.absoluteX, event.absoluteY, "warm_up")
            translateX.value = withSpring(0)
            translateY.value = withSpring(0)
        })

    // Creates The Custom Exercise Drag Gesture (Starts After 250MS Hold)
    const custom_exercise_drag = Gesture.Pan()
        .activateAfterLongPress(250)
        .onStart((event) => {
            scale.value = withSpring(1.05) // Scales The Item
            runOnJS(onDragStart)(event.absoluteX, event.absoluteY, "custom_exercise")
        })
        .onChange((event) => {
            runOnJS(onDragMove)(event.absoluteX, event.absoluteY);
            // translateX.value = event.translationX
            // translateY.value = event.translationY
        })
        .onFinalize((event) => {
            scale.value = withSpring(1) // Shrinks The Item
            runOnJS(checkDropLocation)(event.absoluteX, event.absoluteY, "custom_exercise")
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

    // Function For Get The Logged In User
    const getLoggedInUser = async () => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const logged_in_user_response:Response = await fetch(`${API_URL}/get-logged-in-user/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })
    
            const logged_in_user_data:LoggedInUserResponse = await logged_in_user_response.json() // Gets The Logged In User Data

            if(logged_in_user_response.status === 401) {
                await AsyncStorage.removeItem("user_token") // Removes The User Token
                setLoggedInUser(null) // Removes The Logged In User
                return null
            }
    
            if(logged_in_user_data.success) {
                setLoggedInUser(logged_in_user_data.logged_in_user || null) // Sets The Logged In User
                return logged_in_user_data.logged_in_user || null
            } 
            
            else return null
    
        } 
        
        catch {
            return null
        }
    }

    // Initializes The Get Logged In User
    useEffect(() => {
        getLoggedInUser() // Gets The Logged In User
    }, [])

    // Function For Get The Exercises
    const getExercises = async ():Promise<void> => {
        setAreExercisesLoading(true) // Stores The Information That Exercises Are Loading

        try {
            // Sends The GET Request To The Server
            const loaded_exercises_response:Response = await fetch(`${API_URL}/get-exercises/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }
            })

            // If The Response Isn't Success
            if(!loaded_exercises_response.ok) {
                Alert.alert(t("Chyba"), t("Pri získavaní cvikov došlo k chybe.")) // Shows The Alert
                return
            }

            const loaded_exercises_data:LoadedExercisesResponse = await loaded_exercises_response.json() // Gets The Loaded Exercises Data

            // If The Response Isn't Success
            if(!loaded_exercises_data.success) {
                Alert.alert(t("Chyba"), loaded_exercises_data.message) // Shows The Alert
                return
            }
            
            else {
                // Sets The Exercises
                setExercises(
                    loaded_exercises_data.exercises.map((one_exercise:Exercise) => ({
                        ...one_exercise,
                        is_hidden: false, // Shows The Exercise
                        weight: one_exercise.requires_weight ? 0 : null,
                        is_weight_selection_active: one_exercise.requires_weight ? false : null
                    }))
                )
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri získavaní cvikov došlo k chybe.")) // Shows The Alert
        } 
        
        finally {
            setAreExercisesLoading(false) // Stores The Information That Exercises Aren't Loading
        }
    }

    // Initializes The Load Of The Exercises
    useEffect(() => {
        getExercises() // Gets The Exercises
    }, [])

    // Function For Search The Exercises
    const searchExercises = (text:string):void => {
        setSearchedText(text) // Sets The Searched Text

        const query:string = text.toLowerCase().trim() // Gets The Query (Clean Searched Text)

        if(!query) {
            // Sets The Exercises
            setExercises(
                exercises.map((one_exercise:Exercise) => ({
                    ...one_exercise,
                    is_hidden: false // Shows The Exercise
                }))
            )
        }

        // Filters Exercises by Searched Bar Value (Returns Not Corresponding Exercises)
        const filtered_selection_exercises:Exercise[] = exercises.filter((one_exercise:Exercise):boolean => {
            const matches_name:boolean = one_exercise.exercise.toLowerCase().trim().includes(query) // Checks If The Query Matches The Exercise Name
            const matches_category:boolean = one_exercise.categories.some((one_category:string):boolean => one_category.toLowerCase().trim().includes(query)) // Checks If The Query Matches The Name Of Any Category
            return matches_name || matches_category // Returns The Matching Exercise
        })

        // Sets The Exercises
        setExercises((previous_exercises:Exercise[]) =>
            previous_exercises.map((one_exercise:Exercise) => {
                const matches_name:boolean = one_exercise.exercise.toLowerCase().trim().includes(query) // Checks If The Query Matches The Exercise Name
                const matches_category:boolean = one_exercise.categories.some((one_category:string):boolean => one_category.toLowerCase().trim().includes(query)) // Checks If The Query Matches The Name Of Any Category
                const is_match:boolean = matches_name || matches_category // Stores The Information If The Exercise Matches The Query
        
                return {
                    ...one_exercise,
                    is_hidden: query ? !is_match : false // Hides Filtered Exercises
                }
            })
        )
    }

    // Function For Delete Search Bar
    const deleteSearchBar = ():void => {
        setSearchedText("") // Sets The Searched Text

        // Sets The Exercises
        setExercises(
            exercises.map((one_exercise:Exercise) => ({
                ...one_exercise,
                is_hidden: false // Shows The Exercise
            }))
        )
    }

    // Function For Change Weight In Exercise
    const changeWeight = (target_exercise:Exercise, operation:string):void => {
        // Sets The Exercises
        setExercises((previous_exercises:Exercise[]) =>
            previous_exercises.map((one_exercise:Exercise) => {
                if(one_exercise.id === target_exercise.id) {
                    let current_weight:number = one_exercise.weight || 0 // Gets The Current Weight
    
                    if(one_exercise.requires_weight) {
                        if(operation === "increase") current_weight += 1 // Increases The Weight
                        else if(operation === "decrease" && current_weight > 0) current_weight -= 1 // Decreases The Weight
                    }
    
                    return { 
                        ...one_exercise, 
                        weight: current_weight, 
                        is_weight_selection_active: true 
                    }
                }
    
                return { ...one_exercise, is_weight_selection_active: false }
            })
        )
    }

    return (
        <View className="exercise_selection" style={styles.exercise_selection}>
            <View className="search_bar_menu" style={styles.search_bar_menu}>
                <Icon icon_name="magnifying-glass" style={styles.magnifying_glass_icon} />

                <View className="delete_search_bar" style={styles.delete_search_bar}>
                    <Icon icon_name="xmark" onPress={deleteSearchBar} />
                </View>

                <TextInput
                    className="search_bar"
                    textAlignVertical="top" 
                    placeholder={t("Nájsť cvik")} 
                    placeholderTextColor={LIGHT_BLUE_COLOR}
                    accessibilityLabel={t("Nájsť cvik")} 
                    value={searched_text}
                    onChangeText={searchExercises}

                    style={[
                        styles.search_bar, 
                        { outlineStyle: "none" } as any
                    ]}
                />
            </View>

            <ScrollView 
                className="exercises" 
                showsVerticalScrollIndicator={false}
                indicatorStyle="white"
                keyboardShouldPersistTaps="handled" 
                keyboardDismissMode="on-drag"
                style={styles.exercises} 
                contentContainerStyle={styles.exercises}
            >
                <GestureDetector gesture={custom_exercise_drag}>
                    <Animated.View 
                        className="custom_exercise exercise"
                        // draggable="true"
                        style={styles.exercise}
                    >
                        <FontAwesome6
                            name="plus"
                            size={40}
                            color={BLUE_COLOR}
                        />

                        {/* <Text className="name" style={{ color: SECONDARY_COLOR }}>Vlastný cvik</Text> */}
                    </Animated.View>
                </GestureDetector>

                <GestureDetector gesture={warm_up_drag}>
                    <Animated.View 
                        className="warm_up exercise"

                        style={[
                            animated_exercise,
                            styles.exercise,
                        ]}
                    >
                        <FontAwesome6
                            name="dumbbell"
                            size={40}
                            color={BLUE_COLOR}
                        />

                        {/* <Text className="name" style={{ color: SECONDARY_COLOR }}>Rozcvička</Text> */}
                    </Animated.View>
                </GestureDetector>

                {exercises.map((one_exercise:Exercise) => (
                    !one_exercise.is_hidden && (
                        <ExerciseItem
                            key={one_exercise.id}
                            one_exercise={one_exercise}
                            onDragStart={onDragStart}
                            onDragMove={onDragMove}
                            checkDropLocation={checkDropLocation}
                            onSwipeUp={() => changeWeight(one_exercise, "increase")} // Increases The Weight
                            onSwipeDown={() => changeWeight(one_exercise, "decrease")} // Decreases The Weight
                        />
                    )
                ))}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    exercise_selection: {
        alignItems: "center",
        justifyContent: "center",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        minHeight: 500,
        marginHorizontal: "auto",
    },

    search_bar_menu: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginBottom: 20,
        // backdrop-filter: blur(5px);
        zIndex: 50,
    },
    
    magnifying_glass_icon: {
        // @include icon;
        pointerEvents: "none",
        position: "absolute",
        top: "50%",
        left: 8.5,
        transform: [{ translateY: "-50%" }],
        color: BLUE_COLOR,
        fontSize: 20,
        // transition: color 0.3s ease
    },

    delete_search_bar: {
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        top: "50%",
        right: 0,
        transform: [{ translateY: "-50%" }],
        height: "100%",
        width: 40,
        zIndex: 200,
    },

    search_bar: {
        width: "100%",
        height: 40,
        paddingHorizontal: 40,
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: DARK_BLUE_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
        textAlign: "center",
        zIndex: 50,
        // transition: border 0.2s ease, box-shadow 0.2s ease;

        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color !important;
        // }
    },

    exercises: {
        // @include scrollbar;
        // display: grid;
        // grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        width: "100%",
        maxHeight: 450,
        marginHorizontal: "auto",
        // padding: 5,
        textAlign: "center",

        // .custom_exercise,
        // .warm_up {
        //     &:hover {
        //         .fa-plus,
        //         .fa-dumbbell {
        //             filter: blur(2px);
        //             transform: scale(1.05);
        //         }
        //     }

        //     .fa-plus,
        //     .fa-dumbbell {
        //         transition: filter 0.3s ease, transform 0.3s ease;
        //     }

        //     .name {
        //         display: none;
        //     }
        // }
    },

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
})