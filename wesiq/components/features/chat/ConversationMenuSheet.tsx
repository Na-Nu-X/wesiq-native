// Conversation Options: Profile, Mute, Chat Background, Report

import { useState } from "react"
import { View } from "react-native"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { useTranslation } from "react-i18next"
import { Card, Divider, Sheet, ToggleRow } from "@/components/ui"
import { spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { changeChatBackground, deleteChatBackground, toggleMuteUser } from "@/lib/api/endpoints/chat"
import { REPORT_REASONS, ReportReason } from "@/lib/api/endpoints/posts"
import { reportUser } from "@/lib/api/endpoints/profile"
import { MenuRow, useReportReasonLabels } from "@/components/features/posts/PostMenuSheet"

import type { ChatReceiver } from "@/types/models"

interface ConversationMenuSheetProps {
    visible:boolean,
    onClose:() => void,
    receiver:ChatReceiver,
    onReceiverChange:(receiver:ChatReceiver) => void,
    background_image:string|null,
    onBackgroundChanged:() => void
}

export default function ConversationMenuSheet({ visible, onClose, receiver, onReceiverChange, background_image, onBackgroundChanged }:ConversationMenuSheetProps) {
    const { t } = useTranslation() // Initializes The Translations
    const getReasonLabel = useReportReasonLabels() // Gets The Reason Labels
    const [view, setView] = useState<"main"|"report">("main")
    const [is_busy, setIsBusy] = useState<boolean>(false)

    // Function For Close And Reset
    const close = ():void => {
        setView("main")
        onClose()
    }

    // Function For Mute / Unmute (Optimistic)
    const toggleMute = async (value:boolean):Promise<void> => {
        onReceiverChange({ ...receiver, is_muted: value })
        const response = await toggleMuteUser(receiver.id) // Sends The Request

        if(!response.ok) {
            onReceiverChange({ ...receiver, is_muted: !value })
            showAlert(t("Chyba"), response.error.message)
        }
    }

    // Function For Pick A New Background
    const pickBackground = async ():Promise<void> => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 })
        const asset = result.canceled ? null : result.assets[0] // Gets The Image
        if(!asset) return

        setIsBusy(true)
        const response = await changeChatBackground(receiver.id, { uri: asset.uri, name: asset.fileName ?? `background_${Date.now()}.jpg`, mime_type: asset.mimeType ?? "image/jpeg", web_file: asset.file ?? null })
        setIsBusy(false)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        onBackgroundChanged()
        close()
    }

    // Function For Remove The Background
    const removeBackground = async ():Promise<void> => {
        if(!background_image) return

        const is_confirmed:boolean = await confirmAction({ title: t("Odstrániť pozadie chatu?"), confirm_label: t("Odstrániť"), is_destructive: true })
        if(!is_confirmed) return

        setIsBusy(true)
        const response = await deleteChatBackground(receiver.id, background_image) // Sends The Request
        setIsBusy(false)

        if(!response.ok) showAlert(t("Chyba"), response.error.message)
        else {
            onBackgroundChanged()
            close()
        }
    }

    // Function For Report The User
    const report = async (reason:ReportReason):Promise<void> => {
        setIsBusy(true)
        const response = await reportUser(receiver.id, reason) // Sends The Request
        setIsBusy(false)

        if(!response.ok) showAlert(t("Chyba"), response.error.message)
        else {
            close()
            showAlert(t("Ďakujeme za nahlásenie"), t("Účet skontrolujeme. Nahlasovateľ zostáva anonymný."))
        }
    }

    return (
        <Sheet
            visible={visible}
            onClose={() => view === "report" ? setView("main") : close()}
            title={view === "report" ? t("Nahlásiť účet") : `@${receiver.username}`}
            is_dismissable={!is_busy}
        >
            {view === "report" ? (
                <Card padding="xs">
                    {REPORT_REASONS.map((reason:ReportReason, index:number) => (
                        <View key={reason}>
                            {index > 0 && <Divider inset={spacing.md} />}
                            <MenuRow icon="flag" label={getReasonLabel(reason)} onPress={() => report(reason)} is_disabled={is_busy} />
                        </View>
                    ))}
                </Card>
            ) : (
                <>
                    <Card padding="xs">
                        <ToggleRow icon="bell-slash" label={t("Stlmiť upozornenia")} description={t("Nebudete dostávať upozornenia na nové správy.")} value={receiver.is_muted} onChange={toggleMute} />
                    </Card>

                    <Card padding="xs">
                        <MenuRow icon="user" label={t("Zobraziť profil")} onPress={() => {
                            close()
                            router.push({ pathname: "/profile/[username]", params: { username: receiver.username } })
                        }} />

                        <Divider inset={spacing.md} />
                        <MenuRow icon="image" label={background_image ? t("Zmeniť pozadie chatu") : t("Nastaviť pozadie chatu")} onPress={pickBackground} is_disabled={is_busy} />

                        {background_image && (
                            <>
                                <Divider inset={spacing.md} />
                                <MenuRow icon="eraser" label={t("Odstrániť pozadie chatu")} onPress={removeBackground} is_disabled={is_busy} />
                            </>
                        )}

                        <Divider inset={spacing.md} />
                        <MenuRow icon="flag" label={t("Nahlásiť")} onPress={() => setView("report")} is_danger />
                    </Card>
                </>
            )}
        </Sheet>
    )
}
