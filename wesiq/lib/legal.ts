// Legal Pages Required By The App Stores (Opened In The In-App Browser)

import { Platform } from "react-native"
import * as WebBrowser from "expo-web-browser"
import { colors } from "@/theme"

export type LegalPage = "privacy"|"terms"

export const LEGAL_URLS:Record<LegalPage, string> = {
    privacy: "https://wesiq.com/privacy-policy/",

    // No Own Terms Page Yet, So Subscriptions Use The Store's Standard Terms
    terms: Platform.OS === "android" ? "https://play.google.com/about/play-terms/" : "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
}

// Function For Open A Legal Page
export const openLegalPage = async (page:LegalPage):Promise<void> => {
    if(Platform.OS === "web") {
        window.open(LEGAL_URLS[page], "_blank", "noopener")
        return
    }

    try {
        await WebBrowser.openBrowserAsync(LEGAL_URLS[page], { controlsColor: colors.primary, toolbarColor: colors.background_deep, presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET })
    }

    catch {
        // Nothing To Do, The Browser Couldn't Open
    }
}
