import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from "react-native"
import { useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, GREEN_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import Checkbox from "expo-checkbox"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import Icon from "@/components/Icon"

import type { LoggedInUser } from "@/components/LoginFormDialog"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"

interface OfficialTask {
    data:string,
    xp:number
}

interface CustomTask {
    title:string
}

export default function TasksSection() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [official_tasks, setOfficialTasks] = useState<OfficialTask[]>([]) // Stores The Official Tasks
    const [custom_tasks, setCustomTasks] = useState<CustomTask[]>([]) // Stores The Custom Tasks

    return (
        <BottomSheetModalProvider>
            <View 
                className="training_section tasks_section"

                style={[
                    styles.training_section,
                    styles.tasks_section
                ]}
            >
                <View className="todo" style={styles.todo}>
                    {/* <audio class="success_sound" src="{% static 'audio/success.mp3' %}" type="audio/mpeg"></audio> <!-- https://pixabay.com/ --> */}

                    <View className="official_tasks" style={styles.official_tasks}>
                        <Text 
                            className="section_title" 

                            style={[
                                styles.section_title,
                                { color: SECONDARY_COLOR },
                            ]}
                        >
                            Dnešné&nbsp;výzvy
                        </Text>

                        {logged_in_user && (
                            <>
                                <View className="remaining_hours" style={styles.remaining_hours}>
                                    <FontAwesome6
                                        name="clock"
                                        size={20}
                                        solid={false}
                                        color={LIGHT_BLUE_COLOR}
                                    />

                                    <Text style={{ color: LIGHT_BLUE_COLOR }}>Ostáva</Text>
                                    {/* <Text style={{ color: LIGHT_BLUE_COLOR }}>{official_tasks_remaining_hours}</Text> */}
                                    <Text style={{ color: LIGHT_BLUE_COLOR }}>hodín.</Text>
                                </View>

                                <View className="tasks" style={styles.official_tasks_container}>
                                    {official_tasks.map((one_task:OfficialTask) => (
                                        <View className="task" style={styles.official_task}>
                                            <Checkbox
                                                className="checkbox"
                                                // value={isChecked}
                                                // onValueChange={setIsChecked}
                                                // color={isChecked ? '#4630EB' : undefined}
                                                style={styles.official_task_checkbox}
                                            />

                                            {one_task.data === "30_minutes_activity" && (
                                                <Text className="title" style={styles.title}>Zaznamenaj 30 minút aktivity.</Text>
                                            )}

                                            {one_task.data === "1_hour_activity" && (
                                                <Text className="title" style={styles.title}>Zaznamenaj 1h aktivity.</Text>
                                            )}

                                            {one_task.data === "2_hours_activity" && (
                                                <Text className="title" style={styles.title}>Zaznamenaj 2h aktivity.</Text>
                                            )}

                                            {one_task.data === "3_hours_activity" && (
                                                <Text className="title" style={styles.title}>Zaznamenaj 3h aktivity.</Text>
                                            )}

                                            {one_task.data === "beat_average_activity_time" && (
                                                <Text className="title" style={styles.title}>Prekonaj týždenný priemer času aktivity.</Text>
                                            )}

                                            {one_task.data === "complete_training_plan_activity" && (
                                                <Text className="title" style={styles.title}>Dokonči aktivitu podľa tréningového plánu.</Text>
                                            )}

                                            {one_task.data === "2_activities" && (
                                                <Text className="title" style={styles.title}>Zaznamenaj 2 aktivity.</Text>
                                            )}

                                            {one_task.data === "complete_all_official_tasks" && (
                                                <Text className="title" style={styles.title}>Splň všetky dnešné výzvy.</Text>
                                            )}

                                            {one_task.data === "add_custom_task" && (
                                                <Text className="title" style={styles.title}>Pridaj vlastnú úlohu.</Text>
                                            )}

                                            <Text className="xp" style={styles.xp}>
                                                <Text style={{ fontWeight: "bold" }}>{one_task.xp}</Text>
                                                <Text style={{ fontSize: 15, opacity: 0.8 }}>XP</Text>
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {!logged_in_user && (
                            <View className="no_logged_in">
                                <Text 
                                    style={[
                                        styles.no_logged_in,
                                        { color: SECONDARY_COLOR },
                                    ]}
                                >
                                    Pre prístup k denným výzvam sa musíte
                                </Text>

                                <Pressable 
                                    // onPress={() => setActiveForm("login_form")}
                                    accessibilityLabel="Prihlásiť sa"
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                styles.link,
                                                pressed && { textDecorationLine: "underline" } 
                                            ]}
                                        >
                                            prihlásiť.
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        )}
                    </View>

                    <View className="custom_tasks" style={styles.custom_tasks}>
                        <Text className="section_title" style={styles.section_title}>Moje&nbsp;úlohy</Text>

                        <View className="info" style={styles.info}>
                            <Pressable className="delete_completed">
                                <Text style={styles.delete_completed}>Vymazať dokončené</Text>
                            </Pressable>

                            <Text className="tasks_amount" style={styles.tasks_amount}><Text className="remaining">0</Text> / <Text className="total">0</Text></Text>
                        </View>

                        <ScrollView 
                            className="tasks"
                            showsVerticalScrollIndicator={false}
                            indicatorStyle="white"
                            style={styles.custom_tasks_container}
                        >
                            <View className="add_task_container">
                                <TextInput
                                    className="new_task"
                                    keyboardType="default"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    textAlignVertical="top" 
                                    placeholder="Pridať úlohu" 
                                    placeholderTextColor={LIGHT_BLUE_COLOR}
                                    accessibilityLabel="Pridať úlohu" 
                                    // value={}
                                    // onChangeText={}
                                    // maxLength={50}

                                    style={[
                                        styles.new_task, 
                                        { outlineStyle: "none" } as any
                                    ]}
                                />

                                <View className="add_task">
                                    <Icon
                                        icon_name="plus"
                                        // onPress={onClose}
                                        size={25}
                                        // pressed_style={{ transform: [{ scale: 1.1 }] }}
                                    />
                                </View>
                            </View>

                            {custom_tasks.map((one_task:CustomTask) => (
                                <View className="task" style={styles.custom_task}>
                                    <View className="checkbox" style={styles.custom_task_checkbox}></View>

                                    <Pressable className="title" style={{ cursor: "pointer" }}>{one_task.title}</Pressable>

                                    {/* <Text className="date" style={styles.date}>{one_task.created_at|date:"d.m."}</Text> */}

                                    <Checkbox
                                        className="checkbox"
                                        // value={isChecked}
                                        // onValueChange={setIsChecked}
                                        // color={isChecked ? '#4630EB' : undefined}
                                        // style={styles.checkbox}
                                    />

                                    <View 
                                        className="show_custom_task_properties_button"
                                        accessibilityLabel="Viac..." 
                                    >
                                        <Icon
                                            icon_name="ellipsis-vertical"
                                            // onPress={() => showCustomTaskProperties(one_task.id)}
                                        />
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                <BottomSheetModal
                    // ref={custom_task_properties}
                    // snapPoints={snap_points}
                    enablePanDownToClose={true}
                    // onChange={handleCustomTaskPropertiesChanges}
                    containerStyle={{ zIndex: 9999 }}
                >
                    <BottomSheetView style={{ padding: 20 }}>
                        <View className="custom_task_properties">
                            {/* <Pressable
                                onPress={}
                                accessibilityRole="button"

                                style={({ pressed }) => [
                                    styles.sheet_item, 
                                    styles.sheet_item_border, 
                                    pressed && styles.sheet_item_pressed
                                ]}
                            >
                                <View style={styles.sheet_icon}>
                                    <FontAwesome6
                                        name="eraser"
                                        size={20}
                                        color={BLUE_COLOR}
                                    />
                                </View>

                                <Text style={{styles.sheet_text}}>Vymazať</Text>
                            </Pressable> */}

                            {/* <Pressable
                                className="hide_custom_task_properties_button"
                                onPress={hideCustomTaskProperties}
                                accessibilityRole="button"

                                style={({ pressed }) => [
                                    styles.sheet_item, 
                                    pressed && styles.sheet_item_pressed
                                ]}
                            >
                                <View style={styles.sheet_icon}>
                                    <FontAwesome6
                                        name="xmark"
                                        size={20}
                                        color={BLUE_COLOR}
                                    />
                                </View>

                                <Text style={styles.sheet_text}>Zavrieť</Text>
                            </Pressable> */}
                        </View>
                    </BottomSheetView>
                </BottomSheetModal>
            </View>
        </BottomSheetModalProvider>
    )
}

const styles = StyleSheet.create({
    training_section: {
        position: "relative",
        marginHorizontal: "auto",
        marginBottom: 50,
        overflow: "visible",
    },

    tasks_section: {
        maxWidth: MAIN_WIDTH,
    },

    todo: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
        width: "100%",
        marginHorizontal: "auto",
    },

    official_tasks: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
        padding: 20,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    custom_tasks: {
        maxWidth: MAIN_WIDTH,
        width: "100%",
        paddingVertical: 20,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: MEDIUM_BORDER_RADIUS,
    },

    section_title: {
        marginBottom: 10,
    },

    info: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
        paddingHorizontal: 5 + 2.5,
    },

    delete_completed: {
        // font-size: 0.9em;
        color: LIGHT_BLUE_COLOR,

        // &:hover,
        // &:active {
        //     text-decoration: underline;
        //     cursor: pointer;
        // }
    },

    tasks_amount: {
        // font-size: 0.9em;
        color: LIGHT_BLUE_COLOR,
    },

    official_tasks_container: {
        gap: 10,
        marginTop: 10,
    },

    official_task: {
        // --progress: 0;
        // --progress-color: rgba(75, 75, 250, 0.1);

        position: "relative",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.8),
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: transform 0.2s ease;

        // &:hover {
        //     transform: translateY(-2px);
        //     cursor: pointer;
        // }
    },

    task_progress: {
        position: "absolute",
        left: 0,
        // transform: scaleX(min(calc(var(--progress) / 100), 1));
        transformOrigin: "left",
        width: "100%",
        height: "100%",
        // backgroundColor: var(--progress-color)
        borderRadius: SMALL_BORDER_RADIUS,
        pointerEvents: "none",
    },

    title: {
        // @include crop_text;
        flexGrow: 1,
        height: 50,
        lineHeight: 50,
    },

    remaining_hours: {
        textAlign: "center",
        // font-size: 0.9em;
        color: LIGHT_BLUE_COLOR,
        marginBottom: 10,
    },

    official_task_checkbox: {
        position: "relative",
        flexShrink: 0,
        width: 15,
        height: 15,
        borderRadius: 2,
        // outline: 1px solid transparentize($blue-color, 0.8);
        backgroundColor: transparentize(MAIN_COLOR, 0.5),

        // &.checked {
        //     outline: 1px solid darken($green-color, 10%);

        //     checkbox_icon {
        //         transform: scale(1.5);
        //         opacity: 1;
        //         transition: transform 0.3s ease, opacity 0.3s ease;
        //     }
        // }
    },

    official_task_checkbox_icon: {
        position: "absolute",
        width: 15,
        height: 15,
        // background-image: url("../../../../static/images/check.png"); // https://www.flaticon.com/free-icon/check_16750043
        resizeMode: "contain",
        transform: [{ scale: 0 }],
        opacity: 0,
        // transition: transform 0.2s ease, opacity 0.2s ease;
    },

    xp: {
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        width: 40,
        paddingLeft: 15,
        color: GREEN_COLOR,
        // border-left: 1px solid $training-surface-border;
        borderLeftWidth: 1,
        borderLeftColor: "#333333"
    },

    no_logged_in: {
        textAlign: "center",
    },

    link: {
        color: SECONDARY_COLOR,
        fontStyle: "italic",
    },

    custom_tasks_container: {
        maxHeight: 50 * 3 + 15 * 2,
        paddingHorizontal: 5,
        paddingBottom: 5,
    },

    add_task_container: {
        flexDirection: "row",
        flexShrink: 0,
        height: 50,
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: SMALL_BORDER_RADIUS,
        overflow: "hidden",
        // transition: border-color 0.3s ease;

        // &:focus-within {
        //     border-color: $blue-color;
        // }
    },

    new_task: {
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 15,
        verticalAlign: "middle",
        color: SECONDARY_COLOR,
    },

    add_task: {
        marginVertical: 5,
        marginRight: 15,
        textAlign: "center",
        color: BLUE_COLOR,
        // transition: transform 0.2s ease, color 0.3s ease;
                    
        // &:hover {
        //     transform: scale(1.1);
        //     color: $dark-blue-color;
        //     cursor: pointer;
        // }
    },

    custom_task: {
        // transition: transform 0.2s ease;

        // &::before {
        //     transition: transform 0.3s ease, background-color 0.3s ease;
        // }

        // &:hover {
        //     transform: translateY(-2px);
        //     cursor: pointer;
        // }

        // &:has(input[type="checkbox"]:checked) {
        //     --progress: 100;
        //     --progress-color: rgba(82, 207, 32, 0.1);
        //     border-color: transparentize($green-color, 0.8);

        //     .checkbox {
        //         outline: 1px solid darken($green-color, 10%);

        //         &::before {
        //             transform: scale(1.5);
        //             opacity: 1;
        //             transition: transform 0.3s ease, opacity 0.3s ease;
        //         }
        //     }
        // }

        // &.dragging {
        //     transform: scale(0.98);
        //     opacity: 0.8;
        // }
    },

    custom_task_checkbox: {
        position: "relative",
        flexShrink: 0,
        width: 15,
        height: 15,
        borderRadius: 2,
        // outline: 1px solid transparentize($blue-color, 0.8);
        backgroundColor: transparentize(MAIN_COLOR, 0.5),
    },

    custom_task_checkbox_icon: {
        position: "absolute",
        width: 15,
        height: 15,
        // background-image: url("../../../../static/images/check.png"); // https://www.flaticon.com/free-icon/check_16750043
        resizeMode: "contain",
        transform: [{ scale: 0 }],
        opacity: 0,
        // transition: transform 0.2s ease, opacity 0.2s ease;
    },

    date: {
        userSelect: "none",
        width: 70,
        paddingLeft: 10,
        textAlign: "center",
        color: LIGHT_BLUE_COLOR,
        borderLeftWidth: 1,
        borderLeftColor: transparentize(BLUE_COLOR, 0.8),
        fontSize: 15,
        // font-variant-numeric: tabular-nums;
        // white-space: nowrap;
    },
})