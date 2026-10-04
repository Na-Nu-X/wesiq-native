import { View, StyleSheet, Text, Pressable, Alert, Share, Animated } from "react-native"
import { BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import Icon from "@/components/Icon"
import { MEDIUM_BORDER_RADIUS } from "@/constants/borders"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { FontAwesome6 } from "@expo/vector-icons"
import { useTranslation } from "react-i18next"
import { useRef } from "react"
import { DOMAIN } from "@/constants/general"
import { ImageBackground } from "expo-image"
import { LinearGradient } from "expo-linear-gradient"
import { getFormattedDate } from "@/utils/time"
import { BlurView } from "expo-blur"
import { ImperativeRouter, useRouter } from "expo-router"

import type { Article } from "@/app/(tabs)/blog"

type ArticleItemProps = {
    one_article:Article
}

export default function ArticleItem({ one_article }:ArticleItemProps) {
    const { t } = useTranslation() // Initializes The Translations

    const slide_animation = useRef(new Animated.Value(-100)).current // Creates The Slide Animation

    const router:ImperativeRouter = useRouter() // Gets The Router

    const first_letter:string = one_article.description ? one_article.description.charAt(0) : "" // Gets The First Letter Of The Description
    const rest_of_text:string = one_article.description ? one_article.description.slice(1) : "" // Gets The Rest Of Text Of The Description

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

    // Function For Show The Description
    const showDescription = ():void => {
        Animated.timing(slide_animation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
        }).start()
    }

    // Function For Hide The Description
    const hideDescription = ():void => {
        Animated.timing(slide_animation, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true
        }).start()
    }
    
    return (
        <View 
            className={one_article.link || "article"} 
            style={styles.article}
        >
            <Pressable 
                onPress={one_article.html_filename ? () => router.push(`/blog/${one_article.link}`) : () => console.log("")}
                onLongPress={showDescription}
                onPressOut={hideDescription}
                
                style={[
                    StyleSheet.absoluteFill,
                    { zIndex: 9999 },
                ]}
            />

            <ImageBackground
                source={one_article.image_name ? { uri: `${DOMAIN}/static/images/articles/${one_article.image_name}`} : ""}
                contentFit="cover"

                style={{
                    width: "100%",
                    height: "100%",
                }}
            >
                <LinearGradient
                    colors={["rgba(0, 0, 0, 0.4)", "rgba(0, 0, 0, 0.6)"]}

                    style={{
                        flex: 1,
                        width: "100%",
                        height: "100%",
                    }}
                >
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                    
                    <View className="top" style={styles.top}>
                        <View className="info" style={styles.info}>
                            {/* <div class="tooltip" data-tooltip="{% translate 'Tento článok pridal' %} {{ one_article.user.username }}" aria-label="{% translate 'Tento článok pridal' %} {{ one_article.user.username }}">
                                <i class="fa-solid fa-circle-info"></i> <!-- https://fontawesome.com/icons/circle-info -->
                            </div> */}
                        </View>
                        
                        <Text className="title" style={styles.title}>{one_article.title}</Text>

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

                    <Animated.View 
                        className="description" 
                        
                        style={[
                            styles.description,

                            {
                                transform: [{ 
                                    translateX: slide_animation.interpolate({
                                        inputRange: [-100, 0],
                                        outputRange: [-MAIN_WIDTH, 0]
                                    }) 
                                }]
                            }
                        ]}
                    >
                        <Text 
                            className={one_article.html_filename ? "hidden" : "hidden unfinished"}

                            style={{
                                paddingHorizontal: 20,
                                textAlign: "left",
                                color: SECONDARY_COLOR,

                                // &.unfinished {
                                //     filter: blur(5px);
                                // }

                                // &::first-letter {
                                //     margin-right: 10px;
                                //     initial-letter: 2;
                                // }
                            }}
                        >
                            {one_article.html_filename && (
                                <>
                                    <Text 
                                        style={{ 
                                            fontSize: 40, 
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {first_letter}
                                    </Text>
        
                                    {" " + rest_of_text}
                                </>
                            )}
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
                                        color: SECONDARY_COLOR,

                                        // &::first-letter {
                                        //     all: unset;
                                        // }
                                    }}
                                >
                                    {t("Tento článok nie je ešte dokončený.")}
                                </Text>
                            </View>
                        )}
                    </Animated.View>

                    <View
                        accessibilityLabel={t("Zobraziť")}
                        style={styles.article_link}
                    >
                        <View className="article_info" style={styles.article_info}>
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between", 
                                }}
                            >
                                <View 
                                    className="rating"

                                    accessibilityLabel={
                                        one_article.average_rating === 0 
                                            ? t("Zatiaľ žiadne hodnotenia") 
                                            : t("Priemerné hodnotenie {{average_rating}}", { average_rating: one_article.average_rating })
                                    }

                                    style={styles.rating}
                                >
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

                                <View className="category" style={styles.category}>
                                    <FontAwesome6
                                        name="list"
                                        size={20}
                                        color={BLUE_COLOR}
                                    />

                                    <Text style={{ color: BLUE_COLOR }}>{one_article.categories.join(", ")}</Text>
                                </View>
                            </View>
                            
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between", 
                                }}
                            >
                                <View 
                                    className="visitors" 
                                    accessibilityLabel={t("{{visitors}} unikátnych návštevníkov", { visitors: one_article.visitors })}
                                    style={styles.visitors}
                                >
                                    <View 
                                        style={{ 
                                            flexDirection: "row", 
                                            alignItems: "center",
                                            gap: 5,
                                        }}
                                    >
                                        <FontAwesome6
                                            name="eye"
                                            size={20}
                                            solid={false}
                                            color={BLUE_COLOR}
                                        />

                                        <Text style={{ color: BLUE_COLOR }}>{one_article.visitors}</Text>
                                    </View>
                                </View>

                                <View 
                                    className="date" 
                                    accessibilityLabel={t("Dátum zverejnenia")} 
                                    style={styles.date}
                                >
                                    <Text style={{ color: BLUE_COLOR }}>{getFormattedDate(one_article.creation_time)}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </ImageBackground>
        </View>
    )
}

const styles = StyleSheet.create({
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
        zIndex: 60,
    },

    info: {
        position: "relative",

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
        zIndex: 60,
    },

    article_info: {
        position: "absolute",
        bottom: 0,
        left: 0,
        justifyContent: "space-between",
        // display: grid;
        // grid-template-columns: repeat(2, minmax(0, 1fr));
        width: "100%",
        height: 70,
        paddingVertical: 5,
        backgroundColor: transparentize(SECONDARY_COLOR, 0.9),
        // backdrop-filter: blur(2px);
        // border-top: 1px solid transparentize($blog-surface-border, 0.5);
        // borderTopWidth: 1,
        // borderTopColor: transparentize(BLUE_COLOR, 0.5),
    },

    rating: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 2.5,
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