// Edit Own Account: Photo, Name, Bio, Links, Contact, Privacy, Language, Log Out, Delete Account

import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { AsYouType, isValidPhoneNumber } from "libphonenumber-js"
import { useTranslation } from "react-i18next"
import { Avatar, Button, Card, Chip, Divider, Icon, IconButton, Sheet, Text, TextField, ToggleRow } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { setStoredString } from "@/lib/storage"
import { requestAccountDeletion, saveAccount } from "@/lib/api/endpoints/account"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"

import type { Profile } from "@/types/models"

const MAX_BIO_LENGTH:number = 100
const MAX_BIO_LINKS:number = 5
const EMAIL_PATTERN:RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Languages Of The App (Native Names Aren't Translated)
const LANGUAGES:{ code:string, name:string }[] = [
    { code: "sk", name: "Slovenčina" },
    { code: "cs", name: "Čeština" },
    { code: "en", name: "English" },
    { code: "de", name: "Deutsch" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "pt_BR", name: "Português (Brasil)" },
    { code: "uk", name: "Українська" },
    { code: "ru", name: "Русский" },
]

interface PickedPicture {
    uri:string,
    name:string,
    mime_type:string,
    web_file:File|null
}

interface FormState {
    first_name:string,
    last_name:string,
    bio:string,
    bio_links:string[],
    email_address:string,
    phone_number:string,
    private_account:boolean,
    data_saving_mode:boolean,
    picture:PickedPicture|"delete"|null // New Picture, Delete The Current One, Or Keep It
}

// Function For Create The Form From The Profile
const createForm = (profile:Profile):FormState => ({
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    bio: profile.bio ?? "",
    bio_links: profile.bio_links.map((link) => link.url),
    email_address: profile.email_address ?? "",
    phone_number: profile.phone_number ?? "",
    private_account: profile.private_account,
    data_saving_mode: profile.data_saving_mode ?? false,
    picture: null,
})

// Function For Get The Domain Of A Link (For Display)
const getDomain = (url:string):string => {
    return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0] ?? url
}

