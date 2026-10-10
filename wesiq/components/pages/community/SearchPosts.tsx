import { View, StyleSheet, TextInput } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, SECONDARY_COLOR } from "@/constants/colors"
import Icon from "@/components/Icon"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { useTranslation } from "react-i18next"

interface SearchPostsProps {
    onSearchTextUpdate:(search_text:string) => void,
    search_text:string
}

export default function SearchPosts({ onSearchTextUpdate, search_text }:SearchPostsProps) {
    const { t } = useTranslation() // Initializes The Translations
    
    return (
        <View className="search_posts_container" style={styles.search_posts_container}>
            <View className="search_bar_container">
                <Icon icon_name="magnifying-glass" style={styles.magnifying_glass_icon} />

                <View className="delete_search_bar" style={styles.delete_search_bar}>
                    <Icon icon_name="xmark" onPress={() => onSearchTextUpdate("")} />
                </View>

                <TextInput
                    className="search_bar"
                    textAlignVertical="top" 
                    placeholder={t("Nájsť príspevky") }
                    placeholderTextColor={LIGHT_BLUE_COLOR}
                    accessibilityLabel={t("Nájsť príspevky") }
                    value={search_text}
                    onChangeText={(text:string) => onSearchTextUpdate(text)}

                    style={[
                        styles.search_bar, 
                        { outlineStyle: "none" } as any
                    ]}
                />
            </View>

            <View className="history_container" style={styles.history_container}></View>
        </View>
    )
}

const styles = StyleSheet.create({
    search_posts_container: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        // backdrop-filter: blur(5px);
        zIndex: 200,
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
        zIndex: 300,

        // &:hover {
        //             .fa-xmark {
        //                 color: $dark-blue-color;
        //                 transition: color 0.2s ease;
        //             }
        //         }
    },

    search_bar: {
        position: "relative",
        width: "100%",
        height: 40,
        paddingHorizontal: 40,
        color: SECONDARY_COLOR,
        borderWidth: 1,
        borderColor: DARK_BLUE_COLOR,
        borderRadius: SMALL_BORDER_RADIUS,
        textAlign: "center",
        zIndex: 200,
        // transition: border 0.2s ease, box-shadow 0.2s ease;

        // &:hover,
        // &:focus-visible {
        //     border-color: $blue-color !important;
        // }
    },

    history_container: {
        // @include scrollbar;
        position: "absolute",
        top: 0,
        width: "100%",
        maxHeight: 40 * 3,
        borderBottomRightRadius: SMALL_BORDER_RADIUS,
        borderBottomLeftRadius: SMALL_BORDER_RADIUS,
        // backdrop-filter: blur(5px);
        opacity: 0,
        // overflowY: "auto",
        // transition: top 0.3s ease, border 0.3s ease, width 0.3s ease, opacity 0.5s ease;
        zIndex: 50,

        // &.active {
        //     top: 40px;
        //     opacity: 1;

        //     .searched_post {
        //         p {
        //             pointer-events: all;
        //         }
        //     }
        // }
    },
})