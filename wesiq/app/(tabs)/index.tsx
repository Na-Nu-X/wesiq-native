import { useEffect, useState } from "react"
import { StyleSheet, ScrollView, Alert } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import UploadPostFormDialog from "@/components/pages/community/UploadPostFormDialog"
import SearchUsers from "@/components/pages/community/SearchUsers"
import Feed from "@/components/pages/community/Feed"
import LoginFormDialog from "@/components/LoginFormDialog"
import { SafeAreaView } from "react-native-safe-area-context"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import Banner from "@/components/Banner"
import { useTranslation } from "react-i18next"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { UploadProgressResponse, CompressTask } from "@/components/pages/community/UploadPostFormDialog"
import type { LoadedProcessingPostsResponse, ProcessingPost } from "@/components/pages/community/Feed"

export interface TrackedTask {
  task_id:string,
  post_id:string,
  post_media_id:number,
  progress:number,
  state:"PENDING"|"PROGRESS"|"SUCCESS"|"FAILURE",
}

export default function HomeScreen() {
    const { t } = useTranslation() // Initializes The Translations

    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [is_upload_post_form_dialog_open, setIsUploadPostFormDialogOpen] = useState<boolean>(false) // Stores The Information If The Upload Post Form Dialog Is Open
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [tracked_tasks, setTrackedTasks] = useState<TrackedTask[]>([]) // Stores The Tracked Tasks
    const [compress_tasks, setCompressTasks] = useState<CompressTask[]>([]) // Stores The Currently Being Compressed Tasks

    const [processing_posts, setProcessingPosts] = useState<ProcessingPost[]>([]) // Stores The Processing Posts

    // Function For Load The Stored Tasks
    const loadStoredTasks = async ():Promise<void> => {
        try {
            const stored_processing_posts_json:string|null = await AsyncStorage.getItem("processing_posts") // Gets The Stored Processing Posts In JSON Format

            if(stored_processing_posts_json) {
                const stored_processing_posts:CompressTask[] = JSON.parse(stored_processing_posts_json) // Gets The Stored Processing Posts

                setCompressTasks(stored_processing_posts) // Sets The Compress Tasks

                // Sets The Tracked Tasks
                setTrackedTasks(stored_processing_posts.map((one_task:CompressTask) => ({
                    task_id: one_task.task_id,
                    post_id: String(one_task.post_id),
                    post_media_id: Number(one_task.post_media_id),
                    progress: 0,
                    state: "PENDING"
                })))
            }
        } 
        
        catch {
            console.error(t("Pri načítavaní uložených príspevkov na spracovanie došlo k chybe."))
        }
    }

    // Initializes The Load Of The Stored Tasks
    useEffect(() => {
        loadStoredTasks() // Loads The Stored Tasks
    }, [])

    // Initializes The Load Of The Upload Progress For Each Post Media
    useEffect(() => {
        if(compress_tasks.length === 0) return
    
        let is_mounted:boolean = true // Stores The Information If The User Is On The Screen
    
        // Gets The Upload Progress Every 1,5 Seconds
        const get_upload_progress_interval:number = setInterval(async () => {
            try {
                const all_task_ids:string[] = compress_tasks.map(one_task => one_task.task_id) // Stores All UUIDs Of Tasks (Uploaded Files)

                const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token

                const upload_progress_response_promises:Promise<UploadProgressResponse>[] = all_task_ids.map(async (one_task_id:string):Promise<UploadProgressResponse> => {
                    const upload_progress_response:Response = await fetch(`${API_URL}/get-upload-progress/${one_task_id}/`, {
                        headers: { "Authorization": `Bearer ${user_token}` }
                    })
                    
                    if(!upload_progress_response.ok) throw new Error(t("Chyba servera"))
                    return upload_progress_response.json() as Promise<UploadProgressResponse>
                })
    
                const tasks_results:UploadProgressResponse[] = await Promise.all(upload_progress_response_promises) // Gets The Tasks Results

                if(!is_mounted) return
    
                let any_task_finished:boolean = false  // Stores The Finished Task IDs
                let finished_task_ids:string[] = [] // Stores The Finished Task IDs
    
                // Sets The Tracked Tasks
                setTrackedTasks((previous_tracked_tasks:TrackedTask[]) => {
                    return previous_tracked_tasks.map((one_task:TrackedTask) => {
                        const task_index:number = all_task_ids.indexOf(one_task.task_id) // Gets The Task Index
                        
                        if(task_index === -1 || !tasks_results[task_index]) return one_task // Returns The Unchanged Task

                        // Gets The Upload Progress
                        const upload_progress:{
                            task_id:string,
                            state:"PENDING"|"PROGRESS"|"SUCCESS"|"FAILURE",
                            progress:number
                        } = tasks_results[task_index].upload_progress 

                        const state:"PENDING"|"PROGRESS"|"SUCCESS"|"FAILURE" = upload_progress.state.toUpperCase() as TrackedTask["state"] // Gets The State

                        let progress:number = one_task.progress // Gets The Progress
                        if(state === "SUCCESS") progress = 100 // Sets The Progress
                        else if(upload_progress.progress !== undefined) progress = upload_progress.progress // Sets The Progress
    
                        if(state === "SUCCESS" || state === "FAILURE") {
                            any_task_finished = true,
                            finished_task_ids.push(one_task.task_id)
                        }
    
                        // Returns The Task
                        return { 
                            ...one_task, 
                            progress, 
                            state 
                        }
                    })
                })
    
                if(any_task_finished && finished_task_ids.length > 0) {
                    // Sets The Compress Tasks
                    setCompressTasks((previous_compress_tasks:CompressTask[]) => {
                        const active_processing_posts:CompressTask[] = previous_compress_tasks.filter((one_task:CompressTask) => !finished_task_ids.includes(one_task.task_id)) // Gets The Active Processing Posts
                        
                        if(active_processing_posts.length === 0) {
                            AsyncStorage.removeItem("processing_posts") // Removes Processing Posts From The Async Storage
                        } 
                        
                        else {
                            AsyncStorage.setItem("processing_posts", JSON.stringify(active_processing_posts)) // Saves Processing Posts To The Async Storage
                        }
                        
                        return active_processing_posts // Returns The Active Processing Posts
                    })
                    
                    loadProcessingPosts() // Loads The Processing Posts
                }
    
            } 
            
            catch {
                console.error(t("Pri získavaní pokroku procesu nahrávania príspevku došlo k chybe."))
            }
        }, 1500)
    
        return () => {
            is_mounted = false // Sets The Information That The User Isn't On The Screen
            clearInterval(get_upload_progress_interval) // Deletes The Upload Progress Interval
        }
    }, [compress_tasks])

    // Function For Load The Processing Posts
    const loadProcessingPosts = async ():Promise<void> => {
        if(!logged_in_user) {
            Alert.alert(t("Chyba"), t("Spracovávané príspevky nie je možné získať bez prihlásenia.")) // Shows The Alert
            return
        }

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token

            // Sends The GET Request To The Server
            const loaded_processing_posts_response:Response = await fetch(`${API_URL}/get-processing-posts/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_processing_posts_response.ok) {
                console.log(t("Pri načítaní spracovávaných príspevkov došlo k chybe."))
                return
            }

            const loaded_processing_posts_data:LoadedProcessingPostsResponse = await loaded_processing_posts_response.json() // Gets The Loaded Processing Posts Data

            // If The Response Isn't Success
            if(!loaded_processing_posts_data.success || !loaded_processing_posts_data.processing_posts) {
                console.log(loaded_processing_posts_data.message)
                return
            }
                
            setProcessingPosts(loaded_processing_posts_data.processing_posts) // Sets The Processing Posts
        } 
        
        catch {
            console.log(t("Pri načítaní spracovávaných príspevkov došlo k chybe."))
        }
    }

    // Initializes The Load Of Processing Posts
    useEffect(() => {
        if(logged_in_user) loadProcessingPosts() // Loads Processing Posts
    }, [logged_in_user])

    // Function For Store The Compress Tasks
    const storeCompressTasks = async (new_compress_tasks:CompressTask[]):Promise<void> => {
        try {
            const stored_processing_posts_json:string|null = await AsyncStorage.getItem("processing_posts") // Gets The Stored Processing Posts In JSON Format
            const stored_processing_posts:CompressTask[] = stored_processing_posts_json ? JSON.parse(stored_processing_posts_json) : [] // Gets The Stored Processing Posts
            const combined_tasks:CompressTask[] = [...stored_processing_posts, ...new_compress_tasks] // Gets The Combined Tasks
    
            await AsyncStorage.setItem("processing_posts", JSON.stringify(combined_tasks)) // Saves Processing Posts To The Async Storage
            setCompressTasks(combined_tasks) // Sets The Compress Tasks
            
            // Sets The Tracked Tasks
            setTrackedTasks((previous_tracked_tasks:TrackedTask[]) => {
                const existing_ids:Set<string> = new Set(previous_tracked_tasks.map((one_tracked_task:TrackedTask) => one_tracked_task.task_id)) // Gets The Existing IDs
                
                // Gets The New Tracked Tasks
                const new_tracked_tasks = new_compress_tasks
                    .filter((one_task:CompressTask) => !existing_ids.has(one_task.task_id))
                    .map((one_task:CompressTask) => ({ 
                        task_id: one_task.task_id,
                        post_id: String(one_task.post_id),
                        post_media_id: Number(one_task.post_media_id),
                        progress: 0, 
                        state: "PENDING" as const 
                    }))

                return [...previous_tracked_tasks, ...new_tracked_tasks] // Returns The Combined Tasks
            })
        } 
        
        catch {
            console.error(t("Pri ukladaní úloh o nahrávaní príspevkov došlo k chybe."))
        }
    }

    return (
        <BackgroundContainer style={{ flex: 1 }}>
            <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
                <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                    setIsUploadPostFormDialogOpen={setIsUploadPostFormDialogOpen} 
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
                        onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
                    />

                    <RegistrationFormDialog
                        visible={active_form==="registration_form"}
                        onChangeActiveForm={() => setActiveForm("login_form")}
                        onClose={() => setActiveForm(null)}
                        onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
                    />

                    <UploadPostFormDialog 
                        visible={is_upload_post_form_dialog_open}
                        onClose={() => setIsUploadPostFormDialogOpen(false)}
                        onCompressTasksLoad={(compress_tasks:CompressTask[]) => storeCompressTasks(compress_tasks)}
                    />

                    <SearchUsers />

                    <Feed 
                        tracked_tasks={tracked_tasks} 
                        processing_posts={processing_posts}
                        onProcessingPostsUpdate={(processing_posts:ProcessingPost[]) => setProcessingPosts(processing_posts)}
                    />
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
})