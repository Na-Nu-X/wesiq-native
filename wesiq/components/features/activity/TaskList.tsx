// Draggable Custom Tasks (Native)

import { NestableDraggableFlatList, RenderItemParams } from "react-native-draggable-flatlist"
import { haptics } from "@/lib/haptics"

import type { ReactElement } from "react"
import type { CustomTask } from "@/types/models"

export interface TaskListProps {
    tasks:CustomTask[],
    renderTask:(params:{ item:CustomTask, index:number, drag?:() => void, is_dragging:boolean }) => ReactElement,
    onReorder:(ordered:CustomTask[]) => void
}

export default function TaskList({ tasks, renderTask, onReorder }:TaskListProps) {
    return (
        <NestableDraggableFlatList
            data={tasks}
            keyExtractor={(task:CustomTask) => String(task.id)}
            renderItem={({ item, drag, isActive, getIndex }:RenderItemParams<CustomTask>) => renderTask({ item, index: getIndex() ?? 0, drag, is_dragging: isActive })}
            onDragBegin={() => haptics.selection()}
            onDragEnd={({ data, from, to }) => { if(from !== to) onReorder(data) }}
            activationDistance={8}
        />
    )
}
