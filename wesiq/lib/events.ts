// Tiny Typed App Events (For Screens That Stay Mounted, E.g. Tabs, And Must Reload When Data Changes Elsewhere)

type EventMap = {
    training_plans_changed:void,
    posts_changed:void // A Post Was Uploaded, Finished Processing Or Was Deleted
}

type Listener<T> = (payload:T) => void

const listeners:{ [K in keyof EventMap]?:Set<Listener<EventMap[K]>> } = {}

// Function For Subscribe To An Event (Returns The Unsubscribe Function)
export const onAppEvent = <K extends keyof EventMap>(event:K, listener:Listener<EventMap[K]>):(() => void) => {
    const set = (listeners[event] ??= new Set()) as Set<Listener<EventMap[K]>>
    set.add(listener)

    return () => {
        set.delete(listener)
    }
}

// Function For Emit An Event
export const emitAppEvent = <K extends keyof EventMap>(event:K, ...payload:EventMap[K] extends void ? [] : [EventMap[K]]):void => {
    const set = listeners[event] as Set<Listener<EventMap[K]>>|undefined
    set?.forEach((listener) => listener(payload[0] as EventMap[K]))
}
