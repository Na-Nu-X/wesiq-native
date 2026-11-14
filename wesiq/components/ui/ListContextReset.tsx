// Resets The VirtualizedList Context (Native)
// React Context Passes Through Modals, So A FlatList In A Sheet Opened From A Feed Item Thinks It's Nested
// In The Feed List And Renders Without Its Own ScrollView (No Scrolling, No contentContainerStyle).

import { ComponentType, ReactNode } from "react"

type Resetter = ComponentType<{ children:ReactNode }>

// The Package Ships No Types For The Resetter, So The Shape Is Declared Here
// It Is Exposed Only On The Default Export (A Getter), Not As A Named Export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const lists = require("@react-native/virtualized-lists") as { default?:{ VirtualizedListContextResetter:Resetter }, VirtualizedListContextResetter?:Resetter }
const VirtualizedListContextResetter:Resetter = (lists.default ?? lists).VirtualizedListContextResetter as Resetter

export default function ListContextReset({ children }:{ children:ReactNode }) {
    return <VirtualizedListContextResetter>{children}</VirtualizedListContextResetter>
}
