// Scroll Container Of The Activity Screen (Pauses Scrolling While A Custom Task Is Dragged)

import { createContext, useContext, useState } from "react"
import { ScrollView } from "react-native"

import type { ComponentProps } from "react"

const ScrollLockContext = createContext<(is_locked:boolean) => void>(() => {})

// Function For Pause The Page Scrolling (Used By The Draggable Task List)
export const useActivityScrollLock = ():((is_locked:boolean) => void) => useContext(ScrollLockContext)

export default function ActivityScroll(props:ComponentProps<typeof ScrollView>) {
    const [is_locked, setIsLocked] = useState<boolean>(false) // Stores The Information If A Task Is Being Dragged

    return (
        <ScrollLockContext.Provider value={setIsLocked}>
            <ScrollView {...props} scrollEnabled={!is_locked && props.scrollEnabled !== false} />
        </ScrollLockContext.Provider>
    )
}
