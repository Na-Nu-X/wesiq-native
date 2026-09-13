import { View, Text, StyleSheet, ScrollView, Alert } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useState } from "react"
import Banner from "@/components/Banner"
import LoginFormDialog from "@/components/LoginFormDialog"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import ActivitySection from "@/components/pages/activity/ActivitySection"
import TasksSection from "@/components/pages/activity/TasksSection"
import HistorySection from "@/components/pages/activity/HistorySection"
import { MAIN_WIDTH } from "@/constants/dimensions"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { OfficialTask } from "@/components/pages/activity/TasksSection"

interface CompletedOfficialTaskResponse {
    success: boolean,

    task?:{
        progress_percentage:number,
        is_completed:boolean,
        first_completion:boolean,
        gained_xp: number
    },
    
    message: string
}

export default function ActivityScreen() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [elapsed_time, setElapsedTime] = useState<number>(0) // Stores The Elapsed Time
    const [average_activity_time, setAverageActivityTime] = useState<number>(0) // Stores The Average Activity Time
    const [official_tasks, setOfficialTasks] = useState<OfficialTask[]>([]) // Stores The Official Tasks

    // Function For Complete Official Task
    const completeOfficialTask = async (task_data:string):Promise<void> => {
        try {
            if(!logged_in_user) {
                Alert.alert("Chyba", "Úlohu nie je možné dokončiť bez prihlásenia.") // Shows The Alert
                return
            }

            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const completed_official_task_response:Response = await fetch(`${API_URL}/complete-official-task/`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                },

                body: JSON.stringify({
                    task_data: task_data
                })
            })

            // If The Response Isn't Success
            if(!completed_official_task_response.ok) {
                Alert.alert("Chyba", "Pri označovaní úlohy za dokončenú došlo k chybe.") // Shows The Alert
                return
            }

            const completed_official_task_data:CompletedOfficialTaskResponse = await completed_official_task_response.json() // Gets The Completed Official Task Data

            // If The Response Isn't Success
            if(!completed_official_task_data.success || !completed_official_task_data.task) {
                Alert.alert("Chyba", completed_official_task_data.message) // Shows The Alert
                return
            }

            // Stores The New State Of Updated Official Tasks
            const updated_official_tasks:OfficialTask[] = official_tasks.map((one_task:OfficialTask) => {
                if(one_task.data === task_data) {
                    return { 
                        ...one_task, 
                        progress_percentage: completed_official_task_data.task ? completed_official_task_data.task.progress_percentage : one_task.progress_percentage,
                        is_completed: completed_official_task_data.task ? completed_official_task_data.task.is_completed : one_task.is_completed
                    }
                }

                return one_task
            })

            setOfficialTasks(updated_official_tasks) // Sets The Official Tasks

            const complete_all_official_tasks:OfficialTask|null = official_tasks.find(one_task => one_task.data === "complete_all_official_tasks") || null // Gets The "Complete All Official Tasks" Official Task If Is Available

            if(completed_official_task_data.task.first_completion && completed_official_task_data.task.is_completed) {
                // window.setTimeout(function():void {
                //     displayMessage(`+${completed_official_task_response.gained_xp} XP`, "success") // Displays The Amount Of Gained XP For The Completed Task
                //     success_sound.play() // Plays The Success Sound
                // }, 100)

                // All Official Tasks
                if(complete_all_official_tasks && !complete_all_official_tasks.is_completed) {
                    const other_official_tasks:OfficialTask[] = updated_official_tasks.filter(one_task => one_task.data !== "complete_all_official_tasks") // Gets Other Official Tasks
                    const are_all_other_official_tasks_completed:boolean = other_official_tasks.length > 0 && other_official_tasks.every(one_task => one_task.is_completed) // Stores The Information If All Other Official Tasks Are Completed

                    if(are_all_other_official_tasks_completed) completeOfficialTask("complete_all_official_tasks") // Completes The "Complete All Official Tasks" Official Task
                }
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri označovaní úlohy za dokončenú došlo k chybe.") // Shows The Alert
        }
    }

    return (
        <BackgroundContainer>
            <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
                <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                />

                <ScrollView 
                    className="content" 
                    style={styles.content} 
                    contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled" 
                    keyboardDismissMode="on-drag"
                >
                    <LoginFormDialog 
                        visible={active_form==="login_form"}
                        onChangeActiveForm={() => setActiveForm("registration_form")}
                        onClose={() => setActiveForm(null)}
                        onUserLogin={(logged_in_user_data:LoggedInUser) => setLoggedInUser(logged_in_user_data)}
                    />

                    <RegistrationFormDialog
                        visible={active_form==="registration_form"}
                        onChangeActiveForm={() => setActiveForm("login_form")}
                        onClose={() => setActiveForm(null)}
                        onUserLogin={(logged_in_user_data:LoggedInUser) => setLoggedInUser(logged_in_user_data)}
                    />

                    <View className="training_page" style={styles.training_page}>
                        <ActivitySection 
                            onElapsedTimeUpdate={setElapsedTime} 
                            elapsed_time={elapsed_time} 
                            onAverageActivityTimeLoad={setAverageActivityTime} 
                            official_tasks={official_tasks}
                            onCompleteOfficialTask={(task_data:string) => completeOfficialTask(task_data)}
                        />

                        <TasksSection 
                            elapsed_time={elapsed_time} 
                            average_activity_time={average_activity_time} 
                            onOfficialTasksUpdate={(official_tasks:OfficialTask[]) => setOfficialTasks(official_tasks)}
                            official_tasks={official_tasks}
                            onCompleteOfficialTask={(task_data:string) => completeOfficialTask(task_data)}
                        />
                        
                        <HistorySection />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </BackgroundContainer>
    )
}

const styles = StyleSheet.create({
    safe_area: {
        flex: 1,
    },
  
    content: {
        flex: 1,
    },

    training_page: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginHorizontal: "auto",
    },
})