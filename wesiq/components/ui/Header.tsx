import { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { layout, spacing } from "@/theme"
import Text from "./Text"
import IconButton from "./IconButton"

export interface HeaderProps {
    title?:string,
    subtitle?:string,
    is_large?:boolean, // Large Title Style (Top Level Screens)
    has_back_button?:boolean,
    onBack?:() => void, // Defaults To Going Back (Or Home When There Is No History)
    left?:ReactNode, // Replaces The Back Button
    right?:ReactNode // Actions (Use IconButton)
}

export default function Header({ title, subtitle, is_large = false, has_back_button = false, onBack, left, right }:HeaderProps) {
    const { t } = useTranslation() // Initializes The Translations

    // Function For Go Back
    const goBack = ():void => {
        if(onBack) {
            onBack()
            return
        }

        if(router.canGoBack()) router.back() // Goes Back
        else router.replace("/") // Goes Home When Opened From A Deep Link
    }

    const left_element:ReactNode = left ?? (has_back_button ? (
        <IconButton icon="chevron-left" accessibility_label={t("Späť")} onPress={goBack} variant="soft" size={38} />
    ) : null)

    if(is_large) {
        return (
            <View style={styles.large_header}>
                {(left_element || right) && (
                    <View style={styles.row}>
                        <View style={styles.side}>{left_element}</View>
                        <View style={[styles.side, styles.side_right]}>{right}</View>
                    </View>
                )}

                {!!title && <Text variant="title" accessibilityRole="header" numberOfLines={2}>{title}</Text>}
                {!!subtitle && <Text variant="callout" color="text_secondary">{subtitle}</Text>}
            </View>
        )
    }

    return (
        <View style={styles.header}>
            <View style={styles.side}>{left_element}</View>

            <View style={styles.center}>
                {!!title && <Text variant="subheading" align="center" numberOfLines={1} accessibilityRole="header">{title}</Text>}
                {!!subtitle && <Text variant="caption" color="text_secondary" align="center" numberOfLines={1}>{subtitle}</Text>}
            </View>

            <View style={[styles.side, styles.side_right]}>{right}</View>
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        minHeight: layout.header_height,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: layout.screen_padding,
        gap: spacing.sm,
    },

    large_header: {
        paddingHorizontal: layout.screen_padding,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
        gap: spacing.xs,
    },

    row: {
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.xs,
    },

    side: {
        minWidth: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },

    side_right: {
        justifyContent: "flex-end",
    },

    center: {
        flex: 1,
        alignItems: "center",
    },
})
