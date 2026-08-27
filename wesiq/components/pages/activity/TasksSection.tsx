import { View, Text, StyleSheet, Pressable, TextInput } from "react-native"
import { useState } from "react"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import Checkbox from "expo-checkbox"
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet"
import Icon from "@/components/Icon"

import type { LoggedInUser } from "@/components/LoginFormDialog"

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
            <View className="training_section tasks_section">
                <View className="todo">
                    {/* <audio class="success_sound" src="{% static 'audio/success.mp3' %}" type="audio/mpeg"></audio> <!-- https://pixabay.com/ --> */}

                    <View className="official_tasks">
                        <Text className="section_title">Dnešné&nbsp;výzvy</Text>

                        {logged_in_user && (
                            <>
                                <View className="remaining_hours">
                                    <FontAwesome6
                                        name="clock"
                                        size={20}
                                        solid={false}
                                        color={BLUE_COLOR}
                                    />

                                    <Text>Ostáva</Text>
                                    {/* <Text>{official_tasks_remaining_hours}</Text> */}
                                    <Text>hodín.</Text>
                                </View>

                                <View className="tasks">
                                    {official_tasks.map((one_task:OfficialTask) => (
                                        <View className="task">
                                            <Checkbox
                                                className="checkbox"
                                                // value={isChecked}
                                                // onValueChange={setIsChecked}
                                                // color={isChecked ? '#4630EB' : undefined}
                                                // style={styles.checkbox}
                                            />

                                            {one_task.data === "30_minutes_activity" && (
                                                <Text className="title">Zaznamenaj 30 minút aktivity.</Text>
                                            )}

                                            {one_task.data === "1_hour_activity" && (
                                                <Text className="title">Zaznamenaj 1h aktivity.</Text>
                                            )}

                                            {one_task.data === "2_hours_activity" && (
                                                <Text className="title">Zaznamenaj 2h aktivity.</Text>
                                            )}

                                            {one_task.data === "3_hours_activity" && (
                                                <Text className="title">Zaznamenaj 3h aktivity.</Text>
                                            )}

                                            {one_task.data === "beat_average_activity_time" && (
                                                <Text className="title">Prekonaj týždenný priemer času aktivity.</Text>
                                            )}

                                            {one_task.data === "complete_training_plan_activity" && (
                                                <Text className="title">Dokonči aktivitu podľa tréningového plánu.</Text>
                                            )}

                                            {one_task.data === "2_activities" && (
                                                <Text className="title">Zaznamenaj 2 aktivity.</Text>
                                            )}

                                            {one_task.data === "complete_all_official_tasks" && (
                                                <Text className="title">Splň všetky dnešné výzvy.</Text>
                                            )}

                                            {one_task.data === "add_custom_task" && (
                                                <Text className="title">Pridaj vlastnú úlohu.</Text>
                                            )}

                                            <Text className="xp">{one_task.xp}XP</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {!logged_in_user && (
                            <View className="no_logged_in">
                                <Text>Pre prístup k denným výzvam sa musíte</Text>

                                <Pressable 
                                    // onPress={() => setActiveForm("login_form")}
                                    accessibilityLabel="Prihlásiť sa"
                                >
                                    {({ pressed }) => (
                                        <Text
                                            style={[
                                                // styles.login,
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

                    <View className="custom_tasks">
                        <Text className="section_title">Moje&nbsp;úlohy</Text>

                        <View className="info">
                            <Pressable className="delete_completed">
                                Vymazať dokončené
                            </Pressable>

                            <Text className="tasks_amount"><Text className="remaining">0</Text> / <Text className="total">0</Text></Text>
                        </View>

                        <View className="tasks">
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
                                        // styles., 
                                        { outlineStyle: "none" } as any
                                    ]}
                                />

                                <Icon
                                    icon_name="plus"
                                    // onPress={onClose}
                                    // pressed_style={{ transform: [{ scale: 1.1 }] }}
                                />
                            </View>

                            {custom_tasks.map((one_task:CustomTask) => (
                                <View className="task">
                                    <View className="checkbox"></View>

                                    <Pressable className="title">{one_task.title}</Pressable>

                                    {/* <Text className="date">{one_task.created_at|date:"d.m."}</Text> */}

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
                        </View>
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

})

// .todo {
//     display: flex;
//     justify-content: center;
//     gap: 20px;
//     width: 100%;
//     margin: 0px auto;
    
//     .official_tasks,
//     .custom_tasks {
//         max-width: $secondary-width;
//         width: 100%;
//         padding: 20px;
//         border: 1px solid transparentize($blue-color, 0.8);
//         border-radius: $medium-border-radius;

//         h3.section_title {
//             margin-bottom: 10px;
//         }

//         .info {
//             display: flex;
//             justify-content: space-between;
//             align-items: center;
//             padding: 0px 5px + 2.5px;
//             margin-bottom: 5px;

//             .delete_completed {
//                 all: unset;
//                 font-size: 0.9em;
//                 color: $light-blue-color;

//                 &:hover,
//                 &:active {
//                     text-decoration: underline;
//                     cursor: pointer;
//                 }
//             }

//             .tasks_amount {
//                 font-size: 0.9em;
//                 color: $light-blue-color;
//             }
//         }

//         .tasks {
//             display: flex;
//             flex-direction: column;
//             gap: 10px;
//             margin-top: 10px;
    
//             .task {
//                 --progress: 0;
//                 --progress-color: rgba(75, 75, 250, 0.1);

//                 position: relative;
//                 display: flex;
//                 justify-content: space-between;
//                 align-items: center;
//                 gap: 10px;
//                 background: transparentize($main-color, 0.5);
//                 padding: 0px 15px;
//                 border: 1px solid transparentize($blue-color, 0.8);
//                 border-radius: $small-border-radius;
//                 transition: transform 0.2s ease;

//                 &:hover {
//                     transform: translateY(-2px);
//                     cursor: pointer;
//                 }

//                 &::before {
//                     content: "";
//                     position: absolute;
//                     left: 0px;
//                     transform: scaleX(min(calc(var(--progress) / 100), 1));
//                     transform-origin: left;
//                     width: 100%;
//                     height: 100%;
//                     background-color: var(--progress-color);
//                     border-radius: inherit;
//                     pointer-events: none;
//                 }

//                 .title {
//                     @include crop_text;
//                     flex-grow: 1;
//                     height: 50px;
//                     line-height: 50px;
//                 }
//             }
//         }
//     }

//     .official_tasks {
//         .remaining_hours {
//             text-align: center;
//             font-size: 0.9em;
//             color: $light-blue-color;
//             margin-bottom: 10px;
//         }

//         .tasks {
//             .task {
//                 &:has(.checkbox.checked) {
//                     --progress: 100;
//                     --progress-color: rgba(82, 207, 32, 0.1);
//                     border-color: transparentize($green-color, 0.8);
//                 }

//                 .checkbox {
//                     position: relative;
//                     display: block;
//                     flex-shrink: 0;
//                     width: 15px;
//                     height: 15px;
//                     border-radius: 2px;
//                     outline: 1px solid transparentize($blue-color, 0.8);
//                     background: transparentize($main-color, 0.5);

//                     &::before {
//                         content: "";
//                         position: absolute;
//                         width: inherit;
//                         height: inherit;
//                         background-image: url("../../../../static/images/check.png"); // https://www.flaticon.com/free-icon/check_16750043
//                         background-size: contain;
//                         transform: scale(0);
//                         opacity: 0;
//                         transition: transform 0.2s ease, opacity 0.2s ease;
//                     }

//                     &.checked {
//                         outline: 1px solid darken($green-color, 10%);

//                         &::before {
//                             transform: scale(1.5);
//                             opacity: 1;
//                             transition: transform 0.3s ease, opacity 0.3s ease;
//                         }
//                     }
//                 }

//                 .xp {
//                     @include flex_center($direction: column);
//                     user-select: none;
//                     width: 4ch;
//                     padding-left: 15px;
//                     color: $green-color;
//                     border-left: 1px solid $training-surface-border;
                    
//                     span {
//                         font-variant-numeric: tabular-nums;
//                         white-space: nowrap;

//                         &:nth-child(1) {
//                             font-weight: bold;
//                         }

//                         &:nth-child(2) {
//                             font-size: 0.8em;
//                             opacity: 0.8;
//                         }
//                     }
//                 }
//             }
//         }

//         .no_logged_in {
//             text-align: center;

//             a {
//                 color: $secondary-color;
//                 text-decoration: none;
//                 font-style: italic;

//                 &:hover,
//                 &:active {
//                     text-decoration: underline;
//                 }
//             }
//         }
//     }

//     .custom_tasks {
//         padding: 20px 15px;

//         .tasks {
//             @include scrollbar;
//             max-height: calc(50px * 3 + 15px * 2);
//             padding: 0px 5px 5px;

//             .add_task_container {
//                 display: flex;
//                 flex-shrink: 0;
//                 height: 50px;
//                 background: transparentize($main-color, 0.5);
//                 border: 1px solid transparentize($blue-color, 0.5);
//                 border-radius: $small-border-radius;
//                 overflow: hidden;
//                 transition: border-color 0.3s ease;

//                 &:focus-within {
//                     border-color: $blue-color;
//                 }
                
//                 .new_task {
//                     flex: 1;
//                     min-width: 0;
//                     padding: 0px 15px;
//                     vertical-align: middle;
//                     background: transparent;
//                     color: $secondary-color;
//                     border: none;
//                     outline: none;

//                     &::placeholder {
//                         color: $light-blue-color;
//                     }
//                 }

//                 .add_task {
//                     all: unset;
//                     margin: 5px 15px 5px 0px;
//                     text-align: center;
//                     color: $blue-color;
//                     transition: transform 0.2s ease, color 0.3s ease;
                    
//                     &:hover {
//                         transform: scale(1.1);
//                         color: $dark-blue-color;
//                         cursor: pointer;
//                     }
    
//                     .fa-plus {
//                         display: block;
//                         font-size: 1.5em;
//                     }
//                 }
//             }

//             .task {
//                 transition: transform 0.2s ease;

//                 &::before {
//                     transition: transform 0.3s ease, background-color 0.3s ease;
//                 }

//                 &:hover {
//                     transform: translateY(-2px);
//                     cursor: pointer;
//                 }

//                 &:has(input[type="checkbox"]:checked) {
//                     --progress: 100;
//                     --progress-color: rgba(82, 207, 32, 0.1);
//                     border-color: transparentize($green-color, 0.8);

//                     .checkbox {
//                         outline: 1px solid darken($green-color, 10%);

//                         &::before {
//                             transform: scale(1.5);
//                             opacity: 1;
//                             transition: transform 0.3s ease, opacity 0.3s ease;
//                         }
//                     }
//                 }

//                 &.dragging {
//                     transform: scale(0.98);
//                     opacity: 0.8;
//                 }

//                 .checkbox {
//                     position: relative;
//                     display: block;
//                     flex-shrink: 0;
//                     width: 15px;
//                     height: 15px;
//                     border-radius: 2px;
//                     outline: 1px solid transparentize($blue-color, 0.8);
//                     background: transparentize($main-color, 0.5);

//                     &::before {
//                         content: "";
//                         position: absolute;
//                         width: inherit;
//                         height: inherit;
//                         background-image: url("../../../../static/images/check.png"); // https://www.flaticon.com/free-icon/check_16750043
//                         background-size: contain;
//                         transform: scale(0);
//                         opacity: 0;
//                         transition: transform 0.2s ease, opacity 0.2s ease;
//                     }
//                 }

//                 .title {
//                     cursor: pointer;
//                 }

//                 .date {
//                     user-select: none;
//                     width: 7ch;
//                     padding-left: 10px;
//                     text-align: center;
//                     color: $light-blue-color;
//                     border-left: 1px solid transparentize($blue-color, 0.8);
//                     font-size: 0.8em;
//                     font-variant-numeric: tabular-nums;
//                     white-space: nowrap;
//                 }

//                 input[type="checkbox"] {
//                     display: none;
//                 }

//                 // Custom Task Properties

//                 .show_custom_task_properties_button {
//                     @include show_properties_button;
//                     margin-left: auto;
//                 }

//                 .custom_task_properties {
//                     @include properties_menu;
//                 }
//             }
//         }
//     }
// }