// Function For Normalize A Typed Link (Adds https:// When Missing)
const normalizeLink = (url:string):string|null => {
    const trimmed:string = url.trim() // Removes Spaces
    if(!trimmed || /\s/.test(trimmed) || !trimmed.includes(".")) return null
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

interface EditAccountSheetProps {
    visible:boolean,
    onClose:() => void,
    profile:Profile, // The Logged In User's Own Profile
    onSaved:() => void // Reloads The Profile
}

export default function EditAccountSheet({ visible, onClose, profile, onSaved }:EditAccountSheetProps) {
    const { t, i18n } = useTranslation() // Initializes The Translations
    const { logged_in_user, refreshLoggedInUser, logOut } = useLoggedInUser() // Gets The Logged In User

    const [form, setForm] = useState<FormState>(() => createForm(profile)) // Stores The Form
    const [new_link, setNewLink] = useState<string>("") // Stores The Link Being Added
    const [errors, setErrors] = useState<{ email_address?:string, phone_number?:string, new_link?:string }>({})
    const [is_saving, setIsSaving] = useState<boolean>(false) // Stores The Information If The Changes Are Being Saved
    const [is_deleting, setIsDeleting] = useState<boolean>(false) // Stores The Information If The Account Is Being Deleted

    // Resets The Form From The Latest Profile Every Time The Sheet Opens (Adjusted During Render)
    const [was_visible, setWasVisible] = useState<boolean>(visible)

    if(visible !== was_visible) {
        setWasVisible(visible)

        if(visible) {
            setForm(createForm(profile))
            setNewLink("")
            setErrors({})
        }
    }

    const initial:FormState = createForm(profile) // Gets The Saved Values
    const is_dirty:boolean = JSON.stringify({ ...form, picture: null }) !== JSON.stringify(initial) || form.picture !== null // Stores The Information If Something Changed
    const is_busy:boolean = is_saving || is_deleting // Stores The Information If A Request Runs

    // Function For Update One Field
    const update = <K extends keyof FormState>(key:K, value:FormState[K]):void => {
        setForm((previous:FormState) => ({ ...previous, [key]: value }))
    }

    // ---------- Photo ----------

    // Function For Pick A New Profile Picture
    const pickPicture = async ():Promise<void> => {
        try {
            const result:ImagePicker.ImagePickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 })
            const asset = result.canceled ? null : result.assets[0] // Gets The Picked Image
            if(!asset) return

            const extension:string = asset.mimeType?.split("/")[1] ?? "jpg" // Gets The Extension
            update("picture", { uri: asset.uri, name: asset.fileName ?? `profile_${Date.now()}.${extension}`, mime_type: asset.mimeType ?? "image/jpeg", web_file: asset.file ?? null })
        }

        catch {
            showAlert(t("Chyba"), t("Pri výbere súborov došlo k chybe."))
        }
    }

    const has_current_picture:boolean = Boolean(profile.profile_picture_name) && form.picture !== "delete" // Stores The Information If A Picture Is Shown

    // ---------- Links ----------

    // Function For Add A Bio Link
    const addLink = ():void => {
        const link:string|null = normalizeLink(new_link) // Normalizes The Link

        if(!link) {
            setErrors((previous) => ({ ...previous, new_link: t("Zadajte platný odkaz, napríklad instagram.com/meno.") }))
            return
        }

        if(form.bio_links.includes(link)) {
            setNewLink("")
            return
        }

        update("bio_links", [...form.bio_links, link].slice(0, MAX_BIO_LINKS))
        setNewLink("")
        setErrors((previous) => ({ ...previous, new_link: undefined }))
        haptics.selection()
    }

    // ---------- Save ----------

    // Function For Save The Changes
    const save = async ():Promise<void> => {
        const next_errors:typeof errors = {}

        if(!EMAIL_PATTERN.test(form.email_address.trim())) next_errors.email_address = t("Zadajte platný e-mail.")
        if(form.phone_number.trim() && !isValidPhoneNumber(form.phone_number)) next_errors.phone_number = t("Telefónne číslo nie je platné.")

        setErrors(next_errors)

        if(Object.keys(next_errors).length > 0) {
            haptics.error()
            return
        }

        setIsSaving(true)

        const response = await saveAccount({
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            bio: form.bio.trim(),
            bio_links: form.bio_links,
            email_address: form.email_address.trim(),
            phone_number: form.phone_number.trim(),
            private_account: form.private_account,
            data_saving_mode: form.data_saving_mode,
            new_profile_picture: form.picture && form.picture !== "delete" ? form.picture : null,
            delete_profile_picture: form.picture === "delete",
        })

        setIsSaving(false)

        if(!response.ok) {
            haptics.error()
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        await refreshLoggedInUser()
        onSaved()
        onClose()

        // The Server Also Answers With Success When The 7 Day Limit Blocks The Changes, So Its Message Is Always Shown
        if(response.message) showAlert(t("Nastavenia účtu"), response.message)
    }

    // Function For Close (Asks Before Throwing Away Changes)
    const requestClose = async ():Promise<void> => {
        if(is_busy) return

        if(is_dirty) {
            const is_confirmed:boolean = await confirmAction({
                title: t("Zahodiť zmeny?"),
                message: t("Neuložené zmeny sa stratia."),
                confirm_label: t("Zahodiť"),
                cancel_label: t("Pokračovať v úpravách"),
                is_destructive: true,
            })

            if(!is_confirmed) return
        }

        onClose()
    }

    // ---------- Account ----------

    // Function For Change The App Language (Applies Immediately)
    const changeLanguage = async (language_code:string):Promise<void> => {
        haptics.selection()
        await i18n.changeLanguage(language_code)
        await setStoredString("app_language", language_code)
    }

    // Function For Log Out
    const handleLogOut = async ():Promise<void> => {
        const is_confirmed:boolean = await confirmAction({ title: t("Odhlásiť sa?"), confirm_label: t("Odhlásiť sa") })
        if(!is_confirmed) return

        onClose()
        await logOut()
        router.replace("/")
    }

    // Function For Delete The Account (Two Confirmations Because It Can't Be Undone After 30 Days)
    const handleDeleteAccount = async ():Promise<void> => {
        const is_confirmed:boolean = await confirmAction({
            title: t("Odstrániť účet?"),
            message: t("Váš účet bude deaktivovaný. Ak sa do 30 dní neprihlásite, bude natrvalo odstránený aj so všetkými príspevkami a správami."),
            confirm_label: t("Pokračovať"),
            is_destructive: true,
        })

        if(!is_confirmed) return

        const is_double_confirmed:boolean = await confirmAction({
            title: t("Naozaj odstrániť účet {{username}}?", { username: profile.username }),
            confirm_label: t("Odstrániť účet"),
            is_destructive: true,
        })

        if(!is_double_confirmed) return

        setIsDeleting(true)
        const response = await requestAccountDeletion() // Sends The Request
        setIsDeleting(false)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        onClose()
        await logOut()
        router.replace("/")
        showAlert(t("Účet bol odstránený"), response.message)
    }

    if(!logged_in_user) return null

    const picture_preview_uri:string|null = form.picture && form.picture !== "delete" ? form.picture.uri : null // Gets The Preview Of A New Picture

    return (
        <Sheet
            visible={visible}
            onClose={requestClose}
            title={t("Upraviť profil")}
            subtitle={`@${profile.username}`}
            size="large"
            is_dismissable={!is_busy}
            footer={<Button label={t("Uložiť zmeny")} icon="check" onPress={save} is_loading={is_saving} is_disabled={!is_dirty || is_deleting} is_full_width />}
        >
            {/* ---------- Photo ---------- */}
            <View style={styles.photo_row}>
                {picture_preview_uri ? (
                    <Image source={{ uri: picture_preview_uri }} style={styles.photo_preview} contentFit="cover" accessibilityLabel={t("Nová profilová fotka")} />
                ) : (
                    <Avatar user={{ ...profile, profile_picture_name: has_current_picture ? profile.profile_picture_name : null, subscription: profile.subscription }} size={76} />
                )}

                <View style={styles.photo_actions}>
                    <Button label={has_current_picture || picture_preview_uri ? t("Zmeniť fotku") : t("Pridať fotku")} icon="camera" variant="secondary" size="sm" onPress={pickPicture} />

                    {(has_current_picture || picture_preview_uri) && (
                        <Button
                            label={picture_preview_uri ? t("Zrušiť výber") : t("Odstrániť fotku")}
                            variant="ghost"
                            size="sm"
                            onPress={() => update("picture", picture_preview_uri ? null : "delete")}
                        />
                    )}

                    {form.picture === "delete" && <Button label={t("Ponechať fotku")} variant="ghost" size="sm" onPress={() => update("picture", null)} />}
                </View>
            </View>

            {/* ---------- Profile ---------- */}
            <SectionTitle label={t("Profil")} />

            <View style={styles.name_row}>
                <TextField label={t("Meno")} value={form.first_name} onChangeText={(value:string) => update("first_name", value)} autoComplete="given-name" textContentType="givenName" maxLength={50} container_style={styles.flex} />
                <TextField label={t("Priezvisko")} value={form.last_name} onChangeText={(value:string) => update("last_name", value)} autoComplete="family-name" textContentType="familyName" maxLength={50} container_style={styles.flex} />
            </View>

            <TextField
                label={t("O mne")}
                placeholder={t("Niečo o Vás")}
                value={form.bio}
                onChangeText={(value:string) => update("bio", value)}
                multiline
                maxLength={MAX_BIO_LENGTH}
                is_counter_visible
            />

            <View style={styles.links}>
                <Text variant="label" color="text_secondary" style={styles.label}>{t("Odkazy")} ({form.bio_links.length}/{MAX_BIO_LINKS})</Text>

                {form.bio_links.length > 0 && (
                    <Card padding="xs">
                        {form.bio_links.map((link:string, index:number) => (
                            <View key={link}>
                                {index > 0 && <Divider inset={spacing.md} />}

                                <View style={styles.link_row}>
                                    <Icon name="link" size={13} color="primary" />
                                    <Text variant="callout" numberOfLines={1} style={styles.flex}>{getDomain(link)}</Text>
                                    <IconButton icon="xmark" accessibility_label={`${t("Odstrániť odkaz")}: ${getDomain(link)}`} onPress={() => update("bio_links", form.bio_links.filter((other:string) => other !== link))} size={30} icon_color="text_muted" />
                                </View>
                            </View>
                        ))}
                    </Card>
                )}

                {form.bio_links.length < MAX_BIO_LINKS && (
                    <View style={styles.add_link_row}>
                        <TextField
                            placeholder={t("Pridať odkaz")}
                            accessibilityLabel={t("Pridať odkaz")}
                            icon="link"
                            value={new_link}
                            onChangeText={(value:string) => {
                                setNewLink(value)
                                if(errors.new_link) setErrors((previous) => ({ ...previous, new_link: undefined }))
                            }}
                            onSubmitEditing={addLink}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                            returnKeyType="done"
                            maxLength={255}
                            error={errors.new_link}
                            container_style={styles.flex}
                        />

                        <IconButton icon="plus" accessibility_label={t("Pridať odkaz")} onPress={addLink} is_disabled={!new_link.trim()} variant="soft" size={50} style={styles.add_link_button} />
                    </View>
                )}
            </View>

            {/* ---------- Contact ---------- */}
            <SectionTitle label={t("Kontakt")} description={t("Vidíte ho len vy.")} />

            <TextField
                label={t("E-mail")}
                icon="envelope"
                value={form.email_address}
                onChangeText={(value:string) => update("email_address", value)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                maxLength={50}
                error={errors.email_address}
            />

            <TextField
                label={`${t("Telefónne číslo")} (${t("nepovinné")})`}
                icon="phone"
                value={form.phone_number}
                onChangeText={(value:string) => update("phone_number", new AsYouType().input(value))}
                autoComplete="tel"
                textContentType="telephoneNumber"
                keyboardType="phone-pad"
                maxLength={25}
                error={errors.phone_number}
            />

            <Text variant="caption" color="text_muted">{t("Profilové údaje môžete meniť raz za 7 dní. Súkromie a jazyk môžete meniť kedykoľvek.")}</Text>

            {/* ---------- Privacy ---------- */}
            <SectionTitle label={t("Súkromie")} />

            <Card padding="xs">
                <ToggleRow
                    icon="lock"
                    label={t("Súkromný účet")}
                    description={t("Príspevky uvidia len schválení sledovatelia.")}
                    value={form.private_account}
                    onChange={(value:boolean) => update("private_account", value)}
                />

                <ToggleRow
                    icon="leaf"
                    label={t("Šetrič dát")}
                    description={t("Videá sa prehrávajú v nižšej kvalite (480p) a šetria mobilné dáta.")}
                    value={form.data_saving_mode}
                    onChange={(value:boolean) => update("data_saving_mode", value)}
                />
            </Card>

            {/* ---------- Language ---------- */}
            <SectionTitle label={t("Jazyk")} description={t("Zmení sa ihneď.")} />

            <View style={styles.chips}>
                {LANGUAGES.map((language) => (
                    <Chip key={language.code} label={language.name} is_selected={i18n.language === language.code} onPress={() => changeLanguage(language.code)} />
                ))}
            </View>

            {/* ---------- Account ---------- */}
            <SectionTitle label={t("Účet")} />

            <Card padding="xs">
                <Pressable onPress={handleLogOut} disabled={is_busy} accessibilityRole="button" style={({ pressed }) => [styles.action_row, pressed ? styles.action_pressed : null]}>
                    <Icon name="arrow-right-from-bracket" size={15} color="text_secondary" />
                    <Text variant="body_strong" style={styles.flex}>{t("Odhlásiť sa")}</Text>
                    <Icon name="chevron-right" size={12} color="text_muted" />
                </Pressable>

                <Divider inset={spacing.md} />

                <Pressable onPress={handleDeleteAccount} disabled={is_busy} accessibilityRole="button" style={({ pressed }) => [styles.action_row, pressed ? styles.action_pressed : null]}>
                    <Icon name="trash" size={15} color="danger" />
                    <Text variant="body_strong" color="danger" style={styles.flex}>{is_deleting ? t("Odstraňuje sa...") : t("Odstrániť účet")}</Text>
                    <Icon name="chevron-right" size={12} color="text_muted" />
                </Pressable>
            </Card>
        </Sheet>
    )
}

// Function For Render A Section Title
function SectionTitle({ label, description }:{ label:string, description?:string }) {
    return (
        <View style={styles.section_title}>
            <Text variant="overline" color="text_muted" accessibilityRole="header">{label}</Text>
            {description && <Text variant="caption" color="text_muted">{description}</Text>}
        </View>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    photo_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
    },

    photo_preview: {
        width: 76,
        height: 76,
        borderRadius: radii.pill,
        backgroundColor: colors.surface_pressed,
    },

    photo_actions: {
        flex: 1,
        alignItems: "flex-start",
        gap: spacing.xs,
    },

    section_title: {
        gap: 2,
        marginTop: spacing.sm,
        marginBottom: -spacing.xs,
    },

    name_row: {
        flexDirection: "row",
        gap: spacing.sm,
    },

    label: {
        paddingHorizontal: spacing.xs,
    },

    links: {
        gap: spacing.sm,
    },

    link_row: {
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingLeft: spacing.md,
        paddingRight: spacing.xs,
    },

    add_link_row: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.sm,
    },

    add_link_button: {
        borderRadius: radii.md,
    },

    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
    },

    action_row: {
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
    },

    action_pressed: {
        backgroundColor: colors.surface_pressed,
    },
})
