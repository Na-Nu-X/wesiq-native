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
import { getDayName, getFormattedTime } from "@/utils/time"

interface TrainingPlanExercise {
    training_plan_key:string,
    day:number,
    type:string,
    exercise:string,
    periods:number[],
    unit:string,
    order:number
}

interface ActivityData {
    success:boolean,
    
    latest_activity:{
        end_time:string,
        elapsed_time:number,
        gained_xp:number,
        type:string,
        training_plan_day:number,

        training_plan_summary:{
            color:string,
            exercise:string,
            gained_xp:number,
            elapsed_time:number
        }[]
    }|null,

    longest_activity:{
        end_time:string,
        elapsed_time:number,
        gained_xp:number,
        type:string,
        training_plan_day:number,

        training_plan_summary:{
            color:string,
            exercise:string,
            gained_xp:number,
            elapsed_time:number
        }[]
    }|null,

    average_activity_time:number,
    average_activity_time_formatted:string,
    activities_amount:number,
    message:string
}

export default function ActivitySection() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [is_activity_started, setIsActivityStarted] = useState<boolean>(false) // Stores The Information If The Activity Is Started
    const [training_plans_exercises, setTrainingPlansExercises] = useState<TrainingPlanExercise[]>([]) // Stores The Training Plans Exercises
    const [are_training_plans_loading, setAreTrainingPlansLoading] = useState(false) // Stores The Information If Training Plans Are Loading
    const [activity_data, setActivityData] = useState<ActivityData|null>(null) // Stores The Activity Data

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

    // Function For Get The All Exercises From All Training Plans
    const getTrainingPlansExercises = async ():Promise<void> => {
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

            // If The Response Isn't Success
            if(!loaded_training_plans_data.success) {
                Alert.alert("Chyba", loaded_training_plans_data.message) // Shows The Alert
                return
            }
            
            else {
                setTrainingPlansExercises(loaded_training_plans_data.training_plans) // Sets The Training Plans Exercises
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
        getTrainingPlansExercises() // Gets The Training Plans Exercises
    }, [])

    // Function For Get Activity Data
    const getActivity = async ():Promise<void> => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const loaded_activity_response:Response = await fetch(`${API_URL}/get-activity/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_activity_response.ok) {
                Alert.alert("Chyba", "Pri získavaní dát o aktivite užívateľa došlo k chybe.") // Shows The Alert
                return
            }

            const loaded_activity_data = await loaded_activity_response.json() // Gets The Loaded Training Plans Data

            // If The Response Isn't Success
            if(!loaded_activity_data.success) {
                Alert.alert("Chyba", loaded_activity_data.message) // Shows The Alert
                return
            }
            
            else {
                setActivityData(loaded_activity_data) // Sets The Activity Data
                console.log(loaded_activity_data)
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri získavaní dát o aktivite užívateľa došlo k chybe.") // Shows The Alert
        }
    }

    // Initializes The Load Of The Activity Data
    useEffect(() => {
        getActivity() // Gets The Activity Data
    }, [])

    // Function For Render Exercises Of The Selected Training Plan
    const generateTrainingPlan = (active_training_plan_index:number = 0, active_exercise_index:number = 0) => {
        const days:(number|null)[] = [...new Set(training_plans_exercises.map((one_exercise:TrainingPlanExercise) => one_exercise.day ? one_exercise.day : null))] // Gets Ordered Days From Available Training Plans
        const selected_day:number|null = days[active_training_plan_index] || null // Selects Current Or Upcoming Day Of Training Plan
        const ordered_exercises = training_plans_exercises.sort((a:TrainingPlanExercise, b:TrainingPlanExercise) => Number(a.order) - Number(b.order)) // Orders Exercises From All Training Plans By Their Order Value

        const training_plan_title_data:string = ordered_exercises[active_exercise_index].type as string // Gets Training Title Of The Exercise

        return (
            <>
                <View className="training_plan" style={styles.training_plan}>
                    <View className="start_training active" style={styles.start_training}>
                        <View className="left" style={styles.left}>
                            <Text style={styles.text}>Tréningový plán</Text>
                            <Text style={styles.text}>Začať tréning</Text>

                            <Text className="title" style={styles.title}>{selected_day ? `${training_plan_title_data} - ${getDayName(selected_day)}` : training_plan_title_data}</Text> {/* Sets Training Plan Title On The Start Training Slide */}
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

                            <Text className="title" style={styles.title}>{training_plan_title_data}</Text> {/* Sets Training Plan Title On The Finish Training Slide */}
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

                            <Text style={styles.break_timer_text}><Text className="minutes"></Text>:<Text className="seconds"></Text></Text>
                        </View>

                        <View className="skip_break_button">
                            <IconButton 
                                icon_name="angle-right" 
                                // onPress={} 
                            />
                        </View>
                    </View>

                    {/* Extracts Data For Every Exercise */}
                    {ordered_exercises.map((one_exercise:TrainingPlanExercise, index:number) => {
                        const day_data:number|null = one_exercise.day || null // Gets Training Day Of The Exercise If Has Any
                        // const training_plan_title_data:string = one_exercise.type as string // Gets Training Title Of The Exercise
                        const exercise_title_data:string = one_exercise.exercise as string // Gets Exercise Name
                        const periods_data:number[] = one_exercise.periods || [0] // Gets Exercise Sets & Reps Periods
                        const unit_data:string = one_exercise.unit || "reps" // Gets Exercise Unit Type (Reps, Seconds Or Steps)
            
                        // Shows Exercises Which Have Assigned Day
                        if(day_data !== null) {
                            // Shows Training Plan Exercises Of Selected Day
                            if(selected_day === day_data) {
                                return (
                                    <>
                                        {/* Creates Warm Up */}
                                        {exercise_title_data === "Warm Up" && (
                                            <View className="exercise warm_up" style={styles.warm_up}>
                                                <Text className="title">Warm Up</Text>
            
                                                <View className="warm_up_timer" style={styles.warm_up_timer}>
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
            
                                                    <Text className="countdown" style={styles.warm_up_timer_text}>{`${getFormattedTime("minutes", periods_data[0])}:${getFormattedTime("seconds", periods_data[0], true)}`}</Text> {/* Stores Timer Of Warm Up */}
                                                </View>
            
                                                <View className="skip_warm_up_button">
                                                    <IconButton 
                                                        icon_name="angle-right" 
                                                        // onPress={} 
                                                    />
                                                </View>
                                            </View>
                                        )}
            
                                        {/* Creates Exercise */}
                                        {exercise_title_data !== "Warm Up" && (
                                            <View className="exercise" style={styles.exercise}>
                                                <View className="left" style={styles.left}>
                                                    <Text className="title" style={{ maxWidth: 350 }}>{exercise_title_data}</Text> {/* Sets Exercise Title */}
            
                                                    <Text className="reps" style={styles.reps}>1x</Text>
                                                    <Text className="sets" style={styles.sets}><Text className="current" style={styles.current}>1</Text>/<Text className="total" style={styles.total}>{String(periods_data.length)}</Text></Text> {/* Sets Exercise Total Sets */}
                                                </View>
            
                                                <View className="next_exercise_button">
                                                    <IconButton 
                                                        icon_name="angle-right" 
                                                        // onPress={} 
                                                    />
                                                </View>
                                            </View>
                                        )}
            
                                        <View className="bar_container" style={styles.bar_container}>
                                            {/* Creates Bar */}
                                            <View 
                                                key={index} 
                                                className={index === active_exercise_index ? "bar active show" : "bar show"} // Adds Active Class For Bar Of Active Exercise
                                                // draggable = true
                                                style={styles.bar}
                                            >
                                                <Text style={styles.bar_label}>{exercise_title_data}</Text>
                                            </View>
                                        </View>
                                    </>
                                )
                            }
                        }
                    })}

                    <View className="current_activity_info" style={styles.current_activity_info}>
                        {/* <Text style={styles.current_activity_info_text}>{is_xp_boost_available ? "Je dostupné navýšenie XP" : "Žiadne aktívne navýšenie XP"}</Text> */}
                    </View>
                </View>

                {/* Creates And Renders Training Plan Bars (Only If There Are More Than One Training Plan Available) */}
                {days.length > 1 && (
                    createTrainingPlanBars(days.length, active_training_plan_index)
                )}
            </>
        )
    }

    // Function For Creating Bar Container With Amount Of Bars By Training Plans Amount
    const createTrainingPlanBars = (amount:number, active_training_plan_index:number) => {
        return (
            <View className="training_plan_bar_container" style={styles.training_plan_bar_container}>
                {/* Creates Bars By Amount Of Training Plans */}
                {Array.from({ length: amount }).map((_, index:number) => (
                    // Creates Bar
                    <View 
                        key={index} 
                        className={index === active_training_plan_index ? "bar active" : "bar"} // Adds Active Class For Bar Of Active Training Plan
                        style={styles.training_plan_bar}
                    />
                ))}
            </View>
        )
    }

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
                                style={styles.stop_icon}
                            />
                        </Pressable>
                    </View>
                </View>

                {training_plans_exercises.length === 0 && (
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
                            <View className="no_training_plan" style={styles.no_training_plan}>
                                <Text>Zatiaľ nemáte žiaden tréningový plán.</Text>

                                <Pressable 
                                    // onPress={}
                                    accessibilityLabel="Moje tréningové plány"
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                styles.link,
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

                {training_plans_exercises.length > 0 && (
                    <View className="training_plan_container" style={styles.training_plan_container}>
                        {/* {% for one_exercise in training_plan %}
                            <div class="one_exercise_data" data-training_plan_key="{{ one_exercise.training_plan_key }}" data-day="{{ one_exercise.day }}" data-type="{{ one_exercise.type }}" data-exercise="{{ one_exercise.exercise }}" data-periods="{{ one_exercise.periods }}" data-unit="{{ one_exercise.unit }}" data-order="{{ one_exercise.order }}"></div>
                        
                        {% endfor %} */}

                        {generateTrainingPlan(0, 0)} {/* Generates The Training Plan */}
                    </View>

                    // <script src="{% static 'app/ts/dist/pages/training_session/components/training_session.js' %}" type="module"></script>
                    // <script src="{% static 'app/ts/dist/pages/training_session/components/todo.js' %}" type="module"></script>
                )}

                <View className="previous_activity" style={styles.previous_activity}>
                    <View className="top" style={styles.top}>
                        <View className="average_activity_time_container" style={styles.average_activity_time_container}>
                            <Text>
                                <FontAwesome6
                                    name="clock"
                                    size={20}
                                    color={BLUE_COLOR}
                                />

                                <Text className="title" style={styles.average_activity_time_title}>priemer&nbsp;/ 7&nbsp;dní</Text>
                                {/* <Text style={styles.average_activity_time}>{average_activity_time ? average_activity_time_formatted : "0"}</Text> */}
                            </Text>
                        </View>

                        <View className="activities_amount_container" style={styles.activities_amount_container}>
                            <Text>
                                <FontAwesome6
                                    name="calendar"
                                    size={20}
                                    solid={false}
                                    color={BLUE_COLOR}
                                />

                                <Text className="title" style={styles.activities_amount_title}>počet&nbsp;/ 7&nbsp;dní</Text>
                                {/* <Text className="activities_amount" style={styles.activities_amount}>{activities_amount ? activities_amount : "0"}</Text> */}
                            </Text>
                        </View>
                    </View>

                    <View className="bottom" style={styles.bottom}>
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

                                {activity_data && activity_data.latest_activity && (
                                    <>
                                        {/* <Text style={styles.latest_activity_text}>{activity_data.latest_activity.elapsed_time|format_time}</Text>
                                        <Text className="xp" style={styles.latest_activity_text}>{activity_data.latest_activity.gained_xp}XP</Text>
                                        <Text style={styles.latest_activity_text}>{latest_activity.end_time|date:"d.m. Y"}</Text> */}
                                    </>
                                )}

                                {!activity_data || !activity_data.latest_activity && (
                                    <>
                                        <Text className="no_latest_activity" style={styles.no_latest_activity}>posledná aktivita: </Text>
                                        <Text className="none" style={styles.latest_activity_text}>žiadna</Text>
                                    </>
                                )}
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
                                    <Text style={styles.longest_activity_text}>{longest_activity.elapsed_time|format_time}</Text>
                                    <Text className="xp" style={styles.xp}>{longest_activity.gained_xp}XP</Text>
                                    <Text> style={styles.longest_activity_text}{longest_activity.end_time|date:"d.m. Y"}</Text>
                                )}

                                {!longest_activity && (
                                    <Text className="no_longest_activity" style={styles.no_latest_activity}>najdlhšia aktivita: </Text>
                                    <Text className="none" style={styles.none}>žiadna</Text>
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

    exercise: {
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

    reps: {
        // font-family: $article-heading-font;
        fontSize: 22,
    },

    sets: {
        // font-family: $article-heading-font;
        fontSize: 22,
    },

    current: {
        // font-family: $article-heading-font;
        fontSize: 22,
    },

    total: {
        // font-family: $article-heading-font;
        fontSize: 22,
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