import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Share } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useState } from "react"
import Banner from "@/components/Banner"
import LoginFormDialog from "@/components/LoginFormDialog"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import { FontAwesome6 } from "@expo/vector-icons"
import { BLUE_COLOR, DARK_BLUE_COLOR, LIGHT_BLUE_COLOR, MAIN_COLOR, SECONDARY_COLOR, transparentize, YELLOW_COLOR } from "@/constants/colors"
import IconButton from "@/components/IconButton"
import Icon from "@/components/Icon"
import { MEDIUM_BORDER_RADIUS, SMALL_BORDER_RADIUS } from "@/constants/borders"
import { ImageBackground } from "expo-image"
import { getFormattedDate } from "@/utils/time"
import { API_URL, DOMAIN } from "@/constants/general"
import { MAIN_WIDTH } from "@/constants/dimensions"
import { LinearGradient } from "expo-linear-gradient"

import type { LoggedInUser } from "@/components/LoginFormDialog"

interface ArticlesResponse {
    success:boolean,
    articles:Article[],
    no_articles:boolean,
    articles_amount:number,
    message:string
}

interface Article {
    id:number,
    title:string,
    description:string,
    image_name:string|null,
    html_filename:string|null,
    link:string,
    categories:string[],
    visitors:number,
    creation_time:string,
    average_rating:number
}

