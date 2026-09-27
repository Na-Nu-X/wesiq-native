import Icon from "@/components/Icon"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR } from "@/constants/colors"
import { View, StyleSheet, TextInput } from "react-native"
import { useTranslation } from "react-i18next"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { useEffect } from "react"

import type { ChatData } from "@/app/(tabs)/chat"
import type { Sender } from "@/app/(tabs)/chat"

export interface Chat {
    sender:Sender,
    last_message?:string,
    list?:ChatData[]
}

interface SearchChatProps {
    grouped_unread_chats:Chat[],
    grouped_read_chats:Chat[],
    onFilteredChatsUpdate:(filtered_chats:Chat[]) => void,
    onSearchedTextUpdate:(searched_text:string) => void,
    searched_text:string
}

export const SearchChat = ({ 
    grouped_unread_chats, 
    grouped_read_chats, 
    onFilteredChatsUpdate, 
    onSearchedTextUpdate,
    searched_text
}:SearchChatProps) => {
    const { t } = useTranslation() // Initializes The Translations

    // Function For Get Searched Chats
    const getSearchedChats = async (text:string):Promise<void> => {
        onSearchedTextUpdate(text) // Sets The Searched Text
        
        const filtered_unread_chats:Chat[] = grouped_unread_chats.filter((one_item:Chat) => one_item.sender.username.toLowerCase().includes(text.toLowerCase())) // Filters The Unread Chats
        const filtered_read_chats:Chat[] = grouped_read_chats.filter((one_item:Chat) => one_item.sender.username.toLowerCase().includes(text.toLowerCase())) // Filters The Read Chats

        onFilteredChatsUpdate([...filtered_unread_chats, ...filtered_read_chats]) // Sets The Filtered Senders
    }

    useEffect(() => {
        console.log(grouped_unread_chats)
        console.log(grouped_read_chats)
    }, [grouped_unread_chats, grouped_read_chats])

    return (
        <View className="search_bar_container" style={styles.search_bar_container}>
            <View className="magnifying_glass_icon" style={styles.magnifying_glass_icon}>
                <Icon icon_name="magnifying-glass" />
            </View>

            <View className="delete_search_bar" style={styles.delete_search_bar}>
                <Icon icon_name="xmark" />
            </View>

            <TextInput
                className="search_bar"
                textAlignVertical="top" 
                placeholder={t("Nájsť užívateľa")} 
                placeholderTextColor={LIGHT_BLUE_COLOR}
                accessibilityLabel={t("Nájsť užívateľa")} 
                value={searched_text}
                onChangeText={getSearchedChats}

                style={[
                    styles.search_bar, 
                    { outlineStyle: "none" } as any
                ]}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    search_bar_container: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        marginBottom: 20,
        // backdrop-filter: blur(5px);
        zIndex: 100,
    },

    magnifying_glass_icon: {
        // @include icon;
        pointerEvents: "none",
        position: "absolute",
        top: "50%",
        left: 8.5,
        transform: [{ translateY: "-50%" }],
        color: BLUE_COLOR,
        fontSize: 20,
        // transition: color 0.3s ease
    },

    delete_search_bar: {
        alignItems: "center",
        justifyContent: "center",
        position: "absolute",
        top: "50%",
        right: 0,
        transform: [{ translateY: "-50%" }],
        height: "100%",
        width: 40,
        zIndex: 200,

        // &:hover {
        //             .fa-xmark {
        //                 color: $dark-blue-color;
        //                 transition: color 0.2s ease;
        //             }
        //         }
    },

    search_bar: {
        width: "100%",
        height: 40,
        paddingHorizontal: 40,
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: DARK_BLUE_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
        textAlign: "center",
        zIndex: 50,
        // transition: border 0.2s ease, box-shadow 0.2s ease;

        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color !important;
        // }
    },
})