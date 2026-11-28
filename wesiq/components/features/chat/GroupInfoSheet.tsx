// Group Info: Photo, Name, Members (Admins Highlighted) And Adding People; Admins Can Change The Photo And Remove Members

import { useState } from "react"
import { ActivityIndicator, FlatList, ListRenderItemInfo, Pressable, StyleSheet, View } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { router } from "expo-router"
import { useTranslation } from "react-i18next"
import { Button, Chip, Divider, Icon, IconButton, Sheet, Text, UserRow } from "@/components/ui"
import { colors, spacing } from "@/theme"
import { haptics } from "@/lib/haptics"
import { confirmAction, showAlert } from "@/lib/alert"
import { addChatRoomMembers, ChangedRoomResponse, changeChatRoomAvatar, removeChatRoomMember } from "@/lib/api/endpoints/chat"
import { formatUsername } from "@/lib/format"
import { useLoggedInUser } from "@/contexts/LoggedInUserContext"
import GroupAvatar from "./GroupAvatar"
import UserPicker, { PickedUser } from "./UserPicker"

import type { ChatRoom, ChatRoomMember } from "@/types/models"

interface GroupInfoSheetProps {
    room:ChatRoom|null, // Null = Closed
    onClose:() => void,
    onRoomChanged:(response:ChangedRoomResponse) => void // Members Added Or Removed, Photo Changed
}

const AVATAR_SIZE:number = 84 // Defines The Avatar Size

