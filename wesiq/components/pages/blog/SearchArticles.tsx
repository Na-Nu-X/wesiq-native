import { View, StyleSheet, TextInput } from "react-native"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize } from "@/constants/colors"
import Icon from "@/components/Icon"
import { SMALL_BORDER_RADIUS } from "@/constants/borders"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { useTranslation } from "react-i18next"
import { SortSelectMenu } from "./SortSelectMenu"
import { CategorySelectMenu } from "./CategorySelectMenu"
import { useEffect, useState } from "react"

import type { Article } from "@/app/(tabs)/blog"

interface SearchArticlesProps {
    onFilteredArticlesUpdate:(filtered_articles:Article[]) => void,
    filtered_articles:Article[],
    articles:Article[],
    onSearchedTextUpdate:(searched_text:string) => void,
    searched_text:string
}

export default function SearchArticles({ onFilteredArticlesUpdate, filtered_articles, articles, onSearchedTextUpdate, searched_text }:SearchArticlesProps) {
    const { t } = useTranslation() // Initializes The Translations

    const [selected_sort_option, setSelectedSortOption] = useState<string|null>(null) // Stores The Selected Sort Option
    const [selected_category_option, setSelectedCategoryOption] = useState<string|null>(null) // Stores The Selected Category Option

    // Function For Apply All Filters
    const applyAllFilters = ():void => {
        let new_filtered_articles:Article[] = [...articles] // Stores The New Filtered Articles

        // Searched Text
        if(searched_text.trim()) {
            new_filtered_articles = new_filtered_articles.filter((one_article:Article) => one_article.title.toLowerCase().includes(searched_text.toLowerCase().trim())) // Filters The Articles
        }

        // Filtering
        if(selected_category_option) {
            new_filtered_articles = new_filtered_articles.filter((one_article:Article) => one_article.categories.includes(selected_category_option)) // Filters The Articles
        }

        // Sorting
        if(selected_sort_option) {
            new_filtered_articles.sort((a:Article, b:Article) => {
                switch(selected_sort_option) {
                    case "latest": return new Date(b.creation_time).getTime() - new Date(a.creation_time).getTime() // Sorts The Articles By Latest
                    case "popular": return b.visitors - a.visitors // Sorts The Articles By Popular
                    case "best": return b.average_rating - a.average_rating // Sorts The Articles By Best
                    case "a-z": return a.title.localeCompare(b.title) // Sorts The Articles Alphabetically (A-Z)
                    case "z-a": return b.title.localeCompare(a.title) // Sorts The Articles Alphabetically (Z-A)
                    default: return 0
                }
            })
        }

        onFilteredArticlesUpdate(new_filtered_articles) // Sets The Filtered Articles
    }

    // Initializes The Apply Of All Filters
    useEffect(() => {
        applyAllFilters() // Applies All Filters
    }, [searched_text, selected_sort_option, selected_category_option, articles])

    // Function For Delete Search Bar
    const deleteSearchBar = ():void => {
        onSearchedTextUpdate("") // Sets The Searched Text
    }

    return (
        <View className="search_bar_container" style={styles.search_bar_container}>
            <View className="search_bar_menu" style={styles.search_bar_menu}>
                <Icon icon_name="magnifying-glass" style={styles.magnifying_glass_icon} />

                <View className="delete_search_bar" style={styles.delete_search_bar}>
                    <Icon icon_name="xmark" onPress={deleteSearchBar} />
                </View>

                <TextInput
                    className="search_bar"
                    textAlignVertical="top" 
                    placeholder={t("Nájsť článok")} 
                    placeholderTextColor={LIGHT_BLUE_COLOR}
                    accessibilityLabel={t("Nájsť článok")} 
                    value={searched_text}
                    onChangeText={(text:string) => onSearchedTextUpdate(text)}

                    style={[
                        styles.search_bar, 
                        { outlineStyle: "none" } as any
                    ]}
                />
            </View>

            <View className="select_menus" style={styles.select_menus}>
                <SortSelectMenu 
                    onSelectedSortOptionUpdate={(selected_sort_option:string|null) => setSelectedSortOption(selected_sort_option)}
                    selected_sort_option={selected_sort_option}
                />

                <CategorySelectMenu 
                    onSelectedCategoryOptionUpdate={(selected_category_option:string|null) => setSelectedCategoryOption(selected_category_option)}
                    selected_category_option={selected_category_option}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    search_bar_container: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        width: "100%",
        zIndex: 300,
        overflow: "visible",
    },

    search_bar_menu: {
        position: "relative",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        // backdrop-filter: blur(5px);
        zIndex: 50,
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

    select_menus: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        maxWidth: MAIN_WIDTH,
        width: "100%",
        overflow: "visible",
    },

    select_menu: {
        position: "relative",
        flex: 1,
        minWidth: 0,
        cursor: "pointer",

        // &:has(.refresh:hover) {
        //     .select {
        //         border-color: $blue-color !important;
        //     }
        // }
    },

    select: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 5,
        width: "100%",
        height: 40,
        paddingHorizontal: 8.5,
        color: LIGHT_BLUE_COLOR,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: SMALL_BORDER_RADIUS,
        // transition: border 0.3s ease, box-shadow 0.3s ease;
    
        // &:hover,
        // &:focus-visible,
        // &:has(.fa-angle-down:hover),
        // &:has(.fa-angle-up:hover) {
        //     border-color: $blue-color !important;
        // }

        // span {
        //     @include crop_text;
        //     margin-left: 15px + 8.5px - 2px;
            
        //     i {
        //         color: $light-blue-color;
        //         margin-right: 8.5px;
        //     }
        // }
    },

    options_list: {
        // @include scrollbar;
        // interpolate-size: allow-keywords;
        position: "absolute",
        width: "100%",
        height: 0,
        marginTop: 10,
        color: SECONDARY_COLOR,
        backgroundColor: transparentize(MAIN_COLOR, 0.2),
        borderRadius: SMALL_BORDER_RADIUS,
        // overflow-y: $scrollbar;
        // transition: height 0.3s ease;
        zIndex: 500,

        // &::-webkit-scrollbar {
        //     width: 3px;
        // }

        // &.active {
        //     height: $options_list_height;
        // }
    },

    option: {
        // @include crop_text;
        flexDirection: "row",
        paddingVertical: 5,
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
        position: "absolute",
        top: "50%",
        left: 0,
        transform: [{ translateY: "-50%" }],
        height: "100%",
        paddingLeft: 8.5,
        zIndex: 50,
    },
})