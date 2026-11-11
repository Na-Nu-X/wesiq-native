// Draggable Custom Tasks (iOS, Android And Web)
// A Plain DraggableFlatList Measures Everything Relative To Itself; The Nestable Variant Measured Its Place In The Page
// Only Once, So Once The Cards Above It Loaded, Dragging A Lower Task Scrolled The Whole Page Up

import { LogBox } from "react-native"
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist"
import { haptics } from "@/lib/haptics"
import { useActivityScrollLock } from "./ActivityScroll"

import type { ReactElement } from "react"
import type { CustomTask } from "@/types/models"

LogBox.ignoreLogs(["VirtualizedLists should never be nested"]) // The Short Task List Doesn't Need Its Own Virtualization

export interface TaskListProps {
    tasks:CustomTask[],
    renderTask:(params:{ item:CustomTask, index:number, drag?:() => void, is_dragging:boolean }) => ReactElement,
    onReorder:(ordered:CustomTask[]) => void
}

export default function TaskList({ tasks, renderTask, onReorder }:TaskListProps) {
    const setScrollLocked = useActivityScrollLock() // The Page Must Not Scroll Under The Finger While Dragging

    return (
        <DraggableFlatList
            data={tasks}
            keyExtractor={(task:CustomTask) => String(task.id)}
            renderItem={({ item, drag, isActive, getIndex }:RenderItemParams<CustomTask>) => renderTask({ item, index: getIndex() ?? 0, drag, is_dragging: isActive })}
            scrollEnabled={false} // Shows Every Task; The Page Scrolls Instead
            activationDistance={8}

            onDragBegin={() => {
                setScrollLocked(true)
                haptics.selection()
            }}

            onDragEnd={({ data, from, to }) => {
                setScrollLocked(false)
                if(from !== to) onReorder(data)
            }}
        />
    )
}
