import { LIGHT_BLUE_COLOR } from "@/constants/colors"
import { View, Text } from "react-native"
import { useTranslation } from "react-i18next"
import { MAIN_WIDTH } from "@/constants/dimensions"

interface ArticlesAmountProps {
    articles_amount:number
}

export const ArticlesAmount = ({ articles_amount }:ArticlesAmountProps) => {
    const { t } = useTranslation() // Initializes The Translations

    return (
        <View 
            className="articles_amount" 

            style={{ 
                maxWidth: MAIN_WIDTH,
                width: "100%",
                marginHorizontal: "auto",
                marginBottom: 10,
            }}
        >
            <Text style={{ color: LIGHT_BLUE_COLOR }}>
                {articles_amount === 1 && (t("Našiel sa {{articles_amount}} článok.", { articles_amount }))}
                {articles_amount > 1 && articles_amount < 5 && (t("Našli sa {{articles_amount}} články.", { articles_amount }))}
                {articles_amount >= 5 && (t("Našlo sa {{articles_amount}} článkov.", { articles_amount }))}
            </Text>
        </View>
    )
}