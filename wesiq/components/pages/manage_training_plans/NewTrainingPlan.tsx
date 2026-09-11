import { View, Text, StyleSheet, Pressable, Alert, Animated, Dimensions, Vibration, TextInput } from "react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import { getDayName, getFormattedDate, getFormattedTime, getMinimalistFormattedTime, getRemainingSecondsFromDate } from "@/utils/time"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { randomColor } from "@/utils/randomColor"
import { BasicResponse } from "@/components/Feed"
import Icon from "@/components/Icon"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"

export default function NewTrainingPlan() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User

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

    return (
        <View className="new_training_plan">
            <View className="additional_info">
                <TextInput
                    className="title"
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    textAlignVertical="top" 
                    placeholder="Názov" 
                    placeholderTextColor={LIGHT_BLUE_COLOR}
                    accessibilityLabel="Názov" 
                    // value={title}
                    // onChangeText={setTitle}
                    maxLength={50}

                    style={[
                        // styles.title, 
                        { outlineStyle: "none" } as any
                    ]}
                />

                <View className="day_select_menu">
                    <View className="select">
                        <Text>Nepriradiť deň</Text>

                        <Icon
                            icon_name="angle-down"
                            // onPress={}
                            size={20}
                        />
                    </View>

                    <View className="options_list">
                        <Pressable 
                            className="option"
                            // onPress={() => setDay("not_selected"}
                            // style={styles.option}
                        >
                            <FontAwesome6
                                name="list"
                                size={20}
                                color={LIGHT_BLUE_COLOR}
                                style={{marginRight: 8.5}}
                            />

                            <Text style={{ color: SECONDARY_COLOR }}>Nepriradiť deň</Text>
                        </Pressable>

                        <Pressable 
                            className="option"
                            // onPress={() => setDay(1}
                            // style={styles.option}
                        >
                            <FontAwesome6
                                name="eye"
                                size={20}
                                color={LIGHT_BLUE_COLOR}
                                style={{marginRight: 8.5}}
                            />

                            <Text style={{ color: SECONDARY_COLOR }}>Pondelok</Text>
                        </Pressable>

                        <Pressable 
                            className="option"
                            // onPress={() => setDay(2}
                            // style={styles.option}
                        >
                            <FontAwesome6
                                name="list"
                                size={20}
                                color={LIGHT_BLUE_COLOR}
                                style={{marginRight: 8.5}}
                            />

                            <Text style={{ color: SECONDARY_COLOR }}>Utorok</Text>
                        </Pressable>

                        <Pressable 
                            className="option"
                            // onPress={() => setDay(3}
                            // style={styles.option}
                        >
                            <FontAwesome6
                                name="list"
                                size={20}
                                color={LIGHT_BLUE_COLOR}
                                style={{marginRight: 8.5}}
                            />

                            <Text style={{ color: SECONDARY_COLOR }}>Streda</Text>
                        </Pressable>

                        <Pressable 
                            className="option"
                            // onPress={() => setDay(4}
                            // style={styles.option}
                        >
                            <FontAwesome6
                                name="list"
                                size={20}
                                color={LIGHT_BLUE_COLOR}
                                style={{marginRight: 8.5}}
                            />

                            <Text style={{ color: SECONDARY_COLOR }}>Štvrtok</Text>
                        </Pressable>

                        <Pressable 
                            className="option"
                            // onPress={() => setDay(5}
                            // style={styles.option}
                        >
                            <FontAwesome6
                                name="list"
                                size={20}
                                color={LIGHT_BLUE_COLOR}
                                style={{marginRight: 8.5}}
                            />

                            <Text style={{ color: SECONDARY_COLOR }}>Piatok</Text>
                        </Pressable>

                        <Pressable 
                            className="option"
                            // onPress={() => setDay(6}
                            // style={styles.option}
                        >
                            <FontAwesome6
                                name="list"
                                size={20}
                                color={LIGHT_BLUE_COLOR}
                                style={{marginRight: 8.5}}
                            />

                            <Text style={{ color: SECONDARY_COLOR }}>Sobota</Text>
                        </Pressable>

                        <Pressable 
                            className="option"
                            // onPress={() => setDay(0}
                            // style={styles.option}
                        >
                            <FontAwesome6
                                name="list"
                                size={20}
                                color={LIGHT_BLUE_COLOR}
                                style={{marginRight: 8.5}}
                            />

                            <Text style={{ color: SECONDARY_COLOR }}>Nedeľa</Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            <View className="training_plan">
                <View className="drop_zone active">
                    <FontAwesome6
                        name="compress"
                        size={40}
                        color={BLUE_COLOR}
                    />
                </View>
            </View>

            <Pressable
                className="save"
                // onPress={}
                accessibilityLabel="Pridať tréningový plán"
            >
                <Text>Pridať tréningový plán</Text>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    new_training_plan: {
        alignItems: "center",
        justifyContent: "center",

        // &.hidden {
        //     display: none;
        // }
    },

    additional_info: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 20,
        width: "100%",
        marginBottom: 20,
    },

    title: {
        width: "100%",
        height: 50,
        // flex: 1 1 0px; 
        flex: 1,
        minWidth: 0,
        maxWidth: "50%",
        // max-width: calc(50% - 10px);
        paddingHorizontal: 10,
        color: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border-color 0.2s ease;

        // &::-webkit-calendar-picker-indicator {
        //     display: none !important;
        // }

        // &.error_animation {
        //     animation: trainingTitleError 0.2s linear 3;
        // }
    },

    day_select_menu: {
        position: "relative",
        cursor: "pointer",
    },

    select: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 5,
        width: "100%",
        height: 50,
        paddingHorizontal: 8.5,
        color: LIGHT_BLUE_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: border 0.3s ease, box-shadow 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &:has(.fa-angle-down:hover),
        // &:has(.fa-angle-up:hover) {
        //     border-color: $blue-color !important;
        // }

        // span {
        //     @include crop_text;
        // }
    },

    options_list: {
        // @include scrollbar;
        // interpolate-size: allow-keywords;
        position: "absolute",
        flex: 1,
        width: "100%",
        minWidth: 0,
        height: 0,
        marginTop: 10,
        color: SECONDARY_COLOR,
        backgroundColor: transparentize(MAIN_COLOR, 0.2),
        borderRadius: SMALL_BORDER_RADIUS,
        // overflow-y: $scrollbar;
        // transition: height 0.3s ease;
        zIndex: 500,

        // &::-webkit-scrollbar {
        //     width: 3px;
        // }

        // &.active {
            // height: 33 * 4,
        // }
    },

    option: {
        // @include crop_text;
        paddingVertical: 5,
        paddingHorizontal: 8.5,
        // transition: background-color 0.3s ease, color 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &.selected {
        //     background-color: transparentize($blue-color, 0.9);
        //     color: $light-blue-color;
        // }

        // &:focus-visible {
        //     outline: none !important;
        // }
    },

    training_plan: {
        // @include animated_border;
        position: "relative",
        width: "100%",
        height: 350,
        borderRadius: MEDIUM_BORDER_RADIUS,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
        // overflow: hidden;

        // &.animate {
        //     animation: trainingPlanDrag 1s infinite alternate;
        // }
    },

    drop_zone: {
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: "100%",
        color: BLUE_COLOR,
        zIndex: 100,

        // &:not(.active) {
        //     display: none;
        // }

        // &:hover {
        //     cursor: pointer;

        //     .fa-compress {
        //         transform: scale(1.1);
        //         color: $dark-blue-color;
        //     }
        // }

        // .fa-compress {
        //     transition: transform 0.2s ease, color 0.3s ease;

        //     &.error_animation {
        //         animation: trainingPlanError 0.2s linear 3;
        //     }
        // }
    },

    exercise: {
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 10,
        width: "100%",
        height: "100%",
        paddingVertical: 20,
        paddingHorizontal: 50,
        cursor: "move",
        zIndex: 100,
        // transition: transform 0.5s ease;

        // &:not(.active) {
        //     position: absolute;
        //     top: 0px;
        //     transform: translateX(100%);
        // }
    },

    title_input: {
        width: "100%",
        textAlign: "center",
        color: SECONDARY_COLOR,
        // font-family: $article-heading-font;
        fontSize: 30,
    },

    // h3 {
    //     font-family: $article-heading-font;
    //     font-size: 2em;
    //     color: $secondary-color;
    // }

    labels: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: 400,
        width: "100%",
        marginTop: 10,
        marginBottom: 0,
        paddingHorizontal: 10,
    },

    unit_select_menu: {
        position: "relative",
        maxWidth: "90%",
        marginHorizontal: "auto",
        cursor: "pointer",
    },

    unit_select_menu_select: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 5,
        width: "100%",
        height: 50,
        paddingHorizontal: 8.5,
        color: LIGHT_BLUE_COLOR,
        // transition: border 0.3s ease, box-shadow 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &:has(.fa-angle-down:hover),
        // &:has(.fa-angle-up:hover) {
        //     border-color: $blue-color !important;
        // }

        // span {
        //     @include crop_text;
        // }
    },

    unit_select_menu_option: {
        // @include crop_text;
        position: "relative",
        paddingVertical: 5,
        paddingHorizontal: 8.5,
        textAlign: "center",
        // transition: background-color 0.3s ease, color 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &.selected {
        //     background-color: transparentize($blue-color, 0.9);
        //     color: $light-blue-color;
        // }

        // &:focus-visible {
        //     outline: none !important;
        // }

        // i {
        //     position: absolute;
        //     top: 50%;
        //     left: 10px;
        //     transform: translateY(-50%);
        // }
    },

    label: {
        width: "100%",
        textAlign: "center",
        lineHeight: 1,
        color: LIGHT_BLUE_COLOR,
    },

    // .add_period {
    //     @include blue_button($width: 100%);
    //     height: 40px;
    //     margin-bottom: 10px;
    //     flex-shrink: 0;
    // }

    periods_container: {
        // @include scrollbar;
        gap: 5,
        width: "100%",
        maxHeight: 100,
        paddingHorizontal: 5,
    },

    period_selection: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "space-between",
        gap: 10,
    },

    reps_container: {
        position: "relative",
        flexDirection: "row",
        width: "100%",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.2s ease;

        // &:hover,
        // &:focus-within {
        //     border-color: $blue-color;
        // }
    },

    sets_container: {
        flexDirection: "row",
        width: "100%",
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // transition: border-color 0.2s ease;

        // &:hover,
        // &:focus-within {
        //     border-color: $blue-color;
        // }
    },

    reps: {
        visibility: "hidden",
        // width: calc(100% - 30px - 30px);
        width: "100%",
        height: 40,
        textAlign: "center",
        color: SECONDARY_COLOR,
    },

    sets: {
        // width: calc(100% - 30px - 30px);
        width: "100%",
        height: 40,
        textAlign: "center",
        color: SECONDARY_COLOR,
    },

    to_failure: {
        position: "absolute",
        top: 0,
        left: 0,

        transform: [
            { translateX: "-100%" },
            { translateY: "-50%" }
        ],

        // width: calc(100% - 30px - 30px);
        width: "100%",
        height: "100%",
        lineHeight: 40,
        textAlign: "center",
        // text-overflow: ellipsis;
        // overflow: hidden;
    },

    time: {
        visibility: "hidden",
        position: "absolute",
        top: 0,
        left: 0,

        transform: [
            { translateX: "-100%" },
            { translateY: "-50%" }
        ],

        // width: calc(100% - 30px - 30px);
        width: "100%",
        height: "100%",
        lineHeight: 40,
        textAlign: "center",
        // text-overflow: ellipsis;
        // overflow: hidden;
    },

    timer_container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        marginTop: 29,
        paddingHorizontal: 40,
    },

    warm_up_timer: {
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

    warm_up_timer_text: {
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

    bar_container: {
        position: "relative",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        marginTop: "auto",
        marginHorizontal: 10,
        marginBottom: 10,
        zIndex: 100,
    },

    bar: {
        position: "relative",
        flex: 1,
        height: 10,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: 10 / 2,

        // &.animate:not(&.active) {
        //     animation: barDrag 1s infinite alternate;
        // }

        // &:before {
        //     content: "";
        //     position: absolute;
        //     top: 0px;
        //     left: 0px;
        //     width: 100%;
        //     height: 100%;
        //     border-radius: inherit;
        //     transition: background-color 0.3s ease;
        // }

        // &.active,
        // &:hover {
        //     cursor: pointer;

        //     &.animate {
        //         &:before {
        //             animation: barDrag 1s infinite alternate;
        //         }
        //     }

        //     &:before {
        //         width: 100%;
        //         background-color: $green-color;
        //         box-shadow: 0px 0px 10px $green-color;
        //     }
        // }
    },

    save: {
        // @include crop_text;
        width: "100%",
        height: 50,
        marginTop: 20,
        paddingHorizontal: 10,
        textAlign: "center",
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // outline: none;
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: scale(1.05);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }
    },
})