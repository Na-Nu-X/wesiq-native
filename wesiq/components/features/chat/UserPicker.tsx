// Multi-Select User Picker (New Group, Add Members): Followed People First, Search For Anyone, Selected People As Chips

import { ReactNode, useState } from "react"
import { FlatList, ListRenderItemInfo, Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useTranslation } from "react-i18next"
import { Chip, Divider, EmptyState, ErrorState, Icon, TextField, UserRow, UserRowSkeleton } from "@/components/ui"
import { colors, radii, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { apiGet } from "@/lib/api/client"
import { envelopeWith, isArrayOf, isUserSummaryLike } from "@/lib/api/guards"
import { searchUsers } from "@/lib/api/endpoints/users"
import { useApiQuery } from "@/hooks/useApiQuery"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import { formatUsername } from "@/lib/format"

import type { UserListItem, UserSummary } from "@/types/models"

export type PickedUser = UserSummary & Partial<Pick<UserListItem, "first_name"|"last_name"|"private_account"|"has_follow">>

interface UserPickerProps {
    is_active:boolean, // Loads Only While The Sheet Is Open
    selected_users:PickedUser[],
    onSelectedUsersChange:(users:PickedUser[]) => void,
    excluded_user_ids?:readonly number[], // People Who Can't Be Picked (E.g. Already In The Group)
    header?:ReactNode // Content Above The Search (E.g. The Group Name)
}

// Checks If It Is Friends Response
const isFriendsResponse = envelopeWith<{ following:UserSummary[] }>({
    following: (value:unknown):value is UserSummary[] => isArrayOf(value, isUserSummaryLike),
})

// Function For Get The Information If A User Can Be Picked (Private Accounts Only When Followed, Same Rule As The Server)
const isPickable = (user:PickedUser):boolean => !user.private_account || user.has_follow !== false

export default function UserPicker({ is_active, selected_users, onSelectedUsersChange, excluded_user_ids = [], header }:UserPickerProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const [search, setSearch] = useState<string>("") // Stores The Search

    const query:string = useDebouncedValue(search.trim(), 350) // Gets The Debounced Query
    const is_searching:boolean = query.length > 0 // Checks If It Is Searching

    // Loads The People The User Follows (Shown Before Typing)
    const friends = useApiQuery(
        "user_picker_friends",
        async (signal:AbortSignal) => {
            const response = await apiGet("get-friends/", { signal, guard: isFriendsResponse }) // Gets The Response
            return response.ok ? { ...response, data: response.data.following as PickedUser[] } : response
        },
        { is_enabled: is_active && logged_in_user !== null }
    )

    // Searches Everyone By Name, Username Or Friend Code
    const results = useApiQuery(
        `user_picker_search:${query}`,
        async (signal:AbortSignal) => {
            const response = await searchUsers(query, signal) // Gets The Response
            return response.ok ? { ...response, data: response.data.users as PickedUser[] } : response
        },
        { is_enabled: is_active && is_searching }
    )

    const active = is_searching ? results : friends // Gets The Active
    const excluded:Set<number> = new Set([...excluded_user_ids, ...(logged_in_user ? [logged_in_user.id] : [])]) // Gets The Excluded
    const users:PickedUser[] = (active.state.data ?? []).filter((user:PickedUser) => !excluded.has(user.id)) // Gets The Users
    const selected_ids:Set<number> = new Set(selected_users.map((user:PickedUser) => user.id)) // Gets The Selected IDs
    const is_waiting:boolean = search.trim() !== query // Typing, Debounce Not Finished Yet

    // Function For Select Or Unselect A User
    const toggleUser = (user:PickedUser):void => {
        if(selected_ids.has(user.id)) onSelectedUsersChange(selected_users.filter((selected:PickedUser) => selected.id !== user.id))

        else {
            if(!isPickable(user)) return
            onSelectedUsersChange([...selected_users, user])
        }

        haptics.selection()
    }

    // Function For Render One User
    const renderUser = ({ item }:ListRenderItemInfo<PickedUser>) => {
        const is_selected:boolean = selected_ids.has(item.id) // Checks If It Is Selected
        const is_pickable:boolean = isPickable(item) // Checks If It Is Pickable

        return (
            <Pressable
                onPress = {() => toggleUser(item)}
                disabled = {!is_pickable && !is_selected}
                accessibilityRole = "checkbox"
                accessibilityState = {{ checked: is_selected, disabled: !is_pickable && !is_selected }}
                accessibilityLabel = {formatUsername(item.username)}
                style = {({ pressed }) => [styles.user, pressed ? styles.user_pressed : null, !is_pickable && !is_selected ? styles.user_disabled : null]}
            >
                <View style = {styles.flex} pointerEvents = "none">
                    <UserRow user = {item} subtitle = {!is_pickable ? t("Súkromný účet") : undefined} />
                </View>

                <View style = {[styles.check, is_selected ? styles.check_selected : null]}>
                    {is_selected &&
                        <Icon
                            name = "check"
                            size = {12}
                            color = "on_primary"
                        />
                    }
                </View>
            </Pressable>
        )
    }

    // Function For Render The Empty State
    const renderEmpty = () => {
        if(active.state.status === "loading" || is_waiting) return <View>{[0, 1, 2, 3].map((index:number) => <UserRowSkeleton key = {index} />)}</View>
        if(active.state.status === "error") {
            return (
                <ErrorState
                    error = {active.state.error}
                    onRetry = {active.refetch}
                    is_compact
                />
            )
        }
        if(is_searching) {
            return (
                <EmptyState
                    icon = "magnifying-glass"
                    title = {t("Nikto sa nenašiel")}
                    is_compact
                />
            )
        }
        return (
            <EmptyState
                icon = "user-group"
                title = {t("Zatiaľ nikoho nesledujete")}
                message = {t("Vyhľadajte ľudí podľa mena alebo používateľského mena.")}
                is_compact
            />
        )
    }

    return (
        <FlatList
            data = {users}
            keyExtractor = {(user:PickedUser) => String(user.id)}
            renderItem = {renderUser}
            style = {styles.flex}
            contentContainerStyle = {styles.list_content}
            keyboardShouldPersistTaps = "handled"
            keyboardDismissMode = "on-drag"
            ItemSeparatorComponent = {() => <Divider inset = {56} />}
            ListEmptyComponent = {renderEmpty}

            ListHeaderComponent = {
                <View style = {styles.header}>
                    {header}

                    <TextField
                        icon = "magnifying-glass"
                        placeholder = {t("Hľadať ľudí")}
                        accessibilityLabel = {t("Hľadať ľudí")}
                        value = {search}
                        onChangeText = {setSearch}
                        autoCapitalize = "none"
                        autoCorrect = {false}
                    />

                    {selected_users.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator = {false}
                            keyboardShouldPersistTaps = "handled"
                            contentContainerStyle = {styles.chips}
                        >
                            {selected_users.map((user:PickedUser) => (
                                <Chip
                                    key = {user.id}
                                    label = {formatUsername(user.username)}
                                    icon = "xmark"
                                    is_selected
                                    onPress = {() => toggleUser(user)}
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>
            }
        />
    )
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    list_content: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
    },

    header: {
        gap: spacing.md,
        paddingBottom: spacing.sm,
    },

    chips: {
        gap: spacing.sm,
    },

    user: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingRight: spacing.xs,
        borderRadius: radii.md,
    },

    user_pressed: {
        backgroundColor: colors.surface_pressed,
    },

    user_disabled: {
        opacity: 0.5,
    },

    check: {
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: colors.border_strong,
        borderRadius: 12,
    },

    check_selected: {
        backgroundColor: colors.primary_solid,
        borderColor: colors.primary_solid,
    },
})
