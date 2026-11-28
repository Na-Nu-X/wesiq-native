// Draggable Custom Tasks (iOS, Android And Web)
// A Plain DraggableFlatList Measures Everything Relative To Itself; The Nestable Variant Measured Its Place In The Page
// Only Once, So Once The Cards Above It Loaded, Dragging A Lower Task Scrolled The Whole Page Up
// The List Is Remounted Whenever The Order Of The Tasks Changes: After A Drop The Library Holds Each Row's Last Drag Offset
// Until The Row Reports A New Layout (Which Doesn't Always Happen On The New Architecture, So An Empty Gap Stayed),
// And Its Own Reset On Data Changes Uses InteractionManager, Which React Native 0.88 Removed

import { LogBox } from "react-native"
import type { StyleProp, ViewStyle } from "react-native"
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist"
import { haptics } from "@/lib/haptics"
import { useActivityScrollLock } from "./ActivityScroll"

import type { ReactElement } from "react"
import type { CustomTask } from "@/types/models"

LogBox.ignoreLogs(["VirtualizedLists should never be nested"]) // The Short Task List Doesn't Need Its Own Virtualization

export interface TaskListProps {
    tasks:CustomTask[],
    renderTask:(params:{ item:CustomTask, index:number, drag?:() => void, is_dragging:boolean }) => ReactElement,
    onReorder:(ordered:CustomTask[]) => void,
    style?:StyleProp<ViewStyle>
}

export default function TaskList({ tasks, renderTask, onReorder, style }:TaskListProps) {
    const setScrollLocked = useActivityScrollLock() // The Page Must Not Scroll Under The Finger While Dragging

    const order_key:string = tasks.map((task:CustomTask) => task.id).join(",") // Changes On Every Reorder, Add And Delete

    return (
        <DraggableFlatList
            key = {order_key}
            data = {tasks}
            containerStyle = {style}
            keyExtractor = {(task:CustomTask) => String(task.id)}
            renderItem = {({ item, drag, isActive, getIndex }:RenderItemParams<CustomTask>) => renderTask({ item, index: getIndex() ?? 0, drag, is_dragging: isActive })}
            scrollEnabled = {false} // Shows Every Task; The Page Scrolls Instead
            activationDistance = {8}
            initialNumToRender = {tasks.length} // Renders Every Task On (Re)Mount, So The Height Doesn't Jump

            onDragBegin = {() => {
                setScrollLocked(true) // Sets The Scroll Locked
                haptics.selection()
            }}

            onDragEnd = {({ data, from, to }) => {
                setScrollLocked(false) // Sets The Scroll Locked
                if(from !== to) onReorder(data)
            }}
        />
    )
}
