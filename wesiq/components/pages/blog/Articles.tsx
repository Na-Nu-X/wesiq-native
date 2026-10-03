import { View, StyleSheet, Text, Alert } from "react-native"
import { SECONDARY_COLOR } from "@/constants/colors"
import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { API_URL } from "@/constants/general"
import ArticleItem from "./ArticleItem"

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
    
    return (
        <View className="articles" style={styles.articles}>
            {no_articles && (<Text className="no_articles" style={styles.no_articles}>{t("Ospravedlňujeme sa!\nNepodarilo sa nájsť žiadne články.")}</Text>)}

            <View className="articles" style={styles.articles}>
                {filtered_articles.map((one_article:Article) => (<ArticleItem key={one_article.id} one_article={one_article} />))}
            </View>
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
})