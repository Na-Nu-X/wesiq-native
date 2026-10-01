import { View, StyleSheet, Text, Pressable, Alert, Share } from "react-native"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import Icon from "@/components/Icon"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { FontAwesome6 } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { API_URL, DOMAIN } from "@/constants/general"
import { ImageBackground } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { getFormattedDate } from "@/utils/time"

import type { Article } from "@/app/(tabs)/blog"

interface ArticlesResponse {
    success:boolean,
    articles:Article[],
    no_articles:boolean,
    articles_amount:number,
    message:string
}

type ArticlesProps = {
    onArticlesUpdate:(articles:Article[]) => void,
    articles:Article[],
    filtered_articles:Article[],
    onArticlesAmountUpdate:(articles_amount:number) => void
}

export default function Articles({ onArticlesUpdate, articles, filtered_articles, onArticlesAmountUpdate }:ArticlesProps) {
    const { t } = useTranslation() // Initializes The Translations

    const [no_articles, setNoArticles] = useState<boolean>(true) // Stores The Information If There Are No Articles

    // Function For Get The Articles
    const getArticles = async ():Promise<void> => {
        try {
            // Sends The GET Request To The Server
            const articles_response:Response = await fetch(`${API_URL}/get-articles/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            })

            // If The Response Isn't Success
            if(!articles_response.ok) {
                Alert.alert(t("Chyba"), t("Pri hľadaní článkov došlo k chybe.")) // Shows The Alert
                return
            }

            const articles_data:ArticlesResponse = await articles_response.json() // Gets The Articles Data

            // If The Response Isn't Success
            if(!articles_data.success) {
                Alert.alert(t("Chyba"), articles_data.message) // Shows The Alert
                return
            }
            
            else {
                onArticlesAmountUpdate(articles_data.articles_amount) // Sets The Articles Amount
                setNoArticles(articles_data.no_articles) // Sets The Information If There Are No Articles
                onArticlesUpdate(articles_data.articles) // Sets The Articles
            }
        } 
        
        catch {
            Alert.alert(t("Chyba"), t("Pri hľadaní článkov došlo k chybe.")) // Shows The Alert
        }
    }
    
    // Initializes The Load Of The Articles
    useEffect(() => {
        getArticles() // Gets The Articles
    }, [])

    // Function For Share The Article
    const shareArticle = async (article_title:string, article_link:string):Promise<void> => {
        const link: string = `${DOMAIN}/sk/blog/${article_link}` // Sets The Link To The Article
    
        try {
            const result = await Share.share({
                message: `Wesiq - ${article_title}\n${link}`,
                url: link, // Only IOS
                title: `Wesiq - ${article_title}`
            })
    
            if(result.action === Share.sharedAction) {
                if(result.activityType) console.log(t("Zdieľané cez: "), result.activityType) // Only IOS
                else console.log(t("Úspešne zdieľané"))
            } 
            
            else if(result.action === Share.dismissedAction) console.log(t("Zdieľanie zrušené")) // Only IOS
        } 

        catch(error:any) {
            Alert.alert(t("Chyba"), t("Nepodarilo sa otvoriť menu na zdieľanie."))
        }
    }
    
    return (
        <View className="articles" style={styles.articles}>
            {no_articles && (<Text className="no_articles" style={styles.no_articles}>{t("Ospravedlňujeme sa!\nNepodarilo sa nájsť žiadne články.")}</Text>)}

            {filtered_articles.length === 0 ? (
                articles.map((one_article:Article, index:number) => (
                    <ImageBackground
                        key={one_article.id || index}
                        className={one_article.link || "article"}
                        source={one_article.image_name ? { uri: `${DOMAIN}/static/images/articles/${one_article.image_name}`} : ""}
                        contentFit="cover"
                        style={styles.article}
                    >
                        <LinearGradient
                            colors={["rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.6)"]}
    
                            style={{
                                flex: 1,
                                width: "100%",
                                height: "100%",
                            }}
                        >
                            <View className="top" style={styles.top}>
                                <View className="info" style={styles.info}>
                                    {/* <div class="tooltip" data-tooltip="{% translate 'Tento článok pridal' %} {{ one_article.user.username }}" aria-label="{% translate 'Tento článok pridal' %} {{ one_article.user.username }}">
                                        <i class="fa-solid fa-circle-info"></i> <!-- https://fontawesome.com/icons/circle-info -->
                                    </div> */}
                                </View>
                                
                                <View className="skeleton_loading skeleton_text" style={{ zIndex: 60 }}>
                                    <Text className="title" style={styles.title}>{one_article.title}</Text>
                                </View>
    
                                <View 
                                    className="share" 
                                    accessibilityLabel={t("Zdielať...")} 
                                    style={styles.share}
                                >
                                    <Icon
                                        icon_name="share-nodes"
                                        onPress={() => shareArticle(one_article.title, one_article.link)}
                                        size={30}
                                    />
                                </View>
                            </View>
    
                            <View className="description skeleton_loading skeleton_text" style={styles.description}>
                                <Text 
                                    className={one_article.html_filename ? "hidden" : "hidden unfinished"}
    
                                    style={{
                                        paddingHorizontal: 20,
                                        textAlign: "left",
    
                                        // &.unfinished {
                                        //     filter: blur(5px);
                                        // }
    
                                        // &::first-letter {
                                        //     margin-right: 10px;
                                        //     initial-letter: 2;
                                        // }
                                    }}
                                >
                                    {one_article.description}
                                </Text>
    
                                {!one_article.html_filename && (
                                    <View className="unfinished_article_notice" style={styles.unfinished_article_notice}>
                                        <FontAwesome6
                                            name="lock"
                                            size={45}
                                            color={BLUE_COLOR}
                                        />
    
                                        <Text 
                                            style={{
                                                textAlign: "center",
    
                                                // &::first-letter {
                                                //     all: unset;
                                                // }
                                            }}
                                        >
                                            {t("Tento článok nie je ešte dokončený.")}
                                        </Text>
                                    </View>
                                )}
                            </View>
    
                            <Pressable
                                // onPress={one_article.html_filename ? () => goToArticle(one_article.link) : () => console.log("Tento článok nie je ešte dokončený.")}
                                accessibilityLabel={t("Zobraziť")}
                                style={styles.article_link}
                            >
                                <View className="article_info" style={styles.article_info}>
                                    <View 
                                        className="rating"
    
                                        accessibilityLabel={
                                            one_article.average_rating === 0 
                                                ? t("Zatiaľ žiadne hodnotenia") 
                                                : t("Priemerné hodnotenie {{average_rating}}", { average_rating: one_article.average_rating })
                                        }
    
                                        style={styles.rating}
                                    >
                                        <View className="skeleton_loading skeleton_text" style={{ flexDirection: "row" }}>
                                            {Array.from({ length: 5 }).map((_, index:number) => (
                                                index < one_article.average_rating ? (
                                                    <View key={index} className="full" style={{ cursor: "pointer" }}>
                                                        <FontAwesome6
                                                            name="star"
                                                            size={15}
                                                            solid={true}
                                                            color={YELLOW_COLOR}
                                                            style={{ opacity: 1 }}
                                                        />
                                                    </View>
                                                ) : (
                                                    <View key={index} className="empty" style={{ cursor: "pointer" }}>
                                                        <FontAwesome6
                                                            name="star"
                                                            size={15}
                                                            solid={true}
                                                            color={LIGHT_BLUE_COLOR}
                                                            style={{ opacity: 0.5 }}
                                                        />
                                                    </View>
                                                )
                                            ))}
                                        </View>
                                    </View>
    
                                    <View className="category" style={styles.category}>
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={BLUE_COLOR}
                                        />
    
                                        <View className="skeleton_loading skeleton_text">
                                            <Text className="hidden" style={{ color: BLUE_COLOR }}>
                                                {one_article.categories.map((one_category, index:number) => (
                                                    <Text key={index}>{one_category}</Text>
                                                ))}
                                            </Text>
                                        </View>
                                    </View>
    
                                    <View 
                                        className="visitors" 
                                        accessibilityLabel={t("{{visitors}} unikátnych návštevníkov", { visitors: one_article.visitors })}
                                        style={styles.visitors}
                                    >
                                        <View className="skeleton_loading skeleton_text">
                                            <View className="hidden" style={{ flexDirection: "row" }}>
                                                <FontAwesome6
                                                    name="eye"
                                                    size={20}
                                                    solid={false}
                                                    color={BLUE_COLOR}
                                                />
    
                                                <Text style={{ color: BLUE_COLOR }}>{one_article.visitors}</Text>
                                            </View>
                                        </View>
                                    </View>
    
                                    <View 
                                        className="date" 
                                        accessibilityLabel={t("Dátum zverejnenia")} 
                                        style={styles.date}
                                    >
                                        <View className="skeleton_loading skeleton_text">
                                            <Text className="hidden" style={{ color: BLUE_COLOR }}>{getFormattedDate(one_article.creation_time)}</Text>
                                        </View>
                                    </View>
                                </View>
                            </Pressable>
                        </LinearGradient>
                    </ImageBackground>
                ))
            ) : (
                filtered_articles.map((one_article:Article, index:number) => (
                    <ImageBackground
                        key={one_article.id || index}
                        className={one_article.link || "article"}
                        source={one_article.image_name ? { uri: `${DOMAIN}/static/images/articles/${one_article.image_name}`} : ""}
                        contentFit="cover"
                        style={styles.article}
                    >
                        <LinearGradient
                            colors={["rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.6)"]}
    
                            style={{
                                flex: 1,
                                width: "100%",
                                height: "100%",
                            }}
                        >
                            <View className="top" style={styles.top}>
                                <View className="info" style={styles.info}>
                                    {/* <div class="tooltip" data-tooltip="{% translate 'Tento článok pridal' %} {{ one_article.user.username }}" aria-label="{% translate 'Tento článok pridal' %} {{ one_article.user.username }}">
                                        <i class="fa-solid fa-circle-info"></i> <!-- https://fontawesome.com/icons/circle-info -->
                                    </div> */}
                                </View>
                                
                                <View className="skeleton_loading skeleton_text" style={{ zIndex: 60 }}>
                                    <Text className="title" style={styles.title}>{one_article.title}</Text>
                                </View>
    
                                <View 
                                    className="share" 
                                    accessibilityLabel={t("Zdielať...")} 
                                    style={styles.share}
                                >
                                    <Icon
                                        icon_name="share-nodes"
                                        onPress={() => shareArticle(one_article.title, one_article.link)}
                                        size={30}
                                    />
                                </View>
                            </View>
    
                            <View className="description skeleton_loading skeleton_text" style={styles.description}>
                                <Text 
                                    className={one_article.html_filename ? "hidden" : "hidden unfinished"}
    
                                    style={{
                                        paddingHorizontal: 20,
                                        textAlign: "left",
    
                                        // &.unfinished {
                                        //     filter: blur(5px);
                                        // }
    
                                        // &::first-letter {
                                        //     margin-right: 10px;
                                        //     initial-letter: 2;
                                        // }
                                    }}
                                >
                                    {one_article.description}
                                </Text>
    
                                {!one_article.html_filename && (
                                    <View className="unfinished_article_notice" style={styles.unfinished_article_notice}>
                                        <FontAwesome6
                                            name="lock"
                                            size={45}
                                            color={BLUE_COLOR}
                                        />
    
                                        <Text 
                                            style={{
                                                textAlign: "center",
    
                                                // &::first-letter {
                                                //     all: unset;
                                                // }
                                            }}
                                        >
                                            {t("Tento článok nie je ešte dokončený.")}
                                        </Text>
                                    </View>
                                )}
                            </View>
    
                            <Pressable
                                // onPress={one_article.html_filename ? () => goToArticle(one_article.link) : () => console.log("Tento článok nie je ešte dokončený.")}
                                accessibilityLabel={t("Zobraziť")}
                                style={styles.article_link}
                            >
                                <View className="article_info" style={styles.article_info}>
                                    <View 
                                        className="rating"
    
                                        accessibilityLabel={
                                            one_article.average_rating === 0 
                                                ? t("Zatiaľ žiadne hodnotenia") 
                                                : t("Priemerné hodnotenie {{average_rating}}", { average_rating: one_article.average_rating })
                                        }
    
                                        style={styles.rating}
                                    >
                                        <View className="skeleton_loading skeleton_text" style={{ flexDirection: "row" }}>
                                            {Array.from({ length: 5 }).map((_, index:number) => (
                                                index < one_article.average_rating ? (
                                                    <View key={index} className="full" style={{ cursor: "pointer" }}>
                                                        <FontAwesome6
                                                            name="star"
                                                            size={15}
                                                            solid={true}
                                                            color={YELLOW_COLOR}
                                                            style={{ opacity: 1 }}
                                                        />
                                                    </View>
                                                ) : (
                                                    <View key={index} className="empty" style={{ cursor: "pointer" }}>
                                                        <FontAwesome6
                                                            name="star"
                                                            size={15}
                                                            solid={true}
                                                            color={LIGHT_BLUE_COLOR}
                                                            style={{ opacity: 0.5 }}
                                                        />
                                                    </View>
                                                )
                                            ))}
                                        </View>
                                    </View>
    
                                    <View className="category" style={styles.category}>
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={BLUE_COLOR}
                                        />
    
                                        <View className="skeleton_loading skeleton_text">
                                            <Text className="hidden" style={{ color: BLUE_COLOR }}>
                                                {one_article.categories.map((one_category, index:number) => (
                                                    <Text key={index}>{one_category}</Text>
                                                ))}
                                            </Text>
                                        </View>
                                    </View>
    
                                    <View 
                                        className="visitors" 
                                        accessibilityLabel={t("{{visitors}} unikátnych návštevníkov", { visitors: one_article.visitors })}
                                        style={styles.visitors}
                                    >
                                        <View className="skeleton_loading skeleton_text">
                                            <View className="hidden" style={{ flexDirection: "row" }}>
                                                <FontAwesome6
                                                    name="eye"
                                                    size={20}
                                                    solid={false}
                                                    color={BLUE_COLOR}
                                                />
    
                                                <Text style={{ color: BLUE_COLOR }}>{one_article.visitors}</Text>
                                            </View>
                                        </View>
                                    </View>
    
                                    <View 
                                        className="date" 
                                        accessibilityLabel={t("Dátum zverejnenia")} 
                                        style={styles.date}
                                    >
                                        <View className="skeleton_loading skeleton_text">
                                            <Text className="hidden" style={{ color: BLUE_COLOR }}>{getFormattedDate(one_article.creation_time)}</Text>
                                        </View>
                                    </View>
                                </View>
                            </Pressable>
                        </LinearGradient>
                    </ImageBackground>
                ))
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    articles: {
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        width: "100%",
        marginTop: 20,
        gap: 20,
        zIndex: 1,
    },

    no_articles: {
        // font-family: $article-heading-font;
        color: SECONDARY_COLOR,

        // &.hidden {
        //     display: none;
        // }
    },

    article: {
        // opacity: 0,
        position: "relative",
        maxWidth: MAIN_WIDTH,
        width: "100%",
        height: 350,
        borderWidth: 1,
        borderColor: transparentize(BLUE_COLOR, 0.5),
        borderRadius: MEDIUM_BORDER_RADIUS,
        shadowColor: BLUE_COLOR,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 10,
        textAlign: "center",
        overflow: "hidden",
        // transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        zIndex: 1,

        // background: {
        //     size: cover !important;
        //     position: center !important;
        //     repeat: no-repeat !important;
        // }

        // &.animate {
        //     animation: fadeIn 1s ease-out forwards;
        // }

        // &:has(a:focus-visible),
        // &:hover {
        //     transform: translateY(-2px);
        //     cursor: pointer;

        //     .description {
        //         transform: translateX(0);
        //         filter: blur(0px);
        //     }
        // }
    },

    top: {
        position: "absolute",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingVertical: 5,
        paddingHorizontal: 20,
    },

    info: {
        position: "relative",
        zIndex: 60,

        // .tooltip {
        //     @include tooltip($top: 50%);

        //     &::before,
        //     &::after {
        //         left: 5px + 10px + 5px;
        //         transform: translateX(var(--translate-x, 0)) translateY(-50%) scale(var(--scale));
        //         transform-origin: left center;
        //     }

        //     &::before {
        //         --translate-x: calc(1 * 10px);

        //         max-width: none;
        //         width: 150px;
        //     }

        //     &::after {
        //         --translate-x: calc(-100% + 10px);

        //         border: none;
        //         border: 10px solid transparent;
        //         border-right-color: transparentize($secondary-color, 0.8);
        //         transform-origin: right center;
        //     }

        //     .fa-circle-info {
        //         color: $blue-color;

        //         &:hover {
        //             color: $dark-blue-color;
        //         }
        //     }
        // }
    },

    title: {
        // font-family: $article-heading-font;
        fontSize: 40,
        color: BLUE_COLOR,
        // text-shadow: 0px 5px 15px transparentize($blue-color, 0.5);
    },

    share: {
        zIndex: 60,
        cursor: "pointer",
    },

    description: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        position: "absolute",
        width: "100%",
        height: "100%",
        backgroundColor: transparentize(MAIN_COLOR, 0.75),
        zIndex: 40,
        transform: [{ translateX: "-100%" }],
        // filter: blur(5px);
        // transition: transform 0.3s ease, filter 0.1s ease;
    },

    unfinished_article_notice: {
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        position: "absolute",
        width: "100%",
        height: "100%",
    },

    article_link: {
        width: "100%",
        height: "100%",
        padding: 20,
        color: SECONDARY_COLOR,
        // backdrop-filter: blur(2px);
        position: "relative",
        zIndex: 30,
    },

    article_info: {
        position: "absolute",
        bottom: 0,
        left: 0,
        // display: grid;
        // grid-template-columns: repeat(2, minmax(0, 1fr));
        width: "100%",
        height: 70,
        backgroundColor: transparentize(SECONDARY_COLOR, 0.9),
        // backdrop-filter: blur(2px);
        // border-top: 1px solid transparentize($blog-surface-border, 0.5);
        borderTopWidth: 1,
        borderTopColor: transparentize(BLUE_COLOR, 0.5)
    },

    rating: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingRight: 10,
        paddingLeft: 20,
    },

    category: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 5,
        minWidth: 0,
        paddingRight: 20,
        paddingLeft: 10,

        // div {
        //     max-width: calc(100% - 20px);

        //     p {
        //         @include crop_text;
        //     }
        // }
    },

    visitors: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingRight: 10,
        paddingLeft: 20,
    },

    date: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingRight: 20,
        paddingLeft: 10,
    },
})