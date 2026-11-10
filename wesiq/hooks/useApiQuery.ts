// Hook For Load Data From The API (Handles Loading, Errors, Refetch, Cancellation And Stale Responses)

import { useCallback, useEffect, useRef, useState } from "react"

import type { ApiError, ApiResult } from "@/types/api"

export type QueryState<T> =
    | { status:"loading", data:T|null, error:null }
    | { status:"success", data:T, error:null }
    | { status:"error", data:T|null, error:ApiError }

interface StoredResult<T> {
    key:string, // Key Of The Request That Produced This Result
    data:T|null,
    error:ApiError|null
}

interface UseApiQueryOptions {
    is_enabled?:boolean // When False, Nothing Is Loaded (E.g. Until The User Is Logged In)
}

export interface UseApiQueryResult<T> {
    state:QueryState<T>,
    refetch:() => Promise<void>,
    is_refreshing:boolean, // True While A Manual Refetch Runs (For Pull To Refresh)
    setData:(updater:(previous:T|null) => T|null) => void // Optimistic Local Updates
}

// "key" Must Change Whenever The Request Changes (E.g. `profile:${username}`)
export function useApiQuery<T>(
    key:string,
    fetcher:(signal:AbortSignal) => Promise<ApiResult<T>>,
    { is_enabled = true }:UseApiQueryOptions = {}
):UseApiQueryResult<T> {
    const [result, setResult] = useState<StoredResult<T>|null>(null) // Stores The Last Result
    const [is_refreshing, setIsRefreshing] = useState<boolean>(false) // Stores The Information If A Refetch Runs
    const fetcher_reference = useRef(fetcher) // Stores The Latest Fetcher (So The Effect Doesn't Restart On Every Render)
    const request_counter = useRef<number>(0) // Ignores Responses Of Older Requests

    // Initializes The Update Of The Fetcher Reference
    useEffect(() => {
        fetcher_reference.current = fetcher
    })

    // Function For Run The Request
    const run = useCallback(async (request_key:string, signal:AbortSignal):Promise<void> => {
        const request_id:number = ++request_counter.current // Gets The Request ID
        const response:ApiResult<T> = await fetcher_reference.current(signal) // Sends The Request

        if(signal.aborted || request_id !== request_counter.current) return

        setResult((previous:StoredResult<T>|null) => response.ok
            ? { key: request_key, data: response.data, error: null }
            : { key: request_key, data: previous?.key === request_key ? previous.data : null, error: response.error }
        )
    }, [])

    // Initializes The Load When The Key Changes
    useEffect(() => {
        if(!is_enabled) return

        const controller:AbortController = new AbortController()
        run(key, controller.signal)

        return () => controller.abort()
    }, [key, is_enabled, run])

    // Function For Refetch (Keeps The Current Data Visible)
    const refetch = useCallback(async ():Promise<void> => {
        if(!is_enabled) return

        setIsRefreshing(true)

        try {
            await run(key, new AbortController().signal)
        }

        finally {
            setIsRefreshing(false)
        }
    }, [key, is_enabled, run])

    // Function For Update The Data Locally
    const setData = useCallback((updater:(previous:T|null) => T|null):void => {
        setResult((previous:StoredResult<T>|null) => ({
            key,
            data: updater(previous?.key === key ? previous.data : null),
            error: null,
        }))
    }, [key])

    // Derives The State (A Result Of An Older Key Means The New One Is Still Loading)
    const is_current:boolean = result !== null && result.key === key
    let state:QueryState<T>

    if(!is_current || !result) state = { status: "loading", data: null, error: null }
    else if(result.error) state = { status: "error", data: result.data, error: result.error }
    else if(result.data !== null) state = { status: "success", data: result.data, error: null }
    else state = { status: "loading", data: null, error: null }

    return { state, refetch, is_refreshing, setData }
}
