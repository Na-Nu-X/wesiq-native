import React, { createContext, useState, useEffect, useContext } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "@/constants/general"

import type { LoggedInUserResponse, LoggedInUser } from "@/components/LoginFormDialog"

const LoggedInUserContext = createContext<{ 
    logged_in_user:LoggedInUser|null,
    setLoggedInUser:React.Dispatch<React.SetStateAction<LoggedInUser|null>>,
    refreshLoggedInUser:() => Promise<LoggedInUser|null>,
    is_loading:boolean
}>({
    logged_in_user: null,
    setLoggedInUser: () => {},
    refreshLoggedInUser: async () => null,
    is_loading: true
})

export const LoggedInUserProvider = ({ children }:{ children:React.ReactNode }) => {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [is_loading, setIsLoading] = useState<boolean>(true) // Stores The Information If The Logged In User Is Loading

    // Function For Get The Logged In User
    const getLoggedInUser = async () => {
        setIsLoading(true) // Sets The Information That The Logged In User Is Loading

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The GET Request To The Server
            const logged_in_user_response:Response = await fetch(`${API_URL}/get-logged-in-user/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })
    
            const logged_in_user_data:LoggedInUserResponse = await logged_in_user_response.json() // Gets The Logged In User Data

            if(logged_in_user_response.status === 401) {
                await AsyncStorage.removeItem("user_token") // Removes The User Token
                setLoggedInUser(null) // Removes The Logged In User
                return null
            }
    
            if(logged_in_user_data.success) {
                setLoggedInUser(logged_in_user_data.logged_in_user || null) // Sets The Logged In User
                return logged_in_user_data.logged_in_user || null
            } 
            
            else return null
        } 
        
        catch {
            return null
        }

        finally {
            setIsLoading(false) // Sets The Information That The Logged In User Isn't Loading
        }
    }

    // Initializes The Get Logged In User
    useEffect(() => {
        getLoggedInUser() // Gets The Logged In User
    }, [])

    return (
        <LoggedInUserContext.Provider value={{ logged_in_user, setLoggedInUser, refreshLoggedInUser: getLoggedInUser, is_loading }}>
            {children}
        </LoggedInUserContext.Provider>
    )
}

export const useLoggedInUser = () => {
    return useContext(LoggedInUserContext)
}