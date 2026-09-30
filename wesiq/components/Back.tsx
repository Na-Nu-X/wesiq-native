import { View } from "react-native"
import Icon from "./Icon"
import { ImperativeRouter, useRouter } from "expo-router"
import { useTranslation } from "react-i18next"

export default function Back() {
    const { t } = useTranslation() // Initializes The Translations

    const router:ImperativeRouter = useRouter() // Gets The Router

    // Function For Go Back To The Previous Page
    const goBack = ():void => {
        if(router.canGoBack()) router.back()
        else router.push("/")
    }

    return (
        <View className="back" accessibilityLabel={t("Späť")}>
            <Icon
                icon_name="chevron-left"
                onPress={goBack}
                size={30}
                pressed_style={{ transform: [{ scale: 1.1 }] }}
            />
        </View>
    )
}