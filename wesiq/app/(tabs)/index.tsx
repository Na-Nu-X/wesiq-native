import { useEffect, useState } from "react"
import { StyleSheet, ScrollView, Alert } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import UploadPostFormDialog from "@/components/pages/community/UploadPostFormDialog"
import SearchUsers from "@/components/pages/community/SearchUsers"
import Feed from "@/components/Feed"
import LoginFormDialog from "@/components/LoginFormDialog"
import { SafeAreaView } from "react-native-safe-area-context"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"
import Banner from "@/components/Banner"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import type { UploadProgressResponse, CompressTask } from "@/components/pages/community/UploadPostFormDialog"
import type { LoadedProcessingPostsResponse, ProcessingPost } from "@/components/Feed"

export interface TrackedTask {
  task_id:string,
  post_id:number,
  post_media_id:number,
  progress:number,
  state:"PENDING"|"PROGRESS"|"SUCCESS"|"FAILURE",
}

export default function HomeScreen() {
  const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
  const [is_upload_post_form_dialog_open, setIsUploadPostFormDialogOpen] = useState<boolean>(false) // Stores The Information If The Upload Post Form Dialog Is Open
  const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

  const [tracked_tasks, setTrackedTasks] = useState<TrackedTask[]>([]) // Stores The Tracked Tasks
  const [compress_tasks, setCompressTasks] = useState<CompressTask[]>([]) // Stores The Currently Being Compressed Tasks

  const [processing_posts, setProcessingPosts] = useState<ProcessingPost[]>([]) // Stores The Processing Posts

  // Function For Get The Upload Progress For Each Post Media
  const getUploadProgress = async ():Promise<void> => {
    try {
      if(!logged_in_user) {
        Alert.alert("Chyba", "Príspevok nie je možné pridať bez prihlásenia.") // Shows The Alert
        return
      }

      if(compress_tasks.length > 0) {
        const all_task_ids:string[] = compress_tasks.map((one_task:CompressTask) => one_task.task_id) // Stores All UUIDs Of Tasks (Uploaded Files)

        // Creates The New Tracked Tasks
        const new_tracked_tasks:TrackedTask[] = compress_tasks.map((one_task:CompressTask) => ({
            task_id: one_task.task_id,
            post_id: one_task.post_id,
            post_media_id: one_task.post_media_id,
            progress: 0,
            state: "PENDING"
        }))

        // Sets The Tracked Tasks
        setTrackedTasks((previous_tracked_tasks:TrackedTask[]) => {
            const existing_ids:Set<string> = new Set(previous_tracked_tasks.map((one_task:TrackedTask) => one_task.task_id)) // Gets The Existing IDs
            const unique_new_tasks = new_tracked_tasks.filter((one_task:TrackedTask) => !existing_ids.has(one_task.task_id)) // Gets The Unique New Tasks
            return [...previous_tracked_tasks, ...unique_new_tasks]
        })

        // Checks The Progress Of Uploaded Posts
        const check_upload_progress_interval = setInterval(async () => {
          try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token

            const upload_progress_response_promises:Promise<UploadProgressResponse>[] = all_task_ids.map(async (one_task_id:string):Promise<UploadProgressResponse> => {    
              const upload_progress_response:Response = await fetch(`${API_URL}/get-upload-progress/${one_task_id}/`, {
                headers: { "Authorization": `Bearer ${user_token}` }
              })
              
              if(!upload_progress_response.ok) throw new Error("Chyba servera")
              return upload_progress_response.json() as Promise<UploadProgressResponse>
            })

            const tasks_results:UploadProgressResponse[] = await Promise.all(upload_progress_response_promises)

            loadProcessingPosts() // Loads Processing Posts

            // Sets The Tracked Tasks
            setTrackedTasks((previous_tracked_tasks:TrackedTask[]) => previous_tracked_tasks.map((one_task:TrackedTask) => {
              const task_index:number = all_task_ids.indexOf(one_task.task_id) // Gets The Task Index
              
              if(task_index !== -1 && tasks_results[task_index]) {
                const upload_progress = tasks_results[task_index].upload_progress // Gets The Upload Progress
                const state:"PENDING"|"PROGRESS"|"SUCCESS"|"FAILURE" = upload_progress.state.toUpperCase() as TrackedTask["state"] // Gets The State
                
                let progress = one_task.progress // Gets The Progress
                if(state === "SUCCESS") progress = 100 // Sets The Progress
                else if(upload_progress.progress !== undefined) progress = upload_progress.progress // Sets The Progress
        
                return {
                  ...one_task,
                  progress: progress,
                  state: state
                }
              }
          
              return one_task // Returns The Unchanged Task
            }))

            // Gets The Finished Task IDs
            const finished_task_ids:string[] = all_task_ids.filter((task_id:string, index:number) => {
              const state:string = tasks_results[index].upload_progress.state.toUpperCase() // Gets The State
              return state === "SUCCESS" || state === "FAILURE" // Returns Completed Tasks
            })

            if(finished_task_ids.length > 0) {
              try {
                const stored_processing_posts_json:string|null = await AsyncStorage.getItem("processing_posts") // Gets The Stored Processing Posts In JSON Format
                
                if(stored_processing_posts_json) {
                  const stored_processing_posts:CompressTask[] = JSON.parse(stored_processing_posts_json) // Gets The Stored Processing Posts
                  const active_processing_posts:CompressTask[] = stored_processing_posts.filter(one_task => !finished_task_ids.includes(one_task.task_id)) // Gets The Active Processing Posts

                  if(active_processing_posts.length === 0) await AsyncStorage.removeItem("processing_posts") // Removes Processing Posts From The Async Storage
                  else await AsyncStorage.setItem("processing_posts", JSON.stringify(active_processing_posts)) // Saves Processing Posts To The Async Storage
                }
              }
              
              catch {
                console.error("Pri mazaní dokončených úloh došlo k chybe.")
              }
            }

            const all_tasks_finished:boolean = tasks_results.every((one_task:UploadProgressResponse) => one_task.upload_progress.state.toUpperCase() === "SUCCESS") // If Every Tasks Has Been Succeeded
            const any_task_failed:boolean = tasks_results.some((one_task:UploadProgressResponse) => one_task.upload_progress.state.toUpperCase() === "FAILURE") // If Any Task Has Failed

            // let total_progress:number = 0 // Stores The Total Progress

            // tasks_results.forEach(one_task => {
            //   if(one_task.upload_progress) {
            //     if(one_task.upload_progress.state.toUpperCase() === "SUCCESS") {
            //       total_progress += 100
            //     }

            //     else if(one_task.upload_progress.progress !== undefined) total_progress += one_task.upload_progress.progress
            //   }
            // })

            if(all_tasks_finished) {
              clearInterval(check_upload_progress_interval) // Deletes The Upload Progress Interval
            }

            else if(any_task_failed) {
              clearInterval(check_upload_progress_interval) // Deletes The Upload Progress Interval
              // setButtonText("Chyba pri spracovaní") // Sets The Button Text
            }
          }
            
          catch {
            // setButtonText("Chyba spojenia") // Sets The Button Text
          }
        }, 1500)
      }
    }
    
    catch {
        // setButtonText("Skúste znovu") // Sets The Button Text
    }
  }

  useEffect(() => {
    getUploadProgress() // Gets The Upload Progress For Each Post Media
  }, [compress_tasks])

  // Function For Load Processing Posts
  const loadProcessingPosts = async () => {
    if(!logged_in_user) {
      Alert.alert("Chyba", "Spracovávané príspevky nie je možné získať bez prihlásenia.") // Shows The Alert
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
        Alert.alert("Chyba", "Pri načítaní spracovávaných príspevkov došlo k chybe.") // Shows The Alert
        return
      }

      const loaded_processing_posts_data:LoadedProcessingPostsResponse = await loaded_processing_posts_response.json() // Gets The Loaded Processing Posts Data

      // If The Response Isn't Success
      if(!loaded_processing_posts_data.success || !loaded_processing_posts_data.processing_posts) {
        Alert.alert("Chyba", loaded_processing_posts_data.message) // Shows The Alert
        return
      }
        
      setProcessingPosts(loaded_processing_posts_data.processing_posts) // Sets The Processing Posts
    } 
    
    catch {
      Alert.alert("Chyba", "Pri načítaní spracovávaných príspevkov došlo k chybe.") // Shows The Alert
    }
  }

  // Initializes The Load Of Processing Posts
  useEffect(() => {
    if(logged_in_user) loadProcessingPosts() // Loads Processing Posts
  }, [logged_in_user])

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
            onCompressTasksLoad={(compress_tasks:CompressTask[]) => setCompressTasks(compress_tasks)}
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