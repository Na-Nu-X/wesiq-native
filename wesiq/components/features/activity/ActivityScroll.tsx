// Scroll Container Of The Activity Screen (Native: Lets The Custom Tasks List Be Dragged Inside It)

import { NestableScrollContainer } from "react-native-draggable-flatlist"

import type { ComponentProps } from "react"

export default function ActivityScroll(props:ComponentProps<typeof NestableScrollContainer>) {
    return <NestableScrollContainer {...props} />
}
