import Icon from "@/components/Icon"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"
import { useState, useRef } from "react"
import { View, Text, Pressable, StyleSheet, Modal, TouchableWithoutFeedback } from "react-native"
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated"
import { useTranslation } from "react-i18next"
import IconButton from "@/components/IconButton"

interface SortSelectMenuProps {
    onSelectedSortOptionUpdate:(selected_sort_option:string|null) => void,
    selected_sort_option:string|null
}

export const SortSelectMenu = ({ onSelectedSortOptionUpdate, selected_sort_option }:SortSelectMenuProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const [is_sort_select_menu_open, setIsSortSelectMenuOpen] = useState<boolean>(false) // Stores The Information If The Sort Select Menu Is Open
    
    const [button_layout, setButtonLayout] = useState<{ x:number, y:number, width:number, height:number }|null>(null) // Stores The Button Layout
    const select = useRef<View>(null) // Stores The Select Reference

    // Function For Toggle Show Sort Select Menu
    const toggleShowSortSelectMenu = ():void => {
        if(!is_sort_select_menu_open && select.current) {
            select.current.measureInWindow((x:number, y:number, width:number, height:number) => {
                setButtonLayout({ x, y, width, height }) // Sets The Button Layout
                setIsSortSelectMenuOpen(true) // Sets The Information That The Sort Select Menu Is Open
            })
        } 
        
        else {
            setIsSortSelectMenuOpen(false) // Sets The Information That The Sort Select Menu Isn't Open
        }
    }

    const handleSelectSortOption = (selected_sort_option:string|null):void => {
        onSelectedSortOptionUpdate(selected_sort_option) // Sets The Sort
        setIsSortSelectMenuOpen(false) // Sets The Information That The Sort Select Menu Isn't Open
    }

    const refreshSortSelectMenu = ():void => {
        onSelectedSortOptionUpdate(null) // Sets The Sort
        setIsSortSelectMenuOpen(false) // Sets The Information That The Sort Select Menu Isn't Open
    }

    return (
        <View className="sort_select_menu" style={styles.sort_select_menu}>
            <View ref={select} collapsable={false} style={{ width: "100%" }}>
                <Pressable 
                    className="select" 
                    onPress={toggleShowSortSelectMenu}
                    style={styles.select}
                >
                    <View 
                        className="refresh" 
                        accessibilityLabel={t("Obnoviť predvolené filtre")}
                        style={styles.refresh}
                    >
                        <Icon 
                            icon_name="arrow-rotate-right" 
                            onPress={refreshSortSelectMenu} 
                        />
                    </View>

                    <Text 
                        style={{ 
                            marginRight: "auto",
                            color: LIGHT_BLUE_COLOR, 
                        }}
                    >
                        {selected_sort_option === null && t("Najnovšie články")}
                        {selected_sort_option === "latest" && t("Najnovšie články")}
                        {selected_sort_option === "popular" && t("Populárne články")}
                        {selected_sort_option === "best" && t("Najlepšie hodnotené")}
                        {selected_sort_option === "a-z" && t("Podľa abecedy (A-Z)")}
                        {selected_sort_option === "z-a" && t("Podľa abecedy (Z-A)")}
                    </Text>

                    <Icon icon_name={is_sort_select_menu_open ? "angle-up" : "angle-down"} />
                </Pressable>
            </View>

            <Modal
                visible={is_sort_select_menu_open}
                transparent={true}
                animationType="none"
                onRequestClose={() => setIsSortSelectMenuOpen(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsSortSelectMenuOpen(false)}>
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
                                    onPress={() => handleSelectSortOption("latest")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="clock"
                                        size={20}
                                        solid={false}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Najnovšie články")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectSortOption("popular")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="eye"
                                        size={20}
                                        solid={false}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Populárne články")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectSortOption("best")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="star"
                                        size={20}
                                        solid={false}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Najlepšie hodnotené")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectSortOption("a-z")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="arrow-up-a-z"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Podľa abecedy (A-Z)")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectSortOption("z-a")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="arrow-up-z-a"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Podľa abecedy (Z-A)")}</Text>
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
    sort_select_menu: {
        position: "relative",
        flex: 1,
        cursor: "pointer",
        zIndex: 500,
    },

    select: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
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

    refresh: {
        zIndex: 50,
    },
})