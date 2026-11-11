// Followers / Following / Follow Requests In One Sheet With Tabs And Search

import { useMemo, useState } from "react"
import { FlatList, ListRenderItemInfo, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Button, Divider, EmptyState, IconButton, SegmentedControl, Sheet, TextField, UserRow } from "@/components/ui"
import { spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { approveFollowRequest, FollowState, getFollowState, getToggledFollowFlags, rejectFollowRequest, removeFollower, toggleFollow } from "@/lib/api/endpoints/users"
import { formatUsername } from "@/lib/format"

import type { SegmentOption } from "@/components/ui"
import type { ApiEnvelope, ApiResult } from "@/types/api"
import type { FollowRequest, LoggedInUser, Profile, UserListItem } from "@/types/models"

export type ConnectionsTab = "followers"|"following"|"requests"

export interface ConnectionsSheetProps {
    tab:ConnectionsTab|null, // Null = Closed
    onTabChange:(tab:ConnectionsTab|null) => void,
    profile:Profile,
    logged_in_user:LoggedInUser|null,
    onProfileUpdate:(profile:Profile) => void,
    onLoggedInUserUpdate:(logged_in_user:LoggedInUser) => void
}

interface ConnectionRow {
    key:string,
    user:UserListItem,
    follow_request_id?:number // Only On The Requests Tab
}

const SEARCH_THRESHOLD:number = 8 // The Search Field Is Shown From This Amount Of People

// Function For Check If A User Matches The Search
const matchesSearch = (user:UserListItem, query:string):boolean => {
    if(!query) return true

    const haystack:string = `${user.username} ${user.first_name ?? ""} ${user.last_name ?? ""}`.toLowerCase() // Gets The Searchable Text
    return haystack.includes(query)
}

export default function ConnectionsSheet({ tab, onTabChange, profile, logged_in_user, onProfileUpdate, onLoggedInUserUpdate }:ConnectionsSheetProps) {
    const { t } = useTranslation() // Initializes The Translations

    const [search_query, setSearchQuery] = useState<string>("") // Stores The Search Query
    const [busy_keys, setBusyKeys] = useState<ReadonlySet<string>>(new Set()) // Stores The Rows With A Running Request

    // Keeps The Last Tab While The Sheet Animates Closed (Adjusted During Render)
    const [shown_tab, setShownTab] = useState<ConnectionsTab>(tab ?? "followers")
    if(tab !== null && tab !== shown_tab) setShownTab(tab)

    const is_own_profile:boolean = logged_in_user !== null && logged_in_user.id === profile.id // Stores The Information If The Profile Belongs To The Logged In User
    const follow_requests:FollowRequest[] = is_own_profile ? (logged_in_user?.follow_requests ?? []) : [] // Gets The Follow Requests
    const has_requests_tab:boolean = is_own_profile && (logged_in_user?.private_account === true || follow_requests.length > 0) // Stores The Information If The Requests Tab Is Shown

    // Gets The Tab Options
    const tab_options:SegmentOption<ConnectionsTab>[] = [
        { value: "followers", label: t("Sledovatelia") },
        { value: "following", label: is_own_profile ? t("Sleduješ") : t("Sleduje") },
        ...(has_requests_tab ? [{ value: "requests" as const, label: t("Žiadosti"), badge: follow_requests.length }] : []),
    ]

    const active_tab:ConnectionsTab = shown_tab === "requests" && !has_requests_tab ? "followers" : shown_tab // Gets The Active Tab

    // Gets The Rows Of The Active Tab
    const all_rows:ConnectionRow[] = useMemo(() => {
        if(active_tab === "followers") return profile.followers.map((relation) => ({ key: `follower_${relation.from_user.id}`, user: relation.from_user }))
        if(active_tab === "following") return profile.following.map((relation) => ({ key: `following_${relation.to_user.id}`, user: relation.to_user }))
        return follow_requests.map((request:FollowRequest) => ({ key: `request_${request.id}`, user: request.from_user, follow_request_id: request.id }))
    }, [active_tab, profile.followers, profile.following, follow_requests])

    const normalized_query:string = search_query.trim().toLowerCase() // Gets The Normalized Query
    const rows:ConnectionRow[] = all_rows.filter((row:ConnectionRow) => matchesSearch(row.user, normalized_query)) // Gets The Filtered Rows

    // Function For Run A Row Action (Prevents Double Taps, Shows Errors)
    const runRowAction = async (row_key:string, request:() => Promise<ApiResult<ApiEnvelope>>, onSuccess:() => void):Promise<void> => {
        if(busy_keys.has(row_key)) return

        setBusyKeys((previous:ReadonlySet<string>) => new Set(previous).add(row_key))

        const response:ApiResult<ApiEnvelope> = await request() // Sends The Request

        setBusyKeys((previous:ReadonlySet<string>) => {
            const next:Set<string> = new Set(previous)
            next.delete(row_key)
            return next
        })

        if(!response.ok) {
            haptics.error() // Plays The Error Haptic Feedback
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success() // Plays The Success Haptic Feedback
        onSuccess()
    }

    // Function For Remove A Follower (Own Profile Only)
    const handleRemoveFollower = async (row:ConnectionRow):Promise<void> => {
        const is_confirmed:boolean = await confirmAction({
            title: t("Odstrániť sledovateľa?"),
            message: t("Používateľ {{username}} nebude upozornený, že ste ho odstránili.", { username: row.user.username }),
            confirm_label: t("Odstrániť"),
            is_destructive: true,
        })

        if(!is_confirmed) return

        await runRowAction(row.key, () => removeFollower(row.user.id), () => {
            onProfileUpdate({ ...profile, followers: profile.followers.filter((relation) => relation.from_user.id !== row.user.id) })
        })
    }

    // Function For Follow / Unfollow / Request / Cancel Request
    const handleToggleFollow = async (row:ConnectionRow):Promise<void> => {
        const state:FollowState = getFollowState(row.user) // Gets The Current State

        if(state === "following") {
            const is_confirmed:boolean = await confirmAction({
                title: t("Prestať sledovať {{username}}?", { username: row.user.username }),
                message: row.user.private_account ? t("Ak je účet súkromný, budete musieť znova požiadať o sledovanie.") : undefined,
                confirm_label: t("Prestať sledovať"),
                is_destructive: true,
            })

            if(!is_confirmed) return
        }

        await runRowAction(row.key, () => toggleFollow(row.user.id), () => {
            const next_flags = getToggledFollowFlags(row.user) // Gets The Next Flags

            onProfileUpdate({
                ...profile,
                following: profile.following.map((relation) => relation.to_user.id === row.user.id ? { ...relation, to_user: { ...relation.to_user, ...next_flags } } : relation),
            })
        })
    }

    // Function For Approve Or Reject A Follow Request
    const handleFollowRequest = async (row:ConnectionRow, is_approved:boolean):Promise<void> => {
        const request_id:number|undefined = row.follow_request_id // Gets The Request ID
        if(request_id === undefined || !logged_in_user) return

        await runRowAction(row.key, () => is_approved ? approveFollowRequest(request_id) : rejectFollowRequest(request_id), () => {
            onLoggedInUserUpdate({
                ...logged_in_user,
                follow_requests: (logged_in_user.follow_requests ?? []).filter((request:FollowRequest) => request.id !== request_id),
                followers_amount: logged_in_user.followers_amount + (is_approved ? 1 : 0),
            })

            // Shows The New Follower Immediately
            if(is_approved && is_own_profile) {
                onProfileUpdate({
                    ...profile,
                    followers: [{ from_user: row.user, status: "accepted", created_at: new Date().toISOString() }, ...profile.followers],
                })
            }
        })
    }

    // Function For Open A Profile From The List
    const openProfile = (username:string):void => {
        onTabChange(null) // Closes The Sheet
        router.push({ pathname: "/profile/[username]", params: { username } })
    }

    // Function For Render The Row Actions
    const renderActions = (row:ConnectionRow) => {
        const is_busy:boolean = busy_keys.has(row.key) // Stores The Information If A Request Runs

        if(active_tab === "requests") {
            return (
                <>
                    <IconButton
                        icon="xmark"
                        accessibility_label={t("Zamietnuť žiadosť od {{username}}", { username: row.user.username })}
                        onPress={() => handleFollowRequest(row, false)}
                        is_disabled={is_busy}
                        variant="soft"
                        size={36}
                    />

                    <Button label={t("Potvrdiť")} size="sm" onPress={() => handleFollowRequest(row, true)} is_loading={is_busy} />
                </>
            )
        }

        if(active_tab === "followers") {
            if(!is_own_profile) return null
            return <Button label={t("Odstrániť")} size="sm" variant="secondary" onPress={() => handleRemoveFollower(row)} is_loading={is_busy} />
        }

        if(!logged_in_user || row.user.id === logged_in_user.id) return null

        const state:FollowState = getFollowState(row.user) // Gets The Follow State

        if(state === "following") return <Button label={t("Sledujete")} size="sm" variant="secondary" icon="check" onPress={() => handleToggleFollow(row)} is_loading={is_busy} />
        if(state === "requested") return <Button label={t("Požiadané")} size="sm" variant="secondary" icon="clock" onPress={() => handleToggleFollow(row)} is_loading={is_busy} accessibility_hint={t("Zrušiť žiadosť")} />
        return <Button label={t("Sledovať")} size="sm" onPress={() => handleToggleFollow(row)} is_loading={is_busy} />
    }

    // Function For Render The Empty State
    const renderEmpty = () => {
        if(normalized_query) return <EmptyState icon="magnifying-glass" title={t("Nikto sa nenašiel")} message={t("Skúste iné meno alebo používateľské meno.")} is_compact />
        if(active_tab === "requests") return <EmptyState icon="bell" title={t("Žiadne žiadosti")} message={t("Nové žiadosti o sledovanie sa zobrazia tu.")} is_compact />
        if(active_tab === "followers") return <EmptyState icon="user-group" title={t("Zatiaľ žiadni sledovatelia")} message={is_own_profile ? t("Keď vás niekto začne sledovať, zobrazí sa tu.") : undefined} is_compact />
        return <EmptyState icon="user-plus" title={is_own_profile ? t("Nikoho nesleduješ.") : t("Nikoho nesleduje.")} is_compact />
    }

    return (
        <Sheet
            visible={tab !== null}
            onClose={() => onTabChange(null)}
            title={active_tab === "requests" ? t("Žiadosti o sledovanie") : active_tab === "followers" ? t("Sledovatelia") : (is_own_profile ? t("Sleduješ") : t("Sleduje"))}
            subtitle={formatUsername(profile.username)}
            size="large"
            is_scrollable={false}
        >
            <View style={styles.controls}>
                <SegmentedControl<ConnectionsTab>
                    options={tab_options}
                    value={active_tab}
                    onChange={(next_tab:ConnectionsTab) => {
                        setSearchQuery("")
                        onTabChange(next_tab)
                    }}
                    accessibility_label={t("Zoznam ľudí")}
                />

                {(all_rows.length >= SEARCH_THRESHOLD || search_query.length > 0) && (
                    <TextField
                        icon="magnifying-glass"
                        placeholder={t("Hľadať")}
                        accessibilityLabel={t("Hľadať")}
                        value={search_query}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                )}
            </View>

            <FlatList
                data={rows}
                keyExtractor={(row:ConnectionRow) => row.key}
                style={styles.list}
                contentContainerStyle={styles.list_content}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ItemSeparatorComponent={() => <Divider inset={56} />}
                ListEmptyComponent={renderEmpty}
                initialNumToRender={14}

                renderItem={({ item }:ListRenderItemInfo<ConnectionRow>) => (
                    <UserRow
                        user={item.user}
                        onPress={() => openProfile(item.user.username)}
                        accessibility_hint={t("Zobraziť užívateľa")}
                        trailing={renderActions(item)}
                    />
                )}
            />
        </Sheet>
    )
}

const styles = StyleSheet.create({
    controls: {
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
    },

    list: {
        flex: 1,
    },

    list_content: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
    },
})
