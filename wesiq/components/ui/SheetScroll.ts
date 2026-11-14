// Lets Inputs Inside A Scrollable Sheet Ask The Sheet To Scroll Them Above The Keyboard

import { createContext, useContext } from "react"
import type { HostInstance } from "react-native"

export type RevealFocusedInput = (target?:HostInstance|null) => void // Reveals The Target View (E.g. An Input With Its Suggestions), By Default The Focused Input

export const SheetScrollContext = createContext<RevealFocusedInput|null>(null)

// Function For Get The Reveal Function Of The Nearest Scrollable Sheet (Null Outside Of One)
export const useRevealFocusedInput = ():RevealFocusedInput|null => useContext(SheetScrollContext)
