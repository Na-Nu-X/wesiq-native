import { View, Text, StyleSheet, Pressable, Alert } from "react-native"
import { useEffect, useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { BIG_BORDER_RADIUS, MEDIUM_BORDER_RADIUS } from "@/constants/borders"

interface TrainingPlan {

}

export default function ActivitySection() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [is_activity_started, setIsActivityStarted] = useState<boolean>(false) // Stores The Information If The Activity Is Started
    const [training_plans, setTrainingPlans] = useState<TrainingPlan[]>([]) // Stores The Training Plans
    const [are_training_plans_loading, setAreTrainingPlansLoading] = useState(false) // Stores The Information If Training Plans Are Loading

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
    
            const logged_in_user_data = await logged_in_user_response.json() // Gets The Logged In User Data

            if(logged_in_user_response.status === 401 || logged_in_user_data.code === "token_not_valid") {
                await AsyncStorage.removeItem("user_token") // Removes The User Token
                setLoggedInUser(null) // Removes The Logged In User
                return null
            }
    
            if(logged_in_user_data.success) {
                setLoggedInUser(logged_in_user_data.logged_in_user) // Sets The Logged In User
                return logged_in_user_data.logged_in_user
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

    // Function For Get The Training Plans
    const getTrainingPlans = async () => {
        setAreTrainingPlansLoading(true) // Stores The Information That Training Plans Are Loading

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const loaded_training_plans_response:Response = await fetch(`${API_URL}/get-training-plans/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_training_plans_response.ok) {
                Alert.alert("Chyba", "Pri získavaní tréningových plánov došlo k chybe.") // Shows The Alert
                return
            }

            const loaded_training_plans_data = await loaded_training_plans_response.json() // Gets The Loaded Training Plans Data

            console.log(loaded_training_plans_data)

            // If The Response Isn't Success
            if(!loaded_training_plans_data.success) {
                Alert.alert("Chyba", loaded_training_plans_data.message) // Shows The Alert
                return
            }
            
            else {
                setTrainingPlans(loaded_training_plans_data.training_plans)
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri získavaní tréningových plánov došlo k chybe.") // Shows The Alert
        } 
        
        finally {
            setAreTrainingPlansLoading(false) // Stores The Information That Posts Aren't Loading
        }
    }

    // Initializes The Load Of The Training Plans
    useEffect(() => {
        getTrainingPlans() // Gets The Training Plans
    }, [])

    return (
        <View 
            className="training_section activity_section" 

            style={[
                styles.training_section,
                styles.activity_section
            ]}
        >
            <View className="activity" style={styles.activity}>
                <View className="record_activity" style={styles.record_activity}>
                    <Text className="timer" style={styles.timer}><Text className="hours" style={styles.timer_part}>00</Text>:<Text className="minutes" style={styles.timer_part}>00</Text>:<Text className="seconds" style={styles.timer_part}>00</Text></Text>

                    <View className="buttons" style={styles.buttons}>
                        <Pressable className="play" style={styles.play}>
                            <FontAwesome6
                                name={is_activity_started ? "pause" : "play"}
                                size={40}
                                color={SECONDARY_COLOR}
                                style={is_activity_started ? styles.pause_icon : styles.pause_icon}
                            />
                        </Pressable>

                        <Pressable className="stop" style={styles.stop}>
                            <FontAwesome6
                                name="stop"
                                size={40}
                                color={SECONDARY_COLOR}
                            />
                        </Pressable>
                    </View>
                </View>

                {training_plans.length === 0 && (
                    <>
                        {!logged_in_user && (
                            <View className="no_logged_in">
                                <Text>Zdá sa, že nie ste prihlásený.</Text>
                                <Text>Bez prihlásenia nie je možné ukladať vašu aktivitu.</Text>

                                <Pressable 
                                    // onPress={() => setActiveForm("login_form")}
                                    accessibilityLabel="Prihlásiť sa"
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                // styles.login,
                                                pressed && { textDecorationLine: "underline" } 
                                            ]}
                                        >
                                            Prihláste sa.
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        )}

                        {logged_in_user && (
                            <View className="no_training_plan">
                                <Text>Zatiaľ nemáte žiaden tréningový plán.</Text>

                                <Pressable 
                                    // onPress={}
                                    accessibilityLabel="Moje tréningové plány"
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                // styles.login,
                                                pressed && { textDecorationLine: "underline" } 
                                            ]}
                                        >
                                            Vytvorte si prvý.
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        )}

                        {/* <script src="{% static 'app/ts/dist/pages/training_session/components/basic_training_session.js' %}" type="module"></script> */}
                    </>
                )}

                {training_plans.length > 0 && (
                    <View className="training_plan_container" style={styles.training_plan_container}>
                        {/* {% for one_exercise in training_plan %}
                            <div class="one_exercise_data" data-training_plan_key="{{ one_exercise.training_plan_key }}" data-day="{{ one_exercise.day }}" data-type="{{ one_exercise.type }}" data-exercise="{{ one_exercise.exercise }}" data-periods="{{ one_exercise.periods }}" data-unit="{{ one_exercise.unit }}" data-order="{{ one_exercise.order }}"></div>
                        
                        {% endfor %} */}

                        <View className="training_plan">
                            <View className="start_training active" style={styles.start_training}>
                                <View className="left" style={styles.left}>
                                    <Text style={styles.text}>Tréningový plán</Text>
                                    <Text style={styles.text}>Začať tréning</Text>

                                    <Text className="title" style={styles.title}></Text>
                                </View>

                                <View className="start_training_button">
                                    <IconButton 
                                        icon_name="play" 
                                        // onPress={} 
                                    />
                                </View>
                            </View>

                            <View className="finish_training" style={styles.finish_training}>
                                <View className="left" style={styles.left}>
                                    <Text style={styles.text}>Tréningový plán</Text>
                                    <Text style={styles.text}>Dokončiť tréning</Text>

                                    <Text className="title" style={styles.title}></Text>
                                </View>

                                <View className="finish_training_button">
                                    <IconButton 
                                        icon_name="stop" 
                                        // onPress={} 
                                    />
                                </View>
                            </View>

                            <View className="break" style={styles.break}>
                                <View className="add_time">
                                    <IconButton 
                                        icon_name="plus" 
                                        // onPress={} 
                                    />

                                    <Text className="add_time_message" style={styles.add_time_message}>+30s</Text>
                                </View>

                                <View className="break_timer" style={styles.break_timer}>
                                    {/* <svg width="100" height="100" viewBox="0 0 100 100">
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            class="progress"
                                        />
                                    </svg>

                                    <svg width="100" height="100" viewBox="0 0 100 100">
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            class="progress_background"
                                        />
                                    </svg> */}

                                    <Text><Text className="minutes"></Text>:<Text className="seconds"></Text></Text>
                                </View>

                                <View className="skip_break_button">
                                    <IconButton 
                                        icon_name="angle-right" 
                                        // onPress={} 
                                    />
                                </View>
                            </View>

                            <View className="current_activity_info">
                                {/* <Text>{is_xp_boost_available ? "Je dostupné navýšenie XP" : "Žiadne aktívne navýšenie XP"}</Text> */}
                            </View>
                        </View>
                    </View>

                    // <script src="{% static 'app/ts/dist/pages/training_session/components/training_session.js' %}" type="module"></script>
                    // <script src="{% static 'app/ts/dist/pages/training_session/components/todo.js' %}" type="module"></script>
                )}

                <View className="previous_activity">
                    <View className="top">
                        <View className="average_activity_time_container">
                            <Text>
                                <FontAwesome6
                                    name="clock"
                                    size={20}
                                    color={BLUE_COLOR}
                                />

                                <Text className="title">priemer&nbsp;/ 7&nbsp;dní</Text>
                                {/* <Text>{average_activity_time ? average_activity_time_formatted : "0"}</Text> */}
                            </Text>
                        </View>

                        <View className="activities_amount_container">
                            <Text>
                                <FontAwesome6
                                    name="calendar"
                                    size={20}
                                    solid={false}
                                    color={BLUE_COLOR}
                                />

                                {/* <Text className="activities_amount">{activities_amount ? activities_amount : "0"}</Text> */}
                            </Text>
                        </View>
                    </View>

                    <View className="bottom">
                        <View className="latest_activity_container">
                            <View 
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 5,
                                }}
                            >
                                <FontAwesome6
                                    name="list"
                                    size={20}
                                    color={BLUE_COLOR}
                                />

                                {/* {latest_activity && (
                                    <Text>{latest_activity.elapsed_time|format_time}</Text>
                                    <Text className="xp">{latest_activity.gained_xp}XP</Text>
                                    <Text>{latest_activity.end_time|date:"d.m. Y"}</Text>
                                )}

                                {!latest_activity && (
                                    <Text className="no_latest_activity">posledná aktivita: </Text>
                                    <Text className="none">žiadna</Text>
                                )} */}
                            </View>
                        </View>

                        <View className="longest_activity_container">
                            <View 
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 5,
                                }}
                            >
                                <FontAwesome6
                                    name="medal"
                                    size={20}
                                    color={BLUE_COLOR}
                                />

                                {/* {longest_activity && (
                                    <Text>{longest_activity.elapsed_time|format_time}</Text>
                                    <Text className="xp">{longest_activity.gained_xp}XP</Text>
                                    <Text>{longest_activity.end_time|date:"d.m. Y"}</Text>
                                )}

                                {!longest_activity && (
                                    <Text className="no_longest_activity">najdlhšia aktivita: </Text>
                                    <Text className="none">žiadna</Text>
                                )} */}
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    training_section: {
        position: "relative",
        marginHorizontal: "auto",
        marginBottom: 50,
        overflow: "visible",
    },

    activity_section: {
        maxWidth: MAIN_WIDTH,
    },

    activity: {
        alignItems: "center",
        justifyContent: "center",
        maxWidth: "100%",
        minHeight: "auto",
        marginHorizontal: "auto",
    },

    record_activity: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        marginBottom: 20,
        paddingTop: 20,
        paddingHorizontal: 50,
        paddingBottom: 30,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
    },

    timer: {
        marginBottom: 20,
        // font-family: $timer-font;
        fontSize: 60,
        // font-weight: lighter;
        color: SECONDARY_COLOR,
        // white-space: nowrap;
        // text-shadow: 0 0 40px transparentize($secondary-color, 0.8);
        letterSpacing: 2,
    },

    timer_part: {
        // font-variant-numeric: tabular-nums;
        // display: inline-block;
        width: 80,
        // font-family: inherit;
        // font-size: inherit;
    },

    buttons: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        width: "100%",
    },

    play: {
        width: "90%",
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        color: LIGHT_BLUE_COLOR,
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

    // .play {
    //     @include glow_animated_border;
    //     background: linear-gradient(135deg, transparentize($blue-color, 0.35), transparentize($dark-blue-color, 0.55));
    //     border-color: $blue-color;

    //     &:hover,
    //     &:focus-visible {
    //         background: linear-gradient(135deg, transparentize($blue-color, 0.15), transparentize($dark-blue-color, 0.45));
    //     }
    // }

    play_icon: {
        position: "absolute",
        top: 50,
        left: 50,
        // left: calc(50% + 2.5px);

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        fontSize: 40,
        color: SECONDARY_COLOR,
    },

    pause_icon: {
        position: "absolute",
        top: 50,
        left: 50,

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        fontSize: 40,
        color: SECONDARY_COLOR,
    },

    stop: {
        width: "90%",
        height: 50,
        paddingHorizontal: 10,
        textAlign: "center",
        color: LIGHT_BLUE_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: BIG_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        // outline: none;
        // transition: border-color 0.3s ease, transform 0.3s ease, letter-spacing 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
    
        // &:hover,
        // &:focus-visible {
                // background-color: transparentize($dark-blue-color, 0.8);
        //     border-color: $blue-color;
        //     box-shadow: 0 6px 20px transparentize($blue-color, 0.65);
        //     transform: scale(1.05);
        //     letter-spacing: 0.5px;
        //     cursor: pointer;
        // }
    },

    stop_icon: {
        position: "absolute",
        top: 50,
        left: 50,

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        fontSize: 40,
        color: BLUE_COLOR,
    },

    no_training_plan: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginBottom: 40,
        paddingVertical: 20,
        paddingHorizontal: 10,
        textAlign: "center",
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
    },

    link: {
        color: SECONDARY_COLOR,
        fontStyle: "italic",
    },

    training_plan_container: {
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        marginBottom: 40,
    },

    training_plan: {
        // @include animated_border;
        position: "relative",
        width: "100%",
        height: 250,
        borderRadius: MEDIUM_BORDER_RADIUS,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
        overflow: "hidden",

        // &.blur {
        //     animation: blur 0.3s ease-out;
        // }
    },

    start_training: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 200,
        paddingTop: 10,
        paddingHorizontal: 50,
        // transition: transform 0.5s ease;
        zIndex: 100,

        // &:not(.active) {
        //     position: absolute;
        //     top: 0px;
        //     transform: translateX(100%);

        //     .left {
        //         opacity: 0;
        //     }
        // }
    },

    finish_training: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 200,
        paddingTop: 10,
        paddingHorizontal: 50,
        // transition: transform 0.5s ease;
        zIndex: 100,

        // &:not(.active) {
        //     position: absolute;
        //     top: 0px;
        //     transform: translateX(100%);

        //     .left {
        //         opacity: 0;
        //     }
        // }
    },

    left: {
        opacity: 1,
        // transition: opacity 0.5s ease;
    },

    text: {
        color: transparentize(SECONDARY_COLOR, 0.5),
        textTransform: "uppercase",
        letterSpacing: 1,

        // &:first-child {
        //     margin-bottom: 5px;
        // }
    },

    title: {
        // font-family: $article-heading-font;
        fontSize: 40,
        color: SECONDARY_COLOR,
    },

    break: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 200,
        paddingTop: 10,
        paddingHorizontal: 50,
        // transition: transform 0.5s ease;
        zIndex: 100,

        // &:not(.active) {
        //     position: absolute;
        //     top: 0px;
        //     transform: translateX(100%);

        //     .left {
        //         opacity: 0;
        //     }
        // }
    },

    add_time: {
        overflow: "visible",
    },

    add_time_message: {
        visibility: "hidden",
        opacity: 0,
        position: "absolute",
        top: "0%",
        left: "50%",

        transform: [
            { translateX: "-50%" },
            { translateY: "-50%" }
        ],

        textAlign: "center",
        color: BLUE_COLOR,
        zIndex: 200,

        // &.animate {
        //     animation: fadeOut 1s ease-out forwards;
        // }
    },

    break_timer: {
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

    break_timer_text: {
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

    warm_up: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 200,
        paddingTop: 10,
        paddingHorizontal: 50,
        // transition: transform 0.5s ease;
        zIndex: 100,

        // &:not(.active) {
        //     position: absolute;
        //     top: 0px;
        //     transform: translateX(100%);

        //     .left {
        //         opacity: 0;
        //     }
        // }

        // .title {
        //     width: 50px;
        // }
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
    },

    bar: {
        // --progress: 0%;
        // --progress-color: rgb(255, 207, 32);

        position: "relative",
        width: "100%",
        height: 10,
        borderWidth: 1,
        borderColor: transparentize(SECONDARY_COLOR, 0.8),
        borderRadius: 10 / 2,
    },

    bar_progress: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "0%",
        height: "100%",
        borderRadius: 10 / 2,
    },

    bar_progress_active: {
        // width: var(--progress);
        // background-color: var(--progress-color);
        // shadowColor: var(--progress-color),
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
        // transition: width 0.5s linear, background-color 0.5s ease;
    },

    bar_label: {
        pointerEvents: "none",
        opacity: 0,
        // content: attr(data-exercise);
        position: "absolute",
        top: -5,
        left: "50%",
        transform: [{ translateX: "-50%" }],
        // width: calc(100% + 10px)
        textAlign: "center",
        fontSize: 15,
        lineHeight: 15,
        color: transparentize(SECONDARY_COLOR, 0.5),
        // text-overflow: ellipsis;
        // overflow: hidden;
        // transition: opacity 0.3s ease, transform 0.3s ease;
    },

    // &.show {
    //     bar_label {
    //         opacity: 0.5;
    //         transform: translate(-50%, -100%);
    //     }
    // }

    current_activity_info: {
        // --progress: 100%;

        position: "relative",
        marginVertical: 10,
        textAlign: "center",
        // font-family: $article-heading-font;
        zIndex: 100,
    },

    current_activity_info_progress: {
        position: "absolute",
        top: "50%",
        left: 10,
        transform: [{ translateY: "-50%" }],
        // width: calc(100% - 20px - var(--progress));
        height: 1,
        backgroundColor: transparentize(BLUE_COLOR, 0.5),
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 5,
        zIndex: -1,
    },

    current_activity_info_text: {
        // font-family: $article-heading-font;
        color: transparentize(SECONDARY_COLOR, 0.5),
        opacity: 0.5,
    },

    current_activity_info_icon: {
        color: BLUE_COLOR,
        textShadowColor: BLUE_COLOR,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 5,
    },

    training_plan_bar_container: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        width: "100%",
        marginTop: 10,
    },

    training_plan_bar: {
        width: "100%",
        height: 10,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: 10 / 2,
        // transition: background-color 0.3s ease;

        // &.active,
        // &:hover {
        //     cursor: pointer;
        //     background-color: $blue-color;
        //     box-shadow: 0px 0px 10px $blue-color;
        // }
    },

    previous_activity: {
        maxWidth: "100%",
        width: "100%",
        marginTop: 10,
    },

    top: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 15,
        marginBottom: 15,
    },

    average_activity_time_container: {
        width: "100%",
        paddingVertical: 20,
        paddingHorizontal: 10,
        textAlign: "center",
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
    },

    average_activity_time_title: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        fontSize: 15,
        textAlign: "center",
        color: transparentize(SECONDARY_COLOR, 0.5)
    },

    average_activity_time: {
        marginTop: 15,
        lineHeight: 1,
        fontSize: 25,
        fontWeight: "semibold",
        color: BLUE_COLOR,
        // white-space: nowrap;
    },

    activities_amount_container: {
        width: "100%",
        paddingVertical: 20,
        paddingHorizontal: 10,
        textAlign: "center",
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
    },

    activities_amount_title: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        fontSize: 15,
        textAlign: "center",
        color: transparentize(SECONDARY_COLOR, 0.5)
    },

    activities_amount: {
        marginTop: 15,
        lineHeight: 1,
        fontSize: 25,
        fontWeight: "semibold",
        color: BLUE_COLOR,
        // white-space: nowrap;
    },

    bottom: {
        padding: 15,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
    },

    latest_activity_text: {
        textAlign: "center",
        // white-space: nowrap;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    no_latest_activity: {
        // white-space: normal;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    longest_activity_text: {
        textAlign: "center",
        // white-space: nowrap;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    no_longest_activity: {
        // white-space: normal;
        color: transparentize(SECONDARY_COLOR, 0.5),
    },

    xp: {
        fontSize: 22,
        fontWeight: "semibold",
        color: BLUE_COLOR,
    },

    none: {
        fontSize: 22,
        fontWeight: "semibold",
        color: BLUE_COLOR,
    },
})

//     .training_plan_container {
//             .start_training, 
//             .exercise,
//             .finish_training,
//             .break,
//             .warm_up {
//                 .start_training_button,
//                 .next_exercise_button,
//                 .finish_training_button,
//                 .add_time,
//                 .skip_break_button,
//                 .skip_warm_up_button {
//                     @include blue_button(50px);
//                     position: relative;

//                     .fa-play,
//                     .fa-angle-right,
//                     .fa-plus,
//                     .fa-stop {
//                         @include position_center;
//                         font-size: 2em;
//                         color: $blue-color;
//                     }

//                     .fa-play {
//                         left: calc(50% + 2.5px);
//                     }
//                 }
//             }

//             .exercise {
//                 .left {
//                     .title {
//                         max-width: 350px;
//                     }

//                     .reps,
//                     .sets {
//                         font-family: $article-heading-font;
//                         font-size: 1.2em;
    
//                         .current,
//                         .total {
//                             font-family: inherit;
//                             font-size: inherit;
//                         }
//                     }
//                 }
//             }



// .activity_summary {
//     @include flex_center($direction: column);
//     display: none;
//     position: fixed;
//     top: 0px;
//     left: 0px;
//     width: 100%;
//     gap: 20px;
//     min-height: 100vh;
//     padding: 125px + 20px 20px 40px;
//     text-align: center;
//     background: transparentize($main-color, 0.85);
//     backdrop-filter: blur(10px);
//     overflow-y: auto;
//     z-index: 2500;

//     .main_summary {
//         font-family: $article-heading-font;
//         font-size: 1.5em;

//         span {
//             position: relative;
//             font-family: inherit;

//             .tooltip {
//                 @include tooltip($top: -5px)
//             }
//         }
//     }

//     .weekly_activity_chart {
//         display: none;
//         width: 500px;
//         max-width: 90vw;
//         height: 250px;
//         padding: 20px;
//         background: $training-surface;
//         border: 1px solid $training-surface-border;
//         border-radius: $medium-border-radius;

//         canvas {
//             width: 100% !important;
//             height: 100% !important;
//         }
//     }

//     .training_plan_summary {
//         display: none;
//         font-family: $article-heading-font;

//         span {
//             font-family: inherit;
//         }

//         br:nth-child(1) {
//             display: none;
//         }
//     }

//     .training_plan_summary_chart {
//         position: relative;
//         display: none;
//         width: 250px;
//         height: 250px;
//         padding: 15px;
//         background: $training-surface;
//         border: 1px solid $training-surface-border;
//         border-radius: 50%;

//         &::before {
//             @include position_center;
//             content: "%";
//             font-family: $article-heading-font;
//             font-size: 2.5em;
//             font-weight: bold;
//             color: $blue-color;
//         }

//         canvas {
//             width: 100% !important;
//             height: 100% !important;
//         }
//     }
// }