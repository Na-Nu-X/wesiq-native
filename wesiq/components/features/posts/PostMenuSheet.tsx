// Post Options: Settings + Delete For The Author, Report For Everyone Else

import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import * as Clipboard from "expo-clipboard"
import { useTranslation } from "react-i18next"
import { Card, Divider, Icon, Sheet, Text, ToggleRow } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { emitAppEvent } from "@/lib/events"
import { deletePost, editPostSetting, PostSetting, REPORT_REASONS, ReportReason, reportPost } from "@/lib/api/endpoints/posts"
import { getPostLink } from "./SharePostSheet"
import { formatDuration } from "@/lib/format"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"

import type { IconName } from "@/components/ui"
import type { Post } from "@/types/models"

interface PostMenuSheetProps {
    post:Post|null, // Null = Closed
    onClose:() => void,
    onPostChange:(post:Post) => void,
    onPostDeleted:(post:Post) => void
}

// Function For Get The Label Of A Report Reason
export const useReportReasonLabels = () => {
    const { t } = useTranslation() // Initializes The Translations

    return (reason:ReportReason):string => ({
        spam: t("Spam"),
        harassment: t("Obťažovanie"),
        hate_speech: t("Nenávistné prejavy"),
        misinformation: t("Dezinformácie"),
        explicit_content: t("Nevhodný obsah"),
        other: t("Iné"),
    })[reason]
}

