// Find People: Search By Name, Username Or Friend Code, With Recently Opened And Suggested Users

import { useEffect, useState } from "react"
import { FlatList, ListRenderItemInfo, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Button, EmptyState, ErrorState, Header, Screen, Skeleton, Text, TextField, UserRow } from "@/components/ui"
import { layout, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { getStoredJson, removeStoredValue, setStoredJson } from "@/lib/storage"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import { FollowState, getFollowState, getToggledFollowFlags, loadFirstUsers, SearchedUser, searchUsers, toggleFollow } from "@/lib/api/endpoints/users"
import { formatUsername } from "@/lib/format"

const HISTORY_LIMIT:number = 10 // Maximum Remembered Users

const isStringArray = (value:unknown):value is string[] => Array.isArray(value) && value.every((item:unknown) => typeof item === "string")

export default function UsersScreen() {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet
    const [search, setSearch] = useState<string>("")
    const [history, setHistory] = useState<string[]|null>(null) // Null Until Loaded From Storage
    const [busy_user_id, setBusyUserId] = useState<number|null>(null)

    const query:string = useDebouncedValue(search.trim(), 350) // Gets The Debounced Query
    const is_searching:boolean = query.length > 0

    // Initializes The Load Of The History
    useEffect(() => {
        getStoredJson("searched_users_history", isStringArray, []).then(setHistory)
    }, [])

    // Suggestions Load Once After The History (Later History Changes Don't Reorder The List Under The Finger)
    const suggestions = useApiQuery("users:first", (signal:AbortSignal) => loadFirstUsers(history ?? [], signal), { is_enabled: history !== null })
    const results = useApiQuery(`users:search:${query}`, (signal:AbortSignal) => searchUsers(query, signal), { is_enabled: is_searching })
    const active = is_searching ? results : suggestions

    const users:SearchedUser[] = (active.state.data?.users ?? []).filter((user:SearchedUser) => user.id !== logged_in_user?.id)
    const is_waiting:boolean = search.trim() !== query // Typing, Debounce Not Finished Yet

    // Function For Open A Profile (And Remember It)
    const openUser = (user:SearchedUser):void => {
        const next_history:string[] = [user.username, ...(history ?? []).filter((username:string) => username !== user.username)].slice(0, HISTORY_LIMIT)
        setHistory(next_history)
        setStoredJson("searched_users_history", next_history)
        router.push({ pathname: "/profile/[username]", params: { username: user.username } })
    }

    // Function For Clear The History
    const clearHistory = async ():Promise<void> => {
        const is_confirmed:boolean = await confirmAction({ title: t("Vymazať históriu vyhľadávania?"), confirm_label: t("Vymazať"), is_destructive: true })
        if(!is_confirmed) return

        setHistory([])
        await removeStoredValue("searched_users_history")
        haptics.light()
    }

    // Function For Follow / Unfollow / Request A User
    const handleToggleFollow = async (user:SearchedUser):Promise<void> => {
        if(!logged_in_user) {
            auth_sheet.open("login_form")
            return
        }

        if(getFollowState(user) === "following") {
            const is_confirmed:boolean = await confirmAction({
                title: t("Prestať sledovať {{username}}?", { username: user.username }),
                message: user.private_account ? t("Ak je účet súkromný, budete musieť znova požiadať o sledovanie.") : undefined,
                confirm_label: t("Prestať sledovať"),
                is_destructive: true,
            })

            if(!is_confirmed) return
        }

        setBusyUserId(user.id)
        const response = await toggleFollow(user.id) // Sends The Request
        setBusyUserId(null)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.light()
        const next_flags = getToggledFollowFlags(user) // Gets The Next Flags
        const followers_delta:number = next_flags.has_follow ? 1 : user.has_follow ? -1 : 0

        active.setData((previous) => previous ? {
            ...previous,
            users: previous.users.map((one_user:SearchedUser) => one_user.id === user.id ? { ...one_user, ...next_flags, followers: Math.max(0, (one_user.followers ?? 0) + followers_delta) } : one_user),
        } : previous)
    }

    // Function For Render The Follow Button
    const renderFollowButton = (user:SearchedUser) => {
        const state:FollowState = getFollowState(user) // Gets The Follow State
        const is_busy:boolean = busy_user_id === user.id

        if(state === "following") return <Button label={t("Sledujete")} size="sm" variant="secondary" icon="check" onPress={() => handleToggleFollow(user)} is_loading={is_busy} />
        if(state === "requested") return <Button label={t("Požiadané")} size="sm" variant="secondary" icon="clock" onPress={() => handleToggleFollow(user)} is_loading={is_busy} accessibility_hint={t("Zrušiť žiadosť")} />
        return <Button label={t("Sledovať")} size="sm" onPress={() => handleToggleFollow(user)} is_loading={is_busy} />
    }

    // Function For Render One User
    const renderUser = ({ item }:ListRenderItemInfo<SearchedUser>) => {
        const parts:string[] = [formatUsername(item.username)]
        if(item.followers !== undefined) parts.push(t("Sledovatelia: {{count}}", { count: item.followers }))

        return <UserRow user={item} subtitle={parts.join(" · ")} onPress={() => openUser(item)} trailing={renderFollowButton(item)} accessibility_hint={t("Otvorí profil")} />
    }

    const has_history:boolean = (history?.length ?? 0) > 0

    const list_header = (
        <View style={styles.list_header}>
            <TextField
                icon="magnifying-glass"
                placeholder={t("Meno, užívateľské meno alebo kód priateľa")}
                accessibilityLabel={t("Hľadať ľudí")}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                autoFocus
            />

            <View style={styles.section_row}>
                <Text variant="label" color="text_secondary">{is_searching ? t("Výsledky") : has_history ? t("Nedávno a navrhované") : t("Navrhovaní ľudia")}</Text>
                {!is_searching && has_history && <Button label={t("Vymazať históriu")} size="sm" variant="ghost" onPress={clearHistory} />}
            </View>
        </View>
    )

    const is_loading:boolean = active.state.status === "loading" || (is_waiting && search.trim().length > 0) || (!is_searching && history === null)

    return (
        <Screen is_scrollable={false} is_padded={false} header={<Header title={t("Hľadať ľudí")} has_back_button />}>
            <FlatList
                data={is_loading ? [] : users}
                keyExtractor={(user:SearchedUser) => String(user.id)}
                renderItem={renderUser}
                ListHeaderComponent={list_header}
                refreshing={active.is_refreshing}
                onRefresh={active.refetch}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.list_content}

                ListEmptyComponent={
                    is_loading ? <View style={styles.skeletons}>{[0, 1, 2].map((index:number) => <Skeleton key={index} height={52} radius={radii.md} />)}</View>
                    : active.state.status === "error" ? <ErrorState error={active.state.error} onRetry={active.refetch} />
                    : <EmptyState icon="user-slash" title={is_searching ? t("Nikto sa nenašiel") : t("Zatiaľ tu nikto nie je")} message={is_searching ? t("Skúste iné meno alebo kód priateľa.") : undefined} is_compact />
                }
            />
        </Screen>
    )
}

const styles = StyleSheet.create({
    list_content: {
        flexGrow: 1,
        gap: spacing.xs,
        paddingHorizontal: layout.screen_padding,
        paddingBottom: spacing.xxxl,
    },

    list_header: {
        gap: spacing.md,
        paddingBottom: spacing.xs,
    },

    section_row: {
        minHeight: 36,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    skeletons: {
        gap: spacing.sm,
    },
})
