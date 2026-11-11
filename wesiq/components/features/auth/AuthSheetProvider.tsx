// One Login / Registration Sheet For The Whole App (Any Screen Can Ask The User To Log In)

import { createContext, ReactNode, useContext, useMemo, useState } from "react"
import AuthSheet, { AuthForm } from "./AuthSheet"

interface AuthSheetContextValue {
    open:(form?:AuthForm) => void
}

const AuthSheetContext = createContext<AuthSheetContextValue>({ open: () => {} })

export function AuthSheetProvider({ children }:{ children:ReactNode }) {
    const [active_form, setActiveForm] = useState<AuthForm|null>(null) // Stores The Open Form

    const value:AuthSheetContextValue = useMemo(() => ({ open: (form:AuthForm = "login_form") => setActiveForm(form) }), [])

    return (
        <AuthSheetContext.Provider value={value}>
            {children}
            <AuthSheet active_form={active_form} onActiveFormChange={setActiveForm} />
        </AuthSheetContext.Provider>
    )
}

export const useAuthSheet = ():AuthSheetContextValue => useContext(AuthSheetContext)
