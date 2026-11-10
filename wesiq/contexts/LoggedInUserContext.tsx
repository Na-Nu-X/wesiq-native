import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { apiGet, onUnauthorized } from "@/lib/api/client"
import { envelopeWith, isRecord } from "@/lib/api/guards"
import { getStoredString, removeStoredValue } from "@/lib/storage"

import type { LoggedInUser } from "@/types/models"
import type { ApiResult } from "@/types/api"

interface LoggedInUserContextValue {
    logged_in_user:LoggedInUser|null,
    setLoggedInUser:React.Dispatch<React.SetStateAction<LoggedInUser|null>>,
    refreshLoggedInUser:() => Promise<LoggedInUser|null>,
    logOut:() => Promise<void>,
    is_loading:boolean
}

const LoggedInUserContext = createContext<LoggedInUserContextValue>({
    logged_in_user: null,
    setLoggedInUser: () => {},
    refreshLoggedInUser: async () => null,
    logOut: async () => {},
    is_loading: true
})

// Checks The Fields The App Relies On
const isLoggedInUserResponse = envelopeWith<{ logged_in_user:LoggedInUser }>({
    logged_in_user: (value:unknown):value is LoggedInUser => isRecord(value) && typeof value.id === "number" && typeof value.username === "string",
})

export const LoggedInUserProvider = ({ children }:{ children:React.ReactNode }) => {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [is_loading, setIsLoading] = useState<boolean>(true) // Stores The Information If The Logged In User Is Loading

    // Function For Get The Logged In User
    const getLoggedInUser = useCallback(async ():Promise<LoggedInUser|null> => {
        try {
            const user_token:string|null = await getStoredString("user_token") // Gets The User Token

            if(!user_token) {
                setLoggedInUser(null) // Removes The Logged In User
                return null
            }

            const response:ApiResult<{ success:boolean, message:string, logged_in_user:LoggedInUser }> = await apiGet("get-logged-in-user/", { guard: isLoggedInUserResponse }) // Sends The GET Request To The Server

            if(!response.ok) {
                if(response.error.kind === "unauthorized") setLoggedInUser(null) // Removes The Logged In User
                return null
            }

            setLoggedInUser(response.data.logged_in_user) // Sets The Logged In User
            return response.data.logged_in_user
        }

        finally {
            setIsLoading(false) // Sets The Information That The Logged In User Isn't Loading
        }
    }, [])

    // Function For Log Out (Removes The Token And The User)
    const logOut = useCallback(async ():Promise<void> => {
        await removeStoredValue("user_token")
        setLoggedInUser(null)
    }, [])

    // Initializes The Get Logged In User And Logout On Expired Token
    useEffect(() => {
        getLoggedInUser() // Gets The Logged In User

        return onUnauthorized(() => setLoggedInUser(null)) // Removes The Logged In User When Any Request Returns 401
    }, [getLoggedInUser])

    return (
        <LoggedInUserContext.Provider value={{ logged_in_user, setLoggedInUser, refreshLoggedInUser: getLoggedInUser, logOut, is_loading }}>
            {children}
        </LoggedInUserContext.Provider>
    )
}

export const useLoggedInUser = ():LoggedInUserContextValue => {
    return useContext(LoggedInUserContext)
}
