// Profile Screen (Own Profile In The Profile Tab, Anyone's Profile Pushed On The Root Stack)

import { useCallback, useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import { router } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { useTranslation } from "react-i18next"
import { Avatar, Button, Card, Chip, EmptyState, ErrorState, Header, IconButton, Screen, SegmentedControl, Skeleton, Text } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { showAlert } from "@/lib/alert"
import { getActiveSubscriptionPlan } from "@/lib/subscription"
import { useApiQuery } from "@/hooks/useApiQuery"
import { getProfile } from "@/lib/api/endpoints/profile"
import { getFollowState, getToggledFollowFlags, toggleFollow } from "@/lib/api/endpoints/users"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { useAuthSheet } from "@/components/features/auth/AuthSheetProvider"
import EditAccountSheet from "@/components/features/account/EditAccountSheet"
import ConnectionsSheet, { ConnectionsTab } from "./ConnectionsSheet"
import UserMenuSheet from "./UserMenuSheet"
import PostGrid from "./PostGrid"
import BadgesContainer from "@/components/pages/profile/BadgesContainer"
import { formatUsername } from "@/lib/format"

import type { BioLink, Profile } from "@/types/models"

type GridTab = "posts"|"saved"

interface ProfileScreenProps {
    username:string|undefined,
    is_tab?:boolean // The Own Profile In The Tab Bar (No Back Button)
}

// Function For Get The Display Domain Of A Link
const getDomain = (url:string):string => url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0] ?? url

