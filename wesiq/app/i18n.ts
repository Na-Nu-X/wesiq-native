import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import * as Localization from "expo-localization"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTranslation } from "react-i18next"

import en_translations from "./locales/en.json"
import sk_translations from "./locales/sk.json"
import cs_translations from "./locales/cs.json"
import de_translations from "./locales/de.json"
import es_translations from "./locales/es.json"
import fr_translations from "./locales/fr.json"
import uk_translations from "./locales/uk.json"
import ru_translations from "./locales/ru.json"
import pt_BR_translations from "./locales/pt_BR.json"

i18n.use(initReactI18next).init({
    compatibilityJSON: "v4",

    resources: {
        en: { translation: en_translations },
        sk: { translation: sk_translations },
        cs: { translation: cs_translations },
        de: { translation: de_translations },
        es: { translation: es_translations },
        fr: { translation: fr_translations },
        uk: { translation: uk_translations },
        ru: { translation: ru_translations },
        pt_BR: { translation: pt_BR_translations }
    },

    lng: Localization.getLocales()[0]?.languageCode ?? "en", 
    fallbackLng: "en",
    interpolation: { escapeValue: false }
})

// Function For Load The Saved Language
const loadSavedLanguage = async ():Promise<void> => {
    const { t } = useTranslation() // Initializes The Translations

    try {
        const saved_language:string|null = await AsyncStorage.getItem("app_language")
        if(saved_language) i18n.changeLanguage(saved_language)
    }
    
    catch {
        console.error(t("Pri načítaní jazyka došlo k chybe."))
    }
}

loadSavedLanguage() // Loads The Saved Language

export default i18n