import { View, Text, StyleSheet, Pressable, TextInput } from "react-native"
import { useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import Checkbox from "expo-checkbox"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import Icon from "@/components/Icon"

import type { LoggedInUser } from "@/components/LoginFormDialog"

interface Activity {
    type:string|null
}

export default function HistorySection() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [activity_history, setActivityHistory] = useState<Activity[]>([]) // Stores The Activity History

    return (
        <View className="training_section history_section">
            <View className="activity_history_container">
                <View className="activity_history">
                    {activity_history.map((one_activity:Activity) => (
                        <View className="one_activity">
                            <FontAwesome6
                                name="list"
                                size={20}
                                color={BLUE_COLOR}
                            />

                            <Text className="training_plan_title">{one_activity.type ? one_activity.type : "Aktivita"}</Text>

                            {/* <Text className="elapsed_time">{one_activity.elapsed_time|format_time}</Text> */}
                            {/* <Text className="gained_xp">{one_activity.gained_xp}XP</Text> */}
                            {/* <Text className="date">{one_activity.end_time|date:"d.m."}</Text> */}
                        </View>
                    ))}
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({

})