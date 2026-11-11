// Password Reset: Emailed 6-Digit Code (Also From The https://wesiq.com/password-reset?code= Link) And A New Password

import { useEffect, useState } from "react"
import { Keyboard, StyleSheet, View } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useTranslation } from "react-i18next"
import { Button, Card, Header, Icon, Screen, Text, TextField } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { showAlert } from "@/lib/alert"
import { getStoredString, removeStoredValue, setStoredString } from "@/lib/storage"
import { requestPasswordResetCode, resetPassword } from "@/lib/api/endpoints/auth"
import { generateKey } from "@/utils/generateKey"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import CodeInput from "@/components/features/auth/CodeInput"

const CODE_LENGTH:number = 6
const CODE_VALID_SECONDS:number = 300 // Same Window As Before
const MIN_PASSWORD_LENGTH:number = 8

const cleanCode = (value:string|undefined):string => (value ?? "").replace(/\D/g, "").slice(0, CODE_LENGTH)

// Function For Get The Remaining Seconds (Null When The Code Wasn't Requested On This Device)
const getRemainingSeconds = (start_time:number|null, now:number):number|null => start_time === null ? null : Math.max(0, Math.ceil(CODE_VALID_SECONDS - (now - start_time) / 1000))

export default function PasswordResetScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const auth_sheet = useAuthSheet() // Opens The Login Sheet
    const { code: link_code } = useLocalSearchParams<{ code?:string }>() // Gets The Code From The Email Link

    const [code, setCode] = useState<string>(() => cleanCode(link_code))
    const [previous_link_code, setPreviousLinkCode] = useState<string|undefined>(link_code)
    const [new_password, setNewPassword] = useState<string>("")
    const [identifier, setIdentifier] = useState<string|null>(null)
    const [start_time, setStartTime] = useState<number|null>(null)
    const [now, setNow] = useState<number>(() => Date.now())
    const [form_error, setFormError] = useState<string|null>(null)
    const [busy_action, setBusyAction] = useState<"reset"|"resend"|null>(null)

    // Fills A New Code When Another Email Link Opens This Screen
    if(link_code !== previous_link_code) {
        setPreviousLinkCode(link_code)
        if(link_code) setCode(cleanCode(link_code))
    }

    // Initializes The Load Of The Stored Request (Who Asked And When)
    useEffect(() => {
        Promise.all([getStoredString("identifier"), getStoredString("password_reset_start_time")]).then(([stored_identifier, stored_start_time]) => {
            setIdentifier(stored_identifier)
            const parsed:number = Number(stored_start_time)
            setStartTime(Number.isFinite(parsed) && parsed > 0 ? parsed : null)
        })
    }, [])

    const remaining_seconds:number|null = getRemainingSeconds(start_time, now)
    const is_expired:boolean = remaining_seconds === 0

    // Initializes The Countdown
    useEffect(() => {
        if(start_time === null) return

        const interval:ReturnType<typeof setInterval> = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(interval)
    }, [start_time])

    // Function For Send A New Code
    const resend = async ():Promise<void> => {
        if(!identifier) {
            auth_sheet.open("login_form") // The Login Sheet Has "Forgot Password"
            return
        }

        setBusyAction("resend")
        const response = await requestPasswordResetCode(identifier) // Sends The Request
        setBusyAction(null)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        const sent_at:number = Date.now() // Gets The New Start Time
        await setStoredString("password_reset_start_time", JSON.stringify(sent_at))
        setStartTime(sent_at)
        setNow(sent_at)
        setCode("")
        setFormError(null)
        haptics.success()
        showAlert(t("Kód bol odoslaný"), response.message || t("Skontrolujte svoj e-mail."))
    }

    // Function For Set The New Password
    const submit = async ():Promise<void> => {
        Keyboard.dismiss()

        if(code.length !== CODE_LENGTH) {
            setFormError(t("Zadajte celý 6-miestny kód."))
            return
        }

        if(new_password.length < MIN_PASSWORD_LENGTH) {
            setFormError(t("Heslo musí mať aspoň {{count}} znakov.", { count: MIN_PASSWORD_LENGTH }))
            return
        }

        setBusyAction("reset")
        setFormError(null)
        const response = await resetPassword(identifier, code, new_password) // Sends The Request
        setBusyAction(null)

        if(!response.ok) {
            haptics.error()
            setFormError(response.error.message)
            return
        }

        await Promise.all([removeStoredValue("password_reset_start_time"), removeStoredValue("identifier")])
        haptics.success()
        showAlert(t("Heslo bolo zmenené"), t("Teraz sa môžete prihlásiť novým heslom."))

        router.replace("/")
        auth_sheet.open("login_form")
    }

    const minutes:number = Math.floor((remaining_seconds ?? 0) / 60)
    const seconds:number = (remaining_seconds ?? 0) % 60
    const is_running_out:boolean = remaining_seconds !== null && remaining_seconds <= 30

    const footer = !is_expired ? (
        <Button label={t("Zmeniť heslo")} icon="key" onPress={submit} is_loading={busy_action === "reset"} is_disabled={busy_action !== null} is_full_width size="lg" />
    ) : undefined

    return (
        <Screen header={<Header title={t("Obnova hesla")} has_back_button />} footer={footer} is_keyboard_aware has_glow>
            <View style={styles.hero}>
                <View style={[styles.hero_icon, is_expired ? styles.hero_icon_expired : null]}><Icon name={is_expired ? "hourglass-end" : "key"} size={26} color={is_expired ? "danger" : "primary"} /></View>
                <Text variant="title" align="center" accessibilityRole="header">{is_expired ? t("Platnosť kódu vypršala") : t("Nastavte si nové heslo")}</Text>

                <Text variant="body" color="text_secondary" align="center">
                    {is_expired
                        ? t("Pošlite si nový kód a skúste to znova.")
                        : identifier ? t("Zadajte 6-miestny kód, ktorý sme poslali na e-mail účtu {{identifier}}.", { identifier }) : t("Zadajte 6-miestny kód z e-mailu.")}
                </Text>
            </View>

            {is_expired ? (
                <Button label={identifier ? t("Poslať nový kód") : t("Späť na prihlásenie")} icon={identifier ? "paper-plane" : "right-to-bracket"} onPress={resend} is_loading={busy_action === "resend"} is_full_width />
            ) : (
                <>
                    <View style={styles.section}>
                        <CodeInput value={code} onChange={(value:string) => { setCode(value); setFormError(null) }} has_error={Boolean(form_error) && code.length !== CODE_LENGTH} accessibility_label={t("Overovací kód")} />

                        <View style={styles.code_row}>
                            {remaining_seconds !== null ? (
                                <View style={styles.timer} accessibilityLabel={t("Kód platí ešte {{minutes}} min {{seconds}} s", { minutes, seconds })} accessibilityLiveRegion="none">
                                    <Icon name="clock" size={12} color={is_running_out ? "danger" : "text_muted"} is_solid={false} />
                                    <Text variant="caption" color={is_running_out ? "danger" : "text_muted"} is_tabular>{`${minutes}:${String(seconds).padStart(2, "0")}`}</Text>
                                </View>
                            ) : <View />}

                            {!!identifier && <Button label={t("Poslať znova")} variant="ghost" size="sm" onPress={resend} is_loading={busy_action === "resend"} is_disabled={busy_action !== null} />}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <TextField
                            label={t("Nové heslo")}
                            icon="lock"
                            is_password
                            value={new_password}
                            onChangeText={(value:string) => { setNewPassword(value); setFormError(null) }}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="new-password"
                            textContentType="newPassword"
                            returnKeyType="done"
                            onSubmitEditing={submit}
                            helper={t("Aspoň {{count}} znakov.", { count: MIN_PASSWORD_LENGTH })}
                        />

                        <Button label={t("Vygenerovať silné heslo")} icon="wand-magic-sparkles" variant="ghost" size="sm" onPress={() => setNewPassword(generateKey(16))} style={styles.generate} />
                    </View>

                    {!!form_error && (
                        <Card padding="md" style={styles.error} accessibility_label={form_error}>
                            <Icon name="circle-exclamation" size={16} color="danger" />
                            <Text variant="callout" color="danger" style={styles.flex} accessibilityLiveRegion="polite">{form_error}</Text>
                        </Card>
                    )}
                </>
            )}
        </Screen>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    hero: {
        alignItems: "center",
        gap: spacing.sm,
        paddingVertical: spacing.md,
    },

    hero_icon: {
        width: 60,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.xs,
        backgroundColor: colors.primary_soft,
        borderRadius: radii.pill,
    },

    hero_icon_expired: {
        backgroundColor: colors.danger_soft,
    },

    section: {
        gap: spacing.sm,
    },

    code_row: {
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    timer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
    },

    generate: {
        alignSelf: "flex-start",
    },

    error: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        borderColor: colors.danger,
    },
})
