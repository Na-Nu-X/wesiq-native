import Icon from "@/components/Icon"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"
import { useState, useRef } from "react"
import { View, Text, Pressable, StyleSheet, Modal, TouchableWithoutFeedback } from "react-native"
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated"
import { useTranslation } from "react-i18next"

export type Day = 1|2|3|4|5|6|0

interface DaySelectMenuProps {
    used_days:(Day|null)[],
    onDayUpdate:(selected_day:Day|null) => void,
    day:Day|null
}

export const DaySelectMenu = ({ used_days, onDayUpdate, day }:DaySelectMenuProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const [is_day_select_menu_open, setIsDaySelectMenuOpen] = useState<boolean>(false) // Stores The Information If The Day Select Menu Is Open
    
    const [button_layout, setButtonLayout] = useState<{ x:number, y:number, width:number, height:number }|null>(null) // Stores The Button Layout
    const select = useRef<View>(null) // Stores The Select Reference

    // Function For Toggle Show Day Select Menu
    const toggleShowDaySelectMenu = ():void => {
        if(!is_day_select_menu_open && select.current) {
            select.current.measureInWindow((x:number, y:number, width:number, height:number) => {
                setButtonLayout({ x, y, width, height }) // Sets The Button Layout
                setIsDaySelectMenuOpen(true) // Sets The Information That The Day Select Menu Is Open
            })
        } 
        
        else {
            setIsDaySelectMenuOpen(false) // Sets The Information That The Day Select Menu Isn't Open
        }
    }

    const handleSelectDay = (selected_day:typeof day) => {
        onDayUpdate(selected_day) // Sets The Day
        setIsDaySelectMenuOpen(false) // Sets The Information That The Day Select Menu Isn't Open
    }

    return (
        <View className="day_select_menu" style={styles.day_select_menu}>
            <View ref={select} collapsable={false} style={{ width: "100%" }}>
                <Pressable 
                    className="select" 
                    onPress={toggleShowDaySelectMenu}
                    style={styles.select}
                >
                    <Text style={{ color: LIGHT_BLUE_COLOR }}>
                        {day === null && t("Nepriradiť deň")}
                        {day === 1 && t("Pondelok")}
                        {day === 2 && t("Utorok")}
                        {day === 3 && t("Streda")}
                        {day === 4 && t("Štvrtok")}
                        {day === 5 && t("Piatok")}
                        {day === 6 && t("Sobota")}
                        {day === 0 && t("Nedeľa")}
                    </Text>

                    <Icon icon_name={is_day_select_menu_open ? "angle-up" : "angle-down"} />
                </Pressable>
            </View>

            <Modal
                visible={is_day_select_menu_open}
                transparent={true}
                animationType="none"
                onRequestClose={() => setIsDaySelectMenuOpen(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsDaySelectMenuOpen(false)}>
                    <View 
                        style={{
                            flex: 1,
                            backgroundColor: "transparent",
                        }}
                    >
                        {button_layout && (
                            <Animated.View 
                                className="options_list" 
                                entering={FadeInUp.duration(150)}
                                exiting={FadeOutUp.duration(150)}

                                style={[
                                    styles.options_list,

                                    {
                                        position: "absolute",
                                        top: button_layout.y + button_layout.height + 5,
                                        left: button_layout.x,
                                        width: button_layout.width,
                                    },
                                ]}
                            >
                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectDay(null)}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{ marginRight: 8.5 }}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Nepriradiť deň")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectDay(1)}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Pondelok")}</Text>
                                    {used_days.includes(1) && (<Text style={{ color: SECONDARY_COLOR }}>{t("Použitý")}</Text>)}
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectDay(2)}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Utorok")}</Text>
                                    {used_days.includes(2) && (<Text style={{ color: SECONDARY_COLOR }}>{t("Použitý")}</Text>)}
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectDay(3)}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Streda")}</Text>
                                    {used_days.includes(3) && (<Text style={{ color: SECONDARY_COLOR }}>{t("Použitý")}</Text>)}
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectDay(4)}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Štvrtok")}</Text>
                                    {used_days.includes(4) && (<Text style={{ color: SECONDARY_COLOR }}>{t("Použitý")}</Text>)}
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectDay(5)}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Piatok")}</Text>
                                    {used_days.includes(5) && (<Text style={{ color: SECONDARY_COLOR }}>{t("Použitý")}</Text>)}
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectDay(6)}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Sobota")}</Text>
                                    {used_days.includes(6) && (<Text style={{ color: SECONDARY_COLOR }}>{t("Použitý")}</Text>)}
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectDay(0)}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Nedeľa")}</Text>
                                    {used_days.includes(0) && (<Text style={{ color: SECONDARY_COLOR }}>{t("Použitý")}</Text>)}
                                </Pressable>
                            </Animated.View>
                        )}
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    day_select_menu: {
        position: "relative",
        flex: 1,
        cursor: "pointer",
        zIndex: 500,
    },

    select: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 5,
        width: "100%",
        height: 50,
        paddingHorizontal: 8.5,
        color: LIGHT_BLUE_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: transparentize(BLUE_COLOR, 0.5),
        // transition: border 0.3s ease, box-shadow 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &:has(.fa-angle-down:hover),
        // &:has(.fa-angle-up:hover) {
        //     border-color: $blue-color !important;
        // }

        // span {
        //     @include crop_text;
        // }
    },

    options_list: {
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        // width: "100%",
        marginTop: 10,
        color: SECONDARY_COLOR,
        backgroundColor: transparentize(MAIN_COLOR, 0.2),
        borderRadius: SMALL_BORDER_RADIUS,
        zIndex: 1000,
        elevation: 5,
    },

    option: {
        flexDirection: "row",
        alignItems: "center",
        // paddingVertical: 5,
        paddingVertical: 10,
        paddingHorizontal: 8.5,
        // transition: background-color 0.3s ease, color 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &.selected {
        //     background-color: transparentize($blue-color, 0.9);
        //     color: $light-blue-color;
        // }

        // &:focus-visible {
        //     outline: none !important;
        // }
    },
})