export default function ProfileScreen({ username, is_tab = false }:ProfileScreenProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user, setLoggedInUser } = useLoggedInUser() // Gets The Logged In User
    const auth_sheet = useAuthSheet() // Opens The Login Sheet

    const [connections_tab, setConnectionsTab] = useState<ConnectionsTab|null>(null)
    const [is_edit_open, setIsEditOpen] = useState<boolean>(false)
    const [is_menu_open, setIsMenuOpen] = useState<boolean>(false)
    const [grid_tab, setGridTab] = useState<GridTab>("posts")
    const [is_follow_busy, setIsFollowBusy] = useState<boolean>(false)

    const { state, refetch, is_refreshing, setData } = useApiQuery(`profile:${username ?? ""}`, (signal:AbortSignal) => getProfile(username ?? "", signal), { is_enabled: Boolean(username) })

    const profile:Profile|null = state.data?.is_found && state.data.user ? state.data.user : null // Gets The Profile
    const is_own:boolean = profile !== null && logged_in_user?.id === profile.id
    const can_see_content:boolean = profile !== null && (is_own || !profile.private_account || profile.has_follow)
    const requests_count:number = is_own ? (logged_in_user?.follow_requests?.length ?? 0) : 0

    const updateProfile = useCallback((next:Profile) => setData((previous) => previous ? { ...previous, user: next } : previous), [setData])

    // Function For Follow / Unfollow / Request
    const follow = async ():Promise<void> => {
        if(!profile) return
        if(!logged_in_user) {
            auth_sheet.open("login_form")
            return
        }

        setIsFollowBusy(true)
        const response = await toggleFollow(profile.id) // Sends The Request
        setIsFollowBusy(false)

        if(!response.ok) {
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        refetch() // Reloads Followers And Visibility Of Private Content
        updateProfile({ ...profile, ...getToggledFollowFlags(profile) })
    }

    // Function For Open A Bio Link In The In-App Browser
    const openLink = (link:BioLink):void => {
        const url:string = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`
        WebBrowser.openBrowserAsync(url).catch(() => showAlert(t("Chyba"), t("Odkaz sa nepodarilo otvoriť.")))
    }

    // ---------- Header ----------

    const header = (
        <Header
            title={profile ? profile.username : username}
            has_back_button={!is_tab}

            right={profile ? (
                is_own ? (
                    <>
                        {profile.private_account && <IconButton icon="user-clock" accessibility_label={t("Žiadosti o sledovanie")} onPress={() => setConnectionsTab("requests")} variant="soft" size={38} badge_count={requests_count} />}
                        <IconButton icon="gear" accessibility_label={t("Upraviť profil")} onPress={() => setIsEditOpen(true)} variant="soft" size={38} />
                    </>
                ) : (
                    <IconButton icon="ellipsis" accessibility_label={t("Možnosti")} onPress={() => setIsMenuOpen(true)} variant="soft" size={38} />
                )
            ) : undefined}
        />
    )

    // ---------- States ----------

    if(state.status === "loading") {
        return (
            <Screen header={header}>
                <Skeleton height={170} radius={radii.lg} />
                <Skeleton height={72} radius={radii.lg} />
                <Skeleton height={220} radius={radii.lg} />
            </Screen>
        )
    }

    if(state.status === "error") return <Screen header={header}><ErrorState error={state.error} onRetry={refetch} /></Screen>

    if(!profile) {
        return (
            <Screen header={header}>
                <EmptyState icon="user-slash" title={t("Neexistujúci účet")} message={t("Účet mohol byť zrušený alebo bolo zmenené používateľské meno.")} action={{ label: t("Späť na domov"), onPress: () => router.replace("/") }} />
            </Screen>
        )
    }

    const follow_state = getFollowState(profile) // Gets The Follow State
    const display_name:string = [profile.first_name, profile.last_name].filter(Boolean).join(" ") // Gets The Name
    const grid_posts = grid_tab === "saved" && is_own ? (profile.saved_posts ?? []) : profile.posts // Gets The Grid Posts

    return (
        <>
            <Screen header={header} refresh={{ is_refreshing, onRefresh: refetch }}>
                {/* ---------- Hero ---------- */}
                <Card padding="lg" style={styles.hero}>
                    <View style={styles.hero_row}>
                        <Avatar user={profile} size={84} />

                        <View style={styles.hero_text}>
                            {display_name ? <Text variant="heading" numberOfLines={2}>{display_name}</Text> : null}
                            <Text variant="callout" color="text_secondary">{formatUsername(profile.username)}</Text>

                            <View style={styles.chips}>
                                <Chip label={`${t("Level")} ${profile.level}`} icon="star" is_selected />
                                {profile.activity_streak > 0 && <Chip label={String(profile.activity_streak)} icon="fire" tone="warning" is_selected />}
                                {profile.private_account && <Chip label={t("Súkromný")} icon="lock" />}
                            </View>
                        </View>
                    </View>

                    {profile.bio ? <Text variant="callout">{profile.bio}</Text> : null}

                    {profile.bio_links.length > 0 && (
                        <View style={styles.chips}>
                            {profile.bio_links.map((link:BioLink) => (
                                <Chip key={link.id} label={getDomain(link.url)} icon="link" onPress={() => openLink(link)} />
                            ))}
                        </View>
                    )}
                </Card>

                {/* ---------- Stats ---------- */}
                <Card padding="sm" style={styles.stats}>
                    <Stat value={profile.followers.length} label={t("Sledovatelia")} onPress={can_see_content ? () => setConnectionsTab("followers") : undefined} />
                    <View style={styles.stat_divider} />
                    <Stat value={profile.following.length} label={is_own ? t("Sleduješ") : t("Sleduje")} onPress={can_see_content ? () => setConnectionsTab("following") : undefined} />
                    <View style={styles.stat_divider} />
                    <Stat value={profile.posts.length} label={t("Príspevky")} />
                </Card>

                {/* ---------- Actions ---------- */}
                {is_own ? (
                    <View style={styles.actions}>
                        <Button label={t("Upraviť profil")} icon="pen" variant="secondary" onPress={() => setIsEditOpen(true)} style={styles.flex} />
                        {getActiveSubscriptionPlan(logged_in_user) === "free" && <Button label={t("Premium")} icon="crown" variant="outline" onPress={() => router.push("/subscribe")} style={styles.flex} />}
                    </View>
                ) : (
                    <View style={styles.actions}>
                        <Button
                            label={follow_state === "following" ? t("Sledujete") : follow_state === "requested" ? t("Požiadané") : t("Sledovať")}
                            icon={follow_state === "following" ? "check" : follow_state === "requested" ? "clock" : "user-plus"}
                            variant={follow_state === "not_following" ? "primary" : "secondary"}
                            onPress={follow}
                            is_loading={is_follow_busy}
                            style={styles.flex}
                        />

                        {!!logged_in_user && (
                            <Button label={t("Správa")} icon="comment" variant="secondary" onPress={() => router.push({ pathname: "/chat/[username]", params: { username: profile.username } })} style={styles.flex} />
                        )}
                    </View>
                )}

                {/* ---------- Badges ---------- */}
                <BadgesContainer is_found profile={profile} />

                {/* ---------- Posts ---------- */}
                {!can_see_content ? (
                    <EmptyState icon="lock" title={t("Tento účet je súkromný.")} message={t("Sledujte ho, aby ste videli príspevky a aktivitu.")} is_compact />
                ) : (
                    <View style={styles.posts}>
                        {is_own && (
                            <SegmentedControl<GridTab>
                                value={grid_tab}
                                onChange={setGridTab}
                                accessibility_label={t("Príspevky")}
                                options={[
                                    { value: "posts", label: t("Príspevky"), icon: "table-cells" },
                                    { value: "saved", label: t("Uložené"), icon: "bookmark" },
                                ]}
                            />
                        )}

                        {grid_posts.length > 0 ? (
                            <PostGrid posts={grid_posts} author_username={profile.username} />
                        ) : grid_tab === "saved" && is_own ? (
                            <EmptyState icon="bookmark" title={t("Žiadne uložené príspevky.")} message={t("Uložte si príspevok ikonou záložky a nájdete ho tu.")} is_compact />
                        ) : (
                            <EmptyState icon="images" title={t("Zatiaľ žiadne príspevky.")} is_compact />
                        )}
                    </View>
                )}
            </Screen>

            {can_see_content && (
                <ConnectionsSheet
                    tab={connections_tab}
                    onTabChange={setConnectionsTab}
                    profile={profile}
                    logged_in_user={logged_in_user}
                    onProfileUpdate={updateProfile}
                    onLoggedInUserUpdate={setLoggedInUser}
                />
            )}

            {is_own && <EditAccountSheet visible={is_edit_open} onClose={() => setIsEditOpen(false)} profile={profile} onSaved={refetch} />}
            {!is_own && <UserMenuSheet profile={profile} visible={is_menu_open} onClose={() => setIsMenuOpen(false)} />}
        </>
    )
}

// Function For Render One Statistic
function Stat({ value, label, onPress }:{ value:number, label:string, onPress?:() => void }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? "button" : "text"}
            accessibilityLabel={`${value} ${label}`}
            style={({ pressed }) => [styles.stat, pressed ? styles.stat_pressed : null]}
        >
            <Text variant="heading" is_tabular>{value}</Text>
            <Text variant="caption" color="text_secondary" numberOfLines={1}>{label}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    hero: {
        gap: spacing.md,
    },

    hero_row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
    },

    hero_text: {
        flex: 1,
        gap: 2,
    },

    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.xs + 2,
        marginTop: spacing.xs,
    },

    stats: {
        flexDirection: "row",
        alignItems: "center",
    },

    stat: {
        flex: 1,
        alignItems: "center",
        gap: 2,
        paddingVertical: spacing.sm,
        borderRadius: radii.md,
    },

    stat_pressed: {
        backgroundColor: colors.surface_pressed,
    },

    stat_divider: {
        width: 1,
        height: 32,
        backgroundColor: colors.divider,
    },

    actions: {
        flexDirection: "row",
        gap: spacing.sm,
    },

    posts: {
        gap: spacing.md,
    },
})

