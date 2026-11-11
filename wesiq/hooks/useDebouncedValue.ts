// Hook For A Value That Updates Only After It Stops Changing (Search Fields)

import { useEffect, useState } from "react"

export function useDebouncedValue<T>(value:T, delay_ms:number):T {
    const [debounced, setDebounced] = useState<T>(value)

    // Initializes The Delayed Update (The State Is Set In The Timer Callback)
    useEffect(() => {
        const timeout:ReturnType<typeof setTimeout> = setTimeout(() => setDebounced(value), delay_ms)
        return () => clearTimeout(timeout)
    }, [value, delay_ms])

    return debounced
}
