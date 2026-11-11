// Options For Another User's Profile: Copy Link, Report, Suspend (Staff Only)

import { useState } from "react"
import { View } from "react-native"
import * as Clipboard from "expo-clipboard"
import { useTranslation } from "react-i18next"
import { Card, Divider, Sheet } from "@/components/ui"
import { spacing } from "@/theme"
import { DOMAIN } from "@/constants/general"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { REPORT_REASONS, ReportReason } from "@/lib/api/endpoints/posts"
import { reportUser, suspendUser } from "@/lib/api/endpoints/profile"
import { MenuRow, useReportReasonLabels } from "@/components/features/posts/PostMenuSheet"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { formatUsername } from "@/lib/format"

import type { Profile } from "@/types/models"

export default function UserMenuSheet({ profile, visible, onClose }:{ profile:Profile, visible:boolean, onClose:() => void }) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const getReasonLabel = useReportReasonLabels() // Gets The Reason Labels
    const [view, setView] = useState<"main"|"report">("main")
    const [is_busy, setIsBusy] = useState<boolean>(false)

    const is_staff:boolean = logged_in_user?.role === "admin" || logged_in_user?.role === "developer" // Stores The Information If The User Can Suspend Accounts

    // Function For Close And Reset
    const close = ():void => {
        setView("main")
        onClose()
    }

    // Function For Report The User
    const report = async (reason:ReportReason):Promise<void> => {
        setIsBusy(true)
        const response = await reportUser(profile.id, reason) // Sends The Request
        setIsBusy(false)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        close()
        showAlert(t("Ďakujeme za nahlásenie"), t("Účet skontrolujeme. Nahlasovateľ zostáva anonymný."))
    }

    // Function For Suspend The User (Staff)
    const suspend = async ():Promise<void> => {
        const is_confirmed:boolean = await confirmAction({ title: t("Obmedziť účet {{username}}?", { username: profile.username }), confirm_label: t("Obmedziť"), is_destructive: true })
        if(!is_confirmed) return

        setIsBusy(true)
        const response = await suspendUser(profile.id) // Sends The Request
        setIsBusy(false)

        if(!response.ok) showAlert(t("Chyba"), response.error.message)
        else {
            close()
            showAlert(t("Hotovo"), response.message)
        }
    }

    return (
        <Sheet
            visible={visible}
            onClose={() => view === "report" ? setView("main") : close()}
            title={view === "report" ? t("Nahlásiť účet") : formatUsername(profile.username)}
            subtitle={view === "report" ? t("Prečo tento účet nahlasujete?") : undefined}
            is_dismissable={!is_busy}
        >
            <Card padding="xs">
                {view === "report" ? REPORT_REASONS.map((reason:ReportReason, index:number) => (
                    <View key={reason}>
                        {index > 0 && <Divider inset={spacing.md} />}
                        <MenuRow icon="flag" label={getReasonLabel(reason)} onPress={() => report(reason)} is_disabled={is_busy} />
                    </View>
                )) : (
                    <>
                        <MenuRow icon="link" label={t("Kopírovať odkaz na profil")} onPress={async () => {
                            await Clipboard.setStringAsync(`${DOMAIN}/sk/profil/${encodeURIComponent(profile.username)}`)
                            haptics.success()
                            close()
                        }} />

                        {!!logged_in_user && (
                            <>
                                <Divider inset={spacing.md} />
                                <MenuRow icon="flag" label={t("Nahlásiť")} onPress={() => setView("report")} is_danger />
                            </>
                        )}

                        {is_staff && (
                            <>
                                <Divider inset={spacing.md} />
                                <MenuRow icon="ban" label={t("Obmedziť účet")} onPress={suspend} is_danger is_disabled={is_busy} />
                            </>
                        )}
                    </>
                )}
            </Card>
        </Sheet>
    )
}
