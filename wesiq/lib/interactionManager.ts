// Restores InteractionManager.runAfterInteractions For Libraries That Still Call It (React Native 0.88 Removed It)
// - react-native-draggable-flatlist Resets Its Drag Offsets With It After Every Reorder. Without It The Call Throws During Render,
//   React Retries The Render Without The Reset And The Rows Keep Their Old Offsets (Empty Gaps Between Exercises / Tasks)
// - rn-emoji-keyboard Uses It When Rendering A Category
// Web Is Untouched (react-native-web Still Ships Its Own InteractionManager)

import { Platform } from "react-native"

type InteractionTask = (() => void)|{ run:() => void }|{ gen:() => Promise<void> }

interface CancellableTask {
    then:Promise<void>["then"],
    done:(...args:unknown[]) => void,
    cancel:() => void
}

// Function For Run A Task On The Next Tick (Gestures And Animations That Trigger These Calls Have Already Finished)
const runAfterInteractions = (task?:InteractionTask):CancellableTask => {
    let is_cancelled:boolean = false // Checks If It Is Cancelled

    // Gets The Promise
    const promise:Promise<void> = new Promise<void>((resolve) => {
        setTimeout(() => {
            if(is_cancelled) return

            if(typeof task === "function") task()
            else if(task && "run" in task) task.run()
            else if(task && "gen" in task) task.gen().catch(() => {})

            resolve()
        }, 0)
    })

    return {
        then: promise.then.bind(promise),
        done: () => {},
        cancel: () => {
            is_cancelled = true
        },
    }
}

// Defines The Interaction Manager
const interaction_manager = {
    runAfterInteractions,
    createInteractionHandle: ():number => 0,
    clearInteractionHandle: ():void => {},
    setDeadline: ():void => {},
}

// Function For Install The Shim (Before Any Screen Renders)
export const installInteractionManagerShim = ():void => {
    if(Platform.OS === "web") return

    // The Exports Object Itself (An "import * as" Namespace Would Be A Copy The Libraries Never Read)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const react_native = require("react-native") as Record<string, unknown> // Gets The React Native

    // Replaces The Development Getter That Throws (It Is Configurable) Or Adds The Missing Export In Production
    Object.defineProperty(react_native, "InteractionManager", {
        configurable: true,
        enumerable: true,
        value: interaction_manager,
    })
}
