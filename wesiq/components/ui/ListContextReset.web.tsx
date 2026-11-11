// Resets The VirtualizedList Context (Web, react-native-web Has Its Own Copy Of The Lists)

import { ComponentType, ReactNode } from "react"

type Resetter = ComponentType<{ children:ReactNode }>

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { VirtualizedListContextResetter } = require("react-native-web/dist/vendor/react-native/VirtualizedList/VirtualizedListContext") as { VirtualizedListContextResetter:Resetter }

export default function ListContextReset({ children }:{ children:ReactNode }) {
    return <VirtualizedListContextResetter>{children}</VirtualizedListContextResetter>
}
