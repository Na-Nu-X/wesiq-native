// Tracks Server Side Processing Of Uploaded Posts (Video Compression) And Keeps The Tasks Across App Restarts

import { useCallback, useEffect, useRef, useState } from "react"
import { apiGet } from "@/lib/api/client"
import { isRecord } from "@/lib/api/guards"
import { emitAppEvent } from "@/lib/events"
import { getStoredJson, removeStoredValue, setStoredJson } from "@/lib/storage"
import { getProcessingPosts } from "@/lib/api/endpoints/posts"

import type { ProcessingPost } from "@/types/models"
import type { CompressTask } from "@/components/features/upload-post/UploadPostSheet"

export type TaskState = "PENDING"|"PROGRESS"|"SUCCESS"|"FAILURE"

export interface TrackedTask {
    task_id:string,
    post_id:string,
    post_media_id:number,
    progress:number,
    state:TaskState
}

const POLL_INTERVAL_MS:number = 1500

const isCompressTaskList = (value:unknown):value is CompressTask[] => {
    return Array.isArray(value) && value.every((task) => isRecord(task) && typeof task.task_id === "string")
}

// Function For Create A Tracked Task
const toTracked = (task:CompressTask):TrackedTask => ({ task_id: task.task_id, post_id: String(task.post_id), post_media_id: Number(task.post_media_id), progress: 0, state: "PENDING" })

export function useUploadTracking(is_enabled:boolean) {
    const [tasks, setTasks] = useState<CompressTask[]>([]) // Stores The Unfinished Tasks
    const [tracked, setTracked] = useState<TrackedTask[]>([]) // Stores The Progress Of Each Task
    const [processing_posts, setProcessingPosts] = useState<ProcessingPost[]>([]) // Stores The Posts Being Processed
    const is_polling = useRef<boolean>(false) // Prevents Overlapping Polls

    // Function For Load The Processing Posts
    const loadProcessingPosts = useCallback(async ():Promise<void> => {
        const response = await getProcessingPosts() // Sends The Request
        if(response.ok) setProcessingPosts(response.data.processing_posts)
    }, [])

    // Initializes The Restore Of Stored Tasks And The First Load
    useEffect(() => {
        if(!is_enabled) return

        getStoredJson("processing_posts", isCompressTaskList, []).then((stored:CompressTask[]) => {
            setTasks(stored)
            setTracked(stored.map(toTracked))
        })

        getProcessingPosts().then((response) => {
            if(response.ok) setProcessingPosts(response.data.processing_posts) // State Is Set Only After The Response
        })
    }, [is_enabled])

    // Initializes The Polling While Tasks Are Unfinished
    useEffect(() => {
        if(!is_enabled || tasks.length === 0) return

        const interval:ReturnType<typeof setInterval> = setInterval(async () => {
            if(is_polling.current) return
            is_polling.current = true

            try {
                const results = await Promise.all(tasks.map((task:CompressTask) => apiGet(`get-upload-progress/${encodeURIComponent(task.task_id)}/`)))
                const finished_ids:Set<string> = new Set()

                const updates:Map<string, { state:TaskState, progress:number }> = new Map()

                results.forEach((result, index:number) => {
                    const task:CompressTask|undefined = tasks[index] // Gets The Task
                    if(!task || !result.ok) return

                    const upload_progress:unknown = (result.data as unknown as Record<string, unknown>).upload_progress // Gets The Progress
                    if(!isRecord(upload_progress)) return

                    const state:TaskState = String(upload_progress.state).toUpperCase() as TaskState // Gets The State
                    const progress:number = state === "SUCCESS" ? 100 : typeof upload_progress.progress === "number" ? upload_progress.progress : 0

                    updates.set(task.task_id, { state, progress })
                    if(state === "SUCCESS" || state === "FAILURE") finished_ids.add(task.task_id)
                })

                setTracked((previous:TrackedTask[]) => previous.map((task:TrackedTask) => updates.has(task.task_id) ? { ...task, ...updates.get(task.task_id) } : task))

                if(finished_ids.size > 0) {
                    const remaining:CompressTask[] = tasks.filter((task:CompressTask) => !finished_ids.has(task.task_id)) // Gets The Unfinished Tasks
                    setTasks(remaining)

                    if(remaining.length === 0) await removeStoredValue("processing_posts")
                    else await setStoredJson("processing_posts", remaining)

                    await loadProcessingPosts()
                    emitAppEvent("posts_changed") // Shows The Finished Post In The Feed
                }
            }

            finally {
                is_polling.current = false
            }
        }, POLL_INTERVAL_MS)

        return () => clearInterval(interval)
    }, [is_enabled, tasks, loadProcessingPosts])

    // Function For Start Tracking New Tasks (After An Upload)
    const addTasks = useCallback(async (new_tasks:CompressTask[]):Promise<void> => {
        const stored:CompressTask[] = await getStoredJson("processing_posts", isCompressTaskList, []) // Gets The Stored Tasks
        const known:Set<string> = new Set(stored.map((task:CompressTask) => task.task_id))
        const combined:CompressTask[] = [...stored, ...new_tasks.filter((task:CompressTask) => !known.has(task.task_id))]

        await setStoredJson("processing_posts", combined)
        setTasks(combined)
        setTracked((previous:TrackedTask[]) => {
            const tracked_ids:Set<string> = new Set(previous.map((task:TrackedTask) => task.task_id))
            return [...previous, ...new_tasks.filter((task:CompressTask) => !tracked_ids.has(task.task_id)).map(toTracked)]
        })

        await loadProcessingPosts() // Shows The New Post Right Away (It Used To Appear Only After A Task Finished)
    }, [loadProcessingPosts])

    return { processing_posts, tracked, addTasks, reloadProcessingPosts: loadProcessingPosts }
}
