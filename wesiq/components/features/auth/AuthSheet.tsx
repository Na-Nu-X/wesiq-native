// Login And Registration In One Sheet

import { useRef, useState, ComponentRef } from "react"
import { Pressable, StyleSheet, TextInput, View } from "react-native"
import { router } from "expo-router"
import * as Clipboard from "expo-clipboard"
import { AsYouType, isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js"
import { useTranslation } from "react-i18next"
import { Button, Card, Chip, Icon, Sheet, Text, TextField } from "@/components/ui"
import { colors, fonts, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { setStoredString } from "@/lib/storage"
import { login, register, requestPasswordResetCode, toServerLanguage } from "@/lib/api/endpoints/auth"
import { generateKey } from "@/utils/generateKey"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import LegalLinks from "@/components/features/legal/LegalLinks"

import type { LoggedInUser } from "@/types/models"

export type AuthForm = "login_form"|"registration_form"

interface AuthSheetProps {
    active_form:AuthForm|null, // Null = Closed
    onActiveFormChange:(form:AuthForm|null) => void,
    onUserLogin?:(user:LoggedInUser) => void
}

type InputRef = ComponentRef<typeof TextInput>

const MIN_PASSWORD_LENGTH:number = 8 // Same As The Server
const EMAIL_PATTERN:RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Phone Prefixes That Decide The Language Of The Confirmation E-mail (Same Mapping As Before)
const PHONE_LANGUAGES:[string, string][] = [["+421", "sk"], ["+420", "cs"], ["+44", "en"], ["+1", "en"], ["+34", "es"], ["+33", "fr"], ["+380", "uk"], ["+7", "ru"], ["+55", "pt-br"], ["+86", "zh-hans"]]

// Function For Get The Flag Emoji Of A Country Code
const getFlagEmoji = (country_code:string):string => {
    return country_code.toUpperCase().replace(/./g, (letter:string) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
}

interface RegistrationErrors {
    username?:string,
    email_address?:string,
    phone_number?:string,
    password?:string,
    password_check?:string
}

export default function AuthSheet({ active_form, onActiveFormChange, onUserLogin }:AuthSheetProps) {
    const { t, i18n } = useTranslation() // Initializes The Translations
    const { refreshLoggedInUser } = useLoggedInUser() // Gets The Function For Reload The Logged In User

    // Keeps The Last Form While The Sheet Animates Closed (Adjusted During Render)
    const [shown_form, setShownForm] = useState<AuthForm>(active_form ?? "login_form")
    if(active_form !== null && active_form !== shown_form) setShownForm(active_form)

    const [is_submitting, setIsSubmitting] = useState<boolean>(false) // Stores The Information If A Request Runs
    const [form_error, setFormError] = useState<string|null>(null) // Stores The Error Of The Whole Form

    // Login
    const [identifier, setIdentifier] = useState<string>("") // Stores The Username Or E-mail
    const [password, setPassword] = useState<string>("") // Stores The Password
    const [is_sending_reset_code, setIsSendingResetCode] = useState<boolean>(false) // Stores The Information If The Reset Code Is Being Sent
    const password_input = useRef<InputRef>(null) // Moves Focus From The Identifier To The Password

    // Registration
    const [first_name, setFirstName] = useState<string>("")
    const [last_name, setLastName] = useState<string>("")
    const [username, setUsername] = useState<string>("")
    const [email_address, setEmailAddress] = useState<string>("")
    const [phone_number, setPhoneNumber] = useState<string>("")
    const [new_password, setNewPassword] = useState<string>("")
    const [password_check, setPasswordCheck] = useState<string>("")
    const [generated_password, setGeneratedPassword] = useState<string|null>(null) // Shows The Generated Password So It Can Be Saved
    const [registration_errors, setRegistrationErrors] = useState<RegistrationErrors>({})
    const [registered_email, setRegisteredEmail] = useState<string|null>(null) // Shows The "Confirm Your E-mail" State

    const is_login:boolean = shown_form === "login_form" // Stores The Information If The Login Form Is Shown

    // Function For Switch Between Login And Registration
    const switchForm = (form:AuthForm):void => {
        setFormError(null)
        onActiveFormChange(form)
    }

    // Function For Close The Sheet
    const close = ():void => {
        if(is_submitting) return

        setFormError(null)
        onActiveFormChange(null)
    }

    // ---------- Login ----------

    // Function For Log In
    const handleLogin = async ():Promise<void> => {
        if(!identifier.trim() || !password) {
            setFormError(t("Vyplnte všetky potrebné údaje pre prihlásenie."))
            return
        }

        setIsSubmitting(true)
        setFormError(null)

        const response = await login(identifier.trim(), password) // Sends The Login Request

        if(!response.ok) {
            setIsSubmitting(false)
            haptics.error()
            setFormError(response.error.message)
            return
        }

        const user:LoggedInUser|null = await refreshLoggedInUser() // Loads The Logged In User
        setIsSubmitting(false)

        if(!user) {
            setFormError(t("Pri prihlasovaní došlo k chybe."))
            return
        }

        haptics.success()
        onUserLogin?.(user)
        setPassword("")
        onActiveFormChange(null)
    }

    // Function For Send The Password Reset Code And Open The Reset Screen
    const handleForgotPassword = async ():Promise<void> => {
        if(!identifier.trim()) {
            setFormError(t("Zadajte používateľské meno alebo e-mail."))
            return
        }

        setIsSendingResetCode(true)
        setFormError(null)

        const response = await requestPasswordResetCode(identifier.trim()) // Sends The Request
        setIsSendingResetCode(false)

        if(!response.ok) {
            setFormError(response.error.message)
            return
        }

        await setStoredString("identifier", identifier.trim())
        await setStoredString("password_reset_start_time", JSON.stringify(Date.now()))

        onActiveFormChange(null)
        router.push("/password-reset")
    }

    // ---------- Registration ----------

    const phone_country:string|undefined = parsePhoneNumberFromString(phone_number)?.country // Gets The Country Of The Phone Number

    // Function For Validate The Registration Form
    const validateRegistration = ():RegistrationErrors => {
        const errors:RegistrationErrors = {}

        if(!username.trim()) errors.username = t("Zadajte používateľské meno.")
        if(!EMAIL_PATTERN.test(email_address.trim())) errors.email_address = t("Zadajte platný e-mail.")
        if(phone_number.trim() && !isValidPhoneNumber(phone_number)) errors.phone_number = t("Telefónne číslo nie je platné.")
        if(new_password.length < MIN_PASSWORD_LENGTH) errors.password = t("Heslo musí mať aspoň {{count}} znakov.", { count: MIN_PASSWORD_LENGTH })
        if(password_check !== new_password) errors.password_check = t("Heslá sa nezhodujú")

        return errors
    }

    // Function For Register
    const handleRegistration = async ():Promise<void> => {
        const errors:RegistrationErrors = validateRegistration() // Validates The Form
        setRegistrationErrors(errors)
        setFormError(null)

        if(Object.keys(errors).length > 0) {
            haptics.error()
            return
        }

        const phone_language:string|undefined = PHONE_LANGUAGES.find(([prefix]) => phone_number.startsWith(prefix))?.[1] // Gets The Language By The Phone Prefix

        setIsSubmitting(true)

        const response = await register({
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            username: username.trim(),
            email_address: email_address.trim(),
            phone_number: phone_number.trim(),
            password: new_password,
            password_check,
            language: phone_language ?? toServerLanguage(i18n.language),
        })

        setIsSubmitting(false)

        // The Form Keeps Everything The User Typed When Registration Fails
        if(!response.ok) {
            haptics.error()
            setFormError(response.error.message)
            return
        }

        haptics.success()
        setRegisteredEmail(email_address.trim())
        setIdentifier(username.trim())
        setNewPassword("")
        setPasswordCheck("")
        setGeneratedPassword(null)
    }

    // Function For Generate A Strong Password (Fills Both Fields And Shows It So It Can Be Saved)
    const generatePassword = ():void => {
        const generated:string = generateKey(16) // Generates The Password
        setNewPassword(generated)
        setPasswordCheck(generated)
        setGeneratedPassword(generated)
        setRegistrationErrors((previous:RegistrationErrors) => ({ ...previous, password: undefined, password_check: undefined }))
        haptics.selection()
    }

    // Function For Go From The Confirmation State To Login
    const goToLogin = ():void => {
        setRegisteredEmail(null)
        switchForm("login_form")
    }

    // ---------- Rendering ----------

    const title:string = registered_email && !is_login ? t("Potvrďte svoj e-mail") : is_login ? t("Vitajte späť") : t("Vytvoriť účet")
    const subtitle:string|undefined = registered_email && !is_login ? undefined : is_login ? t("Prihláste sa do svojho účtu Wesiq") : t("Pridajte sa ku komunite Wesiq")

    return (
        <Sheet
            visible={active_form !== null}
            onClose={close}
            title={title}
            subtitle={subtitle}
            is_dismissable={!is_submitting}
            footer={renderFooter()}
        >
            {form_error && (
                <Card variant="outlined" padding="md" style={styles.error_card}>
                    <View style={styles.row}>
                        <Icon name="circle-exclamation" size={14} color="danger" />
                        <Text variant="callout" color="danger" style={styles.flex} accessibilityLiveRegion="assertive">{form_error}</Text>
                    </View>
                </Card>
            )}

            {is_login ? renderLogin() : registered_email ? renderRegistered() : renderRegistration()}
        </Sheet>
    )

    // Function For Render The Login Form
    function renderLogin() {
        return (
            <>
                <TextField
                    label={t("Používateľské meno alebo e-mail")}
                    icon="user"
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => password_input.current?.focus()}
                    maxLength={254}
                />

                <View style={styles.password_block}>
                    <TextField
                        ref={password_input}
                        label={t("Heslo")}
                        icon="lock"
                        value={password}
                        onChangeText={setPassword}
                        is_password
                        autoCapitalize="none"
                        autoComplete="current-password"
                        textContentType="password"
                        returnKeyType="go"
                        onSubmitEditing={handleLogin}
                        maxLength={128}
                    />

                    <Pressable
                        onPress={handleForgotPassword}
                        disabled={is_sending_reset_code}
                        accessibilityRole="button"
                        accessibilityHint={t("Pošle kód na obnovenie hesla na váš e-mail")}
                        hitSlop={8}
                        style={styles.link}
                    >
                        <Text variant="label" color="primary_text">{is_sending_reset_code ? t("Odosiela sa...") : t("Zabudli ste heslo?")}</Text>
                    </Pressable>
                </View>
            </>
        )
    }

    // Function For Render The Registration Form
    function renderRegistration() {
        return (
            <>
                <View style={styles.name_row}>
                    <TextField label={t("Meno")} value={first_name} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" maxLength={50} container_style={styles.flex} />
                    <TextField label={t("Priezvisko")} value={last_name} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" maxLength={50} container_style={styles.flex} />
                </View>

                <TextField
                    label={t("Používateľské meno")}
                    icon="at"
                    value={username}
                    onChangeText={(text:string) => setUsername(text.replace(/\s/g, ""))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username-new"
                    textContentType="username"
                    maxLength={30}
                    error={registration_errors.username}
                />

                <TextField
                    label={t("E-mail")}
                    icon="envelope"
                    value={email_address}
                    onChangeText={setEmailAddress}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    keyboardType="email-address"
                    maxLength={254}
                    error={registration_errors.email_address}
                    helper={t("Pošleme vám odkaz na potvrdenie účtu.")}
                />

                <TextField
                    label={`${t("Telefónne číslo")} (${t("nepovinné")})`}
                    icon="phone"
                    placeholder="+421 900 123 456"
                    value={phone_number}
                    onChangeText={(text:string) => setPhoneNumber(new AsYouType().input(text))}
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    keyboardType="phone-pad"
                    maxLength={20}
                    error={registration_errors.phone_number}
                    helper={phone_country ? `${getFlagEmoji(phone_country)} ${phone_country}` : undefined}
                />

                <TextField
                    label={t("Heslo")}
                    icon="lock"
                    value={new_password}
                    onChangeText={(text:string) => {
                        setNewPassword(text)
                        setGeneratedPassword(null)
                    }}
                    is_password
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    passwordRules={`minlength: ${MIN_PASSWORD_LENGTH};`}
                    maxLength={128}
                    error={registration_errors.password}
                    helper={new_password.length > 0 && new_password.length < MIN_PASSWORD_LENGTH ? t("Heslo musí mať aspoň {{count}} znakov.", { count: MIN_PASSWORD_LENGTH }) : undefined}
                />

                <TextField
                    label={t("Zopakujte heslo")}
                    icon="lock"
                    value={password_check}
                    onChangeText={setPasswordCheck}
                    is_password
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    maxLength={128}
                    error={registration_errors.password_check}
                    helper={password_check.length > 0 && password_check === new_password ? t("Heslá sa zhodujú") : undefined}
                />

                {generated_password ? (
                    <Card variant="highlighted" padding="md">
                        <View style={styles.row}>
                            <View style={styles.flex}>
                                <Text variant="caption" color="text_secondary">{t("Vygenerované heslo - uložte si ho")}</Text>
                                <Text variant="body_strong" selectable style={styles.mono}>{generated_password}</Text>
                            </View>

                            <Chip label={t("Kopírovať")} icon="copy" onPress={() => Clipboard.setStringAsync(generated_password).then(() => haptics.success())} />
                        </View>
                    </Card>
                ) : (
                    <Chip label={t("Vygenerovať silné heslo")} icon="wand-magic-sparkles" onPress={generatePassword} style={styles.align_start} />
                )}
            </>
        )
    }

    // Function For Render The "Confirm Your E-mail" State
    function renderRegistered() {
        return (
            <View style={styles.registered}>
                <View style={styles.registered_icon}>
                    <Icon name="envelope-circle-check" size={30} color="success" />
                </View>

                <Text variant="callout" color="text_secondary" align="center">{t("Poslali sme odkaz na potvrdenie na adresu")}</Text>
                <Text variant="body_strong" align="center">{registered_email}</Text>
                <Text variant="caption" color="text_muted" align="center">{t("Odkaz je platný 24 hodín. Skontrolujte aj priečinok so spamom.")}</Text>
            </View>
        )
    }

    // Function For Render The Footer
    function renderFooter() {
        if(!is_login && registered_email) return <Button label={t("Prejsť na prihlásenie")} onPress={goToLogin} is_full_width />

        return (
            <>
                <Button
                    label={is_login ? t("Prihlásiť sa") : t("Vytvoriť účet")}
                    onPress={is_login ? handleLogin : handleRegistration}
                    is_loading={is_submitting}
                    is_full_width
                />

                {!is_login && (
                    <View style={styles.legal}>
                        <Text variant="caption" color="text_muted" align="center">{t("Vytvorením účtu súhlasíte so zásadami ochrany osobných údajov.")}</Text>
                        <LegalLinks pages={["privacy"]} />
                    </View>
                )}

                <View style={styles.switch_row}>
                    <Text variant="callout" color="text_secondary">{is_login ? t("Ešte nemáte účet?") : t("Už máte účet?")}</Text>

                    <Pressable onPress={() => switchForm(is_login ? "registration_form" : "login_form")} disabled={is_submitting} accessibilityRole="button" hitSlop={8}>
                        <Text variant="body_strong" color="primary_text">{is_login ? t("Vytvoriť účet") : t("Prihlásiť sa")}</Text>
                    </Pressable>
                </View>
            </>
        )
    }
}

const styles = StyleSheet.create({
    legal: {
        gap: 4,
    },

    flex: {
        flex: 1,
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },

    error_card: {
        borderColor: colors.danger,
        backgroundColor: colors.danger_soft,
    },

    password_block: {
        gap: spacing.sm,
    },

    link: {
        alignSelf: "flex-end",
        paddingVertical: spacing.xs,
    },

    name_row: {
        flexDirection: "row",
        gap: spacing.sm,
    },

    mono: {
        fontFamily: fonts.mono,
        letterSpacing: 0.5,
    },

    align_start: {
        alignSelf: "flex-start",
    },

    registered: {
        alignItems: "center",
        gap: spacing.sm,
        paddingVertical: spacing.xxl,
    },

    registered_icon: {
        width: 72,
        height: 72,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.sm,
        backgroundColor: colors.success_soft,
        borderRadius: radii.pill,
    },

    switch_row: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: spacing.xs + 2,
        paddingTop: spacing.xs,
    },
})