export default function GroupInfoSheet({ room, onClose, onRoomChanged }:GroupInfoSheetProps) {
    const { t } = useTranslation() // Initializes The Translations
    const { logged_in_user } = useLoggedInUser() // Gets The Logged In User
    const [is_adding, setIsAdding] = useState<boolean>(false) // Stores The Information If The Picker Is Shown
    const [selected_users, setSelectedUsers] = useState<PickedUser[]>([]) // Stores The Selected Users
    const [is_submitting, setIsSubmitting] = useState<boolean>(false) // Stores If It Is Submitting
    const [is_avatar_busy, setIsAvatarBusy] = useState<boolean>(false) // Stores If It Is Avatar Busy
    const [removing_user_id, setRemovingUserId] = useState<number|null>(null) // Stores The Member Being Removed

    // Keeps The Last Room While The Sheet Animates Closed (Adjusted During Render)
    const [shown_room, setShownRoom] = useState<ChatRoom|null>(room) // Stores The Shown Room

    if(room && room !== shown_room) setShownRoom(room)

    if(!shown_room) return null

    const member_ids:number[] = shown_room.members.map((member:ChatRoomMember) => member.id) // Gets The Member IDs
    const is_admin:boolean = shown_room.my_role === "admin" // Only Admins Can Change The Photo And Remove People

    // Function For Close The Sheet And Reset The Picker
    const close = ():void => {
        if(is_submitting) return
        setIsAdding(false) // Sets The Adding State
        setSelectedUsers([]) // Sets The Selected Users
        onClose()
    }

    // Function For Leave The Picker
    const cancelAdding = ():void => {
        if(is_submitting) return
        setIsAdding(false) // Sets The Adding State
        setSelectedUsers([]) // Sets The Selected Users
    }

    // Function For Add The Picked People
    const submit = async ():Promise<void> => {
        if(selected_users.length === 0 || is_submitting) return

        setIsSubmitting(true) // Sets The Submitting State
        const response = await addChatRoomMembers(shown_room.id, selected_users.map((user:PickedUser) => user.id)) // Sends The Request
        setIsSubmitting(false) // Sets The Submitting State

        if(!response.ok) {
            haptics.error()
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        onRoomChanged(response.data)
        setIsAdding(false) // Sets The Adding State
        setSelectedUsers([]) // Sets The Selected Users
    }

    // Function For Upload A New Photo Or Remove The Current One
    const updateAvatar = async (image:Parameters<typeof changeChatRoomAvatar>[1]):Promise<void> => {
        setIsAvatarBusy(true) // Sets The Avatar Busy State
        const response = await changeChatRoomAvatar(shown_room.id, image) // Sends The Request
        setIsAvatarBusy(false) // Sets The Avatar Busy State

        if(!response.ok) {
            haptics.error()
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        onRoomChanged(response.data)
    }

    // Function For Pick A Square Photo From The Device
    const pickAvatar = async ():Promise<void> => {
        if(is_avatar_busy) return

        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 }) // Gets The Result
        const asset = result.canceled ? null : result.assets[0] // Gets The Image
        if(!asset) return

        await updateAvatar({ uri: asset.uri, name: asset.fileName ?? `group_${Date.now()}.jpg`, mime_type: asset.mimeType ?? "image/jpeg", web_file: asset.file ?? null })
    }

    // Function For Remove The Photo
    const removeAvatar = async ():Promise<void> => {
        const is_confirmed:boolean = await confirmAction({ title: t("Odstrániť fotku skupiny?"), confirm_label: t("Odstrániť"), is_destructive: true }) // Checks If It Is Confirmed
        if(is_confirmed) await updateAvatar(null)
    }

    // Function For Remove A Member (Admins Only)
    const removeMember = async (member:ChatRoomMember):Promise<void> => {
        // Checks If It Is Confirmed
        const is_confirmed:boolean = await confirmAction({
            title: t("Odstrániť {{username}} zo skupiny?", { username: formatUsername(member.username) }),
            message: t("Prestane dostávať správy z tejto skupiny. Môžete ho neskôr znova pridať."),
            confirm_label: t("Odstrániť"),
            is_destructive: true,
        })

        if(!is_confirmed) return

        setRemovingUserId(member.id) // Sets The Removing User ID
        const response = await removeChatRoomMember(shown_room.id, member.id) // Sends The Request
        setRemovingUserId(null) // Sets The Removing User ID

        if(!response.ok) {
            haptics.error()
            showAlert(t("Chyba"), response.error.message)
            return
        }

        haptics.success()
        onRoomChanged(response.data)
    }

    // Function For Open A Member's Profile
    const openProfile = (username:string):void => {
        close()
        router.push({ pathname: "/profile/[username]", params: { username } })
    }

    // Function For Render The Actions Next To A Member (Admin Badge, Or The Remove Button For Admins)
    const renderMemberActions = (member:ChatRoomMember) => {
        if(member.role === "admin") {
            return (
                <Chip
                    label = {t("Admin")}
                    icon = "crown"
                    tone = "premium"
                />
            )
        }
        if(!is_admin || member.id === logged_in_user?.id) return undefined
        if(removing_user_id === member.id) return <ActivityIndicator color = {colors.spinner} style = {styles.member_spinner} />

        return (
            <IconButton
                icon = "user-xmark"
                accessibility_label = {t("Odstrániť {{username}} zo skupiny?", { username: formatUsername(member.username) })}
                onPress = {() => removeMember(member)}
                variant = "soft"
                size = {34}
                is_disabled = {removing_user_id !== null}
            />
        )
    }

    // Function For Render One Member
    const renderMember = ({ item }:ListRenderItemInfo<ChatRoomMember>) => (
        <UserRow
            user = {item}
            onPress = {item.id === logged_in_user?.id ? undefined : () => openProfile(item.username)}
            accessibility_hint = {t("Zobraziť užívateľa")}
            subtitle = {item.id === logged_in_user?.id ? t("Vy") : undefined}
            trailing = {renderMemberActions(item)}
        />
    )

    // Gets The Avatar
    const avatar = (
        <GroupAvatar
            avatar = {shown_room.avatar}
            name = {shown_room.name}
            size = {AVATAR_SIZE}
        />
    )

    return (
        <Sheet
            visible = {room !== null}
            onClose = {close}
            title = {is_adding ? t("Pridať členov") : t("Informácie o skupine")}
            subtitle = {is_adding ? shown_room.name ?? undefined : undefined}
            size = "large"
            is_scrollable = {false}
            is_dismissable = {!is_submitting}
            header_right = {is_adding ? <Button
                label = {t("Späť")}
                onPress = {cancelAdding}
                variant = "ghost"
                size = "sm"
                is_disabled = {is_submitting}
            /> : undefined}

            footer = {is_adding ? (
                <Button
                    label = {selected_users.length > 0 ? t("Pridať ({{count}})", { count: selected_users.length }) : t("Pridať")}
                    onPress = {submit}
                    icon = "user-plus"
                    is_loading = {is_submitting}
                    is_disabled = {selected_users.length === 0}
                    is_full_width
                />
            ) : (
                <Button
                    label = {t("Pridať členov")}
                    onPress = {() => setIsAdding(true)}
                    icon = "user-plus"
                    variant = "secondary"
                    is_full_width
                />
            )}
        >
            {is_adding ? (
                <UserPicker
                    is_active = {room !== null}
                    selected_users = {selected_users}
                    onSelectedUsersChange = {setSelectedUsers}
                    excluded_user_ids = {member_ids}
                />
            ) : (
                <FlatList
                    data = {shown_room.members}
                    keyExtractor = {(member:ChatRoomMember) => String(member.id)}
                    renderItem = {renderMember}
                    style = {styles.list}
                    contentContainerStyle = {styles.list_content}
                    ItemSeparatorComponent = {() => <Divider inset = {56} />}

                    ListHeaderComponent = {
                        <View style = {styles.summary}>
                            {is_admin ? (
                                <Pressable
                                    onPress = {pickAvatar}
                                    disabled = {is_avatar_busy}
                                    accessibilityRole = "button"
                                    accessibilityLabel = {t("Zmeniť fotku skupiny")}
                                    style = {({ pressed }) => [styles.avatar, pressed ? styles.avatar_pressed : null]}
                                >
                                    {avatar}

                                    <View style = {styles.avatar_badge}>
                                        {is_avatar_busy ? <ActivityIndicator size = "small" color = {colors.on_primary} /> : <Icon
                                            name = "camera"
                                            size = {13}
                                            color = "on_primary"
                                        />}
                                    </View>
                                </Pressable>
                            ) : avatar}

                            <Text
                                variant = "title"
                                style = {styles.centered}
                                numberOfLines = {2}
                            >
                                {shown_room.name ?? t("Skupina")}
                            </Text>
                            <Text variant = "callout" color = "text_secondary">{t("Členovia: {{count}}", { count: shown_room.members_count })}</Text>

                            {is_admin && (
                                <View style = {styles.avatar_actions}>
                                    <Button
                                        label = {shown_room.avatar ? t("Zmeniť fotku") : t("Pridať fotku")}
                                        onPress = {pickAvatar}
                                        icon = "image"
                                        variant = "ghost"
                                        size = "sm"
                                        is_disabled = {is_avatar_busy}
                                    />
                                    {!!shown_room.avatar &&
                                        <Button
                                            label = {t("Odstrániť fotku")}
                                            onPress = {removeAvatar}
                                            icon = "trash"
                                            variant = "ghost"
                                            size = "sm"
                                            is_disabled = {is_avatar_busy}
                                        />
                                    }
                                </View>
                            )}
                        </View>
                    }
                />
            )}
        </Sheet>
    )
}

const styles = StyleSheet.create({
    list: {
        flex: 1,
    },

    list_content: {
        flexGrow: 1,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
    },

    summary: {
        alignItems: "center",
        gap: spacing.sm,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
    },

    centered: {
        textAlign: "center",
    },

    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
    },

    avatar_pressed: {
        opacity: 0.8,
    },

    avatar_badge: {
        position: "absolute",
        right: -2,
        bottom: -2,
        width: 30,
        height: 30,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary_solid,
        borderWidth: 3,
        borderColor: colors.surface_raised,
        borderRadius: 15,
    },

    avatar_actions: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: spacing.xs,
    },

    member_spinner: {
        width: 34,
    },
})
