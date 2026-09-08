import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert } from "react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import Checkbox from "expo-checkbox"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import Icon from "@/components/Icon"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import { getFormattedDate } from "@/utils/time"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"
import { BasicResponse } from "@/components/Feed"

interface OfficialTasksResponse {
    success:boolean,
    official_tasks?:OfficialTask[],
    official_tasks_remaining_hours?:number,
    message:string
}

interface OfficialTask {
    title:string,
    data:string,
    xp:number,
    progress_percentage:number,
    is_completed:boolean
}

interface CustomTasksResponse {
    success:boolean,
    custom_tasks?:CustomTask[],
    message:string
}

interface CustomTask {
    id:number,
    title:string,
    is_completed:boolean,
    order:number,
    created_at:string
}

interface NewCustomTaskResponse {
    success:boolean,
    custom_task?:CustomTask,
    message:string
}

export default function TasksSection() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [official_tasks, setOfficialTasks] = useState<OfficialTask[]>([]) // Stores The Official Tasks
    const [official_tasks_remaining_hours, setOfficialTasksRemainingHours] = useState<number>(0) // Stores The Official Tasks Remaining Hours
    const [custom_tasks, setCustomTasks] = useState<CustomTask[]>([]) // Stores The Custom Tasks
    
    // Stores The Completed Custom Tasks
    const completed_custom_tasks:CustomTask[] = useMemo(() => {
        return [...custom_tasks].filter(one_task => one_task.is_completed)
    }, [custom_tasks])

    const custom_task_properties = useRef<BottomSheetModal>(null) // Stores The Custom Task Properties
    const snap_points = useMemo(() => ["30%", "50%"], []) // Sets The Snap Points
    const [selected_custom_task, setSelectedCustomTask] = useState<CustomTask|null>(null) // Stores The Selected Custom Task

    const [new_task_title, setNewTaskTitle] = useState<string>("") // Stores The New Task Title

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

    // Function For Get The Official Tasks
    const getOfficialTasks = async ():Promise<void> => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const official_tasks_response:Response = await fetch(`${API_URL}/get-official-tasks/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!official_tasks_response.ok) {
                Alert.alert("Chyba", "Pri získavaní oficiálnych úloh došlo k chybe.") // Shows The Alert
                return
            }

            const official_tasks_data:OfficialTasksResponse = await official_tasks_response.json() // Gets The Official Tasks Plans Data

            // If The Response Isn't Success
            if(!official_tasks_data.success) {
                Alert.alert("Chyba", official_tasks_data.message) // Shows The Alert
                return
            }
            
            else {
                setOfficialTasks(official_tasks_data.official_tasks || []) // Sets The Official Tasks
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri získavaní oficiálnych úloh došlo k chybe.") // Shows The Alert
        }
    }

    // Initializes The Load Of The Official Tasks
    useEffect(() => {
        getOfficialTasks() // Gets The Official Tasks
    }, [])

    // Function For Get The Custom Tasks
    const getCustomTasks = async ():Promise<void> => {
        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const custom_tasks_response:Response = await fetch(`${API_URL}/get-custom-tasks/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!custom_tasks_response.ok) {
                Alert.alert("Chyba", "Pri získavaní vlastných úloh došlo k chybe.") // Shows The Alert
                return
            }

            const custom_tasks_data:CustomTasksResponse = await custom_tasks_response.json() // Gets The Custom Tasks Plans Data

            // If The Response Isn't Success
            if(!custom_tasks_data.success) {
                Alert.alert("Chyba", custom_tasks_data.message) // Shows The Alert
                return
            }
            
            else {
                setCustomTasks(custom_tasks_data.custom_tasks || []) // Sets The Custom Tasks
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri získavaní vlastných úloh došlo k chybe.") // Shows The Alert
        }
    }

    // Initializes The Load Of The Custom Tasks
    useEffect(() => {
        getCustomTasks() // Gets The Custom Tasks
    }, [])

    // Function For Toggle Completion Of The User's Custom Task
    const toggleCompleteCustomTask = async (task_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Dokončenie úlohy nie je možné zmeniť bez prihlásenia.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const toggle_complete_custom_task_response:Response = await fetch(`${API_URL}/toggle-complete-custom-task/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    task_id: task_id
                })
            })

            // If The Response Isn't Success
            if(!toggle_complete_custom_task_response.ok) {
                Alert.alert("Chyba", "Pri zmene stavu úlohy došlo k chybe.") // Shows The Alert
                return
            }

            const toggle_complete_custom_task_data:BasicResponse = await toggle_complete_custom_task_response.json() // Gets The Toggle Complete Custom Task Data

            // If The Response Isn't Success
            if(!toggle_complete_custom_task_data.success) {
                Alert.alert("Chyba", toggle_complete_custom_task_data.message) // Shows The Alert
                return
            }
            
            else {
                // Sets The Custom Tasks
                setCustomTasks(previous_custom_tasks => previous_custom_tasks.map((one_task:CustomTask) => {
                    if(one_task.id === task_id) {
                        // Inverts The Custom Task Completion
                        return {
                            ...one_task,
                            is_completed: !one_task.is_completed
                        }
                    }

                    return one_task // Returns The Unchanged Custom Task
                }))
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri zmene stavu úlohy došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Add The Custom Task
    const addCustomTask = async (title:string):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Úlohu nie je možné pridať bez prihlásenia.") // Shows The Alert
                return
            }

            if(!title.trim()) {
                Alert.alert("Chyba", "Názov úlohy nesmie byť prázdny.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const new_custom_task_response:Response = await fetch(`${API_URL}/add-custom-task/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    custom_task_title: title
                })
            })

            // If The Response Isn't Success
            if(!new_custom_task_response.ok) {
                Alert.alert("Chyba", "Pri pridávaní úlohy došlo k chybe.") // Shows The Alert
                return
            }

            const new_custom_task_data:NewCustomTaskResponse = await new_custom_task_response.json() // Gets The New Custom Task Plans Data

            // If The Response Isn't Success
            if(!new_custom_task_data.success || !new_custom_task_data.custom_task) {
                Alert.alert("Chyba", new_custom_task_data.message) // Shows The Alert
                return
            }
            
            else {
                // Creates The New Custom Task
                const new_custom_task:CustomTask = {
                    ...new_custom_task_data.custom_task,
                    is_completed: false,
                    order: custom_tasks.length + 1
                }

                setCustomTasks([new_custom_task, ...custom_tasks]) // Sets The Custom Tasks
                return
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri pridávaní úlohy došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Delete All Completed Custom Tasks
    const deleteAllCompletedCustomTasks = async (completed_custom_tasks:CustomTask[]):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Úlohy nie je možné odstrániť bez prihlásenia.") // Shows The Alert
                return
            }

            const completed_custom_tasks_ids:number[] = completed_custom_tasks.map(one_task => one_task.id)

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const deleted_custom_tasks_response:Response = await fetch(`${API_URL}/delete-completed-custom-tasks/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    completed_custom_tasks_ids: completed_custom_tasks_ids
                })
            })

            // If The Response Isn't Success
            if(!deleted_custom_tasks_response.ok) {
                Alert.alert("Chyba", "Pri odstraňovaní úloh došlo k chybe.") // Shows The Alert
                return
            }

            const deleted_custom_tasks_data:BasicResponse = await deleted_custom_tasks_response.json() // Gets The Deleted Custom Tasks Data

            // If The Response Isn't Success
            if(!deleted_custom_tasks_data.success) {
                Alert.alert("Chyba", deleted_custom_tasks_data.message) // Shows The Alert
                return
            }
            
            else {
                setCustomTasks(previous_custom_tasks => previous_custom_tasks.filter((one_task:CustomTask) => !completed_custom_tasks_ids.includes(one_task.id))) // Sets The Custom Tasks
                return
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri odstraňovaní úloh došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Delete The Custom Task
    const deleteCustomTask = async (custom_task_id:number):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Úlohu nie je možné odstrániť bez prihlásenia.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const deleted_custom_task_response:Response = await fetch(`${API_URL}/delete-custom-task/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    task_id: custom_task_id
                })
            })

            // If The Response Isn't Success
            if(!deleted_custom_task_response.ok) {
                Alert.alert("Chyba", "Pri odstraňovaní úlohy došlo k chybe.") // Shows The Alert
                return
            }

            const deleted_custom_task_data:BasicResponse = await deleted_custom_task_response.json() // Gets The Official Tasks Plans Data

            // If The Response Isn't Success
            if(!deleted_custom_task_data.success) {
                Alert.alert("Chyba", deleted_custom_task_data.message) // Shows The Alert
                return
            }
            
            else {
                setCustomTasks(previous_custom_tasks => previous_custom_tasks.filter((one_task:CustomTask) => one_task.id !== custom_task_id)) // Sets The Custom Tasks
                setSelectedCustomTask(null) // Sets The Selected Custom Task
                hideCustomTaskProperties() // Closes The Custom Task Properties
                return
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri odstraňovaní úlohy došlo k chybe.") // Shows The Alert
        }
    }

    // Function For Show The Custom Task Properties
    const showCustomTaskProperties = (custom_task:CustomTask):void => {
        setSelectedCustomTask(custom_task) // Sets The Selected Custom Task
        custom_task_properties.current?.present() // Shows The Custom Task Properties
    }

    // Function For Close The Custom Task Properties
    const hideCustomTaskProperties = ():void => {
        setSelectedCustomTask(null) // Sets The Selected Custom Task
        custom_task_properties.current?.dismiss() // Hides The Custom Task Properties
    }

    return (
        <BottomSheetModalProvider>
            <View 
                className="training_section tasks_section"

                style={[
                    styles.training_section,
                    styles.tasks_section
                ]}
            >
                <View className="todo" style={styles.todo}>
                    {/* <audio class="success_sound" src="{% static 'audio/success.mp3' %}" type="audio/mpeg"></audio> <!-- https://pixabay.com/ --> */}

                    <View className="official_tasks" style={styles.official_tasks}>
                        <Text 
                            className="section_title" 

                            style={[
                                styles.section_title,
                                { color: SECONDARY_COLOR },
                            ]}
                        >
                            Dnešné&nbsp;výzvy
                        </Text>

                        {logged_in_user && (
                            <>
                                <View className="remaining_hours" style={styles.remaining_hours}>
                                    <FontAwesome6
                                        name="clock"
                                        size={20}
                                        solid={false}
                                        color={LIGHT_BLUE_COLOR}
                                    />

                                    <Text style={{ color: LIGHT_BLUE_COLOR }}>Ostáva</Text>
                                    <Text style={{ color: LIGHT_BLUE_COLOR }}>{official_tasks_remaining_hours}</Text>
                                    <Text style={{ color: LIGHT_BLUE_COLOR }}>hodín.</Text>
                                </View>

                                <View className="tasks" style={styles.official_tasks_container}>
                                    {official_tasks.map((one_task:OfficialTask) => (
                                        <View className="task" style={styles.official_task}>
                                            <Checkbox
                                                className="checkbox"
                                                // value={isChecked}
                                                // onValueChange={setIsChecked}
                                                // color={isChecked ? '#4630EB' : undefined}
                                                style={styles.official_task_checkbox}
                                            />

                                            {/* .task {
                                                &:has(.checkbox.checked) {
                                                    --progress: 100;
                                                    --progress-color: rgba(82, 207, 32, 0.1);
                                                    border-color: transparentize($green-color, 0.8);
                                                }

                                                .checkbox {
                                                    position: relative;
                                                    display: block;
                                                    flex-shrink: 0;
                                                    width: 15px;
                                                    height: 15px;
                                                    border-radius: 2px;
                                                    outline: 1px solid transparentize($blue-color, 0.8);
                                                    background: transparentize($main-color, 0.5);

                                                    &::before {
                                                        content: "";
                                                        position: absolute;
                                                        width: inherit;
                                                        height: inherit;
                                                        background-image: url("../../../../static/images/check.png"); // https://www.flaticon.com/free-icon/check_16750043
                                                        background-size: contain;
                                                        transform: scale(0);
                                                        opacity: 0;
                                                        transition: transform 0.2s ease, opacity 0.2s ease;
                                                    }

                                                    &.checked {
                                                        outline: 1px solid darken($green-color, 10%);

                                                        &::before {
                                                            transform: scale(1.5);
                                                            opacity: 1;
                                                            transition: transform 0.3s ease, opacity 0.3s ease;
                                                        }
                                                    }
                                                } */}

                                            {one_task.data === "30_minutes_activity" && (<Text className="title" style={styles.title}>Zaznamenaj 30 minút aktivity.</Text>)}
                                            {one_task.data === "1_hour_activity" && (<Text className="title" style={styles.title}>Zaznamenaj 1h aktivity.</Text>)}
                                            {one_task.data === "2_hours_activity" && (<Text className="title" style={styles.title}>Zaznamenaj 2h aktivity.</Text>)}
                                            {one_task.data === "3_hours_activity" && (<Text className="title" style={styles.title}>Zaznamenaj 3h aktivity.</Text>)}
                                            {one_task.data === "beat_average_activity_time" && (<Text className="title" style={styles.title}>Prekonaj týždenný priemer času aktivity.</Text>)}
                                            {one_task.data === "complete_training_plan_activity" && (<Text className="title" style={styles.title}>Dokonči aktivitu podľa tréningového plánu.</Text>)}
                                            {one_task.data === "2_activities" && (<Text className="title" style={styles.title}>Zaznamenaj 2 aktivity.</Text>)}
                                            {one_task.data === "complete_all_official_tasks" && (<Text className="title" style={styles.title}>Splň všetky dnešné výzvy.</Text>)}
                                            {one_task.data === "add_custom_task" && (<Text className="title" style={styles.title}>Pridaj vlastnú úlohu.</Text>)}

                                            <View className="xp" style={styles.xp}>
                                                <Text 
                                                    style={{ 
                                                        color: GREEN_COLOR,
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    {one_task.xp}
                                                </Text>

                                                <Text 
                                                    style={{ 
                                                        color: GREEN_COLOR,
                                                        fontSize: 15, 
                                                        opacity: 0.8,
                                                    }}
                                                >
                                                    XP
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {!logged_in_user && (
                            <View className="no_logged_in">
                                <Text 
                                    style={[
                                        styles.no_logged_in,
                                        { color: SECONDARY_COLOR },
                                    ]}
                                >
                                    Pre prístup k denným výzvam sa musíte
                                </Text>

                                <Pressable 
                                    // onPress={() => setActiveForm("login_form")}
                                    accessibilityLabel="Prihlásiť sa"
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                styles.link,
                                                pressed && { textDecorationLine: "underline" } 
                                            ]}
                                        >
                                            prihlásiť.
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        )}
                    </View>

                    <View className="custom_tasks" style={styles.custom_tasks}>
                        <Text 
                            className="section_title" 

                            style={[
                                styles.section_title,
                                {color: SECONDARY_COLOR},
                            ]}
                        >
                            Moje&nbsp;úlohy
                        </Text>

                        <View className="info" style={styles.info}>
                            <Pressable className="delete_completed" onPress={() => deleteAllCompletedCustomTasks(completed_custom_tasks)}>
                                {({ pressed }) => (
                                    <Text 
                                        style={[
                                            styles.delete_completed,
                                            pressed && { textDecorationLine: "underline" } 
                                        ]}
                                    >
                                        Vymazať dokončené
                                    </Text>
                                )}
                            </Pressable>

                            <Text className="tasks_amount" style={styles.tasks_amount}><Text className="remaining">{completed_custom_tasks.length}</Text> / <Text className="total">{custom_tasks.length || 0}</Text></Text>
                        </View>

                        <ScrollView 
                            className="tasks"
                            showsVerticalScrollIndicator={false}
                            indicatorStyle="white"
                            style={styles.custom_tasks_container}
                            contentContainerStyle={styles.custom_tasks_container}
                        >
                            <View className="add_task_container" style={styles.add_task_container}>
                                <TextInput
                                    className="new_task"
                                    keyboardType="default"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    textAlignVertical="top" 
                                    placeholder="Pridať úlohu" 
                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                    accessibilityLabel="Pridať úlohu" 
                                    value={new_task_title}
                                    onChangeText={setNewTaskTitle}
                                    // maxLength={50}

                                    style={[
                                        styles.new_task, 
                                        { outlineStyle: "none" } as any
                                    ]}
                                />

                                <View className="add_task" style={styles.add_task}>
                                    <Icon
                                        icon_name="plus"
                                        onPress={() => addCustomTask(new_task_title)}
                                        size={25}
                                        // pressed_style={{ transform: [{ scale: 1.1 }] }}
                                    />
                                </View>
                            </View>

                            {custom_tasks.map((one_task:CustomTask) => (
                                <View className="task" style={styles.custom_task}>
                                    {/* <View className="checkbox" style={styles.custom_task_checkbox}></View> */}

                                    <Checkbox
                                        className="checkbox"
                                        // value={isChecked}
                                        // onValueChange={setIsChecked}
                                        // color={isChecked ? '#4630EB' : undefined}
                                        // style={styles.checkbox}
                                    />

                                    <Pressable 
                                        className="title" 

                                        onPress={() => toggleCompleteCustomTask(one_task.id)}

                                        style={{ 
                                            flex: 1,
                                            justifyContent: "center",
                                            height: "100%",
                                            cursor: "pointer" 
                                        }}
                                    >
                                        <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: SECONDARY_COLOR }}>{one_task.title}</Text>
                                    </Pressable>

                                    <Text className="date" style={styles.date}>{getFormattedDate(one_task.created_at, false)}</Text>

                                    <View 
                                        className="show_custom_task_properties_button"
                                        accessibilityLabel="Viac..." 
                                    >
                                        <Icon
                                            icon_name="ellipsis-vertical"
                                            onPress={() => showCustomTaskProperties(one_task)}
                                        />
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                <BottomSheetModal
                    ref={custom_task_properties}
                    snapPoints={snap_points}
                    enablePanDownToClose={true}
                    containerStyle={{ zIndex: 9999 }}
                >
                    <BottomSheetView style={{ padding: 20 }}>
                        {selected_custom_task ? (
                            <View className="custom_task_properties">
                                <Pressable
                                    onPress={() => deleteCustomTask(selected_custom_task.id)}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        styles.sheet_item_border, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <FontAwesome6
                                            name="eraser"
                                            size={20}
                                            color={BLUE_COLOR}
                                        />
                                    </View>

                                    <Text style={styles.sheet_text}>Vymazať</Text>
                                </Pressable>

                                <Pressable
                                    className="hide_custom_task_properties_button"
                                    onPress={hideCustomTaskProperties}
                                    accessibilityRole="button"

                                    style={({ pressed }) => [
                                        styles.sheet_item, 
                                        pressed && styles.sheet_item_pressed
                                    ]}
                                >
                                    <View style={styles.sheet_icon}>
                                        <FontAwesome6
                                            name="xmark"
                                            size={20}
                                            color={BLUE_COLOR}
                                        />
                                    </View>

                                    <Text style={styles.sheet_text}>Zavrieť</Text>
                                </Pressable>
                            </View>
                        ) : null}
                    </BottomSheetView>
                </BottomSheetModal>
            </View>
        </BottomSheetModalProvider>
    )
}

const styles = StyleSheet.create({
    training_section: {
        position: "relative",
        marginHorizontal: "auto",
        marginBottom: 50,
        overflow: "visible",
    },

    tasks_section: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
    },

    todo: {
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        width: "100%",
        marginHorizontal: "auto",
    },

    official_tasks: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
        padding: 20,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    custom_tasks: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
        paddingVertical: 20,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    section_title: {
        marginBottom: 10,
        textAlign: "center",
        fontSize: 30,
    },

    info: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
        paddingHorizontal: 5 + 2.5,
    },

    delete_completed: {
        // font-size: 0.9em;
        color: LIGHT_BLUE_COLOR,
    },

    tasks_amount: {
        // font-size: 0.9em;
        color: LIGHT_BLUE_COLOR,
    },

    official_tasks_container: {
        gap: 10,
        // marginTop: 10,
    },

    official_task: {
        // --progress: 0;
        // --progress-color: rgba(75, 75, 250, 0.1);

        position: "relative",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: transform 0.2s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     cursor: pointer;
        // }
    },

    task_progress: {
        position: "absolute",
        left: 0,
        // transform: scaleX(min(calc(var(--progress) / 100), 1));
        transformOrigin: "left",
        width: "100%",
        height: "100%",
        // backgroundColor: var(--progress-color)
        borderRadius: SMALL_BORDER_RADIUS,
        pointerEvents: "none",
    },

    title: {
        // @include crop_text;
        flexGrow: 1,
        height: 50,
        lineHeight: 50,
        color: SECONDARY_COLOR,
    },

    remaining_hours: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        // font-size: 0.9em;
        color: LIGHT_BLUE_COLOR,
        marginBottom: 10,
    },

    official_task_checkbox: {
        position: "relative",
        flexShrink: 0,
        width: 15,
        height: 15,
        borderRadius: 2,
        // outline: 1px solid transparentize($blue-color, 0.8);
        backgroundColor: transparentize(MAIN_COLOR, 0.5),

        // &.checked {
        //     outline: 1px solid darken($green-color, 10%);

        //     checkbox_icon {
        //         transform: scale(1.5);
        //         opacity: 1;
        //         transition: transform 0.3s ease, opacity 0.3s ease;
        //     }
        // }
    },

    official_task_checkbox_icon: {
        position: "absolute",
        width: 15,
        height: 15,
        // background-image: url("../../../../static/images/check.png"); // https://www.flaticon.com/free-icon/check_16750043
        resizeMode: "contain",
        transform: [{ scale: 0 }],
        opacity: 0,
        // transition: transform 0.2s ease, opacity 0.2s ease;
    },

    xp: {
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        width: 40,
        paddingLeft: 15,
        // border-left: 1px solid $training-surface-border;
        borderLeftWidth: 1,
        borderLeftColor: "#333333"
    },

    no_logged_in: {
        textAlign: "center",
    },

    link: {
        color: SECONDARY_COLOR,
        fontStyle: "italic",
    },

    custom_tasks_container: {
        gap: 10,
        maxHeight: 50 * 3 + 15 * 2,
        // marginTop: 10,
        paddingHorizontal: 5,
        paddingBottom: 5,
    },

    add_task_container: {
        flexDirection: "row",
        flexShrink: 0,
        height: 50,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: SMALL_BORDER_RADIUS,
        overflow: "hidden",
        // transition: border-color 0.3s ease;

        // &:focus-within {
        //     border-color: $blue-color;
        // }
    },

    new_task: {
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 15,
        verticalAlign: "middle",
        color: SECONDARY_COLOR,
    },

    add_task: {
        justifyContent: "center",
        marginVertical: 5,
        marginRight: 15,
        textAlign: "center",
        color: BLUE_COLOR,
        // transition: transform 0.2s ease, color 0.3s ease;
                    
        // &:hover {
        //     transform: scale(1.1);
        //     color: $dark-blue-color;
        //     cursor: pointer;
        // }
    },

    custom_task: {
        flexDirection: "row",
        // justifyContent: "space-between",
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
        // transition: transform 0.2s ease;

        // &::before {
        //     transition: transform 0.3s ease, background-color 0.3s ease;
        // }

        // &:hover {
        //     transform: translateY(-2px);
        //     cursor: pointer;
        // }

        // &:has(input[type="checkbox"]:checked) {
        //     --progress: 100;
        //     --progress-color: rgba(82, 207, 32, 0.1);
        //     border-color: transparentize($green-color, 0.8);

        //     .checkbox {
        //         outline: 1px solid darken($green-color, 10%);

        //         &::before {
        //             transform: scale(1.5);
        //             opacity: 1;
        //             transition: transform 0.3s ease, opacity 0.3s ease;
        //         }
        //     }
        // }

        // &.dragging {
        //     transform: scale(0.98);
        //     opacity: 0.8;
        // }
    },

    custom_task_checkbox: {
        position: "relative",
        flexShrink: 0,
        width: 15,
        height: 15,
        borderRadius: 2,
        // outline: 1px solid transparentize($blue-color, 0.8);
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
    },

    custom_task_checkbox_icon: {
        position: "absolute",
        width: 15,
        height: 15,
        // background-image: url("../../../../static/images/check.png"); // https://www.flaticon.com/free-icon/check_16750043
        resizeMode: "contain",
        transform: [{ scale: 0 }],
        opacity: 0,
        // transition: transform 0.2s ease, opacity 0.2s ease;
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

    sheet_container: {
        paddingBottom: 20,
    },

    sheet_item: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
        paddingVertical: 20,
        paddingHorizontal: 10,
    },

    sheet_item_border: {
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.8),
    },

    sheet_item_pressed: {
        opacity: 0.5,
    },

    sheet_icon: {
        width: 20,
        alignItems: "center",
        justifyContent: "center",
    },

    sheet_text: {
        color: BLUE_COLOR,
    },
})