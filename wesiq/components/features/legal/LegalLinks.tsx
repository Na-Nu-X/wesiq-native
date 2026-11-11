// Inline Links To The Privacy Policy And Terms

import { Pressable, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Text } from "@/components/ui"
import { spacing } from "@/theme"
import { LegalPage, openLegalPage } from "@/lib/legal"

interface LegalLinksProps {
    pages?:LegalPage[]
}

export default function LegalLinks({ pages = ["terms", "privacy"] }:LegalLinksProps) {
    const { t } = useTranslation() // Initializes The Translations

    const labels:Record<LegalPage, string> = {
        terms: t("Podmienky používania"),
        privacy: t("Ochrana osobných údajov"),
    }

    return (
        <View style={styles.row}>
            {pages.map((page:LegalPage) => (
                <Pressable key={page} onPress={() => openLegalPage(page)} accessibilityRole="link" hitSlop={10}>
                    <Text variant="caption" color="primary_text" style={styles.link}>{labels[page]}</Text>
                </Pressable>
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: spacing.lg,
        rowGap: spacing.xs,
    },

    link: {
        textDecorationLine: "underline",
    },
})
