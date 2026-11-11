// Scroll Container Of The Activity Screen (Web: Plain ScrollView, The Nestable Container Needs findNodeHandle)

import { ScrollView } from "react-native"

import type { ComponentProps } from "react"

export default function ActivityScroll(props:ComponentProps<typeof ScrollView>) {
    return <ScrollView {...props} />
}
