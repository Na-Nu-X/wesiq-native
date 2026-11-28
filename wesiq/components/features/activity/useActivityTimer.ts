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

// Function For The Activity Timer Hook
export function useActivityTimer():ActivityTimer {
    const [elapsed_ms, setElapsedMs] = useState<number>(0) // Stores The Elapsed MS
    const [is_running, setIsRunning] = useState<boolean>(false) // Stores If It Is Running
    const [is_started, setIsStarted] = useState<boolean>(false) // Stores If It Is Started
    const running_since = useRef<number|null>(null) // Start Of The Current Running Period
    const accumulated_ms = useRef<number>(0) // Time Of Earlier Running Periods

    // Function For Get The Elapsed
    const getElapsed = useCallback(():number => accumulated_ms.current + (running_since.current !== null ? Date.now() - running_since.current : 0), [])

    // Initializes The Tick While Running
    useEffect(() => {
        if(!is_running) return

        const interval:ReturnType<typeof setInterval> = setInterval(() => setElapsedMs(getElapsed()), 500) // Gets The Interval
        return () => clearInterval(interval)
    }, [is_running, getElapsed])

    // Function For Start
    const start = useCallback(():void => {
        if(running_since.current !== null) return

        running_since.current = Date.now()
        setIsRunning(true) // Sets The Running State
        setIsStarted(true) // Sets The Started State
    }, [])

    // Function For Pause
    const pause = useCallback(():void => {
        if(running_since.current === null) return

        accumulated_ms.current += Date.now() - running_since.current
        running_since.current = null
        setIsRunning(false) // Sets The Running State
        setElapsedMs(accumulated_ms.current) // Sets The Elapsed MS
    }, [])

    // Function For Reset
    const reset = useCallback(():number => {
        const final_ms:number = getElapsed() // Gets The Final Time

        running_since.current = null
        accumulated_ms.current = 0
        setIsRunning(false) // Sets The Running State
        setIsStarted(false) // Sets The Started State
        setElapsedMs(0) // Sets The Elapsed MS

        return final_ms
    }, [getElapsed])

    return { elapsed_ms, is_running, is_started, start, pause, reset }
}
