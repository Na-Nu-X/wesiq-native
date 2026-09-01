import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert } from "react-native"
import { useEffect, useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import Checkbox from "expo-checkbox"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import Icon from "@/components/Icon"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { API_URL } from "@/constants/general"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getFormattedDate, getMinimalistFormattedTime } from "@/utils/time"

interface LoadedActivityHistoryResponse {
    success:boolean,
    activity_history?:Activity[],
    message:string
}

export interface Activity {
    end_time:string,
    elapsed_time:number,
    gained_xp:number,
    type:string,
    training_plan_day:number,

    training_plan_summary:{
        color:string,
        exercise:string,
        gained_xp:number,
        elapsed_time:number
    }[]
}

export default function HistorySection() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [activity_history, setActivityHistory] = useState<Activity[]>([]) // Stores The Activity History

    // Function For Get The Activity History
    const getActivityHistory = async ():Promise<void> => {
        if(!logged_in_user) return

        try {
            const user_token:string|null = await AsyncStorage.getItem("user_token") // Gets The User Token
    
            // Sends The POST Request To The Server
            const loaded_activity_history_response:Response = await fetch(`${API_URL}/get-activity-history/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${user_token}`
                }
            })

            // If The Response Isn't Success
            if(!loaded_activity_history_response.ok) {
                Alert.alert("Chyba", "Pri získavaní histórie zaznamenaných aktivít došlo k chybe.") // Shows The Alert
                return
            }

            const loaded_activity_history_data:LoadedActivityHistoryResponse = await loaded_activity_history_response.json() // Gets The Loaded Activity History Plans Data

            // If The Response Isn't Success
            if(!loaded_activity_history_data.success || !loaded_activity_history_data.activity_history) {
                Alert.alert("Chyba", loaded_activity_history_data.message) // Shows The Alert
                return
            }
            
            else {
                setActivityHistory(loaded_activity_history_data.activity_history) // Sets The Activity Data
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri získavaní histórie zaznamenaných aktivít došlo k chybe.") // Shows The Alert
        }
    }

    // Initializes The Load Of The Activity History
    useEffect(() => {
        getActivityHistory() // Gets The Activity History
    }, [])

    return (
        <View 
            className="training_section history_section" 
            
            style={[
                styles.training_section,
                styles.history_section
            ]}
        >
            <View className="activity_history_container" style={styles.activity_history_container}>
                <ScrollView className="activity_history" style={styles.activity_history}>
                    {activity_history.map((one_activity:Activity) => (
                        <View className="one_activity" style={styles.one_activity}>
                            <FontAwesome6
                                name="list"
                                size={20}
                                color={BLUE_COLOR}
                            />

                            <Text className="training_plan_title" style={styles.training_plan_title}>{one_activity.type ? one_activity.type : "Aktivita"}</Text>

                            <Text className="elapsed_time" style={{ width: 60 }}>{getMinimalistFormattedTime(one_activity.elapsed_time)}</Text>

                            <Text 
                                className="gained_xp" 

                                style={[
                                    styles.gained_xp,
                                    { width: 50 }
                                ]}
                            >
                                {one_activity.gained_xp}XP
                            </Text>

                            <Text className="date" style={{ width: 40 }}>{getFormattedDate(one_activity.end_time)}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    training_section: {
        position: "relative",
        marginHorizontal: "auto",
        marginBottom: 50,
        overflow: "visible",
    },

    history_section: {
        maxWidth: MAIN_WIDTH,
        marginBottom: 30,
    },

    activity_history_container: {
        marginHorizontal: "auto",
        padding: 5,
        // background: linear-gradient(145deg, transparentize($blue-color, 0.95) 0%, transparentize($main-color, 0.95) 100%);
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    activity_history: {
        gap: 10,
        maxWidth: "100%",
        width: "100%",
        maxHeight: 50 * 5 + 10,
        padding: 15,
    },

    one_activity: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexShrink: 0,
        height: 50,
        paddingHorizontal: 15,
        backgroundColor: transparentize(DARK_BLUE_COLOR, 0.95),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        // transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    
        // &:hover {
        //     transform: translateY(-2px);
        //     background: transparent;
        //     border-color: transparentize($blue-color, 0.25);
        //     box-shadow: 0 10px 30px transparentize($blue-color, 0.8);
        //     cursor: pointer;
        // }
    },

    training_plan_title: {
        // @include crop_text;
        width: 180,
        color: BLUE_COLOR,
    },

    gained_xp: {
        color: BLUE_COLOR,
    },
})