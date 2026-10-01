import { View, Text, StyleSheet, ScrollView } from "react-native"
import BackgroundContainer from "@/components/BackgroundContainer"
import { SafeAreaView } from "react-native-safe-area-context"
import { useEffect, useState } from "react"
import Banner from "@/components/Banner"
import LoginFormDialog from "@/components/LoginFormDialog"
import RegistrationFormDialog from "@/components/RegistrationFormDialog"
import { useTranslation } from "react-i18next"
import SearchArticles from "@/components/pages/blog/SearchArticles"
import Articles from "@/components/pages/blog/Articles"

import type { LoggedInUser } from "@/components/LoginFormDialog"

export interface Article {
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
    const { t } = useTranslation() // Initializes The Translations
    
    const [logged_in_user, setLoggedInUser] = useState<LoggedInUser|null>(null) // Stores The Logged In User
    const [active_form, setActiveForm] = useState<"login_form"|"registration_form"|null>(null) // Stores The Information Which Dialog Is Open (Login, Registration)

    const [articles, setArticles] = useState<Article[]>([]) // Stores The Articles
    const [searched_text, setSearchedText] = useState<string>("") // Stores The Searched Text
    const [filtered_articles, setFilteredArticles] = useState<Article[]>([]) // Stores The Filtered Articles
    const [articles_amount, setArticlesAmount] = useState<number>(0) // Stores The Articles Amount

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
                        {articles_amount === 1 && (<Text>{t("Našiel sa {{articles_amount}} článok.", { articles_amount })}</Text>)}
                        {articles_amount > 1 && articles_amount < 5 && (<Text>{t("Našli sa {{articles_amount}} články.", { articles_amount })}</Text>)}
                        {articles_amount >= 5 && (<Text>{t("Našlo sa {{articles_amount}} článkov.", { articles_amount })}</Text>)}
                    </View>

                    <SearchArticles 
                        onFilteredArticlesUpdate={(filtered_articles:Article[]) => setFilteredArticles(filtered_articles)}
                        filtered_articles={filtered_articles}
                        articles={articles}
                        onSearchedTextUpdate={(searched_text:string) => setSearchedText(searched_text)}
                        searched_text={searched_text}
                    />

                    <Articles 
                        onArticlesUpdate={(articles:Article[]) => setArticles(articles)}
                        articles={articles}
                        filtered_articles={filtered_articles}
                        onArticlesAmountUpdate={(articles_amount:number) => setArticlesAmount(articles_amount)}
                    />
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
})