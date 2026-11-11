// Stopwatch For The Recorded Activity (Wall-Clock Based, So It Stays Correct While The App Is In The Background)

import { useCallback, useEffect, useRef, useState } from "react"

export interface ActivityTimer {
    elapsed_ms:number,
    is_running:boolean,
    is_started:boolean, // Started And Not Yet Finished (Also While Paused)
    start:() => void,
    pause:() => void,
    reset:() => number // Returns The Final Elapsed Time
}

export function useActivityTimer():ActivityTimer {
    const [elapsed_ms, setElapsedMs] = useState<number>(0)
    const [is_running, setIsRunning] = useState<boolean>(false)
    const [is_started, setIsStarted] = useState<boolean>(false)
    const running_since = useRef<number|null>(null) // Start Of The Current Running Period
    const accumulated_ms = useRef<number>(0) // Time Of Earlier Running Periods

    const getElapsed = useCallback(():number => accumulated_ms.current + (running_since.current !== null ? Date.now() - running_since.current : 0), [])

    // Initializes The Tick While Running
    useEffect(() => {
        if(!is_running) return

        const interval:ReturnType<typeof setInterval> = setInterval(() => setElapsedMs(getElapsed()), 500)
        return () => clearInterval(interval)
    }, [is_running, getElapsed])

    const start = useCallback(():void => {
        if(running_since.current !== null) return

        running_since.current = Date.now()
        setIsRunning(true)
        setIsStarted(true)
    }, [])

    const pause = useCallback(():void => {
        if(running_since.current === null) return

        accumulated_ms.current += Date.now() - running_since.current
        running_since.current = null
        setIsRunning(false)
        setElapsedMs(accumulated_ms.current)
    }, [])

    const reset = useCallback(():number => {
        const final_ms:number = getElapsed() // Gets The Final Time

        running_since.current = null
        accumulated_ms.current = 0
        setIsRunning(false)
        setIsStarted(false)
        setElapsedMs(0)

        return final_ms
    }, [getElapsed])

    return { elapsed_ms, is_running, is_started, start, pause, reset }
}
