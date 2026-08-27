import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from "react-native"
import { useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import Checkbox from "expo-checkbox"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import Icon from "@/components/Icon"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"

interface Activity {
    type:string|null
}

export default function HistorySection() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [activity_history, setActivityHistory] = useState<Activity[]>([]) // Stores The Activity History

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

                            {/* <Text className="elapsed_time" style={{ width: 60 }}>{one_activity.elapsed_time|format_time}</Text>

                            <Text 
                                className="gained_xp" 

                                style={[
                                    styles.gained_xp,
                                    { width: 50 }
                                ]}
                            >
                                {one_activity.gained_xp}XP
                            </Text>

                            <Text className="date" style={{ width: 40 }}>{one_activity.end_time|date:"d.m."}</Text> */}
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