export default function PostMenuSheet({ post, onClose, onPostChange, onPostDeleted }:PostMenuSheetProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const getReasonLabel = useReportReasonLabels() // Gets The Reason Labels
    const [view, setView] = useState<"main"|"report">("main") // Stores The Visible Part Of The Sheet
    const [is_busy, setIsBusy] = useState<boolean>(false)

    // Keeps The Last Post While The Sheet Animates Closed, Follows Setting Changes And Resets The View For Another Post (Adjusted During Render)
    const [shown_post, setShownPost] = useState<Post|null>(post)

    if(post && post !== shown_post) {
        if(post.id !== shown_post?.id) setView("main")
        setShownPost(post)
    }

    if(!shown_post) return null

    const is_own:boolean = logged_in_user?.id === shown_post.user.id // Stores The Information If The Post Belongs To The Logged In User

    // Function For Change A Setting (Optimistic)
    const changeSetting = async (setting:PostSetting, value:boolean):Promise<void> => {
        const previous:Post = shown_post
        onPostChange({ ...shown_post, [setting]: value })

        const response = await editPostSetting(shown_post.id, setting, value) // Sends The Request

        if(!response.ok) {
            onPostChange(previous)
            showAlert(t("Chyba"), response.error.message)
        }
    }

    // Function For Delete The Post
    const remove = async ():Promise<void> => {
        const is_confirmed:boolean = await confirmAction({ title: t("Odstrániť príspevok?"), message: t("Príspevok sa natrvalo odstráni aj s komentármi."), confirm_label: t("Odstrániť"), is_destructive: true })
        if(!is_confirmed) return

        setIsBusy(true)
        const response = await deletePost(shown_post.id) // Sends The Request
        setIsBusy(false)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        onClose()
        onPostDeleted(shown_post)
        emitAppEvent("posts_changed")
    }

    // Function For Report The Post
    const report = async (reason:ReportReason):Promise<void> => {
        setIsBusy(true)
        const response = await reportPost(shown_post.id, reason) // Sends The Request
        setIsBusy(false)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        onClose()
        showAlert(t("Ďakujeme za nahlásenie"), t("Príspevok skontrolujeme. Nahlasovateľ zostáva anonymný."))
    }

    // Function For Copy The Link
    const copyLink = async ():Promise<void> => {
        await Clipboard.setStringAsync(getPostLink(shown_post.id))
        haptics.success()
        onClose()
    }

    return (
        <Sheet
            visible={post !== null}
            onClose={() => {
                if(view === "report") setView("main")
                else onClose()
            }}
            title={view === "report" ? t("Nahlásiť príspevok") : t("Možnosti príspevku")}
            subtitle={view === "report" ? t("Prečo tento príspevok nahlasujete?") : `@${shown_post.user.username}`}
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
                    {is_own && shown_post.media.some((media) => media.is_video) && (
                        <Card padding="md" style={styles.stats}>
                            <Text variant="overline" color="text_muted">{t("Štatistiky videa")}</Text>

                            {shown_post.media.filter((media) => media.is_video).map((media, index:number) => (
                                <View key={media.id} style={styles.stat_row}>
                                    <Icon name="film" size={13} color="primary" />
                                    <Text variant="callout" style={styles.flex}>{t("Video {{position}}", { position: index + 1 })}</Text>
                                    <Text variant="caption" color="text_secondary" is_tabular>{t("Zobrazenia")}: {media.video_views ?? 0}</Text>
                                    <Text variant="caption" color="text_secondary" is_tabular>⌀ {formatDuration(media.average_watch_time ?? 0)}</Text>
                                </View>
                            ))}

                            <Text variant="caption" color="text_muted">{t("⌀ = priemerný čas pozerania na diváka")}</Text>
                        </Card>
                    )}

                    {is_own && (
                        <Card padding="xs">
                            <ToggleRow icon="earth-europe" label={t("Viditeľné pre všetkých")} description={shown_post.public_visibility ? undefined : t("Vidia ho len vaši sledovatelia.")} value={shown_post.public_visibility} onChange={(value:boolean) => changeSetting("public_visibility", value)} />
                            <ToggleRow icon="comment" label={t("Povoliť komentáre")} value={shown_post.allow_comments} onChange={(value:boolean) => changeSetting("allow_comments", value)} />
                            <ToggleRow icon="heart" label={t("Skryť počet označení páči sa mi to")} value={shown_post.hide_likes} onChange={(value:boolean) => changeSetting("hide_likes", value)} />
                        </Card>
                    )}

                    <Card padding="xs">
                        <MenuRow icon="link" label={t("Kopírovať odkaz")} onPress={copyLink} />

                        {!is_own && (
                            <>
                                <Divider inset={spacing.md} />
                                <MenuRow icon="user" label={t("Zobraziť profil")} onPress={() => {
                                    onClose()
                                    router.push({ pathname: "/profile/[username]", params: { username: shown_post.user.username } })
                                }} />
                            </>
                        )}

                        {!is_own && logged_in_user && (
                            <>
                                <Divider inset={spacing.md} />
                                <MenuRow icon="flag" label={t("Nahlásiť")} onPress={() => setView("report")} is_danger />
                            </>
                        )}

                        {is_own && (
                            <>
                                <Divider inset={spacing.md} />
                                <MenuRow icon="trash" label={is_busy ? t("Odstraňuje sa...") : t("Odstrániť príspevok")} onPress={remove} is_danger is_disabled={is_busy} />
                            </>
                        )}
                    </Card>
                </>
            )}
        </Sheet>
    )
}

// Function For Render One Menu Row
export function MenuRow({ icon, label, onPress, is_danger = false, is_disabled = false }:{ icon:IconName, label:string, onPress:() => void, is_danger?:boolean, is_disabled?:boolean }) {
    return (
        <Pressable onPress={onPress} disabled={is_disabled} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed ? styles.row_pressed : null, is_disabled ? styles.disabled : null]}>
            <Icon name={icon} size={15} color={is_danger ? "danger" : "text_secondary"} />
            <Text variant="body_strong" color={is_danger ? "danger" : "text"} style={styles.flex}>{label}</Text>
            <Icon name="chevron-right" size={12} color="text_muted" />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    row: {
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
    },

    row_pressed: {
        backgroundColor: colors.surface_pressed,
    },

    disabled: {
        opacity: 0.5,
    },

    stats: {
        gap: spacing.sm,
    },

    stat_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
    },
})