export default function BlogScreen() {
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [articles_amount, setArticlesAmount] = useState<number>(0) // Stores The Articles Amount
    const [no_articles, setNoArticles] = useState<boolean>(true) // Stores The Information If There Are No Articles
    const [articles, setArticles] = useState<Article[]>([]) // Stores The Articles

     // Function For Get The Articles
     const getArticles = async ():Promise<void> => {
        try {
            // Sends The POST Request To The Server
            const articles_response:Response = await fetch(`${API_URL}/get-articles/`, {
                method: "GET",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            })

            // If The Response Isn't Success
            if(!articles_response.ok) {
                Alert.alert("Chyba", "Pri hľadaní článkov došlo k chybe.") // Shows The Alert
                return
            }

            const articles_data:ArticlesResponse = await articles_response.json() // Gets The Articles Data

            // If The Response Isn't Success
            if(!articles_data.success) {
                Alert.alert("Chyba", articles_data.message) // Shows The Alert
                return
            }
            
            else {
                setArticlesAmount(articles_data.articles_amount) // Sets The Articles Amount
                setNoArticles(articles_data.no_articles) // Sets The Information If There Are No Articles
                setArticles(articles_data.articles) // Sets The Articles
            }
        } 
        
        catch {
            Alert.alert("Chyba", "Pri hľadaní článkov došlo k chybe.") // Shows The Alert
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
                if(result.activityType) console.log("Zdieľané cez: ", result.activityType) // Only IOS
                else console.log("Úspešne zdieľané")
            } 
            
            else if(result.action === Share.dismissedAction) console.log("Zdieľanie zrušené") // Only IOS
        } 

        catch(error:any) {
            Alert.alert("Chyba", "Nepodarilo sa otvoriť menu na zdieľanie.")
        }
    }

    return (
        <BackgroundContainer>
            <SafeAreaView style={[styles.safe_area, { flex: 1 }]}>
                <Banner 
                    logged_in_user={logged_in_user} 
                    setActiveForm={setActiveForm} 
                />

                <ScrollView 
                    className="content" 
                    style={styles.content} 
                    contentContainerStyle={{ padding: 20, flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled" 
                    keyboardDismissMode="on-drag"
                >
                    <LoginFormDialog 
                        visible={active_form==="login_form"}
                        onChangeActiveForm={() => setActiveForm("registration_form")}
                        onClose={() => setActiveForm(null)}
                        onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
                    />

                    <RegistrationFormDialog
                        visible={active_form==="registration_form"}
                        onChangeActiveForm={() => setActiveForm("login_form")}
                        onClose={() => setActiveForm(null)}
                        onUserLogin={(logged_in_user_data) => setLoggedInUser(logged_in_user_data)}
                    />

                    <View className="articles_amount">
                        {articles_amount == 1 && (<Text>Našiel sa {articles_amount} článok.</Text>)}
                        {articles_amount > 1 && articles_amount < 5 && (<Text>Našli sa {articles_amount} články.</Text>)}
                        {articles_amount >= 5 && (<Text>Našlo sa {articles_amount} článkov.</Text>)}
                    </View>

                    <View className="search_bar_container" style={styles.search_bar_container}>
                        <View className="search_bar_menu" style={styles.search_bar_menu}>
                            <Icon icon_name="magnifying-glass" style={styles.magnifying_glass_icon} />

                            <View className="delete_search_bar" style={styles.delete_search_bar}>
                                <Icon icon_name="xmark" />
                            </View>

                            <TextInput
                                className="search_bar"
                                textAlignVertical="top" 
                                placeholder="Nájsť článok" 
                                placeholderTextColor={LIGHT_BLUE_COLOR}
                                accessibilityLabel="Nájsť článok" 
                                // value={}
                                // onChangeText={}

                                style={[
                                    styles.search_bar, 
                                    { outlineStyle: "none" } as any
                                ]}
                            />
                        </View>

                        <View className="select_menus" style={styles.select_menus}>
                            <View className="sort_select_menu" style={styles.select_menu}>
                                <View 
                                    className="refresh" 
                                    accessibilityLabel="Obnoviť predvolené filtre"
                                    style={styles.refresh}
                                >
                                    <IconButton 
                                        icon_name="arrow-rotate-right" 
                                        // onPress={} 
                                    />
                                </View>

                                <View className="select" style={styles.select}>
                                    <Text>Najnovšie články</Text>

                                    <Icon
                                        icon_name="angle-down"
                                        // onPress={}
                                        size={20}
                                    />
                                </View>

                                <View className="options_list" style={styles.options_list}>
                                    <Pressable 
                                        className="option"
                                        // onPress={() => setSort(latest}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="clock"
                                            size={20}
                                            solid={false}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Najnovšie články</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setSort(popular}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="eye"
                                            size={20}
                                            solid={false}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Populárne články</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setSort(best}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="star"
                                            size={20}
                                            solid={false}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Najlepšie hodnotené</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setSort(a-z}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="arrow-up-a-z"
                                            size={20}
                                            solid={false}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Podľa abecedy (A-Z)</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setSort(z-a}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="arrow-up-z-a"
                                            size={20}
                                            solid={false}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Podľa abecedy (Z-A)</Text>
                                    </Pressable>
                                </View>
                            </View>

                            <View className="category_select_menu" style={styles.select_menu}>
                                <View 
                                    className="refresh" 
                                    accessibilityLabel="Obnoviť predvolené filtre" 
                                    style={styles.refresh}
                                >
                                    <IconButton 
                                        icon_name="arrow-rotate-right" 
                                        // onPress={} 
                                    />
                                </View>

                                <View className="select" style={styles.select}>
                                    <Text style={{ color: SECONDARY_COLOR }}>Všetky kategórie</Text>

                                    <Icon
                                        icon_name="angle-down"
                                        // onPress={}
                                        size={20}
                                    />
                                </View>

                                <View className="options_list" style={styles.options_list}>
                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(all}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="icons"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Všetky kategórie</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(static}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Statické prvky</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(dynamic}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Dynamické triky</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(isotonic}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Izotonické cviky</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(balance}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>O rovnováhe</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(flexibility}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>O flexibilite</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(push}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Tlak</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(pull}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Ťah</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(legs}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Nohy</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(beginner}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Pre začiatočníkov</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(intermediate}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Pre stredne pokročilých</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(advanced}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Pre pokročilých</Text>
                                    </Pressable>

                                    <Pressable 
                                        className="option"
                                        // onPress={() => setCategory(elite}
                                        style={styles.option}
                                    >
                                        <FontAwesome6
                                            name="list"
                                            size={20}
                                            color={LIGHT_BLUE_COLOR}
                                            style={{marginRight: 8.5}}
                                        />

                                        <Text style={{ color: SECONDARY_COLOR }}>Pre profesionálov</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className="articles" style={styles.articles}>
                        {no_articles && (<Text className="no_articles" style={styles.no_articles}>{"Ospravedlňujeme sa!\nNepodarilo sa nájsť žiadne články."}</Text>)}

                        {articles.map((one_article:Article, index:number) => (
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
                                            accessibilityLabel="Zdielať..." 
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
                                                    Tento článok nie je ešte dokončený.
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <Pressable
                                        // onPress={one_article.html_filename ? () => goToArticle(one_article.link) : () => console.log("Tento článok nie je ešte dokončený.")}
                                        accessibilityLabel="Zobraziť"
                                        style={styles.article_link}
                                    >
                                        <View className="article_info" style={styles.article_info}>
                                            <View 
                                                className="rating"
                                                accessibilityLabel={one_article.average_rating === 0 ? "Zatiaľ žiadne hodnotenia" : `Priemerné hodnotenie ${one_article.average_rating}`}
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
                                                accessibilityLabel={`${one_article.visitors} unikátnych návštevníkov`} 
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
                                                accessibilityLabel="Dátum zverejnenia" 
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
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </BackgroundContainer>
    )
}

const styles = StyleSheet.create({
    safe_area: {
        flex: 1,
    },
  
    content: {
        flex: 1,
    },

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