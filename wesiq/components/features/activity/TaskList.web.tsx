// Custom Tasks (Web: No Dragging, Reorder From The Task Menu)

import { Fragment } from "react"
import { View } from "react-native"

import type { CustomTask } from "@/types/models"
import type { TaskListProps } from "./TaskList"

export default function TaskList({ tasks, renderTask }:TaskListProps) {
    return <View>{tasks.map((task:CustomTask, index:number) => <Fragment key={task.id}>{renderTask({ item: task, index, is_dragging: false })}</Fragment>)}</View>
}
