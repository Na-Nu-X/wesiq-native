// Asks For Notification Permission In Context (Above The Conversations) Instead Of At App Launch

import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Button, Card, Icon, IconButton, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { getStoredString, setStoredString } from "@/lib/storage"
import { are_notifications_supported, getNotificationPermission, requestNotificationPermission } from "@/lib/notifications"

export default function NotificationPrompt() {
    const { t } = useTranslation() // Initializes The Translations
    const [is_visible, setIsVisible] = useState<boolean>(false) // Stores The Information If The Prompt Is Shown

    // Initializes The Check (Shown Only While The Permission Can Still Be Asked And The Prompt Wasn't Dismissed)
    useEffect(() => {
        if(!are_notifications_supported) return
        let is_active:boolean = true

        Promise.all([getNotificationPermission(), getStoredString("notifications_prompt_dismissed")]).then(([permission, dismissed]) => {
            if(is_active) setIsVisible(permission === "undetermined" && dismissed === null)
        })

        return () => { is_active = false }
    }, [])

    // Function For Hide The Prompt For Good
    const dismiss = ():void => {
        setIsVisible(false)
        setStoredString("notifications_prompt_dismissed", "1")
    }

    // Function For Ask For The Permission
    const enable = async ():Promise<void> => {
        const is_granted:boolean = await requestNotificationPermission("messages")
        if(is_granted) haptics.success()
        dismiss() // The System Dialog Can't Be Shown Twice, So The Prompt Goes Away Either Way
    }

    if(!is_visible) return null

    return (
        <Card style={styles.card}>
            <View style={styles.row}>
                <View style={styles.icon}><Icon name="bell" size={18} color="primary" /></View>

                <View style={styles.text}>
                    <Text variant="body_strong">{t("Nezmeškajte žiadnu správu")}</Text>
                    <Text variant="callout" color="text_secondary">{t("Zapnite si upozornenia a dáme vám vedieť, keď vám niekto napíše.")}</Text>
                </View>

                <IconButton icon="xmark" accessibility_label={t("Zavrieť")} onPress={dismiss} size={32} />
            </View>

            <Button label={t("Zapnúť upozornenia")} icon="bell" onPress={enable} />
        </Card>
    )
}

const styles = StyleSheet.create({
    card: {
        gap: spacing.md,
        marginBottom: spacing.md,
    },

    row: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.md,
    },

    icon: {
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    text: {
        flex: 1,
        gap: 2,
    },
})
