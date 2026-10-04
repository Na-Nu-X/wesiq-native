import Icon from "@/components/Icon"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import { FontAwesome6 } from "@expo/vector-icons"
import { useState, useRef } from "react"
import { View, Text, Pressable, StyleSheet, Modal, TouchableWithoutFeedback } from "react-native"
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated"
import { useTranslation } from "react-i18next"

interface CategorySelectMenuProps {
    onSelectedCategoryOptionUpdate:(selected_category_option:string|null) => void,
    selected_category_option:string|null
}

export const CategorySelectMenu = ({ onSelectedCategoryOptionUpdate, selected_category_option }:CategorySelectMenuProps) => {
    const { t } = useTranslation() // Initializes The Translations

    const [is_category_select_menu_open, setIsCategorySelectMenuOpen] = useState<boolean>(false) // Stores The Information If The Category Select Menu Is Open
    
    const [button_layout, setButtonLayout] = useState<{ x:number, y:number, width:number, height:number }|null>(null) // Stores The Button Layout
    const select = useRef<View>(null) // Stores The Select Reference

    // Function For Toggle Show Category Select Menu
    const toggleShowCategorySelectMenu = ():void => {
        if(!is_category_select_menu_open && select.current) {
            select.current.measureInWindow((x:number, y:number, width:number, height:number) => {
                setButtonLayout({ x, y, width, height }) // Sets The Button Layout
                setIsCategorySelectMenuOpen(true) // Sets The Information That The Category Select Menu Is Open
            })
        } 
        
        else {
            setIsCategorySelectMenuOpen(false) // Sets The Information That The Category Select Menu Isn't Open
        }
    }

    const handleSelectCategoryOption = (selected_category_option:string|null):void => {
        onSelectedCategoryOptionUpdate(selected_category_option) // Sets The Category
        setIsCategorySelectMenuOpen(false) // Sets The Information That The Category Select Menu Isn't Open
    }

    const refreshCategorySelectMenu = ():void => {
        onSelectedCategoryOptionUpdate(null) // Sets The Category
        setIsCategorySelectMenuOpen(false) // Sets The Information That The Category Select Menu Isn't Open
    }

    return (
        <View className="category_select_menu" style={styles.category_select_menu}>
            <View ref={select} collapsable={false} style={{ width: "100%" }}>
                <Pressable 
                    className="select" 
                    onPress={toggleShowCategorySelectMenu}
                    style={styles.select}
                >
                    <View 
                        className="refresh" 
                        accessibilityLabel={t("Obnoviť predvolené filtre")}
                        style={styles.refresh}
                    >
                        <Icon 
                            icon_name="arrow-rotate-right" 
                            onPress={refreshCategorySelectMenu} 
                        />
                    </View>

                    <Text 
                        style={{ 
                            marginRight: "auto",
                            color: LIGHT_BLUE_COLOR, 
                        }}
                    >
                        {selected_category_option === null && t("Všetky kategórie")}
                        {selected_category_option === "all" && t("Všetky kategórie")}
                        {selected_category_option === "static" && t("Statické prvky")}
                        {selected_category_option === "dynamic" && t("Dynamické triky")}
                        {selected_category_option === "isotonic" && t("Izotonické cviky")}
                        {selected_category_option === "balance" && t("O rovnováhe")}
                        {selected_category_option === "flexibility" && t("O flexibilite")}
                        {selected_category_option === "push" && t("Tlak")}
                        {selected_category_option === "pull" && t("Ťah")}
                        {selected_category_option === "legs" && t("Nohy")}
                        {selected_category_option === "beginner" && t("Pre začiatočníkov")}
                        {selected_category_option === "intermediate" && t("Pre stredne pokročilých")}
                        {selected_category_option === "advanced" && t("Pre pokročilých")}
                        {selected_category_option === "elite" && t("Pre profesionálov")}
                    </Text>

                    <Icon icon_name={is_category_select_menu_open ? "angle-up" : "angle-down"} />
                </Pressable>
            </View>

            <Modal
                visible={is_category_select_menu_open}
                transparent={true}
                animationType="none"
                onRequestClose={() => setIsCategorySelectMenuOpen(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsCategorySelectMenuOpen(false)}>
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
                                    onPress={() => handleSelectCategoryOption("all")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="icons"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Všetky kategórie")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("static")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Statické prvky")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("dynamic")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Dynamické triky")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("isotonic")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Izotonické cviky")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("balance")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("O rovnováhe")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("flexibility")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("O flexibilite")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("push")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Tlak")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("pull")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Ťah")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("legs")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Nohy")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("beginner")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Pre začiatočníkov")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("intermediate")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Pre stredne pokročilých")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("advanced")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Pre pokročilých")}</Text>
                                </Pressable>

                                <Pressable 
                                    className="option"
                                    onPress={() => handleSelectCategoryOption("elite")}
                                    style={styles.option}
                                >
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={LIGHT_BLUE_COLOR}
                                        style={{marginRight: 8.5}}
                                    />

                                    <Text style={{ color: SECONDARY_COLOR }}>{t("Pre profesionálov")}</Text>
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
    category_select_menu: {
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