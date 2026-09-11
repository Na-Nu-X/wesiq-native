import { View, Text, StyleSheet, Pressable, Alert, Animated, Dimensions, Vibration, TextInput, Image } from "react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL, DOMAIN } from "@/constants/general"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import { getDayName, getFormattedDate, getFormattedTime, getMinimalistFormattedTime, getRemainingSecondsFromDate } from "@/utils/time"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { randomColor } from "@/utils/randomColor"
import { BasicResponse } from "@/components/Feed"
import Icon from "@/components/Icon"
import { opacity } from "react-native-reanimated/lib/typescript/Colors"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"

interface LoadedExercisesResponse {
    success:boolean, 
    exercises:Exercise[],
    message:string
}

interface Exercise {
    id:number,
    exercise:string,
    image_filename?:string,
    unit:"reps"|"seconds"|"steps",
    requires_weight:boolean,
    categories:string
}

export default function ExerciseSelection() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

    const [exercises, setExercises] = useState<Exercise[]>([]) // Stores The Exercises
    const [are_exercises, setAreExercisesLoading] = useState(false) // Stores The Information If Exercises Are Loading

    // Function For Get The Logged In User
    const getLoggedInUser = async () => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
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
            // Sends The POST Request To The Server
            const loaded_exercises_response:Response = await fetch(`${API_URL}/get-exercises/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }
            })

            // If The Response Isn't Success
            if(!loaded_exercises_response.ok) {
                Alert.alert("Chyba", "Pri získavaní cvikov došlo k chybe.") // Shows The Alert
                return
            }

            const loaded_exercises_data = await loaded_exercises_response.json() // Gets The Loaded Exercises Data

            // If The Response Isn't Success
            if(!loaded_exercises_data.success) {
                Alert.alert("Chyba", loaded_exercises_data.message) // Shows The Alert
                return
            }
            
            else {
                console.log(loaded_exercises_data)
                setExercises(loaded_exercises_data.exercises) // Sets The Exercises
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri získavaní cvikov došlo k chybe.") // Shows The Alert
        } 
        
        finally {
            setAreExercisesLoading(false) // Stores The Information That Exercises Aren't Loading
        }
    }

    // Initializes The Load Of The Exercises
    useEffect(() => {
        getExercises() // Gets The Exercises
    }, [])

    return (
        <View className="exercise_selection">
            <View className="search_bar_menu">
                <Icon icon_name="magnifying-glass" />

                <View className="delete_search_bar">
                    <Icon icon_name="xmark" />
                </View>

                <TextInput
                    className="search_bar"
                    textAlignVertical="top" 
                    placeholder="Nájsť cvik" 
                    placeholderTextColor={LIGHT_BLUE_COLOR}
                    accessibilityLabel="Nájsť cvik" 
                    // value={}
                    // onChangeText={}

                    style={[
                        // styles.search_bar, 
                        { outlineStyle: "none" } as any
                    ]}
                />
            </View>

            <View className="exercises">
                <View 
                    className="custom_exercise exercise"
                    // draggable="true"
                >
                    <FontAwesome6
                        name="plus"
                        size={20}
                        color={LIGHT_BLUE_COLOR}
                        style={{marginRight: 8.5}}
                    />

                    <Text className="name">Vlastný cvik</Text>
                </View>

                <View 
                    className="warm_up exercise"
                    // draggable="true"
                >
                    <FontAwesome6
                        name="dumbbell"
                        size={20}
                        color={LIGHT_BLUE_COLOR}
                        style={{marginRight: 8.5}}
                    />

                    <Text className="name">Rozcvička</Text>
                </View>

                {exercises.map((one_exercise:Exercise, index:number) => (
                    <View 
                        key={one_exercise.id || index}
                        className="exercise"
                        // draggable="true" 
                    >
                        {one_exercise.image_filename && (
                            <Image 
                                source={{ uri: `${DOMAIN}/static/images/exercises/${one_exercise.image_filename}`}}
                                resizeMode="cover"

                                style={[
                                    StyleSheet.absoluteFillObject,
                                    
                                    { 
                                        // width: "100%",
                                        // height: "100%",
                                        opacity: 0.2 
                                    }
                                ]}
                            />
                        )}

                        <Text className="name">{one_exercise.exercise}</Text>

                        <View className="weight_selection">
                            <Pressable
                                className="increase_weight"
                                // onPress={}
                            >
                                <FontAwesome6
                                    name="plus"
                                    size={20}
                                    color={BLUE_COLOR}
                                />
                            </Pressable>

                            <Text className="weight"><Text>0</Text><Text>kg</Text></Text>

                            <Pressable
                                className="decrease_weight"
                                // onPress={}
                            >
                                <FontAwesome6
                                    name="minus"
                                    size={20}
                                    color={BLUE_COLOR}
                                />
                            </Pressable>
                        </View>
                    </View>
                ))}
            </View>
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
        gap: 10,
        width: "100%",
        maxHeight: 450,
        marginHorizontal: "auto",
        padding: 5,
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
        //         font-size: 2.5em;
        //         color: $blue-color;
        //         transition: filter 0.3s ease, transform 0.3s ease;
        //     }

        //     .name {
        //         display: none;
        //     }
        // }
    },

    exercise: {
        // @include scrollbar;
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        gap: 5,
        aspectRatio: 1 / 1,
        padding: 10,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        // cursor: move;
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

        //     .weight_selection {
        //         @include position_center;
        //         @include flex_center($direction: column);
        //         width: 100%;
        //         height: 100%;
                
        //         .decrease_weight, 
        //         .increase_weight {
        //             background: none;
        //             color: $secondary-color;
        //             border: none;
        //             outline: none;
        //             cursor: pointer;
        //             transition: color 0.2s ease;

        //             &:hover {
        //                 color: $blue-color;
        //             }
                    
        //             i {
        //                 pointer-events: none;
        //                 font-size: 1.2em;
        //             }
        //         }

        //         .weight {
        //             font-size: 2em;
        //             cursor: default;
        //             color: $secondary-color;

        //             span {
        //                 font-size: inherit;
        //             }
        //         }
        //     }
        // }
    },

    weight_selection: {
        display: "none",
    },
})